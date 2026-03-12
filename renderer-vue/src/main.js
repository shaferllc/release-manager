import { registerDetailTabExtension, registerDocSection, getDetailTabExtensions } from './extensions/registry';
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
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import Breadcrumb from 'primevue/breadcrumb';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import DatePicker from 'primevue/datepicker';
import Dialog from 'primevue/dialog';
import Divider from 'primevue/divider';
import FileUpload from 'primevue/fileupload';
import InputText from 'primevue/inputtext';
import Menu from 'primevue/menu';
import Message from 'primevue/message';
import Panel from 'primevue/panel';
import Password from 'primevue/password';
import ProgressBar from 'primevue/progressbar';
import ProgressSpinner from 'primevue/progressspinner';
import Select from 'primevue/select';
import SelectButton from 'primevue/selectbutton';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import ToggleSwitch from 'primevue/toggleswitch';
import Toolbar from 'primevue/toolbar';
import App from './App.vue';
import { useNotifications } from './composables/useNotifications';

// Expose PrimeVue components and composables for user-installed extensions
if (typeof window !== 'undefined') {
  window.PrimeVue = {
    accordion: Accordion,
    accordionpanel: AccordionPanel,
    accordionheader: AccordionHeader,
    accordioncontent: AccordionContent,
    breadcrumb: Breadcrumb,
    button: Button,
    checkbox: Checkbox,
    column: Column,
    datatable: DataTable,
    datepicker: DatePicker,
    dialog: Dialog,
    divider: Divider,
    fileupload: FileUpload,
    inputtext: InputText,
    menu: Menu,
    message: Message,
    panel: Panel,
    password: Password,
    progressbar: ProgressBar,
    progressspinner: ProgressSpinner,
    select: Select,
    selectbutton: SelectButton,
    splitter: Splitter,
    splitterpanel: SplitterPanel,
    tag: Tag,
    textarea: Textarea,
    toggleswitch: ToggleSwitch,
    toolbar: Toolbar,
  };
  window.__useNotifications = useNotifications;
}
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
  if (!api?.getInstalledUserExtensions || !api?.getExtensionScriptContent) {
    console.warn('[extensions] API not available for loading user extensions');
    return;
  }
  try {
    const list = await api.getInstalledUserExtensions();
    console.log('[extensions] Found', list.length, 'installed user extensions:', list.map((u) => u.id));
    const beforeCount = getDetailTabExtensions().length;
    for (const u of list) {
      try {
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
        if (!content) {
          console.warn('[extensions] No script content for:', u.id);
          continue;
        }
        const blob = new Blob([content], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const regCountBefore = getDetailTabExtensions().length;
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = url;
          script.setAttribute('data-ext', u.id);
          script.onload = () => { URL.revokeObjectURL(url); resolve(); };
          script.onerror = (err) => { URL.revokeObjectURL(url); reject(err); };
          document.head.appendChild(script);
        });
        const regCountAfter = getDetailTabExtensions().length;
        if (regCountAfter > regCountBefore) {
          console.log('[extensions] Loaded and registered:', u.id);
        } else {
          console.warn('[extensions] Script loaded but did NOT register:', u.id);
        }
      } catch (e) {
        console.error('[extensions] Failed to load user extension:', u.id, e);
      }
    }
    const afterCount = getDetailTabExtensions().length;
    console.log('[extensions] Total registered extensions:', afterCount, '(was', beforeCount, 'before user extensions)');
  } catch (e) {
    console.error('[extensions] Failed to load user extensions:', e);
  }
})();
