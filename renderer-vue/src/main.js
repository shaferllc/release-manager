import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import Tooltip from 'primevue/tooltip';
import App from './App.vue';
import { primevuePt } from './primevue-pt';
import './input.css';
import 'primeicons/primeicons.css';

const app = createApp(App);
app.use(createPinia());
app.directive('tooltip', Tooltip);
app.use(PrimeVue, {
  unstyled: true,
  pt: primevuePt,
  theme: {
    options: {
      darkModeSelector: '[data-theme="dark"]',
      cssLayer: {
        name: 'primevue',
        order: 'tailwind-base, primevue, tailwind-utilities',
      },
    },
  },
});

// Detect all problems: report Vue render/lifecycle errors to crash ingestion (when enabled)
app.config.errorHandler = (err, instance, info) => {
  const api = typeof window !== 'undefined' && window.releaseManager;
  if (typeof api?.sendCrashReport === 'function') {
    api.sendCrashReport({
      message: err?.message || String(err),
      stack_trace: err?.stack,
      payload: { process: 'renderer', type: 'vue', info: info || '' },
    }).catch(() => {});
  }
  console.error(err, info);
};

app.mount('#app');
