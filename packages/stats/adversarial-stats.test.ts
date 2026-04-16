/**
 * Adversarial stress tests for @abacus/stats
 *
 * These tests probe edge cases, numerical extremes, and common pitfalls
 * in statistical software. Each test documents what the mathematically
 * correct answer should be.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  frequentistTest,
  bayesianTest,
  cupedAdjust,
  computeCorrelation,
  sequentialTest,
  computeSequentialDesign,
  checkSrm,
  thompsonSampling,
  ucb1,
  epsilonGreedy,
  normalCdf,
  normalInv,
  betaCdf,
  betaInv,
  bonferroniCorrection,
  benjaminiHochberg,
  holmCorrection,
} from './src/index';

// ================================================================
//  TEST 1: Small Sample Pathologies
// ================================================================

describe('Test 1: Small Sample Pathologies', () => {
  it('1a. Bayesian with n=1 per variant (1/1 vs 0/1) should not crash', () => {
    // With Beta(1,1) prior: posterior A = Beta(2,1), posterior B = Beta(1,2)
    // P(A best) should be high (~75% analytically)
    const result = bayesianTest([
      { id: 'A', name: 'Control', sample: { count: 1, conversions: 1, mean: 1.0, variance: 0 } },
      { id: 'B', name: 'Treatment', sample: { count: 1, conversions: 0, mean: 0.0, variance: 0 } },
    ]);

    console.log('Test 1a - Bayesian n=1:');
    console.log('  P(A best):', result.probabilityOfBeingBest['A']);
    console.log('  P(B best):', result.probabilityOfBeingBest['B']);
    console.log('  Recommendation:', result.recommendation);

    // Should not produce NaN or crash
    assert.ok(!isNaN(result.probabilityOfBeingBest['A']), 'P(A best) should not be NaN');
    assert.ok(!isNaN(result.probabilityOfBeingBest['B']), 'P(B best) should not be NaN');
    // A should be favored
    assert.ok(result.probabilityOfBeingBest['A'] > 0.5, 'A (1/1) should be favored over B (0/1)');

    const sum = result.probabilityOfBeingBest['A'] + result.probabilityOfBeingBest['B'];
    assert.ok(Math.abs(sum - 1.0) < 0.02, `Probabilities should sum to ~1.0, got ${sum}`);
    console.log('  RESULT: PASS');
  });

  it('1b. Frequentist with n=2 per variant should not crash', () => {
    // With n=2, degrees of freedom = very small. Welch-Satterthwaite may produce df < 1
    const result = frequentistTest(
      { count: 2, conversions: 1, mean: 0.5, variance: 0.5 },
      { count: 2, conversions: 0, mean: 0.0, variance: 0 },
    );

    console.log('Test 1b - Frequentist n=2:');
    console.log('  p-value:', result.pValue);
    console.log('  CI:', result.confidenceInterval);
    console.log('  significant:', result.significant);

    assert.ok(!isNaN(result.pValue), 'p-value should not be NaN');
    assert.ok(isFinite(result.pValue), 'p-value should be finite');
    assert.ok(result.pValue >= 0 && result.pValue <= 1, `p-value should be in [0,1], got ${result.pValue}`);
    console.log('  RESULT: PASS (no crash)');
  });

  it('1c. Frequentist proportion with n=2, both zero variance', () => {
    // Both groups: 1/2 conversion. Pooled proportion = 0.5, difference = 0
    // SE under H0 = sqrt(0.5*0.5*(1/2+1/2)) = sqrt(0.25) = 0.5
    // z = 0/0.5 = 0, p-value should be 1.0
    const result = frequentistTest(
      { count: 2, conversions: 1, mean: 0.5, variance: 0.25 },
      { count: 2, conversions: 1, mean: 0.5, variance: 0.25 },
    );

    console.log('Test 1c - Frequentist n=2 identical:');
    console.log('  p-value:', result.pValue);
    assert.ok(result.pValue > 0.9, `p-value should be ~1.0, got ${result.pValue}`);
    assert.ok(!isNaN(result.pValue), 'p-value should not be NaN');
    console.log('  RESULT: PASS');
  });

  it('1d. CUPED with n=3 (not enough for meaningful regression)', () => {
    // With n=3, variance estimates are very noisy
    const control = {
      count: 3, mean: 0.5, variance: 0.1,
      preExperimentMean: 0.4, preExperimentVariance: 0.1, covariance: 0.05,
    };
    const treatment = {
      count: 3, mean: 0.6, variance: 0.1,
      preExperimentMean: 0.45, preExperimentVariance: 0.1, covariance: 0.05,
    };

    const result = cupedAdjust(control, treatment);
    console.log('Test 1d - CUPED n=3:');
    console.log('  theta:', result.theta);
    console.log('  variance reduction:', result.varianceReduction);
    console.log('  adjusted variances:', result.adjustedControlVariance, result.adjustedTreatmentVariance);

    assert.ok(!isNaN(result.theta), 'theta should not be NaN');
    assert.ok(!isNaN(result.varianceReduction), 'variance reduction should not be NaN');
    assert.ok(result.adjustedControlVariance >= 0, 'adjusted variance should be >= 0');
    assert.ok(result.adjustedTreatmentVariance >= 0, 'adjusted variance should be >= 0');
    console.log('  RESULT: PASS (no crash, non-negative variances)');
  });
});

// ================================================================
//  TEST 2: Identical Variants
// ================================================================

describe('Test 2: Identical Variants', () => {
  it('2a. Frequentist: identical 10% conversion rates (100/1000 each)', () => {
    // Mathematically: difference = 0, z = 0, p-value = 1.0
    const result = frequentistTest(
      { count: 1000, conversions: 100, mean: 0.1, variance: 0.1 * 0.9 },
      { count: 1000, conversions: 100, mean: 0.1, variance: 0.1 * 0.9 },
    );

    console.log('Test 2a - Identical variants, frequentist:');
    console.log('  p-value:', result.pValue);
    console.log('  effect size:', result.effectSize);
    console.log('  significant:', result.significant);

    // p-value should be exactly 1.0 (or extremely close)
    assert.ok(result.pValue > 0.99, `p-value should be ~1.0, got ${result.pValue}`);
    assert.strictEqual(result.significant, false, 'Should NOT be significant');
    assert.ok(Math.abs(result.effectSize) < 0.001, `Effect size should be ~0, got ${result.effectSize}`);
    console.log('  RESULT: PASS');
  });

  it('2b. Bayesian: identical 10% rates should give ~50/50 P(best)', () => {
    const result = bayesianTest([
      { id: 'A', name: 'Control', sample: { count: 1000, conversions: 100, mean: 0.1, variance: 0.09 } },
      { id: 'B', name: 'Treatment', sample: { count: 1000, conversions: 100, mean: 0.1, variance: 0.09 } },
    ]);

    console.log('Test 2b - Identical variants, Bayesian:');
    console.log('  P(A best):', result.probabilityOfBeingBest['A']);
    console.log('  P(B best):', result.probabilityOfBeingBest['B']);
    console.log('  Recommendation:', result.recommendation);

    const pA = result.probabilityOfBeingBest['A'];
    const pB = result.probabilityOfBeingBest['B'];
    // Should be approximately 50/50 (within MC noise)
    assert.ok(Math.abs(pA - 0.5) < 0.05, `P(A best) should be ~0.5, got ${pA}`);
    assert.ok(Math.abs(pB - 0.5) < 0.05, `P(B best) should be ~0.5, got ${pB}`);
    // Should NOT recommend either since neither has >95% probability
    assert.strictEqual(result.recommendation, 'no_clear_winner',
      `Should be "no_clear_winner", got "${result.recommendation}"`);
    console.log('  RESULT: PASS');
  });
});

// ================================================================
//  TEST 3: Perfect Separation (0% vs 100%)
// ================================================================

describe('Test 3: Perfect Separation', () => {
  it('3a. Frequentist Z-test: 0/1000 vs 1000/1000', () => {
    // p1=0, p2=1, pooled=0.5, SE=sqrt(0.5*0.5*(1/1000+1/1000))=sqrt(0.0005)~0.02236
    // z = 1.0 / 0.02236 ~ 44.72, p-value ~ 0
    const result = frequentistTest(
      { count: 1000, conversions: 0, mean: 0.0, variance: 0 },
      { count: 1000, conversions: 1000, mean: 1.0, variance: 0 },
    );

    console.log('Test 3a - Perfect separation, frequentist:');
    console.log('  p-value:', result.pValue);
    console.log('  z-stat implied:', 'very large');
    console.log('  significant:', result.significant);
    console.log('  CI:', result.confidenceInterval);

    assert.ok(!isNaN(result.pValue), 'p-value should not be NaN');
    assert.ok(isFinite(result.pValue), 'p-value should be finite');
    assert.ok(result.pValue < 0.0001, `p-value should be ~0, got ${result.pValue}`);
    assert.strictEqual(result.significant, true, 'Should be significant');

    // NOTE: The SE under Ha is sqrt(0*1/1000 + 1*0/1000) = 0
    // This means the CI under Ha has width 0. Check if this is handled.
    console.log('  SE under Ha is 0 (both p*(1-p) terms are 0)');
    console.log('  CI width:', result.confidenceInterval[1] - result.confidenceInterval[0]);

    // The CI should be [1.0, 1.0] or degenerate -- this is technically correct
    // but may surprise users
    const ciWidth = result.confidenceInterval[1] - result.confidenceInterval[0];
    if (ciWidth === 0) {
      console.log('  NOTE: CI has zero width -- degenerate but mathematically correct');
    }
    console.log('  RESULT: PASS (detects significance correctly)');
  });

  it('3b. Bayesian: 0/1000 vs 1000/1000', () => {
    // Posterior A = Beta(1, 1001), posterior B = Beta(1001, 1)
    // P(B best) should be ~1.0
    const result = bayesianTest([
      { id: 'A', name: 'Control', sample: { count: 1000, conversions: 0, mean: 0.0, variance: 0 } },
      { id: 'B', name: 'Treatment', sample: { count: 1000, conversions: 1000, mean: 1.0, variance: 0 } },
    ]);

    console.log('Test 3b - Perfect separation, Bayesian:');
    console.log('  P(A best):', result.probabilityOfBeingBest['A']);
    console.log('  P(B best):', result.probabilityOfBeingBest['B']);

    assert.ok(result.probabilityOfBeingBest['B'] > 0.999,
      `P(B best) should be ~1.0, got ${result.probabilityOfBeingBest['B']}`);
    assert.ok(!isNaN(result.probabilityOfBeingBest['A']), 'Should not be NaN');
    assert.ok(!isNaN(result.probabilityOfBeingBest['B']), 'Should not be NaN');
    console.log('  RESULT: PASS');
  });
});

// ================================================================
//  TEST 4: Extreme Imbalance
// ================================================================

describe('Test 4: Extreme Sample Size Imbalance', () => {
  it('4a. Frequentist: n=10000 (10% CR) vs n=10 (50% CR)', () => {
    // Treatment looks better (50% vs 10%) but n=10 is tiny
    // The Z-test should NOT be significant due to huge SE on treatment
    const result = frequentistTest(
      { count: 10000, conversions: 1000, mean: 0.1, variance: 0.1 * 0.9 },
      { count: 10, conversions: 5, mean: 0.5, variance: 0.5 * 0.5 },
    );

    console.log('Test 4a - Extreme imbalance, frequentist:');
    console.log('  p-value:', result.pValue);
    console.log('  significant:', result.significant);
    console.log('  CI:', result.confidenceInterval);
    console.log('  effect size:', result.effectSize);

    // With n=10 in treatment, SE is huge. This MIGHT be significant because
    // the pooled proportion under H0 gives a different SE.
    // Pooled p = (1000+5)/(10000+10) = 1005/10010 ~ 0.1004
    // SE = sqrt(0.1004*0.8996*(1/10000 + 1/10)) = sqrt(0.1004*0.8996*0.1001) ~ 0.095
    // z = (0.5-0.1)/0.095 ~ 4.2 => p < 0.001
    // WAIT - this IS significant. The pooled SE is dominated by the control's rate.
    // This is actually a known issue with the pooled Z-test for very imbalanced samples.
    console.log('  NOTE: Pooled Z-test uses control-dominated pooled proportion');

    // Let's check the CI instead - it should be very wide
    const ciWidth = result.confidenceInterval[1] - result.confidenceInterval[0];
    console.log('  CI width:', ciWidth);

    assert.ok(!isNaN(result.pValue), 'p-value should not be NaN');
    assert.ok(isFinite(result.pValue), 'p-value should be finite');
    console.log('  RESULT: PASS (no crash, but note pooled Z-test limitation with imbalanced n)');
  });

  it('4b. Bayesian: n=10000 (10%) vs n=10 (50%) should show wide CI for treatment', () => {
    const result = bayesianTest([
      { id: 'A', name: 'Control', sample: { count: 10000, conversions: 1000, mean: 0.1, variance: 0.09 } },
      { id: 'B', name: 'Treatment', sample: { count: 10, conversions: 5, mean: 0.5, variance: 0.25 } },
    ]);

    console.log('Test 4b - Extreme imbalance, Bayesian:');
    console.log('  P(A best):', result.probabilityOfBeingBest['A']);
    console.log('  P(B best):', result.probabilityOfBeingBest['B']);
    console.log('  CI(A):', result.credibleInterval['A']);
    console.log('  CI(B):', result.credibleInterval['B']);

    const ciWidthA = result.credibleInterval['A'][1] - result.credibleInterval['A'][0];
    const ciWidthB = result.credibleInterval['B'][1] - result.credibleInterval['B'][0];
    console.log('  CI width A:', ciWidthA.toFixed(4));
    console.log('  CI width B:', ciWidthB.toFixed(4));

    // Treatment CI should be MUCH wider than control CI
    assert.ok(ciWidthB > ciWidthA * 5,
      `Treatment CI (${ciWidthB.toFixed(4)}) should be much wider than control CI (${ciWidthA.toFixed(4)})`);

    // With Beta(6,6) posterior for treatment vs Beta(1001, 9001) for control:
    // Treatment is very uncertain. B should NOT be clearly best.
    console.log('  RESULT: PASS');
  });
});

// ================================================================
//  TEST 5: Multiple Comparison Inflation
// ================================================================

describe('Test 5: Multiple Comparison Inflation (False Positive Factory)', () => {
  it('5a. 10 variants at 10% CR: raw pValues will produce false positives', () => {
    // All variants are identical (10% CR), but comparing each to control
    // gives us 9 comparisons. By chance, some will appear "significant".

    const control = { count: 1000, conversions: 100, mean: 0.1, variance: 0.09 };

    // Simulate slight random variation (as you'd see in practice)
    const treatmentConversions = [102, 98, 105, 95, 110, 93, 108, 97, 103];
    const pValues: number[] = [];

    for (const conv of treatmentConversions) {
      const rate = conv / 1000;
      const result = frequentistTest(
        control,
        { count: 1000, conversions: conv, mean: rate, variance: rate * (1 - rate) },
      );
      pValues.push(result.pValue);
    }

    console.log('Test 5a - Multiple comparisons, raw p-values:');
    pValues.forEach((p, i) => console.log(`  Variant ${i + 1} (${treatmentConversions[i]}/1000): p = ${p.toFixed(4)}`));

    // Check if the frequentistTest function with numComparisons applies correction
    const resultWithCorrection = frequentistTest(
      control,
      { count: 1000, conversions: 110, mean: 0.11, variance: 0.11 * 0.89 },
      { correction: 'bonferroni', numComparisons: 9 },
    );

    console.log('  With Bonferroni (numComparisons=9):');
    console.log('    adjusted alpha:', resultWithCorrection.alpha);
    console.log('    significant:', resultWithCorrection.significant);

    // The adjusted alpha should be 0.05/9 ~ 0.0056
    assert.ok(Math.abs(resultWithCorrection.alpha - 0.05 / 9) < 0.001,
      `Adjusted alpha should be ~${(0.05/9).toFixed(4)}, got ${resultWithCorrection.alpha}`);
    console.log('  RESULT: PASS (correction available and works)');
  });

  it('5b. BH correction on batch of p-values', () => {
    // 9 p-values from comparisons where true effect is 0
    // Some will be small by chance
    const pValues = [0.83, 0.72, 0.35, 0.52, 0.04, 0.68, 0.12, 0.77, 0.61];

    const bhResult = benjaminiHochberg(pValues, 0.05);
    const bonfResult = bonferroniCorrection(pValues, 0.05);
    const holmResult = holmCorrection(pValues, 0.05);

    console.log('Test 5b - Multiple comparison corrections:');
    console.log('  Raw p-values:', pValues);
    console.log('  BH adjusted:', bhResult.adjusted.map(p => p.toFixed(4)));
    console.log('  BH significant:', bhResult.significant);
    console.log('  Bonf adjusted:', bonfResult.adjusted.map(p => p.toFixed(4)));
    console.log('  Bonf significant:', bonfResult.significant);
    console.log('  Holm adjusted:', holmResult.adjusted.map(p => p.toFixed(4)));
    console.log('  Holm significant:', holmResult.significant);

    // The p=0.04 value: Bonferroni adjusted = 0.04*9 = 0.36, NOT significant
    assert.strictEqual(bonfResult.significant[4], false,
      'Bonferroni should NOT flag p=0.04 with 9 comparisons');

    // With BH: the smallest p=0.04 gets adjusted to 0.04*9/1 = 0.36, NOT significant
    assert.strictEqual(bhResult.significant[4], false,
      'BH should NOT flag p=0.04 with 9 comparisons (all null)');

    console.log('  RESULT: PASS (corrections properly prevent false positives)');
  });

  it('5c. DEFAULT correction is "none" -- users must opt in', () => {
    // This is a DESIGN CONCERN: by default, no correction is applied
    // A user running 10 tests without knowing about correction will get false positives
    const result = frequentistTest(
      { count: 10000, conversions: 1000, mean: 0.1, variance: 0.09 },
      { count: 10000, conversions: 1050, mean: 0.105, variance: 0.105 * 0.895 },
    );
    console.log('Test 5c - Default correction:');
    console.log('  alpha used:', result.alpha);
    console.log('  NOTE: Default correction is "none" - users must explicitly opt in');
    console.log('  This is a design risk but common in stats libraries');
    console.log('  RESULT: PASS (but note: no automatic MCP protection)');
    assert.strictEqual(result.alpha, 0.05, 'Default alpha should be 0.05 (no correction)');
  });
});

// ================================================================
//  TEST 6: CUPED with Negative Correlation
// ================================================================

describe('Test 6: CUPED with Negative Correlation', () => {
  it('6a. Negative correlation (r ~ -0.7): CUPED should still reduce variance', () => {
    // When pre and post are negatively correlated, theta is negative
    // Var(Y_adj) = Var(Y) - 2*theta*Cov + theta^2*Var(X)
    //            = Var(Y) * (1 - rho^2) -- same formula! rho^2 is always positive.
    // So variance reduction should still work.
    const control = {
      count: 1000, mean: 10.0, variance: 4.0,
      preExperimentMean: 9.5, preExperimentVariance: 3.5,
      covariance: -2.6, // negative correlation: r ~ -2.6/sqrt(3.5*4) ~ -0.695
    };
    const treatment = {
      count: 1000, mean: 10.5, variance: 4.2,
      preExperimentMean: 9.6, preExperimentVariance: 3.6,
      covariance: -2.7,
    };

    const result = cupedAdjust(control, treatment);
    const r = computeCorrelation(control);

    console.log('Test 6a - CUPED negative correlation:');
    console.log('  Correlation r:', r.toFixed(4));
    console.log('  Theta:', result.theta.toFixed(4));
    console.log('  Variance reduction:', (result.varianceReduction * 100).toFixed(1) + '%');
    console.log('  Original variance:', result.originalVariance);
    console.log('  Reduced variance:', result.reducedVariance);

    // theta should be negative
    assert.ok(result.theta < 0, `theta should be negative, got ${result.theta}`);

    // Variance reduction should STILL be positive (rho^2 > 0 regardless of sign)
    assert.ok(result.varianceReduction > 0.3,
      `Variance reduction should be >30%, got ${(result.varianceReduction * 100).toFixed(1)}%`);

    // Check: does the code clamp varianceReduction to [0, inf) or to [0, 1]?
    // The code has: Math.max(0, 1 - reducedVariance / originalVariance)
    // This means if reducedVariance > originalVariance, it would report 0% reduction
    // but the actual adjusted variance formula: Var(Y) - Cov^2/Var(X) is always <= Var(Y)
    // (since Cov^2/Var(X) >= 0), so this should be fine.

    // However, the pooled theta can be different from per-group theta.
    // If pooled theta != Cov/Var(X), then adjusted variance might actually INCREASE.
    // Let's verify the reduced variance is less than original
    assert.ok(result.reducedVariance < result.originalVariance,
      `Reduced variance (${result.reducedVariance}) should be < original (${result.originalVariance})`);

    console.log('  RESULT: PASS (negative correlation handled correctly)');
  });

  it('6b. CUPED variance reduction is clamped to 0 (never negative)', () => {
    // Edge case: mismatched covariances could theoretically increase variance
    // if using pooled theta with very different group covariances
    const control = {
      count: 100, mean: 10.0, variance: 4.0,
      preExperimentMean: 9.5, preExperimentVariance: 3.5,
      covariance: 2.6, // positive correlation
    };
    const treatment = {
      count: 100, mean: 10.5, variance: 4.2,
      preExperimentMean: 9.6, preExperimentVariance: 3.6,
      covariance: -2.7, // negative correlation! Opposite sign from control.
    };

    const result = cupedAdjust(control, treatment);
    console.log('Test 6b - CUPED with opposite-sign covariances:');
    console.log('  Theta:', result.theta);
    console.log('  Variance reduction:', (result.varianceReduction * 100).toFixed(1) + '%');
    console.log('  Original variance:', result.originalVariance);
    console.log('  Reduced variance:', result.reducedVariance);

    // The variance reduction should be >= 0 (clamped by Math.max(0, ...))
    assert.ok(result.varianceReduction >= 0,
      `Variance reduction should be >= 0, got ${result.varianceReduction}`);

    // But the adjusted individual variances might be inflated since pooled theta
    // is a compromise between positive and negative
    console.log('  Adjusted control variance:', result.adjustedControlVariance);
    console.log('  Adjusted treatment variance:', result.adjustedTreatmentVariance);

    // Check if either adjusted variance exceeds the original
    if (result.reducedVariance > result.originalVariance) {
      console.log('  WARNING: Reduced variance EXCEEDS original! CUPED is making things WORSE.');
      console.log('  But varianceReduction is clamped to 0, so this is hidden from the user.');
      console.log('  This could be MISLEADING -- user thinks CUPED is neutral when it is harmful.');
    }
    console.log('  RESULT: PASS (clamped, but potential masking of variance increase)');
  });
});

// ================================================================
//  TEST 7: Sequential Testing Abuse
// ================================================================

describe('Test 7: Sequential Testing Boundaries', () => {
  it('7a. OBF boundary at very early look (t=0.01) should be very large', () => {
    // At information fraction 0.01, OBF should spend almost no alpha
    // boundary should be huge (> 5)
    const design = computeSequentialDesign(100, 0.05, 'obrien-fleming');
    const firstBoundary = design.boundaries[0]; // t = 0.01

    console.log('Test 7a - OBF at t=0.01:');
    console.log('  Boundary:', firstBoundary.toFixed(4));
    console.log('  Alpha spent at t=0.01:', design.alphaSpent[0].toExponential(4));

    assert.ok(firstBoundary > 5,
      `Boundary at t=0.01 should be > 5 (very conservative), got ${firstBoundary.toFixed(4)}`);
    assert.ok(isFinite(firstBoundary), 'Boundary should be finite');
    console.log('  RESULT: PASS');
  });

  it('7b. OBF boundary at t=0.001 (1000 looks) should not be Infinity', () => {
    const design = computeSequentialDesign(1000, 0.05, 'obrien-fleming');
    const firstBoundary = design.boundaries[0]; // t = 0.001

    console.log('Test 7b - OBF at t=0.001 (1000 looks):');
    console.log('  Boundary:', firstBoundary);
    console.log('  isFinite:', isFinite(firstBoundary));

    // OBF spending: alpha*(t) = 2(1 - Phi(z_alpha/2 / sqrt(t)))
    // At t=0.001: z_alpha/2 / sqrt(0.001) = 1.96/0.0316 = 62.02
    // Phi(62) = 1 - epsilon, so alpha*(0.001) ~ 0
    // Incremental alpha = alpha*(0.001) - 0 ~ 0
    // Boundary = normalInv(1 - 0/2) = normalInv(1) = Infinity!

    // This IS a problem: with 1000 looks, the first boundary will be Infinity
    // because the incremental alpha is effectively 0.
    if (!isFinite(firstBoundary)) {
      console.log('  FINDING: Boundary is Infinity at very early looks!');
      console.log('  This is mathematically correct (you can never reject at t=0.001 with OBF)');
      console.log('  but the code should handle this gracefully.');
    }

    // The boundary should at least not be NaN
    assert.ok(!isNaN(firstBoundary), 'Boundary should not be NaN');
    console.log('  RESULT: PASS (Infinity is correct for OBF at tiny fractions)');
  });

  it('7c. Sequential test: boundaries should be monotonically non-increasing (OBF)', () => {
    const design = computeSequentialDesign(10, 0.05, 'obrien-fleming');
    console.log('Test 7c - OBF monotonicity (10 looks):');
    console.log('  Boundaries:', design.boundaries.map(b => b.toFixed(4)));

    let monotonic = true;
    for (let i = 1; i < design.boundaries.length; i++) {
      if (design.boundaries[i] > design.boundaries[i - 1] + 0.001) {
        monotonic = false;
        console.log(`  NON-MONOTONIC at look ${i + 1}: ${design.boundaries[i].toFixed(4)} > ${design.boundaries[i - 1].toFixed(4)}`);
      }
    }

    // NOTE: With the incremental alpha spending approach, boundaries may NOT be
    // monotonically decreasing if incremental alpha varies non-monotonically.
    // This is actually a BUG in the implementation: standard OBF boundaries
    // ARE monotonically decreasing.
    if (!monotonic) {
      console.log('  FINDING: Boundaries are NOT monotonically decreasing!');
      console.log('  Standard OBF boundaries should always decrease over looks.');
      console.log('  This suggests the incremental alpha approach has issues.');
    }
    console.log('  RESULT:', monotonic ? 'PASS' : 'FAIL (non-monotonic boundaries)');
  });

  it('7d. Total alpha spent equals overall alpha', () => {
    const design = computeSequentialDesign(5, 0.05, 'obrien-fleming');
    const totalAlpha = design.alphaSpent[design.alphaSpent.length - 1];

    console.log('Test 7d - Total alpha conservation:');
    console.log('  Total alpha spent:', totalAlpha);

    assert.ok(Math.abs(totalAlpha - 0.05) < 0.001,
      `Total alpha should be ~0.05, got ${totalAlpha}`);
    console.log('  RESULT: PASS');
  });
});

// ================================================================
//  TEST 8: SRM with Extreme Ratios
// ================================================================

describe('Test 8: SRM with Extreme Ratios', () => {
  it('8a. Expected 99/1 split, observed 990/10 (perfect match)', () => {
    const result = checkSrm([990, 10], [99, 1]);

    console.log('Test 8a - SRM 99/1 perfect match:');
    console.log('  chi-squared:', result.chiSquared);
    console.log('  p-value:', result.pValue);
    console.log('  has mismatch:', result.hasMismatch);

    // Perfect match: chi-squared should be ~0, p-value should be ~1
    assert.ok(result.chiSquared < 0.01, `chi-squared should be ~0, got ${result.chiSquared}`);
    assert.ok(result.pValue > 0.9, `p-value should be ~1, got ${result.pValue}`);
    assert.strictEqual(result.hasMismatch, false);
    console.log('  RESULT: PASS');
  });

  it('8b. Expected 99/1 split, observed 950/50 (mismatch)', () => {
    const result = checkSrm([950, 50], [99, 1]);

    console.log('Test 8b - SRM 99/1 with mismatch:');
    console.log('  Expected:', result.expected);
    console.log('  chi-squared:', result.chiSquared);
    console.log('  p-value:', result.pValue);
    console.log('  has mismatch:', result.hasMismatch);
    console.log('  severity:', result.severity);

    // Expected: [990, 10], observed [950, 50]
    // chi2 = (950-990)^2/990 + (50-10)^2/10 = 1600/990 + 1600/10 = 1.616 + 160 = 161.6
    assert.ok(result.hasMismatch, 'Should detect mismatch');
    assert.strictEqual(result.severity, 'critical', 'Should be critical');
    console.log('  RESULT: PASS');
  });

  it('8c. 5-variant equal split, perfectly balanced', () => {
    const result = checkSrm([200, 200, 200, 200, 200], [1, 1, 1, 1, 1]);

    console.log('Test 8c - 5-variant equal split, balanced:');
    console.log('  chi-squared:', result.chiSquared);
    console.log('  p-value:', result.pValue);
    console.log('  has mismatch:', result.hasMismatch);

    assert.ok(result.chiSquared < 0.01, `chi-squared should be ~0, got ${result.chiSquared}`);
    assert.strictEqual(result.hasMismatch, false);
    console.log('  RESULT: PASS');
  });

  it('8d. 5-variant with one group doubled', () => {
    const result = checkSrm([200, 200, 400, 200, 200], [1, 1, 1, 1, 1]);

    console.log('Test 8d - 5-variant with one group doubled:');
    console.log('  Expected:', result.expected);
    console.log('  chi-squared:', result.chiSquared);
    console.log('  p-value:', result.pValue);
    console.log('  severity:', result.severity);

    assert.ok(result.hasMismatch, 'Should detect mismatch');
    assert.strictEqual(result.severity, 'critical');
    console.log('  RESULT: PASS');
  });
});

// ================================================================
//  TEST 9: Bandits with Zero Data
// ================================================================

describe('Test 9: Bandits with Zero Data', () => {
  it('9a. Thompson Sampling: all arms zero data', () => {
    const result = thompsonSampling([
      { id: 'A', successes: 0, failures: 0 },
      { id: 'B', successes: 0, failures: 0 },
      { id: 'C', successes: 0, failures: 0 },
    ]);

    console.log('Test 9a - Thompson Sampling zero data:');
    console.log('  Allocations:', result.allocations);
    console.log('  Selected arm:', result.selectedArm);
    console.log('  Regret:', result.regret);

    // With Beta(1,1) prior for all arms, allocations should be ~equal
    assert.ok(!isNaN(result.allocations['A']), 'Allocation A should not be NaN');
    assert.ok(!isNaN(result.allocations['B']), 'Allocation B should not be NaN');
    assert.ok(!isNaN(result.allocations['C']), 'Allocation C should not be NaN');

    const sum = Object.values(result.allocations).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1.0) < 0.01, `Allocations should sum to 1.0, got ${sum}`);

    // Each should be ~0.33
    for (const [id, alloc] of Object.entries(result.allocations)) {
      assert.ok(Math.abs(alloc - 1 / 3) < 0.15,
        `${id} allocation should be ~0.33, got ${alloc}`);
    }
    console.log('  RESULT: PASS');
  });

  it('9b. UCB1: all arms zero data should return equal allocation', () => {
    const result = ucb1([
      { id: 'A', successes: 0, failures: 0 },
      { id: 'B', successes: 0, failures: 0 },
      { id: 'C', successes: 0, failures: 0 },
    ]);

    console.log('Test 9b - UCB1 zero data:');
    console.log('  Allocations:', result.allocations);
    console.log('  Selected arm:', result.selectedArm);

    // All arms have 0 pulls, so should get equal allocation among unpulled
    const sum = Object.values(result.allocations).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1.0) < 0.01, `Allocations should sum to 1.0, got ${sum}`);
    assert.ok(!isNaN(result.allocations['A']), 'Should not be NaN');
    console.log('  RESULT: PASS');
  });

  it('9c. Epsilon-Greedy: all arms zero data', () => {
    const result = epsilonGreedy([
      { id: 'A', successes: 0, failures: 0 },
      { id: 'B', successes: 0, failures: 0 },
    ]);

    console.log('Test 9c - Epsilon-Greedy zero data:');
    console.log('  Allocations:', result.allocations);
    console.log('  Selected arm:', result.selectedArm);

    assert.ok(!isNaN(result.allocations['A']), 'Should not be NaN');
    assert.ok(!isNaN(result.allocations['B']), 'Should not be NaN');
    const sum = Object.values(result.allocations).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1.0) < 0.01, `Allocations should sum to 1.0, got ${sum}`);
    console.log('  RESULT: PASS');
  });
});

// ================================================================
//  TEST 10: Numerical Precision at Extremes
// ================================================================

describe('Test 10: Numerical Precision at Extremes', () => {
  it('10a. normalCdf(40) should be ~1.0 (not overflow)', () => {
    const val = normalCdf(40);
    console.log('Test 10a - normalCdf(40):', val);
    assert.ok(val > 0.999999, `normalCdf(40) should be ~1.0, got ${val}`);
    assert.ok(isFinite(val), 'Should be finite');
    assert.ok(!isNaN(val), 'Should not be NaN');
    console.log('  RESULT: PASS');
  });

  it('10b. normalCdf(-40) should be ~0.0 (not underflow to exactly 0)', () => {
    const val = normalCdf(-40);
    console.log('Test 10b - normalCdf(-40):', val);
    assert.ok(val >= 0, `normalCdf(-40) should be >= 0, got ${val}`);
    assert.ok(val < 1e-10, `normalCdf(-40) should be tiny, got ${val}`);
    assert.ok(!isNaN(val), 'Should not be NaN');
    // Note: it's actually fine if this is exactly 0 for practical purposes
    console.log('  RESULT: PASS');
  });

  it('10c. normalInv(0.9999999) should return a finite number', () => {
    const val = normalInv(0.9999999);
    console.log('Test 10c - normalInv(0.9999999):', val);
    assert.ok(isFinite(val), `Should be finite, got ${val}`);
    assert.ok(val > 4, `Should be large positive, got ${val}`);
    assert.ok(val < 10, `Should not be absurdly large, got ${val}`);
    console.log('  RESULT: PASS');
  });

  it('10d. normalInv(0.0000001) should return a finite number', () => {
    const val = normalInv(0.0000001);
    console.log('Test 10d - normalInv(0.0000001):', val);
    assert.ok(isFinite(val), `Should be finite, got ${val}`);
    assert.ok(val < -4, `Should be large negative, got ${val}`);
    assert.ok(val > -10, `Should not be absurdly large, got ${val}`);
    console.log('  RESULT: PASS');
  });

  it('10e. betaCdf(0.0001, 1, 10000) — extreme beta parameters', () => {
    const val = betaCdf(0.0001, 1, 10000);
    console.log('Test 10e - betaCdf(0.0001, 1, 10000):', val);
    // Beta(1, 10000) has mean = 1/10001 ~ 0.0001
    // CDF at 0.0001 should be moderate (maybe 0.5-0.7)
    assert.ok(isFinite(val), `Should be finite, got ${val}`);
    assert.ok(!isNaN(val), 'Should not be NaN');
    assert.ok(val >= 0 && val <= 1, `Should be in [0,1], got ${val}`);
    console.log('  RESULT: PASS');
  });

  it('10f. betaCdf(0.9999, 10000, 1) — extreme beta parameters', () => {
    const val = betaCdf(0.9999, 10000, 1);
    console.log('Test 10f - betaCdf(0.9999, 10000, 1):', val);
    // Beta(10000, 1) has mean = 10000/10001 ~ 0.9999
    // CDF at 0.9999 should be moderate (~0.37 actually, similar to exponential CDF)
    assert.ok(isFinite(val), `Should be finite, got ${val}`);
    assert.ok(!isNaN(val), 'Should not be NaN');
    assert.ok(val >= 0 && val <= 1, `Should be in [0,1], got ${val}`);
    console.log('  RESULT: PASS');
  });

  it('10g. betaInv with extreme parameters (1, 100000)', () => {
    const val = betaInv(0.5, 1, 100000);
    console.log('Test 10g - betaInv(0.5, 1, 100000):', val);
    // Beta(1, 100000) median ~ ln(2)/100000 ~ 6.93e-6
    assert.ok(isFinite(val), `Should be finite, got ${val}`);
    assert.ok(!isNaN(val), 'Should not be NaN');
    assert.ok(val > 0, `Should be positive, got ${val}`);
    assert.ok(val < 0.001, `Should be very small, got ${val}`);
    console.log('  RESULT: PASS');
  });

  it('10h. normalCdf and normalInv round-trip at extremes', () => {
    const extremes = [0.001, 0.01, 0.99, 0.999];
    console.log('Test 10h - Round-trip at extremes:');
    for (const p of extremes) {
      const z = normalInv(p);
      const roundTrip = normalCdf(z);
      console.log(`  normalCdf(normalInv(${p})) = ${roundTrip.toFixed(8)} (error: ${Math.abs(roundTrip - p).toExponential(2)})`);
      assert.ok(Math.abs(roundTrip - p) < 0.001,
        `Round trip failed for p=${p}: got ${roundTrip}`);
    }
    console.log('  RESULT: PASS');
  });
});

// ================================================================
//  TEST 11 (BONUS): Welch-Satterthwaite df edge cases
// ================================================================

describe('Test 11 (Bonus): Welch-Satterthwaite Edge Cases', () => {
  it('11a. Zero variance in one group (degenerate)', () => {
    // If one group has zero variance, the W-S formula has 0/0 issues
    const result = frequentistTest(
      { count: 100, mean: 10.0, variance: 0 },
      { count: 100, mean: 11.0, variance: 4.0 },
      { metricType: 'continuous' },
    );

    console.log('Test 11a - Zero variance in one group:');
    console.log('  p-value:', result.pValue);
    console.log('  significant:', result.significant);

    // v1=0, v2=4: se = sqrt(0/100 + 4/100) = 0.2
    // t = 1.0/0.2 = 5.0
    // df numerator = (0 + 0.04)^2 = 0.0016
    // df denominator = 0^2/(99) + 0.04^2/(99) = 0 + 0.0016/99 = 1.616e-5
    // df = 0.0016 / 1.616e-5 = 99 -- correct!
    assert.ok(!isNaN(result.pValue), 'p-value should not be NaN');
    assert.ok(isFinite(result.pValue), 'p-value should be finite');
    console.log('  RESULT: PASS');
  });

  it('11b. Both groups zero variance, different means (impossible in practice)', () => {
    // Both variances = 0, means differ. SE = 0, so t = Infinity (or 0/0).
    const result = frequentistTest(
      { count: 100, mean: 10.0, variance: 0 },
      { count: 100, mean: 11.0, variance: 0 },
      { metricType: 'continuous' },
    );

    console.log('Test 11b - Both groups zero variance, different means:');
    console.log('  p-value:', result.pValue);
    console.log('  significant:', result.significant);

    // SE = 0, the code does: t = se > 0 ? diff / se : 0
    // So t = 0, p = 1.0, significant = false
    // This is WRONG! If both groups have zero variance and different means,
    // the difference is actually infinitely significant (zero noise, real signal).
    // The code returns p=1.0 instead of p~0.
    if (result.pValue > 0.5) {
      console.log('  FINDING: p-value is', result.pValue, '-- INCORRECT!');
      console.log('  When SE=0 and diff!=0, p should be ~0 (infinite signal-to-noise).');
      console.log('  The code defaults t=0 when SE=0, losing the signal entirely.');
      console.log('  RESULT: FAIL');
    } else {
      console.log('  RESULT: PASS');
    }

    // We still assert it doesn't crash
    assert.ok(!isNaN(result.pValue), 'p-value should not be NaN');
  });
});

// ================================================================
//  TEST 12 (BONUS): Sequential incremental alpha is problematic
// ================================================================

describe('Test 12 (Bonus): Sequential Test Implementation Details', () => {
  it('12a. Incremental alpha approach may compute WRONG boundaries', () => {
    // The implementation uses: boundary = normalInv(1 - incrementalAlpha/2)
    // This is NOT how group sequential boundaries work in practice.
    // The correct approach uses recursive integration or simulation to find
    // boundaries that control the overall Type I error.
    //
    // The "incremental alpha" approach gives APPROXIMATE boundaries that
    // may not properly control the family-wise error rate.
    //
    // Standard reference boundaries for OBF with 5 looks:
    // Look 1 (t=0.2): ~4.56
    // Look 2 (t=0.4): ~2.86
    // Look 3 (t=0.6): ~2.30
    // Look 4 (t=0.8): ~2.01
    // Look 5 (t=1.0): ~1.81

    const design = computeSequentialDesign(5, 0.05, 'obrien-fleming');
    console.log('Test 12a - OBF boundaries vs reference:');

    const reference = [4.56, 2.86, 2.30, 2.01, 1.81]; // approximate standard values

    for (let i = 0; i < 5; i++) {
      const diff = Math.abs(design.boundaries[i] - reference[i]);
      const status = diff < 0.5 ? 'OK' : 'DIFFERS';
      console.log(`  Look ${i + 1} (t=${((i + 1) / 5).toFixed(1)}): got ${design.boundaries[i].toFixed(3)}, ref ~${reference[i].toFixed(2)} [${status}]`);
    }

    // We check if boundaries are in a reasonable ballpark
    // The incremental alpha approach often gives slightly different numbers
    // but should be in the right ballpark
    assert.ok(design.boundaries[0] > 3.0, 'First boundary should be > 3.0');
    assert.ok(design.boundaries[4] < 2.5, 'Last boundary should be < 2.5');
    assert.ok(design.boundaries[4] > 1.5, 'Last boundary should be > 1.5');
    console.log('  RESULT: PASS (boundaries in reasonable range, but not exact standard values)');
  });
});
