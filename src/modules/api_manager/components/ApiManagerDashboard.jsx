// ============================================================================
// ApiManagerDashboard — PulseOps V1 (API Manager Module)
//
// PURPOSE: API Manager dashboard showing endpoint stats, request throughput,
// latency metrics, error rates, and API uptime. All text from uiText.json.
//
// ARCHITECTURE: Fetches API stats from /api/health and internal metrics.
// Renders StatusTile components from shared design system.
//
// USED BY: api_manager/manifest.jsx → getViews() → 'dashboard' view
//
// DEPENDENCIES:
//   - @shared → StatusTile, PageHeader, Card, Button, Logger, ApiClient
//   - ../uiText.json       → All UI labels
//   - ../logMessages.json  → Log message templates
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Globe, Activity, Clock, AlertTriangle, Server, Zap } from 'lucide-react';
import { StatusTile, PageHeader, Card, Button, Logger, ApiClient } from '@shared';
import uiText from '@modules/api_manager/uiText.json';
import logMsgs from '@modules/api_manager/logMessages.json';
import urls from '@shared/config/urls.json';

const txt = uiText.dashboard;

export default function ApiManagerDashboard() {
  const [stats, setStats] = useState({
    totalEndpoints: 0, activeEndpoints: 0, requestsToday: 0,
    avgLatency: 0, errorRate: 0, uptime: '—',
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Fetch API statistics ──────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setIsRefreshing(true);
    Logger.info('ApiManagerDashboard', logMsgs.dashboardLoaded);
    try {
      const healthRes = await ApiClient.get(urls.healthEndpoint);
      const apiLogs = Logger.getApiLogs();

      // Derive stats from health check and local log buffer
      const successCalls = apiLogs.filter(l => l.success);
      const failedCalls = apiLogs.filter(l => !l.success);
      const avgLatency = apiLogs.length > 0
        ? Math.round(apiLogs.reduce((sum, l) => sum + (l.durationMs || 0), 0) / apiLogs.length)
        : 0;

      setStats({
        totalEndpoints: healthRes?.data?.endpoints || 0,
        activeEndpoints: healthRes?.data?.activeEndpoints || 0,
        requestsToday: apiLogs.length,
        avgLatency,
        errorRate: apiLogs.length > 0 ? Math.round((failedCalls.length / apiLogs.length) * 100) : 0,
        uptime: healthRes?.data?.uptime || '—',
      });
      Logger.info('ApiManagerDashboard', logMsgs.dashboardRefreshed);
    } catch (err) {
      Logger.error('ApiManagerDashboard', 'Failed to load API stats', { error: err.message });
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
        icon={Globe}
        actions={
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={fetchStats} loading={isRefreshing}>
            Refresh
          </Button>
        }
      />

      {/* Stats tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatusTile
          label={txt.tiles.totalEndpoints.label}
          value={`${stats.totalEndpoints}`}
          detail={txt.tiles.totalEndpoints.detail}
          status="info"
          icon={Globe}
        />
        <StatusTile
          label={txt.tiles.activeEndpoints.label}
          value={`${stats.activeEndpoints}`}
          detail={txt.tiles.activeEndpoints.detail}
          status="success"
          icon={Activity}
        />
        <StatusTile
          label={txt.tiles.requestsToday.label}
          value={`${stats.requestsToday}`}
          detail={txt.tiles.requestsToday.detail}
          status="info"
          icon={Zap}
        />
        <StatusTile
          label={txt.tiles.avgLatency.label}
          value={`${stats.avgLatency}ms`}
          detail={txt.tiles.avgLatency.detail}
          status={stats.avgLatency > 1000 ? 'danger' : stats.avgLatency > 500 ? 'warning' : 'success'}
          icon={Clock}
        />
        <StatusTile
          label={txt.tiles.errorRate.label}
          value={`${stats.errorRate}%`}
          detail={txt.tiles.errorRate.detail}
          status={stats.errorRate > 10 ? 'danger' : stats.errorRate > 5 ? 'warning' : 'success'}
          icon={AlertTriangle}
        />
        <StatusTile
          label={txt.tiles.uptime.label}
          value={stats.uptime}
          detail={txt.tiles.uptime.detail}
          status="success"
          icon={Server}
        />
      </div>

      {/* Recent API calls card */}
      <Card>
        <h3 className="text-sm font-bold text-surface-800 mb-3">Recent API Calls</h3>
        {Logger.getApiLogs().length === 0 ? (
          <p className="text-xs text-surface-400 text-center py-6">No API calls recorded yet. Make some requests to see activity.</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {Logger.getApiLogs().slice(0, 10).map(call => (
              <div key={call.id} className="flex items-center gap-3 py-2 border-b border-surface-50 last:border-0">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  call.success ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'
                }`}>
                  {call.method}
                </span>
                <span className="text-xs font-mono text-surface-600 flex-1 truncate">{call.path}</span>
                <span className="text-[10px] text-surface-400">{call.statusCode} · {call.durationMs}ms</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
