import { ref, reactive, readonly } from 'vue';
import { useApi } from './useApi';
import { useLicense } from './useLicense';

const NOTIFICATION_TYPES = {
  crash_report_alert: { label: 'Crash report alerts', description: 'Get notified when a crash report is filed.', category: 'alerts', defaultOn: true },
  security_alert: { label: 'Security alerts', description: 'Receive alerts for security-related events.', category: 'alerts', defaultOn: true },
  team_member_joined: { label: 'Team member joined', description: 'Notify when a new member joins the team.', category: 'team', defaultOn: false },
  team_member_left: { label: 'Team member left', description: 'Notify when a member leaves the team.', category: 'team', defaultOn: false },
  billing_reminder: { label: 'Billing reminders', description: 'Receive reminders about upcoming billing events.', category: 'billing', defaultOn: false },
  extension_update: { label: 'Extension updates', description: 'Notify when installed extensions have updates available.', category: 'updates', defaultOn: false },
  release_published: { label: 'Release published', description: 'Notify when a new release is published.', category: 'updates', defaultOn: false },
  weekly_usage_digest: { label: 'Weekly usage digest', description: 'Receive a weekly summary of your usage and activity.', category: 'digest', defaultOn: false },
};

const CATEGORIES = [
  { id: 'alerts', label: 'Alerts' },
  { id: 'team', label: 'Team' },
  { id: 'billing', label: 'Billing' },
  { id: 'updates', label: 'Updates' },
  { id: 'digest', label: 'Digest' },
];

function getDefaults() {
  const prefs = {};
  for (const [key, meta] of Object.entries(NOTIFICATION_TYPES)) {
    prefs[key] = meta.defaultOn;
  }
  return prefs;
}

/**
 * Composable for managing notification preferences from the web app API.
 * GET /api/notification-preferences — read
 * PUT /api/notification-preferences — update (body: { preferences: {...} })
 */
export function useNotificationPreferences() {
  const api = useApi();
  const license = useLicense();

  const preferences = reactive(getDefaults());
  const loading = ref(false);
  const saving = ref(false);
  const error = ref('');
  const saveMessage = ref('');

  async function fetchPreferences() {
    if (!license.isLoggedIn?.value) return;
    loading.value = true;
    error.value = '';
    try {
      const result = await api.fetchNotificationPreferences?.();
      if (result?.ok && result.preferences) {
        for (const [key, meta] of Object.entries(NOTIFICATION_TYPES)) {
          preferences[key] = typeof result.preferences[key] === 'boolean'
            ? result.preferences[key]
            : meta.defaultOn;
        }
      } else if (result && !result.ok) {
        error.value = result.error || 'Failed to load notification preferences.';
      }
    } catch (e) {
      error.value = e?.message || 'Failed to load notification preferences.';
    } finally {
      loading.value = false;
    }
  }

  async function savePreferences() {
    if (!license.isLoggedIn?.value) return;
    saving.value = true;
    error.value = '';
    saveMessage.value = '';
    try {
      const payload = {};
      for (const key of Object.keys(NOTIFICATION_TYPES)) {
        payload[key] = !!preferences[key];
      }
      const result = await api.updateNotificationPreferences?.(payload);
      if (result?.ok) {
        saveMessage.value = 'Notification preferences saved.';
        setTimeout(() => { saveMessage.value = ''; }, 3000);
      } else {
        error.value = result?.error || 'Failed to save notification preferences.';
      }
    } catch (e) {
      error.value = e?.message || 'Failed to save notification preferences.';
    } finally {
      saving.value = false;
    }
  }

  function typesForCategory(categoryId) {
    return Object.entries(NOTIFICATION_TYPES)
      .filter(([, meta]) => meta.category === categoryId)
      .map(([key, meta]) => ({ key, ...meta }));
  }

  return {
    preferences,
    loading: readonly(loading),
    saving: readonly(saving),
    error,
    saveMessage: readonly(saveMessage),
    categories: CATEGORIES,
    typesForCategory,
    fetchPreferences,
    savePreferences,
  };
}
