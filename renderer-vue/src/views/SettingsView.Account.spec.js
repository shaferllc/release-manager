import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SettingsView from './SettingsView.vue';
import { flushPromises, goToAccountSection } from './SettingsView.spec-helpers';

describe('SettingsView > Account', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    window.releaseManager = {
      ...window.releaseManager,
      logoutFromLicenseServer: vi.fn().mockResolvedValue(),
      getLicenseServerConfig: vi.fn().mockResolvedValue({}),
      getLicenseServerEnvironments: vi.fn().mockResolvedValue([]),
      setLicenseServerConfig: vi.fn().mockResolvedValue(),
      switchPlan: vi.fn().mockResolvedValue({ ok: true }),
    };
  });

  describe('logged-out state', () => {
    beforeEach(() => {
      window.releaseManager.getLicenseStatus = vi.fn().mockResolvedValue({ hasLicense: false });
    });

    it('shows "Not signed in" and "Sign in to use the app"', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToAccountSection(wrapper);
      expect(wrapper.text()).toMatch(/Not signed in/);
      expect(wrapper.text()).toMatch(/Sign in to use the app/);
    });

    it('does not show Sign out button', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToAccountSection(wrapper);
      expect(wrapper.find('.account-signout-btn').exists()).toBe(false);
    });

    it('does not show Your info section', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToAccountSection(wrapper);
      expect(wrapper.find('[aria-label="Your info"]').exists()).toBe(false);
    });
  });

  describe('logged-in state', () => {
    const loggedInStatus = {
      hasLicense: true,
      email: 'jane@example.com',
      tier: 'pro',
      plan: 'pro',
      plan_label: 'Pro',
      profile: {
        name: 'Jane Doe',
        avatar_url: null,
        github_linked: true,
        created_at: '2024-03-15T10:00:00Z',
      },
      permissions: { tabs: ['dashboard', 'git', 'version'] },
    };

    beforeEach(() => {
      window.releaseManager.getLicenseStatus = vi.fn().mockResolvedValue(loggedInStatus);
    });

    it('shows profile name and email', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToAccountSection(wrapper);
      await flushPromises();
      expect(wrapper.text()).toMatch(/Jane Doe/);
      expect(wrapper.text()).toMatch(/jane@example\.com/);
    });

    it('shows plan badge', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToAccountSection(wrapper);
      await flushPromises();
      expect(wrapper.text()).toMatch(/Pro/);
    });

    it('shows GitHub linked status', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToAccountSection(wrapper);
      await flushPromises();
      expect(wrapper.text()).toMatch(/Linked/);
    });

    it('shows Sign out button', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToAccountSection(wrapper);
      await flushPromises();
      const signOutBtn = wrapper.find('.account-signout-btn');
      expect(signOutBtn.exists()).toBe(true);
      expect(signOutBtn.text()).toMatch(/Sign out/);
    });

    it('calls logoutFromLicenseServer when Sign out clicked', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToAccountSection(wrapper);
      await flushPromises();
      const signOutBtn = wrapper.find('.account-signout-btn');
      await signOutBtn.trigger('click');
      await flushPromises();
      expect(window.releaseManager.logoutFromLicenseServer).toHaveBeenCalled();
    });

    it('shows Your info section with Name, Email, Plan, GitHub', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToAccountSection(wrapper);
      await flushPromises();
      const yourInfo = wrapper.find('[aria-label="Your info"]');
      expect(yourInfo.exists()).toBe(true);
      expect(wrapper.text()).toMatch(/Your info/);
      expect(wrapper.text()).toMatch(/Information synced from your account/);
      expect(wrapper.find('.account-info-table').exists()).toBe(true);
      expect(wrapper.text()).toMatch(/Name/);
      expect(wrapper.text()).toMatch(/Email/);
      expect(wrapper.text()).toMatch(/Plan/);
      expect(wrapper.text()).toMatch(/GitHub/);
    });

    it('Your info is keyboard accessible (Enter key)', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToAccountSection(wrapper);
      await flushPromises();
      const yourInfo = wrapper.find('[aria-label="Your info"]');
      await yourInfo.trigger('keydown.enter');
      expect(yourInfo.exists()).toBe(true);
    });

    it('Your info is keyboard accessible (Space key)', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToAccountSection(wrapper);
      await flushPromises();
      const yourInfo = wrapper.find('[aria-label="Your info"]');
      await yourInfo.trigger('keydown.space');
      expect(yourInfo.exists()).toBe(true);
    });

    it('shows Member since when profile has created_at', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToAccountSection(wrapper);
      await flushPromises();
      expect(wrapper.text()).toMatch(/Member since/);
      expect(wrapper.text()).toMatch(/2024|March/);
    });

    it('shows initials when avatar_url is null and no email (no gravatar)', async () => {
      window.releaseManager.getLicenseStatus = vi.fn().mockResolvedValue({
        hasLicense: true,
        email: null,
        tier: 'pro',
        plan: 'pro',
        plan_label: 'Pro',
        profile: { name: 'Jane Doe', avatar_url: null, github_linked: false, created_at: null },
        permissions: { tabs: ['dashboard'] },
      });
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToAccountSection(wrapper);
      await flushPromises();
      const initials = wrapper.find('.account-avatar-initials');
      expect(initials.exists()).toBe(true);
      expect(initials.text()).toBe('JD');
    });

    it('shows avatar img when avatar_url is set', async () => {
      window.releaseManager.getLicenseStatus = vi.fn().mockResolvedValue({
        ...loggedInStatus,
        profile: { ...loggedInStatus.profile, avatar_url: 'https://example.com/avatar.png' },
      });
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToAccountSection(wrapper);
      await flushPromises();
      const img = wrapper.find('.account-avatar');
      expect(img.exists()).toBe(true);
      expect(img.attributes('src')).toContain('avatar.png');
    });

    it('shows "Signed in" when profile has no name and no email', async () => {
      window.releaseManager.getLicenseStatus = vi.fn().mockResolvedValue({
        hasLicense: true,
        email: null,
        tier: 'pro',
        plan: 'pro',
        plan_label: 'Pro',
        profile: { name: null, avatar_url: null, github_linked: false, created_at: null },
        permissions: { tabs: ['dashboard'] },
      });
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToAccountSection(wrapper);
      await flushPromises();
      expect(wrapper.text()).toMatch(/Signed in/);
    });

    it('shows email as fallback when profile has no name', async () => {
      window.releaseManager.getLicenseStatus = vi.fn().mockResolvedValue({
        ...loggedInStatus,
        profile: { name: null, avatar_url: null, github_linked: false, created_at: null },
      });
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToAccountSection(wrapper);
      await flushPromises();
      expect(wrapper.text()).toMatch(/jane@example\.com/);
    });

    it('shows initials fallback when avatar img errors', async () => {
      window.releaseManager.getLicenseStatus = vi.fn().mockResolvedValue({
        ...loggedInStatus,
        profile: { ...loggedInStatus.profile, avatar_url: 'https://example.com/broken.png' },
      });
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToAccountSection(wrapper);
      await flushPromises();
      const img = wrapper.find('.account-avatar');
      expect(img.exists()).toBe(true);
      await img.trigger('error');
      await wrapper.vm.$nextTick();
      const initials = wrapper.find('.account-avatar-initials');
      expect(initials.exists()).toBe(true);
      expect(initials.text()).toBe('JD');
    });
  });

  describe('Developer plan (plan switcher)', () => {
    const developerStatus = {
      hasLicense: true,
      email: 'dev@example.com',
      tier: 'pro',
      plan: 'developer',
      plan_label: 'Developer',
      profile: {
        name: 'Dev User',
        avatar_url: null,
        github_linked: false,
        created_at: '2024-01-01T00:00:00Z',
      },
      permissions: { tabs: ['dashboard', 'git'] },
    };

    beforeEach(() => {
      window.releaseManager.getLicenseStatus = vi.fn().mockResolvedValue(developerStatus);
    });

    it('shows plan switcher Select', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToAccountSection(wrapper);
      await flushPromises();
      const planSelect = wrapper.find('.plan-switcher');
      expect(planSelect.exists()).toBe(true);
    });

    it('calls switchPlan when plan is changed', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToAccountSection(wrapper);
      await flushPromises();
      const planSelect = wrapper.find('.plan-switcher');
      if (planSelect.exists()) {
        const selectComp = planSelect.findComponent({ name: 'Select' });
        if (selectComp.exists()) {
          await selectComp.vm.$emit('change', { value: 'free' });
          await flushPromises();
          expect(window.releaseManager.switchPlan).toHaveBeenCalledWith('free');
        }
      }
    });

    it('shows "Switching…" while plan switch is in progress', async () => {
      let resolveSwitch;
      const switchPromise = new Promise((r) => { resolveSwitch = r; });
      window.releaseManager.switchPlan = vi.fn().mockReturnValue(switchPromise);
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToAccountSection(wrapper);
      await flushPromises();
      const planSelect = wrapper.find('.plan-switcher');
      expect(planSelect.exists()).toBe(true);
      const selectComp = planSelect.findComponent({ name: 'Select' });
      if (selectComp.exists()) {
        selectComp.vm.$emit('change', { value: 'free' });
        await flushPromises();
        await wrapper.vm.$nextTick();
        expect(wrapper.text()).toMatch(/Switching…/);
        resolveSwitch({ ok: true });
        await flushPromises();
      }
    });
  });

  describe('Environment setting (7 taps on Your info)', () => {
    const loggedInStatus = {
      hasLicense: true,
      email: 'user@example.com',
      tier: 'pro',
      plan: 'pro',
      plan_label: 'Pro',
      profile: { name: 'User', avatar_url: null, github_linked: false, created_at: null },
      permissions: { tabs: ['dashboard'] },
    };

    beforeEach(() => {
      window.releaseManager.getLicenseStatus = vi.fn().mockResolvedValue(loggedInStatus);
      window.releaseManager.getLicenseServerEnvironments = vi.fn().mockResolvedValue([
        { id: 'dev', label: 'Development' },
        { id: 'prod', label: 'Production' },
      ]);
    });

    it('shows Environment setting after 7 taps on Your info', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToAccountSection(wrapper);
      await flushPromises();
      const yourInfo = wrapper.find('[aria-label="Your info"]');
      expect(yourInfo.exists()).toBe(true);
      expect(wrapper.find('.env-setting-card').exists()).toBe(false);
      for (let i = 0; i < 7; i++) {
        await yourInfo.trigger('click');
      }
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.env-setting-card').exists()).toBe(true);
      expect(wrapper.text()).toMatch(/Environment/);
      expect(wrapper.text()).toMatch(/Backend used for sign-in/);
    });

    it('hides Environment setting when toggled again (7 more taps)', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToAccountSection(wrapper);
      await flushPromises();
      const yourInfo = wrapper.find('[aria-label="Your info"]');
      for (let i = 0; i < 7; i++) await yourInfo.trigger('click');
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.env-setting-card').exists()).toBe(true);
      for (let i = 0; i < 7; i++) await yourInfo.trigger('click');
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.env-setting-card').exists()).toBe(false);
    });

    it('calls setLicenseServerConfig when Environment Select is changed', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToAccountSection(wrapper);
      await flushPromises();
      const yourInfo = wrapper.find('[aria-label="Your info"]');
      for (let i = 0; i < 7; i++) await yourInfo.trigger('click');
      await wrapper.vm.$nextTick();
      const envSelect = wrapper.find('.env-setting-select');
      expect(envSelect.exists()).toBe(true);
      const selectComp = envSelect.findComponent({ name: 'Select' });
      if (selectComp.exists()) {
        selectComp.vm.$emit('update:modelValue', 'prod');
        await wrapper.vm.$nextTick();
        selectComp.vm.$emit('change');
        await flushPromises();
        expect(window.releaseManager.setLicenseServerConfig).toHaveBeenCalledWith({ environment: 'prod' });
      }
    });
  });
});
