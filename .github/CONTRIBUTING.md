# Contributing to Agdam Bagdam

Thanks for considering a contribution. This project is **MIT-licensed, developer-first, and statistically rigorous**. Contributions that reinforce those three things are welcome.

## Ground rules

1. **The stats engine is the crown jewel.** Any change inside `packages/stats/` requires a corresponding test case and, for new methods, a reference-implementation comparison in `BENCHMARKS.md`.
2. **Numerical correctness is security-equivalent.** A bug that makes users ship a wrong experimental decision is a P0, handled via [`SECURITY.md`](../SECURITY.md).
3. **No feature bloat.** Before implementing something new, open an issue. If it's not on the roadmap and doesn't reduce a gap in [`FEATURES.md`](../FEATURES.md), we'll probably say no.
4. **Boring dependencies.** The stats engine has zero runtime dependencies by design. Keep it that way.

## Developer Certificate of Origin (DCO)

Every commit must be signed off with the [Developer Certificate of Origin](https://developercertificate.org/). This is a per-commit certification that you wrote the code, or have the right to submit it under the MIT license.

```bash
git commit -s -m "your message"
```

The `-s` flag adds `Signed-off-by: Your Name <you@example.com>` to the commit message. CI will reject PRs with unsigned commits.

## Development setup

```bash
# Prerequisites: Node.js 20+ and Docker
git clone https://github.com/balabommablock-cpu/agdambagdam.git
cd agdambagdam
npm install
docker-compose up -d postgres
npm run db:migrate
npm run dev       # server on :3456, dashboard on :3457
npm test          # all workspaces
```

## Project structure

```
packages/
  stats/       — zero-dep statistical engine
  server/      — Express + PostgreSQL API
  sdk-js/      — browser SDK (size-budgeted)
  sdk-node/    — Node.js SDK
  dashboard/   — React + Vite + Tailwind UI
```

## Submitting a change

1. **Open an issue first** for anything larger than a typo. Describe the problem, not the solution.
2. **Branch from `main`**, name it `type/short-description` (e.g. `fix/sequential-alpha-spending`, `feat/ratio-metrics`).
3. **Write the test first** for bug fixes. Red → green.
4. **Keep the diff small.** One conceptual change per PR.
5. **Open a PR** using the template. Link the issue. Describe trade-offs, not just what changed.
6. **CI must pass** — tests on Node 20/22/24, typecheck, lint, `npm audit`, semgrep, bundle-size budget, license compliance, secrets scan.
7. **Reviewer assigns.** Initial response within 24 hours on weekdays.

## Code style

- **TypeScript strict mode** throughout.
- **No `any`** without an adjacent `// justified:` comment explaining why.
- **Inline references for non-trivial math**: `// Ref: Deng et al. 2013, §3.2`.
- **Function > class** unless there's a real reason for state.
- **Tests colocated** as `*.test.ts` in the same directory.

## Commit messages

Conventional-ish. First line ≤ 72 chars. Imperative mood.

```
fix(stats): correct alpha spending at final look

Lan-DeMets was under-spending at the boundary when `currentLook == maxLooks`
due to floating-point equality check. Switched to `>= 1 - 1e-9`.

Closes #42
```

Accepted prefixes: `fix`, `feat`, `perf`, `refactor`, `docs`, `test`, `chore`, `build`, `ci`.

## What we will not merge

- Code without tests where tests are practical.
- Features that duplicate functionality available in a supported plugin pattern.
- Changes to statistical methods without a `BENCHMARKS.md` entry and reference-parity check.
- Dependencies added to `packages/stats/` (it stays zero-dep forever).
- Code that assumes the browser SDK will always run in a specific framework.
- Changes that break the public API without a deprecation cycle.

## Reporting bugs

Use the bug report issue template. Minimum viable reproduction: the inputs, the expected output, and the actual output. If it's a statistical correctness issue, include the reference value and where you got it.

## Reporting security issues

**Do not file a public issue.** See [`SECURITY.md`](../SECURITY.md).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](../LICENSE).
