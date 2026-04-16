# create-agdambagdam

One-command scaffolder for Agdam Bagdam.

```bash
npx create-agdambagdam
```

## What it does

1. Detects your framework from `package.json` — Next.js, React+Vite, Vue, Svelte, Astro, Node/Express, or plain HTML.
2. Asks for an experiment key and variant count (sane defaults if you skip).
3. Writes the right integration files for your stack:
   - `lib/abacus.ts` (or equivalent) — the shared client
   - `ExperimentExample` component / snippet — runnable code that compiles
   - `.env.example` — placeholder API key and base URL
4. Prints the exact 5 commands you run next.

Never overwrites existing files without asking. Zero runtime dependencies — starts in under a second.

## Non-interactive

```bash
# Accept all defaults
npx create-agdambagdam --yes

# Specify everything via flags
npx create-agdambagdam --framework nextjs --experiment checkout-cta --variants 3
```

## Flags

| Flag | Description |
|---|---|
| `--yes`, `-y` | Accept all defaults. Useful for CI or scripting. |
| `--framework <fw>` | `nextjs` · `react-vite` · `vue` · `svelte` · `astro` · `node-express` · `plain` |
| `--experiment <key>` | Experiment key (default: `my-first-test`) |
| `--variants <n>` | Variant count, 2–6 (default: 2) |
| `--help`, `-h` | Show help |

## What gets written

| Framework | Files |
|---|---|
| Next.js | `lib/abacus.ts`, `app/ExperimentExample.tsx`, `.env.example` |
| React + Vite | `src/lib/abacus.ts`, `src/hooks/useVariant.ts`, `src/ExperimentExample.tsx`, `.env.example` |
| Vue | `src/lib/abacus.ts`, `src/composables/useVariant.ts`, `src/components/ExperimentExample.vue`, `.env.example` |
| Svelte | `src/lib/abacus.ts`, `src/lib/ExperimentExample.svelte`, `.env.example` |
| Astro | `src/lib/abacus.ts`, `src/components/ExperimentExample.astro`, `.env.example` |
| Node/Express | `abacus.js`, `example-usage.js`, `.env.example` |
| Plain HTML | `agdambagdam-example.html` |

## Why zero dependencies?

A kid running `npx create-agdambagdam` should see output within a second of hitting Enter. Any dep tree (even a single prompt library pulls in 10+ transitive packages) makes the cold-start slow. Node's built-in `readline/promises` is enough for our prompts, and ANSI color codes are free.

## License

MIT.
