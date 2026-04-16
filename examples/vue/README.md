# vue — Agdam Bagdam in a Vue 3 app

Uses the Composition API with a custom `useVariant` composable.

## Run it

```bash
cd examples/vue
npm install
npm run dev
```

Opens at [http://localhost:3011](http://localhost:3011).

## What this demonstrates

- A **`useVariant` composable** that mirrors the React hook pattern — returns a reactive `ref<string>` so you can bind directly in templates.
- `<script setup>` syntax for terse, kid-friendly component code.
- Inline `:style` bindings that react to the variant value.

## Composable recap

```ts
import { useVariant } from './composables/useVariant';

const variant = useVariant('button-color-test');
// `variant.value` is 'control' until the assignment comes back.
```

## Going to production

1. Create the experiment at [boredfolio.com/agdambagdam/app](https://boredfolio.com/agdambagdam/app).
2. `cp .env.example .env.local` and paste your real API key.
3. `npm run build && npm run preview` to test the production bundle.
