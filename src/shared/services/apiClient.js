// ============================================================================
// ApiClient Service — PulseOps V1
//
// PURPOSE: Centralized HTTP client for ALL backend API communication.
// Handles request/response logging, standardized error handling, and
// HttpOnly cookie-based authentication. Every service and module uses
// this client — never raw fetch().
//
// SECURITY (XSS Protection):
//   - JWT tokens are stored in HttpOnly cookies set by the backend.
//   - Frontend NEVER touches tokens directly — no localStorage exposure.
//   - All requests use credentials: 'include' to send cookies automatically.
//   - On 401, dispatches session-expired event for auth flow.
//
// USAGE:
//   import { ApiClient } from '@shared';
//   const data = await ApiClient.get('/users');
//   const result = await ApiClient.post('/auth/login', { email, password });
//
// DEPENDENCIES:
//   - @shared/config/urls.json        → Base URL
//   - @shared/config/constants.json   → Timeout, session event
//   - @shared/config/logMessages.json → Log message templates
// ============================================================================
import urlsConfig from '@shared/config/urls.json';
import constants from '@shared/config/constants.json';
import logMessages from '@shared/config/logMessages.json';

const { timeoutMs } = constants.api;

class ApiClientService {
  constructor() {
    // Base URL from config — all relative paths resolve against this
    this._baseUrl = urlsConfig.apiBaseUrl || '/api';
    // Logger reference set lazily to avoid circular dependency
    this._logger = null;
    // Current user reference for log context
    this._user = null;
    // When true, 401 responses will NOT dispatch session-expired event.
    // Used by CoreAuthService._tryBackendSession() to probe without side effects.
    this._suppressSessionExpired = false;
  }

  // ── Logger injection (avoids circular import) ─────────────────────────────
  setLogger(logger) { this._logger = logger; }
  setUser(user) { this._user = user; }
  suppressSessionExpired(flag) { this._suppressSessionExpired = !!flag; }

  // ── URL helpers ───────────────────────────────────────────────────────────
  getBaseUrl() { return this._baseUrl; }
  setBaseUrl(url) { this._baseUrl = url; }

  // ── Header builder ────────────────────────────────────────────────────────
  // No Authorization header needed — HttpOnly cookies are sent automatically
  // via credentials: 'include' on every request.
  _buildHeaders(customHeaders = {}) {
    return { 'Content-Type': 'application/json', ...customHeaders };
  }

  // ── Core request method ───────────────────────────────────────────────────
  async _request(method, path, body = null, customHeaders = {}) {
    const url = path.startsWith('http') ? path : `${this._baseUrl}${path}`;
    const start = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const options = {
        method,
        headers: this._buildHeaders(customHeaders),
        signal: controller.signal,
        credentials: 'include',
      };
      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - start);

      // Parse response
      const contentType = response.headers.get('content-type');
      let responseData = null;
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = { success: response.ok, status: response.status };
      }

      // Log API call
      this._logApiCall({
        method, url: path, path, statusCode: response.status,
        durationMs: latencyMs, success: response.ok,
        requestPayload: body, responsePayload: responseData,
      });

      // Handle 401 — dispatch session-expired event (HttpOnly cookie cleared by backend)
      // Skip if suppressed (e.g. CoreAuthService probing backend availability)
      if (response.status === 401 && !this._suppressSessionExpired) {
        this._logger?.warn('ApiClient', logMessages.coreAuth.sessionExpired);
        window.dispatchEvent(new CustomEvent(constants.coreAuth.sessionExpiredEvent));
      }

      return responseData;
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      const isTimeout = err.name === 'AbortError';
      const errorMsg = isTimeout ? logMessages.api.timeout : logMessages.api.requestFailed;

      this._logApiCall({
        method, url: path, path, statusCode: 0,
        durationMs: latencyMs, success: false,
        requestPayload: body, responsePayload: { error: err.message },
      });

      this._logger?.error('ApiClient', errorMsg, { method, path, error: err.message, latencyMs });
      return { success: false, error: { message: err.message, code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR' } };
    }
  }

  // ── Log API call (delegates to Logger if available) ───────────────────────
  _logApiCall(data) {
    if (this._logger?.logApiCall) {
      this._logger.logApiCall({
        ...data,
        user: this._user?.email || 'system',
      });
    }
  }

  // ── Public HTTP methods ───────────────────────────────────────────────────
  get(path, headers) { return this._request('GET', path, null, headers); }
  post(path, body, headers) { return this._request('POST', path, body, headers); }
  put(path, body, headers) { return this._request('PUT', path, body, headers); }
  patch(path, body, headers) { return this._request('PATCH', path, body, headers); }
  delete(path, headers) { return this._request('DELETE', path, null, headers); }
}

// ── Singleton export ──────────────────────────────────────────────────────────
const ApiClient = new ApiClientService();
export default ApiClient;
