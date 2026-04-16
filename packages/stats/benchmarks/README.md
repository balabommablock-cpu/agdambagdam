# Statistical validation benchmarks

This directory contains the harnesses that keep the Agdam Bagdam stats engine honest. See the top-level [`BENCHMARKS.md`](../../../BENCHMARKS.md) for the methodology.

## Files

| File | What it does |
|---|---|
| `monte-carlo.ts` | Self-contained TS harness. Verifies operational guarantees (Type I error, variance reduction) via simulation. Zero external deps beyond `@abacus/stats` itself. |
| `scipy_reference.py` | Computes textbook values from SciPy/statsmodels so we can parity-check them in `monte-carlo.ts`. |
| `r_reference.R` | Computes reference values from `gsDesign`, `pwr`, and `bayestestR` for sequential design, power, and HDI. |
| `requirements.txt` | Python deps for `scipy_reference.py`. |
| `results/` | Committed JSON outputs from CI runs. Each run is a dated file. |

## Running the Monte Carlo harness

The TypeScript harness is the one you run in CI and locally.

```bash
# Full run (10,000 trials, takes ~30–60s)
npx tsx packages/stats/benchmarks/monte-carlo.ts

# Quick smoke test (1,000 trials, ~3–5s) — use for local development
npx tsx packages/stats/benchmarks/monte-carlo.ts --quick

# Reproducible run with custom seed
npx tsx packages/stats/benchmarks/monte-carlo.ts --seed 1234

# Write results to JSON (for CI)
npx tsx packages/stats/benchmarks/monte-carlo.ts \
  --output packages/stats/benchmarks/results/$(date +%Y-%m-%d).json
```

Exit code is `0` if every suite's 95% bootstrap CI contains the theoretical target, `1` otherwise.

## What's verified

1. **Frequentist z-test reference parity** — compares our p-value against `statsmodels.stats.proportions_ztest` on a fixed 1000/100 vs 1000/120 case.
2. **Frequentist Type I error** — 10,000 trials under H₀, counts false positives. Should converge to α.
3. **Sequential test Type I error (O'Brien-Fleming)** — 10,000 trials, peeking at every look (4 looks). Overall rejection rate should not exceed α.
4. **Sequential test Type I error (Pocock)** — same protocol, different spending function.
5. **SRM detector Type I error** — 10,000 trials under true 50/50 split. False-flag rate should not exceed SRM's configured α.
6. **CUPED empirical variance reduction** — simulates bivariate normal (Y_pre, Y_post) with ρ = 0.7, measures realized variance reduction, compares to theoretical ρ² = 0.49.

## Running the reference scripts

These are optional; they regenerate the reference values hard-coded in `monte-carlo.ts`. Re-run them only when a reference implementation is updated.

```bash
# Python
python -m venv .venv && source .venv/bin/activate
pip install -r packages/stats/benchmarks/requirements.txt
python packages/stats/benchmarks/scipy_reference.py

# R (requires R 4.0+ and gsDesign)
Rscript packages/stats/benchmarks/r_reference.R
```

Both scripts print values to stdout. Update the corresponding `reference` constants in `monte-carlo.ts` if they diverge.

## Interpreting results

Every suite reports:

```
Suite                                Target   Observed   95% CI             Pass
Frequentist z-test — Type I error    0.0500   0.0498    [0.0458, 0.0540]   ✅
```

- **Target** — what the theoretical guarantee says the rate should be.
- **Observed** — measured rate across trials.
- **95% CI** — Wilson score interval on the observed rate. If this contains the target, we pass.
- **Pass** — green if the CI contains the target, red otherwise.

A failure means the library has drifted from its stated guarantee. Don't merge PRs that turn any suite red.

## Adding a new suite

When you add a statistical method that makes an operational guarantee, add a function to `monte-carlo.ts` that returns a `SuiteResult`, and append it to the `results` array in `main()`. Update [`BENCHMARKS.md`](../../../BENCHMARKS.md) with the method and its verification approach.

## Why not just rely on unit tests?

Unit tests verify pointwise correctness — given these inputs, did we compute the right output. Monte Carlo verifies *operational* guarantees — given any inputs satisfying the null hypothesis, does the Type I error stay bounded. Both are necessary. A method can have perfectly correct math and still fail its guarantee if the guarantee itself was specified wrong.
