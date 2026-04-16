<script setup lang="ts">
import { computed } from 'vue';
import { useVariant } from './composables/useVariant';
import { ab } from './lib/abacus';

const variant = useVariant('button-color-test');

const isGreen = computed(
  () => variant.value === 'green' || variant.value === 'treatment' || variant.value === 'v1',
);

function handleClick() {
  ab.track('button-color-test-click');
}
</script>

<template>
  <main
    :style="{
      fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif',
      maxWidth: '640px',
      margin: '4rem auto',
      padding: '0 1.5rem',
      color: '#0f172a',
    }"
  >
    <h1 style="font-size: 2rem; margin-bottom: 0.5rem">Which button converts better?</h1>
    <p style="color: #475569">
      Open in multiple browsers. Assignments are sticky — same browser, same color, every reload.
    </p>

    <button
      @click="handleClick"
      :style="{
        marginTop: '1.5rem',
        padding: '14px 28px',
        color: 'white',
        fontSize: '1rem',
        fontWeight: 600,
        backgroundColor: isGreen ? '#16a34a' : '#2563eb',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
      }"
    >
      Sign up
    </button>

    <p style="margin-top: 2rem; color: #94a3b8; font-size: 0.875rem">
      Assigned variant: <code>{{ variant }}</code>
    </p>
  </main>
</template>
