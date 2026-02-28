// ============================================================================
// LoggingDashboard — PulseOps V1 (Logging Module)
//
// PURPOSE: Logging module dashboard showing buffer status, log level
// distribution, sync status, and quick actions (flush, clear).
// All text from uiText.json, all logs from logMessages.json.
//
// ARCHITECTURE: Reads live data from the Logger singleton service.
// Subscribes to Logger updates for real-time buffer stats.
//
// USED BY: logging/manifest.jsx → getViews() → 'dashboard' view
//
// DEPENDENCIES:
//   - @shared → StatusTile, PageHeader, Card, Button, Logger
//   - ../uiText.json       → All UI labels
//   - ../constants.json     → Default config values
//   - ../logMessages.json   → Log message templates
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Activity, Globe, Gauge, Database, Clock, Layers, Trash2 } from 'lucide-react';
import { StatusTile, PageHeader, Card, Button, Logger } from '@shared';
import uiText from '@modules/logging/uiText.json';
import defaults from '@modules/logging/constants.json';
import logMsgs from '@modules/logging/logMessages.json';

const txt = uiText.dashboard;

export default function LoggingDashboard() {
  const [stats, setStats] = useState({
    systemLogs: 0, apiLogs: 0, logLevel: 'info',
    synced: 'idle', retention: defaults.retentionDays, bufferMax: defaults.maxBufferSize,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Refresh stats from Logger singleton ───────────────────────────────────
  const refreshStats = useCallback(() => {
    setIsRefreshing(true);
    const config = Logger.getConfig();
    const systemLogs = Logger.getSystemLogs();
    const apiLogs = Logger.getApiLogs();

    setStats({
      systemLogs: systemLogs.length,
      apiLogs: apiLogs.length,
      logLevel: config.minLevel || 'info',
      synced: 'idle',
      retention: defaults.retentionDays,
      bufferMax: config.maxBufferSize || defaults.maxBufferSize,
    });

    // NOTE: Do NOT call Logger.info() here — this function is called by the
    // Logger subscriber. Logging inside a subscriber triggers _notify() again,
    // which re-invokes this callback → infinite recursion → stack overflow.
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    refreshStats();
    // Subscribe to logger for live updates
    const unsub = Logger.subscribe(refreshStats);
    return unsub;
  }, [refreshStats]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleFlush = useCallback(async () => {
    await Logger.flush();
    Logger.info('LoggingDashboard', logMsgs.bufferFlushed);
    refreshStats();
  }, [refreshStats]);

  const handleClear = useCallback(() => {
    Logger.clearAll();
    Logger.info('LoggingDashboard', logMsgs.bufferCleared);
    refreshStats();
  }, [refreshStats]);

  const bufferPercent = stats.bufferMax > 0
    ? Math.round(((stats.systemLogs + stats.apiLogs) / (stats.bufferMax * 2)) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={txt.pageTitle}
        subtitle={txt.subtitle}
        icon={Activity}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={Trash2} onClick={handleClear}>Clear</Button>
            <Button variant="secondary" size="sm" icon={Database} onClick={handleFlush}>Flush to DB</Button>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={refreshStats} loading={isRefreshing}>Refresh</Button>
          </div>
        }
      />

      {/* Stats tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatusTile
          label={txt.tiles.systemLogs.label}
          value={`${stats.systemLogs}`}
          detail={txt.tiles.systemLogs.detail}
          status={stats.systemLogs > 0 ? 'info' : 'neutral'}
          icon={Activity}
        />
        <StatusTile
          label={txt.tiles.apiLogs.label}
          value={`${stats.apiLogs}`}
          detail={txt.tiles.apiLogs.detail}
          status={stats.apiLogs > 0 ? 'info' : 'neutral'}
          icon={Globe}
        />
        <StatusTile
          label={txt.tiles.logLevel.label}
          value={stats.logLevel.toUpperCase()}
          detail={txt.tiles.logLevel.detail}
          status="info"
          icon={Gauge}
        />
        <StatusTile
          label={txt.tiles.synced.label}
          value={stats.synced === 'idle' ? 'Idle' : 'Syncing'}
          detail={txt.tiles.synced.detail}
          status={stats.synced === 'idle' ? 'success' : 'warning'}
          icon={Database}
        />
        <StatusTile
          label={txt.tiles.retention.label}
          value={`${stats.retention} days`}
          detail={txt.tiles.retention.detail}
          status="neutral"
          icon={Clock}
        />
        <StatusTile
          label={txt.tiles.bufferUsage.label}
          value={`${bufferPercent}%`}
          detail={`${stats.systemLogs + stats.apiLogs} / ${stats.bufferMax * 2}`}
          status={bufferPercent > 80 ? 'warning' : bufferPercent > 50 ? 'info' : 'success'}
          icon={Layers}
        />
      </div>

      {/* Log level distribution */}
      <Card>
        <h3 className="text-sm font-bold text-surface-800 mb-3">Log Level Distribution</h3>
        {stats.systemLogs === 0 ? (
          <p className="text-xs text-surface-400 text-center py-6">No logs in buffer. Generate some activity to see distribution.</p>
        ) : (
          <div className="space-y-2">
            {['debug', 'info', 'warn', 'error'].map(level => {
              const count = Logger.getSystemLogs().filter(l => l.level === level).length;
              const pct = stats.systemLogs > 0 ? Math.round((count / stats.systemLogs) * 100) : 0;
              const colors = {
                debug: 'bg-surface-300', info: 'bg-brand-500',
                warn: 'bg-warning-500', error: 'bg-danger-500',
              };
              return (
                <div key={level} className="flex items-center gap-3">
                  <span className="w-12 text-xs font-bold uppercase text-surface-500">{level}</span>
                  <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${colors[level]} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-12 text-xs text-surface-500 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
