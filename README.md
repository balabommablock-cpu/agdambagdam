# Agdam Bagdam

**The most powerful open-source A/B testing platform for developers.**

Free. Self-hosted. Better statistics than tools charging $500K/year.

---

## What is this?

Agdam Bagdam is a complete A/B testing and feature flag platform with a world-class statistics engine. It gives you everything you need to run rigorous experiments — Bayesian analysis, Frequentist testing, CUPED variance reduction, sequential testing, SRM detection, and multi-armed bandits — all open source, all free.

**Live demo:** [abacus-eight-kappa.vercel.app](https://abacus-eight-kappa.vercel.app)

## Why?

Companies charge $15K-$500K/year for A/B testing. Most of that money pays for marketing, not math.

We built Agdam Bagdam so any company — from a bootstrapped startup to a Fortune 500 — can run world-class experiments without selling a kidney.

## Features

### What's working today

| Feature | Status |
|---------|--------|
| A/B Testing (full lifecycle) | Production-ready |
| Feature Flags (boolean, typed, targeting, rollout) | Production-ready |
| Bayesian Statistical Analysis | Integrated into results API |
| Frequentist Hypothesis Testing (Z-test, T-test) | Integrated into results API |
| SRM Detection (Sample Ratio Mismatch) | Integrated into results API |
| Sequential Testing (O'Brien-Fleming, Pocock) | Integrated into results API |
| Power Analysis | Integrated into results API |
| CUPED Variance Reduction | Stats library (manual) |
| Multi-Armed Bandits (Thompson, UCB1, LinUCB) | Stats library (manual) |
| Targeting Rules Engine | Production-ready |
| Mutual Exclusion Groups | Production-ready |
| Deterministic Assignment (MurmurHash3) | Production-ready |
| Browser SDK (14.7KB) | Production-ready |
| Node.js SDK | Production-ready |
| React Dashboard | Production-ready |
| REST API | Production-ready |
| Docker Compose deployment | Production-ready |
| Vercel deployment | Production-ready |

### What's coming

- Visual Editor (no-code testing for marketing teams)
- Warehouse-native mode (BigQuery, Snowflake, Redshift)
- Python, Go, Ruby SDKs
- iOS and Android SDKs
- RBAC and team management
- Scheduled experiments with auto-stopping

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/balabommablock-cpu/agdambagdam.git
cd agdambagdam
npm install
```

### 2. Start PostgreSQL

```bash
# With Docker
docker-compose up -d postgres

# Or use your own PostgreSQL and set DATABASE_URL
export DATABASE_URL="postgres://user:pass@localhost:5432/abacus"
```

### 3. Run migrations

```bash
npm run db:migrate
```

### 4. Start the platform

```bash
npm run dev
# Server: http://localhost:3456
# Dashboard: http://localhost:3457
```

### 5. Create your first experiment

```bash
API_KEY="<your-api-key-from-migration>"

# Create a metric
curl -X POST http://localhost:3456/api/metrics \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -H "x-project-id: <your-project-id>" \
  -d '{"key":"signup_rate","name":"Signup Rate","type":"conversion"}'

# Create an experiment
curl -X POST http://localhost:3456/api/experiments \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -H "x-project-id: <your-project-id>" \
  -d '{
    "key": "homepage-cta",
    "name": "Homepage CTA Test",
    "type": "ab",
    "variants": [
      {"key": "control", "name": "Blue Button", "weight": 0.5, "is_control": true},
      {"key": "green", "name": "Green Button", "weight": 0.5}
    ]
  }'
```

### 6. Add the SDK to your site

```html
<script src="/path/to/abacus.js"></script>
<script>
  const ab = new Abacus({
    apiKey: 'your-api-key',
    baseUrl: 'https://your-server.com'
  });

  const variant = await ab.getVariant('homepage-cta');
  if (variant === 'green') {
    document.querySelector('#cta').style.backgroundColor = 'green';
  }

  document.querySelector('#cta').onclick = () => ab.track('signup_rate');
</script>
```

## Architecture

```
packages/
  stats/       # Zero-dep statistical engine (2,947 lines)
  server/      # Express + PostgreSQL API server
  sdk-js/      # Browser SDK (14.7KB)
  sdk-node/    # Node.js SDK
  dashboard/   # React + Vite + Tailwind dashboard
```

## Stats Engine

The statistics engine is the heart of Agdam Bagdam. Zero external dependencies. Every algorithm implemented from scratch:

- **Bayesian**: Beta-Binomial for conversions, Normal-Normal for continuous metrics, Monte Carlo P(best), expected loss, HDI credible intervals
- **Frequentist**: Z-test, Welch's T-test, confidence intervals, effect sizes, Bonferroni/Holm/BH corrections
- **CUPED**: Controlled-experiment Using Pre-Experiment Data — reduces experiment runtime by 20-50%
- **Sequential Testing**: O'Brien-Fleming and Pocock spending functions — stop experiments early with valid conclusions
- **SRM Detection**: Catch data quality bugs before they corrupt your results
- **Multi-Armed Bandits**: Thompson Sampling, UCB1, Epsilon-Greedy, LinUCB (contextual)
- **Power Analysis**: Sample size calculator, MDE estimation, runtime projections

## Tech Stack

- TypeScript throughout
- PostgreSQL 16
- Express 5
- React 19 + Vite 6 + Tailwind 3
- Recharts for visualization
- Docker Compose for deployment
- MIT License

## Deployment

### Docker

```bash
docker-compose up -d
```

### Vercel

```bash
vercel --prod
```

## Contributing

PRs welcome. The stats engine is the crown jewel — if you find a mathematical error, that's a P0 bug.

## License

MIT — do whatever you want with it.

---

*Built with rage against overpriced SaaS. Made in India.*
