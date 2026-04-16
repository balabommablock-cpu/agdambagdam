/**
 * @abacus/stats — SRM (Sample Ratio Mismatch) detection
 *
 * Detects when the observed traffic split deviates significantly from
 * the expected split, which indicates a bug in the randomization system.
 *
 * SRM is one of the most common and dangerous data quality issues
 * in A/B testing. If present, all results are unreliable.
 */

import { chiSquaredCdf } from './distributions';
import type { SrmResult } from './types';

// ──────────────────────────────────────────────
//  Main entry point
// ──────────────────────────────────────────────

/**
 * Check for Sample Ratio Mismatch.
 *
 * @param observed - Array of observed counts per variant [controlN, treatmentN, ...]
 * @param expectedRatios - Array of expected traffic ratios [0.5, 0.5] for 50/50 split
 * @returns SRM detection result with chi-squared test, p-value, and diagnostics
 */
export function checkSrm(
  observed: number[],
  expectedRatios: number[]
): SrmResult {
  if (observed.length !== expectedRatios.length) {
    throw new Error('observed and expectedRatios must have the same length');
  }
  if (observed.length < 2) {
    throw new Error('Need at least 2 variants for SRM check');
  }

  // Normalize expected ratios to sum to 1
  const ratioSum = expectedRatios.reduce((s, r) => s + r, 0);
  if (ratioSum <= 0) {
    throw new Error('Expected ratios must sum to a positive number');
  }
  const normalizedRatios = expectedRatios.map((r) => r / ratioSum);

  // Total observed
  const totalObserved = observed.reduce((s, n) => s + n, 0);

  // Expected counts
  const expected = normalizedRatios.map((r) => r * totalObserved);

  // Chi-squared statistic
  let chiSquared = 0;
  for (let i = 0; i < observed.length; i++) {
    if (expected[i] === 0) continue;
    const diff = observed[i] - expected[i];
    chiSquared += (diff * diff) / expected[i];
  }

  // Degrees of freedom = k - 1
  const df = observed.length - 1;

  // p-value
  const pValue = 1 - chiSquaredCdf(chiSquared, df);

  // Severity assessment
  const hasMismatch = pValue < 0.01; // Aligned with warning threshold — SRM is a safety check, false negatives are costly
  let severity: 'none' | 'warning' | 'critical';
  if (pValue < 0.0001) {
    severity = 'critical';
  } else if (pValue < 0.01) {
    severity = 'warning';
  } else {
    severity = 'none';
  }

  // Diagnostic message
  const message = buildDiagnosticMessage(observed, expected, pValue, severity);

  return {
    observed,
    expected: expected.map((e) => Math.round(e * 100) / 100),
    chiSquared,
    pValue,
    hasMismatch,
    severity,
    message,
  };
}

// ──────────────────────────────────────────────
//  Diagnostics
// ──────────────────────────────────────────────

function buildDiagnosticMessage(
  observed: number[],
  expected: number[],
  pValue: number,
  severity: 'none' | 'warning' | 'critical'
): string {
  if (severity === 'none') {
    return 'No sample ratio mismatch detected. Traffic split looks healthy.';
  }

  const deviations = observed.map((obs, i) => {
    const exp = expected[i];
    const pctDev = exp > 0 ? ((obs - exp) / exp) * 100 : 0;
    return { index: i, obs, exp, pctDev };
  });

  const maxDev = deviations.reduce(
    (max, d) => (Math.abs(d.pctDev) > Math.abs(max.pctDev) ? d : max),
    deviations[0]
  );

  const lines: string[] = [];

  if (severity === 'critical') {
    lines.push(
      `CRITICAL: Sample Ratio Mismatch detected (p=${pValue.toExponential(2)}). ` +
        `Results from this experiment are NOT reliable.`
    );
  } else {
    lines.push(
      `WARNING: Possible Sample Ratio Mismatch (p=${pValue.toFixed(4)}). ` +
        `Review the data before drawing conclusions.`
    );
  }

  lines.push(
    `Variant ${maxDev.index} has the largest deviation: ` +
      `${maxDev.pctDev > 0 ? '+' : ''}${maxDev.pctDev.toFixed(2)}% ` +
      `(observed ${maxDev.obs} vs expected ${Math.round(maxDev.exp)}).`
  );

  lines.push('');
  lines.push('Possible causes:');
  lines.push('- Bug in the randomization/assignment system');
  lines.push('- Bot or crawler traffic affecting one variant differently');
  lines.push('- Browser redirects or client-side errors in one variant');
  lines.push('- Incorrect experiment configuration (e.g., sticky bucketing issue)');
  lines.push('- Data pipeline issues (missing events for some users)');

  return lines.join('\n');
}
