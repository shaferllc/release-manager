import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useLicense } from '../composables/useLicense';
import SettingsView from './SettingsView.vue';
import { flushPromises, goToWebhooksSection } from './SettingsView.spec-helpers';

describe('SettingsView > Webhooks', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    window.releaseManager = {
      ...window.releaseManager,
      getLicenseStatus: vi.fn().mockResolvedValue({ hasLicense: false }),
      getWebhooks: vi.fn().mockResolvedValue({ ok: true, webhooks: [], available_events: [] }),
      createWebhook: vi.fn().mockResolvedValue({ ok: true }),
      updateWebhook: vi.fn().mockResolvedValue({ ok: true }),
      deleteWebhook: vi.fn().mockResolvedValue({ ok: true }),
      testWebhook: vi.fn().mockResolvedValue({ ok: true }),
      setPreference: vi.fn().mockResolvedValue(),
    };
  });

  describe('logged-out state', () => {
    it('shows Sign in to manage webhooks when not logged in', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToWebhooksSection(wrapper);
      expect(wrapper.text()).toMatch(/Webhooks/);
      expect(wrapper.text()).toMatch(/Sign in to manage webhooks/);
    });

    it('does not call getWebhooks when not logged in', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToWebhooksSection(wrapper);
      await flushPromises();
      expect(window.releaseManager.getWebhooks).not.toHaveBeenCalled();
    });
  });

  describe('logged-in state', () => {
    beforeEach(async () => {
      window.releaseManager.getLicenseStatus = vi.fn().mockResolvedValue({ hasLicense: true });
      await useLicense().loadStatus();
    });

    it('renders Webhooks section with Add webhook and Refresh buttons', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToWebhooksSection(wrapper);
      await flushPromises();
      expect(wrapper.text()).toMatch(/Webhooks/);
      expect(wrapper.text()).toMatch(/Add webhook/);
      expect(wrapper.html()).toMatch(/pi-refresh/);
    });

    it('calls getWebhooks when section is shown and user is logged in', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToWebhooksSection(wrapper);
      await flushPromises();
      expect(window.releaseManager.getWebhooks).toHaveBeenCalled();
    });

    it('shows empty state when no webhooks are configured', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToWebhooksSection(wrapper);
      await flushPromises();
      expect(wrapper.text()).toMatch(/No webhooks configured/);
      expect(wrapper.text()).toMatch(/Webhooks let you send real-time notifications to external services when events happen/);
    });

    it('shows webhook list when getWebhooks returns webhooks', async () => {
      window.releaseManager.getWebhooks = vi.fn().mockResolvedValue({
        ok: true,
        webhooks: [
          { id: 'wh-1', url: 'https://example.com/hook', description: 'Test', events: ['release.created'], is_active: true },
        ],
        available_events: ['release.created', 'project.synced'],
      });
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToWebhooksSection(wrapper);
      await flushPromises();
      expect(wrapper.text()).toMatch(/https:\/\/example\.com\/hook/);
      expect(wrapper.text()).toMatch(/Active/);
      expect(wrapper.text()).toMatch(/1 event/);
    });

    it('opens Add Webhook dialog when Add webhook is clicked', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToWebhooksSection(wrapper);
      await flushPromises();
      const addBtn = wrapper.findAll('button').find((b) => b.text().includes('Add webhook'));
      expect(addBtn?.exists()).toBe(true);
      if (addBtn) {
        await addBtn.trigger('click');
        await flushPromises();
        const dialogText = document.body.textContent;
        expect(dialogText).toMatch(/Add Webhook/);
        expect(dialogText).toMatch(/URL/);
        expect(dialogText).toMatch(/Description/);
        expect(dialogText).toMatch(/Secret/);
        expect(dialogText).toMatch(/Create/);
      }
    });

    it('calls createWebhook when form is valid and Create is clicked', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToWebhooksSection(wrapper);
      await flushPromises();
      const addBtn = wrapper.findAll('button').find((b) => b.text().includes('Add webhook'));
      if (!addBtn?.exists()) throw new Error('Add webhook button not found');
      await addBtn.trigger('click');
      await flushPromises();
      const handleSave = wrapper.vm.handleSaveWebhook;
      expect(typeof handleSave).toBe('function');
      Object.assign(wrapper.vm.whForm, { url: 'https://example.com/webhook', description: '', secret: '', events: [], is_active: true });
      await handleSave();
      await flushPromises();
      expect(window.releaseManager.createWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://example.com/webhook',
          description: '',
          events: [],
          is_active: true,
        }),
      );
    });

    it('shows URL is required error when Create is clicked with empty URL', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToWebhooksSection(wrapper);
      await flushPromises();
      const addBtn = wrapper.findAll('button').find((b) => b.text().includes('Add webhook'));
      if (!addBtn?.exists()) throw new Error('Add webhook button not found');
      await addBtn.trigger('click');
      await flushPromises();
      const createBtn = [...document.body.querySelectorAll('button')].find((b) => b.textContent?.includes('Create'));
      expect(createBtn).toBeTruthy();
      if (createBtn) {
        createBtn.click();
        await flushPromises();
      }
      expect(document.body.textContent).toMatch(/URL is required/);
      expect(window.releaseManager.createWebhook).not.toHaveBeenCalled();
    });

    it('calls getWebhooks when Refresh is clicked', async () => {
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToWebhooksSection(wrapper);
      await flushPromises();
      vi.clearAllMocks();
      const webhooksSection = wrapper.findAll('.settings-section').find((s) => s.text().includes('Add webhook'));
      const refreshBtn = webhooksSection?.findAll('button').find((b) => b.html().includes('pi-refresh'));
      expect(refreshBtn?.exists()).toBe(true);
      if (refreshBtn) {
        await refreshBtn.trigger('click');
        await flushPromises();
        expect(window.releaseManager.getWebhooks).toHaveBeenCalled();
      }
    });

    it('opens Edit Webhook dialog when Edit is clicked on a webhook', async () => {
      window.releaseManager.getWebhooks = vi.fn().mockResolvedValue({
        ok: true,
        webhooks: [
          { id: 'wh-1', url: 'https://example.com/hook', description: 'Test', events: ['release.created'], is_active: true },
        ],
        available_events: ['release.created'],
      });
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToWebhooksSection(wrapper);
      await flushPromises();
      const webhooksSection = wrapper.findAll('.settings-section').find((s) => s.text().includes('https://example.com/hook'));
      const editBtn = webhooksSection?.findAll('button').find((b) => b.html().includes('pi-pencil'));
      expect(editBtn?.exists()).toBe(true);
      if (editBtn) {
        await editBtn.trigger('click');
        await flushPromises();
        expect(document.body.textContent).toMatch(/Edit Webhook/);
        expect(document.body.textContent).toMatch(/Save/);
      }
    });

    it('calls updateWebhook when form is valid and Save is clicked in edit mode', async () => {
      window.releaseManager.getWebhooks = vi.fn().mockResolvedValue({
        ok: true,
        webhooks: [
          { id: 'wh-1', url: 'https://example.com/hook', description: 'Test', events: [], is_active: true },
        ],
        available_events: [],
      });
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToWebhooksSection(wrapper);
      await flushPromises();
      const webhooksSection = wrapper.findAll('.settings-section').find((s) => s.text().includes('https://example.com/hook'));
      const editBtn = webhooksSection?.findAll('button').find((b) => b.html().includes('pi-pencil'));
      if (!editBtn?.exists()) throw new Error('Edit button not found');
      await editBtn.trigger('click');
      await flushPromises();
      const handleSave = wrapper.vm.handleSaveWebhook;
      expect(typeof handleSave).toBe('function');
      Object.assign(wrapper.vm.whForm, { url: 'https://example.com/hook', description: 'Test', secret: '', events: [], is_active: true });
      wrapper.vm.whEditing = { id: 'wh-1', url: 'https://example.com/hook', description: 'Test', events: [], is_active: true };
      await handleSave();
      await flushPromises();
      expect(window.releaseManager.updateWebhook).toHaveBeenCalledWith(
        'wh-1',
        expect.objectContaining({
          url: 'https://example.com/hook',
          description: 'Test',
          events: [],
          is_active: true,
        }),
      );
    });

    it('calls deleteWebhook when Delete is clicked and user confirms', async () => {
      const origConfirm = window.confirm;
      window.confirm = vi.fn().mockReturnValue(true);
      window.releaseManager.getWebhooks = vi.fn().mockResolvedValue({
        ok: true,
        webhooks: [
          { id: 'wh-1', url: 'https://example.com/hook', description: 'Test', events: [], is_active: true },
        ],
        available_events: [],
      });
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToWebhooksSection(wrapper);
      await flushPromises();
      const webhooksSection = wrapper.findAll('.settings-section').find((s) => s.text().includes('https://example.com/hook'));
      const deleteBtn = webhooksSection?.findAll('button').find((b) => b.html().includes('pi-trash'));
      expect(deleteBtn?.exists()).toBe(true);
      if (deleteBtn) {
        await deleteBtn.trigger('click');
        await flushPromises();
        expect(window.releaseManager.deleteWebhook).toHaveBeenCalledWith('wh-1');
      }
      window.confirm = origConfirm;
    });

    it('does not call deleteWebhook when Delete is clicked and user cancels', async () => {
      const origConfirm = window.confirm;
      window.confirm = vi.fn().mockReturnValue(false);
      window.releaseManager.getWebhooks = vi.fn().mockResolvedValue({
        ok: true,
        webhooks: [
          { id: 'wh-1', url: 'https://example.com/hook', description: 'Test', events: [], is_active: true },
        ],
        available_events: [],
      });
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToWebhooksSection(wrapper);
      await flushPromises();
      const webhooksSection = wrapper.findAll('.settings-section').find((s) => s.text().includes('https://example.com/hook'));
      const deleteBtn = webhooksSection?.findAll('button').find((b) => b.html().includes('pi-trash'));
      if (!deleteBtn?.exists()) throw new Error('Delete button not found');
      await deleteBtn.trigger('click');
      await flushPromises();
      expect(window.releaseManager.deleteWebhook).not.toHaveBeenCalled();
      window.confirm = origConfirm;
    });

    it('calls testWebhook when Send test ping is clicked', async () => {
      window.releaseManager.getWebhooks = vi.fn().mockResolvedValue({
        ok: true,
        webhooks: [
          { id: 'wh-1', url: 'https://example.com/hook', description: 'Test', events: [], is_active: true },
        ],
        available_events: [],
      });
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToWebhooksSection(wrapper);
      await flushPromises();
      const webhooksSection = wrapper.findAll('.settings-section').find((s) => s.text().includes('https://example.com/hook'));
      const testBtn = webhooksSection?.findAll('button').find((b) => b.html().includes('pi-play'));
      expect(testBtn?.exists()).toBe(true);
      if (testBtn) {
        await testBtn.trigger('click');
        await flushPromises();
        expect(window.releaseManager.testWebhook).toHaveBeenCalledWith('wh-1');
      }
    });

    it('shows error when getWebhooks fails', async () => {
      window.releaseManager.getWebhooks = vi.fn().mockResolvedValue({ ok: false, error: 'Failed to load' });
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToWebhooksSection(wrapper);
      await flushPromises();
      const webhooksSection = wrapper.findAll('.settings-section').find((s) => s.text().includes('Webhooks'));
      expect(webhooksSection?.text()).toMatch(/Failed to load/);
    });

    it('shows Inactive badge for inactive webhook', async () => {
      window.releaseManager.getWebhooks = vi.fn().mockResolvedValue({
        ok: true,
        webhooks: [
          { id: 'wh-1', url: 'https://example.com/hook', description: 'Test', events: [], is_active: false },
        ],
        available_events: [],
      });
      const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
      await goToWebhooksSection(wrapper);
      await flushPromises();
      const webhooksSection = wrapper.findAll('.settings-section').find((s) => s.text().includes('Add webhook'));
      expect(webhooksSection?.text()).toMatch(/Inactive/);
    });
  });
});
