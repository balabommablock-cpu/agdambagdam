import { useVariant } from './hooks/useVariant';
import { ab } from './lib/abacus';

const CONTAINER_STYLE: React.CSSProperties = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  maxWidth: 640,
  margin: '4rem auto',
  padding: '0 1.5rem',
  color: '#0f172a',
};

export function App() {
  const variant = useVariant('button-color-test');
  const isGreen = variant === 'green' || variant === 'treatment' || variant === 'v1';

  return (
    <main style={CONTAINER_STYLE}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Which button converts better?</h1>
      <p style={{ color: '#475569' }}>
        Open this page in multiple browsers. About half see one color, half the other. The same
        browser always sees the same color — assignments are sticky.
      </p>

      <button
        onClick={() => ab.track('button-color-test-click')}
        style={{
          marginTop: '1.5rem',
          padding: '14px 28px',
          color: 'white',
          fontSize: '1rem',
          fontWeight: 600,
          backgroundColor: isGreen ? '#16a34a' : '#2563eb',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        Sign up
      </button>

      <p style={{ marginTop: '2rem', color: '#94a3b8', fontSize: '0.875rem' }}>
        Assigned variant: <code>{variant}</code>
      </p>
    </main>
  );
}
