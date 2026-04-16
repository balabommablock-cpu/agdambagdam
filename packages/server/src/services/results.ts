import { query } from '../db/pool';

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

interface MetricResult {
  metricKey: string;
  metricName: string;
  metricType: string;
  isPrimary: boolean;
  variants: VariantStats[];
}

interface ExperimentResults {
  experimentId: string;
  experimentKey: string;
  experimentName: string;
  status: string;
  startDate: string | null;
  totalUsers: number;
  metrics: MetricResult[];
}

/**
 * Aggregate experiment results across all assigned variants and tracked metrics.
 */
export async function getExperimentResults(experimentId: string): Promise<ExperimentResults> {
  // Get experiment info
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

  // Get variants for this experiment
  const variants = await query<{
    id: string; key: string; name: string; is_control: boolean;
  }>(
    'SELECT id, key, name, is_control FROM variants WHERE experiment_id = $1 ORDER BY is_control DESC, key',
    [experimentId]
  );

  // Get linked metrics
  const metrics = await query<{
    metric_id: string; key: string; name: string; type: string; is_primary: boolean;
  }>(
    `SELECT m.id as metric_id, m.key, m.name, m.type, em.is_primary
     FROM experiment_metrics em
     JOIN metrics m ON m.id = em.metric_id
     WHERE em.experiment_id = $1`,
    [experimentId]
  );

  // Get assignment counts per variant
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

  // For each metric, compute per-variant stats
  const metricResults: MetricResult[] = [];

  for (const metric of metrics) {
    const variantStats: VariantStats[] = [];

    for (const variant of variants) {
      const users = assignmentMap.get(variant.id) || 0;

      // Get event data for users in this variant
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

    metricResults.push({
      metricKey: metric.key,
      metricName: metric.name,
      metricType: metric.type,
      isPrimary: metric.is_primary,
      variants: variantStats,
    });
  }

  return {
    experimentId: experiment.id,
    experimentKey: experiment.key,
    experimentName: experiment.name,
    status: experiment.status,
    startDate: experiment.start_date,
    totalUsers,
    metrics: metricResults,
  };
}
