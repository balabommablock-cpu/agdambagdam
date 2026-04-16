/**
 * Small terminal UI helpers — colors, prompts, spinners. Zero external deps.
 */

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const supportsColor =
  stdout.isTTY && process.env.TERM !== 'dumb' && !process.env.NO_COLOR;

function ansi(code: string): (s: string) => string {
  return (s: string) => (supportsColor ? `\u001b[${code}m${s}\u001b[0m` : s);
}

export const color = {
  bold: ansi('1'),
  dim: ansi('2'),
  green: ansi('32'),
  yellow: ansi('33'),
  blue: ansi('34'),
  magenta: ansi('35'),
  cyan: ansi('36'),
  red: ansi('31'),
  gray: ansi('90'),
};

export function log(msg: string = ''): void {
  stdout.write(msg + '\n');
}

export function logSuccess(msg: string): void {
  log(`${color.green('✓')} ${msg}`);
}

export function logWarn(msg: string): void {
  log(`${color.yellow('⚠')} ${msg}`);
}

export function logError(msg: string): void {
  log(`${color.red('✗')} ${msg}`);
}

export function heading(title: string): void {
  log('');
  log(color.bold(color.magenta('  Agdam Bagdam')) + color.gray(' — ' + title));
  log('');
}

/**
 * Prompt the user for a line of input. Returns the default if they press enter.
 *
 * Why not an `inquirer`/`prompts` dep: one-person project, a kid cloning this
 * repo expects `npm install` to finish in 2 seconds. A CLI with zero
 * dependencies starts instantly and never rots.
 */
export async function prompt(
  question: string,
  defaultValue?: string,
): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const tail =
      defaultValue !== undefined
        ? color.dim(` (${defaultValue})`)
        : '';
    const answer = await rl.question(`${color.cyan('?')} ${question}${tail} `);
    const trimmed = answer.trim();
    return trimmed.length === 0 ? defaultValue ?? '' : trimmed;
  } finally {
    rl.close();
  }
}

/**
 * Yes/no confirmation. Defaults to the given boolean. Accepts y / n / yes / no / empty.
 */
export async function confirm(
  question: string,
  defaultValue: boolean = true,
): Promise<boolean> {
  const suffix = defaultValue ? 'Y/n' : 'y/N';
  const answer = (await prompt(`${question} ${color.dim('[' + suffix + ']')}`, '')).toLowerCase();
  if (!answer) return defaultValue;
  return answer === 'y' || answer === 'yes';
}
