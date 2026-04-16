/**
 * COMPREHENSIVE VALIDATION TEST SUITE
 *
 * Tests every statistical method against known reference values.
 * A single wrong number in an experimentation engine can cost
 * millions of dollars in bad decisions. No mercy.
 */

import {
  frequentistTest,
  bonferroniCorrection,
  bayesianTest,
  cupedAdjust,
  computeCupedData,
  computeCorrelation,
  estimateVarianceReduction,
  sequentialTest,
  computeSequentialDesign,
  checkSrm,
  requiredSampleSize,
  minimumDetectableEffect,
  computePower,
  thompsonSampling,
  ucb1,
  epsilonGreedy,
  normalCdf,
  normalInv,
} from './src/index';

// ============================================================
//  Test harness
// ============================================================

let passed = 0;
let failed = 0;
const failures: string[] = [];

function test(name: string, actual: number, expected: number, tolerancePct: number = 5) {
  const diff = expected !== 0
    ? Math.abs((actual - expected) / expected) * 100
    : Math.abs(actual) * 100; // for expected=0, treat actual as absolute error

  if (diff <= tolerancePct) {
    console.log(`  PASS: ${name}`);
    console.log(`        Expected: ${expected}, Got: ${actual} (${diff.toFixed(2)}% off)`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}`);
    console.log(`        Expected: ${expected}, Got: ${actual} (${diff.toFixed(2)}% off, tolerance: ${tolerancePct}%)`);
    failed++;
    failures.push(name);
  }
}

function testBool(name: string, actual: boolean, expected: boolean) {
  if (actual === expected) {
    console.log(`  PASS: ${name}`);
    console.log(`        Expected: ${expected}, Got: ${actual}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}`);
    console.log(`        Expected: ${expected}, Got: ${actual}`);
    failed++;
    failures.push(name);
  }
}

function testRange(name: string, actual: number, lo: number, hi: number) {
  if (actual >= lo && actual <= hi) {
    console.log(`  PASS: ${name}`);
    console.log(`        Expected: [${lo}, ${hi}], Got: ${actual}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}`);
    console.log(`        Expected: [${lo}, ${hi}], Got: ${actual}`);
    failed++;
    failures.push(name);
  }
}

// ============================================================
//  SECTION 1: DISTRIBUTION PRIMITIVES
// ============================================================

console.log('\n=== DISTRIBUTION PRIMITIVES ===\n');

// normalCdf: Phi(0) = 0.5, Phi(1.96) ≈ 0.975
test('normalCdf(0) = 0.5', normalCdf(0), 0.5, 0.01);
test('normalCdf(1.96) ≈ 0.975', normalCdf(1.96), 0.975, 0.1);
test('normalCdf(-1.96) ≈ 0.025', normalCdf(-1.96), 0.025, 1);

// normalInv: inverse at common quantiles
test('normalInv(0.975) ≈ 1.96', normalInv(0.975), 1.96, 0.5);
test('normalInv(0.5) = 0', normalInv(0.5), 0, 0.01);

// ============================================================
//  SECTION 2: FREQUENTIST TESTS
// ============================================================

console.log('\n=== FREQUENTIST TESTS ===\n');

// Test 1: Z-test, not significant
// Control: 1000 users, 100 conversions (10%)
// Treatment: 1000 users, 120 conversions (12%)
// Expected p-value: ~0.13-0.15 (standard two-proportion z-test)
{
  const result = frequentistTest(
    { count: 1000, conversions: 100, mean: 0.1, variance: 0.1 * 0.9 },
    { count: 1000, conversions: 120, mean: 0.12, variance: 0.12 * 0.88 },
    { metricType: 'proportion' }
  );

  testRange('Z-test p-value (small effect, n=1000)', result.pValue, 0.12, 0.17);
  testBool('Z-test not significant at 0.05', result.significant, false);

  // CI for the difference should contain 0
  const ciContainsZero = result.confidenceInterval[0] <= 0 && result.confidenceInterval[1] >= 0;
  testBool('Z-test CI contains 0 (not significant)', ciContainsZero, true);

  // Effect size (difference in proportions)
  test('Z-test effect size (difference)', result.effectSize,
    2 * (Math.asin(Math.sqrt(0.12)) - Math.asin(Math.sqrt(0.10))), 2);
}

// Test 2: Z-test, significant
// Control: 5000, 500 (10%). Treatment: 5000, 600 (12%).
// Expected p-value: ~0.001-0.003
{
  const result = frequentistTest(
    { count: 5000, conversions: 500, mean: 0.1, variance: 0.1 * 0.9 },
    { count: 5000, conversions: 600, mean: 0.12, variance: 0.12 * 0.88 },
    { metricType: 'proportion' }
  );

  testRange('Z-test p-value (large n, significant)', result.pValue, 0.0005, 0.005);
  testBool('Z-test significant at 0.05', result.significant, true);
  test('Z-test relative effect ≈ 20%', result.relativeEffect, 0.20, 5);
}

// Test 3: Bonferroni correction
// 3 comparisons, alpha 0.05 → each at 0.0167
{
  const result = frequentistTest(
    { count: 1000, conversions: 100, mean: 0.1, variance: 0.1 * 0.9 },
    { count: 1000, conversions: 120, mean: 0.12, variance: 0.12 * 0.88 },
    { correction: 'bonferroni', numComparisons: 3, metricType: 'proportion' }
  );

  test('Bonferroni alpha = 0.05/3 ≈ 0.0167', result.alpha, 0.05 / 3, 0.1);
}

// Test 4: Confidence interval for single proportion
// p = 0.1, n = 1000 → 95% CI ≈ [0.081, 0.119]
// We can test this via the z-test CI by setting treatment = control and checking
// Actually, the frequentist test gives CI for the *difference*. Let's verify the
// formula manually: SE = sqrt(p*(1-p)/n) = sqrt(0.09/1000) = 0.009487
// 95% CI = p ± 1.96 * SE = 0.1 ± 0.0186 = [0.0814, 0.1186]
{
  const p = 0.1;
  const n = 1000;
  const se = Math.sqrt(p * (1 - p) / n);
  const ciLow = p - 1.96 * se;
  const ciHigh = p + 1.96 * se;

  test('CI formula lower bound (p=0.1, n=1000)', ciLow, 0.0814, 2);
  test('CI formula upper bound (p=0.1, n=1000)', ciHigh, 0.1186, 2);

  // Verify normalInv(0.975) ≈ 1.96 (used in the CI)
  test('normalInv(0.975) for CI', normalInv(0.975), 1.96, 0.5);
}

// ============================================================
//  SECTION 3: BAYESIAN TESTS
// ============================================================

console.log('\n=== BAYESIAN TESTS ===\n');

// Test 1: Flat prior, Control 100/1000, Treatment 120/1000
// P(treatment best) should be ~85-90%
{
  const result = bayesianTest(
    [
      { id: 'control', name: 'Control', sample: { count: 1000, conversions: 100, mean: 0.1, variance: 0.09 } },
      { id: 'treatment', name: 'Treatment', sample: { count: 1000, conversions: 120, mean: 0.12, variance: 0.1056 } },
    ],
    { priorAlpha: 1, priorBeta: 1, numSamples: 100_000 }
  );

  testRange('Bayesian P(treatment best) flat prior', result.probabilityOfBeingBest['treatment'], 0.83, 0.93);

  // Posterior mean should be close to (alpha + conv) / (alpha + beta + n)
  // Control: (1+100)/(1+1+1000) = 101/1002 ≈ 0.10080
  // Treatment: (1+120)/(1+1+1000) = 121/1002 ≈ 0.12076
  test('Bayesian posterior mean control', result.posteriorMean['control'], 101 / 1002, 1);
  test('Bayesian posterior mean treatment', result.posteriorMean['treatment'], 121 / 1002, 1);
}

// Test 2: Strong prior Beta(100,900) = belief of 10%
{
  const resultStrong = bayesianTest(
    [
      { id: 'control', name: 'Control', sample: { count: 1000, conversions: 100, mean: 0.1, variance: 0.09 } },
      { id: 'treatment', name: 'Treatment', sample: { count: 1000, conversions: 120, mean: 0.12, variance: 0.1056 } },
    ],
    { priorAlpha: 100, priorBeta: 900, numSamples: 100_000 }
  );

  const resultFlat = bayesianTest(
    [
      { id: 'control', name: 'Control', sample: { count: 1000, conversions: 100, mean: 0.1, variance: 0.09 } },
      { id: 'treatment', name: 'Treatment', sample: { count: 1000, conversions: 120, mean: 0.12, variance: 0.1056 } },
    ],
    { priorAlpha: 1, priorBeta: 1, numSamples: 100_000 }
  );

  // With a strong prior at 10%, the treatment's posterior mean should be pulled toward 10%
  // So P(treatment best) should differ from the flat prior case
  const pBestStrong = resultStrong.probabilityOfBeingBest['treatment'];
  const pBestFlat = resultFlat.probabilityOfBeingBest['treatment'];

  console.log(`  INFO: P(treatment best) with flat prior: ${pBestFlat.toFixed(4)}`);
  console.log(`  INFO: P(treatment best) with strong prior: ${pBestStrong.toFixed(4)}`);

  // Strong prior should shrink treatment toward 10%, reducing P(best)
  // Treatment posterior: Beta(100+120, 900+880) = Beta(220, 1780) → mean = 220/2000 = 0.11
  // Control posterior: Beta(100+100, 900+900) = Beta(200, 1800) → mean = 200/2000 = 0.10
  const expectedTreatmentMean = 220 / 2000;
  const expectedControlMean = 200 / 2000;
  test('Strong prior treatment posterior mean', resultStrong.posteriorMean['treatment'], expectedTreatmentMean, 2);
  test('Strong prior control posterior mean', resultStrong.posteriorMean['control'], expectedControlMean, 2);

  // The two P(best) values should be different
  testBool('Strong vs flat prior: P(best) differs', Math.abs(pBestStrong - pBestFlat) > 0.01, true);
}

// Test 3: Multi-variant: A=10%, B=12%, C=15%, D=8%
{
  const result = bayesianTest(
    [
      { id: 'A', name: 'A', sample: { count: 1000, conversions: 100, mean: 0.10, variance: 0.09 }, isControl: true },
      { id: 'B', name: 'B', sample: { count: 1000, conversions: 120, mean: 0.12, variance: 0.1056 } },
      { id: 'C', name: 'C', sample: { count: 1000, conversions: 150, mean: 0.15, variance: 0.1275 } },
      { id: 'D', name: 'D', sample: { count: 1000, conversions: 80, mean: 0.08, variance: 0.0736 } },
    ],
    { numSamples: 100_000 }
  );

  // C (15%) should have the highest P(best)
  const pBestC = result.probabilityOfBeingBest['C'];
  const pBestA = result.probabilityOfBeingBest['A'];
  const pBestB = result.probabilityOfBeingBest['B'];
  const pBestD = result.probabilityOfBeingBest['D'];

  console.log(`  INFO: P(best): A=${pBestA.toFixed(4)}, B=${pBestB.toFixed(4)}, C=${pBestC.toFixed(4)}, D=${pBestD.toFixed(4)}`);

  testBool('Multi-variant: C has highest P(best)', pBestC > pBestA && pBestC > pBestB && pBestC > pBestD, true);
  testRange('Multi-variant: P(C best) > 0.95', pBestC, 0.95, 1.0);

  // Expected loss for C should be near 0
  testRange('Multi-variant: expected loss for C ≈ 0', result.expectedLoss['C'], 0, 0.002);
}

// ============================================================
//  SECTION 4: CUPED
// ============================================================

console.log('\n=== CUPED VARIANCE REDUCTION ===\n');

// Test 1: Synthetic data with known correlation r=0.7
// Variance reduction should be ~r^2 = 0.49
{
  // Generate correlated data: pre and post with r ≈ 0.7
  // Method: post = r*pre + sqrt(1-r^2)*noise
  const n = 5000;
  const r = 0.7;

  // Use a simple seeded LCG for reproducibility
  let seed = 12345;
  function lcg() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }
  function rnorm() {
    const u1 = lcg() || 0.001;
    const u2 = lcg();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  const preControl: number[] = [];
  const postControl: number[] = [];
  const preTreatment: number[] = [];
  const postTreatment: number[] = [];

  for (let i = 0; i < n; i++) {
    const preC = rnorm();
    const postC = r * preC + Math.sqrt(1 - r * r) * rnorm();
    preControl.push(preC);
    postControl.push(postC);

    const preT = rnorm();
    const postT = r * preT + Math.sqrt(1 - r * r) * rnorm() + 0.1; // treatment effect
    preTreatment.push(preT);
    postTreatment.push(postT);
  }

  const controlData = computeCupedData(preControl, postControl);
  const treatmentData = computeCupedData(preTreatment, postTreatment);

  const correlation = computeCorrelation(controlData);
  testRange('CUPED: correlation ≈ 0.7', correlation, 0.65, 0.75);

  const expectedVR = estimateVarianceReduction(correlation);
  testRange('CUPED: estimated variance reduction ≈ r^2', expectedVR, 0.42, 0.56);

  const cupedResult = cupedAdjust(controlData, treatmentData);
  testRange('CUPED: actual variance reduction ≈ 49%', cupedResult.varianceReduction, 0.40, 0.58);

  // Adjusted means should be close to original means
  test('CUPED: adjusted control mean ≈ original', cupedResult.adjustedControlMean, controlData.mean, 50);
  test('CUPED: adjusted treatment mean ≈ original', cupedResult.adjustedTreatmentMean, treatmentData.mean, 50);
}

// Test 2: Uncorrelated data → ~0% variance reduction
{
  const n = 2000;
  let seed2 = 99999;
  function lcg2() {
    seed2 = (seed2 * 1103515245 + 12345) & 0x7fffffff;
    return seed2 / 0x7fffffff;
  }
  function rnorm2() {
    const u1 = lcg2() || 0.001;
    const u2 = lcg2();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  const preC: number[] = [];
  const postC: number[] = [];
  const preT: number[] = [];
  const postT: number[] = [];

  for (let i = 0; i < n; i++) {
    preC.push(rnorm2());
    postC.push(rnorm2()); // independent
    preT.push(rnorm2());
    postT.push(rnorm2()); // independent
  }

  const cData = computeCupedData(preC, postC);
  const tData = computeCupedData(preT, postT);

  const corr = computeCorrelation(cData);
  testRange('CUPED: uncorrelated data r ≈ 0', Math.abs(corr), 0, 0.08);

  const result = cupedAdjust(cData, tData);
  testRange('CUPED: uncorrelated → ~0% variance reduction', result.varianceReduction, 0, 0.05);
}

// ============================================================
//  SECTION 5: SEQUENTIAL TESTING
// ============================================================

console.log('\n=== SEQUENTIAL TESTING ===\n');

// Test 1: O'Brien-Fleming boundaries
// At info fraction 0.5 (halfway through 2 looks), boundary should be ~2.80
// At info fraction 1.0, boundary should be ~2.02
{
  const design = computeSequentialDesign(2, 0.05, 'obrien-fleming');
  console.log(`  INFO: OBF boundaries for 2 looks: ${design.boundaries.map(b => b.toFixed(4)).join(', ')}`);

  // At look 1 of 2 (t=0.5): OBF boundary should be very conservative
  // The Lan-DeMets OBF spending function: alpha*(t) = 2*(1 - Phi(z_{alpha/2}/sqrt(t)))
  // At t=0.5: alpha* = 2*(1 - Phi(1.96/sqrt(0.5))) = 2*(1 - Phi(2.772)) ≈ 2*(1-0.99722) = 0.00556
  // Incremental alpha = 0.00556, boundary = Phi^{-1}(1 - 0.00556/2) = Phi^{-1}(0.99722) ≈ 2.77
  testRange('OBF boundary at t=0.5 (look 1/2)', design.boundaries[0], 2.5, 3.1);

  // At look 2 of 2 (t=1.0): remaining alpha = 0.05 - 0.00556 = 0.04444
  // Boundary = Phi^{-1}(1 - 0.04444/2) ≈ Phi^{-1}(0.97778) ≈ 2.01
  testRange('OBF boundary at t=1.0 (look 2/2)', design.boundaries[1], 1.90, 2.15);
}

// Test with 5 looks for Pocock
{
  const pocockDesign = computeSequentialDesign(5, 0.05, 'pocock');
  console.log(`  INFO: Pocock boundaries for 5 looks: ${pocockDesign.boundaries.map(b => b.toFixed(4)).join(', ')}`);

  // Pocock spending function: alpha * ln(1 + (e-1)*t)
  // The boundaries should be roughly constant (that's the Pocock property)
  // But with alpha spending approach, they won't be perfectly constant
  // They should all be in the range ~2.0-2.6
  const minB = Math.min(...pocockDesign.boundaries);
  const maxB = Math.max(...pocockDesign.boundaries);

  testRange('Pocock boundaries: min boundary', minB, 1.8, 2.6);
  testRange('Pocock boundaries: max boundary', maxB, 2.0, 3.0);

  // The spread should be smaller than OBF
  const spread = maxB - minB;
  testRange('Pocock boundaries: spread < 1.0 (roughly constant)', spread, 0, 1.0);
}

// Test 3: Clear winner at interim → should recommend stopping
{
  // Huge effect: 10% vs 20%, n=5000 each
  const result = sequentialTest(
    { count: 5000, conversions: 500, mean: 0.1, variance: 0.09 },
    { count: 5000, conversions: 1000, mean: 0.2, variance: 0.16 },
    { currentLook: 2, maxLooks: 5, spendingFunction: 'obrien-fleming' }
  );

  console.log(`  INFO: Sequential clear winner: z=${result.currentZStat.toFixed(4)}, boundary=${result.boundary.toFixed(4)}, stop=${result.shouldStop}`);
  testBool('Sequential: clear winner → stop', result.shouldStop, true);
  testBool('Sequential: clear winner → reject null', result.stopDecision === 'reject_null', true);
}

// Test 4: No effect → should continue
{
  const result = sequentialTest(
    { count: 1000, conversions: 100, mean: 0.1, variance: 0.09 },
    { count: 1000, conversions: 102, mean: 0.102, variance: 0.0916 },
    { currentLook: 1, maxLooks: 5, spendingFunction: 'obrien-fleming' }
  );

  console.log(`  INFO: Sequential no effect: z=${result.currentZStat.toFixed(4)}, boundary=${result.boundary.toFixed(4)}, stop=${result.shouldStop}`);
  testBool('Sequential: no effect → continue', result.shouldStop, false);
  testBool('Sequential: no effect → decision=continue', result.stopDecision === 'continue', true);
}

// ============================================================
//  SECTION 6: SRM DETECTION
// ============================================================

console.log('\n=== SRM DETECTION ===\n');

// Test 1: 50/50 split, 500/500 → no mismatch
{
  const result = checkSrm([500, 500], [0.5, 0.5]);
  testBool('SRM: 500/500 (50/50) → no mismatch', result.hasMismatch, false);
  testBool('SRM: 500/500 severity=none', result.severity === 'none', true);
}

// Test 2: 50/50 split, 550/450 → mismatch
{
  const result = checkSrm([550, 450], [0.5, 0.5]);
  // Chi-squared = (550-500)^2/500 + (450-500)^2/500 = 2500/500 + 2500/500 = 10
  // p-value for chi2=10, df=1 ≈ 0.0016
  console.log(`  INFO: SRM 550/450: chi2=${result.chiSquared.toFixed(4)}, p=${result.pValue.toFixed(6)}, severity=${result.severity}`);
  test('SRM: chi-squared for 550/450', result.chiSquared, 10, 1);
  testBool('SRM: 550/450 → has mismatch', result.hasMismatch, true);
  testBool('SRM: 550/450 → severity warning or critical', result.severity === 'warning' || result.severity === 'critical', true);
}

// Test 3: 50/50 split, 490/510 → normal variance, no mismatch
{
  const result = checkSrm([490, 510], [0.5, 0.5]);
  // Chi-squared = (490-500)^2/500 + (510-500)^2/500 = 100/500 + 100/500 = 0.4
  // p-value ≈ 0.527
  console.log(`  INFO: SRM 490/510: chi2=${result.chiSquared.toFixed(4)}, p=${result.pValue.toFixed(6)}`);
  testBool('SRM: 490/510 → no mismatch', result.hasMismatch, false);
  test('SRM: chi-squared for 490/510 ≈ 0.4', result.chiSquared, 0.4, 2);
}

// Test 4: 70/30 split, 700/300 → no mismatch
{
  const result = checkSrm([700, 300], [0.7, 0.3]);
  testBool('SRM: 700/300 (70/30) → no mismatch', result.hasMismatch, false);
}

// Test 5: 70/30 split, 750/250 → mismatch
{
  const result = checkSrm([750, 250], [0.7, 0.3]);
  // Expected: 700, 300
  // Chi2 = (750-700)^2/700 + (250-300)^2/300 = 2500/700 + 2500/300 = 3.571 + 8.333 = 11.905
  console.log(`  INFO: SRM 750/250 (70/30): chi2=${result.chiSquared.toFixed(4)}, p=${result.pValue.toFixed(6)}`);
  test('SRM: chi-squared for 750/250 ≈ 11.9', result.chiSquared, 11.905, 3);
  testBool('SRM: 750/250 (70/30) → has mismatch', result.hasMismatch, true);
}

// ============================================================
//  SECTION 7: POWER ANALYSIS
// ============================================================

console.log('\n=== POWER ANALYSIS ===\n');

// Test 1: Required sample size for 10% baseline, 2% MDE
// Standard formula: n = (z_{0.025}*sqrt(2*p_bar*(1-p_bar)) + z_{0.2}*sqrt(p1*(1-p1)+p2*(1-p2)))^2 / mde^2
// p1=0.10, p2=0.12, p_bar=0.11
// z_0.025 = 1.96, z_0.8 = 0.8416
// numerator = (1.96*sqrt(2*0.11*0.89) + 0.8416*sqrt(0.10*0.90+0.12*0.88))^2
//           = (1.96*sqrt(0.1958) + 0.8416*sqrt(0.1956))^2
//           = (1.96*0.4425 + 0.8416*0.4423)^2
//           = (0.8673 + 0.3723)^2
//           = (1.2396)^2 = 1.5366
// n = 1.5366 / 0.0004 = 3841
{
  const result = requiredSampleSize(0.10, 0.02, { alpha: 0.05, power: 0.8, metricType: 'proportion' });

  console.log(`  INFO: Required sample per variant: ${result.requiredSampleSizePerVariant}`);
  testRange('Power: sample size for 10% baseline, 2% MDE', result.requiredSampleSizePerVariant, 3500, 4200);
}

// Test 2: MDE with 1000 users per variant
// With n=1000, p=0.10, what MDE can we detect?
// Approximate: MDE ≈ (z_alpha/2 + z_beta) * sqrt(2*p*(1-p)/n)
// = (1.96 + 0.842) * sqrt(2*0.09/1000)
// = 2.802 * sqrt(0.00018)
// = 2.802 * 0.01342
// = 0.0376 ≈ 3.76%
{
  const mde = minimumDetectableEffect(0.10, 1000, { alpha: 0.05, power: 0.8, metricType: 'proportion' });

  console.log(`  INFO: MDE with n=1000: ${(mde * 100).toFixed(2)}%`);
  testRange('Power: MDE with n=1000 ≈ 3.7-4.0%', mde, 0.035, 0.045);
}

// Cross-check: with the computed MDE, the power should be ~0.80
{
  const mde = minimumDetectableEffect(0.10, 1000, { alpha: 0.05, power: 0.8, metricType: 'proportion' });
  const power = computePower(0.10, mde, 1000, { alpha: 0.05, metricType: 'proportion' });

  console.log(`  INFO: Power at computed MDE: ${power.toFixed(4)}`);
  testRange('Power: power at computed MDE ≈ 0.80', power, 0.78, 0.82);
}

// ============================================================
//  SECTION 8: BANDITS
// ============================================================

console.log('\n=== BANDIT ALGORITHMS ===\n');

// Test 1: Thompson Sampling with clear winner
// Arm A: 100/200 (50%), Arm B: 150/200 (75%)
{
  const result = thompsonSampling([
    { id: 'A', successes: 100, failures: 100 },
    { id: 'B', successes: 150, failures: 50 },
  ]);

  console.log(`  INFO: Thompson allocations: A=${result.allocations['A'].toFixed(4)}, B=${result.allocations['B'].toFixed(4)}`);
  testRange('Thompson: B allocation > 0.80', result.allocations['B'], 0.80, 1.0);
  testRange('Thompson: A allocation < 0.20', result.allocations['A'], 0, 0.20);
}

// Test 2: UCB1 should converge to best arm
{
  const result = ucb1([
    { id: 'A', successes: 100, failures: 100 },
    { id: 'B', successes: 150, failures: 50 },
  ]);

  console.log(`  INFO: UCB1 allocations: A=${result.allocations['A'].toFixed(4)}, B=${result.allocations['B'].toFixed(4)}`);
  console.log(`  INFO: UCB1 selected arm: ${result.selectedArm}`);

  // UCB1 selected arm should be B (higher mean + exploration bonus still higher)
  testBool('UCB1: selects B (clear winner)', result.selectedArm === 'B', true);

  // B should get higher allocation
  testBool('UCB1: B allocation > A allocation', result.allocations['B'] > result.allocations['A'], true);
}

// Test 3: Epsilon-greedy with epsilon=0.1
{
  const result = epsilonGreedy(
    [
      { id: 'A', successes: 100, failures: 100 },
      { id: 'B', successes: 150, failures: 50 },
    ],
    0.1
  );

  console.log(`  INFO: Epsilon-greedy allocations: A=${result.allocations['A'].toFixed(4)}, B=${result.allocations['B'].toFixed(4)}`);

  // B is the best arm (75% vs 50%)
  // Allocation: B gets (1-epsilon) + epsilon/k = 0.9 + 0.05 = 0.95
  // A gets epsilon/k = 0.05
  test('Epsilon-greedy: B allocation = 0.95', result.allocations['B'], 0.95, 1);
  test('Epsilon-greedy: A allocation = 0.05', result.allocations['A'], 0.05, 1);
}

// ============================================================
//  SECTION 9: EDGE CASES & REGRESSION TESTS
// ============================================================

console.log('\n=== EDGE CASES ===\n');

// Zero conversions
{
  const result = frequentistTest(
    { count: 1000, conversions: 0, mean: 0, variance: 0 },
    { count: 1000, conversions: 0, mean: 0, variance: 0 },
    { metricType: 'proportion' }
  );
  testBool('Edge: zero conversions both → not significant', result.significant, false);
}

// Very small sample size
{
  const result = frequentistTest(
    { count: 10, conversions: 1, mean: 0.1, variance: 0.09 },
    { count: 10, conversions: 3, mean: 0.3, variance: 0.21 },
    { metricType: 'proportion' }
  );
  testBool('Edge: n=10 → not significant (too small)', result.significant, false);
}

// Very large effect with small sample (should still detect)
{
  const result = frequentistTest(
    { count: 100, conversions: 10, mean: 0.1, variance: 0.09 },
    { count: 100, conversions: 40, mean: 0.4, variance: 0.24 },
    { metricType: 'proportion' }
  );
  testBool('Edge: huge effect (10% vs 40%) n=100 → significant', result.significant, true);
}

// SRM with equal observed and equal expected
{
  const result = checkSrm([1000, 1000], [0.5, 0.5]);
  test('Edge: perfect 50/50 split → chi2=0', result.chiSquared, 0, 0.01);
  testBool('Edge: perfect split → no mismatch', result.hasMismatch, false);
}

// ============================================================
//  SECTION 10: MATHEMATICAL CONSISTENCY CHECKS
// ============================================================

console.log('\n=== CONSISTENCY CHECKS ===\n');

// p-value consistency: if we make the effect larger, p-value should decrease
{
  const r1 = frequentistTest(
    { count: 1000, conversions: 100, mean: 0.1, variance: 0.09 },
    { count: 1000, conversions: 110, mean: 0.11, variance: 0.0979 },
    { metricType: 'proportion' }
  );
  const r2 = frequentistTest(
    { count: 1000, conversions: 100, mean: 0.1, variance: 0.09 },
    { count: 1000, conversions: 150, mean: 0.15, variance: 0.1275 },
    { metricType: 'proportion' }
  );

  testBool('Consistency: larger effect → smaller p-value', r2.pValue < r1.pValue, true);
}

// Bayesian: more data → higher confidence
{
  const rSmall = bayesianTest(
    [
      { id: 'C', name: 'C', sample: { count: 100, conversions: 10, mean: 0.1, variance: 0.09 } },
      { id: 'T', name: 'T', sample: { count: 100, conversions: 15, mean: 0.15, variance: 0.1275 } },
    ],
    { numSamples: 50_000 }
  );
  const rLarge = bayesianTest(
    [
      { id: 'C', name: 'C', sample: { count: 10000, conversions: 1000, mean: 0.1, variance: 0.09 } },
      { id: 'T', name: 'T', sample: { count: 10000, conversions: 1500, mean: 0.15, variance: 0.1275 } },
    ],
    { numSamples: 50_000 }
  );

  testBool('Consistency: more data → higher P(best) for winner',
    rLarge.probabilityOfBeingBest['T'] > rSmall.probabilityOfBeingBest['T'], true);
}

// Power: more users → higher power
{
  const p1 = computePower(0.10, 0.02, 500, { metricType: 'proportion' });
  const p2 = computePower(0.10, 0.02, 5000, { metricType: 'proportion' });

  testBool('Consistency: more users → higher power', p2 > p1, true);
}

// Sequential: OBF boundaries decrease over time
{
  const design = computeSequentialDesign(5, 0.05, 'obrien-fleming');
  let decreasing = true;
  for (let i = 1; i < design.boundaries.length; i++) {
    if (design.boundaries[i] > design.boundaries[i - 1]) {
      decreasing = false;
      break;
    }
  }
  testBool('Consistency: OBF boundaries decrease over looks', decreasing, true);
}

// ============================================================
//  FINAL REPORT
// ============================================================

console.log('\n' + '='.repeat(60));
console.log('  FINAL REPORT');
console.log('='.repeat(60));
console.log(`\n  Total tests: ${passed + failed}`);
console.log(`  PASSED: ${passed}`);
console.log(`  FAILED: ${failed}`);

if (failures.length > 0) {
  console.log('\n  FAILURES:');
  for (const f of failures) {
    console.log(`    - ${f}`);
  }
}

const score = ((passed / (passed + failed)) * 100).toFixed(1);
console.log(`\n  Score: ${score}%`);

if (failed === 0) {
  console.log('\n  VERDICT: All reference values match. The statistical engine');
  console.log('  passes every validation test against known reference values.');
  console.log('  The math checks out.');
} else if (failed <= 3) {
  console.log('\n  VERDICT: Minor issues detected. Most computations are correct');
  console.log('  but the failing tests need investigation before production use.');
} else {
  console.log('\n  VERDICT: SIGNIFICANT ISSUES DETECTED. This engine has mathematical');
  console.log('  errors that would lead to wrong business decisions. DO NOT ship');
  console.log('  this to production without fixing the failures above.');
}

console.log('');

process.exit(failed > 0 ? 1 : 0);
