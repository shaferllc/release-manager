<template>
  <div class="detail-tab-panel flex flex-col min-h-0 p-4">
    <Panel class="flex-1">
      <template #header>
        <h2 class="text-lg font-semibold m-0">__EXT_NAME__</h2>
      </template>
      <p class="text-sm text-rm-muted m-0 mb-4">__EXT_DESCRIPTION__</p>
      <p class="text-sm m-0 mb-4">Project: {{ info?.name || info?.path || 'none' }}</p>

      <div class="space-y-3">
        <h3 class="text-sm font-semibold text-rm-text m-0">Telemetry example</h3>
        <p class="text-xs text-rm-muted m-0">
          Extensions can fire usage events via <code class="bg-rm-surface px-1 py-0.5 rounded text-xs">window.__sendTelemetry(event, properties)</code>.
          Define custom events in <strong>Settings &gt; Data &amp; privacy &gt; Custom events</strong>.
        </p>
        <Button
          severity="primary"
          size="small"
          label="Fire custom event"
          @click="fireEvent"
        />
        <p v-if="lastFired" class="text-xs text-rm-success m-0">Fired: {{ lastFired }}</p>
      </div>
    </Panel>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const Button = window.PrimeVue?.['button'] ?? { name: 'Button', template: '<button><slot /></button>' };
const Panel = window.PrimeVue?.['panel'] ?? { name: 'Panel', template: '<div class="p-4"><slot /></div>' };

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
