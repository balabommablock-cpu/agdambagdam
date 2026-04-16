# html-plain — The simplest possible A/B test

A single HTML file. No build step. No framework. No npm. Open it in a browser — it works.

## Run it

```bash
# From the repo root:
open examples/html-plain/index.html        # macOS
xdg-open examples/html-plain/index.html    # Linux
start examples/html-plain/index.html       # Windows
```

Or drop the file onto Chrome / Firefox / Safari.

## What you'll see

A page with one button. The button's colour (blue or green) is decided by the SDK, which asks the API "what variant should this visitor see?" The answer is sticky — **reload the page and the colour stays the same**. Open an incognito/private window to see the other variant.

A status panel below the button shows:
- Which variant was assigned.
- Whether the API was reachable (or if we fell through to the control variant).
- How many clicks you've tracked in this session.

## How it works — 3 files' worth of concept

### 1. Load the SDK from a CDN

```html
<script src="https://unpkg.com/agdambagdam@latest/dist/abacus.js"></script>
```

The SDK weighs about 15 KB gzipped and exposes a global `Abacus` class. It **cannot be tree-shaken** in this setup (it's a full UMD bundle), but that's fine for a quickstart. In a real app you'd `import { Abacus } from 'agdambagdam'` and ship only what you use.

### 2. Create the client

```js
const ab = new Abacus({
  apiKey: 'demo-public-key',
  baseUrl: 'https://boredfolio.com/agdambagdam/api',
});
```

The config options that matter:

| Option | What it does | Default |
|---|---|---|
| `apiKey` | Your public API key. Safe to expose in the browser. | *required* |
| `baseUrl` | Your API origin. Use the demo one until you self-host. | *required* |
| `userId` | Stable ID for the visitor (e.g. an email hash, session ID). If omitted, the SDK invents an anonymous ID and stores it in `localStorage`. | auto |
| `respectDNT` | Skip tracking if the user has Do Not Track on. | `true` |
| `stickyBucketing` | Cache assignments in `localStorage` so we don't ask the API every page load. | `true` |
| `autoTrack` | Fire pageview events automatically. | `true` |

### 3. Ask for a variant and change the UI

```js
const variant = await ab.getVariant('button-color-test');
if (variant === 'green') btn.style.backgroundColor = '#16a34a';
```

`getVariant(key)` returns a `Promise<string>`. The string is whatever you named the variant in the dashboard (e.g. `'control'`, `'green'`, `'purple'`). If the experiment is paused, doesn't exist, or the API is unreachable, you get back `'control'` — nothing throws, nothing breaks.

### 4. Track the metric

```js
btn.addEventListener('click', () => ab.track('signup-click'));
```

`track(key, value?, properties?)` fires a metric event. For a conversion metric (did they click? yes/no), you don't need a value. For revenue or continuous metrics, pass a number. For dimensions (which page? which segment?), pass a properties object.

## Making it your own

1. Sign up at [boredfolio.com/agdambagdam/app](https://boredfolio.com/agdambagdam/app).
2. Create an experiment, name it anything — e.g. `my-button-test`.
3. Define two variants: `control` (blue) and `green`.
4. In `index.html`, change:
   - `apiKey: 'demo-public-key'` → your real public API key
   - `'button-color-test'` → your experiment key

That's it. Now you're running your own A/B test on your own data.

## Debugging

Open the browser console. Everything the SDK does gets logged with the `[abacus]` prefix in development mode. If you see nothing there and your variant is always `'control'`:

| Symptom | Likely cause | Fix |
|---|---|---|
| Always `'control'`, no console error | The experiment isn't active in your dashboard | Set the experiment to "running" in the UI |
| Network tab shows 401 | Wrong or typo'd API key | Copy it fresh from the dashboard |
| Network tab shows 404 | Wrong `baseUrl` | Check the slash at the end: *no trailing slash* |
| Network tab shows CORS error | You're on a domain your project hasn't allowlisted | Add your domain in project settings → CORS allowlist |
| Page loads, then refreshes to a different variant | `stickyBucketing` was turned off | Turn it back on (it's the default) |

## Going to production

Three things change:
1. **Pin the SDK version.** Replace `@latest` with a specific version — e.g. `@0.2.1`.
2. **Host the SDK yourself** (optional but nice for performance). `npm install agdambagdam`, bundle it with your app.
3. **Use your own API origin.** If you self-host via Docker, point `baseUrl` at `https://your-server.com`. If you stay on the hosted demo, point it at `https://boredfolio.com/agdambagdam/api`.

You don't need any of this on day one.
