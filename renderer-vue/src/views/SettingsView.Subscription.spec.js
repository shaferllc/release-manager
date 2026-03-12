import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useLicense } from '../composables/useLicense';
import SettingsView from './SettingsView.vue';
import { flushPromises, goToSubscriptionSection } from './SettingsView.spec-helpers';

describe('SettingsView > Subscription', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    window.releaseManager = {
      ...window.releaseManager,
      getLicenseStatus: vi.fn().mockResolvedValue({ hasLicense: false }),
      getLicenseServerConfig: vi.fn().mockResolvedValue({}),
      openUrl: vi.fn(),
    };
  });

  describe('logged-out state', () => {
    beforeEach(() => {
      window.releaseManager.getLicenseStatus = vi.fn().mockResolvedValue({ hasLicense: false });
    });

    it('renders Subscription section with current plan banner', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToSubscriptionSection(wrapper);
      expect(wrapper.text()).toMatch(/Current plan/);
      expect(wrapper.text()).toMatch(/Free/);
    });

    it('shows Upgrade and Manage billing buttons', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToSubscriptionSection(wrapper);
      expect(wrapper.text()).toMatch(/Upgrade/);
      expect(wrapper.text()).toMatch(/Manage billing/);
    });

    it('shows Sign in to manage your subscription when logged out', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToSubscriptionSection(wrapper);
      expect(wrapper.text()).toMatch(/Sign in to manage your subscription/);
    });

    it('shows Free, Pro, Team tier cards', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToSubscriptionSection(wrapper);
      expect(wrapper.text()).toMatch(/Free/);
      expect(wrapper.text()).toMatch(/Pro/);
      expect(wrapper.text()).toMatch(/Team/);
      expect(wrapper.text()).toMatch(/\$0/);
      expect(wrapper.text()).toMatch(/\$9/);
      expect(wrapper.text()).toMatch(/\$29/);
    });

    it('shows feature comparison table with Limits, Core, Pro features, Team features', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToSubscriptionSection(wrapper);
      expect(wrapper.text()).toMatch(/Limits/);
      expect(wrapper.text()).toMatch(/Core/);
      expect(wrapper.text()).toMatch(/Pro features/);
      expect(wrapper.text()).toMatch(/Team features/);
      expect(wrapper.text()).toMatch(/Projects/);
      expect(wrapper.text()).toMatch(/Extensions/);
      expect(wrapper.text()).toMatch(/Releases & version bumps/);
    });

    it('shows tier icons in tier cards', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToSubscriptionSection(wrapper);
      const tierIcons = wrapper.findAll('.sub-tier-icon');
      expect(tierIcons.length).toBe(3);
    });

    it('Upgrade button is disabled when logged out', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToSubscriptionSection(wrapper);
      const upgradeBtn = wrapper.findAll('button').find((b) => b.text().includes('Upgrade'));
      expect(upgradeBtn.exists()).toBe(true);
      expect(upgradeBtn.attributes('disabled')).toBeDefined();
    });
  });

  describe('logged-in state', () => {
    const loggedInStatus = {
      hasLicense: true,
      email: 'user@example.com',
      tier: 'pro',
      plan: 'pro',
      plan_label: 'Pro',
      permissions: { tabs: ['dashboard', 'git'] },
      limits: { max_projects: 50, max_extensions: 25 },
    };

    beforeEach(async () => {
      window.releaseManager.getLicenseStatus = vi.fn().mockResolvedValue(loggedInStatus);
      await useLicense().loadStatus();
    });

    it('shows current plan as Pro', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToSubscriptionSection(wrapper);
      await flushPromises();
      expect(wrapper.text()).toMatch(/Pro/);
      expect(wrapper.text()).toMatch(/Current plan/);
    });

    it('shows plan limits when logged in', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToSubscriptionSection(wrapper);
      await flushPromises();
      expect(wrapper.text()).toMatch(/Plan limits/);
      expect(wrapper.text()).toMatch(/50 projects/);
      expect(wrapper.text()).toMatch(/25 extensions/);
    });

    it('does not show Upgrade button when on Pro plan', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToSubscriptionSection(wrapper);
      await flushPromises();
      const subscriptionSection = wrapper.find('.settings-section');
      expect(subscriptionSection.exists()).toBe(true);
      const upgradeBtns = subscriptionSection.findAll('button').filter((b) => b.text().includes('Upgrade'));
      expect(upgradeBtns.length).toBe(0);
    });

    it('shows Manage billing button when logged in', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToSubscriptionSection(wrapper);
      await flushPromises();
      const manageBtn = wrapper.findAll('button').find((b) => b.text().includes('Manage billing'));
      expect(manageBtn.exists()).toBe(true);
    });

    it('shows team info when user has team', async () => {
      window.releaseManager.getLicenseStatus = vi.fn().mockResolvedValue({
        ...loggedInStatus,
        team: { id: 1, name: 'Acme Corp', member_count: 5 },
      });
      await useLicense().loadStatus();
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToSubscriptionSection(wrapper);
      await flushPromises();
      expect(wrapper.text()).toMatch(/Team/);
      expect(wrapper.text()).toMatch(/Acme Corp/);
      expect(wrapper.text()).toMatch(/5 members/);
    });

    it('shows Unlimited for -1 limits', async () => {
      window.releaseManager.getLicenseStatus = vi.fn().mockResolvedValue({
        ...loggedInStatus,
        limits: { max_projects: -1, max_extensions: -1 },
      });
      await useLicense().loadStatus();
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToSubscriptionSection(wrapper);
      await flushPromises();
      expect(wrapper.text()).toMatch(/Unlimited/);
    });
  });

  describe('Free plan logged in', () => {
    const freePlanStatus = {
      hasLicense: true,
      email: 'free@example.com',
      tier: 'free',
      plan: 'free',
      plan_label: 'Free',
      permissions: { tabs: ['dashboard'] },
      limits: { max_projects: 3, max_extensions: 3 },
    };

    beforeEach(async () => {
      window.releaseManager.getLicenseStatus = vi.fn().mockResolvedValue(freePlanStatus);
      await useLicense().loadStatus();
    });

    it('shows Upgrade button when on Free plan', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToSubscriptionSection(wrapper);
      await flushPromises();
      const upgradeBtn = wrapper.findAll('button').find((b) => b.text().includes('Upgrade'));
      expect(upgradeBtn.exists()).toBe(true);
    });

    it('shows plan limits 3 projects, 3 extensions', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToSubscriptionSection(wrapper);
      await flushPromises();
      expect(wrapper.text()).toMatch(/3 projects/);
      expect(wrapper.text()).toMatch(/3 extensions/);
    });

    it('calls openUrl when Upgrade clicked (free plan)', async () => {
      window.releaseManager.getLicenseServerConfig = vi.fn().mockResolvedValue({ url: 'https://shipwell.example.com' });
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToSubscriptionSection(wrapper);
      await flushPromises();
      const upgradeBtn = wrapper.findAll('button').find((b) => b.text().includes('Upgrade'));
      expect(upgradeBtn.exists()).toBe(true);
      await upgradeBtn.trigger('click');
      await flushPromises();
      expect(window.releaseManager.openUrl).toHaveBeenCalledWith('https://shipwell.example.com/pricing');
    });

    it('calls openUrl when Manage billing clicked', async () => {
      window.releaseManager.getLicenseServerConfig = vi.fn().mockResolvedValue({ url: 'https://shipwell.example.com' });
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToSubscriptionSection(wrapper);
      await flushPromises();
      const manageBtn = wrapper.findAll('button').find((b) => b.text().includes('Manage billing'));
      expect(manageBtn.exists()).toBe(true);
      await manageBtn.trigger('click');
      await flushPromises();
      expect(window.releaseManager.openUrl).toHaveBeenCalledWith('https://shipwell.example.com/billing/portal');
    });
  });
});
