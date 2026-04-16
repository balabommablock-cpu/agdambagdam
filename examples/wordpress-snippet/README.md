# wordpress-snippet — A/B test from WordPress without a plugin

A single PHP file that adds Agdam Bagdam to every page of your WordPress site and runs a demo experiment on any element with class `cta-button`.

## Install — 3 options, pick one

### Option A: Code Snippets plugin (recommended for non-coders)

1. Install the [Code Snippets](https://wordpress.org/plugins/code-snippets/) plugin.
2. Add New Snippet → Function.
3. Paste the contents of `agdambagdam-snippet.php` (the part inside `add_action(...)` onwards).
4. Set "Run snippet everywhere".
5. Activate.

### Option B: Drop into your theme's functions.php

1. Appearance → Theme File Editor → `functions.php`.
2. Paste the **body** of the file (everything from `add_action` to the closing `});`).
3. Save.

⚠️ Edits to `functions.php` are wiped when the theme updates. Use a child theme or Option A instead.

### Option C: mu-plugins (advanced)

1. Create `/wp-content/mu-plugins/agdambagdam.php`.
2. Paste the entire file contents.
3. Done — mu-plugins run automatically, no activation needed.

## What it does

- Loads the Agdam Bagdam SDK from unpkg (with `async`, so it never blocks page load).
- Picks a variant for the experiment `wp-cta-button-test` on DOMContentLoaded.
- Recolours any `.cta-button` to green for the treatment variant.
- Tracks clicks on those buttons and sends them as `wp-cta-button-test-click` events.

## Customising

Open `agdambagdam-snippet.php` and change:

- `$api_key` — replace `demo-public-key` with your real public API key from the dashboard.
- `$exp_key` — replace `wp-cta-button-test` with your own experiment key.
- The variant logic inside the `waitForSDK` callback — change which element is modified and how.

## Why the `waitForSDK` / `ready` dance?

- **`async` on the script tag** is important for page-speed scores. Without it, WordPress feels sluggish on slow connections.
- **`waitForSDK`** polls for the global `Abacus` once every 100 ms, up to 5 seconds. This handles the race where DOMContentLoaded fires before the async SDK finishes downloading.
- **`ready()`** waits for DOMContentLoaded so the `.cta-button` element actually exists when we try to modify it.

## Troubleshooting

- **"No experiment data in the dashboard after an hour":** check that you're actually publishing `.cta-button` to the page (inspect element). Most WordPress themes use different class names — change the selector in the snippet.
- **"Variant always control, never treatment":** the experiment may not be running in the dashboard, or you've hard-coded the demo API key which can't see your project. Swap in your real key.
- **"Getting CSP errors":** some security plugins set strict CSP. Allow `script-src https://unpkg.com` and `connect-src https://boredfolio.com` in your CSP rules.
