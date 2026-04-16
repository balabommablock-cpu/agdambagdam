<!--
Thanks for contributing. Fill in each section; "n/a" is fine for items that don't apply.
Security fixes: do not open a PR before coordinating via SECURITY.md.
-->

## What

<!-- One-to-three sentences: what does this change accomplish? -->

## Why

<!-- What problem does this solve? Link the issue if there is one: Closes #123 -->

## How

<!-- Brief technical description. Trade-offs, alternatives considered. -->

## Test plan

<!--
For bug fixes: a test that fails on main and passes on this branch.
For features: how you verified it works.
For stats changes: reference parity + Monte Carlo, or justify why not required.
-->

- [ ] Unit tests added / updated
- [ ] Ran `npm test` locally and everything passes
- [ ] For stats changes: ran `npx tsx packages/stats/benchmarks/monte-carlo.ts` and all suites pass
- [ ] For SDK changes: verified bundle size still fits the budget (check CI)

## Breaking changes

<!-- If yes: what's the migration path? Have you followed the 3-step deprecation cycle from ARCHITECTURE.md? -->

- [ ] This PR introduces a breaking change
- [ ] Migration path documented above

## Checklist

- [ ] Commits are signed off (`git commit -s`) per the DCO — see CONTRIBUTING.md
- [ ] No new runtime dependencies added to `packages/stats/` (that package stays zero-dep)
- [ ] Public API changes reflected in README / docs
- [ ] Secrets, credentials, or tokens are not committed
