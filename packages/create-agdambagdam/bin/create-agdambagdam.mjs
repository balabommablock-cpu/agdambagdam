#!/usr/bin/env node
// Tiny shim so `npx create-agdambagdam` works against compiled output OR source.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'dist', 'index.js');
const src = join(here, '..', 'src', 'index.ts');

if (existsSync(dist)) {
  await import(dist);
} else if (existsSync(src)) {
  // Fall back to source via tsx for local dev. Only hits when running from a checkout.
  const { spawn } = await import('node:child_process');
  const child = spawn('npx', ['tsx', src, ...process.argv.slice(2)], { stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code ?? 0));
} else {
  console.error('create-agdambagdam: no built output and no source found — reinstall the package.');
  process.exit(1);
}
