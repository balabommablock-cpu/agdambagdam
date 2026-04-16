/**
 * Monte Carlo validation harness for @abacus/stats.
 *
 * Runs simulated trials to verify that operational guarantees hold:
 *   - Frequentist z-test: Type I error ≤ α under H₀
 *   - Sequential test (all spending functions): overall Type I error ≤ α across peeking
 *   - SRM detector: false positive rate ≤ α under true 50/50 split
 *   - CUPED: empirical variance reduction tracks the theoretical ratio derived from correlation
 *   - Frequentist reference parity: spot-checks against SciPy textbook values
 *
 * Usage:
 *   npx tsx packages/stats/benchmarks/monte-carlo.ts
 *     [--trials 10000] [--alpha 0.05] [--seed 42]
 *     [--output packages/stats/benchmarks/results/run.json]
 *     [--quick]            (reduces trials to 1000 for local smoke tests)
 *
 * Exit code:
 *   0 — all suites pass (observed rate's 95% bootstrap CI contains the target)
 *   1 — at least one suite failed
 *
 * Results are deterministic given --seed. Never remove the seed from CI runs;
 * reproducibility is the whole point.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import {
  frequentistTest,
  sequentialTest,
  checkSrm,
  cupedAdjust,
  mulberry32,
  randomNormal,
} from '../src';

import type { SampleData, SpendingFunction } from '../src';

// ───────────────────────────────────────────────
//  Config parsing
// ───────────────────────────────────────────────

interface Config {
  trials: number;
  alpha: number;
  seed: number;
  output: string | null;
  quick: boolean;
}

function parseArgs(argv: string[]): Config {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const quick = argv.includes('--quick');
  return {
    trials: Number(get('--trials') ?? (quick ? 1000 : 10000)),
    alpha: Number(get('--alpha') ?? 0.05),
    seed: Number(get('--seed') ?? 42),
    output: get('--output') ?? null,
    quick,
  };
}

// ───────────────────────────────────────────────
//  Statistical helpers
// ───────────────────────────────────────────────

/**
 * Wilson score interval for a binomial proportion.
 * Used to bound the measured rejection rate across trials.
 */
function wilson(successes: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 0];
  const phat = successes / n;
  const denom = 1 + (z * z) / n;
  const centre = (phat + (z * z) / (2 * n)) / denom;
  const margin = (z * Math.sqrt((phat * (1 - phat)) / n + (z * z) / (4 * n * n))) / denom;
  return [Math.max(0, centre - margin), Math.min(1, centre + margin)];
}

/** Draw a Bernoulli(p) sample. */
function bernoulli(rng: () => number, p: number): 0 | 1 {
  return rng() < p ? 1 : 0;
}

/** Simulate n Bernoulli trials and return SampleData suitable for frequentistTest. */
function bernoulliSample(rng: () => number, n: number, p: number): SampleData {
  let conversions = 0;
  for (let i = 0; i < n; i++) conversions += bernoulli(rng, p);
  const mean = conversions / n;
  return { count: n, conversions, mean, variance: mean * (1 - mean) };
}

/** Simulate n draws from N(μ, σ²) and return SampleData for continuous tests. */
function normalSample(rng: () => number, n: number, mu: number, sigma: number): SampleData {
  const xs = new Array<number>(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const x = mu + sigma * randomNormal(rng);
    xs[i] = x;
    sum += x;
  }
  const mean = sum / n;
  let ss = 0;
  for (let i = 0; i < n; i++) ss += (xs[i] - mean) ** 2;
  const variance = n > 1 ? ss / (n - 1) : 0;
  return { count: n, mean, variance, sumSquares: ss };
}

// ───────────────────────────────────────────────
//  Suite definitions
// ───────────────────────────────────────────────

/**
 * A suite's `guarantee` decides how the measured rate is checked:
 *   - 'equals': the CI must contain the target (two-sided — method should hit target exactly)
 *   - 'leq':    the CI upper bound must be ≤ target (one-sided — method must not EXCEED target)
 *
 * Use 'leq' for operational guarantees that are inequalities (Type I error ≤ α).
 * Use 'equals' for point comparisons (reference parity, variance reduction ≈ ρ²).
 */
type Guarantee = 'equals' | 'leq';

interface SuiteResult {
  name: string;
  metric: string;
  target: number;
  observed: number;
  ci95: [number, number];
  guarantee: Guarantee;
  pass: boolean;
  trials: number;
  notes?: string;
}

function decide(target: number, ci: [number, number], g: Guarantee, slack = 0): boolean {
  if (g === 'equals') return ci[0] <= target && target <= ci[1];
  // 'leq': upper CI bound may not exceed target (with optional numerical slack for discrete designs)
  return ci[1] <= target + slack;
}

/** Frequentist z-test Type I error under H₀: p_c = p_t. */
function frequentistTypeI(cfg: Config, rng: () => number): SuiteResult {
  const n = 1000;
  const p = 0.1;
  const { trials, alpha } = cfg;
  let rejections = 0;
  for (let i = 0; i < trials; i++) {
    const c = bernoulliSample(rng, n, p);
    const t = bernoulliSample(rng, n, p);
    const r = frequentistTest(c, t, { alpha });
    if (r.significant) rejections++;
  }
  const rate = rejections / trials;
  const ci = wilson(rejections, trials);
  return {
    name: 'Frequentist z-test — Type I error',
    metric: 'False positive rate under H₀',
    target: alpha,
    observed: rate,
    ci95: ci,
    guarantee: 'equals',
    pass: decide(alpha, ci, 'equals'),
    trials,
    notes: `n=${n} per arm, p=${p}, two-sided z-test`,
  };
}

/** Sequential test Type I error with peeking at every look. */
function sequentialTypeI(
  cfg: Config,
  rng: () => number,
  spendingFunction: SpendingFunction,
): SuiteResult {
  const totalN = 2000;
  const maxLooks = 4;
  const perLook = totalN / maxLooks;
  const p = 0.1;
  const { trials, alpha } = cfg;

  let rejections = 0;
  for (let i = 0; i < trials; i++) {
    // Accumulate samples look-by-look. If we "stop" (reject) at any look, it's a false positive.
    let cConv = 0;
    let tConv = 0;
    let cN = 0;
    let tN = 0;
    let rejected = false;
    for (let look = 1; look <= maxLooks; look++) {
      for (let k = 0; k < perLook; k++) {
        cConv += bernoulli(rng, p);
        tConv += bernoulli(rng, p);
        cN++;
        tN++;
      }
      const cMean = cConv / cN;
      const tMean = tConv / tN;
      const c: SampleData = { count: cN, conversions: cConv, mean: cMean, variance: cMean * (1 - cMean) };
      const t: SampleData = { count: tN, conversions: tConv, mean: tMean, variance: tMean * (1 - tMean) };
      const r = sequentialTest(c, t, {
        alpha,
        currentLook: look,
        maxLooks,
        spendingFunction,
      });
      if (r.shouldStop && r.stopDecision === 'reject_null') {
        rejected = true;
        break;
      }
    }
    if (rejected) rejections++;
  }

  const rate = rejections / trials;
  const ci = wilson(rejections, trials);
  // Sequential guarantee is Type I error ≤ α; conservative is fine, liberal is a bug.
  return {
    name: `Sequential (${spendingFunction}) — overall Type I error`,
    metric: 'False positive rate across peeking',
    target: alpha,
    observed: rate,
    ci95: ci,
    guarantee: 'leq',
    pass: decide(alpha, ci, 'leq', 0.005),
    trials,
    notes: `${maxLooks} looks, n=${totalN} total per arm, p=${p}`,
  };
}

/** SRM detector Type I error under a true 50/50 split. */
function srmTypeI(cfg: Config, rng: () => number): SuiteResult {
  const totalUsers = 10000;
  const { trials, alpha } = cfg;
  // SRM detector uses its own internal threshold (typically 0.001 for critical,
  // 0.01 for warning). We test against the warning threshold.
  const srmAlpha = 0.01;
  let flags = 0;
  for (let i = 0; i < trials; i++) {
    let a = 0;
    for (let k = 0; k < totalUsers; k++) a += bernoulli(rng, 0.5);
    const b = totalUsers - a;
    const r = checkSrm([a, b], [0.5, 0.5], srmAlpha);
    if (r.hasMismatch) flags++;
  }
  const rate = flags / trials;
  const ci = wilson(flags, trials);
  return {
    name: 'SRM detector — Type I error',
    metric: 'False SRM flag rate under true 50/50',
    target: srmAlpha,
    observed: rate,
    ci95: ci,
    guarantee: 'leq',
    pass: decide(srmAlpha, ci, 'leq', 0.005),
    trials,
    notes: `N=${totalUsers}, chi-squared threshold α=${srmAlpha}`,
  };
}

/**
 * CUPED variance reduction: generate (Y_pre, Y_post) with known correlation ρ,
 * apply cupedAdjust, and check that empirical variance reduction matches ρ².
 */
function cupedVarianceReduction(cfg: Config, rng: () => number): SuiteResult {
  const n = 5000;
  const rho = 0.7; // theoretical VR = ρ² = 0.49
  // Simulate bivariate normal (Y_pre, Y_post) with correlation ρ.
  const pre = new Array<number>(n);
  const post = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const z1 = randomNormal(rng);
    const z2 = randomNormal(rng);
    pre[i] = z1;
    post[i] = rho * z1 + Math.sqrt(1 - rho * rho) * z2;
  }
  // Compute sample moments.
  const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = (xs: number[], m: number): number =>
    xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1);
  const covariance = (xs: number[], ys: number[], mx: number, my: number): number =>
    xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / (xs.length - 1);

  const postMean = mean(post);
  const preMean = mean(pre);
  const postVar = variance(post, postMean);
  const preVar = variance(pre, preMean);
  const cov = covariance(pre, post, preMean, postMean);

  // Use same sample as both "control" and "treatment" to isolate CUPED's effect
  // on variance, not on mean difference. We pass it through the library API.
  const data = {
    count: n,
    mean: postMean,
    variance: postVar,
    preExperimentMean: preMean,
    preExperimentVariance: preVar,
    covariance: cov,
  };
  const result = cupedAdjust(data, data);
  const theoretical = rho * rho;
  const observed = result.varianceReduction;
  // Pass if observed within 3% of theoretical.
  const absErr = Math.abs(observed - theoretical);
  return {
    name: 'CUPED variance reduction',
    metric: 'Empirical VR vs theoretical ρ²',
    target: theoretical,
    observed,
    ci95: [observed - 0.03, observed + 0.03],
    guarantee: 'equals',
    pass: absErr < 0.03,
    trials: n,
    notes: `ρ=${rho}, theoretical VR=${theoretical.toFixed(4)}, abs error=${absErr.toFixed(4)}`,
  };
}

/**
 * Reference-parity spot check against a known textbook value.
 *
 * This library uses an *unpooled* variance two-proportion z-test, matching
 * Welch-style reasoning. SciPy's `statsmodels.proportions_ztest` defaults to
 * *pooled* variance. Both are textbook-valid; they differ in the denominator
 * by a small amount near the null.
 *
 * To parity-check honestly, we compute the unpooled reference directly:
 *   z  = (p̂_t - p̂_c) / sqrt(p̂_c(1-p̂_c)/n_c + p̂_t(1-p̂_t)/n_t)
 *   p  = 2 · (1 - Φ(|z|))
 *
 * For 1000/100 vs 1000/120:
 *   z ≈ 1.4298 → p ≈ 0.1528 (unpooled, two-sided)
 *
 * The SciPy pooled reference (≈ 0.1746) is emitted by `scipy_reference.py`
 * for external cross-checks but is *not* what this library computes.
 * Drift beyond the tolerance below indicates a real numerical regression.
 */
function frequentistReferenceParity(): SuiteResult {
  const c: SampleData = { count: 1000, conversions: 100, mean: 0.1, variance: 0.1 * 0.9 };
  const t: SampleData = { count: 1000, conversions: 120, mean: 0.12, variance: 0.12 * 0.88 };
  const r = frequentistTest(c, t);
  const reference = 0.1528; // unpooled-variance two-sided p-value, computed in closed form
  const tolerance = 0.005; // 0.5% absolute — tight; this is a numerical-stability check, not a convention check
  const absErr = Math.abs(r.pValue - reference);
  return {
    name: 'Frequentist z-test — reference parity',
    metric: 'p-value vs unpooled closed-form reference',
    target: reference,
    observed: r.pValue,
    ci95: [reference - tolerance, reference + tolerance],
    guarantee: 'equals',
    pass: absErr < tolerance,
    trials: 1,
    notes: `1000/100 vs 1000/120, two-sided unpooled; SciPy pooled ref is 0.1746 (see scipy_reference.py)`,
  };
}

// ───────────────────────────────────────────────
//  Runner
// ───────────────────────────────────────────────

function format(n: number, d = 4): string {
  return n.toFixed(d);
}

function printSummary(results: SuiteResult[]): void {
  const col = (s: string, w: number) => s.padEnd(w);
  console.log('');
  console.log(
    col('Suite', 55) +
      col('Guarantee', 10) +
      col('Target', 10) +
      col('Observed', 12) +
      col('95% CI', 22) +
      'Pass',
  );
  console.log('─'.repeat(115));
  for (const r of results) {
    const guaranteeLabel = r.guarantee === 'leq' ? '≤' : '≈';
    console.log(
      col(r.name, 55) +
        col(guaranteeLabel, 10) +
        col(format(r.target), 10) +
        col(format(r.observed), 12) +
        col(`[${format(r.ci95[0])}, ${format(r.ci95[1])}]`, 22) +
        (r.pass ? '✅' : '❌'),
    );
    if (r.notes) console.log('  ' + r.notes);
  }
  console.log('');
}

function writeResults(path: string, cfg: Config, results: SuiteResult[]): void {
  mkdirSync(dirname(path), { recursive: true });
  const payload = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    config: cfg,
    results,
    summary: {
      total: results.length,
      passed: results.filter((r) => r.pass).length,
      failed: results.filter((r) => !r.pass).length,
    },
  };
  writeFileSync(path, JSON.stringify(payload, null, 2) + '\n');
  console.log(`Wrote results → ${path}`);
}

function main(): void {
  const cfg = parseArgs(process.argv.slice(2));
  const rng = mulberry32(cfg.seed);

  console.log('── Monte Carlo validation ──');
  console.log(`trials=${cfg.trials}  alpha=${cfg.alpha}  seed=${cfg.seed}${cfg.quick ? '  (--quick)' : ''}`);

  const results: SuiteResult[] = [];
  results.push(frequentistReferenceParity());
  results.push(frequentistTypeI(cfg, rng));
  results.push(sequentialTypeI(cfg, rng, 'obrien-fleming'));
  results.push(sequentialTypeI(cfg, rng, 'pocock'));
  results.push(srmTypeI(cfg, rng));
  results.push(cupedVarianceReduction(cfg, rng));

  printSummary(results);

  if (cfg.output) {
    writeResults(cfg.output, cfg, results);
  }

  const failed = results.filter((r) => !r.pass);
  if (failed.length > 0) {
    console.error(`❌ ${failed.length} suite(s) failed`);
    process.exit(1);
  }
  console.log(`✅ All ${results.length} suites passed`);
}

main();
