# Agdam Bagdam — Ship Checklist

This is the **operator runbook** for taking the current commit to a public launch. Every step lists what I (Claude) did, what _you_ still need to do, and the exact link or command.

> Last updated: 2026-04-16

---

## 1. Code changes in this commit (already done)

| File | Fix |
|---|---|
| `packages/server/src/createApp.ts` (new) | Shared Express factory. Helmet, compression, rate-limit (100/min general, 25/min auth, 200/min assignment, 500/min events), trust-proxy, proper JSON-parse → 400, oversize → 413, x-powered-by disabled. |
| `packages/server/src/index.ts` | Delegates to `createApp()`. |
| `api/index.ts` | Vercel serverless entry now uses `createApp()`. Auto-wires Upstash RedisStore when `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set. |
| `packages/dashboard/src/App.tsx` | Routes rewritten. `Experiments`, `Flags`, `Metrics` render `AuthGate` when no key. `Settings` always reachable. Legacy `/app/*` redirects to `/`. Real 404 instead of silent landing fallback. |
| `packages/dashboard/src/components/AuthGate.tsx` (new) | Clear sign-in prompt instead of dead sidebar links. |
| `packages/dashboard/src/components/Layout.tsx` | Disabled the fake notification dot + non-working search until wired. |
| `packages/dashboard/src/pages/NotFound.tsx` (new) | Proper 404 with Home + Docs links. |
| `packages/dashboard/src/pages/Docs.tsx` | HTML snippet now points at `/assets/abacus.js` with an install-from-git note for the SDK. |
| `packages/dashboard/src/pages/Landing.tsx` | Hero experiment card relabeled **"Example Experiment — Illustrative"** (was "LIVE EXPERIMENT — Running"). |
| `packages/stats/src/bayesian.ts` | Monte Carlo RNG no longer hard-coded to seed 42. Accepts `options.seed`, defaults to `Date.now()`. |
| `packages/stats/src/types.ts` | `BayesianOptions.seed?: number` documented. |

Boredfolio wrapper (separate repo at `~/Documents/Rishabh Experiments/boredfolio`):

| File | Fix |
|---|---|
| `src/app/agdambagdam/page.tsx` | Added correct `canonical`, override of mutual-fund `keywords`, `sandbox`, `referrerPolicy`, `allow`, `robots`. |
| `src/app/agdambagdam/docs/page.tsx` | Same metadata + iframe hardening. |
| `next.config.js` | Added `Content-Security-Policy` (frame-src whitelists the Vercel preview) and `Permissions-Policy`. |

---

## 2. What still needs you (ordered by blocking-ness)

### 2.1 — Commit + push (5 min)

```bash
# agdambagdam repo
cd ~/Documents/Rishabh\ Experiments/agdambagdam
git add -A
git commit -m "fix: unify api entry, gate sidebar routes, de-hype hero, seed RNG"
git push origin main
# Vercel auto-deploys on push.

# boredfolio repo
cd ~/Documents/Rishabh\ Experiments/boredfolio
git add src/app/agdambagdam next.config.js
git commit -m "chore(agdambagdam): canonical + CSP + iframe sandbox"
git push origin main
```

### 2.2 — Install new serverless deps (2 min)

The `api/index.ts` conditionally imports `@upstash/redis` and `rate-limit-redis`. Add them so Upstash-backed rate limiting works when env vars are present:

```bash
cd ~/Documents/Rishabh\ Experiments/agdambagdam
npm i -w packages/server @upstash/redis rate-limit-redis
# then commit package.json + lockfile
git add packages/server/package.json package-lock.json
git commit -m "deps: add @upstash/redis + rate-limit-redis for shared rate-limit store"
git push
```

### 2.3 — Add Upstash Redis on Vercel (5 min, needs your login)

1. Open https://vercel.com/dashboard → pick the abacus project.
2. Storage → **Marketplace** → search **Upstash Redis** → Install → Create DB (name `abacus-ratelimit`, region closest to your Vercel functions).
3. After install, Vercel auto-sets `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` in your env vars.
4. Redeploy (Deployments → latest → ••• → Redeploy).

**Verify:** `curl https://abacus-eight-kappa.vercel.app/api/health` should now return `"rateLimitStore":"shared"`.

### 2.4 — Publish the SDKs to npm (15 min)

The `@abacus` scope is **not yours on npm** right now. Pick one:
- Create an org: https://www.npmjs.com/org/create → name `agdambagdam` → free OSS tier.
- Or unscope: rename to `agdambagdam-sdk-js` (non-scoped; instant).

Recommended:

```bash
# Create the scope once on npmjs.com, then:
npm login
cd ~/Documents/Rishabh\ Experiments/agdambagdam
# Update scope in both SDK package.json files if the scope differs from @abacus:
#   packages/sdk-js/package.json   -> "name": "@agdambagdam/sdk-js"
#   packages/sdk-node/package.json -> "name": "@agdambagdam/sdk-node"
# Also bump "publishConfig": { "access": "public" } in each.
npm run build
npm publish -w packages/sdk-js --access public
npm publish -w packages/sdk-node --access public
```

**Then update** `packages/dashboard/src/pages/Settings.tsx` (import lines) and `packages/dashboard/src/pages/Docs.tsx` (react snippet) to use the published scope, and redeploy.

### 2.5 — Domain (10 min, needs your payment method)

Auto-generated `abacus-eight-kappa.vercel.app` is hurting credibility. Options:

| Option | Cost | Effort |
|---|---|---|
| `agdambagdam.com` via **Vercel Domains** | ~$10/yr | 5 min, add in Vercel dashboard |
| `agdambagdam.dev` | ~$15/yr | Same |
| Keep current, but add a `vercel.json` `redirects` so `abacus-eight-kappa.vercel.app/*` → `boredfolio.com/agdambagdam/*` | Free | 2 min |

Fastest credibility win: **buy agdambagdam.com** and alias it to the current Vercel project. https://vercel.com/domains

### 2.6 — Database for the hosted demo (30 min)

Currently `/api/health` works but any real endpoint needs Postgres. Pick one:

| Provider | Best for | Link |
|---|---|---|
| **Vercel Neon** (Marketplace) | Zero-config Postgres, good free tier | https://vercel.com/marketplace/neon |
| **Supabase** | Auth + DB combo if you want OAuth signup later | https://supabase.com |
| **Upstash** Postgres | Serverless-native, very cheap | https://upstash.com |

Once installed:
1. `vercel env pull` locally
2. `DATABASE_URL=… npm run db:migrate` (you'll get an org + project + first API key printed)
3. Set `DATABASE_URL` in Vercel project env and redeploy.

### 2.7 — GitHub repo polish (15 min)

- Add **repository description**: "Free, open-source A/B testing with Bayesian + Frequentist stats, feature flags, CUPED, sequential testing, SRM detection. MIT."
- Add **topics**: `ab-testing`, `feature-flags`, `bayesian`, `statistics`, `typescript`, `open-source`, `experimentation`.
- Add **"Releases"** — cut a v0.2.0 once the above ships.
- Add **SECURITY.md**, **CONTRIBUTING.md**, **CODE_OF_CONDUCT.md**. Templates: https://docs.github.com/en/communities.
- Add a **star-history** SVG to the README: https://star-history.com/
- Add **CodeCov badge** for coverage (requires setting up GitHub Actions first).

### 2.8 — CI + coverage badge (20 min)

Create `.github/workflows/ci.yml` that runs `npm run test` across packages and uploads coverage to https://about.codecov.io. Badge URL goes in README.

### 2.9 — Benchmark harness (1 hour)

The landing claims "better statistics than $500K tools." Back it up:
1. Port 10 canonical test cases (e.g. from R's `prop.test`, `t.test`, SciPy's `stats.ttest_ind`).
2. Run Agdam Bagdam's stats engine against them, write a diff table.
3. Publish as `BENCHMARKS.md` in the repo + link from Landing.
4. Coverage badge in README.

---

## 3. Launch-day checklist (after 2.1–2.5 are green)

Copy-paste these; each one is a link to submit.

| Destination | Link | Notes |
|---|---|---|
| Hacker News – Show HN | https://news.ycombinator.com/submit | Title: `Show HN: Agdam Bagdam – Free OSS A/B testing with Bayesian + Frequentist stats`. Post between 7–9am Pacific weekday for best HN traffic. |
| Product Hunt | https://www.producthunt.com/posts/new | Schedule for Tue/Wed 12:01am PT. Needs ≥3 images, a 60s demo gif, and a maker account. |
| Reddit r/programming | https://www.reddit.com/r/programming/submit | Link post, not text. |
| Reddit r/opensource | https://www.reddit.com/r/opensource/submit | Friendly to OSS launches. |
| Reddit r/webdev | https://www.reddit.com/r/webdev/submit | |
| Reddit r/SaaS | https://www.reddit.com/r/SaaS/submit | Frame as "I built an OSS alternative to $500K/yr tools." |
| Reddit r/analytics | https://www.reddit.com/r/analytics/submit | |
| Reddit r/statistics | https://www.reddit.com/r/statistics/submit | Lead with the Bayesian+Frequentist engine, NOT the price comparison. They'll roast marketing hype. |
| Indie Hackers | https://www.indiehackers.com/post | |
| dev.to launch post | https://dev.to/new | 1,500-word post. Tag: `opensource`, `javascript`, `webdev`, `programming`. |
| Hashnode | https://hashnode.com/create/story | Cross-post same content. |
| Twitter/X | https://x.com/compose/post | Thread of 5–8 tweets. First tweet: screenshot + GitHub link. |
| LinkedIn | https://www.linkedin.com/feed/?shareActive=true | Longer-form post, same content as dev.to. |
| Awesome lists | https://github.com/sindresorhus/awesome → open PR to a sublist | `awesome-opensource`, `awesome-react`, `awesome-ab-testing` (make one if it doesn't exist). |
| Hacker Noon | https://hackernoon.com/submit-a-story | Approval takes ~3 days. |
| Console.dev newsletter | https://console.dev/submit/ | Devtool-focused weekly. |
| TLDR newsletter | https://tldr.tech/about | DM the editor with a short pitch. |
| Product Hunt Makers' newsletter | included in PH launch | |
| OpenSourceSoftware.rocks | https://opensourcesoftware.rocks/submit | |
| AlternativeTo | https://alternativeto.net/software/optimizely/about/ | Claim to be an alternative to Optimizely / LaunchDarkly / VWO / GrowthBook. |
| G2 (enterprise review site) | https://www.g2.com/products/new | Wait until you have 3+ paying/self-hosted users. |
| BetaList | https://betalist.com/submit | Free OSS launches accepted. |

### Launch-day content pack you'll need

- **Logo**: 512×512 PNG, transparent bg (currently a 🧮 emoji — replace).
- **OG image**: 1200×630 PNG for link previews. Put the headline + hero mock. Serve from `/agdambagdam/og.png` or Vercel's OG image generator (`@vercel/og`).
- **Demo GIF**: 30–60 seconds. Tool: https://www.screen.studio or https://cleanshot.com/features/screen-recorder
- **5 screenshots**: dashboard empty state, experiment detail, feature flag, results, SDK snippet.
- **One paragraph pitch** (for HN/PH/dev.to intro):
  > Agdam Bagdam is a free, MIT-licensed A/B testing and feature-flag platform with a real Bayesian + Frequentist stats engine (Beta-Binomial, Normal-Normal, Z/T-tests, Sequential, SRM). Works as a self-hosted Docker stack or a single Vercel deploy. No vendor lock-in, no per-MAU pricing, no "contact sales."

---

## 4. What remains as honest debt

These are in [the QA report](#) from 2026-04-16 but **not** fixed in this commit. Acknowledge them; ship the rest first.

- Hosted signup flow (users still need to self-host to get an API key).
- CUPED and Multi-Armed Bandits are library-only, not REST-exposed. README table should mark them `Library only` until the API surface ships.
- npm scope not yet published — Docs/Settings still reference `@abacus/sdk-js`. Update after §2.4.
- Landing comparison table still lacks "Reviewed on `<date>`" footnote and sourced links per competitor.
- No benchmark numbers yet. Ship `BENCHMARKS.md` before tweeting "better stats than $500K tools."
- No CONTRIBUTING / SECURITY / CODE_OF_CONDUCT files.
- Accessibility: hero h1 at 96px still wraps ugly below 420px; landing doesn't have a hamburger.

---

## 5. Smoke-test after deploying

```bash
# Security headers (boredfolio)
curl -sI https://boredfolio.com/agdambagdam | grep -iE "content-security|permissions-policy|x-frame"

# Canonical fixed
curl -s https://boredfolio.com/agdambagdam | grep -i canonical
# expect: https://boredfolio.com/agdambagdam (not boredfolio.com)

# Rate limiter active (after 2.3)
for i in {1..30}; do curl -s -o /dev/null -w "%{http_code} " https://abacus-eight-kappa.vercel.app/api/experiments; done; echo
# expect: 401 × 25, then 429 ×

# JSON parse error → 400, not 500
curl -s -i -X POST -H "x-api-key: x" -H "Content-Type: application/json" -d "nope" https://abacus-eight-kappa.vercel.app/api/experiments | head -3
# expect HTTP/2 400 {"error":"Invalid JSON body."}

# Oversize body → 413
python3 -c "print('{' + 'a'*2000000 + '}')" | curl -s -i -X POST --data-binary @- -H "x-api-key: x" -H "Content-Type: application/json" https://abacus-eight-kappa.vercel.app/api/experiments | head -3
# expect HTTP/2 413

# Dashboard routes: /experiments shows AuthGate, not Landing
curl -s https://abacus-eight-kappa.vercel.app/experiments | grep -o "Sign in to view"

# x-powered-by gone
curl -sI https://abacus-eight-kappa.vercel.app/api/health | grep -i x-powered-by
# expect: (empty)
```

If any smoke test fails, revert the corresponding change and ping me.
