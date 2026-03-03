import { ref, computed, onMounted } from 'vue';
import { useApi } from './useApi';
import { useLicense } from './useLicense';

/**
 * Returns a ref that is true when the current AI provider is configured for generate (commit message, release notes, test fix)
 * and the app has a valid license. Ollama is always considered available; OpenAI and Claude require a non-empty API key.
 */
export function useAiGenerateAvailable() {
  const api = useApi();
  const license = useLicense();
  const available = ref(false);

  onMounted(async () => {
    try {
      const v = await api.getAiGenerateAvailable?.();
      available.value = v === true;
    } catch (_) {
      available.value = false;
    }
  });

  const aiGenerateAvailable = computed(() => license.hasLicense?.value === true && available.value);

  return { aiGenerateAvailable };
}
