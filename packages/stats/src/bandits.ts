/**
 * @abacus/stats — Multi-armed bandit algorithms
 *
 * Thompson Sampling, UCB1, Epsilon-Greedy, and Contextual Bandits (LinUCB).
 * All implemented from scratch with no external dependencies.
 */

import { randomBeta, mulberry32, randomNormal } from './distributions';
import type { BanditVariant, BanditResult } from './types';

// ──────────────────────────────────────────────
//  Thompson Sampling (Beta-Bernoulli)
// ──────────────────────────────────────────────

/**
 * Thompson Sampling for Bernoulli bandits.
 *
 * Each arm has a Beta(successes+1, failures+1) posterior.
 * We sample from each posterior and pick the arm with the highest sample.
 * Traffic allocation is proportional to the probability of being best
 * (estimated via Monte Carlo).
 *
 * @param variants - Array of bandit arms with success/failure counts
 * @param seed - Optional random seed for reproducibility
 * @returns Bandit result with allocations and selected arm
 */
export function thompsonSampling(
  variants: BanditVariant[],
  seed: number = 42
): BanditResult {
  if (variants.length === 0) throw new Error('Need at least one variant');

  const rng = mulberry32(seed);
  const k = variants.length;

  // Single draw for arm selection
  let bestIdx = 0;
  let bestSample = -Infinity;
  const currentSamples: number[] = [];

  for (let i = 0; i < k; i++) {
    const alpha = variants[i].successes + 1;
    const beta = variants[i].failures + 1;
    const sample = randomBeta(alpha, beta, rng);
    currentSamples.push(sample);
    if (sample > bestSample) {
      bestSample = sample;
      bestIdx = i;
    }
  }

  // Estimate allocation via Monte Carlo (probability of being best)
  const numSim = 10_000;
  const winCounts = new Array(k).fill(0);

  for (let s = 0; s < numSim; s++) {
    let simBestIdx = 0;
    let simBestVal = -Infinity;
    for (let i = 0; i < k; i++) {
      const alpha = variants[i].successes + 1;
      const beta = variants[i].failures + 1;
      const sample = randomBeta(alpha, beta, rng);
      if (sample > simBestVal) {
        simBestVal = sample;
        simBestIdx = i;
      }
    }
    winCounts[simBestIdx]++;
  }

  const allocations: Record<string, number> = {};
  for (let i = 0; i < k; i++) {
    allocations[variants[i].id] = winCounts[i] / numSim;
  }

  // Estimated regret: difference between best arm's true rate and weighted rate
  const trueRates = variants.map(
    (v) => (v.successes + 1) / (v.successes + v.failures + 2) // posterior mean
  );
  const bestRate = Math.max(...trueRates);
  const totalPulls = variants.reduce(
    (sum, v) => sum + v.successes + v.failures,
    0
  );
  let regret = 0;
  for (let i = 0; i < k; i++) {
    const pulls = variants[i].successes + variants[i].failures;
    regret += pulls * (bestRate - trueRates[i]);
  }

  // Exploration rate: entropy of allocation / max entropy
  const maxEntropy = Math.log(k);
  let entropy = 0;
  for (let i = 0; i < k; i++) {
    const p = allocations[variants[i].id];
    if (p > 0) entropy -= p * Math.log(p);
  }
  const explorationRate = maxEntropy > 0 ? entropy / maxEntropy : 0;

  return {
    allocations,
    selectedArm: variants[bestIdx].id,
    regret,
    explorationRate,
  };
}

// ──────────────────────────────────────────────
//  UCB1 (Upper Confidence Bound)
// ──────────────────────────────────────────────

/**
 * UCB1 algorithm for multi-armed bandits.
 *
 * Selects the arm with the highest upper confidence bound:
 *   UCB_i = mean_i + sqrt(2 * ln(total_pulls) / pulls_i)
 *
 * @param variants - Array of bandit arms
 * @returns Bandit result with selected arm
 */
export function ucb1(variants: BanditVariant[]): BanditResult {
  if (variants.length === 0) throw new Error('Need at least one variant');

  const k = variants.length;
  const totalPulls = variants.reduce(
    (sum, v) => sum + v.successes + v.failures,
    0
  );

  // If any arm hasn't been pulled, select it
  for (let i = 0; i < k; i++) {
    if (variants[i].successes + variants[i].failures === 0) {
      const allocations: Record<string, number> = {};
      // Equal allocation for unpulled arms
      const unpulled = variants.filter(
        (v) => v.successes + v.failures === 0
      ).length;
      for (let j = 0; j < k; j++) {
        const pulls = variants[j].successes + variants[j].failures;
        allocations[variants[j].id] = pulls === 0 ? 1 / unpulled : 0;
      }
      return {
        allocations,
        selectedArm: variants[i].id,
        regret: 0,
        explorationRate: 1,
      };
    }
  }

  const logTotal = Math.log(totalPulls);

  // Compute UCB for each arm
  const ucbValues: number[] = [];
  const means: number[] = [];
  let bestIdx = 0;
  let bestUcb = -Infinity;

  for (let i = 0; i < k; i++) {
    const pulls = variants[i].successes + variants[i].failures;
    const mean = variants[i].successes / pulls;
    means.push(mean);
    const ucb = mean + Math.sqrt((2 * logTotal) / pulls);
    ucbValues.push(ucb);
    if (ucb > bestUcb) {
      bestUcb = ucb;
      bestIdx = i;
    }
  }

  // Allocations: proportional to UCB values (softmax-style)
  const totalUcb = ucbValues.reduce((s, u) => s + u, 0);
  const allocations: Record<string, number> = {};
  for (let i = 0; i < k; i++) {
    allocations[variants[i].id] = totalUcb > 0 ? ucbValues[i] / totalUcb : 1 / k;
  }

  // Regret
  const bestRate = Math.max(...means);
  let regret = 0;
  for (let i = 0; i < k; i++) {
    const pulls = variants[i].successes + variants[i].failures;
    regret += pulls * (bestRate - means[i]);
  }

  // Exploration rate
  const maxEntropy = Math.log(k);
  let entropy = 0;
  for (let i = 0; i < k; i++) {
    const p = allocations[variants[i].id];
    if (p > 0) entropy -= p * Math.log(p);
  }
  const explorationRate = maxEntropy > 0 ? entropy / maxEntropy : 0;

  return {
    allocations,
    selectedArm: variants[bestIdx].id,
    regret,
    explorationRate,
  };
}

// ──────────────────────────────────────────────
//  Epsilon-Greedy
// ──────────────────────────────────────────────

/**
 * Epsilon-greedy algorithm.
 *
 * With probability epsilon, explore uniformly at random.
 * With probability (1 - epsilon), exploit the best arm.
 *
 * @param variants - Array of bandit arms
 * @param epsilon - Exploration rate (default 0.1)
 * @param seed - Optional random seed
 * @returns Bandit result
 */
export function epsilonGreedy(
  variants: BanditVariant[],
  epsilon: number = 0.1,
  seed: number = 42
): BanditResult {
  if (variants.length === 0) throw new Error('Need at least one variant');

  const k = variants.length;
  const rng = mulberry32(seed);

  // Find the greedy arm (highest observed mean)
  let bestIdx = 0;
  let bestMean = -Infinity;
  const means: number[] = [];

  for (let i = 0; i < k; i++) {
    const pulls = variants[i].successes + variants[i].failures;
    const mean = pulls > 0 ? variants[i].successes / pulls : 0.5; // optimistic default
    means.push(mean);
    if (mean > bestMean) {
      bestMean = mean;
      bestIdx = i;
    }
  }

  // Select arm
  let selectedIdx: number;
  if (rng() < epsilon) {
    selectedIdx = Math.floor(rng() * k);
  } else {
    selectedIdx = bestIdx;
  }

  // Allocation: (1-epsilon) for best arm, epsilon/k for each arm
  const allocations: Record<string, number> = {};
  for (let i = 0; i < k; i++) {
    allocations[variants[i].id] = epsilon / k + (i === bestIdx ? 1 - epsilon : 0);
  }

  // Regret
  const bestRate = Math.max(...means);
  let regret = 0;
  for (let i = 0; i < k; i++) {
    const pulls = variants[i].successes + variants[i].failures;
    regret += pulls * (bestRate - means[i]);
  }

  return {
    allocations,
    selectedArm: variants[selectedIdx].id,
    regret,
    explorationRate: epsilon,
  };
}

// ──────────────────────────────────────────────
//  LinUCB (Contextual Bandit)
// ──────────────────────────────────────────────

/**
 * LinUCB algorithm for contextual bandits.
 *
 * Models the expected reward as a linear function of context features:
 *   E[r | x, a] = x^T * theta_a
 *
 * Uses ridge regression with confidence bounds:
 *   UCB_a = x^T * theta_hat_a + alpha * sqrt(x^T * A_a^{-1} * x)
 *
 * Reference: Li et al. (2010) "A Contextual-Bandit Approach to
 * Personalized News Article Recommendation"
 *
 * @param variants - Bandit arms with feature vectors per observation
 * @param context - Current context feature vector
 * @param alpha - Exploration parameter (default 1.0)
 * @returns Bandit result with selected arm
 */
export function linUcb(
  variants: BanditVariant[],
  context: number[],
  alpha: number = 1.0
): BanditResult {
  if (variants.length === 0) throw new Error('Need at least one variant');
  if (context.length === 0) throw new Error('Context vector must not be empty');

  const k = variants.length;
  const d = context.length;

  let bestIdx = 0;
  let bestUcb = -Infinity;
  const ucbValues: number[] = [];

  for (let i = 0; i < k; i++) {
    const v = variants[i];
    const features = v.features || [];
    const rewards = v.rewards || [];

    if (features.length === 0 || rewards.length === 0) {
      // No data: maximum exploration
      ucbValues.push(Infinity);
      if (bestUcb < Infinity) {
        bestUcb = Infinity;
        bestIdx = i;
      }
      continue;
    }

    // Build A = I + sum(x_t * x_t^T) and b = sum(r_t * x_t)
    // A is d x d, b is d x 1
    const A = identityMatrix(d);
    const b = new Array(d).fill(0);

    const nObs = Math.min(features.length, rewards.length);
    for (let t = 0; t < nObs; t++) {
      const x = features[t];
      if (x.length !== d) continue;

      // A += x * x^T
      for (let r = 0; r < d; r++) {
        for (let c = 0; c < d; c++) {
          A[r][c] += x[r] * x[c];
        }
      }
      // b += r_t * x
      for (let j = 0; j < d; j++) {
        b[j] += rewards[t] * x[j];
      }
    }

    // theta_hat = A^{-1} * b
    const AInv = invertMatrix(A);
    const thetaHat = matVecMul(AInv, b);

    // UCB = x^T * theta_hat + alpha * sqrt(x^T * A^{-1} * x)
    const predicted = dotProduct(context, thetaHat);
    const AInvX = matVecMul(AInv, context);
    const uncertainty = Math.sqrt(Math.max(0, dotProduct(context, AInvX)));
    const ucb = predicted + alpha * uncertainty;

    ucbValues.push(ucb);
    if (ucb > bestUcb) {
      bestUcb = ucb;
      bestIdx = i;
    }
  }

  // Allocations: softmax over UCB values (handle Infinity)
  const hasInf = ucbValues.some((u) => !isFinite(u));
  const allocations: Record<string, number> = {};

  if (hasInf) {
    const infCount = ucbValues.filter((u) => !isFinite(u)).length;
    for (let i = 0; i < k; i++) {
      allocations[variants[i].id] = !isFinite(ucbValues[i]) ? 1 / infCount : 0;
    }
  } else {
    // Softmax
    const maxUcb = Math.max(...ucbValues);
    const exps = ucbValues.map((u) => Math.exp(u - maxUcb));
    const sumExps = exps.reduce((s, e) => s + e, 0);
    for (let i = 0; i < k; i++) {
      allocations[variants[i].id] = exps[i] / sumExps;
    }
  }

  // Regret: estimate using observed rewards
  const meanRewards = variants.map((v) => {
    const r = v.rewards || [];
    return r.length > 0 ? r.reduce((s, x) => s + x, 0) / r.length : 0;
  });
  const bestReward = Math.max(...meanRewards);
  let regret = 0;
  for (let i = 0; i < k; i++) {
    const pulls = (variants[i].rewards || []).length;
    regret += pulls * (bestReward - meanRewards[i]);
  }

  // Exploration rate
  const maxEntropy = Math.log(k);
  let entropy = 0;
  for (let i = 0; i < k; i++) {
    const p = allocations[variants[i].id];
    if (p > 0) entropy -= p * Math.log(p);
  }
  const explorationRate = maxEntropy > 0 ? entropy / maxEntropy : 0;

  return {
    allocations,
    selectedArm: variants[bestIdx].id,
    regret,
    explorationRate,
  };
}

// ──────────────────────────────────────────────
//  Linear algebra helpers (small matrices only)
// ──────────────────────────────────────────────

function identityMatrix(n: number): number[][] {
  const m: number[][] = [];
  for (let i = 0; i < n; i++) {
    m[i] = new Array(n).fill(0);
    m[i][i] = 1;
  }
  return m;
}

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function matVecMul(M: number[][], v: number[]): number[] {
  const n = M.length;
  const result = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < v.length; j++) {
      result[i] += M[i][j] * v[j];
    }
  }
  return result;
}

/**
 * Matrix inversion via Gauss-Jordan elimination.
 * For the small matrices used in LinUCB (dimension = number of features),
 * this is perfectly adequate.
 */
function invertMatrix(matrix: number[][]): number[][] {
  const n = matrix.length;

  // Augmented matrix [A | I]
  const aug: number[][] = [];
  for (let i = 0; i < n; i++) {
    aug[i] = new Array(2 * n).fill(0);
    for (let j = 0; j < n; j++) {
      aug[i][j] = matrix[i][j];
    }
    aug[i][n + i] = 1;
  }

  // Forward elimination with partial pivoting
  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxVal = Math.abs(aug[col][col]);
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }

    // Swap rows
    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }

    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-15) {
      // Singular — return identity as fallback (regularized)
      return identityMatrix(n);
    }

    // Scale pivot row
    for (let j = 0; j < 2 * n; j++) {
      aug[col][j] /= pivot;
    }

    // Eliminate column
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // Extract inverse
  const inv: number[][] = [];
  for (let i = 0; i < n; i++) {
    inv[i] = new Array(n);
    for (let j = 0; j < n; j++) {
      inv[i][j] = aug[i][n + j];
    }
  }

  return inv;
}
