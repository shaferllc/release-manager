import { registerDetailTabExtension } from './extensions/registry';
import { registerCommand, unregisterCommand } from './commandPalette/registry';
// Expose for user-installed extensions (loaded at runtime from userData/extensions)
if (typeof window !== 'undefined') {
  window.__registerDetailTabExtension = registerDetailTabExtension;
  window.__registerCommand = registerCommand;
  window.__unregisterCommand = unregisterCommand;
}
import './extensions'; // Load built-in detail-tab extensions (see extensions/index.js)
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import Tooltip from 'primevue/tooltip';
import App from './App.vue';
import './input.css';
import 'primeicons/primeicons.css';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/stackoverflow-dark.min.css';

const app = createApp(App);
app.use(createPinia());
app.directive('tooltip', Tooltip);
app.use(PrimeVue, {
  theme: {
    preset: Aura,
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

// Load user-installed extensions (marketplace). They register via window.__registerDetailTabExtension
;(async function loadUserExtensions() {
  const api = typeof window !== 'undefined' && window.releaseManager;
  if (!api?.getInstalledUserExtensions || !api?.getExtensionScriptContent) return;
  try {
    const list = await api.getInstalledUserExtensions();
    for (const u of list) {
      const content = await api.getExtensionScriptContent(u.id);
      if (content) {
        try {
          // eslint-disable-next-line no-eval
          eval(content);
        } catch (e) {
          console.error('[extensions] Failed to load user extension:', u.id, e);
        }
      }
    }
  } catch (e) {
    console.error('[extensions] Failed to load user extensions:', e);
  }
})();
