/**
 * Per-framework integration snippets. Each template returns a list of files
 * to write (relative paths + content). The orchestrator writes them, refusing
 * to overwrite without consent.
 */

import type { Framework } from './detect.js';

export interface TemplateContext {
  experimentKey: string;
  variantCount: number;
  variantKeys: string[];     // e.g. ['control', 'treatment'] or ['control', 'v1', 'v2']
  defaultApiKey: string;     // 'demo-public-key' by default
  defaultBaseUrl: string;    // 'https://boredfolio.com/agdambagdam/api'
}

export interface TemplateFile {
  path: string;
  content: string;
  /** If true, this file is an installation instruction rather than a code file. */
  isInstructionOnly?: boolean;
}

export function renderTemplate(fw: Framework, ctx: TemplateContext): TemplateFile[] {
  switch (fw) {
    case 'nextjs':
      return nextjsTemplate(ctx);
    case 'react-vite':
      return reactViteTemplate(ctx);
    case 'vue':
      return vueTemplate(ctx);
    case 'svelte':
      return svelteTemplate(ctx);
    case 'astro':
      return astroTemplate(ctx);
    case 'node-express':
      return nodeExpressTemplate(ctx);
    case 'plain':
    default:
      return plainHtmlTemplate(ctx);
  }
}

// ─────────────────────────────────────────────
//  Plain HTML
// ─────────────────────────────────────────────

function plainHtmlTemplate(ctx: TemplateContext): TemplateFile[] {
  return [
    {
      path: 'agdambagdam-example.html',
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Agdam Bagdam — ${ctx.experimentKey}</title>
</head>
<body>
  <button id="signup-btn" style="padding: 12px 24px; color: white; background: #2563eb; border: none; border-radius: 6px; cursor: pointer;">Sign up</button>

  <script src="https://unpkg.com/agdambagdam@latest/dist/abacus.js"></script>
  <script>
    const ab = new Abacus({
      apiKey: '${ctx.defaultApiKey}',
      baseUrl: '${ctx.defaultBaseUrl}',
    });

    // Ask the API which variant to show this visitor
    ab.getVariant('${ctx.experimentKey}').then((variant) => {
      const btn = document.getElementById('signup-btn');
      // Customise per-variant here. Variants defined in this scaffold:
      //   ${ctx.variantKeys.join(', ')}
      if (variant === 'treatment' || variant === 'v1') {
        btn.style.backgroundColor = '#16a34a';
      }
    });

    // Track clicks
    document.getElementById('signup-btn').addEventListener('click', () => {
      ab.track('${ctx.experimentKey}-click');
    });
  </script>
</body>
</html>
`,
    },
  ];
}

// ─────────────────────────────────────────────
//  Next.js App Router
// ─────────────────────────────────────────────

function nextjsTemplate(ctx: TemplateContext): TemplateFile[] {
  return [
    {
      path: 'lib/abacus.ts',
      content: `/**
 * Shared Agdam Bagdam client. Use from Server Components for SSR-assigned
 * variants, or import into Client Components for in-browser tracking.
 */
import { Abacus } from 'agdambagdam';

export function createAbacusClient(userId?: string) {
  return new Abacus({
    apiKey:
      typeof window === 'undefined'
        ? process.env.ABACUS_API_KEY ?? '${ctx.defaultApiKey}'
        : process.env.NEXT_PUBLIC_ABACUS_API_KEY ?? '${ctx.defaultApiKey}',
    baseUrl:
      typeof window === 'undefined'
        ? process.env.ABACUS_BASE_URL ?? '${ctx.defaultBaseUrl}'
        : process.env.NEXT_PUBLIC_ABACUS_BASE_URL ?? '${ctx.defaultBaseUrl}',
    userId,
    // Server Components can't use localStorage-backed sticky buckets.
    stickyBucketing: typeof window !== 'undefined',
    autoTrack: typeof window !== 'undefined',
  });
}
`,
    },
    {
      path: 'app/ExperimentExample.tsx',
      content: `import { createAbacusClient } from '@/lib/abacus';
import { cookies } from 'next/headers';

export async function ExperimentExample() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('agdambagdam_uid')?.value ?? 'anon';

  const ab = createAbacusClient(userId);
  let variant = 'control';
  try {
    await ab.initialize();
    variant = await ab.getVariant('${ctx.experimentKey}');
  } catch {
    // Fall through — API unreachable, user gets control.
  }

  return (
    <div>
      <h1>Experiment: ${ctx.experimentKey}</h1>
      <p>You're seeing variant: <code>{variant}</code></p>
    </div>
  );
}
`,
    },
    {
      path: '.env.example',
      content: `# Server-only (Server Components). Keep secret.
ABACUS_API_KEY=${ctx.defaultApiKey}
ABACUS_BASE_URL=${ctx.defaultBaseUrl}

# Client-exposed (Client Components). Safe to ship to the browser.
NEXT_PUBLIC_ABACUS_API_KEY=${ctx.defaultApiKey}
NEXT_PUBLIC_ABACUS_BASE_URL=${ctx.defaultBaseUrl}
`,
    },
  ];
}

// ─────────────────────────────────────────────
//  React + Vite
// ─────────────────────────────────────────────

function reactViteTemplate(ctx: TemplateContext): TemplateFile[] {
  return [
    {
      path: 'src/lib/abacus.ts',
      content: `import { Abacus } from 'agdambagdam';

export const ab = new Abacus({
  apiKey: import.meta.env.VITE_ABACUS_API_KEY ?? '${ctx.defaultApiKey}',
  baseUrl: import.meta.env.VITE_ABACUS_BASE_URL ?? '${ctx.defaultBaseUrl}',
});
`,
    },
    {
      path: 'src/hooks/useVariant.ts',
      content: `import { useEffect, useState } from 'react';
import { ab } from '../lib/abacus';

/** Returns the assigned variant for an experiment, or 'control' while loading. */
export function useVariant(experimentKey: string): string {
  const [variant, setVariant] = useState<string>('control');

  useEffect(() => {
    let cancelled = false;
    ab.getVariant(experimentKey)
      .then((v) => {
        if (!cancelled) setVariant(v);
      })
      .catch(() => {
        /* keep control */
      });
    return () => {
      cancelled = true;
    };
  }, [experimentKey]);

  return variant;
}
`,
    },
    {
      path: 'src/ExperimentExample.tsx',
      content: `import { ab } from './lib/abacus';
import { useVariant } from './hooks/useVariant';

export function ExperimentExample() {
  const variant = useVariant('${ctx.experimentKey}');
  const isTreatment = variant === 'treatment' || variant === 'v1';

  return (
    <button
      onClick={() => ab.track('${ctx.experimentKey}-click')}
      style={{
        padding: '12px 24px',
        color: 'white',
        background: isTreatment ? '#16a34a' : '#2563eb',
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
      }}
    >
      Sign up ({variant})
    </button>
  );
}
`,
    },
    {
      path: '.env.example',
      content: `VITE_ABACUS_API_KEY=${ctx.defaultApiKey}
VITE_ABACUS_BASE_URL=${ctx.defaultBaseUrl}
`,
    },
  ];
}

// ─────────────────────────────────────────────
//  Vue
// ─────────────────────────────────────────────

function vueTemplate(ctx: TemplateContext): TemplateFile[] {
  return [
    {
      path: 'src/lib/abacus.ts',
      content: `import { Abacus } from 'agdambagdam';

export const ab = new Abacus({
  apiKey: import.meta.env.VITE_ABACUS_API_KEY ?? '${ctx.defaultApiKey}',
  baseUrl: import.meta.env.VITE_ABACUS_BASE_URL ?? '${ctx.defaultBaseUrl}',
});
`,
    },
    {
      path: 'src/composables/useVariant.ts',
      content: `import { ref, onMounted } from 'vue';
import { ab } from '../lib/abacus';

export function useVariant(experimentKey: string) {
  const variant = ref<string>('control');
  onMounted(async () => {
    try {
      variant.value = await ab.getVariant(experimentKey);
    } catch {
      /* keep control */
    }
  });
  return variant;
}
`,
    },
    {
      path: 'src/components/ExperimentExample.vue',
      content: `<script setup lang="ts">
import { useVariant } from '../composables/useVariant';
import { ab } from '../lib/abacus';

const variant = useVariant('${ctx.experimentKey}');
const isTreatment = () => variant.value === 'treatment' || variant.value === 'v1';

function handleClick() {
  ab.track('${ctx.experimentKey}-click');
}
</script>

<template>
  <button
    @click="handleClick"
    :style="{
      padding: '12px 24px',
      color: 'white',
      background: isTreatment() ? '#16a34a' : '#2563eb',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
    }"
  >
    Sign up ({{ variant }})
  </button>
</template>
`,
    },
    {
      path: '.env.example',
      content: `VITE_ABACUS_API_KEY=${ctx.defaultApiKey}
VITE_ABACUS_BASE_URL=${ctx.defaultBaseUrl}
`,
    },
  ];
}

// ─────────────────────────────────────────────
//  Svelte
// ─────────────────────────────────────────────

function svelteTemplate(ctx: TemplateContext): TemplateFile[] {
  return [
    {
      path: 'src/lib/abacus.ts',
      content: `import { Abacus } from 'agdambagdam';

export const ab = new Abacus({
  apiKey: import.meta.env.VITE_ABACUS_API_KEY ?? '${ctx.defaultApiKey}',
  baseUrl: import.meta.env.VITE_ABACUS_BASE_URL ?? '${ctx.defaultBaseUrl}',
});
`,
    },
    {
      path: 'src/lib/ExperimentExample.svelte',
      content: `<script lang="ts">
  import { onMount } from 'svelte';
  import { ab } from './abacus';

  let variant: string = 'control';

  onMount(async () => {
    try {
      variant = await ab.getVariant('${ctx.experimentKey}');
    } catch {
      /* keep control */
    }
  });

  function handleClick() {
    ab.track('${ctx.experimentKey}-click');
  }
</script>

<button
  on:click={handleClick}
  style:padding="12px 24px"
  style:color="white"
  style:background={variant === 'treatment' ? '#16a34a' : '#2563eb'}
  style:border="none"
  style:border-radius="6px"
  style:cursor="pointer"
>
  Sign up ({variant})
</button>
`,
    },
    {
      path: '.env.example',
      content: `VITE_ABACUS_API_KEY=${ctx.defaultApiKey}
VITE_ABACUS_BASE_URL=${ctx.defaultBaseUrl}
`,
    },
  ];
}

// ─────────────────────────────────────────────
//  Astro
// ─────────────────────────────────────────────

function astroTemplate(ctx: TemplateContext): TemplateFile[] {
  return [
    {
      path: 'src/lib/abacus.ts',
      content: `import { Abacus } from 'agdambagdam';

export function getAbacusClient(userId?: string) {
  return new Abacus({
    apiKey: import.meta.env.ABACUS_API_KEY ?? '${ctx.defaultApiKey}',
    baseUrl: import.meta.env.ABACUS_BASE_URL ?? '${ctx.defaultBaseUrl}',
    userId,
  });
}
`,
    },
    {
      path: 'src/components/ExperimentExample.astro',
      content: `---
import { getAbacusClient } from '../lib/abacus';

// Server-side: pick the variant at render time (no flicker).
const userId = Astro.cookies.get('agdambagdam_uid')?.value ?? 'anon';
const ab = getAbacusClient(userId);
let variant = 'control';
try {
  await ab.initialize();
  variant = await ab.getVariant('${ctx.experimentKey}');
} catch {}
---

<div>
  <h1>Experiment: ${ctx.experimentKey}</h1>
  <p>Assigned variant: <code>{variant}</code></p>
</div>
`,
    },
    {
      path: '.env.example',
      content: `ABACUS_API_KEY=${ctx.defaultApiKey}
ABACUS_BASE_URL=${ctx.defaultBaseUrl}
`,
    },
  ];
}

// ─────────────────────────────────────────────
//  Node / Express backend
// ─────────────────────────────────────────────

function nodeExpressTemplate(ctx: TemplateContext): TemplateFile[] {
  return [
    {
      path: 'abacus.js',
      content: `/**
 * Server-side assignment using @agdambagdam/sdk-node.
 * The node SDK is similar to the browser one but never uses localStorage.
 */
const { Abacus } = require('@agdambagdam/sdk-node');

const ab = new Abacus({
  apiKey: process.env.ABACUS_API_KEY || '${ctx.defaultApiKey}',
  baseUrl: process.env.ABACUS_BASE_URL || '${ctx.defaultBaseUrl}',
});

module.exports = { ab };
`,
    },
    {
      path: 'example-usage.js',
      content: `const { ab } = require('./abacus');

// Usage inside an Express handler:
//
//   app.get('/', async (req, res) => {
//     const userId = req.cookies.uid ?? req.ip;
//     const variant = await ab.getVariant('${ctx.experimentKey}', userId);
//     res.render('home', { variant });
//   });
//
// Tracking from the server:
//   ab.track('${ctx.experimentKey}-click', userId);
`,
    },
    {
      path: '.env.example',
      content: `ABACUS_API_KEY=${ctx.defaultApiKey}
ABACUS_BASE_URL=${ctx.defaultBaseUrl}
`,
    },
  ];
}
