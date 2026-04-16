/**
 * @abacus/stats — Frequentist hypothesis testing
 *
 * Two-sample Z-test (proportions), T-test (continuous), Chi-squared,
 * multiple comparison corrections, power analysis.
 */

import { normalCdf, normalInv, normalPdf, tCdf, tInv, chiSquaredCdf } from './distributions';
import type {
  SampleData,
  FrequentistOptions,
  FrequentistResult,
  CorrectionMethod,
  TestTail,
} from './types';

// ──────────────────────────────────────────────
//  Main entry point
// ──────────────────────────────────────────────

export function frequentistTest(
  control: SampleData,
  treatment: SampleData,
  options: FrequentistOptions = {}
): FrequentistResult {
  const {
    alpha = 0.05,
    tail = 'two',
    metricType = control.conversions != null ? 'proportion' : 'continuous',
    correction = 'none',
    numComparisons = 1,
  } = options;

  if (metricType === 'proportion') {
    return proportionZTest(control, treatment, alpha, tail, correction, numComparisons);
  } else {
    return meansTTest(control, treatment, alpha, tail, correction, numComparisons);
  }
}

// ──────────────────────────────────────────────
//  Two-sample Z-test for proportions
// ──────────────────────────────────────────────

function proportionZTest(
  control: SampleData,
  treatment: SampleData,
  alpha: number,
  tail: TestTail,
  correction: CorrectionMethod,
  numComparisons: number
): FrequentistResult {
  const n1 = control.count;
  const n2 = treatment.count;

  // Conversion rates
  const p1 = control.conversions != null ? control.conversions / n1 : control.mean;
  const p2 = treatment.conversions != null ? treatment.conversions / n2 : treatment.mean;

  // Pooled proportion under H0
  const c1 = control.conversions ?? Math.round(p1 * n1);
  const c2 = treatment.conversions ?? Math.round(p2 * n2);
  const pPooled = (c1 + c2) / (n1 + n2);

  // Standard error under H0
  const seH0 = Math.sqrt(pPooled * (1 - pPooled) * (1 / n1 + 1 / n2));

  // Standard error under Ha (for CI)
  const seHa = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);

  const diff = p2 - p1;
  const z = seH0 > 0 ? diff / seH0 : (diff !== 0 ? (diff > 0 ? 1e10 : -1e10) : 0);

  // Raw p-value
  let rawP: number;
  if (tail === 'two') {
    rawP = 2 * (1 - normalCdf(Math.abs(z)));
  } else if (tail === 'right') {
    rawP = 1 - normalCdf(z);
  } else {
    rawP = normalCdf(z);
  }

  // Apply multiple comparison correction
  const adjustedAlpha = adjustAlpha(alpha, correction, numComparisons);

  // Confidence interval for the difference
  const zCrit = tail === 'two' ? normalInv(1 - adjustedAlpha / 2) : normalInv(1 - adjustedAlpha);
  const ci: [number, number] =
    tail === 'two'
      ? [diff - zCrit * seHa, diff + zCrit * seHa]
      : tail === 'right'
        ? [diff - zCrit * seHa, Infinity]
        : [-Infinity, diff + zCrit * seHa];

  // Effect size (Cohen's h)
  const effectSize = 2 * (Math.asin(Math.sqrt(p2)) - Math.asin(Math.sqrt(p1)));
  const seCohensH = Math.sqrt(1 / n1 + 1 / n2);
  const effectSizeCI: [number, number] = [
    effectSize - zCrit * seCohensH,
    effectSize + zCrit * seCohensH,
  ];

  // Relative effect
  const relativeEffect = p1 !== 0 ? (p2 - p1) / p1 : p2 === 0 ? 0 : Infinity;
  // Delta method SE for relative effect
  const seRel = p1 !== 0
    ? Math.sqrt((p2 * (1 - p2)) / (n2 * p1 * p1) + (p2 * p2 * p1 * (1 - p1)) / (n1 * p1 * p1 * p1 * p1))
    : 0;
  const relativeEffectCI: [number, number] = [
    relativeEffect - zCrit * seRel,
    relativeEffect + zCrit * seRel,
  ];

  // Statistical power (post-hoc)
  const power = computePowerProportion(p1, p2, n1, n2, adjustedAlpha, tail);

  return {
    pValue: Math.min(1, rawP),
    confidenceInterval: ci,
    effectSize,
    effectSizeCI,
    relativeEffect,
    relativeEffectCI,
    power,
    significant: rawP < adjustedAlpha,
    alpha: adjustedAlpha,
  };
}

// ──────────────────────────────────────────────
//  Two-sample T-test for means (Welch's)
// ──────────────────────────────────────────────

function meansTTest(
  control: SampleData,
  treatment: SampleData,
  alpha: number,
  tail: TestTail,
  correction: CorrectionMethod,
  numComparisons: number
): FrequentistResult {
  const n1 = control.count;
  const n2 = treatment.count;
  const m1 = control.mean;
  const m2 = treatment.mean;
  const v1 = control.variance;
  const v2 = treatment.variance;

  // Welch's t-test
  const se = Math.sqrt(v1 / n1 + v2 / n2);
  const diff = m2 - m1;
  // When SE=0 and diff≠0, the signal is infinite — treat as maximally significant
  const t = se > 0 ? diff / se : (diff !== 0 ? (diff > 0 ? 1e10 : -1e10) : 0);

  // Welch-Satterthwaite degrees of freedom
  const num = (v1 / n1 + v2 / n2) ** 2;
  const den =
    (v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1);
  const df = den > 0 ? num / den : n1 + n2 - 2;

  // Raw p-value using t-distribution
  let rawP: number;
  if (tail === 'two') {
    rawP = 2 * (1 - tCdf(Math.abs(t), df));
  } else if (tail === 'right') {
    rawP = 1 - tCdf(t, df);
  } else {
    rawP = tCdf(t, df);
  }

  const adjustedAlpha = adjustAlpha(alpha, correction, numComparisons);

  // Confidence interval
  const tCrit = tail === 'two' ? tInv(1 - adjustedAlpha / 2, df) : tInv(1 - adjustedAlpha, df);
  const ci: [number, number] =
    tail === 'two'
      ? [diff - tCrit * se, diff + tCrit * se]
      : tail === 'right'
        ? [diff - tCrit * se, Infinity]
        : [-Infinity, diff + tCrit * se];

  // Cohen's d
  const pooledSd = Math.sqrt(
    ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2)
  );
  const effectSize = pooledSd > 0 ? diff / pooledSd : 0;
  const seD = Math.sqrt((n1 + n2) / (n1 * n2) + (effectSize * effectSize) / (2 * (n1 + n2)));
  const effectSizeCI: [number, number] = [
    effectSize - tCrit * seD,
    effectSize + tCrit * seD,
  ];

  // Relative effect
  const relativeEffect = m1 !== 0 ? diff / Math.abs(m1) : diff === 0 ? 0 : Infinity;
  const seRel = m1 !== 0 ? se / Math.abs(m1) : 0;
  const relativeEffectCI: [number, number] = [
    relativeEffect - tCrit * seRel,
    relativeEffect + tCrit * seRel,
  ];

  // Post-hoc power
  const power = computePowerContinuous(diff, se, n1 + n2, adjustedAlpha, tail);

  return {
    pValue: Math.min(1, Math.max(0, rawP)),
    confidenceInterval: ci,
    effectSize,
    effectSizeCI,
    relativeEffect,
    relativeEffectCI,
    power,
    significant: rawP < adjustedAlpha,
    alpha: adjustedAlpha,
  };
}

// ──────────────────────────────────────────────
//  Chi-squared test
// ──────────────────────────────────────────────

export interface ChiSquaredResult {
  chiSquared: number;
  pValue: number;
  degreesOfFreedom: number;
  significant: boolean;
}

export function chiSquaredTest(
  observed: number[],
  expected: number[],
  alpha: number = 0.05
): ChiSquaredResult {
  if (observed.length !== expected.length) {
    throw new Error('observed and expected arrays must have the same length');
  }

  const k = observed.length;
  let chi2 = 0;
  for (let i = 0; i < k; i++) {
    if (expected[i] === 0) continue;
    const diff = observed[i] - expected[i];
    chi2 += (diff * diff) / expected[i];
  }

  const df = k - 1;
  const pValue = 1 - chiSquaredCdf(chi2, df);

  return {
    chiSquared: chi2,
    pValue,
    degreesOfFreedom: df,
    significant: pValue < alpha,
  };
}

// ──────────────────────────────────────────────
//  Multiple comparison corrections
// ──────────────────────────────────────────────

function adjustAlpha(
  alpha: number,
  method: CorrectionMethod,
  numComparisons: number
): number {
  if (numComparisons <= 1 || method === 'none') return alpha;

  switch (method) {
    case 'bonferroni':
      return alpha / numComparisons;
    case 'holm':
      // For single-test adjustment, Holm gives same as Bonferroni at first step
      return alpha / numComparisons;
    case 'bh':
      // Benjamini-Hochberg: effectively alpha stays the same for individual test,
      // the correction is applied to the set of p-values. For single test, return alpha.
      return alpha;
    default:
      return alpha;
  }
}

/**
 * Apply Holm-Bonferroni correction to a set of p-values.
 * Returns adjusted p-values and which are significant.
 */
export function holmCorrection(
  pValues: number[],
  alpha: number = 0.05
): { adjusted: number[]; significant: boolean[] } {
  const n = pValues.length;
  const indices = Array.from({ length: n }, (_, i) => i);
  indices.sort((a, b) => pValues[a] - pValues[b]);

  const adjusted = new Array(n).fill(0);
  const significant = new Array(n).fill(false);
  let maxSoFar = 0;

  for (let rank = 0; rank < n; rank++) {
    const idx = indices[rank];
    const adj = pValues[idx] * (n - rank);
    maxSoFar = Math.max(maxSoFar, adj);
    adjusted[idx] = Math.min(1, maxSoFar);
    significant[idx] = adjusted[idx] < alpha;
  }

  return { adjusted, significant };
}

/**
 * Apply Benjamini-Hochberg (FDR) correction to a set of p-values.
 */
export function benjaminiHochberg(
  pValues: number[],
  alpha: number = 0.05
): { adjusted: number[]; significant: boolean[] } {
  const n = pValues.length;
  const indices = Array.from({ length: n }, (_, i) => i);
  indices.sort((a, b) => pValues[a] - pValues[b]);

  const adjusted = new Array(n).fill(0);
  const significant = new Array(n).fill(false);
  let minSoFar = 1;

  for (let rank = n - 1; rank >= 0; rank--) {
    const idx = indices[rank];
    const adj = (pValues[idx] * n) / (rank + 1);
    minSoFar = Math.min(minSoFar, adj);
    adjusted[idx] = Math.min(1, minSoFar);
    significant[idx] = adjusted[idx] < alpha;
  }

  return { adjusted, significant };
}

/**
 * Apply Bonferroni correction to a set of p-values.
 */
export function bonferroniCorrection(
  pValues: number[],
  alpha: number = 0.05
): { adjusted: number[]; significant: boolean[] } {
  const n = pValues.length;
  const adjusted = pValues.map((p) => Math.min(1, p * n));
  const significant = adjusted.map((p) => p < alpha);
  return { adjusted, significant };
}

// ──────────────────────────────────────────────
//  Power calculations (internal)
// ──────────────────────────────────────────────

function computePowerProportion(
  p1: number,
  p2: number,
  n1: number,
  n2: number,
  alpha: number,
  tail: TestTail
): number {
  const diff = p2 - p1;
  const seHa = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  if (seHa === 0) return diff === 0 ? alpha : 1;

  if (tail === 'two') {
    const zAlpha = normalInv(1 - alpha / 2);
    const z1 = (diff - zAlpha * seHa) / seHa;
    const z2 = (-diff - zAlpha * seHa) / seHa;
    return normalCdf(z1) + normalCdf(z2);
  } else {
    const zAlpha = normalInv(1 - alpha);
    if (tail === 'right') {
      return 1 - normalCdf(zAlpha - diff / seHa);
    } else {
      return normalCdf(-zAlpha - diff / seHa);
    }
  }
}

function computePowerContinuous(
  diff: number,
  se: number,
  _totalN: number,
  alpha: number,
  tail: TestTail
): number {
  if (se === 0) return diff === 0 ? alpha : 1;

  const ncp = diff / se; // non-centrality parameter

  if (tail === 'two') {
    const zAlpha = normalInv(1 - alpha / 2);
    return normalCdf(ncp - zAlpha) + normalCdf(-ncp - zAlpha);
  } else if (tail === 'right') {
    const zAlpha = normalInv(1 - alpha);
    return 1 - normalCdf(zAlpha - ncp);
  } else {
    const zAlpha = normalInv(1 - alpha);
    return normalCdf(-zAlpha - ncp);
  }
}
