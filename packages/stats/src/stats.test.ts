/**
 * @abacus/stats — Comprehensive test suite
 *
 * Tests the statistics engine against known reference values.
 * Uses Node.js built-in test runner (node:test + node:assert).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  frequentistTest,
  bonferroniCorrection,
  holmCorrection,
  benjaminiHochberg,
  bayesianTest,
  cupedAdjust,
  estimateVarianceReduction,
  computeCorrelation,
  sequentialTest,
  computeSequentialDesign,
  checkSrm,
  requiredSampleSize,
  computePower,
  thompsonSampling,
  ucb1,
  epsilonGreedy,
  normalCdf,
  normalInv,
  chiSquaredCdf,
} from './index';

// ──────────────────────────────────────────────
//  Frequentist Tests
// ──────────────────────────────────────────────

describe('Frequentist — Z-test for proportions', () => {
  it('1000/100 vs 1000/120: not significant (p ~ 0.13-0.15)', () => {
    const result = frequentistTest(
      { count: 1000, conversions: 100, mean: 0.1, variance: 0.1 * 0.9 },
      { count: 1000, conversions: 120, mean: 0.12, variance: 0.12 * 0.88 },
    );
    assert.ok(result.pValue > 0.05, `Expected p > 0.05, got ${result.pValue}`);
    assert.ok(result.pValue >= 0.10 && result.pValue <= 0.20,
      `Expected p in [0.10, 0.20], got ${result.pValue}`);
    assert.strictEqual(result.significant, false);
  });

  it('5000/500 vs 5000/600: significant (p < 0.005)', () => {
    const result = frequentistTest(
      { count: 5000, conversions: 500, mean: 0.1, variance: 0.1 * 0.9 },
      { count: 5000, conversions: 600, mean: 0.12, variance: 0.12 * 0.88 },
    );
    assert.ok(result.pValue < 0.005, `Expected p < 0.005, got ${result.pValue}`);
    assert.strictEqual(result.significant, true);
  });

  it('Confidence interval for p=0.1 n=1000 contains true difference', () => {
    const result = frequentistTest(
      { count: 1000, conversions: 100, mean: 0.1, variance: 0.1 * 0.9 },
      { count: 1000, conversions: 120, mean: 0.12, variance: 0.12 * 0.88 },
    );
    const [lo, hi] = result.confidenceInterval;
    // CI for the difference (0.02) should contain 0 since not significant
    assert.ok(lo < 0.02, `CI lower ${lo} should be below 0.02`);
    assert.ok(hi > 0.02, `CI upper ${hi} should be above 0.02`);
    // The CI should include 0 since not significant
    assert.ok(lo < 0 && hi > 0, `CI should contain 0 for non-significant result: [${lo}, ${hi}]`);
  });

  it('Equal groups yield p ~1.0 and not significant', () => {
    const result = frequentistTest(
      { count: 1000, conversions: 100, mean: 0.1, variance: 0.1 * 0.9 },
      { count: 1000, conversions: 100, mean: 0.1, variance: 0.1 * 0.9 },
    );
    assert.ok(result.pValue > 0.9, `Expected p near 1.0, got ${result.pValue}`);
    assert.strictEqual(result.significant, false);
  });

  it('Returns power in (0, 1] range', () => {
    const result = frequentistTest(
      { count: 5000, conversions: 500, mean: 0.1, variance: 0.1 * 0.9 },
      { count: 5000, conversions: 600, mean: 0.12, variance: 0.12 * 0.88 },
    );
    assert.ok(result.power > 0 && result.power <= 1,
      `Power should be in (0,1], got ${result.power}`);
  });
});

describe('Frequentist — Welch t-test for means', () => {
  it('Same means: not significant', () => {
    const result = frequentistTest(
      { count: 500, mean: 10.0, variance: 4.0 },
      { count: 500, mean: 10.0, variance: 4.0 },
      { metricType: 'continuous' },
    );
    assert.ok(result.pValue > 0.9, `Expected p near 1, got ${result.pValue}`);
    assert.strictEqual(result.significant, false);
  });

  it('Different means with large N: significant', () => {
    const result = frequentistTest(
      { count: 1000, mean: 10.0, variance: 4.0 },
      { count: 1000, mean: 10.5, variance: 4.0 },
      { metricType: 'continuous' },
    );
    assert.ok(result.pValue < 0.05, `Expected p < 0.05, got ${result.pValue}`);
    assert.strictEqual(result.significant, true);
  });
});

describe('Frequentist — Multiple comparison corrections', () => {
  it('Bonferroni: 3 comparisons at alpha=0.05 adjusts each to ~0.0167', () => {
    const result = frequentistTest(
      { count: 5000, conversions: 500, mean: 0.1, variance: 0.1 * 0.9 },
      { count: 5000, conversions: 600, mean: 0.12, variance: 0.12 * 0.88 },
      { alpha: 0.05, correction: 'bonferroni', numComparisons: 3 },
    );
    const expectedAlpha = 0.05 / 3;
    assert.ok(
      Math.abs(result.alpha - expectedAlpha) < 0.001,
      `Expected adjusted alpha ~${expectedAlpha.toFixed(4)}, got ${result.alpha}`,
    );
  });

  it('bonferroniCorrection on p-value array', () => {
    const pValues = [0.01, 0.04, 0.03];
    const corrected = bonferroniCorrection(pValues, 0.05);
    // Adjusted: [0.03, 0.12, 0.09]
    assert.ok(Math.abs(corrected.adjusted[0] - 0.03) < 0.001);
    assert.ok(Math.abs(corrected.adjusted[1] - 0.12) < 0.001);
    assert.ok(Math.abs(corrected.adjusted[2] - 0.09) < 0.001);
    assert.deepStrictEqual(corrected.significant, [true, false, false]);
  });

  it('holmCorrection preserves order', () => {
    const pValues = [0.01, 0.04, 0.03];
    const corrected = holmCorrection(pValues, 0.05);
    // All adjusted p-values should be >= raw p-values
    for (let i = 0; i < pValues.length; i++) {
      assert.ok(corrected.adjusted[i] >= pValues[i],
        `Adjusted[${i}]=${corrected.adjusted[i]} should be >= raw ${pValues[i]}`);
    }
  });

  it('benjaminiHochberg is less conservative than Bonferroni', () => {
    const pValues = [0.01, 0.03, 0.04];
    const bh = benjaminiHochberg(pValues, 0.05);
    const bonf = bonferroniCorrection(pValues, 0.05);
    // BH should find equal or more significant results
    const bhSigCount = bh.significant.filter(Boolean).length;
    const bonfSigCount = bonf.significant.filter(Boolean).length;
    assert.ok(bhSigCount >= bonfSigCount,
      `BH found ${bhSigCount} significant, Bonferroni found ${bonfSigCount}`);
  });
});

// ──────────────────────────────────────────────
//  Bayesian Tests
// ──────────────────────────────────────────────

describe('Bayesian — Beta-Binomial model', () => {
  it('Flat prior: 100/1000 vs 120/1000 -> P(B best) ~ 85-95%', () => {
    const result = bayesianTest([
      { id: 'A', name: 'Control', sample: { count: 1000, conversions: 100, mean: 0.1, variance: 0.1 * 0.9 } },
      { id: 'B', name: 'Treatment', sample: { count: 1000, conversions: 120, mean: 0.12, variance: 0.12 * 0.88 } },
    ], { priorAlpha: 1, priorBeta: 1 });

    const pBBest = result.probabilityOfBeingBest['B'];
    assert.ok(pBBest >= 0.80 && pBBest <= 0.97,
      `Expected P(B best) in [0.80, 0.97], got ${pBBest}`);
  });

  it('Multi-variant: A=10%, B=12%, C=15% -> P(C best) highest', () => {
    const result = bayesianTest([
      { id: 'A', name: 'Control', sample: { count: 1000, conversions: 100, mean: 0.10, variance: 0.10 * 0.90 } },
      { id: 'B', name: 'Treatment1', sample: { count: 1000, conversions: 120, mean: 0.12, variance: 0.12 * 0.88 } },
      { id: 'C', name: 'Treatment2', sample: { count: 1000, conversions: 150, mean: 0.15, variance: 0.15 * 0.85 } },
    ]);

    const pA = result.probabilityOfBeingBest['A'];
    const pB = result.probabilityOfBeingBest['B'];
    const pC = result.probabilityOfBeingBest['C'];

    assert.ok(pC > pB, `P(C best)=${pC} should exceed P(B best)=${pB}`);
    assert.ok(pC > pA, `P(C best)=${pC} should exceed P(A best)=${pA}`);
    assert.ok(pC > 0.90, `P(C best)=${pC} should be > 0.90 with this much data`);
  });

  it('Probabilities sum to ~1.0', () => {
    const result = bayesianTest([
      { id: 'A', name: 'A', sample: { count: 500, conversions: 50, mean: 0.10, variance: 0.09 } },
      { id: 'B', name: 'B', sample: { count: 500, conversions: 60, mean: 0.12, variance: 0.1056 } },
    ]);
    const sum = Object.values(result.probabilityOfBeingBest).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1.0) < 0.01, `Probabilities should sum to ~1.0, got ${sum}`);
  });

  it('Expected loss is non-negative for all variants', () => {
    const result = bayesianTest([
      { id: 'A', name: 'A', sample: { count: 500, conversions: 50, mean: 0.10, variance: 0.09 } },
      { id: 'B', name: 'B', sample: { count: 500, conversions: 80, mean: 0.16, variance: 0.1344 } },
    ]);
    for (const [id, loss] of Object.entries(result.expectedLoss)) {
      assert.ok(loss >= 0, `Expected loss for ${id} should be >= 0, got ${loss}`);
    }
  });

  it('Credible intervals are within [0, 1] for proportions', () => {
    const result = bayesianTest([
      { id: 'A', name: 'A', sample: { count: 100, conversions: 10, mean: 0.10, variance: 0.09 } },
      { id: 'B', name: 'B', sample: { count: 100, conversions: 15, mean: 0.15, variance: 0.1275 } },
    ]);
    for (const [id, ci] of Object.entries(result.credibleInterval)) {
      assert.ok(ci[0] >= 0 && ci[0] <= 1, `CI lower for ${id} should be in [0,1], got ${ci[0]}`);
      assert.ok(ci[1] >= 0 && ci[1] <= 1, `CI upper for ${id} should be in [0,1], got ${ci[1]}`);
      assert.ok(ci[0] < ci[1], `CI lower should be < upper for ${id}`);
    }
  });

  it('Throws with fewer than 2 variants', () => {
    assert.throws(() => {
      bayesianTest([
        { id: 'A', name: 'A', sample: { count: 100, conversions: 10, mean: 0.1, variance: 0.09 } },
      ]);
    }, /at least 2 variants/);
  });
});

// ──────────────────────────────────────────────
//  CUPED Tests
// ──────────────────────────────────────────────

describe('CUPED — Variance reduction', () => {
  it('r=0.7 correlation -> ~49% variance reduction estimate', () => {
    const reduction = estimateVarianceReduction(0.7);
    assert.ok(Math.abs(reduction - 0.49) < 0.01,
      `Expected ~0.49, got ${reduction}`);
  });

  it('r=0 correlation -> ~0% variance reduction', () => {
    const reduction = estimateVarianceReduction(0);
    assert.ok(Math.abs(reduction) < 0.001,
      `Expected ~0, got ${reduction}`);
  });

  it('r=1.0 correlation -> ~100% variance reduction', () => {
    const reduction = estimateVarianceReduction(1.0);
    assert.ok(Math.abs(reduction - 1.0) < 0.001,
      `Expected ~1.0, got ${reduction}`);
  });

  it('cupedAdjust reduces variance with correlated covariate', () => {
    // High correlation scenario: r ~ 0.7
    const control = {
      count: 1000,
      mean: 10.0,
      variance: 4.0,
      preExperimentMean: 9.5,
      preExperimentVariance: 3.5,
      covariance: 2.6, // r = 2.6 / sqrt(3.5 * 4.0) ~ 0.695
    };
    const treatment = {
      count: 1000,
      mean: 10.5,
      variance: 4.2,
      preExperimentMean: 9.6,
      preExperimentVariance: 3.6,
      covariance: 2.7,
    };

    const result = cupedAdjust(control, treatment);
    assert.ok(result.varianceReduction > 0.30,
      `Expected >30% variance reduction, got ${(result.varianceReduction * 100).toFixed(1)}%`);
    assert.ok(result.reducedVariance < result.originalVariance,
      `Reduced variance ${result.reducedVariance} should be < original ${result.originalVariance}`);
  });

  it('cupedAdjust with zero covariance gives ~0 reduction', () => {
    const control = {
      count: 1000,
      mean: 10.0,
      variance: 4.0,
      preExperimentMean: 9.5,
      preExperimentVariance: 3.5,
      covariance: 0,
    };
    const treatment = {
      count: 1000,
      mean: 10.5,
      variance: 4.2,
      preExperimentMean: 9.6,
      preExperimentVariance: 3.6,
      covariance: 0,
    };

    const result = cupedAdjust(control, treatment);
    assert.ok(result.varianceReduction < 0.05,
      `Expected ~0% variance reduction with no correlation, got ${(result.varianceReduction * 100).toFixed(1)}%`);
  });

  it('computeCorrelation returns correct value', () => {
    const data = {
      count: 100, mean: 10.0, variance: 4.0,
      preExperimentMean: 9.0, preExperimentVariance: 3.0,
      covariance: 2.0,
    };
    const r = computeCorrelation(data);
    const expected = 2.0 / Math.sqrt(3.0 * 4.0);
    assert.ok(Math.abs(r - expected) < 0.001,
      `Expected correlation ${expected.toFixed(4)}, got ${r.toFixed(4)}`);
  });
});

// ──────────────────────────────────────────────
//  Sequential Testing
// ──────────────────────────────────────────────

describe('Sequential — O\'Brien-Fleming spending', () => {
  it('OBF at info fraction 0.5 -> boundary ~2.7-2.9', () => {
    const design = computeSequentialDesign(2, 0.05, 'obrien-fleming');
    const boundary = design.boundaries[0]; // first look at t=0.5
    assert.ok(boundary >= 2.5 && boundary <= 3.2,
      `Expected boundary ~2.7-2.9 at t=0.5, got ${boundary.toFixed(3)}`);
  });

  it('OBF at info fraction 1.0 -> boundary ~1.9-2.1', () => {
    const design = computeSequentialDesign(2, 0.05, 'obrien-fleming');
    const boundary = design.boundaries[1]; // second look at t=1.0
    assert.ok(boundary >= 1.8 && boundary <= 2.2,
      `Expected boundary ~1.9-2.1 at t=1.0, got ${boundary.toFixed(3)}`);
  });

  it('OBF boundaries decrease over looks', () => {
    const design = computeSequentialDesign(5, 0.05, 'obrien-fleming');
    for (let i = 1; i < design.boundaries.length; i++) {
      assert.ok(design.boundaries[i] <= design.boundaries[i - 1],
        `Boundary at look ${i + 1} (${design.boundaries[i].toFixed(3)}) should be <= look ${i} (${design.boundaries[i - 1].toFixed(3)})`);
    }
  });

  it('Pocock boundaries are more uniform', () => {
    const design = computeSequentialDesign(5, 0.05, 'pocock');
    const range = Math.max(...design.boundaries) - Math.min(...design.boundaries);
    assert.ok(range < 1.0,
      `Pocock boundary range ${range.toFixed(3)} should be < 1.0 (relatively uniform)`);
  });

  it('sequentialTest with non-significant data continues', () => {
    const result = sequentialTest(
      { count: 500, conversions: 50, mean: 0.10, variance: 0.09 },
      { count: 500, conversions: 55, mean: 0.11, variance: 0.0979 },
      { currentLook: 1, maxLooks: 5, spendingFunction: 'obrien-fleming' },
    );
    assert.strictEqual(result.shouldStop, false);
    assert.strictEqual(result.stopDecision, 'continue');
  });

  it('sequentialTest with highly significant data stops', () => {
    const result = sequentialTest(
      { count: 5000, conversions: 500, mean: 0.10, variance: 0.09 },
      { count: 5000, conversions: 750, mean: 0.15, variance: 0.1275 },
      { currentLook: 5, maxLooks: 5, spendingFunction: 'obrien-fleming' },
    );
    assert.strictEqual(result.shouldStop, true);
    assert.strictEqual(result.stopDecision, 'reject_null');
  });

  it('Alpha spent at t=1 equals overall alpha', () => {
    const design = computeSequentialDesign(4, 0.05, 'obrien-fleming');
    const totalSpent = design.alphaSpent[design.alphaSpent.length - 1];
    assert.ok(Math.abs(totalSpent - 0.05) < 0.001,
      `Total alpha spent should be ~0.05, got ${totalSpent}`);
  });
});

// ──────────────────────────────────────────────
//  SRM Tests
// ──────────────────────────────────────────────

describe('SRM — Sample Ratio Mismatch', () => {
  it('500/500 at 50/50 -> no mismatch', () => {
    const result = checkSrm([500, 500], [0.5, 0.5]);
    assert.strictEqual(result.hasMismatch, false);
    assert.strictEqual(result.severity, 'none');
    assert.ok(result.pValue > 0.5, `Expected p > 0.5, got ${result.pValue}`);
  });

  it('550/450 at 50/50 -> warning (mismatch detected)', () => {
    const result = checkSrm([550, 450], [0.5, 0.5]);
    assert.strictEqual(result.hasMismatch, true);
    assert.ok(result.severity === 'warning' || result.severity === 'critical',
      `Expected warning or critical, got ${result.severity}`);
    assert.ok(result.pValue < 0.01, `Expected p < 0.01, got ${result.pValue}`);
  });

  it('490/510 at 50/50 -> no mismatch (within normal range)', () => {
    const result = checkSrm([490, 510], [0.5, 0.5]);
    assert.strictEqual(result.hasMismatch, false);
    assert.strictEqual(result.severity, 'none');
    assert.ok(result.pValue > 0.01, `Expected p > 0.01, got ${result.pValue}`);
  });

  it('Multi-variant: balanced 333/333/334 at 1/3 each -> no mismatch', () => {
    const result = checkSrm([333, 333, 334], [1, 1, 1]);
    assert.strictEqual(result.hasMismatch, false);
    assert.strictEqual(result.severity, 'none');
  });

  it('Extreme mismatch 800/200 at 50/50 -> critical', () => {
    const result = checkSrm([800, 200], [0.5, 0.5]);
    assert.strictEqual(result.severity, 'critical');
    assert.ok(result.pValue < 0.0001, `Expected p < 0.0001, got ${result.pValue}`);
  });

  it('Returns expected counts that match ratios', () => {
    const result = checkSrm([600, 400], [0.6, 0.4]);
    // Expected counts should be [600, 400] when observed matches ratio
    assert.ok(Math.abs(result.expected[0] - 600) < 1);
    assert.ok(Math.abs(result.expected[1] - 400) < 1);
  });

  it('Throws with mismatched array lengths', () => {
    assert.throws(() => {
      checkSrm([500, 500], [0.5]);
    }, /same length/);
  });

  it('Message contains diagnostic information for mismatch', () => {
    const result = checkSrm([550, 450], [0.5, 0.5]);
    assert.ok(result.message.length > 0, 'Message should not be empty');
  });
});

// ──────────────────────────────────────────────
//  Power Analysis Tests
// ──────────────────────────────────────────────

describe('Power — Sample size calculation', () => {
  it('10% baseline, 2% MDE -> ~3800-4200 per variant', () => {
    const result = requiredSampleSize(0.10, 0.02, {
      alpha: 0.05,
      power: 0.8,
      metricType: 'proportion',
    });
    assert.ok(result.requiredSampleSizePerVariant >= 3500 && result.requiredSampleSizePerVariant <= 4500,
      `Expected ~3800-4200 per variant, got ${result.requiredSampleSizePerVariant}`);
  });

  it('Larger MDE requires smaller sample', () => {
    const small = requiredSampleSize(0.10, 0.01);
    const large = requiredSampleSize(0.10, 0.05);
    assert.ok(small.requiredSampleSizePerVariant > large.requiredSampleSizePerVariant,
      `MDE=0.01 (n=${small.requiredSampleSizePerVariant}) should need more than MDE=0.05 (n=${large.requiredSampleSizePerVariant})`);
  });

  it('Higher power requires larger sample', () => {
    const low = requiredSampleSize(0.10, 0.02, { power: 0.8 });
    const high = requiredSampleSize(0.10, 0.02, { power: 0.95 });
    assert.ok(high.requiredSampleSizePerVariant > low.requiredSampleSizePerVariant,
      `Power=0.95 (n=${high.requiredSampleSizePerVariant}) should need more than power=0.80 (n=${low.requiredSampleSizePerVariant})`);
  });

  it('computePower returns expected range', () => {
    const power = computePower(0.10, 0.02, 4000);
    assert.ok(power >= 0.7 && power <= 0.9,
      `Expected power ~0.8 for n=4000, got ${power}`);
  });

  it('computePower with tiny sample -> low power', () => {
    const power = computePower(0.10, 0.02, 100);
    assert.ok(power < 0.2, `Expected low power with n=100, got ${power}`);
  });

  it('Throws on non-positive MDE', () => {
    assert.throws(() => requiredSampleSize(0.1, 0), /MDE must be positive/);
    assert.throws(() => requiredSampleSize(0.1, -0.01), /MDE must be positive/);
  });
});

// ──────────────────────────────────────────────
//  Bandit Tests
// ──────────────────────────────────────────────

describe('Bandits — Thompson Sampling', () => {
  it('Clear winner gets majority allocation', () => {
    const result = thompsonSampling([
      { id: 'A', successes: 10, failures: 90 },   // 10% rate
      { id: 'B', successes: 50, failures: 50 },    // 50% rate
    ]);
    assert.ok(result.allocations['B'] > 0.90,
      `B (50% rate) should get >90% allocation, got ${result.allocations['B']}`);
    assert.ok(result.allocations['A'] < 0.10,
      `A (10% rate) should get <10% allocation, got ${result.allocations['A']}`);
  });

  it('Allocations sum to 1.0', () => {
    const result = thompsonSampling([
      { id: 'A', successes: 30, failures: 70 },
      { id: 'B', successes: 35, failures: 65 },
      { id: 'C', successes: 40, failures: 60 },
    ]);
    const sum = Object.values(result.allocations).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1.0) < 0.01,
      `Allocations should sum to 1.0, got ${sum}`);
  });

  it('Equal arms get roughly equal allocation', () => {
    const result = thompsonSampling([
      { id: 'A', successes: 50, failures: 50 },
      { id: 'B', successes: 50, failures: 50 },
    ]);
    assert.ok(Math.abs(result.allocations['A'] - 0.5) < 0.15,
      `Equal arms should get ~50% each, A got ${result.allocations['A']}`);
  });

  it('Regret is non-negative', () => {
    const result = thompsonSampling([
      { id: 'A', successes: 10, failures: 90 },
      { id: 'B', successes: 50, failures: 50 },
    ]);
    assert.ok(result.regret >= 0, `Regret should be >= 0, got ${result.regret}`);
  });

  it('Deterministic with same seed', () => {
    const r1 = thompsonSampling([
      { id: 'A', successes: 20, failures: 80 },
      { id: 'B', successes: 40, failures: 60 },
    ], 123);
    const r2 = thompsonSampling([
      { id: 'A', successes: 20, failures: 80 },
      { id: 'B', successes: 40, failures: 60 },
    ], 123);
    assert.strictEqual(r1.selectedArm, r2.selectedArm);
    assert.ok(Math.abs(r1.allocations['A'] - r2.allocations['A']) < 0.01);
  });
});

describe('Bandits — UCB1', () => {
  it('Selects arm with highest UCB', () => {
    const result = ucb1([
      { id: 'A', successes: 10, failures: 90 },
      { id: 'B', successes: 50, failures: 50 },
    ]);
    // B has much higher mean, should have higher UCB
    assert.strictEqual(result.selectedArm, 'B');
  });

  it('Unpulled arm gets selected first', () => {
    const result = ucb1([
      { id: 'A', successes: 50, failures: 50 },
      { id: 'B', successes: 0, failures: 0 },
    ]);
    assert.strictEqual(result.selectedArm, 'B');
  });
});

describe('Bandits — Epsilon-Greedy', () => {
  it('Allocation of best arm ~ 1-epsilon + epsilon/k', () => {
    const epsilon = 0.1;
    const result = epsilonGreedy([
      { id: 'A', successes: 10, failures: 90 },
      { id: 'B', successes: 50, failures: 50 },
    ], epsilon);
    const expectedBAlloc = (1 - epsilon) + epsilon / 2; // 0.95
    assert.ok(Math.abs(result.allocations['B'] - expectedBAlloc) < 0.01,
      `B should get ~${expectedBAlloc}, got ${result.allocations['B']}`);
  });
});

// ──────────────────────────────────────────────
//  Distribution helpers (sanity checks)
// ──────────────────────────────────────────────

describe('Distributions — sanity checks', () => {
  it('normalCdf(0) = 0.5', () => {
    assert.ok(Math.abs(normalCdf(0) - 0.5) < 1e-6);
  });

  it('normalCdf(1.96) ~ 0.975', () => {
    assert.ok(Math.abs(normalCdf(1.96) - 0.975) < 0.001);
  });

  it('normalInv(0.975) ~ 1.96', () => {
    assert.ok(Math.abs(normalInv(0.975) - 1.96) < 0.01);
  });

  it('normalInv and normalCdf are inverse functions', () => {
    for (const p of [0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99]) {
      const roundTrip = normalCdf(normalInv(p));
      assert.ok(Math.abs(roundTrip - p) < 0.001,
        `normalCdf(normalInv(${p})) = ${roundTrip}, expected ${p}`);
    }
  });

  it('chiSquaredCdf(3.84, 1) ~ 0.95', () => {
    const val = chiSquaredCdf(3.841, 1);
    assert.ok(Math.abs(val - 0.95) < 0.01, `Expected ~0.95, got ${val}`);
  });
});
