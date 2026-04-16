# Security Policy

We take the security of Agdam Bagdam seriously. This document describes how to report vulnerabilities, what's in scope, and what response you should expect.

## Supported Versions

Security fixes are applied to the latest minor release of the `main` branch. Because the project is pre-1.0, older minor versions are not backported.

| Version | Supported |
|---------|-----------|
| `0.x` latest | ✅ |
| `0.x` older | ❌ |

Once we reach 1.0, we will support the latest two minor releases.

## Reporting a Vulnerability

**Do not file a public GitHub issue for security problems.**

Report privately via one of the following, in order of preference:

1. **GitHub private vulnerability reporting** — [Report a vulnerability](https://github.com/balabommablock-cpu/agdambagdam/security/advisories/new)
2. **Email** — `security@boredfolio.com` with `[SECURITY]` in the subject line. For sensitive reports, request our PGP key in the first message.

Include, at minimum:
- A description of the vulnerability
- Affected component (e.g. `packages/server`, `packages/sdk-js`, statistical engine, dashboard)
- Affected version or commit SHA
- Steps to reproduce (a minimal proof-of-concept is ideal)
- Impact assessment
- Suggested fix, if you have one

We will acknowledge receipt within **48 hours** and provide an initial triage assessment within **5 business days**.

## Response SLA

| Severity | Initial response | Fix target |
|----------|------------------|------------|
| Critical (CVSS ≥ 9.0) | 24 hours | 7 days |
| High (CVSS 7.0–8.9) | 48 hours | 30 days |
| Medium (CVSS 4.0–6.9) | 5 business days | 90 days |
| Low (CVSS < 4.0) | 5 business days | Next minor release |

Severity is assessed using [CVSS v3.1](https://www.first.org/cvss/v3-1/specification-document).

## Disclosure Policy

We follow **coordinated disclosure**:

1. Reporter submits the issue privately.
2. We acknowledge, triage, and develop a fix.
3. We coordinate a release date with the reporter.
4. We publish a GitHub Security Advisory with a CVE (where applicable) and credit the reporter (unless they request otherwise).
5. Public disclosure happens **within 90 days** of the initial report, or sooner if a fix is ready and deployed.

If a vulnerability is being actively exploited, we reserve the right to disclose earlier to protect users.

## Scope

**In scope:**
- `packages/server` — API server, authentication, authorization, rate limiting, SQL injection, SSRF, IDOR, secrets handling
- `packages/stats` — statistical correctness bugs that could lead to wrong experimental decisions (treated as security-relevant)
- `packages/sdk-js` — client-side injection, XSS via experiment configuration, prototype pollution, bundle tampering
- `packages/sdk-node` — similar to sdk-js plus server-side injection
- `packages/dashboard` — XSS, CSRF, authorization bypass, session handling
- Docker Compose reference deployment — default credentials, exposed surfaces, insecure defaults
- Hosted demo at `boredfolio.com/agdambagdam`

**Out of scope:**
- Social engineering of maintainers
- Physical attacks
- Denial-of-service via resource exhaustion without an authenticated amplification primitive (we document rate limits explicitly)
- Vulnerabilities in dependencies that are already covered by an upstream advisory and do not affect us in a novel way
- Missing security headers on non-authenticated marketing pages
- Issues that require a compromised build environment, compromised npm account, or physical access to the server
- Vulnerabilities on third-party forks or vendored copies we do not maintain

## Non-qualifying reports

The following are not considered vulnerabilities:
- Absence of rate limiting on a specific endpoint when the endpoint is not authenticated and does not trigger a privileged operation (we welcome feedback on this, but not as a security issue)
- Missing CSRF tokens on APIs that use bearer-token auth and explicitly do not set cookies
- Self-XSS
- Clickjacking on pages without sensitive actions
- Vulnerabilities requiring a victim to install a malicious extension

## Safe Harbor

We will not pursue legal action against researchers who:
- Make a good-faith effort to comply with this policy
- Avoid privacy violations, destruction of data, and service degradation
- Do not exploit a vulnerability beyond what is necessary to confirm it
- Do not disclose the issue publicly before we have had reasonable opportunity to fix it
- Give us reasonable time to respond before any disclosure

Security research conducted under this policy is considered authorized.

## Bug Bounty

A bug bounty program is planned. When active, details will be published here and at `boredfolio.com/agdambagdam/security`.

## Security Hall of Fame

Researchers who report qualifying issues are credited in [`HALL_OF_FAME.md`](./HALL_OF_FAME.md) unless they request anonymity.

## Cryptographic Assumptions

- Passwords are hashed with `bcrypt` (cost ≥ 12).
- API keys are generated using `crypto.randomBytes(32)` and stored hashed.
- The `MurmurHash3` used for assignment hashing is **not** cryptographic — it is used for deterministic bucketing only, not for authentication or confidentiality.

## Operational Security for Self-Hosted Deployments

If you self-host Agdam Bagdam, you are responsible for:
- Rotating default credentials in `docker-compose.yml` before production use
- Setting `NODE_ENV=production` and a strong `SESSION_SECRET`
- Placing the server behind TLS termination (nginx, Caddy, Cloudflare, or a managed load balancer)
- Enabling PostgreSQL encryption-at-rest (AWS RDS, GCP Cloud SQL, Neon, etc. all offer this by default)
- Applying OS patches and keeping Node.js and Docker up to date

We publish recommended reference configurations under `docker/` and will add Kubernetes/Terraform manifests in a future release.
