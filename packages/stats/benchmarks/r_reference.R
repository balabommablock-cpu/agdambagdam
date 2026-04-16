# Reference value generator for @abacus/stats — R side.
#
# Computes reference values using gsDesign, pwr, and bayestestR that the
# TypeScript harness parity-checks against.
#
# Run:
#   Rscript packages/stats/benchmarks/r_reference.R
#
# Requirements: R >= 4.0 with packages gsDesign, pwr, bayestestR, jsonlite.
#   install.packages(c("gsDesign", "pwr", "bayestestR", "jsonlite"))

suppressMessages({
  library(gsDesign)
  library(pwr)
  library(bayestestR)
  library(jsonlite)
})

results <- list()

# ─── Sequential design: O'Brien-Fleming, 4 looks, alpha 0.05, power 0.90 ────
of_design <- gsDesign(
  k = 4,
  test.type = 2,         # two-sided, upper and lower symmetric
  sfu = sfLDOF,          # Lan-DeMets with O'Brien-Fleming shape
  alpha = 0.025,         # one-sided alpha for symmetric two-sided 0.05
  beta = 0.10,
  timing = c(0.25, 0.5, 0.75, 1.0)
)
results$sequential_obrien_fleming <- list(
  name = "sequential.design.obrien_fleming",
  inputs = list(
    k = 4,
    alpha_two_sided = 0.05,
    power = 0.90,
    spending = "obrien-fleming"
  ),
  reference = list(
    boundaries = of_design$upper$bound,
    alpha_spent_by_look = of_design$upper$spend,
    cumulative_alpha_spent = cumsum(of_design$upper$spend),
    info_fraction = c(0.25, 0.5, 0.75, 1.0)
  ),
  source = "gsDesign::gsDesign sfLDOF",
  notes = "Two-sided 0.05 = one-sided 0.025 per boundary. Symmetric design."
)

# ─── Sequential design: Pocock ───────────────────────────────────────────────
pocock_design <- gsDesign(
  k = 4,
  test.type = 2,
  sfu = sfLDPocock,
  alpha = 0.025,
  beta = 0.10,
  timing = c(0.25, 0.5, 0.75, 1.0)
)
results$sequential_pocock <- list(
  name = "sequential.design.pocock",
  inputs = list(
    k = 4,
    alpha_two_sided = 0.05,
    power = 0.90,
    spending = "pocock"
  ),
  reference = list(
    boundaries = pocock_design$upper$bound,
    alpha_spent_by_look = pocock_design$upper$spend,
    cumulative_alpha_spent = cumsum(pocock_design$upper$spend),
    info_fraction = c(0.25, 0.5, 0.75, 1.0)
  ),
  source = "gsDesign::gsDesign sfLDPocock",
  notes = "Two-sided 0.05 = one-sided 0.025 per boundary."
)

# ─── Power: two-proportion z-test, p1=0.10, p2=0.12 ──────────────────────────
h <- ES.h(p1 = 0.12, p2 = 0.10)
power_res <- pwr.2p.test(h = h, sig.level = 0.05, power = 0.80, alternative = "two.sided")
results$power_two_proportion <- list(
  name = "power.two_proportion_sample_size",
  inputs = list(
    p1 = 0.10,
    p2 = 0.12,
    alpha = 0.05,
    power = 0.80,
    alternative = "two-sided"
  ),
  reference = list(
    n_per_arm = ceiling(power_res$n),
    effect_size_cohen_h = h
  ),
  source = "pwr::pwr.2p.test",
  notes = "Cohen's h effect size. Should agree with statsmodels within 1 unit."
)

# ─── Bayesian HDI: Beta(11, 91) ─────────────────────────────────────────────
set.seed(42)
samples <- rbeta(200000, 11, 91)
hdi_res <- hdi(samples, ci = 0.95)
results$bayesian_beta_hdi <- list(
  name = "bayesian.beta_hdi",
  inputs = list(alpha = 11, beta = 91, mass = 0.95, n_samples = 200000, seed = 42),
  reference = list(
    hdi_low = hdi_res$CI_low,
    hdi_high = hdi_res$CI_high
  ),
  source = "bayestestR::hdi on 200k rbeta samples",
  notes = "Monte Carlo HDI. Should agree with SciPy dense-grid HDI to ~3 decimal places."
)

# ─── Output JSON ────────────────────────────────────────────────────────────
cat(toJSON(results, pretty = TRUE, auto_unbox = TRUE, digits = 10))
cat("\n")
