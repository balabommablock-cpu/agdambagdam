/**
 * @abacus/stats — Pure-TypeScript statistical distributions
 *
 * All math implemented from scratch with no external dependencies.
 * Numerically accurate to at least 6 decimal places.
 */

// ──────────────────────────────────────────────
//  Log-Gamma  (Lanczos approximation, g = 7)
// ──────────────────────────────────────────────

const LANCZOS_COEFFICIENTS = [
  0.99999999999980993,
  676.5203681218851,
  -1259.1392167224028,
  771.32342877765313,
  -176.61502916214059,
  12.507343278686905,
  -0.13857109526572012,
  9.9843695780195716e-6,
  1.5056327351493116e-7,
];

/** Natural logarithm of the Gamma function */
export function logGamma(z: number): number {
  if (z < 0.5) {
    // Reflection formula: Gamma(z) * Gamma(1-z) = pi / sin(pi*z)
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  z -= 1;
  let x = LANCZOS_COEFFICIENTS[0];
  for (let i = 1; i < 9; i++) {
    x += LANCZOS_COEFFICIENTS[i] / (z + i);
  }
  const t = z + 7.5; // g + 0.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Gamma function */
export function gamma(z: number): number {
  return Math.exp(logGamma(z));
}

/** Log of Beta function: B(a,b) = Gamma(a)*Gamma(b)/Gamma(a+b) */
function logBeta(a: number, b: number): number {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}

// ──────────────────────────────────────────────
//  Normal distribution
// ──────────────────────────────────────────────

/**
 * Standard normal CDF using the error function (erf).
 * Phi(x) = 0.5 * (1 + erf(x / sqrt(2)))
 */
export function normalCdf(x: number): number {
  if (x === Infinity) return 1;
  if (x === -Infinity) return 0;
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

/** Standard normal PDF */
export function normalPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Error function using Horner form of the rational approximation
 * from Abramowitz and Stegun, formula 7.1.26 with maximum error 1.5e-7.
 */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const a = Math.abs(x);

  // Constants
  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;

  const t = 1.0 / (1.0 + p * a);
  const poly = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t;
  const y = 1.0 - poly * Math.exp(-a * a);

  return sign * y;
}

/**
 * Inverse standard normal CDF (probit) using the rational approximation
 * by Peter Acklam. Accurate to ~1.15e-9 in the central region.
 */
export function normalInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  } else if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
}

// ──────────────────────────────────────────────
//  Regularized incomplete beta function I_x(a, b)
// ──────────────────────────────────────────────

/**
 * Regularized incomplete beta function I_x(a, b)
 * using the continued fraction from DLMF 8.17.22.
 */
export function betaIncomplete(x: number, a: number, b: number): number {
  return regularizedBetaImpl(x, a, b);
}

export function regularizedBeta(x: number, a: number, b: number): number {
  return regularizedBetaImpl(x, a, b);
}

function regularizedBetaImpl(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Use symmetry relation for better convergence
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - regularizedBetaImpl(1 - x, b, a);
  }

  // I_x(a,b) = x^a (1-x)^b / (a B(a,b)) * CF
  // where the CF = 1/(1 + d_1/(1 + d_2/(1 + ...)))
  //
  // Numerator coefficients (interleaving even/odd):
  //   d_{2m+1} = -(a+m)(a+b+m) x / ((a+2m)(a+2m+1))    for m = 0,1,2,...
  //   d_{2m}   =  m(b-m) x / ((a+2m-1)(a+2m))           for m = 1,2,3,...
  //
  // We number sequentially: d_1 (odd,m=0), d_2 (even,m=1), d_3 (odd,m=1), ...

  const maxIter = 300;
  const eps = 1e-14;
  const tiny = 1e-30;

  // Modified Lentz's method starting from f = 1
  let f = 1.0;
  let C = 1.0;
  let D = 0.0;

  for (let i = 1; i <= maxIter; i++) {
    let num: number;
    if (i % 2 === 1) {
      // Odd index: d_{2m+1} where m = (i-1)/2
      const m = (i - 1) / 2;
      num = -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    } else {
      // Even index: d_{2m} where m = i/2
      const m = i / 2;
      num = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    }

    D = 1 + num * D;
    if (Math.abs(D) < tiny) D = tiny;
    D = 1 / D;

    C = 1 + num / C;
    if (Math.abs(C) < tiny) C = tiny;

    const delta = C * D;
    f *= delta;

    if (Math.abs(delta - 1) < eps) break;
  }

  const lnFront = a * Math.log(x) + b * Math.log(1 - x) - logBeta(a, b);
  return Math.exp(lnFront) / (a * f);
}

// ──────────────────────────────────────────────
//  Beta distribution
// ──────────────────────────────────────────────

/** Beta distribution PDF */
export function betaPdf(x: number, alpha: number, beta: number): number {
  if (x < 0 || x > 1) return 0;
  if (x === 0) {
    if (alpha < 1) return Infinity;
    if (alpha === 1) return Math.exp(-logBeta(alpha, beta));
    return 0;
  }
  if (x === 1) {
    if (beta < 1) return Infinity;
    if (beta === 1) return Math.exp(-logBeta(alpha, beta));
    return 0;
  }

  const lnB = logBeta(alpha, beta);
  return Math.exp((alpha - 1) * Math.log(x) + (beta - 1) * Math.log(1 - x) - lnB);
}

/** Beta distribution CDF: P(X <= x) */
export function betaCdf(x: number, alpha: number, beta: number): number {
  return regularizedBetaImpl(x, alpha, beta);
}

/**
 * Beta distribution inverse CDF (quantile function).
 * Uses Newton-Raphson with bisection fallback.
 */
export function betaInv(p: number, alpha: number, beta: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;

  // Initial guess using normal approximation
  const mu = alpha / (alpha + beta);
  const sigma = Math.sqrt(
    (alpha * beta) / ((alpha + beta) * (alpha + beta) * (alpha + beta + 1))
  );
  let x = mu + sigma * normalInv(p);
  x = Math.max(1e-10, Math.min(1 - 1e-10, x));

  // Newton-Raphson with bisection bounds
  let lo = 0;
  let hi = 1;

  for (let i = 0; i < 100; i++) {
    const cdf = betaCdf(x, alpha, beta);
    const err = cdf - p;

    if (Math.abs(err) < 1e-12) break;

    const pdf = betaPdf(x, alpha, beta);
    if (pdf > 1e-15) {
      const newX = x - err / pdf;
      if (newX > lo && newX < hi) {
        if (err < 0) lo = x;
        else hi = x;
        x = newX;
      } else {
        if (err < 0) lo = x;
        else hi = x;
        x = (lo + hi) / 2;
      }
    } else {
      if (err < 0) lo = x;
      else hi = x;
      x = (lo + hi) / 2;
    }
  }

  return x;
}

// ──────────────────────────────────────────────
//  Regularized incomplete gamma function
// ──────────────────────────────────────────────

/**
 * Lower regularized incomplete gamma function P(a, x) = gamma(a,x)/Gamma(a)
 * using series expansion for x < a+1 and continued fraction otherwise.
 */
export function lowerGammaReg(a: number, x: number): number {
  if (x < 0) return 0;
  if (x === 0) return 0;
  if (!isFinite(x)) return 1;

  if (x < a + 1) {
    return gammaSeriesP(a, x);
  } else {
    return 1 - gammaContFracQ(a, x);
  }
}

/**
 * P(a,x) via series: P(a,x) = e^{-x} x^a sum_{n=0}^{inf} x^n / Gamma(a+n+1)
 * which simplifies to: e^{-x} x^a / Gamma(a) * sum_{n=0}^inf x^n / (a*(a+1)*...*(a+n))
 */
function gammaSeriesP(a: number, x: number): number {
  let term = 1 / a;
  let sum = term;

  for (let n = 1; n < 300; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term / sum) < 1e-14) break;
  }

  const lnPrefix = -x + a * Math.log(x) - logGamma(a);
  return sum * Math.exp(lnPrefix);
}

/**
 * Q(a,x) = 1 - P(a,x) via Legendre continued fraction:
 * Q(a,x) = e^{-x} x^a / Gamma(a) * 1/(x+1-a- 1*(1-a)/(x+3-a- 2*(2-a)/(x+5-a- ...)))
 * Using modified Lentz's method.
 */
function gammaContFracQ(a: number, x: number): number {
  // Evaluate the continued fraction for Q(a,x) using modified Lentz's method.
  // CF = 1/(b_0 + a_1/(b_1 + a_2/(b_2 + ...)))
  // where b_0 = x+1-a, a_i = i*(a-i), b_i = x+2i+1-a
  const tiny = 1e-30;

  // Initialize with b_0
  let b0 = x + 1 - a;
  if (Math.abs(b0) < tiny) b0 = tiny;
  let f = b0;
  let C = b0;
  let D = 0;

  for (let i = 1; i < 300; i++) {
    const an = i * (a - i);
    const bn = x + 2 * i + 1 - a;

    D = bn + an * D;
    if (Math.abs(D) < tiny) D = tiny;
    D = 1 / D;
    C = bn + an / C;
    if (Math.abs(C) < tiny) C = tiny;
    const delta = C * D;
    f *= delta;
    if (Math.abs(delta - 1) < 1e-14) break;
  }

  const lnPrefix = -x + a * Math.log(x) - logGamma(a);
  return Math.exp(lnPrefix) / f;
}

// ──────────────────────────────────────────────
//  Chi-squared distribution
// ──────────────────────────────────────────────

/**
 * Chi-squared distribution CDF: P(X <= x) with k degrees of freedom.
 * Chi-squared(k) = Gamma(k/2, 2), so CDF = P(k/2, x/2).
 */
export function chiSquaredCdf(x: number, k: number): number {
  if (x <= 0) return 0;
  return lowerGammaReg(k / 2, x / 2);
}

// ──────────────────────────────────────────────
//  Student's t-distribution
// ──────────────────────────────────────────────

/**
 * Student's t-distribution CDF using regularized incomplete beta.
 * P(T <= t) = 1 - 0.5 * I_{v/(v+t^2)}(v/2, 1/2)  for t >= 0
 */
export function tCdf(t: number, df: number): number {
  if (df <= 0) return NaN;
  if (t === 0) return 0.5;

  const x = df / (df + t * t);
  const ibeta = regularizedBetaImpl(x, df / 2, 0.5);
  if (t >= 0) {
    return 1 - 0.5 * ibeta;
  } else {
    return 0.5 * ibeta;
  }
}

/**
 * Inverse t-distribution CDF using Newton-Raphson.
 */
export function tInv(p: number, df: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  // Initial guess from normal approximation
  let x = normalInv(p);

  // Refine with Newton-Raphson
  for (let i = 0; i < 50; i++) {
    const cdf = tCdf(x, df);
    const err = cdf - p;
    if (Math.abs(err) < 1e-12) break;

    // t-distribution PDF
    const lnPdf =
      logGamma((df + 1) / 2) -
      logGamma(df / 2) -
      0.5 * Math.log(df * Math.PI) -
      ((df + 1) / 2) * Math.log(1 + (x * x) / df);
    const pdf = Math.exp(lnPdf);

    if (pdf > 1e-15) {
      x -= err / pdf;
    } else {
      x -= Math.sign(err) * 0.1;
    }
  }

  return x;
}

// ──────────────────────────────────────────────
//  Random number generation (seeded PRNG)
// ──────────────────────────────────────────────

/**
 * Mulberry32 -- a fast 32-bit seeded PRNG.
 * Returns a function that produces values in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a standard normal random variate using Box-Muller transform.
 */
export function randomNormal(rng: () => number): number {
  let u1 = rng();
  // Avoid log(0)
  while (u1 === 0) u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Generate a Beta(alpha, beta) random variate using the Gamma distribution.
 */
export function randomBeta(alpha: number, beta: number, rng: () => number): number {
  const x = randomGamma(alpha, rng);
  const y = randomGamma(beta, rng);
  return x / (x + y);
}

/**
 * Generate a Gamma(shape, 1) random variate.
 * Uses Marsaglia and Tsang's method for shape >= 1,
 * and boost technique for shape < 1.
 */
export function randomGamma(shape: number, rng: () => number): number {
  if (shape < 1) {
    // Boost: Gamma(a) = Gamma(a+1) * U^(1/a)
    let u = rng();
    while (u === 0) u = rng();
    return randomGamma(shape + 1, rng) * Math.pow(u, 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number, v: number;
    do {
      x = randomNormal(rng);
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = rng();

    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}
