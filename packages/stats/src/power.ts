/**
 * @abacus/stats — Power analysis and sample size calculator
 *
 * Minimum detectable effect, required sample size, power curves,
 * and runtime estimation.
 */

import { normalCdf, normalInv } from './distributions';
import type { PowerOptions, PowerResult, MetricType, TestTail } from './types';

// ──────────────────────────────────────────────
//  Required sample size
// ──────────────────────────────────────────────

/**
 * Calculate the required sample size per variant to detect a given effect
 * with the specified power and significance level.
 *
 * @param baselineRate - Baseline conversion rate (for proportions) or mean
 * @param mde - Minimum detectable effect (absolute, e.g. 0.02 for 2pp lift)
 * @param options - Power options
 * @returns Power calculation result with required sample size
 */
export function requiredSampleSize(
  baselineRate: number,
  mde: number,
  options: PowerOptions = {}
): PowerResult {
  const {
    alpha = 0.05,
    power = 0.8,
    metricType = 'proportion',
    tail = 'two',
    numVariants = 2,
  } = options;

  if (mde <= 0) {
    throw new Error('MDE must be positive');
  }

  let n: number;

  if (metricType === 'proportion') {
    n = sampleSizeProportion(baselineRate, mde, alpha, power, tail);
  } else {
    // For continuous metrics, baselineRate is the baseline variance
    n = sampleSizeContinuous(mde, baselineRate, alpha, power, tail);
  }

  // Adjust for multiple variants (Bonferroni-like correction)
  const numComparisons = numVariants - 1;
  const adjustedAlpha = alpha / numComparisons;
  if (numComparisons > 1) {
    if (metricType === 'proportion') {
      n = sampleSizeProportion(baselineRate, mde, adjustedAlpha, power, tail);
    } else {
      n = sampleSizeContinuous(mde, baselineRate, adjustedAlpha, power, tail);
    }
  }

  const perVariant = Math.ceil(n);
  const total = perVariant * numVariants;

  return {
    requiredSampleSize: total,
    requiredSampleSizePerVariant: perVariant,
    power,
    mde,
    alpha,
  };
}

/**
 * Sample size for a proportion test.
 * Uses the formula:
 *   n = (z_{alpha/2} * sqrt(2*p_bar*(1-p_bar)) + z_beta * sqrt(p1*(1-p1) + p2*(1-p2)))^2 / delta^2
 */
function sampleSizeProportion(
  p1: number,
  mde: number,
  alpha: number,
  power: number,
  tail: TestTail
): number {
  const p2 = p1 + mde;
  const pBar = (p1 + p2) / 2;

  const zAlpha = tail === 'two' ? normalInv(1 - alpha / 2) : normalInv(1 - alpha);
  const zBeta = normalInv(power);

  const numerator = Math.pow(
    zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) +
      zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)),
    2
  );

  return numerator / (mde * mde);
}

/**
 * Sample size for a continuous metric test.
 * Uses the formula:
 *   n = (z_{alpha/2} + z_beta)^2 * 2 * sigma^2 / delta^2
 */
function sampleSizeContinuous(
  mde: number,
  variance: number,
  alpha: number,
  power: number,
  tail: TestTail
): number {
  const zAlpha = tail === 'two' ? normalInv(1 - alpha / 2) : normalInv(1 - alpha);
  const zBeta = normalInv(power);

  return (2 * variance * (zAlpha + zBeta) ** 2) / (mde * mde);
}

// ──────────────────────────────────────────────
//  Power for given sample size
// ──────────────────────────────────────────────

/**
 * Calculate the statistical power for a given sample size and effect.
 *
 * @param baselineRate - Baseline conversion rate or variance
 * @param mde - Minimum detectable effect (absolute)
 * @param sampleSizePerVariant - Sample size per variant
 * @param options - Power options
 * @returns Achieved power
 */
export function computePower(
  baselineRate: number,
  mde: number,
  sampleSizePerVariant: number,
  options: PowerOptions = {}
): number {
  const {
    alpha = 0.05,
    metricType = 'proportion',
    tail = 'two',
    numVariants = 2,
  } = options;

  const adjustedAlpha = numVariants > 2 ? alpha / (numVariants - 1) : alpha;

  if (metricType === 'proportion') {
    return powerForProportion(baselineRate, mde, sampleSizePerVariant, adjustedAlpha, tail);
  } else {
    return powerForContinuous(mde, baselineRate, sampleSizePerVariant, adjustedAlpha, tail);
  }
}

function powerForProportion(
  p1: number,
  mde: number,
  n: number,
  alpha: number,
  tail: TestTail
): number {
  const p2 = p1 + mde;
  const se1 = Math.sqrt((p1 * (1 - p1)) / n);
  const se2 = Math.sqrt((p2 * (1 - p2)) / n);
  const sePooled = Math.sqrt(se1 * se1 + se2 * se2);

  if (sePooled === 0) return mde === 0 ? alpha : 1;

  if (tail === 'two') {
    const zAlpha = normalInv(1 - alpha / 2);
    // Power = P(reject H0) = P(Z > z_alpha - delta/SE) + P(Z < -z_alpha - delta/SE)
    return (
      1 - normalCdf(zAlpha - mde / sePooled) + normalCdf(-zAlpha - mde / sePooled)
    );
  } else {
    const zAlpha = normalInv(1 - alpha);
    if (tail === 'right') {
      return 1 - normalCdf(zAlpha - mde / sePooled);
    } else {
      return normalCdf(-zAlpha - mde / sePooled);
    }
  }
}

function powerForContinuous(
  mde: number,
  variance: number,
  n: number,
  alpha: number,
  tail: TestTail
): number {
  const se = Math.sqrt(2 * variance / n);
  if (se === 0) return mde === 0 ? alpha : 1;

  if (tail === 'two') {
    const zAlpha = normalInv(1 - alpha / 2);
    return 1 - normalCdf(zAlpha - mde / se) + normalCdf(-zAlpha - mde / se);
  } else {
    const zAlpha = normalInv(1 - alpha);
    if (tail === 'right') {
      return 1 - normalCdf(zAlpha - mde / se);
    } else {
      return normalCdf(-zAlpha - mde / se);
    }
  }
}

// ──────────────────────────────────────────────
//  Minimum detectable effect
// ──────────────────────────────────────────────

/**
 * Calculate the minimum detectable effect (MDE) for a given sample size,
 * power, and alpha.
 *
 * @param baselineRate - Baseline conversion rate or variance
 * @param sampleSizePerVariant - Sample size per variant
 * @param options - Power options
 * @returns The MDE (absolute)
 */
export function minimumDetectableEffect(
  baselineRate: number,
  sampleSizePerVariant: number,
  options: PowerOptions = {}
): number {
  const {
    alpha = 0.05,
    power = 0.8,
    metricType = 'proportion',
    tail = 'two',
    numVariants = 2,
  } = options;

  const adjustedAlpha = numVariants > 2 ? alpha / (numVariants - 1) : alpha;

  if (metricType === 'proportion') {
    return mdeProportion(baselineRate, sampleSizePerVariant, adjustedAlpha, power, tail);
  } else {
    return mdeContinuous(baselineRate, sampleSizePerVariant, adjustedAlpha, power, tail);
  }
}

function mdeProportion(
  p1: number,
  n: number,
  alpha: number,
  power: number,
  tail: TestTail
): number {
  // Binary search for MDE
  let lo = 0;
  let hi = Math.min(1 - p1, p1); // can't go below 0 or above 1

  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const achievedPower = powerForProportion(p1, mid, n, alpha, tail);
    if (achievedPower < power) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return (lo + hi) / 2;
}

function mdeContinuous(
  variance: number,
  n: number,
  alpha: number,
  power: number,
  tail: TestTail
): number {
  const zAlpha = tail === 'two' ? normalInv(1 - alpha / 2) : normalInv(1 - alpha);
  const zBeta = normalInv(power);

  return (zAlpha + zBeta) * Math.sqrt(2 * variance / n);
}

// ──────────────────────────────────────────────
//  Runtime estimator
// ──────────────────────────────────────────────

/**
 * Estimate how many days an experiment needs to run.
 *
 * @param requiredSampleSizeTotal - Total required sample size across all variants
 * @param dailyTraffic - Daily eligible traffic
 * @param trafficAllocation - Fraction of traffic in the experiment (0-1, default 1.0)
 * @returns Estimated number of days
 */
export function estimateRuntime(
  requiredSampleSizeTotal: number,
  dailyTraffic: number,
  trafficAllocation: number = 1.0
): number {
  if (dailyTraffic <= 0 || trafficAllocation <= 0) {
    return Infinity;
  }

  const effectiveDaily = dailyTraffic * trafficAllocation;
  return Math.ceil(requiredSampleSizeTotal / effectiveDaily);
}

/**
 * Full power analysis with runtime estimate.
 */
export function fullPowerAnalysis(
  baselineRate: number,
  mde: number,
  dailyTraffic: number,
  options: PowerOptions & { trafficAllocation?: number } = {}
): PowerResult {
  const result = requiredSampleSize(baselineRate, mde, options);
  const { trafficAllocation = 1.0 } = options;

  result.estimatedDays = estimateRuntime(
    result.requiredSampleSize,
    dailyTraffic,
    trafficAllocation
  );

  return result;
}
