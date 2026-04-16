import { query } from '../db/pool';
import {
  frequentistTest,
  bayesianTest,
  checkSrm,
  sequentialTest,
  computePower,
  requiredSampleSize,
} from '@abacus/stats';
import type {
  SampleData,
  VariantData,
  FrequentistResult,
  BayesianResult,
  SrmResult,
  SequentialResult,
  MetricType,
} from '@abacus/stats';

// ──────────────────────────────────────────────
//  Internal types for raw per-variant stats
// ──────────────────────────────────────────────

interface VariantStats {
  variantKey: string;
  variantName: string;
  isControl: boolean;
  users: number;
  conversions: number;
  conversionRate: number;
  mean: number;
  variance: number;
  sum: number;
  stddev: number;
}

// ──────────────────────────────────────────────
//  Response types (what the API returns)
// ──────────────────────────────────────────────

interface FrequentistTreatmentResult {
  pValue: number;
  confidenceInterval: [number, number];
  effectSize: number;
  relativeEffect: number;
  power: number;
  significant: boolean;
}

interface BayesianMetricResult {
  probabilityOfBeingBest: Record<string, number>;
  expectedLoss: Record<string, number>;
  credibleInterval: Record<string, [number, number]>;
  recommendation: string;
}

interface SequentialMetricResult {
  shouldStop: boolean;
  boundary: number;
  currentZStat: number;
  informationFraction: number;
}

interface PowerMetricResult {
  currentPower: number;
  requiredSamplePerVariant: number;
}

interface SrmCheckResult {
  hasMismatch: boolean;
  severity: 'none' | 'warning' | 'critical';
  pValue: number;
  message: string;
}

interface MetricResult {
  metricKey: string;
  metricName: string;
  metricType: string;
  isPrimary: boolean;
  variants: VariantStats[];
  frequentist: Record<string, FrequentistTreatmentResult>;
  bayesian: BayesianMetricResult;
  sequential: SequentialMetricResult | null;
  power: PowerMetricResult;
}

interface ExperimentResults {
  experimentId: string;
  experimentKey: string;
  experimentName: string;
  status: string;
  startDate: string | null;
  totalUsers: number;
  srmCheck: SrmCheckResult;
  metrics: MetricResult[];
}

// ──────────────────────────────────────────────
//  Helper: determine metric type for stats engine
// ──────────────────────────────────────────────

function resolveMetricType(dbType: string): MetricType {
  // Convention: 'conversion' or 'binomial' => proportion, everything else => continuous
  const lower = dbType.toLowerCase();
  if (lower === 'conversion' || lower === 'binomial' || lower === 'proportion') {
    return 'proportion';
  }
  return 'continuous';
}

// ──────────────────────────────────────────────
//  Helper: build SampleData from VariantStats
// ──────────────────────────────────────────────

function toSampleData(v: VariantStats, metricType: MetricType): SampleData {
  const base: SampleData = {
    count: v.users,
    mean: metricType === 'proportion' ? v.conversionRate : v.mean,
    variance: metricType === 'proportion' ? v.conversionRate * (1 - v.conversionRate) : v.variance,
  };
  if (metricType === 'proportion') {
    base.conversions = v.conversions;
  }
  return base;
}

// ──────────────────────────────────────────────
//  Helper: infer sequential look number from days elapsed
// ──────────────────────────────────────────────

const DEFAULT_MAX_LOOKS = 5;

function inferLook(startDate: string | null): { currentLook: number; maxLooks: number } | null {
  if (!startDate) return null;

  const start = new Date(startDate);
  const now = new Date();
  const daysElapsed = Math.max(1, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

  // Only run sequential testing if the experiment has been going for at least 2 days
  if (daysElapsed < 2) return null;

  // Assume a 28-day experiment with weekly looks => maxLooks = 4
  // Or use DEFAULT_MAX_LOOKS with evenly spaced looks
  const maxLooks = DEFAULT_MAX_LOOKS;
  const currentLook = Math.min(Math.ceil((daysElapsed / 28) * maxLooks), maxLooks);

  if (currentLook < 1) return null;
  return { currentLook, maxLooks };
}

// ──────────────────────────────────────────────
//  Main function
// ──────────────────────────────────────────────

/**
 * Aggregate experiment results across all assigned variants and tracked metrics,
 * then run the full statistical analysis suite: frequentist, Bayesian, SRM,
 * sequential testing, and power analysis.
 */
export async function getExperimentResults(experimentId: string): Promise<ExperimentResults> {
  // ── 1. Fetch experiment metadata ──

  const experiments = await query<{
    id: string; key: string; name: string; status: string;
    project_id: string; start_date: string | null;
  }>(
    'SELECT id, key, name, status, project_id, start_date FROM experiments WHERE id = $1',
    [experimentId]
  );

  if (experiments.length === 0) {
    throw new Error(`Experiment ${experimentId} not found`);
  }
  const experiment = experiments[0];

  // ── 2. Fetch variants ──

  const variants = await query<{
    id: string; key: string; name: string; is_control: boolean; weight: number;
  }>(
    'SELECT id, key, name, is_control, COALESCE(weight, 1) as weight FROM variants WHERE experiment_id = $1 ORDER BY is_control DESC, key',
    [experimentId]
  );

  // ── 3. Fetch linked metrics ──

  const metrics = await query<{
    metric_id: string; key: string; name: string; type: string; is_primary: boolean;
  }>(
    `SELECT m.id as metric_id, m.key, m.name, m.type, em.is_primary
     FROM experiment_metrics em
     JOIN metrics m ON m.id = em.metric_id
     WHERE em.experiment_id = $1`,
    [experimentId]
  );

  // ── 4. Fetch assignment counts per variant ──

  const assignmentCounts = await query<{ variant_id: string; user_count: string }>(
    `SELECT variant_id, COUNT(DISTINCT user_id) as user_count
     FROM assignments
     WHERE experiment_id = $1
     GROUP BY variant_id`,
    [experimentId]
  );

  const assignmentMap = new Map<string, number>();
  let totalUsers = 0;
  for (const row of assignmentCounts) {
    const count = parseInt(row.user_count, 10);
    assignmentMap.set(row.variant_id, count);
    totalUsers += count;
  }

  // ── 5. SRM Check ──
  // Compare observed traffic split against expected weights

  const observedCounts = variants.map((v) => assignmentMap.get(v.id) || 0);
  const expectedWeights = variants.map((v) => v.weight);

  let srmCheck: SrmCheckResult;
  try {
    const srmResult: SrmResult = checkSrm(observedCounts, expectedWeights);
    srmCheck = {
      hasMismatch: srmResult.hasMismatch,
      severity: srmResult.severity,
      pValue: srmResult.pValue,
      message: srmResult.message,
    };
  } catch {
    srmCheck = {
      hasMismatch: false,
      severity: 'none',
      pValue: 1,
      message: 'Insufficient data for SRM check.',
    };
  }

  // ── 6. Per-metric analysis ──

  const metricResults: MetricResult[] = [];
  const numTreatments = variants.filter((v) => !v.is_control).length;

  for (const metric of metrics) {
    const metricType = resolveMetricType(metric.type);
    const variantStats: VariantStats[] = [];

    // 6a. Compute raw per-variant stats
    for (const variant of variants) {
      const users = assignmentMap.get(variant.id) || 0;

      const stats = await query<{
        conversions: string;
        total_value: string;
        mean_value: string;
        variance_value: string;
      }>(
        `SELECT
           COUNT(DISTINCT e.user_id) as conversions,
           COALESCE(SUM(e.value), 0) as total_value,
           COALESCE(AVG(e.value), 0) as mean_value,
           COALESCE(VARIANCE(e.value), 0) as variance_value
         FROM events e
         JOIN assignments a ON a.user_id = e.user_id AND a.experiment_id = $1
         WHERE a.variant_id = $2
           AND e.metric_key = $3
           AND e.project_id = $4
           AND ($5::timestamptz IS NULL OR e.timestamp >= $5::timestamptz)`,
        [experimentId, variant.id, metric.key, experiment.project_id, experiment.start_date]
      );

      const row = stats[0];
      const conversions = parseInt(row.conversions, 10);
      const sum = parseFloat(row.total_value);
      const mean = parseFloat(row.mean_value);
      const variance = parseFloat(row.variance_value);

      variantStats.push({
        variantKey: variant.key,
        variantName: variant.name,
        isControl: variant.is_control,
        users,
        conversions,
        conversionRate: users > 0 ? conversions / users : 0,
        mean,
        variance,
        sum,
        stddev: Math.sqrt(variance),
      });
    }

    // Find control variant
    const controlStats = variantStats.find((v) => v.isControl);
    const treatmentStats = variantStats.filter((v) => !v.isControl);

    // 6b. Frequentist analysis — each treatment vs control
    const frequentistResults: Record<string, FrequentistTreatmentResult> = {};

    if (controlStats && controlStats.users > 0) {
      const controlSample = toSampleData(controlStats, metricType);

      for (const treatment of treatmentStats) {
        if (treatment.users === 0) continue;

        const treatmentSample = toSampleData(treatment, metricType);

        try {
          const result: FrequentistResult = frequentistTest(controlSample, treatmentSample, {
            alpha: 0.05,
            tail: 'two',
            metricType,
            correction: numTreatments > 1 ? 'bonferroni' : 'none',
            numComparisons: numTreatments,
          });

          frequentistResults[treatment.variantKey] = {
            pValue: result.pValue,
            confidenceInterval: result.confidenceInterval,
            effectSize: result.effectSize,
            relativeEffect: result.relativeEffect,
            power: result.power,
            significant: result.significant,
          };
        } catch {
          // Skip if data is insufficient for this comparison
        }
      }
    }

    // 6c. Bayesian analysis — across all variants
    let bayesianResult: BayesianMetricResult = {
      probabilityOfBeingBest: {},
      expectedLoss: {},
      credibleInterval: {},
      recommendation: 'insufficient_data',
    };

    const bayesianVariants: VariantData[] = variantStats
      .filter((v) => v.users > 0)
      .map((v) => ({
        id: v.variantKey,
        name: v.variantName,
        isControl: v.isControl,
        sample: toSampleData(v, metricType),
      }));

    if (bayesianVariants.length >= 2) {
      try {
        const bResult: BayesianResult = bayesianTest(bayesianVariants, {
          metricType,
        });

        bayesianResult = {
          probabilityOfBeingBest: bResult.probabilityOfBeingBest,
          expectedLoss: bResult.expectedLoss,
          credibleInterval: bResult.credibleInterval,
          recommendation: bResult.recommendation,
        };
      } catch {
        // Keep default insufficient_data result
      }
    }

    // 6d. Sequential testing — only if experiment has been running long enough
    let sequentialResult: SequentialMetricResult | null = null;

    if (controlStats && controlStats.users > 0) {
      const lookInfo = inferLook(experiment.start_date);

      if (lookInfo && treatmentStats.length > 0) {
        // Run sequential test against the first treatment (primary comparison)
        const primaryTreatment = treatmentStats[0];
        if (primaryTreatment.users > 0) {
          const controlSample = toSampleData(controlStats, metricType);
          const treatmentSample = toSampleData(primaryTreatment, metricType);

          try {
            const seqResult: SequentialResult = sequentialTest(controlSample, treatmentSample, {
              currentLook: lookInfo.currentLook,
              maxLooks: lookInfo.maxLooks,
              metricType,
            });

            sequentialResult = {
              shouldStop: seqResult.shouldStop,
              boundary: seqResult.boundary,
              currentZStat: seqResult.currentZStat,
              informationFraction: seqResult.informationFraction,
            };
          } catch {
            // Sequential testing not applicable
          }
        }
      }
    }

    // 6e. Power analysis — how much power do we currently have?
    let powerResult: PowerMetricResult = {
      currentPower: 0,
      requiredSamplePerVariant: 0,
    };

    if (controlStats && controlStats.users > 0 && treatmentStats.length > 0) {
      const primaryTreatment = treatmentStats[0];
      if (primaryTreatment.users > 0) {
        try {
          // Observed effect to estimate MDE
          const observedEffect = metricType === 'proportion'
            ? Math.abs(primaryTreatment.conversionRate - controlStats.conversionRate)
            : Math.abs(primaryTreatment.mean - controlStats.mean);

          // Use a practical MDE: either the observed effect or a reasonable minimum
          const mde = Math.max(observedEffect, 0.001);

          // Baseline for power calc
          const baseline = metricType === 'proportion'
            ? controlStats.conversionRate
            : controlStats.variance;

          // Minimum sample size per variant (use smaller group)
          const minSamplePerVariant = Math.min(controlStats.users, primaryTreatment.users);

          const currentPower = computePower(baseline, mde, minSamplePerVariant, {
            alpha: 0.05,
            metricType,
            numVariants: variants.length,
          });

          const sampleSizeResult = requiredSampleSize(baseline, mde, {
            alpha: 0.05,
            power: 0.8,
            metricType,
            numVariants: variants.length,
          });

          powerResult = {
            currentPower,
            requiredSamplePerVariant: sampleSizeResult.requiredSampleSizePerVariant,
          };
        } catch {
          // Power calc not possible (e.g., zero variance)
        }
      }
    }

    metricResults.push({
      metricKey: metric.key,
      metricName: metric.name,
      metricType: metric.type,
      isPrimary: metric.is_primary,
      variants: variantStats,
      frequentist: frequentistResults,
      bayesian: bayesianResult,
      sequential: sequentialResult,
      power: powerResult,
    });
  }

  return {
    experimentId: experiment.id,
    experimentKey: experiment.key,
    experimentName: experiment.name,
    status: experiment.status,
    startDate: experiment.start_date,
    totalUsers,
    srmCheck,
    metrics: metricResults,
  };
}
