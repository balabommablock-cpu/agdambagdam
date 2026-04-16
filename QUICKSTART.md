# Your first A/B test in 60 seconds

You're going to test two button colors — blue vs green — and see which one gets more clicks. No account needed to try it. No database to set up. No tutorial to finish.

**What you'll need:**
- A website, anywhere — Netlify, Vercel, GitHub Pages, WordPress, Webflow, Shopify, a plain HTML file on your laptop. It all works.
- 60 seconds.

---

## Step 1 — Paste this script tag (15 seconds)

Put this just before your closing `</body>` tag:

```html
<script src="https://unpkg.com/agdambagdam@latest/dist/abacus.js"></script>
<script>
  const ab = new Abacus({
    apiKey: 'demo-public-key',
    baseUrl: 'https://boredfolio.com/agdambagdam/api'
  });
</script>
```

That's the whole SDK. It's 14.7 KB. Uses less data than loading a single logo image.

---

## Step 2 — Ask which color to show (30 seconds)

Suppose you have a signup button:

```html
<button id="signup-btn">Sign up</button>
```

Add this right after the script from Step 1:

```html
<script>
  ab.getVariant('button-color-test').then(variant => {
    const btn = document.getElementById('signup-btn');
    if (variant === 'green') {
      btn.style.backgroundColor = 'green';
    } else {
      btn.style.backgroundColor = 'blue';
    }
  });
</script>
```

What this does:
- `ab.getVariant('button-color-test')` asks our API, "Which version should this visitor see?"
- Half your visitors see green, half see blue. **The same visitor always sees the same color, forever** (we use a deterministic hash, not random).
- If our API is unreachable, the SDK returns `'control'` and you fall through to blue — your site never breaks.

---

## Step 3 — Count who clicks (15 seconds)

Track the click:

```html
<script>
  document.getElementById('signup-btn').addEventListener('click', () => {
    ab.track('signup-click');
  });
</script>
```

That's it. You're done.

---

## Where's my dashboard?

Go to [boredfolio.com/agdambagdam/app](https://boredfolio.com/agdambagdam/app) and log in. Your experiment — the one you just named `button-color-test` — will show up automatically the first time a real visitor hits your page.

The dashboard shows:
- How many people saw each variant
- How many clicked on each
- A clear answer: **which color wins, and how confident we are.**

No training needed. If the box says "green wins with 97% confidence" — it's time to keep green.

---

## What next?

| I want to… | Go to |
|---|---|
| See a complete working example I can copy | [`examples/html-plain/`](examples/html-plain/) |
| Use this in a Next.js / React app | [`examples/nextjs-app-router/`](examples/nextjs-app-router/) |
| Test something other than a button color | [docs: experiment types](#) |
| Understand Bayesian vs Frequentist | [docs: picking a statistics method](#) |
| Self-host this thing | [`README.md#docker`](README.md#docker) |
| Change the button text, not just color | [docs: variants with payloads](#) |
| Track revenue, not just clicks | [docs: metric types](#) |

---

## Common first-time questions

**"The button still shows blue every time. Did it break?"**
Our hash is deterministic. The same browser always sees the same variant. Try in a private/incognito window to see the other side.

**"I don't see my experiment in the dashboard."**
Experiments show up after the *first real visitor hits the page*. Open your site, load the page. Give it 10 seconds. Refresh the dashboard.

**"Does this work with ad blockers?"**
Yes. The SDK calls our API on a first-party-looking path (`/api/*`), not a tracker domain. uBlock Origin and Privacy Badger don't block it.

**"Will Google penalize me for A/B testing?"**
No. You're not cloaking. Both variants are the same page with one CSS change. This is what Google explicitly [allows](https://developers.google.com/search/blog/2012/08/website-testing-and-google-search).

**"I'm on `localhost`. Will this work?"**
Yes. The SDK works on any host. The dashboard just shows you the data.

**"What happens if my API key leaks?"**
Public API keys (the one you paste in the browser) can only do one thing: request variant assignments. They can't read your data, edit experiments, or delete anything. Private/server keys exist for that — keep them in environment variables.

**"Can I test with fake traffic before launching?"**
Yes. Open the same page in 20 different browsers, incognito windows, or with different user IDs. Each will bucket independently.

---

## The one-line version for the impatient

```html
<script src="https://unpkg.com/agdambagdam@latest/dist/abacus.js"></script>
<script>
  (async () => {
    const ab = new Abacus({ apiKey: 'demo-public-key', baseUrl: 'https://boredfolio.com/agdambagdam/api' });
    const variant = await ab.getVariant('button-color-test');
    if (variant === 'green') document.querySelector('button').style.backgroundColor = 'green';
    document.querySelector('button').onclick = () => ab.track('signup-click');
  })();
</script>
```

That's a working A/B test. Drop it in a Codepen, open it. Works.
