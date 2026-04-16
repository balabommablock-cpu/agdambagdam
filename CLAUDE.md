# Abacus — Open-Source Experimentation Platform

## What This Is
A/B testing, feature flags, and statistical analysis platform that makes $500K/year commercial tools (VWO, Optimizely, LaunchDarkly, Statsig) obsolete. MIT-licensed, self-hostable, zero vendor lock-in.

## Architecture
Monorepo with npm workspaces:
- `packages/stats` — Pure TypeScript statistical engine (zero deps). Bayesian, Frequentist, CUPED, Sequential Testing, SRM, Multi-Armed Bandits (including Contextual/LinUCB)
- `packages/server` — Express + PostgreSQL API server. Experiment management, deterministic variant assignment (MurmurHash3), event tracking, feature flags, targeting engine
- `packages/sdk-js` — Browser SDK (< 5KB gzipped). Automatic assignment caching, event batching, sendBeacon, SPA support, privacy-first
- `packages/sdk-node` — Node.js SDK for server-side assignment and tracking
- `packages/dashboard` — React + Vite + Tailwind dashboard. Experiment management, real-time results, statistical visualization

## Tech Stack
- TypeScript throughout
- PostgreSQL 16 for storage
- Express 5 for API
- React 19 + Vite 6 + Tailwind 3 for dashboard
- Recharts for data visualization
- Docker Compose for deployment
- Zero external dependencies in stats engine and browser SDK

## Commands
```bash
npm run dev              # Start server + dashboard in dev mode
npm run dev:server       # Server only (port 3456)
npm run dev:dashboard    # Dashboard only (port 3457)
npm run build            # Build all packages
npm run db:migrate       # Run database migrations
npm run test             # Run all tests
docker-compose up -d     # Start everything with Docker
```

## Key Design Decisions
- **Deterministic hashing**: MurmurHash3(experiment_key + user_id) → consistent 0-1 float for assignment. Same algorithm in server AND browser SDK for offline evaluation.
- **Privacy-first**: No third-party cookies, respects DNT, first-party data only, GDPR/CCPA compliant by default.
- **Warehouse-native ready**: Schema designed for easy warehouse sync. CUPED support for variance reduction.
- **Statistical rigor**: Both Bayesian and Frequentist engines. SRM detection. Sequential testing with alpha spending. Multiple comparison corrections.

## What Makes This Beat Commercial Platforms
1. Free and open-source (they charge $15K-$500K/year)
2. Contextual bandits (only Statsig has this commercially)
3. Both Bayesian + Frequentist stats (only Convert offers both)
4. CUPED variance reduction (only Statsig/Eppo/GrowthBook-paid)
5. Sequential testing (only Statsig/Eppo/GrowthBook-paid)
6. SRM detection (most platforms silently let you make wrong decisions)
7. Zero vendor lock-in (self-host, own your data)
8. Privacy-first by design (no data egress)

## Database
PostgreSQL with tables: organizations, projects, experiments, variants, metrics, experiment_metrics, assignments, events, pre_experiment_data, feature_flags, audit_log.

## First integration target: boredfolio.com
