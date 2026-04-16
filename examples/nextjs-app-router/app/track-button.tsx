'use client';

/**
 * Client component that tracks button clicks back to the Agdam Bagdam API.
 *
 * The variant was already chosen server-side in app/page.tsx. We pass it
 * down so this component can send it as a property on the track event,
 * which makes it trivial to filter clicks by variant in the dashboard.
 */

import { useEffect, useRef } from 'react';
import { Abacus } from 'agdambagdam';

const ABACUS_API_KEY =
  process.env.NEXT_PUBLIC_ABACUS_API_KEY ?? 'demo-public-key';
const ABACUS_BASE_URL =
  process.env.NEXT_PUBLIC_ABACUS_BASE_URL ??
  'https://boredfolio.com/agdambagdam/api';

export function TrackButton({
  userId,
  variant,
}: {
  userId: string;
  variant: string;
}) {
  // Keep one SDK instance across re-renders.
  const abRef = useRef<Abacus | null>(null);
  if (abRef.current === null) {
    abRef.current = new Abacus({
      apiKey: ABACUS_API_KEY,
      baseUrl: ABACUS_BASE_URL,
      userId,
    });
  }

  useEffect(() => {
    abRef.current?.initialize().catch(() => {
      // Silent failure is fine here — tracking is best-effort, not critical.
    });
  }, []);

  const handleClick = () => {
    abRef.current?.track('hero-cta-click', 1, { variant });
  };

  return (
    <button
      onClick={handleClick}
      style={{
        marginTop: '2rem',
        padding: '14px 28px',
        fontSize: '1rem',
        fontWeight: 600,
        color: 'white',
        backgroundColor: '#2563eb',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
      }}
    >
      Start testing →
    </button>
  );
}
