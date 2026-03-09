import { registerDetailTabExtension, registerDocSection } from './extensions/registry';
import { registerCommand, unregisterCommand } from './commandPalette/registry';
// Expose for user-installed extensions (loaded at runtime from userData/extensions)
import { registerSettingsSection } from './extensions/settingsRegistry';
if (typeof window !== 'undefined') {
  window.__registerDetailTabExtension = registerDetailTabExtension;
  window.__registerDocSection = registerDocSection;
  window.__registerCommand = registerCommand;
  window.__unregisterCommand = unregisterCommand;
  window.__registerSettingsSection = registerSettingsSection;
  window.__sendTelemetry = (event, properties) => {
    const api = window.releaseManager;
    if (typeof api?.sendTelemetry === 'function') api.sendTelemetry(String(event), properties);
  };
}
import './extensions'; // Load built-in detail-tab extensions (see extensions/index.js)
import * as Vue from 'vue';
import { createApp } from 'vue';
import { createPinia } from 'pinia';

// Expose Vue runtime for standalone extensions built with external: ['vue']
if (typeof window !== 'undefined') {
  window.Vue = Vue;
}
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
      try {
        // Inject extension CSS if present
        if (api.getExtensionCssContent) {
          const css = await api.getExtensionCssContent(u.id);
          if (css) {
            const style = document.createElement('style');
            style.setAttribute('data-ext', u.id);
            style.textContent = css;
            document.head.appendChild(style);
          }
        }
        const content = await api.getExtensionScriptContent(u.id);
        if (content) {
          const blob = new Blob([content], { type: 'application/javascript' });
          const url = URL.createObjectURL(blob);
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.setAttribute('data-ext', u.id);
            script.onload = () => { URL.revokeObjectURL(url); resolve(); };
            script.onerror = (err) => { URL.revokeObjectURL(url); reject(err); };
            document.head.appendChild(script);
          });
        }
      } catch (e) {
        console.error('[extensions] Failed to load user extension:', u.id, e);
      }
    }
  } catch (e) {
    console.error('[extensions] Failed to load user extensions:', e);
  }
})();
