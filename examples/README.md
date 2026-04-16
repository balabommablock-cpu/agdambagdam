# Examples

Every example here is a **runnable**, **self-contained** folder. Clone the repo, `cd` into any of them, and the README tells you the single command to see it live.

## Pick your stack

| Folder | Stack | Complexity | What it tests |
|---|---|---|---|
| [`html-plain/`](html-plain/) | Just HTML + a `<script>` tag | ⭐ | Button color A/B |
| [`nextjs-app-router/`](nextjs-app-router/) | Next.js 15 App Router, RSC | ⭐⭐ | Hero headline A/B with server-rendered variant |
| [`react-spa/`](react-spa/) | Vite + React 19 SPA | ⭐⭐ | Button color A/B with a `useVariant` hook |
| [`vue/`](vue/) | Vue 3 + Vite | ⭐⭐ | Button color A/B with a `useVariant` composable |
| [`node-backend/`](node-backend/) | Express + Node SDK | ⭐⭐ | Server-rendered headline A/B with sticky UUID cookies |
| [`wordpress-snippet/`](wordpress-snippet/) | WP snippet (PHP + JS) | ⭐ | CTA button A/B — drop-in with Code Snippets plugin |
| [`shopify-liquid/`](shopify-liquid/) | Liquid theme snippet | ⭐⭐ | `data-ab-variant` attribute + add-to-cart conversion tracking |
| [`svelte/`](svelte/) _planned_ | SvelteKit | ⭐⭐ | Onboarding flow A/B |
| [`astro/`](astro/) _planned_ | Astro with SSR | ⭐⭐ | Islands-based variant rendering |

Examples marked _planned_ are not written yet. PRs that add them with the same structure (runnable, minimal, README-documented) are welcome — see [CONTRIBUTING.md](../.github/CONTRIBUTING.md).

## The universal rules

Every example in this directory follows these rules:

1. **Runnable with one command.** No manual `npm install @some-helper` steps.
2. **Zero non-obvious config.** If something is set, there's a comment explaining why.
3. **The variant change is visible.** You can *see* the A/B working, not just read logs.
4. **The demo API is used by default.** Replace `apiKey: 'demo-public-key'` and `baseUrl` with your own only when you go live.
5. **Works without the API too.** If the API is unreachable, the example falls through to the control variant. Nothing crashes.

## Point-and-ship

If you just want to see this work on *your* site without writing code, paste the snippet from [`QUICKSTART.md`](../QUICKSTART.md) into any HTML file and open it in a browser. Done.
