import { vi } from 'vitest';
import { config } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';

// PrimeVue is required by Button, Select, Dialog, Checkbox, etc. Use styled theme to match app.
config.global.plugins = config.global.plugins || [];
config.global.plugins.push([
  PrimeVue,
  {
    theme: {
      preset: Aura,
      options: { darkModeSelector: '[data-theme="dark"]' },
    },
  },
]);

// PrimeVue Select uses matchMedia and expects addEventListener on the return value
if (typeof window !== 'undefined') {
  const noop = () => {};
  window.matchMedia = () => ({
    matches: false,
    addListener: noop,
    removeListener: noop,
    addEventListener: noop,
    removeEventListener: noop,
    dispatchEvent: () => true,
  });
}

// Mock the preload API so useApi() and components that depend on it don't throw
const mockApi = {
  getProjects: vi.fn(),
  getProjectInfo: vi.fn(),
  getPreference: vi.fn(),
  setPreference: vi.fn(),
  getOllamaSettings: vi.fn(),
  setOllamaSettings: vi.fn(),
  getGitHubToken: vi.fn(),
  setGitHubToken: vi.fn(),
  getBranches: vi.fn(),
  getTags: vi.fn(),
  runProjectTests: vi.fn(),
  openInEditor: vi.fn(),
  openInTerminal: vi.fn(),
  copyToClipboard: vi.fn(),
};
if (typeof globalThis.window !== 'undefined') {
  globalThis.window.releaseManager = mockApi;
}
if (typeof globalThis.global !== 'undefined') {
  globalThis.global.window = globalThis.global.window || {};
  globalThis.global.window.releaseManager = mockApi;
}
