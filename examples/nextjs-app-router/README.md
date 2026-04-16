# nextjs-app-router — A/B test a hero headline with Server Components

This example tests three versions of a hero headline on a landing page. The variant is chosen **on the server**, so there's no flicker of the wrong headline before the right one appears. Click tracking happens in a small client component.

## Run it

```bash
cd examples/nextjs-app-router
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). You'll see one of three headlines. Reload and it stays the same (sticky). Open an incognito window to see another variant.

## What this demonstrates

1. **Server-side variant assignment** — the headline is decided during render, baked into the HTML. Lighthouse scores stay clean. No layout shift.
2. **Client-side click tracking** — the minimum amount of JavaScript ships to the browser.
3. **Environment-variable config** — the API key and base URL are read from `.env`, not hardcoded.
4. **Graceful degradation** — if the API is down, every visitor gets the control headline. No error page.

## File-by-file tour

```
examples/nextjs-app-router/
├── app/
│   ├── layout.tsx        Root layout. Just sets up fonts + body styles.
│   ├── page.tsx          Server Component. Asks the API for a variant, renders the headline.
│   └── track-button.tsx  Client Component. Fires `ab.track('hero-cta-click')` on click.
├── next.config.js        Empty on purpose.
├── tsconfig.json         Standard Next.js TS config.
├── .env.example          Copy to `.env.local` and put your keys here.
└── package.json
```

## How the server-side assignment works

In `app/page.tsx`:

```tsx
const ab = new Abacus({
  apiKey: ABACUS_API_KEY,
  baseUrl: ABACUS_BASE_URL,
  userId,
  autoTrack: false,       // we're on the server; no pageviews from here
  stickyBucketing: false, // localStorage doesn't exist in a Server Component
});
await ab.initialize();
const variant = await ab.getVariant('hero-headline-test');
```

Two important flags:
- `autoTrack: false` — pageview auto-tracking needs `window`. On the server, don't.
- `stickyBucketing: false` — the SDK's localStorage cache is browser-only. On the server, we rely on the `userId` being stable across requests (our cookie trick in `getStickyUserId()`).

## How the user ID stays stable

`getStickyUserId()` in `page.tsx` does one of two things:
1. Read `agdambagdam_uid` cookie if it exists.
2. Fall back to a hash of the user-agent if it doesn't (first visit, cookie-less request).

**In production, set the cookie in Next.js middleware** so every visitor gets a real sticky ID from their first request. The cookie should be `httpOnly`, `Secure`, `SameSite=Lax`, and have a long `Max-Age`. Here's a snippet you can drop into `middleware.ts`:

```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.get('agdambagdam_uid')) {
    res.cookies.set('agdambagdam_uid', crypto.randomUUID(), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });
  }
  return res;
}

export const config = { matcher: '/:path*' };
```

## Going to production

1. **Sign up** at [boredfolio.com/agdambagdam/app](https://boredfolio.com/agdambagdam/app), create an experiment called `hero-headline-test` with variants `control`, `direct`, `skeptical`.
2. **Copy `.env.example` to `.env.local`** and paste your real API key + base URL.
3. **Add the middleware snippet above** for real cookie-based sticky IDs.
4. **Deploy.** Anywhere — Vercel, your own server, a Docker image.

The variant selection happens at request time, so each visitor gets their own server-rendered headline on first paint. No flicker, no flash, no layout shift.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Every visitor sees `control` | Is the experiment set to "running" in the dashboard? |
| The variant changes on every reload | You're probably skipping the cookie middleware — user-agent-only IDs aren't stable enough |
| Build warns about `agdambagdam` not being found | Run `npm install` — this example depends on the published SDK |
| "Hydration mismatch" warning | You're probably using the variant in a Client Component without passing it down as a prop. Keep variant selection in Server Components; pass `variant` as a prop to client pieces that need it |
