/**
 * @abacus/stats — Shared type definitions
 */

/** Raw sample data for a single variant */
export interface SampleData {
  /** Number of users/observations */
  count: number;
  /** Number of conversions (for proportion metrics) */
  conversions?: number;
  /** Sample mean */
  mean: number;
  /** Sample variance */
  variance: number;
  /** Sum of squared deviations from the mean */
  sumSquares?: number;
}

/** A named variant with its sample data */
export interface VariantData {
  id: string;
  name: string;
  sample: SampleData;
  isControl?: boolean;
}

/** Sample data with pre-experiment covariate information (for CUPED) */
export interface CupedData extends SampleData {
  /** Mean of the pre-experiment covariate */
  preExperimentMean: number;
  /** Variance of the pre-experiment covariate */
  preExperimentVariance: number;
  /** Covariance between pre-experiment covariate and post-experiment metric */
  covariance: number;
}

/** A bandit arm with observed reward data */
export interface BanditVariant {
  id: string;
  /** Number of successes (Bernoulli rewards) */
  successes: number;
  /** Number of failures (Bernoulli rewards) */
  failures: number;
  /** Raw reward values (for non-Bernoulli bandits) */
  rewards?: number[];
  /** Feature vectors per observation (for contextual bandits) */
  features?: number[][];
}

// --------------- Options ---------------

export type TestTail = 'two' | 'left' | 'right';
export type MetricType = 'proportion' | 'continuous';
export type CorrectionMethod = 'none' | 'bonferroni' | 'holm' | 'bh';
export type SpendingFunction = 'obrien-fleming' | 'pocock' | 'lan-demets';

export interface FrequentistOptions {
  /** Significance level (default 0.05) */
  alpha?: number;
  /** One-tailed or two-tailed test */
  tail?: TestTail;
  /** Metric type drives which test to use */
  metricType?: MetricType;
  /** Multiple comparison correction */
  correction?: CorrectionMethod;
  /** Number of comparisons for correction (default 1) */
  numComparisons?: number;
}

export interface BayesianOptions {
  /** Number of Monte Carlo samples (default 50_000) */
  numSamples?: number;
  /** Credible interval width (default 0.95) */
  credibleIntervalWidth?: number;
  /** Prior alpha for Beta-Binomial model (default 1 = uniform) */
  priorAlpha?: number;
  /** Prior beta for Beta-Binomial model (default 1 = uniform) */
  priorBeta?: number;
  /** Prior mean for Normal model */
  priorMean?: number;
  /** Prior variance for Normal model */
  priorVariance?: number;
  /** Metric type */
  metricType?: MetricType;
  /** Minimum confidence to make a recommendation (default 0.95) */
  minConfidence?: number;
}

export interface SequentialOptions {
  /** Significance level (default 0.05) */
  alpha?: number;
  /** Current look number (1-indexed) */
  currentLook: number;
  /** Maximum planned number of looks */
  maxLooks: number;
  /** Alpha spending function */
  spendingFunction?: SpendingFunction;
  /** Metric type */
  metricType?: MetricType;
  /** Enable futility stopping (default false) */
  futilityStopping?: boolean;
}

export interface PowerOptions {
  /** Significance level (default 0.05) */
  alpha?: number;
  /** Desired power (default 0.80) */
  power?: number;
  /** Metric type */
  metricType?: MetricType;
  /** One-tailed or two-tailed */
  tail?: TestTail;
  /** Number of variants including control (default 2) */
  numVariants?: number;
}

// --------------- Results ---------------

export interface FrequentistResult {
  pValue: number;
  confidenceInterval: [number, number];
  effectSize: number;
  effectSizeCI: [number, number];
  relativeEffect: number;
  relativeEffectCI: [number, number];
  power: number;
  significant: boolean;
  alpha: number;
}

export interface BayesianResult {
  probabilityOfBeingBest: Record<string, number>;
  expectedLoss: Record<string, number>;
  credibleInterval: Record<string, [number, number]>;
  posteriorMean: Record<string, number>;
  posteriorStd: Record<string, number>;
  recommendation: string;
  confidenceLevel: number;
}

export interface SequentialResult {
  currentZStat: number;
  boundary: number;
  shouldStop: boolean;
  stopDecision: 'reject_null' | 'continue' | 'futility_stop';
  adjustedPValue: number;
  adjustedAlpha: number;
  informationFraction: number;
  looks: number;
  maxLooks: number;
}

export interface CupedResult {
  adjustedControlMean: number;
  adjustedTreatmentMean: number;
  adjustedControlVariance: number;
  adjustedTreatmentVariance: number;
  varianceReduction: number;
  theta: number;
  originalVariance: number;
  reducedVariance: number;
}

export interface SrmResult {
  observed: number[];
  expected: number[];
  chiSquared: number;
  pValue: number;
  hasMismatch: boolean;
  severity: 'none' | 'warning' | 'critical';
  message: string;
}

export interface PowerResult {
  requiredSampleSize: number;
  requiredSampleSizePerVariant: number;
  power: number;
  mde: number;
  alpha: number;
  estimatedDays?: number;
}

export interface BanditResult {
  allocations: Record<string, number>;
  selectedArm: string;
  regret: number;
  explorationRate: number;
}
