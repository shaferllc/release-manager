<template>
  <div class="flex-1 overflow-auto">
    <div class="w-full py-8 px-8">
      <h2 class="text-xl font-semibold text-rm-text tracking-tight mb-6">Settings</h2>
      <section class="card mb-6">
        <div class="card-section">
          <span class="card-label">GitHub token (default)</span>
          <p class="m-0 mb-4 text-sm text-rm-muted">
            Optional. Higher API limits and ability to create or update releases. Stored locally.
          </p>
          <input v-model="githubToken" type="password" class="input-field" placeholder="ghp_..." autocomplete="off" @blur="saveToken" />
        </div>
      </section>
      <section class="card mb-6">
        <div class="card-section">
          <label class="checkbox-label flex items-center gap-2 cursor-pointer">
            <input v-model="signCommits" type="checkbox" class="checkbox-input" @change="saveSignCommits" />
            <span class="card-label mb-0">Sign commits (GPG/SSH)</span>
          </label>
          <p class="m-0 mt-1 text-sm text-rm-muted">When enabled, commits use <code class="bg-rm-surface px-1 rounded text-xs">git commit -S</code>.</p>
        </div>
      </section>
      <section class="card mb-6">
        <div class="card-section">
          <span class="card-label">AI for generation</span>
          <p class="m-0 mb-4 text-sm text-rm-muted">Choose which provider to use for commit messages, release notes, and test-fix suggestions.</p>
          <label class="block text-xs font-medium text-rm-muted mb-1">Provider</label>
          <select v-model="aiProvider" class="input-field mb-4 max-w-xs" @change="saveAiProvider">
            <option value="ollama">Ollama (local)</option>
            <option value="claude">Claude (Anthropic API)</option>
          </select>
        </div>
      </section>
      <section class="card mb-6">
        <div class="card-section">
          <span class="card-label">Ollama (optional)</span>
          <p class="m-0 mb-4 text-sm text-rm-muted">Local models. Used when AI provider is Ollama.</p>
          <label class="block text-xs font-medium text-rm-muted mb-1">Base URL</label>
          <input v-model="ollamaBaseUrl" type="text" class="input-field mb-4" placeholder="http://localhost:11434" autocomplete="off" @blur="saveOllama" />
          <label class="block text-xs font-medium text-rm-muted mb-1">Model</label>
          <div class="flex flex-wrap items-center gap-2 mb-2">
            <input v-model="ollamaModel" type="text" class="input-field flex-1 min-w-0" placeholder="llama3.2" autocomplete="off" @blur="saveOllama" />
            <button type="button" class="btn-secondary btn-compact text-xs" :disabled="ollamaListLoading" @click="listOllamaModels">List models</button>
          </div>
          <p v-if="ollamaModels.length" class="m-0 text-xs text-rm-muted">Available: {{ ollamaModels.join(', ') }}</p>
          <p v-else-if="ollamaListError" class="m-0 text-xs text-rm-warning">{{ ollamaListError }}</p>
        </div>
      </section>
      <section class="card mb-6">
        <div class="card-section">
          <span class="card-label">Claude (optional)</span>
          <p class="m-0 mb-4 text-sm text-rm-muted">Anthropic API. Used when AI provider is Claude. Get an API key from console.anthropic.com.</p>
          <label class="block text-xs font-medium text-rm-muted mb-1">API key</label>
          <input v-model="claudeApiKey" type="password" class="input-field mb-4" placeholder="sk-ant-..." autocomplete="off" @blur="saveClaude" />
          <label class="block text-xs font-medium text-rm-muted mb-1">Model</label>
          <input v-model="claudeModel" type="text" class="input-field" placeholder="claude-sonnet-4-20250514" autocomplete="off" @blur="saveClaude" />
        </div>
      </section>
      <section class="card mb-6">
        <div class="card-section">
          <span class="card-label">Preferred editor</span>
          <p class="m-0 mb-4 text-sm text-rm-muted">When opening a project or file (e.g. from the Git section). Cursor and VS Code must be in your PATH.</p>
          <select v-model="preferredEditor" class="input-field max-w-xs" @change="savePreferredEditor">
            <option value="">Default (Cursor, then VS Code)</option>
            <option value="cursor">Cursor</option>
            <option value="code">VS Code</option>
          </select>
        </div>
      </section>
      <section class="card mb-6">
        <div class="card-section">
          <span class="card-label">PHP executable (default)</span>
          <p class="m-0 mb-4 text-sm text-rm-muted">Default PHP binary for Composer and Pest.</p>
          <input v-model="phpPath" type="text" class="input-field" placeholder="/opt/homebrew/opt/php/bin/php" autocomplete="off" @blur="savePhpPath" />
        </div>
      </section>
      <section class="card mb-6">
        <div class="card-section">
          <span class="card-label">Project view</span>
          <p class="m-0 mb-4 text-sm text-rm-muted">Use tabs to switch between Git, Version &amp; release, and Sync.</p>
          <label class="checkbox-label text-sm text-rm-text cursor-pointer flex items-center gap-2">
            <input v-model="useDetailTabs" type="checkbox" class="checkbox-input" @change="saveUseTabs" />
            <span>Use tabs in project detail</span>
          </label>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAppStore } from '../stores/app';
import { useApi } from '../composables/useApi';

const store = useAppStore();
const api = useApi();
const githubToken = ref('');
const signCommits = ref(false);
const aiProvider = ref('ollama');
const ollamaBaseUrl = ref('');
const ollamaModel = ref('');
const claudeApiKey = ref('');
const claudeModel = ref('');
const preferredEditor = ref('');
const phpPath = ref('');
const useDetailTabs = ref(true);
const ollamaModels = ref([]);
const ollamaListLoading = ref(false);
const ollamaListError = ref('');

onMounted(async () => {
  try {
    const [token, ollama, claude, provider, editor, php, sign, tabs] = await Promise.all([
      api.getGitHubToken?.() ?? '',
      api.getOllamaSettings?.() ?? {},
      api.getClaudeSettings?.() ?? {},
      api.getAiProvider?.().catch(() => 'ollama'),
      api.getPreference?.('preferredEditor').catch(() => ''),
      api.getPreference?.('phpPath').catch(() => ''),
      api.getPreference?.('signCommits').catch(() => false),
      api.getPreference?.('detailUseTabs').catch(() => true),
    ]);
    githubToken.value = token || '';
    ollamaBaseUrl.value = ollama?.baseUrl || '';
    ollamaModel.value = ollama?.model || '';
    claudeApiKey.value = claude?.apiKey || '';
    claudeModel.value = claude?.model || '';
    aiProvider.value = provider === 'claude' ? 'claude' : 'ollama';
    preferredEditor.value = editor === 'cursor' || editor === 'code' ? editor : '';
    phpPath.value = php || '';
    signCommits.value = !!sign;
    useDetailTabs.value = tabs !== false;
    store.setUseDetailTabs(tabs !== false);
  } catch (_) {}
});

function saveToken() {
  api.setGitHubToken?.(githubToken.value?.trim() ?? '');
}
function saveSignCommits() {
  api.setPreference?.('signCommits', signCommits.value);
}
function saveOllama() {
  api.setOllamaSettings?.(ollamaBaseUrl.value?.trim() || 'http://localhost:11434', ollamaModel.value?.trim() || 'llama3.2');
}
function saveClaude() {
  api.setClaudeSettings?.(claudeApiKey.value?.trim() ?? '', claudeModel.value?.trim() ?? '');
}
function saveAiProvider() {
  api.setAiProvider?.(aiProvider.value);
}
function savePreferredEditor() {
  api.setPreference?.('preferredEditor', preferredEditor.value || '');
}

async function listOllamaModels() {
  ollamaListError.value = '';
  ollamaModels.value = [];
  ollamaListLoading.value = true;
  try {
    const result = await api.ollamaListModels?.(ollamaBaseUrl.value?.trim() || 'http://localhost:11434');
    if (result?.ok && Array.isArray(result.models)) {
      ollamaModels.value = result.models;
    } else {
      ollamaModels.value = [];
      ollamaListError.value = result?.error || 'No models returned.';
    }
  } catch (e) {
    ollamaListError.value = e?.message || 'Failed to list models.';
  } finally {
    ollamaListLoading.value = false;
  }
}
function savePhpPath() {
  api.setPreference?.('phpPath', phpPath.value?.trim() ?? '');
}
function saveUseTabs() {
  store.setUseDetailTabs(useDetailTabs.value);
  api.setPreference?.('detailUseTabs', useDetailTabs.value);
}
</script>
