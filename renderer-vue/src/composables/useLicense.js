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
const licenseSource = ref(null); // 'remote' | 'offline-cache' | null
const licenseEmail = ref(null); // when source === 'remote'
const licenseTier = ref(TIER_FREE); // from API, for display
/** Allowed tab IDs from Laravel (GET /api/user permissions.tabs). Applied as-is. */
const serverAllowedTabs = ref(null); // string[] | null
/** Plan label from Laravel (e.g. "Free", "Plus", "Pro"). */
const serverPlanLabel = ref(null); // string | null
/** Features from Laravel (e.g. { ai_commit_message: true }). */
const serverFeatures = ref(null); // object | null
/** Plan limits from Laravel (max_projects, max_extensions). -1 = unlimited. */
const serverLimits = ref(null); // object | null
/** Team info from Laravel (id, name, slug, is_owner, is_admin, member_count). */
const serverTeam = ref(null); // object | null
/** User profile from Laravel (name, avatar_url, github_linked, created_at). */
const serverProfile = ref(null); // object | null
/** Backend server URL (for marketplace, etc.). */
const serverUrl = ref(null); // string | null
/** False until loadStatus() has completed; prevents showing app before we know login state. */
const licenseStatusLoaded = ref(false);
/** Offline grace info when running from cache. */
const offlineGrace = ref(null); // { daysRemaining, graceDays, lastVerifiedAt } | null
const offlineGraceExpired = ref(false);

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
        resetState();
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
        serverLimits.value = ok && status.limits && typeof status.limits === 'object' ? status.limits : null;
        serverTeam.value = ok && status.team && typeof status.team === 'object' ? status.team : null;
        serverProfile.value = ok && status.profile && typeof status.profile === 'object' ? status.profile : null;
        serverUrl.value = ok && status.serverUrl ? status.serverUrl.replace(/\/+$/, '') : null;
        offlineGrace.value = status.offlineGrace ?? null;
        offlineGraceExpired.value = !ok && !!status.offlineGraceExpired;
      }
    } catch (e) {
      if (isDev) console.warn('[useLicense] loadStatus failed', e?.message ?? e);
      resetState();
    } finally {
      licenseStatusLoaded.value = true;
    }
  }

  function resetState() {
    actualHasLicense.value = false;
    licenseSource.value = null;
    licenseEmail.value = null;
    licenseTier.value = TIER_FREE;
    serverAllowedTabs.value = null;
    serverPlanLabel.value = null;
    serverFeatures.value = null;
    serverLimits.value = null;
    serverTeam.value = null;
    serverProfile.value = null;
    serverUrl.value = null;
    offlineGrace.value = null;
    offlineGraceExpired.value = false;
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

  const DEFAULT_LIMITS = { max_projects: 5, max_extensions: 5 };

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
    /** Plan limits (-1 = unlimited). */
    limits: computed(() => serverLimits.value || DEFAULT_LIMITS),
    maxProjects: computed(() => {
      const v = (serverLimits.value || DEFAULT_LIMITS).max_projects;
      return typeof v === 'number' ? v : 5;
    }),
    maxExtensions: computed(() => {
      const v = (serverLimits.value || DEFAULT_LIMITS).max_extensions;
      return typeof v === 'number' ? v : 5;
    }),
    isPro: computed(() => licenseTier.value === TIER_PRO),
    isPlus: computed(() => licenseTier.value === TIER_PLUS),
    /** User profile from backend (name, avatar_url, github_linked, created_at). */
    profile: computed(() => serverProfile.value),
    /** Team info from backend (null if no team). */
    team: computed(() => serverTeam.value),
    hasTeam: computed(() => !!serverTeam.value),
    isTeamOwner: computed(() => !!serverTeam.value?.is_owner),
    isTeamAdmin: computed(() => !!serverTeam.value?.is_admin),
    /** Backend server URL (for marketplace, etc.). */
    serverUrl: computed(() => serverUrl.value),
    isOfflineCache: computed(() => licenseSource.value === 'offline-cache'),
    offlineGrace: computed(() => offlineGrace.value),
    offlineGraceExpired: computed(() => offlineGraceExpired.value),
    loadStatus,
    isTabAllowed,
  };
}
