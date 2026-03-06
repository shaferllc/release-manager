<template>
  <section class="settings-section">
    <h3 class="settings-section-title">Email</h3>
    <p class="settings-section-desc text-sm text-rm-muted mb-6">Local catch server and outgoing SMTP for forwarding.</p>
    <div class="settings-card space-y-5">
      <div class="settings-row">
        <span class="settings-label">SMTP port</span>
        <p class="settings-desc">Port for the local SMTP server that catches outgoing mail from your app. Restart the server after changing.</p>
        <InputText v-model.number="emailSmtpPort" type="number" min="1" max="65535" class="max-w-[6rem] mt-2" placeholder="1025" @blur="saveEmailSmtpPort" />
      </div>
      <Divider />
      <label class="settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
        <Checkbox v-model="emailCheckBrokenLinks" binary @update:model-value="saveEmailCheckBrokenLinks" />
        <span class="settings-label block text-rm-text">Automatically check broken links</span>
        <p class="settings-desc m-0 text-sm text-rm-muted">The link checker may perform HEAD or GET requests to links in emails, which can have side effects.</p>
      </label>
      <label class="settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 pt-2 border-t border-rm-border">
        <Checkbox v-model="emailEnableSpamChecking" binary @update:model-value="saveEmailEnableSpamChecking" />
        <span class="settings-label block text-rm-text">Enable spam checking</span>
        <p class="settings-desc m-0 text-sm text-rm-muted">Compute a local spam score for incoming emails and show it in the Spam Report tab.</p>
      </label>
      <Divider />
      <div class="settings-row pt-2 border-t border-rm-border">
        <span class="settings-label">Outgoing email configuration</span>
        <p class="settings-desc">SMTP connection used to send or forward mail from the app (e.g. from the compose/forward modal).</p>
        <div class="grid grid-cols-1 gap-3 mt-3 max-w-md">
          <div>
            <label for="email-outgoing-host" class="block text-xs text-rm-muted mb-1">Host</label>
            <InputText id="email-outgoing-host" v-model="emailOutgoingHost" type="text" class="w-full" placeholder="smtp.example.com" @blur="saveEmailOutgoing" />
          </div>
          <div>
            <label for="email-outgoing-username" class="block text-xs text-rm-muted mb-1">Username</label>
            <InputText id="email-outgoing-username" v-model="emailOutgoingUsername" type="text" class="w-full" placeholder="user@example.com" autocomplete="username" @blur="saveEmailOutgoing" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label for="email-outgoing-port" class="block text-xs text-rm-muted mb-1">Port</label>
              <InputText id="email-outgoing-port" v-model.number="emailOutgoingPort" type="number" min="1" max="65535" class="w-full" placeholder="587" @blur="saveEmailOutgoing" />
            </div>
            <div>
              <label for="email-outgoing-encryption" class="block text-xs text-rm-muted mb-1">Encryption</label>
              <Select id="email-outgoing-encryption" v-model="emailOutgoingEncryption" :options="emailOutgoingEncryptionOptionsSafe" optionLabel="label" optionValue="value" class="w-full" @change="saveEmailOutgoing" />
            </div>
          </div>
          <div>
            <label for="email-outgoing-password" class="block text-xs text-rm-muted mb-1">Password</label>
            <InputText id="email-outgoing-password" v-model="emailOutgoingPassword" type="password" class="w-full" placeholder="••••••••" autocomplete="current-password" @blur="saveEmailOutgoing" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Checkbox from 'primevue/checkbox';
import Divider from 'primevue/divider';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { useApi } from '../../composables/useApi';

const EMAIL_OUTGOING_ENCRYPTION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'tls', label: 'TLS' },
  { value: 'ssl', label: 'SSL' },
];

const api = useApi();

const emailSmtpPort = ref(1025);
const emailCheckBrokenLinks = ref(false);
const emailEnableSpamChecking = ref(true);
const emailOutgoingHost = ref('');
const emailOutgoingUsername = ref('');
const emailOutgoingPort = ref(587);
const emailOutgoingPassword = ref('');
const emailOutgoingEncryption = ref('tls');
const emailOutgoingEncryptionOptionsSafe = computed(() => (Array.isArray(EMAIL_OUTGOING_ENCRYPTION_OPTIONS) ? EMAIL_OUTGOING_ENCRYPTION_OPTIONS : []));

function saveEmailSmtpPort() {
  api.setPreference?.('emailSmtpPort', emailSmtpPort.value);
}

function saveEmailCheckBrokenLinks() {
  api.setPreference?.('emailCheckBrokenLinks', emailCheckBrokenLinks.value);
}

function saveEmailEnableSpamChecking() {
  api.setPreference?.('emailEnableSpamChecking', emailEnableSpamChecking.value);
}

function saveEmailOutgoing() {
  api.setPreference?.('emailOutgoingHost', emailOutgoingHost.value?.trim() ?? '');
  api.setPreference?.('emailOutgoingUsername', emailOutgoingUsername.value?.trim() ?? '');
  api.setPreference?.('emailOutgoingPort', emailOutgoingPort.value);
  api.setPreference?.('emailOutgoingPassword', emailOutgoingPassword.value ?? '');
  api.setPreference?.('emailOutgoingEncryption', emailOutgoingEncryption.value ?? 'tls');
}

onMounted(async () => {
  try {
    const [port, checkLinks, spamChecking, host, username, portOut, password, encryption] = await Promise.all([
      api.getPreference?.('emailSmtpPort').catch(() => 1025),
      api.getPreference?.('emailCheckBrokenLinks').catch(() => false),
      api.getPreference?.('emailEnableSpamChecking').catch(() => true),
      api.getPreference?.('emailOutgoingHost').catch(() => ''),
      api.getPreference?.('emailOutgoingUsername').catch(() => ''),
      api.getPreference?.('emailOutgoingPort').catch(() => 587),
      api.getPreference?.('emailOutgoingPassword').catch(() => ''),
      api.getPreference?.('emailOutgoingEncryption').catch(() => 'tls'),
    ]);
    emailSmtpPort.value = (typeof port === 'number' && port >= 1 && port <= 65535) ? port : 1025;
    emailCheckBrokenLinks.value = !!checkLinks;
    emailEnableSpamChecking.value = spamChecking !== false;
    emailOutgoingHost.value = host ?? '';
    emailOutgoingUsername.value = username ?? '';
    emailOutgoingPort.value = (typeof portOut === 'number' && portOut >= 1 && portOut <= 65535) ? portOut : 587;
    emailOutgoingPassword.value = password ?? '';
    emailOutgoingEncryption.value = ['none', 'tls', 'ssl'].includes(encryption) ? encryption : 'tls';
  } catch (_) {}
});
</script>
