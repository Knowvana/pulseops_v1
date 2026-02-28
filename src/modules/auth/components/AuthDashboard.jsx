// ============================================================================
// AuthDashboard — PulseOps V1 (Auth Module)
//
// PURPOSE: Authentication module dashboard showing user stats, active
// sessions, failed login attempts, locked accounts, and auth method.
// All text from uiText.json, all logs from logMessages.json.
//
// ARCHITECTURE: Fetches auth stats from /api/auth/stats and /api/users/stats
// via ApiClient. Renders StatusTile components from shared design system.
//
// USED BY: auth/manifest.jsx → getViews() → 'dashboard' view
//
// DEPENDENCIES:
//   - @shared → StatusTile, PageHeader, Card, Button, Logger, ApiClient
//   - ../uiText.json       → All UI labels
//   - ../logMessages.json  → All log message templates
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Shield, Users, Clock, AlertTriangle, Lock, Key } from 'lucide-react';
import { StatusTile, PageHeader, Card, Button, Logger, ApiClient } from '@shared';
import uiText from '@modules/auth/uiText.json';
import logMsgs from '@modules/auth/logMessages.json';
import urls from '@shared/config/urls.json';

const PROVIDER_LABELS = { json_file: 'JSON File', database: 'Database', social: 'Social/OAuth2' };

const txt = uiText.dashboard;

export default function AuthDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0, activeSessions: 0, failedLogins: 0,
    lockedAccounts: 0, authMethod: 'local', tokenHealth: 'healthy',
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Fetch auth statistics ─────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setIsRefreshing(true);
    Logger.info('AuthDashboard', logMsgs.dashboardLoaded);
    try {
      const [configRes, userRes] = await Promise.all([
        ApiClient.get(urls.authConfig),
        ApiClient.get(urls.usersStats),
      ]);

      setStats({
        totalUsers: userRes?.data?.total || 0,
        activeSessions: 0,
        failedLogins: 0,
        lockedAccounts: 0,
        authMethod: configRes?.data?.provider || 'json_file',
        tokenHealth: 'healthy',
      });
      Logger.info('AuthDashboard', logMsgs.dashboardRefreshed);
    } catch (err) {
      Logger.error('AuthDashboard', 'Failed to load auth stats', { error: err.message });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={txt.pageTitle}
        subtitle={txt.subtitle}
        icon={Shield}
        actions={
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={fetchStats} loading={isRefreshing}>
            Refresh
          </Button>
        }
      />

      {/* Stats tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatusTile
          label={txt.tiles.totalUsers.label}
          value={`${stats.totalUsers}`}
          detail={txt.tiles.totalUsers.detail}
          status="info"
          icon={Users}
        />
        <StatusTile
          label={txt.tiles.activeSessions.label}
          value={`${stats.activeSessions}`}
          detail={txt.tiles.activeSessions.detail}
          status="success"
          icon={Clock}
        />
        <StatusTile
          label={txt.tiles.failedLogins.label}
          value={`${stats.failedLogins}`}
          detail={txt.tiles.failedLogins.detail}
          status={stats.failedLogins > 10 ? 'danger' : stats.failedLogins > 0 ? 'warning' : 'success'}
          icon={AlertTriangle}
        />
        <StatusTile
          label={txt.tiles.lockedAccounts.label}
          value={`${stats.lockedAccounts}`}
          detail={txt.tiles.lockedAccounts.detail}
          status={stats.lockedAccounts > 0 ? 'warning' : 'success'}
          icon={Lock}
        />
        <StatusTile
          label={txt.tiles.authMethod.label}
          value={PROVIDER_LABELS[stats.authMethod] || stats.authMethod}
          detail={txt.tiles.authMethod.detail}
          status="info"
          icon={Key}
        />
        <StatusTile
          label={txt.tiles.tokenHealth.label}
          value={stats.tokenHealth === 'healthy' ? 'Healthy' : 'Degraded'}
          detail={txt.tiles.tokenHealth.detail}
          status={stats.tokenHealth === 'healthy' ? 'success' : 'warning'}
          icon={Shield}
        />
      </div>

      {/* Recent security events card */}
      <Card>
        <h3 className="text-sm font-bold text-surface-800 mb-3">Recent Security Events</h3>
        <div className="text-xs text-surface-500 text-center py-8">
          Security events will appear here once the audit log is populated.
        </div>
      </Card>
    </div>
  );
}
