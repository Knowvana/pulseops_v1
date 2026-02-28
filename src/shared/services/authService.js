// ============================================================================
// AuthService — PulseOps V1
//
// PURPOSE: Authentication service used by the Auth module (add-on).
// Handles login, logout, session management via the backend API.
// Uses HttpOnly cookies — frontend NEVER touches JWT tokens directly.
//
// NOTE: This service requires the Auth module to be installed and the
// backend API to be running. For core admin login without backend,
// use CoreAuthService instead.
//
// SECURITY (XSS Protection):
//   - JWT tokens stored in HttpOnly cookies set by the backend
//   - All requests use credentials: 'include' (cookies sent automatically)
//   - Frontend cannot read or modify tokens — immune to XSS
//   - RBAC enforced server-side, client only hides UI elements
//
// USAGE:
//   import { AuthService } from '@shared';
//   const user = await AuthService.login(email, password);
//   const currentUser = await AuthService.getCurrentUser();
//   AuthService.logout();
//
// DEPENDENCIES:
//   - @shared/services/apiClient.js     → HTTP calls (credentials: 'include')
//   - @shared/services/logger.js        → Logging
//   - @shared/config/urls.json          → Auth endpoints
//   - @shared/config/logMessages.json   → Log templates
//   - @shared/config/errorMessages.json → Error templates
//   - @shared/config/constants.json     → Role hierarchy
// ============================================================================
import ApiClient from '@shared/services/apiClient';
import Logger from '@shared/services/logger';
import urls from '@shared/config/urls.json';
import logMessages from '@shared/config/logMessages.json';
import errorMessages from '@shared/config/errorMessages.json';
import constants from '@shared/config/constants.json';

const AuthService = {
  /**
   * Authenticate a user with email and password.
   * Backend sets HttpOnly cookie on success — frontend stores nothing.
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @returns {Promise<Object>} User object { id, name, email, role }
   * @throws {Error} On invalid credentials or network failure
   */
  async login(email, password) {
    const response = await ApiClient.post(urls.authLogin, { email, password });

    if (response?.success && response?.data?.user) {
      const user = response.data.user;
      Logger.info('AuthService', logMessages.auth.loginSuccess, { userId: user.id, email: user.email });
      return user;
    }

    const errorMsg = response?.error?.message || errorMessages.auth.invalidCredentials;
    Logger.warn('AuthService', logMessages.auth.loginFailed, { email, error: errorMsg });
    throw new Error(errorMsg);
  },

  /**
   * Get the currently authenticated user by validating the HttpOnly cookie.
   * The browser sends the cookie automatically via credentials: 'include'.
   * @returns {Promise<Object|null>} User object or null
   */
  async getCurrentUser() {
    try {
      const response = await ApiClient.get(urls.authMe);
      if (response?.success && response?.data) {
        Logger.debug('AuthService', logMessages.auth.sessionRestored, { userId: response.data.id });
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Refresh the session. Backend handles cookie rotation.
   * @returns {Promise<boolean>} True if refresh succeeded
   */
  async refreshToken() {
    try {
      const response = await ApiClient.post(urls.authRefresh);
      if (response?.success) {
        Logger.debug('AuthService', logMessages.auth.tokenRefreshed);
        return true;
      }
      return false;
    } catch {
      Logger.warn('AuthService', logMessages.auth.tokenRefreshFailed);
      return false;
    }
  },

  /**
   * Log out the current user. Backend clears the HttpOnly cookie.
   */
  logout() {
    ApiClient.post(urls.authLogout).catch(() => {});
    Logger.info('AuthService', logMessages.auth.logoutSuccess);
  },

  /**
   * Check if a user has a specific role or higher in the role hierarchy.
   * @param {Object} user - User object with role property
   * @param {string} requiredRole - Minimum required role
   * @returns {boolean}
   */
  hasRole(user, requiredRole) {
    if (!user?.role || !requiredRole) return false;
    const hierarchy = constants.coreAuth.roleHierarchy;
    const userIndex = hierarchy.indexOf(user.role);
    const requiredIndex = hierarchy.indexOf(requiredRole);
    return userIndex >= 0 && userIndex <= requiredIndex;
  },

  /**
   * Check if a user has any of the specified roles.
   * @param {Object} user - User object with role property
   * @param {string[]} roles - Array of allowed roles
   * @returns {boolean}
   */
  hasAnyRole(user, roles) {
    if (!user?.role || !roles?.length) return false;
    return roles.includes(user.role);
  },

  /**
   * Check if user is authenticated (requires API call with HttpOnly cookies).
   * For quick sync check, use CoreAuthService.isAuthenticated() instead.
   * @returns {Promise<boolean>}
   */
  async isAuthenticated() {
    const user = await this.getCurrentUser();
    return !!user;
  },
};

export default AuthService;
