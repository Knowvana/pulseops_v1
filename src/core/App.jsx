// ============================================================================
// App — PulseOps V1 (Core Entry Point)
//
// PURPOSE: Root React component. Manages authentication state and routes
// between the LoginForm and PlatformDashboard. Uses CoreAuthService for
// built-in admin login that works WITHOUT a backend API or database.
//
// ARCHITECTURE:
//   1. On mount, checks for existing session via CoreAuthService.getCurrentUser()
//      - First tries backend HttpOnly cookie session (if backend is up)
//      - Falls back to localStorage core admin session (offline mode)
//   2. If authenticated → renders PlatformDashboard
//   3. If not → renders LoginForm
//   4. Listens for 'auth:session-expired' events from ApiClient
//
// CORE ADMIN LOGIN (works without backend):
//   Default credentials: admin@pulseops.local / PulseOps@2024
//   Can be changed via Core Settings once logged in.
//   When Auth module is installed, it provides full user management.
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
      Logger.warn('App', logMessages.coreAuth.sessionExpired);
    };
    window.addEventListener(constants.coreAuth.sessionExpiredEvent, handleSessionExpired);
    return () => window.removeEventListener(constants.coreAuth.sessionExpiredEvent, handleSessionExpired);
  }, []);

  // ── Login handler ─────────────────────────────────────────────────────────
  // CoreAuthService.login() tries backend first, falls back to core admin creds
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

  // ── Authenticated → show platform ─────────────────────────────────────────
  return <PlatformDashboard user={user} onLogout={handleLogout} />;
}
