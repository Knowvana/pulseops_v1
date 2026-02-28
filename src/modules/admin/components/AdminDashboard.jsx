// ============================================================================
// AdminDashboard — PulseOps V1 (Admin Module)
//
// PURPOSE: Platform overview dashboard showing system health tiles,
// database status, module count, user count, and quick actions.
// All text read from uiText.json, all logs from logMessages.json.
//
// ARCHITECTURE: Fetches health data from /api/health and /api/database/stats
// via ApiClient. Renders StatusTile components from the shared design system.
// ZERO hardcoded strings — everything from JSON config.
//
// USED BY: admin/manifest.jsx → getViews() → 'dashboard' view
//
// DEPENDENCIES:
//   - @shared → StatusTile, PageHeader, Card, Logger, ApiClient
//   - ../uiText.json       → All UI labels
//   - ../logMessages.json  → All log message templates
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Activity, Database, Server, Package, Users } from 'lucide-react';
import { StatusTile, PageHeader, Card, Button, Logger, ApiClient } from '@shared';
import uiText from '@modules/admin/uiText.json';
import logMsgs from '@modules/admin/logMessages.json';
import urls from '@shared/config/urls.json';

const txt = uiText.dashboard;

export default function AdminDashboard({ user, onNavigate }) {
  const [health, setHealth] = useState({ api: null, db: null, schema: null });
  const [stats, setStats] = useState({ modules: 0, users: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Fetch system health and stats ─────────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    setIsRefreshing(true);
    Logger.info('AdminDashboard', logMsgs.healthCheckStarted);

    try {
      // Parallel fetch: health + database stats + module count
      const [healthRes, dbStatsRes, moduleRes] = await Promise.all([
        ApiClient.get(urls.healthEndpoint),
        ApiClient.get(urls.databaseStats),
        ApiClient.get(urls.modulesEndpoint),
      ]);

      setHealth({
        api: healthRes?.success !== false ? 'healthy' : 'unhealthy',
        db: healthRes?.data?.database === 'connected' ? 'connected' : 'disconnected',
        schema: dbStatsRes?.data?.initialized ? 'initialized' : 'not_initialized',
      });

      setStats({
        modules: Array.isArray(moduleRes?.data) ? moduleRes.data.length : 0,
        users: dbStatsRes?.data?.userCount || 0,
      });

      Logger.info('AdminDashboard', logMsgs.healthCheckCompleted);
    } catch (err) {
      Logger.error('AdminDashboard', logMsgs.healthCheckFailed, { error: err.message });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  // ── Health status helpers ─────────────────────────────────────────────────
  const apiStatus = health.api === 'healthy' ? 'success' : health.api === null ? 'neutral' : 'danger';
  const dbStatus = health.db === 'connected' ? 'success' : health.db === null ? 'neutral' : 'danger';
  const overallStatus = health.api === 'healthy' && health.db === 'connected' ? 'success' : 'warning';

  const apiLabel = health.api === 'healthy' ? txt.tiles.apiHealth.healthy
    : health.api === null ? txt.tiles.apiHealth.checking : txt.tiles.apiHealth.unhealthy;
  const dbLabel = health.db === 'connected' ? txt.tiles.dbConnection.connected
    : health.db === null ? txt.tiles.dbConnection.checking : txt.tiles.dbConnection.disconnected;
  const overallLabel = overallStatus === 'success' ? txt.tiles.systemHealth.operational : txt.tiles.systemHealth.degraded;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={txt.pageTitle}
        subtitle={txt.subtitle}
        icon={Activity}
        actions={
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={fetchDashboardData} loading={isRefreshing}>
            Refresh
          </Button>
        }
      />

      {/* Health tiles row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusTile
          label={txt.tiles.systemHealth.label}
          value={overallLabel}
          status={overallStatus}
          icon={Server}
        />
        <StatusTile
          label={txt.tiles.apiHealth.label}
          value={apiLabel}
          status={apiStatus}
          icon={Activity}
        />
        <StatusTile
          label={txt.tiles.dbConnection.label}
          value={dbLabel}
          status={dbStatus}
          icon={Database}
        />
        <StatusTile
          label={txt.tiles.modules.label}
          value={`${stats.modules}`}
          detail={txt.tiles.modules.detail}
          status="info"
          icon={Package}
          onClick={() => onNavigate?.('moduleManager')}
        />
      </div>

      {/* Quick info cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
              <Users size={18} className="text-brand-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-surface-800">{txt.tiles.users.label}</h3>
              <p className="text-xs text-surface-500">{stats.users} registered users</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onNavigate?.('users')}>
            {txt.tiles.users.manage}
          </Button>
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
              <Package size={18} className="text-brand-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-surface-800">{txt.tiles.modules.label}</h3>
              <p className="text-xs text-surface-500">{stats.modules} modules installed</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onNavigate?.('moduleManager')}>
            Manage Modules
          </Button>
        </Card>
      </div>
    </div>
  );
}
