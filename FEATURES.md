# Feature Comparison

Honest side-by-side with the dominant commercial A/B testing and feature flag platforms. If a cell is wrong, file an issue with a citation and we'll fix it.

**Legend:**
`✅` fully supported · `🟡` partial / requires paid tier / requires workaround · `❌` not supported · `💰` paid-only feature

Last verified: 2026-04 (by public docs + pricing pages). Competitor features change; check their latest docs for anything marginal.

---

## Statistical engine

| Capability | Agdam Bagdam | VWO | Optimizely | LaunchDarkly | Statsig | Eppo | GrowthBook | Convert |
|---|---|---|---|---|---|---|---|---|
| Frequentist (Z-test, T-test) | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ |
| Bayesian inference | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Both engines side-by-side | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| CUPED variance reduction | ✅ | ❌ | ❌ | ❌ | 💰 | 💰 | 💰 | ❌ |
| Sequential testing / always-valid p-values | ✅ | ❌ | ❌ | ❌ | 💰 | 💰 | 💰 | ❌ |
| SRM detection | ✅ | 🟡 | 🟡 | ❌ | ✅ | ✅ | ✅ | 🟡 |
| Multiple comparison correction (Bonferroni / Holm / BH) | ✅ | 🟡 | 🟡 | ❌ | ✅ | ✅ | 🟡 | 🟡 |
| Power analysis / sample size calculator | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Ratio metrics (delta method SEs) | 🟡 planned | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | 🟡 |
| Quantile metrics | 🟡 planned | 🟡 | ✅ | ❌ | ✅ | ✅ | 🟡 | 🟡 |
| Cluster-robust standard errors | 🟡 planned | ❌ | 🟡 | ❌ | ✅ | ✅ | 🟡 | ❌ |
| Winsorization / outlier handling | 🟡 planned | 🟡 | 🟡 | ❌ | ✅ | ✅ | 🟡 | 🟡 |

## Experimentation primitives

| Capability | Agdam Bagdam | VWO | Optimizely | LaunchDarkly | Statsig | Eppo | GrowthBook | Convert |
|---|---|---|---|---|---|---|---|---|
| A/B tests (2+ variants) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Multivariate tests | 🟡 planned | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Split-URL / redirect tests | 🟡 planned | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Feature flags (boolean + typed) | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Targeting rules engine | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mutual exclusion groups | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ |
| Holdout groups | 🟡 planned | ✅ | ✅ | 🟡 | ✅ | ✅ | 🟡 | ✅ |
| Multi-armed bandits | ✅ Thompson / UCB1 / Epsilon-greedy | 💰 | 💰 | ❌ | ✅ | ❌ | ❌ | ❌ |
| Contextual bandits (LinUCB) | ✅ | ❌ | ❌ | ❌ | 💰 | ❌ | ❌ | ❌ |
| Scheduled auto-stop | 🟡 planned | ✅ | ✅ | ❌ | ✅ | ✅ | 🟡 | ✅ |
| Deterministic assignment (same user, same variant) | ✅ MurmurHash3 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Offline/edge SDK evaluation | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 |

## Data & integrations

| Capability | Agdam Bagdam | VWO | Optimizely | LaunchDarkly | Statsig | Eppo | GrowthBook | Convert |
|---|---|---|---|---|---|---|---|---|
| Event tracking API | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ |
| Warehouse-native (BigQuery / Snowflake / Redshift) | 🟡 planned Q2 | ❌ | 💰 | ❌ | ✅ | ✅ | 💰 | ❌ |
| Segment integration | 🟡 planned | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Webhook events | 🟡 planned | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| OpenAPI spec | 🟡 planned | ❌ | ✅ | ✅ | ✅ | 🟡 | ✅ | ❌ |

## SDKs

| Platform | Agdam Bagdam | VWO | Optimizely | LaunchDarkly | Statsig | Eppo | GrowthBook | Convert |
|---|---|---|---|---|---|---|---|---|
| Browser JS | ✅ 14.7 KB | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Node.js | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Python | 🟡 planned | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Go | 🟡 planned | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Java / Kotlin | 🟡 planned | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Ruby | 🟡 planned | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| iOS / Android | 🟡 planned | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ |

## Enterprise & operations

| Capability | Agdam Bagdam | VWO | Optimizely | LaunchDarkly | Statsig | Eppo | GrowthBook | Convert |
|---|---|---|---|---|---|---|---|---|
| Self-hostable | ✅ free | ❌ | ❌ | ❌ | 💰 | 💰 | ✅ | ❌ |
| Open source (MIT) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| SSO (SAML / OIDC) | 🟡 planned Q2 | 💰 | 💰 | 💰 | 💰 | 💰 | 🟡 | 💰 |
| SCIM user provisioning | 🟡 planned | 💰 | 💰 | 💰 | 💰 | 💰 | ❌ | 💰 |
| RBAC with workspace model | 🟡 planned Q2 | 💰 | 💰 | 💰 | 💰 | 💰 | ✅ | 💰 |
| Audit log | ✅ DB table present; UI 🟡 planned | 💰 | 💰 | 💰 | 💰 | 💰 | ✅ | 💰 |
| API key scoping & rotation | 🟡 planned | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Webhook HMAC signatures | 🟡 planned | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 |
| IP allowlisting | 🟡 planned | 💰 | 💰 | 💰 | 💰 | 💰 | ❌ | 💰 |
| SOC 2 Type II | 🟡 in progress | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ |
| GDPR / CCPA DPA | 🟡 in progress | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## Privacy

| Capability | Agdam Bagdam | VWO | Optimizely | LaunchDarkly | Statsig | Eppo | GrowthBook | Convert |
|---|---|---|---|---|---|---|---|---|
| First-party data only (no third-party cookies) | ✅ | 🟡 | 🟡 | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Respects Do Not Track | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ✅ | 🟡 |
| No data egress in self-host mode | ✅ | N/A | N/A | N/A | 🟡 | 🟡 | ✅ | N/A |
| EU data residency option | ✅ self-host | ✅ | 💰 | 💰 | 💰 | 💰 | ✅ self-host | ✅ |

## Pricing (entry-level, per year)

| | Agdam Bagdam | VWO | Optimizely | LaunchDarkly | Statsig | Eppo | GrowthBook | Convert |
|---|---|---|---|---|---|---|---|---|
| Free tier | Unlimited self-hosted | 50K MAU | None | 1K MAU | 1M events | None | Unlimited self-hosted | 10K MAU |
| Paid starting | $0 | ~$12K | ~$50K | ~$8K | ~$20K | ~$30K | ~$6K cloud | ~$8K |
| Enterprise | $0 | $75K+ | $200K+ | $100K+ | $100K+ | $150K+ | $30K+ | $50K+ |

---

## Where we are honestly behind

We don't gain credibility by hiding gaps. Things competitors do that we do not yet do:

- **Visual editor for no-code testing** — on roadmap, not a priority for v1. Agdam Bagdam is developer-first.
- **Ratio metrics with delta method** — stats engine primitives are present; exposed API pending (GitHub issue).
- **Cluster-robust SEs** — matters when users share sessions/devices. On roadmap.
- **Warehouse-native mode** — Statsig and Eppo are ahead here. We're building Snowflake + BigQuery sync next.
- **Enterprise surface (SSO, SCIM, RBAC UI)** — infrastructure exists, polished surfaces landing Q2 2026.
- **Mobile SDKs** — iOS and Android planned after Python and Go.

## Where we are honestly ahead

- **Contextual bandits (LinUCB) in the free tier** — Statsig gates this behind enterprise pricing; nobody else has it.
- **Both Bayesian and Frequentist analysis in the same result surface** — only Convert offers both commercially.
- **CUPED, sequential testing, SRM detection in the free tier** — everyone else paywalls these.
- **Zero external dependencies in the stats engine** — 2,947 lines of pure TypeScript. Auditable. No supply chain risk.
- **MIT license, self-hostable, no egress** — the only platform where the answer to "where does our data go" is "wherever you deploy it."
- **Deterministic assignment with MurmurHash3 on both server and browser SDK** — same variant everywhere, no drift.

---

*If a competitor's capability is misrepresented here, open an issue with a public documentation link. Corrections ship within 48 hours.*
