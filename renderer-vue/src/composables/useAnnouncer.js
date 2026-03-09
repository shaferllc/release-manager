import { ref } from 'vue';

const message = ref('');
const politeness = ref('polite');
let clearTimer = null;

/**
 * Screen reader live announcer. Pushes text into an aria-live region
 * so assistive technologies read it aloud.
 *
 * Only active when data-screen-reader-support="true" on <html>.
 */
export function useAnnouncer() {
  function announce(text, level = 'polite') {
    if (!text) return;
    if (document.documentElement.getAttribute('data-screen-reader-support') !== 'true') return;

    if (clearTimer) clearTimeout(clearTimer);
    message.value = '';
    politeness.value = level;

    requestAnimationFrame(() => {
      message.value = text;
    });

    clearTimer = setTimeout(() => {
      message.value = '';
    }, 8000);
  }

  function announcePolite(text) {
    announce(text, 'polite');
  }

  function announceAssertive(text) {
    announce(text, 'assertive');
  }

  return {
    message,
    politeness,
    announce,
    announcePolite,
    announceAssertive,
  };
}
