/**
 * @abacus/stats — Bayesian A/B test analysis
 *
 * Beta-Binomial model for conversions, Normal-Normal for continuous metrics.
 * Monte Carlo simulation for probability of being best and expected loss.
 * Multi-variant support (A/B/C/D/...).
 */

import {
  randomBeta,
  randomNormal,
  randomGamma,
  mulberry32,
  betaInv,
  normalInv,
  betaPdf,
} from './distributions';
import type { VariantData, BayesianOptions, BayesianResult } from './types';

// ──────────────────────────────────────────────
//  Main entry point
// ──────────────────────────────────────────────

export function bayesianTest(
  variants: VariantData[],
  options: BayesianOptions = {}
): BayesianResult {
  if (variants.length < 2) {
    throw new Error('bayesianTest requires at least 2 variants');
  }

  const {
    numSamples = 50_000,
    credibleIntervalWidth = 0.95,
    metricType = variants[0].sample.conversions != null ? 'proportion' : 'continuous',
  } = options;

  if (metricType === 'proportion') {
    return betaBinomialTest(variants, options, numSamples, credibleIntervalWidth);
  } else {
    return normalNormalTest(variants, options, numSamples, credibleIntervalWidth);
  }
}

// ──────────────────────────────────────────────
//  Beta-Binomial model (conversion rates)
// ──────────────────────────────────────────────

function betaBinomialTest(
  variants: VariantData[],
  options: BayesianOptions,
  numSamples: number,
  ciWidth: number
): BayesianResult {
  const { priorAlpha = 1, priorBeta = 1, minConfidence = 0.95, seed } = options;
  // Non-deterministic by default; pass `seed` for reproducibility.
  const rng = mulberry32(seed ?? Date.now() >>> 0);

  const k = variants.length;

  // Posterior parameters: Beta(alpha + conversions, beta + failures)
  const posteriorAlphas = variants.map((v) => {
    const conv = v.sample.conversions ?? Math.round(v.sample.mean * v.sample.count);
    return priorAlpha + conv;
  });
  const posteriorBetas = variants.map((v) => {
    const conv = v.sample.conversions ?? Math.round(v.sample.mean * v.sample.count);
    return priorBeta + (v.sample.count - conv);
  });

  // Monte Carlo: sample from each posterior and count wins
  const winCounts = new Array(k).fill(0);
  const lossAccum = new Array(k).fill(0);

  for (let s = 0; s < numSamples; s++) {
    const samples = posteriorAlphas.map((a, i) => randomBeta(a, posteriorBetas[i], rng));

    // Find the best
    let bestVal = -Infinity;
    let bestIdx = 0;
    for (let i = 0; i < k; i++) {
      if (samples[i] > bestVal) {
        bestVal = samples[i];
        bestIdx = i;
      }
    }
    winCounts[bestIdx]++;

    // Expected loss: for each variant, how much worse is it than the best?
    for (let i = 0; i < k; i++) {
      lossAccum[i] += bestVal - samples[i];
    }
  }

  // Build results
  const probabilityOfBeingBest: Record<string, number> = {};
  const expectedLoss: Record<string, number> = {};
  const credibleInterval: Record<string, [number, number]> = {};
  const posteriorMean: Record<string, number> = {};
  const posteriorStd: Record<string, number> = {};

  const lowerTail = (1 - ciWidth) / 2;
  const upperTail = 1 - lowerTail;

  for (let i = 0; i < k; i++) {
    const id = variants[i].id;
    const a = posteriorAlphas[i];
    const b = posteriorBetas[i];

    probabilityOfBeingBest[id] = winCounts[i] / numSamples;
    expectedLoss[id] = lossAccum[i] / numSamples;

    posteriorMean[id] = a / (a + b);
    posteriorStd[id] = Math.sqrt((a * b) / ((a + b) * (a + b) * (a + b + 1)));

    // HDI approximation: use quantile-based credible interval
    // (exact HDI for beta is close to equal-tailed for moderate parameters)
    credibleInterval[id] = hdiFromBeta(a, b, ciWidth);
  }

  // Recommendation
  let bestId = variants[0].id;
  let bestProb = 0;
  for (const id of Object.keys(probabilityOfBeingBest)) {
    if (probabilityOfBeingBest[id] > bestProb) {
      bestProb = probabilityOfBeingBest[id];
      bestId = id;
    }
  }

  const confidenceLevel = bestProb;
  const recommendation = confidenceLevel >= minConfidence ? bestId : 'no_clear_winner';

  return {
    probabilityOfBeingBest,
    expectedLoss,
    credibleInterval,
    posteriorMean,
    posteriorStd,
    recommendation,
    confidenceLevel,
  };
}

// ──────────────────────────────────────────────
//  Normal-Normal model (continuous metrics)
// ──────────────────────────────────────────────

function normalNormalTest(
  variants: VariantData[],
  options: BayesianOptions,
  numSamples: number,
  ciWidth: number
): BayesianResult {
  const {
    priorMean = 0,
    priorVariance = 1e6, // very diffuse prior
    minConfidence = 0.95,
    seed,
  } = options;

  // Non-deterministic by default; pass `seed` for reproducibility.
  const rng = mulberry32(seed ?? Date.now() >>> 0);
  const k = variants.length;

  // Posterior parameters for Normal-Normal conjugate model
  // Prior: mu ~ N(priorMean, priorVariance)
  // Likelihood: x_i ~ N(mu, sigma^2/n)
  // Posterior: mu | data ~ N(posteriorMu, posteriorVar)
  const posteriorMus: number[] = [];
  const posteriorVars: number[] = [];

  for (const v of variants) {
    const n = v.sample.count;
    const xbar = v.sample.mean;
    const dataPrec = n / v.sample.variance; // 1 / (sigma^2 / n)
    const priorPrec = 1 / priorVariance;

    const postPrec = priorPrec + dataPrec;
    const postVar = 1 / postPrec;
    const postMu = postVar * (priorPrec * priorMean + dataPrec * xbar);

    posteriorMus.push(postMu);
    posteriorVars.push(postVar);
  }

  // Monte Carlo
  const winCounts = new Array(k).fill(0);
  const lossAccum = new Array(k).fill(0);

  for (let s = 0; s < numSamples; s++) {
    const samples = posteriorMus.map(
      (mu, i) => mu + Math.sqrt(posteriorVars[i]) * randomNormal(rng)
    );

    let bestVal = -Infinity;
    let bestIdx = 0;
    for (let i = 0; i < k; i++) {
      if (samples[i] > bestVal) {
        bestVal = samples[i];
        bestIdx = i;
      }
    }
    winCounts[bestIdx]++;

    for (let i = 0; i < k; i++) {
      lossAccum[i] += bestVal - samples[i];
    }
  }

  const probabilityOfBeingBest: Record<string, number> = {};
  const expectedLoss: Record<string, number> = {};
  const credibleInterval: Record<string, [number, number]> = {};
  const posteriorMean: Record<string, number> = {};
  const posteriorStd: Record<string, number> = {};

  const zLo = normalInv((1 - ciWidth) / 2);
  const zHi = normalInv(1 - (1 - ciWidth) / 2);

  for (let i = 0; i < k; i++) {
    const id = variants[i].id;
    probabilityOfBeingBest[id] = winCounts[i] / numSamples;
    expectedLoss[id] = lossAccum[i] / numSamples;
    posteriorMean[id] = posteriorMus[i];
    posteriorStd[id] = Math.sqrt(posteriorVars[i]);
    credibleInterval[id] = [
      posteriorMus[i] + zLo * Math.sqrt(posteriorVars[i]),
      posteriorMus[i] + zHi * Math.sqrt(posteriorVars[i]),
    ];
  }

  let bestId = variants[0].id;
  let bestProb = 0;
  for (const id of Object.keys(probabilityOfBeingBest)) {
    if (probabilityOfBeingBest[id] > bestProb) {
      bestProb = probabilityOfBeingBest[id];
      bestId = id;
    }
  }

  const confidenceLevel = bestProb;
  const recommendation = confidenceLevel >= minConfidence ? bestId : 'no_clear_winner';

  return {
    probabilityOfBeingBest,
    expectedLoss,
    credibleInterval,
    posteriorMean,
    posteriorStd,
    recommendation,
    confidenceLevel,
  };
}

// ──────────────────────────────────────────────
//  HDI for Beta distribution
// ──────────────────────────────────────────────

/**
 * Approximate Highest Density Interval for Beta(a, b).
 *
 * For unimodal beta (a>1 && b>1), we use a numerical search for the
 * narrowest interval containing `mass` probability.
 * For other shapes, fall back to equal-tailed interval.
 */
function hdiFromBeta(a: number, b: number, mass: number): [number, number] {
  if (a <= 1 || b <= 1) {
    // Equal-tailed interval as fallback
    const lo = betaInv((1 - mass) / 2, a, b);
    const hi = betaInv(1 - (1 - mass) / 2, a, b);
    return [lo, hi];
  }

  // Search for narrowest interval
  // We discretize the lower tail probability and find the one giving shortest interval
  const steps = 200;
  const tailMass = 1 - mass;
  let bestWidth = Infinity;
  let bestLo = 0;
  let bestHi = 1;

  for (let i = 0; i <= steps; i++) {
    const lowerTail = (tailMass * i) / steps;
    const lo = betaInv(lowerTail, a, b);
    const hi = betaInv(lowerTail + mass, a, b);
    const width = hi - lo;
    if (width < bestWidth) {
      bestWidth = width;
      bestLo = lo;
      bestHi = hi;
    }
  }

  return [bestLo, bestHi];
}
