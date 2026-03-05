import { ref, computed, watch, onMounted } from 'vue';
import { useApi } from '../../composables/useApi';

/** Extract unique URLs from email HTML and plain text for the Links tab. */
function extractLinksFromEmail(email) {
  if (!email) return [];
  const seen = new Set();
  const out = [];
  const add = (href, text = null) => {
    try {
      const url = href?.trim();
      if (!url || url.startsWith('mailto:') || url.startsWith('#')) return;
      if (seen.has(url)) return;
      seen.add(url);
      out.push({ href: url, text: text?.trim() || null });
    } catch (_) {}
  };
  const hrefRe = /href\s*=\s*["']([^"']+)["']/gi;
  if (email.html && typeof email.html === 'string') {
    let m;
    while ((m = hrefRe.exec(email.html)) !== null) add(m[1]);
  }
  const urlRe = /https?:\/\/[^\s<>"']+/g;
  for (const source of [email.html, email.text].filter(Boolean)) {
    if (typeof source !== 'string') continue;
    let m;
    while ((m = urlRe.exec(source)) !== null) add(m[0]);
  }
  return out;
}

/**
 * Composable for the Email tab: SMTP server state, caught emails list, and actions.
 * @param {import('vue').Ref<string>} [projectPathRef] - Current project path; inbox and test email are scoped to this project.
 */
export function useEmail(projectPathRef) {
  const api = useApi();

  const smtpStatus = ref({ running: false, port: null, defaultPort: 1025 });
  const emails = ref([]);
  const selectedEmail = ref(null);
  const selectedIds = ref([]);
  const viewMode = ref('html');
  const startingSmtp = ref(false);
  const stoppingSmtp = ref(false);
  const sendingTestEmail = ref(false);

  const projectPath = () => (projectPathRef && typeof projectPathRef.value !== 'undefined' ? projectPathRef.value : null);

  const viewModeOptions = [
    { value: 'html', label: 'HTML' },
    { value: 'html-source', label: 'HTML-Source' },
    { value: 'text', label: 'Text' },
    { value: 'raw', label: 'Raw' },
    { value: 'debug', label: 'Debug' },
    { value: 'headers', label: 'Headers' },
    { value: 'links', label: 'Links' },
    { value: 'spam-report', label: 'Spam Report' },
    { value: 'testing', label: 'Testing' },
  ];

  async function refreshSmtpStatus() {
    try {
      const s = await api.getEmailSmtpStatus?.(projectPath()) ?? {};
      smtpStatus.value = { running: !!s.running, port: s.port ?? null, defaultPort: s.defaultPort ?? 1025 };
    } catch {
      smtpStatus.value = { running: false, port: null, defaultPort: 1025 };
    }
  }

  async function refreshEmails() {
    try {
      const path = projectPath();
      const list = await api.getEmails?.(path) ?? [];
      emails.value = list;
      const stillSelected = selectedEmail.value && list.find((e) => e.id === selectedEmail.value.id);
      if (!stillSelected) selectedEmail.value = list[0] || null;
    } catch {
      emails.value = [];
    }
  }

  async function startSmtp(preferredPort) {
    startingSmtp.value = true;
    try {
      const port = preferredPort != null && Number(preferredPort) >= 1 && Number(preferredPort) <= 65535
        ? Number(preferredPort)
        : smtpStatus.value.defaultPort;
      await api.startEmailSmtpServer?.(port, projectPath());
      await refreshSmtpStatus();
    } finally {
      startingSmtp.value = false;
    }
  }

  async function stopSmtp() {
    stoppingSmtp.value = true;
    try {
      await api.stopEmailSmtpServer?.(projectPath());
      await refreshSmtpStatus();
    } finally {
      stoppingSmtp.value = false;
    }
  }

  async function clearAll() {
    if (emails.value.length === 0) return;
    await api.clearEmails?.(projectPath());
    selectedEmail.value = null;
    selectedIds.value = [];
    await refreshEmails();
  }

  function toggleSelectEmail(id) {
    const set = new Set(selectedIds.value);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    selectedIds.value = Array.from(set);
  }

  function setSelection(id, selected) {
    const set = new Set(selectedIds.value);
    if (selected) set.add(id);
    else set.delete(id);
    selectedIds.value = Array.from(set);
  }

  function selectAll() {
    selectedIds.value = emails.value.map((e) => e.id);
  }

  function clearSelection() {
    selectedIds.value = [];
  }

  function isSelected(id) {
    return selectedIds.value.includes(id);
  }

  const selectedEmails = computed(() => {
    const set = new Set(selectedIds.value);
    return emails.value.filter((e) => set.has(e.id));
  });

  async function deleteEmail(id) {
    if (!id || !api.deleteEmails) return;
    await api.deleteEmails([id]);
    if (selectedEmail.value?.id === id) selectedEmail.value = null;
    selectedIds.value = selectedIds.value.filter((i) => i !== id);
    await refreshEmails();
  }

  async function deleteSelected() {
    if (selectedIds.value.length === 0 || !api.deleteEmails) return;
    const ids = [...selectedIds.value];
    await api.deleteEmails(ids);
    if (selectedEmail.value && ids.includes(selectedEmail.value.id)) selectedEmail.value = null;
    selectedIds.value = [];
    await refreshEmails();
  }

  async function sendTestEmail() {
    if (!api.sendTestEmail) return;
    const path = projectPath();
    const pathStr = path != null && String(path).trim() !== '' ? String(path).trim() : null;
    if (!pathStr) return;
    sendingTestEmail.value = true;
    try {
      await api.sendTestEmail(smtpStatus.value.port ?? null, pathStr);
      await refreshEmails();
    } finally {
      sendingTestEmail.value = false;
    }
  }

  onMounted(async () => {
    await refreshSmtpStatus();
    await refreshEmails();
    if (api.onEmailReceived) api.onEmailReceived(refreshEmails);
  });

  if (projectPathRef) {
    watch(projectPathRef, () => {
      refreshSmtpStatus();
      refreshEmails();
    });
  }

  const emailLinks = computed(() => extractLinksFromEmail(selectedEmail.value));

  return {
    smtpStatus,
    emails,
    selectedEmail,
    selectedIds,
    selectedEmails,
    viewMode,
    viewModeOptions,
    emailLinks,
    startingSmtp,
    stoppingSmtp,
    sendingTestEmail,
    startSmtp,
    stopSmtp,
    clearAll,
    sendTestEmail,
    toggleSelectEmail,
    setSelection,
    selectAll,
    clearSelection,
    isSelected,
    deleteEmail,
    deleteSelected,
  };
}
