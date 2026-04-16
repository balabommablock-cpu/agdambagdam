import { useEffect, useState } from 'react';
import { ab } from '../lib/abacus';

/**
 * Returns the assigned variant for an experiment.
 *
 * While the assignment is in-flight (or if the API is unreachable) the hook
 * returns `'control'`. This means your UI never flashes — it renders the
 * control immediately, then swaps to the real variant if one comes back.
 *
 * Example:
 *   const variant = useVariant('homepage-hero');
 *   return <h1>{variant === 'bold' ? 'Ship faster' : 'Build better'}</h1>;
 */
export function useVariant(experimentKey: string): string {
  const [variant, setVariant] = useState<string>('control');

  useEffect(() => {
    let cancelled = false;
    ab.getVariant(experimentKey)
      .then((v) => {
        if (!cancelled) setVariant(v);
      })
      .catch(() => {
        // API unreachable — stick with control. The SDK also logs a helpful error to the console.
      });
    return () => {
      cancelled = true;
    };
  }, [experimentKey]);

  return variant;
}
