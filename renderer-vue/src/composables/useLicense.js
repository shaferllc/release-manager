import { ref, computed } from 'vue';
import { useApi } from './useApi';

/** Tab IDs that require a valid license. Without license these tabs are hidden. */
export const LICENSED_TAB_IDS = [
  'pull-requests',
  'processes',
  'email',
  'tunnels',
  'ftp',
  'ssh',
  'api',
];

const actualHasLicense = ref(false);
const bypassLicense = ref(false);
const licenseSource = ref(null); // 'remote' | 'key' | null
const licenseEmail = ref(null); // when source === 'remote'

/** Effective license: real license or hidden bypass (e.g. from Feature Flags modal). */
const hasLicenseEffective = computed(() => actualHasLicense.value || bypassLicense.value);

/**
 * Composable for license status. With license: full features. Without: limited (core tabs only, no AI/batch).
 * Bypass can be enabled via hidden Feature Flags modal to get full app without a license.
 */
export function useLicense() {
  const api = useApi();

  async function loadStatus() {
    try {
      if (api.getLicenseStatus) {
        const status = await api.getLicenseStatus();
        actualHasLicense.value = !!status?.hasLicense;
        licenseSource.value = status?.source ?? null;
        licenseEmail.value = status?.email ?? null;
      }
      const bypassRaw = await api.getPreference?.('licenseBypass').catch(() => undefined);
      bypassLicense.value = bypassRaw === false ? false : true;
    } catch {
      actualHasLicense.value = false;
      licenseSource.value = null;
      licenseEmail.value = null;
    }
  }

  async function setLicenseKey(key) {
    if (!api.setLicenseKey) return { ok: false, hasLicense: false };
    try {
      const result = await api.setLicenseKey(key);
      actualHasLicense.value = !!result?.hasLicense;
      return result;
    } catch {
      actualHasLicense.value = false;
      return { ok: false, hasLicense: false };
    }
  }

  function setBypassLicense(enabled) {
    bypassLicense.value = !!enabled;
    api.setPreference?.('licenseBypass', !!enabled);
  }

  return {
    /** True when user has full access (license or bypass). */
    hasLicense: hasLicenseEffective,
    /** 'remote' | 'key' | null when licensed. */
    licenseSource: computed(() => licenseSource.value),
    /** Email when licensed via remote login. */
    licenseEmail: computed(() => licenseEmail.value),
    /** Bypass state (for hidden Feature Flags checkbox). */
    bypassLicense: computed(() => bypassLicense.value),
    loadStatus,
    setLicenseKey,
    setBypassLicense,
    isTabAllowed: (tabId) => {
      if (hasLicenseEffective.value) return true;
      return !LICENSED_TAB_IDS.includes(tabId);
    },
  };
}
