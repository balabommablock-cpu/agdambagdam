"""Reference value generator for @abacus/stats.

Computes statistical quantities using scipy/statsmodels so they can be used
as ground-truth comparisons in the TypeScript Monte Carlo harness.

Run:
    python packages/stats/benchmarks/scipy_reference.py

Output:
    JSON-serialisable dict printed to stdout. Values printed here are copied
    into `monte-carlo.ts` as `reference` constants in the parity suites.

When you update this file, re-run it and paste the new values into the
corresponding `reference = ...` lines of `monte-carlo.ts`. Keep the tolerances
reasonable; small differences can arise from pooled vs unpooled variance
conventions, continuity correction, and floating-point order of operations.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass

import numpy as np
from scipy import stats as sp
from statsmodels.stats.proportion import proportions_ztest


@dataclass
class Result:
    name: str
    inputs: dict
    reference: dict
    source: str
    notes: str = ""


def frequentist_proportions_ztest_reference() -> Result:
    """1000/100 vs 1000/120, two-sided. Pooled-variance z-test."""
    counts = np.array([100, 120])
    nobs = np.array([1000, 1000])
    stat, pval = proportions_ztest(count=counts, nobs=nobs, alternative="two-sided")
    return Result(
        name="frequentist.z_test.proportions",
        inputs={"count": counts.tolist(), "nobs": nobs.tolist(), "alternative": "two-sided"},
        reference={"z": float(stat), "p_value": float(pval)},
        source="statsmodels.stats.proportion.proportions_ztest",
        notes="Pooled variance. 'two-sided' convention.",
    )


def welch_t_test_reference() -> Result:
    """Welch's t-test with deterministic synthetic data, seeded for reproducibility."""
    rng = np.random.default_rng(seed=42)
    a = rng.normal(loc=0.0, scale=1.0, size=500)
    b = rng.normal(loc=0.1, scale=1.0, size=500)
    res = sp.ttest_ind(a, b, equal_var=False)
    return Result(
        name="frequentist.welch_t.continuous",
        inputs={
            "n_a": 500,
            "n_b": 500,
            "mean_a_target": 0.0,
            "mean_b_target": 0.1,
            "sigma": 1.0,
            "seed": 42,
            "mean_a_observed": float(a.mean()),
            "mean_b_observed": float(b.mean()),
        },
        reference={"t": float(res.statistic), "p_value": float(res.pvalue)},
        source="scipy.stats.ttest_ind(equal_var=False)",
        notes="Seeded synthetic data. Re-running with the same seed must produce identical values.",
    )


def beta_posterior_hdi_reference() -> Result:
    """Beta(11, 91) posterior, 95% HDI. Prior Beta(1,1) + 10/100 successes."""
    alpha_post, beta_post = 11, 91
    dist = sp.beta(alpha_post, beta_post)
    # HDI via dense grid — exact enough for reference.
    grid = np.linspace(0, 1, 100_001)
    density = dist.pdf(grid)
    ci_mass = 0.95
    total = density.sum()
    # Find shortest interval containing ci_mass of probability.
    # Binary search is overkill for a reference; use a sliding window.
    sorted_idx = np.argsort(density)[::-1]
    cum = np.cumsum(density[sorted_idx])
    threshold_idx = np.searchsorted(cum, ci_mass * total)
    in_hdi = np.zeros_like(density, dtype=bool)
    in_hdi[sorted_idx[: threshold_idx + 1]] = True
    hdi_low = float(grid[in_hdi].min())
    hdi_high = float(grid[in_hdi].max())
    return Result(
        name="bayesian.beta_hdi",
        inputs={"alpha": alpha_post, "beta": beta_post, "mass": ci_mass},
        reference={"hdi_low": hdi_low, "hdi_high": hdi_high},
        source="scipy.stats.beta + dense-grid HDI",
        notes="Dense-grid HDI on 100k points. For cross-check: bayestestR::hdi in R.",
    )


def srm_chi_squared_reference() -> Result:
    """Chi-squared GOF for an observed 4985/5015 split vs expected 0.5/0.5."""
    observed = np.array([4985, 5015])
    expected = np.array([5000, 5000])
    chi, p = sp.chisquare(f_obs=observed, f_exp=expected)
    return Result(
        name="srm.chi_squared",
        inputs={"observed": observed.tolist(), "expected": expected.tolist()},
        reference={"chi_squared": float(chi), "p_value": float(p)},
        source="scipy.stats.chisquare",
        notes="df=1 (two categories). No continuity correction.",
    )


def power_analysis_reference() -> Result:
    """Sample size for two-proportion z-test. p1=0.10, p2=0.12, α=0.05, power=0.80, two-sided."""
    from statsmodels.stats.power import NormalIndPower
    from statsmodels.stats.proportion import proportion_effectsize

    es = proportion_effectsize(0.12, 0.10)
    analysis = NormalIndPower()
    n_per_arm = analysis.solve_power(effect_size=es, alpha=0.05, power=0.80, alternative="two-sided")
    return Result(
        name="power.two_proportion_sample_size",
        inputs={"p1": 0.10, "p2": 0.12, "alpha": 0.05, "power": 0.80, "alternative": "two-sided"},
        reference={"n_per_arm": float(n_per_arm), "effect_size_cohen_h": float(es)},
        source="statsmodels.stats.power.NormalIndPower",
        notes="Cohen's h effect size convention.",
    )


def main() -> None:
    results = [
        frequentist_proportions_ztest_reference(),
        welch_t_test_reference(),
        beta_posterior_hdi_reference(),
        srm_chi_squared_reference(),
        power_analysis_reference(),
    ]
    print(json.dumps([asdict(r) for r in results], indent=2, default=float))


if __name__ == "__main__":
    main()
