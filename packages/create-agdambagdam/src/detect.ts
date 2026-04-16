/**
 * Framework detection from the current working directory.
 *
 * Reads `package.json` if present and inspects dependency keys for known
 * framework packages. Returns `'plain'` for everything else (including
 * directories with no `package.json` — the HTML snippet is always safe).
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type Framework =
  | 'nextjs'
  | 'react-vite'
  | 'vue'
  | 'svelte'
  | 'astro'
  | 'node-express'
  | 'plain';

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

export async function detectFramework(cwd: string): Promise<Framework> {
  const pkg = await readPackageJson(cwd);
  if (!pkg) return 'plain';

  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const has = (name: string): boolean => name in deps;

  // Ordered: most specific first so Next.js doesn't resolve to plain 'react'.
  if (has('next')) return 'nextjs';
  if (has('astro')) return 'astro';
  if (has('@sveltejs/kit') || has('svelte')) return 'svelte';
  if (has('vue')) return 'vue';
  if (has('react') && (has('vite') || has('@vitejs/plugin-react'))) return 'react-vite';
  if (has('express') || has('fastify') || has('hono')) return 'node-express';
  return 'plain';
}

async function readPackageJson(cwd: string): Promise<PackageJson | null> {
  try {
    const raw = await readFile(join(cwd, 'package.json'), 'utf8');
    return JSON.parse(raw) as PackageJson;
  } catch {
    return null;
  }
}

export function frameworkLabel(fw: Framework): string {
  return {
    nextjs: 'Next.js',
    'react-vite': 'React + Vite',
    vue: 'Vue',
    svelte: 'Svelte',
    astro: 'Astro',
    'node-express': 'Node.js backend',
    plain: 'plain HTML / vanilla JS',
  }[fw];
}
