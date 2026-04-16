/**
 * @abacus/stats — Statistics engine for the Abacus A/B testing platform
 *
 * Zero external dependencies. Production-quality statistical methods
 * for frequentist, Bayesian, and sequential experiment analysis.
 */

// Types
export type {
  SampleData,
  VariantData,
  CupedData,
  BanditVariant,
  FrequentistOptions,
  BayesianOptions,
  SequentialOptions,
  PowerOptions,
  FrequentistResult,
  BayesianResult,
  SequentialResult,
  CupedResult,
  SrmResult,
  PowerResult,
  BanditResult,
  TestTail,
  MetricType,
  CorrectionMethod,
  SpendingFunction,
} from './types';

// Distributions (low-level math)
export {
  logGamma,
  gamma,
  normalCdf,
  normalPdf,
  normalInv,
  betaPdf,
  betaCdf,
  betaInv,
  betaIncomplete,
  regularizedBeta,
  chiSquaredCdf,
  tCdf,
  tInv,
  lowerGammaReg,
  mulberry32,
  randomNormal,
  randomBeta,
  randomGamma,
} from './distributions';

// Frequentist testing
export {
  frequentistTest,
  chiSquaredTest,
  holmCorrection,
  benjaminiHochberg,
  bonferroniCorrection,
} from './frequentist';

// Bayesian testing
export { bayesianTest } from './bayesian';

// Sequential testing
export { sequentialTest, computeSequentialDesign } from './sequential';
export type { SequentialDesign } from './sequential';

// CUPED variance reduction
export {
  cupedAdjust,
  computeCorrelation,
  estimateVarianceReduction,
  computeCupedData,
} from './cuped';

// SRM detection
export { checkSrm } from './srm';

// Power analysis
export {
  requiredSampleSize,
  computePower,
  minimumDetectableEffect,
  estimateRuntime,
  fullPowerAnalysis,
} from './power';

// Bandit algorithms
export { thompsonSampling, ucb1, epsilonGreedy, linUcb } from './bandits';
