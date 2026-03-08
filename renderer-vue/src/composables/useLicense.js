import { ref, computed } from 'vue';
import { useApi } from './useApi';

/** Plan/tier names from API (for display only; permissions come from API). */
export const TIER_FREE = 'free';
export const TIER_PLUS = 'plus';
export const TIER_PRO = 'pro';

/** Only used when logged in but API did not return permissions.tabs (e.g. old backend). */
const DEFAULT_TABS_WHEN_NO_PERMISSIONS = [
  'dashboard', 'git', 'version', 'sync', 'notes', 'bookmarks', 'wiki', 'kanban',
  'checklist', 'markdown', 'env', 'composer', 'tests', 'coverage',
];

const actualHasLicense = ref(false);
const licenseSource = ref(null); // 'remote' | null
const licenseEmail = ref(null); // when source === 'remote'
const licenseTier = ref(TIER_FREE); // from API, for display
/** Allowed tab IDs from Laravel (GET /api/user permissions.tabs). Applied as-is. */
const serverAllowedTabs = ref(null); // string[] | null
/** Plan label from Laravel (e.g. "Free", "Plus", "Pro"). */
const serverPlanLabel = ref(null); // string | null
/** Features from Laravel (e.g. { ai_commit_message: true }). */
const serverFeatures = ref(null); // object | null
/** False until loadStatus() has completed; prevents showing app before we know login state. */
const licenseStatusLoaded = ref(false);

function normalizeTier(t) {
  const v = (t || TIER_FREE).toString().toLowerCase();
  if (v === TIER_PRO || v === 'pro') return TIER_PRO;
  if (v === TIER_PLUS || v === 'plus') return TIER_PLUS;
  return TIER_FREE;
}

/**
 * Composable for app login status.
 * Permissions (tabs, features) come only from the web app (GET /api/user). On login we fetch
 * the account's permissions and apply them here; no role/tier logic is defined in the app.
 */
export function useLicense() {
  const api = useApi();

  async function loadStatus() {
    const isDev = import.meta.env?.DEV ?? false;
    try {
      if (typeof api.getLicenseStatus !== 'function') {
        if (isDev) console.log('[useLicense] loadStatus: no getLicenseStatus, assuming unlicensed');
        actualHasLicense.value = false;
        licenseSource.value = null;
        licenseEmail.value = null;
        licenseTier.value = TIER_FREE;
        serverAllowedTabs.value = null;
        serverPlanLabel.value = null;
        serverFeatures.value = null;
      } else {
        if (isDev) console.log('[useLicense] loadStatus: calling getLicenseStatus()');
        const status = await api.getLicenseStatus();
        const ok = status && status.hasLicense === true;
        if (isDev) console.log('[useLicense] loadStatus: result', { hasLicense: ok, status });
        actualHasLicense.value = ok;
        licenseSource.value = ok ? (status.source ?? null) : null;
        licenseEmail.value = ok ? (status.email ?? null) : null;
        licenseTier.value = ok ? normalizeTier(status.tier) : TIER_FREE;
        serverAllowedTabs.value = ok && Array.isArray(status.permissions?.tabs) ? status.permissions.tabs : null;
        serverPlanLabel.value = ok && typeof status.plan_label === 'string' ? status.plan_label : null;
        serverFeatures.value = ok && status.features && typeof status.features === 'object' ? status.features : null;
      }
    } catch (e) {
      if (isDev) console.warn('[useLicense] loadStatus failed', e?.message ?? e);
      actualHasLicense.value = false;
      licenseSource.value = null;
      licenseEmail.value = null;
      licenseTier.value = TIER_FREE;
      serverAllowedTabs.value = null;
      serverPlanLabel.value = null;
      serverFeatures.value = null;
    } finally {
      licenseStatusLoaded.value = true;
    }
  }

  /** Tab access: use only the permissions returned by the web app. No local role logic. */
  function isTabAllowed(tabId) {
    const allowed = serverAllowedTabs.value;
    if (Array.isArray(allowed)) return allowed.includes(tabId);
    if (actualHasLicense.value) return DEFAULT_TABS_WHEN_NO_PERMISSIONS.includes(tabId);
    return false;
  }

  /** Whether a feature flag from Laravel is enabled (e.g. ai_release_notes). */
  function hasFeature(featureKey) {
    const f = serverFeatures.value;
    if (f && typeof f[featureKey] === 'boolean') return f[featureKey];
    return false;
  }

  return {
    licenseStatusLoaded: computed(() => licenseStatusLoaded.value),
    /** Logged in to the app; plan and permissions come from the remote. */
    isLoggedIn: computed(() => actualHasLicense.value),
    hasLicense: computed(() => actualHasLicense.value), // alias for backward compat
    licenseSource: computed(() => licenseSource.value),
    licenseEmail: computed(() => licenseEmail.value),
    /** 'free' | 'plus' | 'pro' */
    tier: computed(() => licenseTier.value),
    /** Display label from Laravel (e.g. "Free", "Plus", "Pro") or fallback. */
    tierLabel: computed(() => serverPlanLabel.value || (licenseTier.value === TIER_PRO ? 'Pro' : licenseTier.value === TIER_PLUS ? 'Plus' : 'Free')),
    /** Permissions from Laravel (when present). */
    permissions: computed(() => serverAllowedTabs.value != null ? { tabs: serverAllowedTabs.value } : null),
    /** Feature flags from Laravel. */
    features: computed(() => serverFeatures.value || {}),
    hasFeature,
    isPro: computed(() => licenseTier.value === TIER_PRO),
    isPlus: computed(() => licenseTier.value === TIER_PLUS),
    loadStatus,
    isTabAllowed,
  };
}
