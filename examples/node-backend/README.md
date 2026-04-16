# node-backend — Server-side A/B testing with Express

Assigns the variant **before** sending HTML. The user sees the right copy on first paint — no client-side flicker, no layout shift, no JavaScript required on the visitor's browser.

## Run it

```bash
cd examples/node-backend
cp .env.example .env
npm install
npm start
```

Open [http://localhost:3012](http://localhost:3012) in 2–3 browsers (or incognito windows). Different headlines per visitor; same visitor always sees the same one.

## Why server-side?

Use this pattern when:

- **You can't afford JS on the critical path.** Old mobile browsers, AMP pages, bandwidth-constrained regions.
- **Your framework already server-renders.** Express, Rails, Django, Laravel — the pattern is the same across all of them.
- **You care about CLS / layout shift.** Variants baked in server-side never shift.
- **You control the cookie lifecycle.** Set `agdambagdam_uid` once, keep it forever, stable assignments.

## The three pieces

### 1. Sticky user ID cookie

```js
if (!req.cookies.agdambagdam_uid) {
  const uid = crypto.randomUUID();
  res.cookie('agdambagdam_uid', uid, { httpOnly: true, sameSite: 'lax', maxAge: 365 * 24 * 60 * 60 * 1000 });
}
```

Every visitor gets a cryptographic UUID on their first hit. It's stored `httpOnly` so client-side JS can't read it — only the server sees it. Valid for a year.

### 2. Variant assignment before render

```js
const variant = await ab.getVariant('headline-test', userId);
const headline = headlines[variant];
res.send(`<h1>${headline}</h1>`);
```

The `getVariant` call returns in ~5–20 ms typically (cached assignments are sub-millisecond). The first paint contains the correct copy.

### 3. Tracking conversions

```js
app.post('/cta', (req, res) => {
  ab.track('headline-test-click', req.cookies.agdambagdam_uid, 1);
  res.redirect('/');
});
```

Attaching the `userId` to `track()` makes sure the conversion is attributed to the same bucketed visitor that saw the headline. Without it, tracking would fire but wouldn't cohort correctly.

## Production checklist

- [ ] Set `secure: true` on the cookie (requires HTTPS).
- [ ] Move the API key to env secrets, never commit `.env`.
- [ ] Add a connection pool / retry for `ab.getVariant` if your traffic is >1k RPS.
- [ ] Add graceful shutdown (`process.on('SIGTERM', ...)`) to flush in-flight events before exit.

## Going further

- Multi-arm experiments: add more headlines to the `headlines` map and more variant names in the dashboard.
- Target by geography, device, or plan: pass `{ country, device, plan }` as a third arg to `getVariant(key, userId, context)`.
- Use **Bayesian** results in the dashboard for "probability this variant is better" language that non-technical stakeholders understand.
