<template>
  <div class="p-4">
    <h2 class="text-lg font-semibold mb-2">__EXT_NAME__</h2>
    <p class="text-sm text-gray-500">__EXT_DESCRIPTION__</p>
    <p class="mt-4 text-sm">Project: {{ info?.name || info?.path || 'none' }}</p>

    <div class="mt-6 space-y-3">
      <h3 class="text-sm font-semibold">Telemetry example</h3>
      <p class="text-xs text-gray-500">
        Extensions can fire usage events via <code>window.__sendTelemetry(event, properties)</code>.
        Define custom events in <strong>Settings &gt; Data &amp; privacy &gt; Custom events</strong>.
      </p>
      <button
        class="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
        @click="fireEvent"
      >
        Fire custom event
      </button>
      <p v-if="lastFired" class="text-xs text-green-500">Fired: {{ lastFired }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  info: { type: Object, default: () => ({}) },
});

const lastFired = ref('');

function fireEvent() {
  const eventName = 'custom.__EXT_ID___action';
  if (typeof window.__sendTelemetry === 'function') {
    window.__sendTelemetry(eventName, { source: '__EXT_ID__' });
  }
  lastFired.value = eventName;
}
</script>
