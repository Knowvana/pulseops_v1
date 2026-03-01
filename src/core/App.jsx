// ============================================================================
// App — PulseOps V1 (Core Entry Point)
//
// PURPOSE: Root React component. Manages authentication state and routes
// between the LoginForm and PlatformDashboard. Uses CoreAuthService which
// delegates all auth to the API (provider-agnostic).
//
// ARCHITECTURE:
//   1. On mount, restores session from localStorage via CoreAuthService.getCurrentUser()
//      - Reattaches JWT Bearer token to ApiClient (no API call needed)
//   2. If authenticated → renders PlatformDashboard
//   3. If not → renders LoginForm
//   4. Listens for 'auth:session-expired' events from ApiClient
//
// AUTH PROVIDERS (configured in Auth Module → Config):
//   - JSON File (default): works without a database
//   - Database: switch to this once DB is initialized
//
// USAGE: Rendered by main.jsx as the root component.
//
// DEPENDENCIES:
//   - @shared → LoginForm, LoadingSpinner, CoreAuthService, Logger, ApiClient
//   - @core/PlatformDashboard → Main authenticated UI
//   - @shared/config/constants.json → Session expired event name
//   - @shared/config/logMessages.json → Log templates
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { LoginForm, LoadingSpinner, CoreAuthService, Logger, ApiClient } from '@shared';
import PlatformDashboard from '@core/PlatformDashboard';
import constants from '@shared/config/constants.json';
import logMessages from '@shared/config/logMessages.json';
import appConfig from '@shared/config/app.json';

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // ── Check existing session on mount ───────────────────────────────────────
  // Tries backend HttpOnly cookie first, falls back to localStorage session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const currentUser = await CoreAuthService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          Logger.setUser(currentUser);
          ApiClient.setUser(currentUser);
          Logger.info('App', logMessages.coreAuth.sessionRestored, { userId: currentUser.id });
        }
      } catch {
        // No valid session — show login
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  // ── Listen for session-expired events from ApiClient ──────────────────────
  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      Logger.setUser(null);
      ApiClient.setUser(null);
      ApiClient.clearToken();
      Logger.warn('App', logMessages.coreAuth.sessionExpired);
    };
    window.addEventListener(constants.coreAuth.sessionExpiredEvent, handleSessionExpired);
    return () => window.removeEventListener(constants.coreAuth.sessionExpiredEvent, handleSessionExpired);
  }, []);

  // ── Login handler ─────────────────────────────────────────────────────────
  // CoreAuthService.login() calls the API — provider determined by Auth Module config
  const handleLogin = useCallback(async (email, password) => {
    setIsLoggingIn(true);
    try {
      const loggedInUser = await CoreAuthService.login(email, password);
      setUser(loggedInUser);
      Logger.setUser(loggedInUser);
      ApiClient.setUser(loggedInUser);
      Logger.info('App', logMessages.coreAuth.loginSuccess, { email: loggedInUser.email });
    } catch (err) {
      throw err;
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  // ── Logout handler ────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    CoreAuthService.logout();
    setUser(null);
    Logger.setUser(null);
    ApiClient.setUser(null);
    ApiClient.clearToken();
    Logger.info('App', logMessages.coreAuth.logoutSuccess);
  }, []);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return <LoadingSpinner title={appConfig.appName} subtitle="Loading..." />;
  }

  // ── Not authenticated → show login ────────────────────────────────────────
  if (!user) {
    return <LoginForm onLogin={handleLogin} isLoading={isLoggingIn} />;
  }

  // ── Authenticated → show platform with routing ────────────────────────────
  return (
    <BrowserRouter>
      <PlatformDashboard user={user} onLogout={handleLogout} />
    </BrowserRouter>
  );
}
