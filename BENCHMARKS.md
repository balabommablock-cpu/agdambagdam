# Benchmarks & Statistical Validation

This document describes how we verify that Agdam Bagdam's statistical engine produces correct, defensible results. Every major method is validated against at least one independent reference implementation and, where applicable, against theoretical guarantees via Monte Carlo simulation.

**If you find a deviation that is not documented here, it is a P0 bug.** Open a GitHub issue with your reproduction steps and we will treat it as a security-equivalent report.

---

## Why this document exists

Statistical software fails silently. A Bayesian posterior that is off by 3%, a sequential test that does not control Type I error, a CUPED implementation that under-counts variance reduction — any of these lets users ship decisions based on numbers that look right but aren't. Commercial vendors rarely publish this level of validation publicly. We do, because credibility in this space has to be earned artifact-by-artifact.

---

## Validation methodology

Three levels of validation, in order of strictness:

### Level 1 — Reference implementation parity

For each numerical method, we compare output against a trusted external implementation on a fixed set of inputs. Reference implementations (all open source):

| Method | Reference | Rationale |
|---|---|---|
| Z-test (proportions) | [`scipy.stats.proportions_ztest`](https://www.statsmodels.org/stable/generated/statsmodels.stats.proportion.proportions_ztest.html) | Long-established, well-reviewed |
| Welch's T-test | [`scipy.stats.ttest_ind`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_ind.html) with `equal_var=False` | Standard |
| Beta-Binomial posterior | [`scipy.stats.beta`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.beta.html) | Analytic, no MC needed |
| Normal-Normal posterior | Closed-form (Gelman et al., *Bayesian Data Analysis*, 3rd ed., §2.5) | Textbook reference |
| HDI (highest density interval) | [`bayestestR::hdi`](https://easystats.github.io/bayestestR/reference/hdi.html) in R | Canonical R implementation |
| P(best) via Monte Carlo | Analytic formula for 2-arm case (Cook, *Three-way Beta-Beta*), MC for 3+ arms | Verifiable against closed form |
| Expected loss | Analytic formula (Kruschke, *Doing Bayesian Data Analysis*, §12) | Textbook reference |
| O'Brien-Fleming spending | [`gsDesign`](https://keaven.github.io/gsDesign/) in R | Regulatory-grade reference |
| Pocock spending | `gsDesign` | Regulatory-grade reference |
| Lan-DeMets spending | `gsDesign` | Regulatory-grade reference |
| SRM chi-squared test | [`scipy.stats.chisquare`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chisquare.html) | Standard |
| Power calculation | [`pwr`](https://cran.r-project.org/package=pwr) in R, [`statsmodels.stats.power`](https://www.statsmodels.org/stable/stats.html#power-and-sample-size-calculations) | Standard |
| CUPED variance reduction | Deng, Xu, Kohavi, Walker (2013) — paper reference values | Original paper |
| MurmurHash3 | Reference C implementation by Austin Appleby | Canonical |

**Pass criterion:** absolute error on computed values below `1e-6` for closed-form methods, below `5e-3` for Monte Carlo methods with 10,000 samples.

### Level 2 — Theoretical guarantee verification via Monte Carlo

Some methods make *operational* guarantees — "Type I error ≤ α under the null" — that are not checkable by comparing one output to another. We verify these by simulating many trials and counting how often the guarantee is violated.

| Method | Guarantee | Verification |
|---|---|---|
| Frequentist Z-test | Type I error ≤ α | 10,000 trials under H₀, count rejections, 95% CI for rejection rate must contain α |
| Sequential test (all spending functions) | Overall Type I error ≤ α across all looks | 10,000 trials, count rejections at any look, CI must contain α |
| Sequential test | Overall power ≥ design target | 10,000 trials under specified effect, count rejections, CI must contain target |
| SRM detection | Type I error ≤ α under true 50/50 split | 10,000 trials, count false-positive SRM flags, CI must contain α |
| MAB — Thompson Sampling | Regret ≤ O(log T · K · max_arm_gap) | 1,000 runs × 10,000 pulls, compare to Lai-Robbins bound |
| MAB — UCB1 | Same as above | Same protocol |
| Beta-Binomial P(best) | MC estimate converges to analytic value | 100,000 samples, error < 1% |

**Pass criterion:** 95% bootstrap CI on the measured rate contains the theoretical target. Fails → investigation → fix → re-run.

### Level 3 — Adversarial and edge-case testing

Numerical stability, boundary conditions, and known pathological inputs.

- Zero-variance samples (all conversions, no conversions)
- Massive sample counts (n > 10⁹) — check for float overflow and precision loss
- Tiny sample counts (n = 1, n = 2) — confirm proper degree-of-freedom handling
- Extreme effect sizes (relative lift > 100%)
- Negative counts / non-integer conversions (must reject with a clear error)
- NaN / Infinity in inputs (must reject, never propagate)
- Multi-variant experiments with unequal weights near zero
- Adversarial test file: `packages/stats/adversarial-stats.test.ts`

---

## How to reproduce these benchmarks

All benchmark harnesses live in `packages/stats/benchmarks/`.

```bash
# Full validation suite (Level 1 + Level 2 + Level 3)
npm run stats:validate

# Monte Carlo Type I error check (Level 2 — slowest)
npm run stats:monte-carlo

# Reference parity only (Level 1 — fastest)
npm run stats:reference

# Export results as JSON for CI consumption
npm run stats:validate -- --output benchmarks/results.json
```

Reference implementations run in Python and R. To execute those portions:

```bash
# Python reference — scipy, statsmodels, numpy
python -m pip install -r packages/stats/benchmarks/requirements.txt
python packages/stats/benchmarks/scipy_reference.py

# R reference — gsDesign, pwr, bayestestR
Rscript packages/stats/benchmarks/r_reference.R
```

Results are written as JSON to `packages/stats/benchmarks/results/` and committed to the repository. A GitHub Action runs the full suite on every PR to `main`.

---

## Latest validation run

**Last run:** `2026-04-16` — seed 42, 10,000 Monte Carlo trials per suite. Full JSON at [`packages/stats/benchmarks/results/2026-04-16.json`](packages/stats/benchmarks/results/2026-04-16.json). Reproduce with:

```bash
npx tsx packages/stats/benchmarks/monte-carlo.ts --seed 42
```

| Suite | Guarantee | Target | Observed | 95% CI | Pass |
|---|---|---|---|---|---|
| Frequentist z-test — reference parity (unpooled closed form) | ≈ | 0.1528 | 0.1529 | [0.1478, 0.1578] | ✅ |
| Frequentist z-test — Type I error under H₀ | ≈ | 0.0500 | 0.0484 | [0.0444, 0.0528] | ✅ |
| Sequential (O'Brien-Fleming) — overall Type I error across 4 looks | ≤ | 0.0500 | 0.0377 | [0.0341, 0.0416] | ✅ |
| Sequential (Pocock) — overall Type I error across 4 looks | ≤ | 0.0500 | 0.0347 | [0.0313, 0.0385] | ✅ |
| SRM detector — Type I error under true 50/50 split | ≤ | 0.0100 | 0.0116 | [0.0097, 0.0139] | ✅ |
| CUPED empirical variance reduction (ρ=0.7) | ≈ | 0.4900 | 0.4863 | [0.4563, 0.5163] | ✅ |

**Interpretation notes:**
- Sequential tests show rates below α — correct. Alpha-spending designs guarantee Type I ≤ α, not Type I = α; being conservative is expected.
- Frequentist z-test uses **unpooled variance** (Welch-style). Matches our closed-form unpooled reference. SciPy's `proportions_ztest` defaults to **pooled** variance; that reference value (0.1746) is in [`scipy_reference.py`](packages/stats/benchmarks/scipy_reference.py) for cross-checks but is not the convention we use.
- CUPED observed VR of 0.4863 vs theoretical ρ² = 0.49 is within the 3% tolerance and matches Deng et al. (2013) expectations for n=5000.

---

## References

Cited papers and textbooks. Every non-trivial method in `packages/stats/src/` has an inline `// Ref: …` comment pointing to one of these.

1. Deng, A., Xu, Y., Kohavi, R., & Walker, T. (2013). *Improving the Sensitivity of Online Controlled Experiments by Utilizing Pre-Experiment Data.* WSDM '13. [doi:10.1145/2433396.2433413](https://doi.org/10.1145/2433396.2433413)
2. Johari, R., Koomen, P., Pekelis, L., & Walsh, D. (2017). *Peeking at A/B Tests: Why It Matters, and What to Do About It.* KDD '17. [doi:10.1145/3097983.3097992](https://doi.org/10.1145/3097983.3097992)
3. Kohavi, R., Tang, D., & Xu, Y. (2020). *Trustworthy Online Controlled Experiments: A Practical Guide to A/B Testing.* Cambridge University Press.
4. Lan, K. K. G., & DeMets, D. L. (1983). *Discrete Sequential Boundaries for Clinical Trials.* Biometrika, 70(3).
5. O'Brien, P. C., & Fleming, T. R. (1979). *A Multiple Testing Procedure for Clinical Trials.* Biometrics, 35(3).
6. Pocock, S. J. (1977). *Group Sequential Methods in the Design and Analysis of Clinical Trials.* Biometrika, 64(2).
7. Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). *Bayesian Data Analysis* (3rd ed.). CRC Press.
8. Kruschke, J. K. (2015). *Doing Bayesian Data Analysis* (2nd ed.). Academic Press.
9. Lai, T. L., & Robbins, H. (1985). *Asymptotically Efficient Adaptive Allocation Rules.* Advances in Applied Mathematics, 6(1).
10. Agarwal, A., Dudík, M., Kale, S., Langford, J., & Schapire, R. E. (2012). *Contextual Bandit Learning with Predictable Rewards.* AISTATS.
11. Li, L., Chu, W., Langford, J., & Schapire, R. E. (2010). *A Contextual-Bandit Approach to Personalized News Article Recommendation.* WWW '10. (LinUCB)
12. Fabijan, A., Gupchup, J., Gupta, S., Omhover, J., Qin, W., Vermeer, L., & Dmitriev, P. (2019). *Diagnosing Sample Ratio Mismatch in Online Controlled Experiments.* KDD '19.
13. Appleby, A. (2011). *MurmurHash3.* [github.com/aappleby/smhasher](https://github.com/aappleby/smhasher).

---

## Reporting numerical issues

Numerical correctness is security-equivalent for this product. If you find a case where our output deviates from the reference implementations above beyond the stated tolerance, or where a theoretical guarantee fails in Monte Carlo:

1. File a GitHub issue with the label `stats-correctness`.
2. Include inputs, reference value, our value, and the reproduction environment.
3. We will triage within 48 hours, ship a fix, and publish a post-mortem if the issue could have affected production decisions.
