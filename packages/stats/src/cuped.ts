/**
 * @abacus/stats — CUPED (Controlled-experiment Using Pre-Experiment Data)
 *
 * Variance reduction technique that uses pre-experiment covariates
 * to reduce the variance of the treatment effect estimator.
 * Typically achieves 20-50% variance reduction.
 *
 * Reference: Deng et al. (2013) "Improving the Sensitivity of Online
 * Controlled Experiments by Utilizing Pre-Experiment Data"
 */

import type { CupedData, CupedResult } from './types';

// ──────────────────────────────────────────────
//  Main entry point
// ──────────────────────────────────────────────

/**
 * Apply CUPED variance reduction to an A/B test.
 *
 * The idea: if we have a pre-experiment covariate X that is correlated
 * with the post-experiment metric Y, we can construct an adjusted metric:
 *
 *   Y_adj = Y - theta * (X - E[X])
 *
 * where theta = Cov(X, Y) / Var(X).
 *
 * This adjusted metric has lower variance:
 *   Var(Y_adj) = Var(Y) * (1 - rho^2)
 *
 * where rho is the correlation between X and Y.
 */
export function cupedAdjust(control: CupedData, treatment: CupedData): CupedResult {
  // Compute theta for control and treatment
  // theta = Cov(X, Y) / Var(X)
  const thetaControl = control.preExperimentVariance > 0
    ? control.covariance / control.preExperimentVariance
    : 0;
  const thetaTreatment = treatment.preExperimentVariance > 0
    ? treatment.covariance / treatment.preExperimentVariance
    : 0;

  // Use pooled theta for consistency (recommended practice)
  // Weighted by sample size
  const totalCount = control.count + treatment.count;
  const theta =
    (thetaControl * control.count + thetaTreatment * treatment.count) / totalCount;

  // Global pre-experiment mean (across both groups — since assignment is random,
  // the pre-experiment metric should have the same distribution in both groups)
  const globalPreMean =
    (control.preExperimentMean * control.count +
      treatment.preExperimentMean * treatment.count) /
    totalCount;

  // Adjusted means: Y_adj = Y - theta * (X_bar - globalPreMean)
  const adjustedControlMean =
    control.mean - theta * (control.preExperimentMean - globalPreMean);
  const adjustedTreatmentMean =
    treatment.mean - theta * (treatment.preExperimentMean - globalPreMean);

  // Adjusted variance: Var(Y_adj) = Var(Y) - 2*theta*Cov(X,Y) + theta^2*Var(X)
  // = Var(Y) - theta^2 * Var(X)  [since theta = Cov/Var(X)]
  // = Var(Y) * (1 - rho^2)
  const adjustedControlVariance = computeAdjustedVariance(control, theta);
  const adjustedTreatmentVariance = computeAdjustedVariance(treatment, theta);

  // Original pooled variance (of the difference in means)
  const originalVariance =
    control.variance / control.count + treatment.variance / treatment.count;

  // Reduced pooled variance
  const reducedVariance =
    adjustedControlVariance / control.count +
    adjustedTreatmentVariance / treatment.count;

  // Variance reduction percentage
  const varianceReduction =
    originalVariance > 0
      ? Math.max(0, 1 - reducedVariance / originalVariance)
      : 0;

  return {
    adjustedControlMean,
    adjustedTreatmentMean,
    adjustedControlVariance,
    adjustedTreatmentVariance,
    varianceReduction,
    theta,
    originalVariance,
    reducedVariance,
  };
}

// ──────────────────────────────────────────────
//  Internal helpers
// ──────────────────────────────────────────────

/**
 * Compute the variance of the CUPED-adjusted metric for a single group.
 *
 * Var(Y_adj) = Var(Y) - 2*theta*Cov(X,Y) + theta^2*Var(X)
 *
 * Since theta = Cov(X,Y) / Var(X):
 * Var(Y_adj) = Var(Y) - Cov(X,Y)^2 / Var(X)
 *            = Var(Y) * (1 - rho^2)
 */
function computeAdjustedVariance(data: CupedData, theta: number): number {
  const adjVar =
    data.variance -
    2 * theta * data.covariance +
    theta * theta * data.preExperimentVariance;

  // Ensure non-negative (numerical stability)
  return Math.max(0, adjVar);
}

/**
 * Compute the correlation between pre-experiment covariate and post-experiment metric.
 */
export function computeCorrelation(data: CupedData): number {
  const denom = Math.sqrt(data.preExperimentVariance * data.variance);
  if (denom === 0) return 0;
  return data.covariance / denom;
}

/**
 * Estimate the variance reduction achievable from CUPED, given the correlation.
 * Variance reduction = rho^2
 */
export function estimateVarianceReduction(correlation: number): number {
  return correlation * correlation;
}

/**
 * Given raw arrays of pre-experiment and post-experiment data,
 * compute the CupedData summary statistics.
 */
export function computeCupedData(
  preExperiment: number[],
  postExperiment: number[]
): CupedData {
  if (preExperiment.length !== postExperiment.length) {
    throw new Error('Pre-experiment and post-experiment arrays must have the same length');
  }

  const n = preExperiment.length;
  if (n === 0) {
    throw new Error('Arrays must not be empty');
  }

  // Post-experiment stats
  const postMean = mean(postExperiment);
  const postVar = variance(postExperiment, postMean);

  // Pre-experiment stats
  const preMean = mean(preExperiment);
  const preVar = variance(preExperiment, preMean);

  // Covariance
  let cov = 0;
  for (let i = 0; i < n; i++) {
    cov += (preExperiment[i] - preMean) * (postExperiment[i] - postMean);
  }
  cov /= n - 1; // sample covariance (unbiased)

  return {
    count: n,
    mean: postMean,
    variance: postVar,
    preExperimentMean: preMean,
    preExperimentVariance: preVar,
    covariance: cov,
  };
}

function mean(arr: number[]): number {
  let sum = 0;
  for (const v of arr) sum += v;
  return sum / arr.length;
}

function variance(arr: number[], mu: number): number {
  let sum = 0;
  for (const v of arr) {
    const d = v - mu;
    sum += d * d;
  }
  return sum / (arr.length - 1); // unbiased
}
