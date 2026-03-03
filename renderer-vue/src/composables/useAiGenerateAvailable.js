import { ref, onMounted } from 'vue';
import { useApi } from './useApi';

/**
 * Returns a ref that is true when the current AI provider is configured for generate (commit message, release notes, test fix).
 * Ollama is always considered available; OpenAI and Claude require a non-empty API key.
 */
export function useAiGenerateAvailable() {
  const api = useApi();
  const available = ref(false);

  onMounted(async () => {
    try {
      const v = await api.getAiGenerateAvailable?.();
      available.value = v === true;
    } catch (_) {
      available.value = false;
    }
  });

  return { aiGenerateAvailable: available };
}
