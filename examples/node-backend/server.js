/**
 * Server-side A/B testing with Express.
 *
 * This pattern is ideal when:
 *   - You're server-rendering HTML (no SPA)
 *   - You want the variant decision baked into the first response (no flicker)
 *   - You can't afford a client-side SDK load (AMP, old browsers, bandwidth-constrained users)
 *
 * Run:
 *   cp .env.example .env     # then paste your API key into .env
 *   npm install
 *   npm start                # listens on :3012
 *
 * Open http://localhost:3012 in a few browsers to see different variants.
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('node:crypto');
const { Abacus } = require('@agdambagdam/sdk-node');

const app = express();
app.use(cookieParser());

const ab = new Abacus({
  apiKey: process.env.ABACUS_API_KEY || 'demo-public-key',
  baseUrl: process.env.ABACUS_BASE_URL || 'https://boredfolio.com/agdambagdam/api',
});

/**
 * Middleware: ensure every request has a sticky user ID in a cookie.
 * This is what makes variant assignment stable across requests.
 */
app.use((req, res, next) => {
  if (!req.cookies.agdambagdam_uid) {
    const uid = crypto.randomUUID();
    res.cookie('agdambagdam_uid', uid, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      // In production: secure: true
    });
    req.cookies.agdambagdam_uid = uid; // make available to THIS request too
  }
  next();
});

app.get('/', async (req, res) => {
  const userId = req.cookies.agdambagdam_uid;

  // Assign the variant BEFORE we render. The HTML we send contains the
  // right copy on first paint — no client-side flicker.
  let variant = 'control';
  try {
    variant = await ab.getVariant('headline-test', userId);
  } catch {
    // SDK already logs a helpful error; fall through to control.
  }

  const headlines = {
    control: 'Better A/B testing. Open source. Free.',
    treatment: 'Run experiments. Ship what wins. Free forever.',
  };
  const headline = headlines[variant] || headlines.control;

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Agdam Bagdam — Node/Express</title>
      </head>
      <body style="font-family: system-ui, sans-serif; max-width: 640px; margin: 4rem auto; padding: 0 1.5rem">
        <h1>${headline}</h1>
        <form method="POST" action="/cta">
          <button type="submit" style="padding: 14px 28px; color: white; background: #2563eb; border: none; border-radius: 8px; cursor: pointer">
            Get started
          </button>
        </form>
        <p style="color: #94a3b8; margin-top: 2rem">Variant: <code>${variant}</code> · User: <code>${userId}</code></p>
      </body>
    </html>
  `);
});

app.post('/cta', express.urlencoded({ extended: true }), async (req, res) => {
  const userId = req.cookies.agdambagdam_uid;
  // Track the conversion, attaching the userId so the metric is attributed
  // to the same bucketed visitor that saw the headline.
  ab.track('headline-test-click', userId, 1);
  res.redirect('/');
});

const PORT = process.env.PORT || 3012;
app.listen(PORT, () => {
  console.log(`✓ Listening on http://localhost:${PORT}`);
  console.log(`  Open in multiple browsers to see different headlines.`);
});
