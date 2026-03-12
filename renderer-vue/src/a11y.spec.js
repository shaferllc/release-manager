/**
 * Automated accessibility (a11y) test suite using axe-core.
 *
 * Runs WCAG-oriented checks on key components and views.
 * Color contrast is disabled (does not work in jsdom).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { axe, runAxe } from './test/utils/a11y';

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Accessibility (a11y)', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        ...originalReleaseManager,
        getTheme: vi.fn().mockResolvedValue({ effective: 'dark' }),
        setTheme: vi.fn().mockResolvedValue(),
        onTheme: vi.fn(),
        showOpenDialog: vi.fn().mockResolvedValue({ canceled: true }),
        syncProjectsToShipwell: vi.fn().mockResolvedValue(),
        syncAllGitFetch: vi.fn().mockResolvedValue(),
        getPreference: vi.fn().mockResolvedValue(null),
        setPreference: vi.fn().mockResolvedValue(),
        getAllProjectsInfo: vi.fn().mockResolvedValue([]),
        getProjectInfo: vi.fn().mockResolvedValue({
          ok: true,
          info: { path: '/test', name: 'Test', version: '1.0.0', gitStatus: {} },
        }),
        getInstalledUserExtensions: vi.fn().mockResolvedValue([]),
        getGitHubExtensionRegistry: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        syncPlanExtensions: vi.fn().mockResolvedValue(),
        installExtensionFromGitHub: vi.fn().mockResolvedValue({ ok: true }),
        uninstallExtension: vi.fn().mockResolvedValue({ ok: true }),
        getExtensionScriptContent: vi.fn().mockResolvedValue(null),
        getExtensionCssContent: vi.fn().mockResolvedValue(null),
        buildAllExtensions: vi.fn().mockResolvedValue(),
        getExtensionAnalyticsOverview: vi.fn().mockResolvedValue({ ok: false }),
        getExtensionAnalyticsChartData: vi.fn().mockResolvedValue({ ok: false }),
        loginWithGitHub: vi.fn(),
        loginToLicenseServer: vi.fn(),
        registerToLicenseServer: vi.fn(),
        requestPasswordReset: vi.fn(),
        getLicenseServerEnvironments: vi.fn().mockResolvedValue([]),
        getLicenseServerConfig: vi.fn().mockResolvedValue({}),
        setLicenseServerConfig: vi.fn().mockResolvedValue(undefined),
        onGitHubOAuthSuccess: vi.fn().mockReturnValue(() => {}),
        onGitHubOAuthError: vi.fn().mockReturnValue(() => {}),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  describe('Components', () => {
    it('NavBar has no a11y violations', async () => {
      const NavBar = (await import('./components/NavBar.vue')).default;
      const wrapper = mount(NavBar, { global: { plugins: [createPinia()] } });
      await wrapper.vm.$nextTick();
      const results = await runAxe(wrapper);
      expect(results).toHaveNoViolations();
      try { wrapper.unmount(); } catch { /* ignore unmount errors */ }
    });

    it('Sidebar has no a11y violations', async () => {
      const Sidebar = (await import('./components/Sidebar.vue')).default;
      const wrapper = mount(Sidebar, { global: { plugins: [createPinia()] } });
      await wrapper.vm.$nextTick();
      const results = await runAxe(wrapper);
      expect(results).toHaveNoViolations();
      try { wrapper.unmount(); } catch { /* ignore unmount errors */ }
    });

    it('ScreenReaderAnnouncer has no a11y violations', async () => {
      const ScreenReaderAnnouncer = (await import('./components/ScreenReaderAnnouncer.vue')).default;
      const wrapper = mount(ScreenReaderAnnouncer, { global: { plugins: [createPinia()] } });
      await wrapper.vm.$nextTick();
      const results = await runAxe(wrapper);
      expect(results).toHaveNoViolations();
      try { wrapper.unmount(); } catch { /* ignore unmount errors */ }
    });

    it('LoadingOverlay has no a11y violations when visible', async () => {
      const LoadingOverlay = (await import('./components/LoadingOverlay.vue')).default;
      const wrapper = mount(LoadingOverlay, { global: { plugins: [createPinia()] } });
      await wrapper.vm.$nextTick();
      // LoadingOverlay teleports to body
      const results = await axe(document.body);
      expect(results).toHaveNoViolations();
      try { wrapper.unmount(); } catch { /* ignore unmount errors */ }
    });

    it('LoadingBar has no a11y violations when visible', async () => {
      const { useAppStore } = await import('./stores/app');
      const pinia = createPinia();
      setActivePinia(pinia);
      const store = useAppStore();
      store.loadingBarVisible = true;
      const LoadingBar = (await import('./components/LoadingBar.vue')).default;
      const wrapper = mount(LoadingBar, { global: { plugins: [pinia] } });
      await wrapper.vm.$nextTick();
      const results = await axe(document.body);
      expect(results).toHaveNoViolations();
      try { wrapper.unmount(); } catch { /* ignore unmount errors */ }
    });

    it('CommandPalette has no a11y violations when open', async () => {
      const { useCommandPalette } = await import('./commandPalette/useCommandPalette');
      const palette = useCommandPalette();
      palette.open();
      const CommandPalette = (await import('./components/CommandPalette.vue')).default;
      const wrapper = mount(CommandPalette, { global: { plugins: [createPinia()] } });
      await wrapper.vm.$nextTick();
      await flushPromises();
      // Dialog teleports to body
      const results = await axe(document.body);
      expect(results).toHaveNoViolations();
      try { wrapper.unmount(); } catch { /* ignore unmount errors */ }
    });

    it('NoSelection has no a11y violations', async () => {
      const NoSelection = (await import('./views/NoSelection.vue')).default;
      const wrapper = mount(NoSelection);
      await wrapper.vm.$nextTick();
      const results = await runAxe(wrapper);
      expect(results).toHaveNoViolations();
      try { wrapper.unmount(); } catch { /* ignore unmount errors */ }
    });
  });

  describe('Views', () => {
    it('DashboardView has no a11y violations', async () => {
      const DashboardView = (await import('./views/DashboardView.vue')).default;
      const wrapper = mount(DashboardView, { global: { plugins: [createPinia()] } });
      await flushPromises();
      const results = await runAxe(wrapper);
      expect(results).toHaveNoViolations();
      try { wrapper.unmount(); } catch { /* ignore unmount errors */ }
    });

    it('DetailView has no a11y violations when loaded', async () => {
      const { useAppStore } = await import('./stores/app');
      const pinia = createPinia();
      setActivePinia(pinia);
      const store = useAppStore();
      store.selectedPath = '/test/project';
      const DetailView = (await import('./views/DetailView.vue')).default;
      const wrapper = mount(DetailView, { global: { plugins: [pinia] } });
      await flushPromises();
      await new Promise((r) => setTimeout(r, 100));
      await flushPromises();
      const results = await runAxe(wrapper);
      expect(results).toHaveNoViolations();
      try { wrapper.unmount(); } catch { /* ignore unmount errors */ }
    });

    it('SettingsView has no a11y violations', async () => {
      const SettingsView = (await import('./views/SettingsView.vue')).default;
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await wrapper.vm.$nextTick();
      const results = await runAxe(wrapper);
      expect(results).toHaveNoViolations();
      try { wrapper.unmount(); } catch { /* ignore unmount errors */ }
    });

    it('ExtensionsView has no a11y violations', async () => {
      const ExtensionsView = (await import('./views/ExtensionsView.vue')).default;
      const wrapper = mount(ExtensionsView, { global: { plugins: [createPinia()] } });
      await flushPromises();
      await new Promise((r) => setTimeout(r, 50));
      const results = await runAxe(wrapper);
      expect(results).toHaveNoViolations();
      try { wrapper.unmount(); } catch { /* ignore unmount errors */ }
    });

    it('LoginRequiredView has no a11y violations', async () => {
      const LoginRequiredView = (await import('./views/LoginRequiredView.vue')).default;
      const wrapper = mount(LoginRequiredView, { global: { plugins: [createPinia()] } });
      await wrapper.vm.$nextTick();
      const results = await runAxe(wrapper);
      expect(results).toHaveNoViolations();
      try { wrapper.unmount(); } catch { /* ignore unmount errors */ }
    });
  });
});
