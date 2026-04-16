/**
 * create-agdambagdam — one-command scaffolder.
 *
 * Usage:
 *   npx create-agdambagdam                  # interactive
 *   npx create-agdambagdam --yes            # accept all defaults
 *   npx create-agdambagdam --framework nextjs --experiment my-test --variants 2
 *
 * The script:
 *   1. Detects your framework from package.json
 *   2. Asks for an experiment name + variant count (defaults are sane)
 *   3. Writes a small integration library + example file + .env.example
 *   4. Prints the 5 commands you run next
 *
 * Never overwrites existing files without asking. Never touches package.json
 * without telling you what changed.
 */

import { writeFile, mkdir, access, readFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { cwd, exit, argv } from 'node:process';

import { detectFramework, frameworkLabel, type Framework } from './detect.js';
import { renderTemplate, type TemplateContext } from './templates.js';
import { color, confirm, heading, log, logError, logSuccess, logWarn, prompt } from './ui.js';

const DOCS_BASE = 'https://boredfolio.com/agdambagdam/docs';
const DASHBOARD_URL = 'https://boredfolio.com/agdambagdam/app';
const DEFAULT_API_KEY = 'demo-public-key';
const DEFAULT_BASE_URL = 'https://boredfolio.com/agdambagdam/api';

interface CliFlags {
  yes: boolean;
  framework?: Framework;
  experiment?: string;
  variants?: number;
  help: boolean;
}

function parseFlags(argv: string[]): CliFlags {
  const flags: CliFlags = { yes: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--yes' || a === '-y') flags.yes = true;
    else if (a === '--help' || a === '-h') flags.help = true;
    else if (a === '--framework') flags.framework = argv[++i] as Framework;
    else if (a === '--experiment') flags.experiment = argv[++i];
    else if (a === '--variants') flags.variants = Number(argv[++i]);
  }
  return flags;
}

function printHelp(): void {
  log(`
${color.bold('create-agdambagdam')} — scaffold an Agdam Bagdam A/B test into your project.

${color.bold('USAGE')}
  npx create-agdambagdam [options]

${color.bold('OPTIONS')}
  --yes, -y                 Accept all defaults; skip prompts.
  --framework <fw>          Override detection. One of:
                            nextjs | react-vite | vue | svelte | astro | node-express | plain
  --experiment <key>        Experiment key (default: my-first-test)
  --variants <n>            Variant count 2–6 (default: 2)
  --help, -h                Show this help.

${color.bold('WHAT IT DOES')}
  1. Detects your framework from package.json.
  2. Writes a small integration file (lib/abacus.ts or equivalent).
  3. Writes an example component/usage file.
  4. Writes .env.example with placeholder keys.
  5. Prints the 5 commands you run next.

${color.bold('LINKS')}
  Docs:      ${DOCS_BASE}/quickstart
  Dashboard: ${DASHBOARD_URL}
`);
}

function generateVariantKeys(n: number): string[] {
  if (n < 2) n = 2;
  if (n > 6) n = 6;
  const keys = ['control'];
  if (n === 2) keys.push('treatment');
  else for (let i = 1; i < n; i++) keys.push(`v${i}`);
  return keys;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function writeFileIfSafe(
  path: string,
  content: string,
  force: boolean,
): Promise<'written' | 'skipped'> {
  const exists = await pathExists(path);
  if (exists && !force) {
    const overwrite = await confirm(
      `${relative(cwd(), path)} already exists. Overwrite?`,
      false,
    );
    if (!overwrite) return 'skipped';
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
  return 'written';
}

async function printPackageJsonHint(fw: Framework): Promise<void> {
  const pkgPath = join(cwd(), 'package.json');
  if (!(await pathExists(pkgPath))) {
    logWarn("No package.json here. When you have one, install the SDK with:");
    log(`    ${color.cyan('npm install agdambagdam')}`);
    return;
  }
  const raw = await readFile(pkgPath, 'utf8');
  const pkg = JSON.parse(raw);
  const has = (name: string): boolean =>
    !!(pkg.dependencies?.[name] || pkg.devDependencies?.[name]);

  const needed = fw === 'node-express' ? '@agdambagdam/sdk-node' : 'agdambagdam';
  if (has(needed)) {
    logSuccess(`${needed} already in dependencies.`);
  } else {
    logWarn(`Install the SDK to finish the setup:`);
    log(`    ${color.cyan('npm install ' + needed)}`);
  }
}

async function main(): Promise<void> {
  const flags = parseFlags(argv.slice(2));
  if (flags.help) {
    printHelp();
    return;
  }

  heading('one-command scaffolder for kid-friendly A/B tests');

  // 1. Detect or override framework
  const detected = await detectFramework(cwd());
  let framework: Framework = flags.framework ?? detected;

  if (flags.yes) {
    log(`${color.dim('→')} Using framework: ${color.bold(frameworkLabel(framework))} (${framework === detected ? 'detected' : 'flag'})`);
  } else if (!flags.framework) {
    const answer = await prompt(
      `I detected ${color.bold(frameworkLabel(detected))}. Use this template?`,
      'yes',
    );
    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y' && answer !== '') {
      log('Choose one: nextjs / react-vite / vue / svelte / astro / node-express / plain');
      const chosen = await prompt('Framework:', 'plain');
      framework = chosen as Framework;
    }
  }

  // 2. Experiment name
  let experimentKey = flags.experiment;
  if (!experimentKey) {
    experimentKey = flags.yes
      ? 'my-first-test'
      : await prompt("What's your experiment called?", 'my-first-test');
  }
  // Sanitise: allow letters, digits, dashes, underscores
  experimentKey = experimentKey.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!experimentKey) experimentKey = 'my-first-test';

  // 3. Variant count
  let variantCount = flags.variants;
  if (variantCount === undefined) {
    const raw = flags.yes
      ? '2'
      : await prompt('How many variants?', '2');
    variantCount = Number(raw) || 2;
  }
  if (variantCount < 2) variantCount = 2;
  if (variantCount > 6) variantCount = 6;

  const ctx: TemplateContext = {
    experimentKey,
    variantCount,
    variantKeys: generateVariantKeys(variantCount),
    defaultApiKey: DEFAULT_API_KEY,
    defaultBaseUrl: DEFAULT_BASE_URL,
  };

  // 4. Render template files
  const files = renderTemplate(framework, ctx);
  log('');
  log(color.dim('Writing files…'));

  let written = 0;
  let skipped = 0;
  for (const file of files) {
    const fullPath = join(cwd(), file.path);
    const result = await writeFileIfSafe(fullPath, file.content, flags.yes);
    if (result === 'written') {
      logSuccess(color.dim('wrote ') + file.path);
      written++;
    } else {
      logWarn(color.dim('skipped ') + file.path);
      skipped++;
    }
  }

  log('');

  // 5. SDK dependency check
  await printPackageJsonHint(framework);

  // 6. Next steps
  log('');
  log(color.bold('Next steps:'));
  const steps = nextSteps(framework, experimentKey, ctx.variantKeys);
  steps.forEach((s, i) => log(`  ${color.cyan(String(i + 1) + '.')} ${s}`));

  log('');
  log(color.dim('Docs:      ') + DOCS_BASE + '/quickstart');
  log(color.dim('Dashboard: ') + DASHBOARD_URL);
  log('');

  if (written === 0 && skipped > 0) {
    logWarn('No files written. Run again with --yes to overwrite, or delete the existing files.');
    exit(1);
  }
}

function nextSteps(fw: Framework, experimentKey: string, variantKeys: string[]): string[] {
  const variantsDisplay = variantKeys.map((v) => `'${v}'`).join(', ');
  const common = [
    `Sign up at ${color.cyan(DASHBOARD_URL)} and create an experiment named ${color.cyan(experimentKey)} with variants [${variantsDisplay}].`,
    `Copy your public API key from the dashboard into ${color.cyan('.env.local')} (see ${color.cyan('.env.example')}).`,
  ];

  const runCommand: Record<Framework, string> = {
    nextjs: 'npm run dev',
    'react-vite': 'npm run dev',
    vue: 'npm run dev',
    svelte: 'npm run dev',
    astro: 'npm run dev',
    'node-express': 'node your-server.js',
    plain: 'open agdambagdam-example.html in a browser',
  };

  const integrationHint: Record<Framework, string> = {
    nextjs: 'Import <ExperimentExample /> from app/ExperimentExample.tsx into any page.',
    'react-vite': 'Import <ExperimentExample /> from src/ExperimentExample.tsx into App.tsx.',
    vue: 'Import ExperimentExample.vue from src/components/ into your main template.',
    svelte: 'Import ExperimentExample.svelte from src/lib/ into any route.',
    astro: 'Use <ExperimentExample /> from src/components/ in any .astro page.',
    'node-express': 'Follow the snippet in example-usage.js to assign variants in your handlers.',
    plain: 'Open agdambagdam-example.html directly.',
  };

  return [
    ...common,
    integrationHint[fw],
    `Run: ${color.cyan(runCommand[fw])}`,
    'Watch the dashboard — results show up as soon as real visitors start hitting the page.',
  ];
}

main().catch((err) => {
  logError('Setup failed: ' + (err?.message ?? String(err)));
  if (process.env.DEBUG) console.error(err);
  exit(1);
});
