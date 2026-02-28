// ============================================================================
// CoreAuthService — PulseOps V1
//
// PURPOSE: Built-in core admin authentication that works WITHOUT a backend
// API or database. This is the platform's bootstrap authentication — it
// allows the core admin to login, configure the system, install modules,
// and set up the database BEFORE the Auth module is installed.
//
// ARCHITECTURE:
//   1. Default admin credentials are defined in constants.json
//   2. Admin can update credentials via Core Settings (stored in localStorage)
//   3. Session is stored in localStorage (sessionKey)
//   4. When Auth module is installed, it provides full user management
//   5. CoreAuthService is ALWAYS available — it's the fallback
//
// SECURITY:
//   - Core admin credentials are stored in localStorage (not ideal for
//     production but necessary for offline bootstrap)
//   - When backend is available, HttpOnly cookies are used for API auth
//   - Core admin session is separate from Auth module sessions
//   - Only super_admin role has access to core admin
//
// FLOW:
//   1. User enters email/password on login form
//   2. CoreAuthService.login() checks against stored or default creds
//   3. If Auth module is installed + backend is up → delegates to backend
//   4. If not → validates locally against core admin credentials
//   5. On success → stores session in localStorage, returns user object
//
// USAGE:
//   import { CoreAuthService } from '@shared';
//   const user = await CoreAuthService.login(email, password);
//   CoreAuthService.logout();
//
// DEPENDENCIES:
//   - @shared/config/constants.json     → Default admin, session keys
//   - @shared/config/logMessages.json   → Log templates
//   - @shared/config/errorMessages.json → Error templates
//   - @shared/services/apiClient.js     → For backend auth (when available)
//   - @shared/services/logger.js        → Logging
// ============================================================================
import constants from '@shared/config/constants.json';
import logMessages from '@shared/config/logMessages.json';
import errorMessages from '@shared/config/errorMessages.json';

const { configKey, sessionKey, defaultAdmin, roleHierarchy } = constants.coreAuth;

const CoreAuthService = {
  /**
   * Login with email and password.
   * First tries backend API (if available + Auth module installed).
   * Falls back to core admin credentials (offline mode).
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>} User object { id, name, email, role }
   */
  async login(email, password) {
    // Try backend API first (when Auth module is installed and backend is up)
    const backendUser = await this._tryBackendLogin(email, password);
    if (backendUser) return backendUser;

    // Fallback: validate against core admin credentials (offline mode)
    return this._coreAdminLogin(email, password);
  },

  /**
   * Attempt login via backend API. Returns null if backend is unavailable
   * or Auth module is not installed.
   */
  async _tryBackendLogin(email, password) {
    try {
      // Dynamic import to avoid circular dependency
      const { default: ApiClient } = await import('@shared/services/apiClient');
      const urls = await import('@shared/config/urls.json');

      const response = await ApiClient.post(urls.default.authLogin || urls.authLogin, { email, password });

      if (response?.success && response?.data?.user) {
        const user = response.data.user;
        this._storeSession(user);
        return user;
      }

      // If backend returned explicit error (not network failure), throw it
      if (response?.error?.message && response?.error?.code !== 'NETWORK_ERROR' && response?.error?.code !== 'TIMEOUT') {
        throw new Error(response.error.message);
      }

      return null;
    } catch (err) {
      // Network error or backend not available — fall through to core admin
      if (err.message?.includes('NETWORK_ERROR') || err.message?.includes('fetch')) {
        return null;
      }
      // Explicit auth error from backend — re-throw
      throw err;
    }
  },

  /**
   * Validate against core admin credentials stored in localStorage
   * or the defaults from constants.json.
   */
  _coreAdminLogin(email, password) {
    const creds = this._getCredentials();

    if (email === creds.email && password === creds.password) {
      const user = {
        id: 'core_admin_001',
        name: creds.name,
        email: creds.email,
        role: creds.role,
        isCoreAdmin: true,
      };
      this._storeSession(user);
      return user;
    }

    throw new Error(errorMessages.coreAuth.invalidCredentials);
  },

  /**
   * Get current core admin credentials (from localStorage or defaults).
   */
  _getCredentials() {
    const saved = localStorage.getItem(configKey);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* fall through */ }
    }
    return { ...defaultAdmin };
  },

  /**
   * Update core admin credentials.
   * @param {Object} newCreds - { email, password, name }
   */
  updateCredentials(newCreds) {
    const current = this._getCredentials();
    const updated = { ...current, ...newCreds };
    localStorage.setItem(configKey, JSON.stringify(updated));
  },

  /**
   * Store session in localStorage.
   */
  _storeSession(user) {
    const session = {
      user,
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    localStorage.setItem(sessionKey, JSON.stringify(session));
  },

  /**
   * Get the current authenticated user from the session.
   * Checks backend first (HttpOnly cookie), falls back to localStorage session.
   * @returns {Promise<Object|null>} User object or null
   */
  async getCurrentUser() {
    // Try backend session check first (HttpOnly cookie)
    const backendUser = await this._tryBackendSession();
    if (backendUser) return backendUser;

    // Fallback: check localStorage session
    return this._getLocalSession();
  },

  /**
   * Try to get current user from backend via HttpOnly cookie session.
   */
  async _tryBackendSession() {
    try {
      const { default: ApiClient } = await import('@shared/services/apiClient');
      const urls = await import('@shared/config/urls.json');

      // Suppress session-expired event — this is a probe, not a real session check.
      // Without this, a 401 from a missing backend causes App.jsx to flash to login.
      ApiClient.suppressSessionExpired(true);
      const response = await ApiClient.get(urls.default.authMe || urls.authMe);
      ApiClient.suppressSessionExpired(false);

      if (response?.success && response?.data) {
        return response.data;
      }
      return null;
    } catch {
      // Ensure suppression is cleared even on network error
      try {
        const { default: ApiClient } = await import('@shared/services/apiClient');
        ApiClient.suppressSessionExpired(false);
      } catch { /* ignore */ }
      return null;
    }
  },

  /**
   * Get user from localStorage session (core admin offline mode).
   */
  _getLocalSession() {
    const raw = localStorage.getItem(sessionKey);
    if (!raw) return null;

    try {
      const session = JSON.parse(raw);
      // Check expiry
      if (new Date(session.expiresAt) < new Date()) {
        localStorage.removeItem(sessionKey);
        return null;
      }
      return session.user;
    } catch {
      localStorage.removeItem(sessionKey);
      return null;
    }
  },

  /**
   * Logout — clears session from localStorage and notifies backend.
   */
  logout() {
    localStorage.removeItem(sessionKey);
    // Fire-and-forget backend logout
    import('@shared/services/apiClient').then(({ default: ApiClient }) => {
      import('@shared/config/urls.json').then((urls) => {
        ApiClient.post(urls.default.authLogout || urls.authLogout).catch(() => {});
      });
    }).catch(() => {});
  },

  /**
   * Check if a user has a specific role or higher in the role hierarchy.
   */
  hasRole(user, requiredRole) {
    if (!user?.role || !requiredRole) return false;
    const userIndex = roleHierarchy.indexOf(user.role);
    const requiredIndex = roleHierarchy.indexOf(requiredRole);
    return userIndex >= 0 && userIndex <= requiredIndex;
  },

  /**
   * Check if a user has any of the specified roles.
   */
  hasAnyRole(user, roles) {
    if (!user?.role || !roles?.length) return false;
    return roles.includes(user.role);
  },

  /**
   * Quick check if any session exists (no API call).
   */
  isAuthenticated() {
    const raw = localStorage.getItem(sessionKey);
    if (!raw) return false;
    try {
      const session = JSON.parse(raw);
      return new Date(session.expiresAt) > new Date();
    } catch {
      return false;
    }
  },
};

export default CoreAuthService;
