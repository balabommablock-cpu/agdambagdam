# Troubleshooting

Every error Agdam Bagdam returns includes a stable `errorCode` and a direct link to its entry here. This page is the single source of truth — if a fix is missing, file an issue.

## How to use this page

When the SDK logs something like:

```
[agdambagdam] ❌ Missing project_id.  (MISSING_PROJECT_ID · assign/bulk)
  → Fix: Include 'x-project-id' in the request header...
  → Docs: https://boredfolio.com/agdambagdam/docs/troubleshooting#missing_project_id
```

click the docs link or ⌘-F this page for `MISSING_PROJECT_ID`. Every code below is linkable.

## Error index

- [MISSING_PROJECT_ID](#missing_project_id)
- [NOT_AUTHENTICATED](#not_authenticated)
- [INVALID_JSON_BODY](#invalid_json_body)
- [NOT_FOUND](#not_found)
- [EXPERIMENT_NOT_FOUND](#experiment_not_found)
- [EXPERIMENT_VARIANT_WEIGHTS_INVALID](#experiment_variant_weights_invalid)
- [EXPERIMENT_VARIANTS_LOCKED_AFTER_START](#experiment_variants_locked_after_start)
- [EXPERIMENT_WRONG_STATUS_FOR_START](#experiment_wrong_status_for_start)
- [EXPERIMENT_WRONG_STATUS_FOR_COMPLETE](#experiment_wrong_status_for_complete)
- [EXPERIMENT_NOT_ENOUGH_VARIANTS](#experiment_not_enough_variants)
- [EXPERIMENT_CANNOT_PAUSE_NON_RUNNING](#experiment_cannot_pause_non_running)
- [EXPERIMENT_CANNOT_ARCHIVE_RUNNING](#experiment_cannot_archive_running)
- [FAILED_TO_CREATE_EXPERIMENT](#failed_to_create_experiment)
- [METRIC_NOT_FOUND](#metric_not_found)
- [METRIC_LINKED_TO_EXPERIMENT](#metric_linked_to_experiment)
- [FEATURE_FLAG_NOT_FOUND](#feature_flag_not_found)
- [EVENT_TIMESTAMP_TOO_FUTURE](#event_timestamp_too_future)
- [EVENT_BATCH_TIMESTAMP_TOO_FUTURE](#event_batch_timestamp_too_future)

Plus the meta-symptoms that don't have a single error code:

- [My experiment shows no data](#my-experiment-shows-no-data)
- [Every visitor sees `control`](#every-visitor-sees-control)
- [The variant changes on every reload](#the-variant-changes-on-every-reload)
- [I get CORS errors in the browser](#i-get-cors-errors-in-the-browser)
- [The SDK works locally but not in production](#the-sdk-works-locally-but-not-in-production)
- [An ad-blocker is blocking the SDK](#an-ad-blocker-is-blocking-the-sdk)

---

## Error-code reference

### `MISSING_PROJECT_ID`

**HTTP:** 400

**What it means:** The API call didn't tell us which project you're working in. Projects scope experiments, metrics, and flags — a call without one is ambiguous.

**Fix:**
- From a browser SDK, the `baseUrl` you passed to `new Abacus({ baseUrl })` should already include your project context. Double-check it matches the one shown on the project settings page.
- From a direct API call, set the `x-project-id` header with your project's UUID, **or** add `?project_id=<uuid>` as a query parameter.
- If you just rotated an API key and the error started immediately after — the new key may belong to a different project. Confirm in the dashboard.

---

### `NOT_AUTHENTICATED`

**HTTP:** 401

**What it means:** No valid session cookie or API key on this request.

**Fix:**
- For the dashboard: log in at `/login` and retry.
- For programmatic access: send an `X-API-Key` header with a valid key from Settings → API Keys.
- If you're copying a `curl` command: quoting sometimes swallows the header. Use `-H 'X-API-Key: <key>'` with single quotes, no backticks.

---

### `INVALID_JSON_BODY`

**HTTP:** 400

**What it means:** The request body couldn't be parsed as JSON.

**Fix:**
- Set `Content-Type: application/json` on the request.
- Valid JSON has no trailing commas and uses double-quoted keys.
- If you're doing template-literal string building, check for unescaped quotes or newlines in field values.

---

### `NOT_FOUND`

**HTTP:** 404

**What it means:** The URL you hit doesn't match any registered route.

**Fix:**
- Check the HTTP method (GET vs POST).
- Check the path — e.g. `/api/assign/bulk` not `/api/assignments/bulk`.
- If you self-host and recently updated the server, the deployed image may be older than you expect. Check the `/api/health` endpoint and confirm the version.

---

### `EXPERIMENT_NOT_FOUND`

**HTTP:** 404

**What it means:** There's no experiment with that key in this project.

**Fix:**
- Check the key for typos (it's case-sensitive). `Button-Color-Test` ≠ `button-color-test`.
- Confirm the experiment exists in your project's Experiments page.
- If you recently archived the experiment, archived experiments no longer resolve to variants — restore it first.
- From the SDK: your `getVariant('key')` call gracefully returns `'control'` on 404, so this error is only surfaced for server-to-server or dashboard API calls.

---

### `EXPERIMENT_VARIANT_WEIGHTS_INVALID`

**HTTP:** 400

**What it means:** The sum of variant weights isn't 1.0. `errorDetail.context.weightSum` tells you what it is.

**Fix:**
- Adjust weights to add up to exactly 1.0 (e.g. `[0.5, 0.5]` or `[0.33, 0.33, 0.34]`).
- Floating-point noise up to ±0.001 is tolerated. If your `weightSum` is 0.9999 or 1.0001, the validation is strict for a reason — check your arithmetic.
- If you're generating weights programmatically, round to 2 decimal places and adjust the last variant to absorb the remainder.

---

### `EXPERIMENT_VARIANTS_LOCKED_AFTER_START`

**HTTP:** 400

**What it means:** You tried to modify variant definitions on an experiment that's already running. Changing variants mid-flight would invalidate the results for everyone already bucketed.

**Fix:**
- Pause the experiment, edit, then resume — but note that changing variant keys or weights mid-run still resets statistical significance.
- For anything bigger than fixing a typo in a display name: **clone** the experiment into a new one, make your changes there, start the new one, and archive the old.

---

### `EXPERIMENT_WRONG_STATUS_FOR_START`

**HTTP:** 400

**What it means:** Only `draft` or `paused` experiments can be started. `errorDetail.context.currentStatus` tells you what state it's actually in.

**Fix:**
- If `currentStatus = 'running'` — it's already started. You don't need to start it again.
- If `currentStatus = 'completed'` or `'archived'` — these are terminal. Clone the experiment to run it again.

---

### `EXPERIMENT_WRONG_STATUS_FOR_COMPLETE`

**HTTP:** 400

**What it means:** Only `running` or `paused` experiments can be marked complete.

**Fix:**
- `draft` experiments have nothing to complete — delete or start them.
- `completed` and `archived` are already terminal — no-op.

---

### `EXPERIMENT_NOT_ENOUGH_VARIANTS`

**HTTP:** 400

**What it means:** The experiment has fewer than 2 variants. One variant is not an experiment.

**Fix:**
- Add at least one treatment variant in addition to the control.
- In the dashboard: Experiment → Variants → Add Variant.

---

### `EXPERIMENT_CANNOT_PAUSE_NON_RUNNING`

**HTTP:** 400

**What it means:** You can only pause a `running` experiment.

**Fix:**
- If it's `draft` — nothing to pause. Just don't start it.
- If it's `completed` or `archived` — it's already not running.

---

### `EXPERIMENT_CANNOT_ARCHIVE_RUNNING`

**HTTP:** 400

**What it means:** Archiving a running experiment would silently stop data collection for everyone currently bucketed. We require an explicit pause or complete first.

**Fix:**
- Pause the experiment (POST `/api/experiments/:id/pause`), then archive.
- Or complete it first (POST `/api/experiments/:id/complete`) if you're satisfied with the results.

---

### `FAILED_TO_CREATE_EXPERIMENT`

**HTTP:** 500

**What it means:** The server hit an unexpected exception while creating the experiment.

**Fix:**
- Retry once — transient DB connectivity is the most common cause.
- If it persists, check the server logs for the underlying exception. In self-host, `docker logs abacus-server`.
- File an issue with the redacted request body and the server log excerpt.

---

### `METRIC_NOT_FOUND`

**HTTP:** 404

**What it means:** No metric with that key in this project.

**Fix:**
- Check the key for typos (case-sensitive).
- Metrics are scoped per project — the same key in a different project is a different metric.
- Create the metric: POST `/api/metrics` with `{ key, name, type }`.

---

### `METRIC_LINKED_TO_EXPERIMENT`

**HTTP:** 400

**What it means:** The metric is attached to one or more experiments that aren't yet archived. Deleting it would corrupt their in-flight or historical results.

**Fix:**
- Detach the metric from each experiment that references it — in the dashboard, Experiment → Metrics → Remove.
- Or complete/archive those experiments first.
- Once nothing references it, deletion will succeed.

---

### `FEATURE_FLAG_NOT_FOUND`

**HTTP:** 404

**What it means:** No feature flag with that key in this project.

**Fix:**
- Check the key for typos.
- Flags are scoped per project — different from experiments, they don't share the namespace with experiments.
- Create the flag in the dashboard: Flags → New Flag.

---

### `EVENT_TIMESTAMP_TOO_FUTURE`

**HTTP:** 400

**What it means:** The `timestamp` on the event is more than 24 hours in the future. Almost always a client-clock bug.

**Fix:**
- Use UTC milliseconds since epoch. In JS: `Date.now()`. In Python: `int(time.time() * 1000)`.
- If you're getting timestamps from a third-party source, check its timezone — ISO-8601 strings without `Z` can be interpreted as local time.
- If you just don't care about exact timestamps, omit the field entirely. The server uses `now()` by default.

---

### `EVENT_BATCH_TIMESTAMP_TOO_FUTURE`

**HTTP:** 400

**What it means:** At least one event in the batch has a future timestamp. The whole batch is rejected (we don't partially-accept — it would fragment your analytics).

**Fix:**
- `errorDetail.context.offendingTimestamp` tells you the bad value.
- Correct or drop that event, then retry the whole batch.
- If a large fraction of your events have future timestamps, your server clock is drifting — run `ntpd` / `chronyd`.

---

## Meta-symptom troubleshooting

These don't map to a single error code but are the most-Googled questions.

### My experiment shows no data

Walk down this tree in order:

1. **Is the experiment running?** Dashboard → Experiments → status column. Only `running` experiments collect data.
2. **Did any real visitor hit the page after the experiment started?** Data shows up after the first assignment + first tracked event. Refresh the page in your browser (incognito window) — that's enough.
3. **Is the SDK actually assigning?** Open DevTools Network tab. You should see a `POST` to `/api/assign` or `/api/assign/bulk` with a `200` response.
4. **Is the SDK actually tracking?** Same DevTools tab. Clicking whatever-you-wired-`track()`-to should fire a `POST` to `/api/events` or `/api/events/batch`.
5. **Are the metric keys matching?** The metric key you call `track()` with must exactly match the metric key the experiment is collecting against. Case-sensitive.
6. **Is DNT on?** If the user's browser has Do Not Track enabled and you left `respectDNT: true` (the default), you won't get their events. Check `navigator.doNotTrack` in the console.

### Every visitor sees `control`

- Is the experiment `running`? A paused or draft experiment resolves to control.
- Did you pass a `userId` when constructing the SDK? Without one, the SDK generates a sticky anonymous ID — but if your environment blocks `localStorage`, that ID won't stick and every request looks like a new visitor.
- Is a network error happening silently? The SDK falls through to control on any API error. Open DevTools Network and look for red rows.
- Is your API key correct? A wrong key returns 401, which the SDK swallows and falls through.

### The variant changes on every reload

- `stickyBucketing: false` is set. Turn it back on (it's the default).
- You're in a private/incognito window where `localStorage` is wiped per-session. That's expected behaviour.
- You're passing a *new* `userId` on every page load. Stabilise it (cookie, database user ID, hashed email).
- Your server clock skewed past the SDK's 5-minute cache TTL. Sync NTP.

### I get CORS errors in the browser

Your site's origin is not on the project's CORS allowlist.

- Dashboard → Project Settings → CORS allowlist → add your domain (e.g. `https://example.com`).
- During local dev, add `http://localhost:3000` explicitly — the allowlist doesn't wildcard localhost.
- If you're using a CDN or reverse proxy, the origin the browser sends may be different from the one you expect. Check the `Origin` header in DevTools.

### The SDK works locally but not in production

- Your production `baseUrl` is different from your dev `baseUrl`. Check env vars.
- Your production CSP blocks the API host. Add `connect-src https://your-api-host` to your CSP.
- Your production domain isn't on the CORS allowlist — see above.
- TLS: the SDK is strict about HTTPS; a mixed-content warning will block all requests from an HTTPS site to an HTTP API.

### An ad-blocker is blocking the SDK

- Agdam Bagdam's API is first-party-looking (no `*.tracker.*` subdomain) and is not in default EasyPrivacy / EasyList filters as of this writing.
- If you're seeing blocks, it's almost always because of the *host* path you chose. Self-hosted deployments under `/analytics/*` or `/track/*` path segments trigger cosmetic ad-blockers. Rename the path or use a bland one like `/api/*`.
- For the hosted demo at `boredfolio.com/agdambagdam/api` — no ad-blockers block it.

---

## Still stuck?

- Check [GitHub Discussions](https://github.com/balabommablock-cpu/agdambagdam/discussions) for similar reports.
- File an issue using the [bug report template](https://github.com/balabommablock-cpu/agdambagdam/issues/new?template=bug_report.yml). Include the `errorCode` and the full `errorDetail` from your console.
- For security issues, do **not** file a public issue — use [SECURITY.md](../SECURITY.md).
