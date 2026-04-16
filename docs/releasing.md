# Releasing

How to cut a new version of Agdam Bagdam to npm.

## TL;DR

```bash
# 1. Bump versions in the three publishable packages (must match)
npm version 0.2.0 -w packages/sdk-js
npm version 0.2.0 -w packages/sdk-node
npm version 0.2.0 -w packages/create-agdambagdam

# 2. Commit the version bump
git add packages/*/package.json
git commit -m "chore: release v0.2.0"

# 3. Tag and push — this triggers the publish workflow
git tag v0.2.0
git push origin main --tags
```

That's it. GitHub Actions runs [`.github/workflows/publish.yml`](../.github/workflows/publish.yml), validates everything, publishes all three packages, and cuts a GitHub Release with auto-generated notes.

## One-time setup

Before the first publish, these have to exist:

1. **npm organization `@agdambagdam`** — create at [npmjs.com/org/create](https://www.npmjs.com/org/create). Free tier works for public packages.
2. **npm automation token** — on your npm account → Access Tokens → Generate → **Automation**. Copy the token.
3. **Repository secret `NPM_TOKEN`** — in GitHub repo Settings → Secrets and variables → Actions → **New repository secret**. Name: `NPM_TOKEN`. Value: the token from step 2.
4. **Reserved package names**: before anyone else can squat them, manually `npm publish` a `0.0.0` placeholder of each name:
   - `agdambagdam` (unscoped — the browser SDK)
   - `create-agdambagdam` (unscoped — the scaffolder)
   - `@agdambagdam/sdk-node` (scoped — the Node SDK)

After that the workflow handles everything else.

## Version policy

All three packages share the same version number. This is intentional — the SDK wire format is tightly coupled to the server contract, and separate versioning would force users to reason about a compatibility matrix. Same tag, same version, every release.

The publish workflow **fails on version mismatch** when triggered by a tag — if `v0.2.0` is pushed but one of the `package.json` files still says `0.1.0`, the validate job exits with an error before any publish happens.

## What the workflow does, step by step

1. **Validate** (always runs):
   - `npm ci` (clean install from lockfile)
   - `npm run build` (all workspaces)
   - `npm test` (57 stats + 30 server tests)
   - `npx tsx packages/stats/benchmarks/monte-carlo.ts --seed 42` (6-suite Monte Carlo, must all pass)
   - `npm audit --omit=dev --audit-level=high` (production deps only)
   - Version match check (tag vs package.json)
2. **Publish** 3 parallel jobs:
   - `packages/sdk-js` → `agdambagdam`
   - `packages/sdk-node` → `@agdambagdam/sdk-node`
   - `packages/create-agdambagdam` → `create-agdambagdam`
   - All published with `--access public --provenance` (signed attestations so consumers can verify the artifact came from this SHA)
   - Idempotent: if the version is already published, the job exits 0 with a notice instead of failing
3. **Release** (tag-only):
   - Creates a GitHub Release with auto-generated notes
   - Marks as prerelease if the tag contains `-` (e.g. `v0.2.0-rc.1`)

## Dry-run / manual dispatch

To test the workflow without publishing:

1. GitHub → Actions → **Publish to npm** → **Run workflow**
2. Leave **dry_run** as `true`
3. Optionally set **packages** to a subset (e.g. just `agdambagdam`)
4. The workflow runs everything including `npm publish --dry-run`, so you see exactly what would have been published without touching the registry

## Provenance verification

Consumers can verify a given version was published by this workflow:

```bash
npm audit signatures agdambagdam
```

Output includes the GitHub repository, commit SHA, and workflow that published the artifact. This matters because it's how a security-conscious user detects an attacker who compromised the npm account: any publish not from this repo's workflow will fail provenance verification.

## Rolling back

npm doesn't let you un-publish a version > 72 hours old, and deprecating is usually better than re-publishing anyway:

```bash
npm deprecate agdambagdam@0.2.0 "Bug in sequential test boundary calculation — use 0.2.1 instead"
```

That surfaces a warning at install time without breaking pinned users.

## Emergency release

If a P0 security fix needs to ship right now:

1. Make the fix, test it locally.
2. Bump to the next patch version (e.g. `0.2.0` → `0.2.1`).
3. Tag with `-security` suffix if you want consumers to notice immediately: `v0.2.1-security.1`.
4. Push the tag. Workflow handles the rest.
5. Draft a [security advisory](https://github.com/balabommablock-cpu/agdambagdam/security/advisories/new) referencing the CVE and the fixed version.

The workflow's validate step still runs on security releases — do not bypass it. If a test is actually broken, fix the test in the same commit.
