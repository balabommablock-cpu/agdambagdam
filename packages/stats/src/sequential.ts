/**
 * @abacus/stats — Sequential testing (group sequential designs)
 *
 * Alpha spending approach with O'Brien-Fleming, Pocock, and Lan-DeMets
 * spending functions. Enables valid early stopping of experiments.
 */

import { normalCdf, normalInv } from './distributions';
import type {
  SampleData,
  SequentialOptions,
  SequentialResult,
  SpendingFunction,
} from './types';

// ──────────────────────────────────────────────
//  Main entry point
// ──────────────────────────────────────────────

export function sequentialTest(
  control: SampleData,
  treatment: SampleData,
  options: SequentialOptions
): SequentialResult {
  const {
    alpha = 0.05,
    currentLook,
    maxLooks,
    spendingFunction = 'obrien-fleming',
    metricType = control.conversions != null ? 'proportion' : 'continuous',
    futilityStopping = false,
  } = options;

  if (currentLook < 1 || currentLook > maxLooks) {
    throw new Error(`currentLook must be between 1 and ${maxLooks}`);
  }

  // Information fraction: proportion of total planned sample collected
  const infoFraction = currentLook / maxLooks;

  // Compute the cumulative alpha spent up to this look
  const alphaSpent = cumulativeAlphaSpent(infoFraction, alpha, spendingFunction);

  // Compute the alpha spent at the previous look (if any)
  const prevInfoFraction = (currentLook - 1) / maxLooks;
  const prevAlphaSpent =
    currentLook > 1 ? cumulativeAlphaSpent(prevInfoFraction, alpha, spendingFunction) : 0;

  // Incremental alpha for this look
  const incrementalAlpha = alphaSpent - prevAlphaSpent;

  // Two-sided boundary at this look
  const boundary = normalInv(1 - incrementalAlpha / 2);

  // Compute test statistic
  const zStat = computeZStat(control, treatment, metricType);

  // Determine decision
  const absZ = Math.abs(zStat);
  let shouldStop = false;
  let stopDecision: 'reject_null' | 'continue' | 'futility_stop' = 'continue';

  if (absZ >= boundary) {
    shouldStop = true;
    stopDecision = 'reject_null';
  } else if (futilityStopping && currentLook < maxLooks) {
    // Conditional power futility check
    // If conditional power < 10%, recommend stopping for futility
    const conditionalPower = computeConditionalPower(
      zStat,
      infoFraction,
      alpha,
      spendingFunction,
      maxLooks
    );
    if (conditionalPower < 0.1) {
      shouldStop = true;
      stopDecision = 'futility_stop';
    }
  }

  // At the last look, if we haven't stopped, it's the final decision
  if (currentLook === maxLooks && !shouldStop) {
    if (absZ >= boundary) {
      shouldStop = true;
      stopDecision = 'reject_null';
    }
  }

  // Adjusted p-value: the minimum alpha at which we would reject at this look
  // p* = alpha_spend function evaluated at the stage where |Z| first exceeds boundary
  const adjustedPValue = computeAdjustedPValue(
    absZ,
    infoFraction,
    alpha,
    spendingFunction
  );

  return {
    currentZStat: zStat,
    boundary,
    shouldStop,
    stopDecision,
    adjustedPValue: Math.min(1, adjustedPValue),
    adjustedAlpha: incrementalAlpha,
    informationFraction: infoFraction,
    looks: currentLook,
    maxLooks,
  };
}

// ──────────────────────────────────────────────
//  Alpha spending functions
// ──────────────────────────────────────────────

/**
 * Cumulative alpha spent at information fraction t for overall alpha level.
 */
function cumulativeAlphaSpent(
  t: number,
  alpha: number,
  fn: SpendingFunction
): number {
  if (t <= 0) return 0;
  if (t >= 1) return alpha;

  switch (fn) {
    case 'obrien-fleming':
      return obrienFlemingSpending(t, alpha);
    case 'pocock':
      return pocockSpending(t, alpha);
    case 'lan-demets':
      return lanDeMetsSpending(t, alpha);
    default:
      return obrienFlemingSpending(t, alpha);
  }
}

/**
 * O'Brien-Fleming alpha spending function.
 * alpha*(t) = 2 - 2 * Phi(z_{alpha/2} / sqrt(t))
 *
 * Very conservative early — spends almost no alpha in early looks.
 */
function obrienFlemingSpending(t: number, alpha: number): number {
  const zAlphaHalf = normalInv(1 - alpha / 2);
  return 2 * (1 - normalCdf(zAlphaHalf / Math.sqrt(t)));
}

/**
 * Pocock alpha spending function.
 * alpha*(t) = alpha * ln(1 + (e - 1) * t)
 *
 * Spends alpha more uniformly across looks.
 */
function pocockSpending(t: number, alpha: number): number {
  return alpha * Math.log(1 + (Math.E - 1) * t);
}

/**
 * Lan-DeMets alpha spending function (approximation to O'Brien-Fleming).
 * Uses the same formula as O'Brien-Fleming by default.
 * This is the standard implementation used in practice.
 */
function lanDeMetsSpending(t: number, alpha: number): number {
  // Lan-DeMets approximation to O'Brien-Fleming
  return obrienFlemingSpending(t, alpha);
}

// ──────────────────────────────────────────────
//  Z-statistic computation
// ──────────────────────────────────────────────

function computeZStat(
  control: SampleData,
  treatment: SampleData,
  metricType: string
): number {
  if (metricType === 'proportion') {
    const n1 = control.count;
    const n2 = treatment.count;
    const p1 =
      control.conversions != null ? control.conversions / n1 : control.mean;
    const p2 =
      treatment.conversions != null ? treatment.conversions / n2 : treatment.mean;

    const c1 = control.conversions ?? Math.round(p1 * n1);
    const c2 = treatment.conversions ?? Math.round(p2 * n2);
    const pPooled = (c1 + c2) / (n1 + n2);

    const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / n1 + 1 / n2));
    return se > 0 ? (p2 - p1) / se : 0;
  } else {
    const se = Math.sqrt(
      control.variance / control.count + treatment.variance / treatment.count
    );
    return se > 0 ? (treatment.mean - control.mean) / se : 0;
  }
}

// ──────────────────────────────────────────────
//  Conditional power (for futility stopping)
// ──────────────────────────────────────────────

/**
 * Conditional power under H1 (using observed effect as the true effect),
 * assuming the trial continues to completion.
 */
function computeConditionalPower(
  currentZ: number,
  infoFraction: number,
  alpha: number,
  spendingFunction: SpendingFunction,
  _maxLooks: number
): number {
  // Under H1 with the currently observed effect:
  // Final Z ~ N(currentZ / sqrt(infoFraction), 1)
  // projected final Z
  const projectedZ = currentZ / Math.sqrt(infoFraction);

  // Final boundary (at t=1)
  const finalBoundary = normalInv(1 - alpha / 2);

  // Conditional power = P(|Z_final| > boundary | Z_current)
  // projected mean of remaining = currentZ * sqrt((1-t)/t) under drift
  const remainingFrac = 1 - infoFraction;
  if (remainingFrac <= 0) return Math.abs(currentZ) >= finalBoundary ? 1 : 0;

  // Conditional power using the B-value representation
  // B(t) = Z(t) * sqrt(t), drift = theta * sqrt(n)
  // Conditional on B(t_k), B(1) ~ N(B(t_k) + drift*(1-t_k), 1-t_k)
  // Under observed drift theta_hat: drift = currentZ * sqrt(infoFraction)
  const drift = currentZ * Math.sqrt(infoFraction);
  const conditionalMean = drift; // = projectedZ
  const conditionalSe = Math.sqrt(1); // Z_final has variance 1

  const power =
    1 -
    normalCdf(finalBoundary - projectedZ) +
    normalCdf(-finalBoundary - projectedZ);

  return Math.max(0, Math.min(1, power));
}

// ──────────────────────────────────────────────
//  Adjusted p-value
// ──────────────────────────────────────────────

/**
 * Stage-wise adjusted p-value. The smallest alpha for which
 * the spending function boundary would be exceeded at this look.
 */
function computeAdjustedPValue(
  absZ: number,
  infoFraction: number,
  _overallAlpha: number,
  spendingFunction: SpendingFunction
): number {
  // Binary search for the smallest alpha such that
  // the boundary at this information fraction <= absZ
  let lo = 0;
  let hi = 1;

  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const spent = cumulativeAlphaSpent(infoFraction, mid, spendingFunction);
    const boundary = normalInv(1 - spent / 2);

    if (boundary > absZ) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return (lo + hi) / 2;
}

// ──────────────────────────────────────────────
//  Utility: compute all boundaries for a planned design
// ──────────────────────────────────────────────

export interface SequentialDesign {
  boundaries: number[];
  alphaSpent: number[];
  informationFractions: number[];
}

/**
 * Pre-compute all boundaries for a group sequential design.
 */
export function computeSequentialDesign(
  maxLooks: number,
  alpha: number = 0.05,
  spendingFunction: SpendingFunction = 'obrien-fleming'
): SequentialDesign {
  const boundaries: number[] = [];
  const alphaSpentArr: number[] = [];
  const infoFractions: number[] = [];

  let prevSpent = 0;

  for (let k = 1; k <= maxLooks; k++) {
    const t = k / maxLooks;
    const cumSpent = cumulativeAlphaSpent(t, alpha, spendingFunction);
    const incremental = cumSpent - prevSpent;
    const boundary = normalInv(1 - incremental / 2);

    boundaries.push(boundary);
    alphaSpentArr.push(cumSpent);
    infoFractions.push(t);

    prevSpent = cumSpent;
  }

  return { boundaries, alphaSpent: alphaSpentArr, informationFractions: infoFractions };
}
