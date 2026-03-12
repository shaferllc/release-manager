/**
 * App sign-in client (Laravel Passport). Plan and permissions are controlled by the remote;
 * this module only handles login, token refresh, and /api/user (email, plan, tabs, features).
 * Supports password grant (login with email/password), token refresh, and optional /api/user.
 *
 * @param {{ getPreference: (key: string) => any, setPreference: (key: string, value: any) => void, bundledConfig?: { prod?: { clientId: string, clientSecret: string }, staging?: { clientId: string, clientSecret: string } } | null }} deps
 */
function createLicenseServer(deps) {
  const { getPreference, setPreference, bundledConfig = null } = deps;

  const DEBUG = process.env.NODE_ENV === 'development' || process.env.LICENSE_DEBUG === '1';
  function debugLog(...args) {
    if (DEBUG) console.log('[licenseServer]', ...args);
  }
  function debugWarn(...args) {
    if (DEBUG) console.warn('[licenseServer]', ...args);
  }

  /** Same origin as telemetry so "login to the app" and usage data use the same backend. */
  const APP_BASE_URL_DEFAULT = 'https://shipwell-web.test';

  /** Environment presets: login and forgot-password use this URL for the selected environment. */
  const ENV_PRESETS = {
    dev: { label: 'Development', url: 'https://shipwell-web.test' },
    staging: { label: 'Staging', url: 'https://staging.shipwell.com' },
    prod: { label: 'Production', url: 'https://shipwell.dply.io' },
  };

  const PREF_BASE = 'licenseServer';
  const PREF_ENVIRONMENT = `${PREF_BASE}.environment`;
  const PREF_URL = `${PREF_BASE}.url`;
  const PREF_CLIENT_ID = `${PREF_BASE}.clientId`;
  const PREF_CLIENT_SECRET = `${PREF_BASE}.clientSecret`;
  const PREF_ACCESS_TOKEN = `${PREF_BASE}.accessToken`;
  const PREF_REFRESH_TOKEN = `${PREF_BASE}.refreshToken`;
  const PREF_EXPIRES_AT = `${PREF_BASE}.expiresAt`;
  const PREF_USER_EMAIL = `${PREF_BASE}.userEmail`;
  const PREF_USER_TIER = `${PREF_BASE}.userTier`;
  const PREF_USER_PLAN = `${PREF_BASE}.userPlan`;
  const PREF_USER_PLAN_LABEL = `${PREF_BASE}.userPlanLabel`;
  const PREF_USER_ALLOWED_TABS = `${PREF_BASE}.userAllowedTabs`;
  const PREF_USER_FEATURES = `${PREF_BASE}.userFeatures`;
  const PREF_USER_LIMITS = `${PREF_BASE}.userLimits`;
  const PREF_USER_TEAM = `${PREF_BASE}.userTeam`;
  const PREF_USER_PROFILE = `${PREF_BASE}.userProfile`;
  const PREF_LAST_VERIFIED = `${PREF_BASE}.lastVerifiedAt`;
  const PREF_OFFLINE_GRACE_DAYS = 'offlineGraceDays';

  const DEFAULT_OFFLINE_GRACE_DAYS = 7;

  /** Seconds before expiry to consider token expired and refresh. */
  const REFRESH_BUFFER_SEC = 60;

  /** Dev-only: when environment is dev and user hasn't set credentials, use these (e.g. from .env). */
  const DEV_CLIENT_ID = (typeof process !== 'undefined' && process.env && process.env.LICENSE_DEV_CLIENT_ID) || '';
  const DEV_CLIENT_SECRET = (typeof process !== 'undefined' && process.env && process.env.LICENSE_DEV_CLIENT_SECRET) || '';

  function getConfig() {
    const env = getPreference(PREF_ENVIRONMENT) || 'dev';
    const preset = ENV_PRESETS[env];
    let url = preset ? preset.url : (getPreference(PREF_URL) || '').toString().trim().replace(/\/+$/, '');
    if (!url) url = APP_BASE_URL_DEFAULT;
    let clientId = (getPreference(PREF_CLIENT_ID) || '').toString().trim();
    let clientSecret = (getPreference(PREF_CLIENT_SECRET) || '').toString().trim();
    if (env === 'dev' && (!clientId || !clientSecret) && DEV_CLIENT_ID && DEV_CLIENT_SECRET) {
      clientId = clientId || DEV_CLIENT_ID;
      clientSecret = clientSecret || DEV_CLIENT_SECRET;
      debugLog('getConfig() using dev env credentials from LICENSE_DEV_*');
    }
    if ((env === 'prod' || env === 'staging') && (!clientId || !clientSecret) && bundledConfig && bundledConfig[env]) {
      const bundled = bundledConfig[env];
      if (bundled.clientId && bundled.clientSecret) {
        clientId = clientId || bundled.clientId;
        clientSecret = clientSecret || bundled.clientSecret;
        debugLog('getConfig() using bundled credentials for', env);
      }
    }
    return { url, clientId, clientSecret, environment: env };
  }

  function getEnvironments() {
    return Object.entries(ENV_PRESETS).map(([id, { label, url }]) => ({ id, label, url }));
  }

  function setConfig({ url = '', clientId = '', clientSecret = '', environment } = {}) {
    const previousEnv = getPreference(PREF_ENVIRONMENT) || 'dev';
    const previousUrl = (getPreference(PREF_URL) || '').toString().trim();

    if (environment !== undefined) setPreference(PREF_ENVIRONMENT, environment && ENV_PRESETS[environment] ? environment : '');
    setPreference(PREF_URL, (url || '').toString().trim().replace(/\/+$/, ''));
    setPreference(PREF_CLIENT_ID, (clientId || '').toString().trim());
    setPreference(PREF_CLIENT_SECRET, (clientSecret || '').toString().trim());

    const newEnv = getPreference(PREF_ENVIRONMENT) || 'dev';
    const newUrl = (getPreference(PREF_URL) || '').toString().trim();
    const envChanged = (environment !== undefined && newEnv !== previousEnv)
      || (url && newUrl !== previousUrl);

    if (envChanged) {
      debugLog('setConfig() environment changed, clearing stored tokens', { previousEnv, newEnv });
      clearStoredToken();
    }
  }

  function getStoredToken() {
    const accessToken = getPreference(PREF_ACCESS_TOKEN);
    const refreshToken = getPreference(PREF_REFRESH_TOKEN);
    const expiresAt = getPreference(PREF_EXPIRES_AT);
    const userEmail = getPreference(PREF_USER_EMAIL);
    const userTier = getPreference(PREF_USER_TIER);
    const userPlan = getPreference(PREF_USER_PLAN);
    const userPlanLabel = getPreference(PREF_USER_PLAN_LABEL);
    const userAllowedTabs = getPreference(PREF_USER_ALLOWED_TABS);
    const userFeatures = getPreference(PREF_USER_FEATURES);
    const userLimits = getPreference(PREF_USER_LIMITS);
    const userTeam = getPreference(PREF_USER_TEAM);
    const userProfile = getPreference(PREF_USER_PROFILE);
    return {
      accessToken: typeof accessToken === 'string' ? accessToken : null,
      refreshToken: typeof refreshToken === 'string' ? refreshToken : null,
      expiresAt: typeof expiresAt === 'number' ? expiresAt : null,
      userEmail: typeof userEmail === 'string' ? userEmail : null,
      userTier: typeof userTier === 'string' ? userTier : 'free',
      userPlan: typeof userPlan === 'string' ? userPlan : null,
      userPlanLabel: typeof userPlanLabel === 'string' ? userPlanLabel : null,
      userAllowedTabs: Array.isArray(userAllowedTabs) ? userAllowedTabs : null,
      userFeatures: userFeatures && typeof userFeatures === 'object' && !Array.isArray(userFeatures) ? userFeatures : null,
      userLimits: userLimits && typeof userLimits === 'object' && !Array.isArray(userLimits) ? userLimits : null,
      userTeam: userTeam && typeof userTeam === 'object' && !Array.isArray(userTeam) ? userTeam : null,
      userProfile: userProfile && typeof userProfile === 'object' && !Array.isArray(userProfile) ? userProfile : null,
    };
  }

  function setStoredToken({
    accessToken, refreshToken, expiresAt, userEmail, userTier, userPlan,
    userPlanLabel, userAllowedTabs, userFeatures, userLimits, userTeam, userProfile,
  } = {}) {
    if (accessToken !== undefined) setPreference(PREF_ACCESS_TOKEN, accessToken || null);
    if (refreshToken !== undefined) setPreference(PREF_REFRESH_TOKEN, refreshToken || null);
    if (expiresAt !== undefined) setPreference(PREF_EXPIRES_AT, expiresAt || null);
    if (userEmail !== undefined) setPreference(PREF_USER_EMAIL, userEmail || null);
    if (userTier !== undefined) setPreference(PREF_USER_TIER, userTier || 'free');
    if (userPlan !== undefined) setPreference(PREF_USER_PLAN, userPlan || null);
    if (userPlanLabel !== undefined) setPreference(PREF_USER_PLAN_LABEL, userPlanLabel || null);
    if (userAllowedTabs !== undefined) setPreference(PREF_USER_ALLOWED_TABS, Array.isArray(userAllowedTabs) ? userAllowedTabs : null);
    if (userFeatures !== undefined) setPreference(PREF_USER_FEATURES, userFeatures && typeof userFeatures === 'object' ? userFeatures : null);
    if (userLimits !== undefined) setPreference(PREF_USER_LIMITS, userLimits && typeof userLimits === 'object' ? userLimits : null);
    if (userTeam !== undefined) setPreference(PREF_USER_TEAM, userTeam && typeof userTeam === 'object' ? userTeam : null);
    if (userProfile !== undefined) setPreference(PREF_USER_PROFILE, userProfile && typeof userProfile === 'object' ? userProfile : null);
  }

  function clearStoredToken() {
    setStoredToken({
      accessToken: null, refreshToken: null, expiresAt: null,
      userEmail: null, userTier: null, userPlan: null, userPlanLabel: null, userAllowedTabs: null, userFeatures: null, userLimits: null, userTeam: null, userProfile: null,
    });
  }

  function isTokenExpired(expiresAt) {
    if (expiresAt == null) return true;
    return Date.now() >= (expiresAt * 1000) - (REFRESH_BUFFER_SEC * 1000);
  }

  /**
   * POST to Laravel Passport /oauth/token (password grant).
   * @returns {{ ok: true, accessToken: string, refreshToken?: string, expiresIn: number } | { ok: false, error: string }}
   */
  async function requestTokenPassword(baseUrl, clientId, clientSecret, username, password) {
    const tokenUrl = `${baseUrl}/oauth/token`;
    debugLog('POST', tokenUrl, { grant_type: 'password', username });
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: clientId,
      client_secret: clientSecret,
      username,
      password,
    }).toString();
    try {
      const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body,
      });
      const data = await res.json().catch(() => ({}));
      debugLog('POST /oauth/token response', { status: res.status, ok: res.ok, hasAccessToken: !!data.access_token });
      if (!res.ok) {
        const msg = data.message || data.error_description || data.error || res.statusText || 'Login failed';
        debugWarn('POST /oauth/token failed', { status: res.status, data });
        return { ok: false, error: typeof msg === 'string' ? msg : JSON.stringify(msg) };
      }
      const accessToken = data.access_token;
      const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 0;
      const expiresAt = expiresIn > 0 ? Math.floor(Date.now() / 1000) + expiresIn : null;
      const refreshToken = data.refresh_token || null;
      if (!accessToken) {
        debugWarn('POST /oauth/token no access_token in body', data);
        return { ok: false, error: 'No access token in response' };
      }
      return { ok: true, accessToken, refreshToken, expiresIn, expiresAt };
    } catch (e) {
      debugWarn('POST /oauth/token fetch failed', {
        message: e?.message,
        name: e?.name,
        cause: e?.cause?.message ?? e?.cause,
        stack: e?.stack,
      });
      return { ok: false, error: e.message || 'Network error' };
    }
  }

  /**
   * POST to Laravel Passport /oauth/token (refresh_token grant).
   */
  async function requestTokenRefresh(baseUrl, clientId, clientSecret, refreshToken) {
    const tokenUrl = `${baseUrl}/oauth/token`;
    debugLog('POST', tokenUrl, { grant_type: 'refresh_token' });
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }).toString();
    try {
      const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body,
      });
      const data = await res.json().catch(() => ({}));
      debugLog('POST /oauth/token (refresh) response', { status: res.status, ok: res.ok });
      if (!res.ok) {
        debugWarn('POST /oauth/token (refresh) failed', { status: res.status, data });
        const msg = data.message || data.error_description || data.error || res.statusText || 'Refresh failed';
        return { ok: false, error: typeof msg === 'string' ? msg : JSON.stringify(msg) };
      }
      const accessToken = data.access_token;
      const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 0;
      const expiresAt = expiresIn > 0 ? Math.floor(Date.now() / 1000) + expiresIn : null;
      const newRefreshToken = data.refresh_token || refreshToken;
      if (!accessToken) return { ok: false, error: 'No access token in response' };
      return { ok: true, accessToken, refreshToken: newRefreshToken, expiresIn, expiresAt };
    } catch (e) {
      debugWarn('POST /oauth/token (refresh) fetch failed', { message: e?.message, name: e?.name, cause: e?.cause?.message ?? e?.cause });
      return { ok: false, error: e.message || 'Network error' };
    }
  }

  /**
   * GET baseUrl/api/user with Bearer token. Returns user + permissions from Laravel (plan, tabs, features).
   * If the API returns permissions.tabs, the app uses that as the source of truth; otherwise falls back to tier.
   */
  /**
   * GET baseUrl/api/user with Bearer token. Returns user data or null (auth failure).
   * Throws on network errors so callers can distinguish network vs auth issues.
   */
  async function fetchUser(baseUrl, accessToken) {
    const userUrl = `${baseUrl}/api/user`;
    debugLog('GET', userUrl);
    const res = await fetch(userUrl, {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
    });
    debugLog('GET /api/user response', { status: res.status, ok: res.ok });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      debugWarn('GET /api/user failed', { status: res.status, data });
      return null;
    }
    const data = await res.json().catch(() => ({}));
    const email = data.email;
    if (typeof email !== 'string') return null;
    const raw = (data.plan || data.tier || 'free').toString().toLowerCase();
    const plan = ['free', 'pro', 'team', 'developer'].includes(raw) ? raw : 'free';
    const tier = raw === 'pro' ? 'pro' : raw === 'plus' ? 'plus' : raw === 'team' ? 'pro' : raw === 'developer' ? 'pro' : 'free';
    const allowedTabs = Array.isArray(data.permissions?.tabs) ? data.permissions.tabs : null;
    const planLabel = typeof data.plan_label === 'string' ? data.plan_label : null;
    const features = data.features && typeof data.features === 'object' && !Array.isArray(data.features) ? data.features : null;
    const limits = data.limits && typeof data.limits === 'object' && !Array.isArray(data.limits) ? data.limits : null;
    const team = data.team && typeof data.team === 'object' ? data.team : null;
    const profile = data.profile && typeof data.profile === 'object' ? data.profile : null;
    return { email, tier, plan, planLabel, allowedTabs, features, limits, team, profile };
  }

  /**
   * Login with email and password. Stores token and optionally fetches user email.
   */
  async function login(email, password) {
    const { url, clientId, clientSecret, environment } = getConfig();
    debugLog('login()', { url, hasClientId: !!clientId, hasClientSecret: !!clientSecret, environment });
    if (!url || !clientId || !clientSecret) {
      debugWarn('login() config missing', { url: url || '(empty)', hasClientId: !!clientId, hasClientSecret: !!clientSecret });
      return { ok: false, error: 'Sign-in not configured. Set server URL, Client ID, and Client secret in Settings.' };
    }
    const result = await requestTokenPassword(url, clientId, clientSecret, email, password);
    if (!result.ok) {
      debugWarn('login() requestTokenPassword failed', result.error);
      return result;
    }
    debugLog('login() token ok, fetching user');
    const expiresAt = result.expiresAt != null ? result.expiresAt : null;
    setStoredToken({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken || null,
      expiresAt,
      userEmail: email,
    });
    try {
      const user = await fetchUser(url, result.accessToken);
      if (user?.email) {
        setStoredToken({
          userEmail: user.email,
          userTier: user.tier || 'free',
          userPlan: user.plan || null,
          userPlanLabel: user.planLabel || null,
          userAllowedTabs: user.allowedTabs || null,
          userFeatures: user.features || null,
          userLimits: user.limits || null,
          userTeam: user.team || null,
          userProfile: user.profile || null,
        });
      }
    } catch (e) {
      debugWarn('login() fetchUser failed (non-critical)', e?.message);
    }
    stampLastVerified();
    return { ok: true };
  }

  /**
   * Login with a pre-issued access token (e.g. from GitHub OAuth deep link).
   * Stores the token and fetches user info from /api/user.
   */
  async function loginWithToken(accessToken, email) {
    const { url } = getConfig();
    if (!url) {
      return { ok: false, error: 'Sign-in server URL not configured.' };
    }
    if (!accessToken) {
      return { ok: false, error: 'No access token provided.' };
    }
    debugLog('loginWithToken()', { url, email });
    setStoredToken({
      accessToken,
      refreshToken: null,
      expiresAt: null,
      userEmail: email || null,
    });
    try {
      const user = await fetchUser(url, accessToken);
      if (user?.email) {
        setStoredToken({
          userEmail: user.email,
          userTier: user.tier || 'free',
          userPlan: user.plan || null,
          userPlanLabel: user.planLabel || null,
          userAllowedTabs: user.allowedTabs || null,
          userFeatures: user.features || null,
          userLimits: user.limits || null,
          userTeam: user.team || null,
          userProfile: user.profile || null,
        });
      }
    } catch (e) {
      debugWarn('loginWithToken() fetchUser failed (non-critical)', e?.message);
    }
    stampLastVerified();
    return { ok: true };
  }

  /**
   * Build the URL to start GitHub OAuth for the desktop app.
   */
  function getGitHubOAuthUrl() {
    const { url } = getConfig();
    if (!url) return null;
    return `${url.replace(/\/+$/, '')}/auth/desktop/github`;
  }

  function logout() {
    clearStoredToken();
    return { ok: true };
  }

  /**
   * Request a password reset email from the Laravel backend.
   * POSTs to the configured backend URL (same as login) /api/forgot-password with JSON { email }.
   * @param {string} email
   * @returns {{ ok: true } | { ok: false, error: string, debug?: { url: string, status?: number, body?: unknown } }}
   */
  async function requestPasswordReset(email) {
    const { url } = getConfig();
    if (!url || !email || typeof email !== 'string') {
      return { ok: false, error: 'Email is required' };
    }
    const resetUrl = `${url.replace(/\/+$/, '')}/api/forgot-password`;
    const debugInfo = { url: resetUrl };
    debugLog('POST', resetUrl, { email: email.trim() });
    try {
      const res = await fetch(resetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      debugInfo.status = res.status;
      const data = await res.json().catch(() => ({}));
      debugInfo.body = data;
      if (res.ok) {
        return { ok: true };
      }
      const msg = data.message || data.error || data.errors?.email?.[0] || res.statusText || 'Request failed';
      const errorStr = typeof msg === 'string' ? msg : JSON.stringify(msg);
      console.warn('[licenseServer] requestPasswordReset failed', { resetUrl, status: res.status, data, error: errorStr });
      return { ok: false, error: errorStr, debug: debugInfo };
    } catch (e) {
      const errMsg = e?.message || 'Network error';
      const cause = e?.cause ? ` (${e.cause?.message || e.cause})` : '';
      const fullMsg = `${errMsg}${cause}`;
      console.warn('[licenseServer] requestPasswordReset fetch failed', { resetUrl, error: errMsg, cause: e?.cause, name: e?.name });
      return { ok: false, error: fullMsg, debug: debugInfo };
    }
  }

  /**
   * Register a new account. POSTs to /api/register with { name, email, password, password_confirmation }.
   * Does not log in; call login() after a successful register to sign in.
   * @param {string} name
   * @param {string} email
   * @param {string} password
   * @param {string} passwordConfirmation
   * @returns {{ ok: true } | { ok: false, error: string }}
   */
  async function register(name, email, password, passwordConfirmation) {
    const { url } = getConfig();
    if (!url) return { ok: false, error: 'Sign-in server URL not configured.' };
    if (!email || typeof email !== 'string' || !email.trim()) return { ok: false, error: 'Email is required.' };
    if (!password || typeof password !== 'string') return { ok: false, error: 'Password is required.' };
    if (password !== passwordConfirmation) return { ok: false, error: 'Password and confirmation do not match.' };
    const registerUrl = `${url.replace(/\/+$/, '')}/api/register`;
    debugLog('POST', registerUrl, { name: name?.trim(), email: email.trim() });
    try {
      const res = await fetch(registerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: (name || '').toString().trim() || email.trim(),
          email: email.trim(),
          password,
          password_confirmation: typeof passwordConfirmation === 'string' ? passwordConfirmation : password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return { ok: true };
      }
      const msg = data.message || data.errors?.email?.[0] || data.errors?.password?.[0] || res.statusText || 'Registration failed';
      return { ok: false, error: typeof msg === 'string' ? msg : JSON.stringify(msg) };
    } catch (e) {
      const errMsg = e?.message || 'Network error';
      const cause = e?.cause ? ` (${e.cause?.message || e.cause})` : '';
      return { ok: false, error: `${errMsg}${cause}` };
    }
  }

  /**
   * Ensure we have a valid access token (refresh if needed).
   * Returns { ok: true, accessToken, ... } or { ok: false, networkError?: true }.
   * Does NOT clear tokens on network errors — only on confirmed auth failures (401/403).
   */
  async function ensureValidToken() {
    const { url, clientId, clientSecret } = getConfig();
    const stored = getStoredToken();
    if (!stored.accessToken) {
      debugLog('ensureValidToken() no stored access token');
      return { ok: false };
    }

    // Personal access tokens: no expiresAt and no refreshToken — validate by calling /api/user
    if (stored.expiresAt == null && !stored.refreshToken) {
      if (!url) {
        debugLog('ensureValidToken() PAT but no server URL');
        return { ok: false };
      }
      debugLog('ensureValidToken() personal access token, verifying via /api/user');
      let user;
      try {
        user = await fetchUser(url, stored.accessToken);
      } catch (e) {
        debugWarn('ensureValidToken() PAT network error', e?.message);
        return { ok: false, networkError: true };
      }
      if (user === null || !user?.email) {
        debugWarn('ensureValidToken() PAT auth failed (401/invalid), clearing token');
        clearStoredToken();
        return { ok: false };
      }
      setStoredToken({
        userEmail: user.email,
        userTier: user.tier || 'free',
        userPlan: user.plan || null,
        userPlanLabel: user.planLabel || null,
        userAllowedTabs: user.allowedTabs || null,
        userFeatures: user.features || null,
        userLimits: user.limits || null,
        userTeam: user.team || null,
        userProfile: user.profile || null,
      });
      const updated = getStoredToken();
      return {
        ok: true,
        accessToken: stored.accessToken,
        userEmail: updated.userEmail,
        userTier: updated.userTier,
        userPlan: updated.userPlan,
        userPlanLabel: updated.userPlanLabel,
        userAllowedTabs: updated.userAllowedTabs,
        userFeatures: updated.userFeatures,
        userLimits: updated.userLimits,
        userTeam: updated.userTeam,
        userProfile: updated.userProfile,
      };
    }

    // Password grant tokens with expiry
    if (!url || !clientId || !clientSecret) {
      debugLog('ensureValidToken() no config');
      return { ok: false };
    }
    if (!isTokenExpired(stored.expiresAt)) {
      debugLog('ensureValidToken() using existing token');
      return {
        ok: true,
        accessToken: stored.accessToken,
        userEmail: stored.userEmail,
        userTier: stored.userTier,
        userPlan: stored.userPlan,
        userPlanLabel: stored.userPlanLabel,
        userAllowedTabs: stored.userAllowedTabs,
        userFeatures: stored.userFeatures,
        userLimits: stored.userLimits,
        userTeam: stored.userTeam,
        userProfile: stored.userProfile,
      };
    }
    debugLog('ensureValidToken() token expired, refreshing');
    if (!stored.refreshToken || !url || !clientId || !clientSecret) return { ok: false };
    const refresh = await requestTokenRefresh(url, clientId, clientSecret, stored.refreshToken);
    if (!refresh.ok) {
      if (isNetworkError(refresh.error)) {
        debugWarn('ensureValidToken() refresh network error', refresh.error);
        return { ok: false, networkError: true };
      }
      debugWarn('ensureValidToken() refresh auth failed, clearing token', refresh.error);
      clearStoredToken();
      return { ok: false };
    }
    setStoredToken({
      accessToken: refresh.accessToken,
      refreshToken: refresh.refreshToken,
      expiresAt: refresh.expiresAt,
    });
    let user;
    try {
      user = await fetchUser(url, refresh.accessToken);
    } catch (_) { /* non-critical */ }
    if (user?.email) {
      setStoredToken({
        userEmail: user.email,
        userTier: user.tier || 'free',
        userPlan: user.plan || null,
        userPlanLabel: user.planLabel || null,
        userAllowedTabs: user.allowedTabs || null,
        userFeatures: user.features || null,
        userLimits: user.limits || null,
        userTeam: user.team || null,
        userProfile: user.profile || null,
      });
    }
    const updated = getStoredToken();
    return {
      ok: true,
      accessToken: refresh.accessToken,
      userEmail: updated.userEmail,
      userTier: updated.userTier,
      userPlan: updated.userPlan,
      userPlanLabel: updated.userPlanLabel,
      userAllowedTabs: updated.userAllowedTabs,
      userFeatures: updated.userFeatures,
      userLimits: updated.userLimits,
      userTeam: updated.userTeam,
      userProfile: updated.userProfile,
    };
  }

  function isNetworkError(errString) {
    if (!errString || typeof errString !== 'string') return false;
    const lower = errString.toLowerCase();
    return lower.includes('network') || lower.includes('fetch') || lower.includes('econnrefused')
      || lower.includes('enotfound') || lower.includes('timeout') || lower.includes('could not connect')
      || lower.includes('abort') || lower.includes('dns');
  }

  /**
   * Returns { valid: true } or { valid: false, networkError?: true }.
   */
  async function hasValidRemoteLicense() {
    const result = await ensureValidToken();
    if (result.ok) return { valid: true };
    return { valid: false, networkError: !!result.networkError };
  }

  /**
   * Get current remote session info for UI (email, tier, permissions from Laravel).
   */
  async function getRemoteSession() {
    const result = await ensureValidToken();
    if (!result.ok) return { loggedIn: false };
    return {
      loggedIn: true,
      email: result.userEmail || null,
      tier: result.userTier || 'free',
      plan: result.userPlan || null,
      plan_label: result.userPlanLabel || null,
      permissions: result.userAllowedTabs != null ? { tabs: result.userAllowedTabs } : null,
      features: result.userFeatures || null,
      limits: result.userLimits || null,
      team: result.userTeam || null,
      profile: result.userProfile || null,
    };
  }

  function stampLastVerified() {
    setPreference(PREF_LAST_VERIFIED, Math.floor(Date.now() / 1000));
  }

  function getLastVerifiedAt() {
    const v = getPreference(PREF_LAST_VERIFIED);
    return typeof v === 'number' ? v : null;
  }

  function getOfflineGraceDays() {
    const v = getPreference(PREF_OFFLINE_GRACE_DAYS);
    return typeof v === 'number' && v >= 0 ? v : DEFAULT_OFFLINE_GRACE_DAYS;
  }

  function setOfflineGraceDays(days) {
    const n = typeof days === 'number' && days >= 0 ? Math.floor(days) : DEFAULT_OFFLINE_GRACE_DAYS;
    setPreference(PREF_OFFLINE_GRACE_DAYS, n);
  }

  /**
   * Check if the offline grace period is still valid.
   * Returns { valid: true, daysRemaining } or { valid: false, daysExpired }.
   */
  function checkOfflineGrace() {
    const lastVerified = getLastVerifiedAt();
    if (lastVerified == null) return { valid: false, daysRemaining: 0, daysExpired: 0 };
    const graceDays = getOfflineGraceDays();
    const nowSec = Math.floor(Date.now() / 1000);
    const elapsedSec = nowSec - lastVerified;
    const elapsedDays = elapsedSec / 86400;
    const remaining = Math.max(0, graceDays - elapsedDays);
    if (remaining > 0) {
      return { valid: true, daysRemaining: Math.ceil(remaining), graceDays };
    }
    return { valid: false, daysRemaining: 0, daysExpired: Math.floor(elapsedDays - graceDays), graceDays };
  }

  /**
   * Get cached license info for offline use. Returns the stored user data
   * without hitting the network at all.
   */
  function getCachedLicense() {
    const stored = getStoredToken();
    if (!stored.accessToken) return null;
    return {
      email: stored.userEmail,
      tier: stored.userTier || 'free',
      planLabel: stored.userPlanLabel,
      allowedTabs: stored.userAllowedTabs,
      features: stored.userFeatures,
      limits: stored.userLimits,
      team: stored.userTeam || null,
      profile: stored.userProfile || null,
      lastVerifiedAt: getLastVerifiedAt(),
    };
  }

  return {
    getConfig,
    getEnvironments,
    setConfig,
    getStoredToken,
    clearStoredToken,
    login,
    loginWithToken,
    getGitHubOAuthUrl,
    logout,
    requestPasswordReset,
    register,
    ensureValidToken,
    hasValidRemoteLicense,
    getRemoteSession,
    stampLastVerified,
    getLastVerifiedAt,
    getOfflineGraceDays,
    setOfflineGraceDays,
    checkOfflineGrace,
    getCachedLicense,
  };
}

module.exports = { createLicenseServer };
