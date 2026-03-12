import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SettingsView from './SettingsView.vue';
import { flushPromises, goToAiSection } from './SettingsView.spec-helpers';

describe('SettingsView > AI', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    window.releaseManager = {
      ...window.releaseManager,
      getLicenseStatus: vi.fn().mockResolvedValue({ hasLicense: false }),
      getOllamaSettings: vi.fn().mockResolvedValue({ baseUrl: 'http://localhost:11434', model: 'llama3.2' }),
      setOllamaSettings: vi.fn().mockResolvedValue(),
      getLmStudioSettings: vi.fn().mockResolvedValue({ baseUrl: 'http://localhost:1234/v1', model: '' }),
      setLmStudioSettings: vi.fn().mockResolvedValue(),
      getClaudeSettings: vi.fn().mockResolvedValue({ apiKey: '', model: 'claude-sonnet-4-20250514' }),
      getOpenAISettings: vi.fn().mockResolvedValue({ apiKey: '', model: 'gpt-4o-mini' }),
      getGeminiSettings: vi.fn().mockResolvedValue({ apiKey: '', model: 'gemini-1.5-flash' }),
      getGroqSettings: vi.fn().mockResolvedValue({ apiKey: '', model: 'llama-3.3-70b-versatile' }),
      getMistralSettings: vi.fn().mockResolvedValue({ apiKey: '', model: 'mistral-small-latest' }),
      getAiProvider: vi.fn().mockResolvedValue('ollama'),
      setAiProvider: vi.fn().mockResolvedValue(),
      getAiParams: vi.fn().mockResolvedValue({ temperature: 0.7, max_tokens: 2048, top_p: 0.9 }),
      setAiParams: vi.fn().mockResolvedValue(),
      ollamaListModels: vi.fn().mockResolvedValue({ ok: true, models: ['llama3.2', 'codellama'] }),
      lmStudioListModels: vi.fn().mockResolvedValue({ ok: true, models: ['local-model'] }),
      getPreference: vi.fn().mockImplementation((key) => {
        if (key === 'aiOnboardingDismissed') return Promise.resolve(false);
        return Promise.resolve(undefined);
      }),
    };
  });

  it('renders AI section with Provider select', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToAiSection(wrapper);
    expect(wrapper.text()).toMatch(/AI|Provider/);
    const providerSelect = wrapper.findAllComponents({ name: 'Select' }).find((s) => s.props('options')?.some?.((o) => o.value === 'ollama'));
    expect(providerSelect.exists()).toBe(true);
  });

  it('shows Ollama config when Ollama is selected', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToAiSection(wrapper);
    expect(wrapper.text()).toMatch(/Ollama/);
    expect(wrapper.text()).toMatch(/Base URL/);
    expect(wrapper.text()).toMatch(/List models/);
  });

  it('shows LM Studio config when LM Studio is selected', async () => {
    window.releaseManager.getAiProvider = vi.fn().mockResolvedValue('lmstudio');
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToAiSection(wrapper);
    await flushPromises();
    const providerSelect = wrapper.findAllComponents({ name: 'Select' }).find((s) => {
      const opts = s.props('options') || [];
      return opts.some((o) => o.value === 'lmstudio');
    });
    if (providerSelect.exists()) {
      await providerSelect.vm.$emit('update:modelValue', 'lmstudio');
      await flushPromises();
      await wrapper.vm.$nextTick();
    }
    expect(wrapper.text()).toMatch(/LM Studio/);
    expect(wrapper.text()).toMatch(/Base URL|List models/);
  });

  it('shows Model parameters (temperature, max tokens, top p)', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToAiSection(wrapper);
    expect(wrapper.text()).toMatch(/Model parameters/);
    expect(wrapper.text()).toMatch(/Temperature/);
    expect(wrapper.text()).toMatch(/Max tokens/);
    expect(wrapper.text()).toMatch(/Top P/);
  });

  it('calls setAiProvider when provider is changed', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToAiSection(wrapper);
    const providerSelect = wrapper.findAllComponents({ name: 'Select' }).find((s) => {
      const opts = s.props('options') || [];
      return opts.some((o) => o.value === 'claude');
    });
    expect(providerSelect.exists()).toBe(true);
    await providerSelect.vm.$emit('update:modelValue', 'claude');
    await providerSelect.vm.$emit('change');
    await flushPromises();
    expect(window.releaseManager.setAiProvider).toHaveBeenCalledWith('claude');
  });

  it('calls setOllamaSettings when Ollama base URL is blurred', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToAiSection(wrapper);
    const baseUrlInput = wrapper.find('input[placeholder="http://localhost:11434"]');
    expect(baseUrlInput.exists()).toBe(true);
    await baseUrlInput.setValue('http://127.0.0.1:11434');
    await baseUrlInput.trigger('blur');
    await flushPromises();
    expect(window.releaseManager.setOllamaSettings).toHaveBeenCalled();
  });

  it('calls ollamaListModels when List models is clicked', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToAiSection(wrapper);
    const listBtn = wrapper.findAll('button').find((b) => b.text().includes('List models'));
    expect(listBtn.exists()).toBe(true);
    await listBtn.trigger('click');
    await flushPromises();
    expect(window.releaseManager.ollamaListModels).toHaveBeenCalled();
  });

  it('shows AI onboarding when model not configured', async () => {
    window.releaseManager.getOllamaSettings = vi.fn().mockResolvedValue({ baseUrl: 'http://localhost:11434', model: '' });
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToAiSection(wrapper);
    await flushPromises();
    expect(wrapper.find('.ai-onboarding-card').exists()).toBe(true);
    expect(wrapper.text()).toMatch(/Get started with AI/);
  });

  it('dismisses onboarding when Got it is clicked', async () => {
    window.releaseManager.getOllamaSettings = vi.fn().mockResolvedValue({ baseUrl: '', model: '' });
    window.releaseManager.setPreference = vi.fn().mockResolvedValue();
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToAiSection(wrapper);
    await flushPromises();
    const gotItBtn = wrapper.find('.ai-onboarding-card').find('button');
    expect(gotItBtn.exists()).toBe(true);
    await gotItBtn.trigger('click');
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('aiOnboardingDismissed', true);
  });

  it('shows Claude config when Claude is selected', async () => {
    window.releaseManager.getAiProvider = vi.fn().mockResolvedValue('claude');
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToAiSection(wrapper);
    await flushPromises();
    expect(wrapper.text()).toMatch(/Claude/);
    expect(wrapper.text()).toMatch(/API key/);
  });

  it('shows OpenAI config when OpenAI is selected', async () => {
    window.releaseManager.getAiProvider = vi.fn().mockResolvedValue('openai');
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToAiSection(wrapper);
    await flushPromises();
    expect(wrapper.text()).toMatch(/OpenAI/);
    expect(wrapper.text()).toMatch(/API key/);
  });
});
