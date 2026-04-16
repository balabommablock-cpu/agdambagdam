/**
 * Server Component that renders a hero section with an A/B-tested headline.
 *
 * The assignment happens on the server (no flash of the control variant to
 * the user — the correct headline is baked into the initial HTML). The click
 * tracking happens in a tiny client component at the bottom.
 *
 * If the API is unreachable at render time, we fall through to the control
 * headline. The page never crashes, never shows an error to the user.
 */

import { Abacus } from 'agdambagdam';
import { cookies, headers } from 'next/headers';
import { TrackButton } from './track-button';

// Config — move these to environment variables in production.
const ABACUS_API_KEY = process.env.ABACUS_API_KEY ?? 'demo-public-key';
const ABACUS_BASE_URL =
  process.env.ABACUS_BASE_URL ?? 'https://boredfolio.com/agdambagdam/api';

/**
 * Get a sticky, anonymous user ID from a cookie. If the cookie doesn't exist
 * yet, we can't set it from a Server Component — but we can use the request
 * IP + user-agent to derive a stable hash for this session. In production,
 * set an httpOnly cookie in middleware and read it here.
 */
async function getStickyUserId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get('agdambagdam_uid');
  if (existing?.value) return existing.value;
  const hdrs = await headers();
  const ua = hdrs.get('user-agent') ?? 'unknown';
  // Tiny non-cryptographic hash — good enough for this example.
  let h = 0;
  for (let i = 0; i < ua.length; i++) h = ((h << 5) - h + ua.charCodeAt(i)) | 0;
  return `anon_${Math.abs(h).toString(36)}`;
}

/**
 * Ask the API for the variant for this visitor.
 * Returns 'control' on any error — this function never throws.
 */
async function getHeadlineVariant(userId: string): Promise<string> {
  const ab = new Abacus({
    apiKey: ABACUS_API_KEY,
    baseUrl: ABACUS_BASE_URL,
    userId,
    autoTrack: false,       // we're on the server; no pageviews here
    stickyBucketing: false, // the SDK's localStorage-backed cache is browser-only
  });
  try {
    await ab.initialize();
    return await ab.getVariant('hero-headline-test');
  } catch {
    return 'control';
  }
}

const HEADLINES: Record<string, { title: string; subtitle: string }> = {
  control: {
    title: 'Better A/B testing. Open source. Free.',
    subtitle: 'Run rigorous experiments without a $500K/year SaaS bill.',
  },
  direct: {
    title: 'Run experiments. Ship what wins.',
    subtitle: 'A/B testing that takes you 60 seconds to set up.',
  },
  skeptical: {
    title: 'Your vendor charges $50K for this. We charge $0.',
    subtitle:
      'Bayesian + Frequentist stats, CUPED, sequential testing — all open source.',
  },
};

export default async function HomePage() {
  const userId = await getStickyUserId();
  const variant = await getHeadlineVariant(userId);
  const copy = HEADLINES[variant] ?? HEADLINES.control;

  return (
    <main
      style={{
        maxWidth: 720,
        margin: '6rem auto',
        padding: '0 1.5rem',
      }}
    >
      <h1 style={{ fontSize: '2.5rem', margin: 0 }}>{copy.title}</h1>
      <p style={{ fontSize: '1.125rem', color: '#475569', marginTop: '0.75rem' }}>
        {copy.subtitle}
      </p>

      {/* The actual CTA lives in a client component because we need onClick */}
      <TrackButton userId={userId} variant={variant} />

      <footer style={{ marginTop: '4rem', color: '#94a3b8', fontSize: '0.875rem' }}>
        Rendered variant: <code>{variant}</code> · userId: <code>{userId}</code>
      </footer>
    </main>
  );
}
