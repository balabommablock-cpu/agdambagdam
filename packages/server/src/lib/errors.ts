/**
 * Error catalog and response helper.
 *
 * The public contract every API error returns:
 *
 *   {
 *     error:       "<title — human readable, one sentence>",
 *     errorCode:   "<UPPER_SNAKE_CASE stable identifier>",
 *     errorDetail: {
 *       title:    "<same as top-level error>",
 *       howToFix: "<one concrete sentence telling the caller what to do>",
 *       docsUrl:  "<link to the exact section of troubleshooting docs>",
 *       context?: { ... optional extra fields for this specific error }
 *     }
 *   }
 *
 * The top-level `error` field is a plain string so *every* existing client
 * keeps working. `errorCode` and `errorDetail` are additive — clients can
 * opt in to the richer shape when they're ready.
 *
 * Why a catalog, not inline strings:
 *   - The SDK can log kid-friendly messages by looking up `errorCode`.
 *   - `docs/troubleshooting.md` is generated from this catalog.
 *   - Test suites assert on stable codes, not prose that drifts.
 *   - Translations (future) key off the code.
 *
 * Rules for adding a new error:
 *   1. Pick an UPPER_SNAKE_CASE code, prefixed by area if helpful.
 *      Good: EXPERIMENT_NOT_FOUND. Bad: ERR_42 or MISSING.
 *   2. Title is a full sentence ending in a period.
 *   3. howToFix must give ONE concrete action. If there are multiple paths,
 *      pick the most common and mention alternates in parentheses.
 *   4. Always include a docsUrl anchor; even if the docs entry doesn't exist
 *      yet, future-you will fill it in via `docs/troubleshooting.md`.
 */

import type { Response } from 'express';

/** HTTP status + human copy for a single well-known error. */
export interface ErrorSpec {
  httpStatus: number;
  title: string;
  howToFix: string;
}

// ──────────────────────────────────────────────────────────────────────────
//  Catalog
// ──────────────────────────────────────────────────────────────────────────

export const ERRORS = {
  // ── Authentication & project scoping ─────────────────────────────────
  NOT_AUTHENTICATED: {
    httpStatus: 401,
    title: 'Not authenticated.',
    howToFix:
      "Log in at /login and retry, or include a valid session cookie. For programmatic access, send an 'X-API-Key' header with a valid key from your project's API keys page.",
  },
  MISSING_PROJECT_ID: {
    httpStatus: 400,
    title: 'Missing project_id.',
    howToFix:
      "Include 'x-project-id' in the request header with your project's UUID, or add '?project_id=<uuid>' as a query parameter.",
  },
  INVALID_JSON_BODY: {
    httpStatus: 400,
    title: 'Invalid JSON body.',
    howToFix:
      "The request body must be valid JSON. Check for trailing commas, unquoted keys, or a wrong Content-Type. Set 'Content-Type: application/json'.",
  },
  NOT_FOUND: {
    httpStatus: 404,
    title: 'Not found.',
    howToFix:
      "The URL you requested doesn't match any route. Check the method (GET vs POST), the path, and that the server is the version you expect.",
  },

  // ── Experiments ──────────────────────────────────────────────────────
  EXPERIMENT_NOT_FOUND: {
    httpStatus: 404,
    title: 'Experiment not found.',
    howToFix:
      'Check the experiment key for typos, and confirm it exists in this project. Create it in the dashboard or via POST /api/experiments.',
  },
  EXPERIMENT_VARIANT_WEIGHTS_INVALID: {
    httpStatus: 400,
    title: 'Variant weights must sum to 1.0.',
    howToFix:
      'Adjust the weights on your variants so they add up to exactly 1.0 (e.g. 0.5 + 0.5, or 0.33 + 0.33 + 0.34). Floating-point noise up to ±0.001 is tolerated.',
  },
  EXPERIMENT_VARIANTS_LOCKED_AFTER_START: {
    httpStatus: 400,
    title: 'Cannot modify variants after experiment has started.',
    howToFix:
      "To change variant definitions, pause the experiment first, then edit — or clone it into a new experiment. Changing weights mid-run breaks the statistical assumptions.",
  },
  EXPERIMENT_WRONG_STATUS_FOR_START: {
    httpStatus: 400,
    title: 'Cannot start experiment in its current status.',
    howToFix:
      "Only 'draft' or 'paused' experiments can be started. If the experiment is already running, you don't need to start it again. If it's completed, clone it.",
  },
  EXPERIMENT_WRONG_STATUS_FOR_COMPLETE: {
    httpStatus: 400,
    title: 'Cannot complete experiment in its current status.',
    howToFix:
      "Only 'running' or 'paused' experiments can be marked complete. A draft experiment has nothing to complete; an archived one is already terminal.",
  },
  EXPERIMENT_NOT_ENOUGH_VARIANTS: {
    httpStatus: 400,
    title: 'Experiment needs at least 2 variants to start.',
    howToFix:
      'Add a treatment variant via POST /api/experiments/:id/variants, or edit the experiment in the dashboard. One variant is not an experiment.',
  },
  EXPERIMENT_CANNOT_PAUSE_NON_RUNNING: {
    httpStatus: 400,
    title: 'Can only pause running experiments.',
    howToFix:
      "Pause is a no-op on non-running experiments. Check the current status — use 'complete' to finalize, or 'archive' to hide it from lists.",
  },
  EXPERIMENT_CANNOT_ARCHIVE_RUNNING: {
    httpStatus: 400,
    title: 'Cannot archive a running experiment.',
    howToFix:
      "Pause or complete the experiment first, then archive. Archiving a live experiment would silently stop data collection for everyone currently bucketed.",
  },
  FAILED_TO_CREATE_EXPERIMENT: {
    httpStatus: 500,
    title: 'Failed to create experiment.',
    howToFix:
      'The server hit an unexpected error while inserting the experiment. Retry once. If it persists, check the server logs for the underlying exception and file an issue.',
  },

  // ── Metrics ──────────────────────────────────────────────────────────
  METRIC_NOT_FOUND: {
    httpStatus: 404,
    title: 'Metric not found.',
    howToFix:
      'Check the metric key for typos. Metrics are scoped per project — the same key in a different project is a different metric.',
  },
  METRIC_LINKED_TO_EXPERIMENT: {
    httpStatus: 400,
    title: 'Cannot delete metric linked to active experiments.',
    howToFix:
      "Detach this metric from each experiment that references it (via the experiment's metrics panel), or complete/archive those experiments first. Deleting live-experiment metrics would corrupt in-flight results.",
  },

  // ── Feature flags ────────────────────────────────────────────────────
  FEATURE_FLAG_NOT_FOUND: {
    httpStatus: 404,
    title: 'Feature flag not found.',
    howToFix:
      'Check the flag key for typos. Flags are scoped per project — a flag named the same in another project is a different flag.',
  },

  // ── Events ───────────────────────────────────────────────────────────
  EVENT_TIMESTAMP_TOO_FUTURE: {
    httpStatus: 400,
    title: 'Event timestamp is more than 24 hours in the future.',
    howToFix:
      'Event timestamps should be in UTC milliseconds since epoch. Use Date.now() in JS, or time.time()*1000 in Python. A future timestamp is almost always a client-clock bug.',
  },
  EVENT_BATCH_TIMESTAMP_TOO_FUTURE: {
    httpStatus: 400,
    title: 'One or more event timestamps are more than 24 hours in the future.',
    howToFix:
      "At least one event in the batch has a future timestamp. Check the client clock — event timestamps should be UTC milliseconds. Drop or correct the offending event and retry the whole batch.",
  },
} as const satisfies Record<string, ErrorSpec>;

export type ErrorCode = keyof typeof ERRORS;

// ──────────────────────────────────────────────────────────────────────────
//  Docs URL conventions
// ──────────────────────────────────────────────────────────────────────────

/** Where the published troubleshooting page lives, per env. */
const DEFAULT_DOCS_BASE = 'https://boredfolio.com/agdambagdam/docs/troubleshooting';

/** Build the canonical docs anchor for an error code. Stable forever. */
export function docsUrlFor(code: ErrorCode, base: string = DEFAULT_DOCS_BASE): string {
  return `${base}#${code.toLowerCase()}`;
}

// ──────────────────────────────────────────────────────────────────────────
//  sendError helper
// ──────────────────────────────────────────────────────────────────────────

export interface SendErrorOverrides {
  /** Override the default title with a more specific message (e.g. including a field name). */
  title?: string;
  /** Override the default HTTP status. Rare — only use when the *same* semantic error has multiple legal status codes. */
  httpStatus?: number;
  /** Extra structured data the client can use to surface a richer message. */
  context?: Record<string, unknown>;
  /** Override the docs base URL (mostly for tests / self-hosted deployments). */
  docsBaseUrl?: string;
}

/**
 * Send a standardised error response. Always returns void; caller should `return` after.
 *
 * Example:
 *   if (!projectId) {
 *     sendError(res, 'MISSING_PROJECT_ID');
 *     return;
 *   }
 *
 * With context:
 *   sendError(res, 'EXPERIMENT_VARIANT_WEIGHTS_INVALID', {
 *     title: `Variant weights must sum to 1.0, got ${weightSum}.`,
 *     context: { weightSum },
 *   });
 */
export function sendError(
  res: Response,
  code: ErrorCode,
  overrides: SendErrorOverrides = {},
): void {
  const spec = ERRORS[code];
  const status = overrides.httpStatus ?? spec.httpStatus;
  const title = overrides.title ?? spec.title;
  const docsUrl = docsUrlFor(code, overrides.docsBaseUrl);

  res.status(status).json({
    error: title,            // legacy: string for backward-compatible clients
    errorCode: code,         // stable machine-readable identifier
    errorDetail: {
      title,
      howToFix: spec.howToFix,
      docsUrl,
      ...(overrides.context ? { context: overrides.context } : {}),
    },
  });
}
