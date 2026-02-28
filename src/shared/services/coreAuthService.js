// ============================================================================
// CoreAuthService — PulseOps V1
//
// PURPOSE: Platform authentication service. All login/logout/session logic
// flows through the API. The API's Auth Module determines the active provider
// (json_file | database | social) — this service is provider-agnostic.
//
// ARCHITECTURE:
//   1. login() → POST /api/auth/login → API validates via active provider
//   2. API returns JWT { accessToken, refreshToken, user }
//   3. Token stored in localStorage + immediately set on ApiClient (Bearer)
//   4. On page reload, getCurrentUser() restores token from localStorage
//   5. logout() clears localStorage + ApiClient token
//
// BOOTSTRAP (no database):
//   - auth-provider.json defaults to 'json_file'
//   - API validates against users.json (default admin: admin@test.com / Infosys@123)
//   - No DB required — works out of the box
//
// SWITCHING PROVIDERS:
//   - Once DB is initialized, go to Auth Module → Config → Auth Provider
//   - Select 'Database' and save → API updates auth-provider.json + system_config
//   - Subsequent logins route to DB authentication
//
// USAGE:
//   import { CoreAuthService } from '@shared';
//   const user = await CoreAuthService.login(email, password);
//   CoreAuthService.logout();
//
// DEPENDENCIES:
//   - @shared/config/constants.json     → Session key, role hierarchy
//   - @shared/config/urls.json          → Auth endpoints
//   - @shared/config/errorMessages.json → Error templates
//   - @shared/services/apiClient.js     → HTTP calls (lazy import, avoids circular)
// ============================================================================
import constants from '@shared/config/constants.json';
import urls from '@shared/config/urls.json';
import errorMessages from '@shared/config/errorMessages.json';

const { sessionKey, roleHierarchy } = constants.coreAuth;

const CoreAuthService = {
  /**
   * Authenticate via the API (provider-agnostic).
   * The active provider (json_file | database) is determined by the API.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>} User object { id, name, email, role, authMethod }
   */
  async login(email, password) {
    const { default: ApiClient } = await import('@shared/services/apiClient');
    const response = await ApiClient.post(urls.authLogin, { email, password });

    if (response?.success && response?.data) {
      const { user, accessToken, refreshToken, expiresIn } = response.data;
      ApiClient.setToken(accessToken);
      this._storeSession(user, accessToken, refreshToken, expiresIn);
      return user;
    }

    const msg = response?.error?.message || errorMessages.coreAuth.invalidCredentials;
    throw new Error(msg);
  },

  /**
   * Restore session from localStorage on page reload.
   * Reattaches the stored Bearer token to ApiClient without an API call.
   * @returns {Promise<Object|null>} User object or null
   */
  async getCurrentUser() {
    const session = this._getStoredSession();
    if (!session) return null;

    const { default: ApiClient } = await import('@shared/services/apiClient');
    if (session.accessToken) {
      ApiClient.setToken(session.accessToken);
    }
    return session.user;
  },

  /**
   * Log out — clears localStorage session and ApiClient token.
   * Notifies the API (fire-and-forget).
   */
  logout() {
    localStorage.removeItem(sessionKey);
    import('@shared/services/apiClient').then(({ default: ApiClient }) => {
      ApiClient.clearToken();
      ApiClient.post(urls.authLogout).catch(() => {});
    }).catch(() => {});
  },

  /**
   * Store session data in localStorage.
   */
  _storeSession(user, accessToken, refreshToken, expiresIn) {
    const expiresAt = new Date(Date.now() + (expiresIn || 86400) * 1000).toISOString();
    const session = { user, accessToken, refreshToken, expiresAt, timestamp: new Date().toISOString() };
    localStorage.setItem(sessionKey, JSON.stringify(session));
  },

  /**
   * Read stored session from localStorage. Returns null if expired.
   */
  _getStoredSession() {
    const raw = localStorage.getItem(sessionKey);
    if (!raw) return null;
    try {
      const session = JSON.parse(raw);
      if (new Date(session.expiresAt) < new Date()) {
        localStorage.removeItem(sessionKey);
        return null;
      }
      return session;
    } catch {
      localStorage.removeItem(sessionKey);
      return null;
    }
  },

  /**
   * Quick sync check — does a non-expired session exist in localStorage?
   */
  isAuthenticated() {
    return !!this._getStoredSession();
  },

  /**
   * Check if user has a specific role or higher in the hierarchy.
   */
  hasRole(user, requiredRole) {
    if (!user?.role || !requiredRole) return false;
    const userIndex = roleHierarchy.indexOf(user.role);
    const requiredIndex = roleHierarchy.indexOf(requiredRole);
    return userIndex >= 0 && userIndex <= requiredIndex;
  },

  /**
   * Check if user has any of the specified roles.
   */
  hasAnyRole(user, roles) {
    if (!user?.role || !roles?.length) return false;
    return roles.includes(user.role);
  },
};

export default CoreAuthService;
