import { ref, onMounted } from 'vue';
import { ab } from '../lib/abacus';

/**
 * Composable that assigns a variant on mount and returns a reactive ref.
 * While the call is in flight (or if it fails), the ref value is 'control'.
 */
export function useVariant(experimentKey: string) {
  const variant = ref<string>('control');

  onMounted(async () => {
    try {
      variant.value = await ab.getVariant(experimentKey);
    } catch {
      // SDK already logs a helpful error; keep control variant.
    }
  });

  return variant;
}
