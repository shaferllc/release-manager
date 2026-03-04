import { ref, onMounted } from 'vue';
import { useApi } from './useApi';

/**
 * Composable for the Email tab: SMTP server state, caught emails list, and actions.
 * Registers for onEmailReceived on mount so the inbox updates when new mail arrives.
 * @returns {{ smtpStatus, emails, selectedEmail, viewMode, viewModeOptions, startingSmtp, stoppingSmtp, startSmtp, stopSmtp, clearAll }}
 */
export function useEmail() {
  const api = useApi();

  const smtpStatus = ref({ running: false, port: null, defaultPort: 1025 });
  const emails = ref([]);
  const selectedEmail = ref(null);
  const viewMode = ref('html');
  const startingSmtp = ref(false);
  const stoppingSmtp = ref(false);

  const viewModeOptions = [
    { value: 'html', label: 'HTML' },
    { value: 'text', label: 'Plain text' },
    { value: 'raw', label: 'Raw' },
    { value: 'headers', label: 'Headers' },
  ];

  async function refreshSmtpStatus() {
    try {
      const s = await api.getEmailSmtpStatus?.() ?? {};
      smtpStatus.value = { running: !!s.running, port: s.port ?? null, defaultPort: s.defaultPort ?? 1025 };
    } catch {
      smtpStatus.value = { running: false, port: null, defaultPort: 1025 };
    }
  }

  async function refreshEmails() {
    try {
      const list = await api.getEmails?.() ?? [];
      emails.value = list;
      const stillSelected = selectedEmail.value && list.find((e) => e.id === selectedEmail.value.id);
      if (!stillSelected) selectedEmail.value = list[0] || null;
    } catch {
      emails.value = [];
    }
  }

  async function startSmtp() {
    startingSmtp.value = true;
    try {
      await api.startEmailSmtpServer?.(smtpStatus.value.defaultPort);
      await refreshSmtpStatus();
    } finally {
      startingSmtp.value = false;
    }
  }

  async function stopSmtp() {
    stoppingSmtp.value = true;
    try {
      await api.stopEmailSmtpServer?.();
      await refreshSmtpStatus();
    } finally {
      stoppingSmtp.value = false;
    }
  }

  async function clearAll() {
    if (emails.value.length === 0) return;
    await api.clearEmails?.();
    selectedEmail.value = null;
    await refreshEmails();
  }

  onMounted(async () => {
    await refreshSmtpStatus();
    await refreshEmails();
    if (api.onEmailReceived) api.onEmailReceived(refreshEmails);
  });

  return {
    smtpStatus,
    emails,
    selectedEmail,
    viewMode,
    viewModeOptions,
    startingSmtp,
    stoppingSmtp,
    startSmtp,
    stopSmtp,
    clearAll,
  };
}
