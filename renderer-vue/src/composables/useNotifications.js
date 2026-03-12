import { ref, shallowRef } from 'vue';
import { useApi } from './useApi';
import { useAnnouncer } from './useAnnouncer';

const toasts = shallowRef([]);
const DEFAULT_DURATION_MS = 5000;

/**
 * In-app toasts + optional system notification.
 * Use add() to show a toast; if notifications are enabled, a system notification is also shown (respects "only when not focused" and sound in main).
 * When screen reader support is on, toasts are also pushed to the live announcer region.
 */
export function useNotifications() {
  const api = useApi();
  const { announce, announceAssertive } = useAnnouncer();

  function add(options) {
    const id = Math.random().toString(36).slice(2);
    const title = options?.title ?? 'Notification';
    const message = options?.message ?? options?.body ?? '';
    const type = options?.type ?? 'info'; // 'success' | 'error' | 'info'
    const duration = options?.duration ?? DEFAULT_DURATION_MS;

    const toast = { id, title, message, type, createdAt: Date.now() };
    toasts.value = [...toasts.value, toast];

    if (duration > 0) {
      setTimeout(() => remove(id), duration);
    }

    if (options?.systemNotification !== false && typeof api.showSystemNotification === 'function') {
      const body = message || title;
      api.showSystemNotification(title, body).catch(() => {});
    }

    const srText = message ? `${title}: ${message}` : title;
    if (type === 'error') {
      announceAssertive(srText);
    } else {
      announce(srText);
    }

    return id;
  }

  function remove(id) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  return {
    toasts,
    add,
    remove,
  };
}
