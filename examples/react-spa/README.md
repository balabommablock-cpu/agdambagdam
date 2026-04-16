# react-spa — Agdam Bagdam in a Vite + React 19 SPA

A/B tests a button color using a custom `useVariant` hook. No framework lock-in — drop the hook into any React project.

## Run it

```bash
cd examples/react-spa
npm install
npm run dev
```

Opens at [http://localhost:3010](http://localhost:3010).

## What this demonstrates

- A **custom `useVariant` hook** that wraps `ab.getVariant()` and returns `'control'` while loading or on error. No layout flash, no crashes.
- A **single shared client** in `src/lib/abacus.ts`. One instance per app; internal caching handles the rest.
- **Env-var configuration** via Vite's `import.meta.env`. No hardcoded keys.

## The hook — why it's written this way

```ts
useEffect(() => {
  let cancelled = false;
  ab.getVariant(experimentKey)
    .then((v) => {
      if (!cancelled) setVariant(v);
    })
    .catch(() => {});
  return () => { cancelled = true; };
}, [experimentKey]);
```

- `cancelled` flag prevents a state update after the component unmounts (React 18+ double-invokes effects in dev; without the flag you'd get a warning).
- `.catch(() => {})` is intentional: the SDK already logs a helpful error to the console. We don't want the component to crash.
- The hook accepts `experimentKey` as a dep so you can change experiments without re-mounting — React re-fires the effect.

## Going to production

1. Create the experiment at [boredfolio.com/agdambagdam/app](https://boredfolio.com/agdambagdam/app) with key `button-color-test` and variants `control` + `green`.
2. `cp .env.example .env.local` and paste your real public API key.
3. Deploy.

## Want more experiments?

Just call `useVariant('another-test-key')` in any component. The shared `ab` client caches assignments, so multiple hooks don't multiply API calls.
