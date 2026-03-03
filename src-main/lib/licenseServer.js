/**
 * License server client for Laravel Passport.
 * Supports password grant (login with email/password), token refresh, and optional /api/user.
 *
 * @param {{ getPreference: (key: string) => any, setPreference: (key: string, value: any) => void }} deps
 */
function createLicenseServer(deps) {
  const { getPreference, setPreference } = deps;

  const PREF_BASE = 'licenseServer';
  const PREF_URL = `${PREF_BASE}.url`;
  const PREF_CLIENT_ID = `${PREF_BASE}.clientId`;
  const PREF_CLIENT_SECRET = `${PREF_BASE}.clientSecret`;
  const PREF_ACCESS_TOKEN = `${PREF_BASE}.accessToken`;
  const PREF_REFRESH_TOKEN = `${PREF_BASE}.refreshToken`;
  const PREF_EXPIRES_AT = `${PREF_BASE}.expiresAt`;
  const PREF_USER_EMAIL = `${PREF_BASE}.userEmail`;

  /** Seconds before expiry to consider token expired and refresh. */
  const REFRESH_BUFFER_SEC = 60;

  function getConfig() {
    const url = (getPreference(PREF_URL) || '').toString().trim().replace(/\/+$/, '');
    const clientId = (getPreference(PREF_CLIENT_ID) || '').toString().trim();
    const clientSecret = (getPreference(PREF_CLIENT_SECRET) || '').toString().trim();
    return { url, clientId, clientSecret };
  }

  function setConfig({ url = '', clientId = '', clientSecret = '' } = {}) {
    setPreference(PREF_URL, (url || '').toString().trim().replace(/\/+$/, ''));
    setPreference(PREF_CLIENT_ID, (clientId || '').toString().trim());
    setPreference(PREF_CLIENT_SECRET, (clientSecret || '').toString().trim());
  }

  function getStoredToken() {
    const accessToken = getPreference(PREF_ACCESS_TOKEN);
    const refreshToken = getPreference(PREF_REFRESH_TOKEN);
    const expiresAt = getPreference(PREF_EXPIRES_AT);
    const userEmail = getPreference(PREF_USER_EMAIL);
    return {
      accessToken: typeof accessToken === 'string' ? accessToken : null,
      refreshToken: typeof refreshToken === 'string' ? refreshToken : null,
      expiresAt: typeof expiresAt === 'number' ? expiresAt : null,
      userEmail: typeof userEmail === 'string' ? userEmail : null,
    };
  }

  function setStoredToken({ accessToken, refreshToken, expiresAt, userEmail } = {}) {
    if (accessToken !== undefined) setPreference(PREF_ACCESS_TOKEN, accessToken || null);
    if (refreshToken !== undefined) setPreference(PREF_REFRESH_TOKEN, refreshToken || null);
    if (expiresAt !== undefined) setPreference(PREF_EXPIRES_AT, expiresAt || null);
    if (userEmail !== undefined) setPreference(PREF_USER_EMAIL, userEmail || null);
  }

  function clearStoredToken() {
    setStoredToken({ accessToken: null, refreshToken: null, expiresAt: null, userEmail: null });
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
      if (!res.ok) {
        const msg = data.message || data.error_description || data.error || res.statusText || 'Login failed';
        return { ok: false, error: typeof msg === 'string' ? msg : JSON.stringify(msg) };
      }
      const accessToken = data.access_token;
      const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 0;
      const expiresAt = expiresIn > 0 ? Math.floor(Date.now() / 1000) + expiresIn : null;
      const refreshToken = data.refresh_token || null;
      if (!accessToken) return { ok: false, error: 'No access token in response' };
      return { ok: true, accessToken, refreshToken, expiresIn, expiresAt };
    } catch (e) {
      return { ok: false, error: e.message || 'Network error' };
    }
  }

  /**
   * POST to Laravel Passport /oauth/token (refresh_token grant).
   */
  async function requestTokenRefresh(baseUrl, clientId, clientSecret, refreshToken) {
    const tokenUrl = `${baseUrl}/oauth/token`;
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
      if (!res.ok) {
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
      return { ok: false, error: e.message || 'Network error' };
    }
  }

  /**
   * GET baseUrl/api/user with Bearer token. Returns { email } or null.
   */
  async function fetchUser(baseUrl, accessToken) {
    const userUrl = `${baseUrl}/api/user`;
    try {
      const res = await fetch(userUrl, {
        method: 'GET',
        headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return null;
      const data = await res.json().catch(() => ({}));
      const email = data.email;
      return typeof email === 'string' ? { email } : null;
    } catch {
      return null;
    }
  }

  /**
   * Login with email and password. Stores token and optionally fetches user email.
   */
  async function login(email, password) {
    const { url, clientId, clientSecret } = getConfig();
    if (!url || !clientId || !clientSecret) {
      return { ok: false, error: 'License server not configured. Set server URL, Client ID, and Client secret in Settings.' };
    }
    const result = await requestTokenPassword(url, clientId, clientSecret, email, password);
    if (!result.ok) return result;
    const expiresAt = result.expiresAt != null ? result.expiresAt : null;
    setStoredToken({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken || null,
      expiresAt,
      userEmail: email,
    });
    const user = await fetchUser(url, result.accessToken);
    if (user?.email) setStoredToken({ userEmail: user.email });
    return { ok: true };
  }

  function logout() {
    clearStoredToken();
    return { ok: true };
  }

  /**
   * Ensure we have a valid access token (refresh if needed). Returns { ok: true, accessToken, userEmail? } or { ok: false }.
   */
  async function ensureValidToken() {
    const { url, clientId, clientSecret } = getConfig();
    const stored = getStoredToken();
    if (!stored.accessToken) return { ok: false };
    if (!isTokenExpired(stored.expiresAt)) {
      return { ok: true, accessToken: stored.accessToken, userEmail: stored.userEmail };
    }
    if (!stored.refreshToken || !url || !clientId || !clientSecret) return { ok: false };
    const refresh = await requestTokenRefresh(url, clientId, clientSecret, stored.refreshToken);
    if (!refresh.ok) {
      clearStoredToken();
      return { ok: false };
    }
    setStoredToken({
      accessToken: refresh.accessToken,
      refreshToken: refresh.refreshToken,
      expiresAt: refresh.expiresAt,
    });
    const user = await fetchUser(url, refresh.accessToken);
    if (user?.email) setStoredToken({ userEmail: user.email });
    return { ok: true, accessToken: refresh.accessToken, userEmail: getStoredToken().userEmail };
  }

  /**
   * Returns whether the license server considers this session licensed (valid token).
   */
  async function hasValidRemoteLicense() {
    const result = await ensureValidToken();
    return result.ok === true;
  }

  /**
   * Get current remote session info for UI (email, whether logged in).
   */
  async function getRemoteSession() {
    const result = await ensureValidToken();
    if (!result.ok) return { loggedIn: false };
    return { loggedIn: true, email: result.userEmail || null };
  }

  return {
    getConfig,
    setConfig,
    getStoredToken,
    clearStoredToken,
    login,
    logout,
    ensureValidToken,
    hasValidRemoteLicense,
    getRemoteSession,
  };
}

module.exports = { createLicenseServer };
