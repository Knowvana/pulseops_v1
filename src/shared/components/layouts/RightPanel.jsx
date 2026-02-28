// ============================================================================
// RightPanel — PulseOps V1 Layout System
//
// PURPOSE: Slide-out right panel for system monitoring. Contains tabbed
// views for System Logs, API Calls, and Report Issue. Subscribes to the
// Logger service for real-time log updates. Module-agnostic.
//
// ARCHITECTURE: Renders as a fixed overlay on the right edge. Subscribes
// to Logger singleton for live updates. All text from uiText.json.
//
// USAGE:
//   <RightPanel isOpen={true} onClose={handleClose} logger={Logger} />
//
// DEPENDENCIES:
//   - @shared/config/uiText.json → Tab labels, filter labels, empty messages
//   - @shared/services/logger.js → Log data source (injected via props)
//   - lucide-react               → Icons
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import { X, Trash2, Activity, Globe, Bug } from 'lucide-react';
import uiText from '@shared/config/uiText.json';

const txt = uiText.rightPanel;

export default function RightPanel({ isOpen, onClose, logger, className = "" }) {
  const [activeTab, setActiveTab] = useState('logs');
  const [logFilter, setLogFilter] = useState('all');
  const [systemLogs, setSystemLogs] = useState([]);
  const [apiLogs, setApiLogs] = useState([]);

  // Subscribe to logger for real-time updates
  const refreshLogs = useCallback(() => {
    if (logger) {
      setSystemLogs(logger.getSystemLogs());
      setApiLogs(logger.getApiLogs());
    }
  }, [logger]);

  useEffect(() => {
    refreshLogs();
    if (logger?.subscribe) {
      return logger.subscribe(refreshLogs);
    }
  }, [logger, refreshLogs]);

  // Filter system logs by level
  const filteredLogs = logFilter === 'all'
    ? systemLogs
    : systemLogs.filter(l => l.level === logFilter);

  const LEVEL_COLORS = {
    debug: 'text-surface-400 bg-surface-100',
    info: 'text-brand-600 bg-brand-50',
    warn: 'text-warning-600 bg-warning-50',
    error: 'text-danger-600 bg-danger-50',
  };

  const tabs = [
    { id: 'logs', label: txt.tabs.systemLogs, icon: Activity },
    { id: 'api', label: txt.tabs.apiCalls, icon: Globe },
    { id: 'report', label: txt.tabs.reportIssue, icon: Bug },
  ];

  return (
    <div className={`bg-white border-l border-surface-200 shadow-2xl flex flex-col overflow-hidden flex-shrink-0 h-full transition-all duration-300 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-surface-400 hover:text-surface-600 hover:bg-surface-50'
                }`}
              >
                <TabIcon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
        <button onClick={onClose} className="p-1 rounded text-surface-400 hover:text-surface-600">
          <X size={16} />
        </button>
      </div>

      {/* System Logs Tab */}
      {activeTab === 'logs' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Level filter bar */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-surface-100">
            {['all', 'debug', 'info', 'warn', 'error'].map((level) => (
              <button
                key={level}
                onClick={() => setLogFilter(level)}
                className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                  logFilter === level
                    ? 'bg-brand-100 text-brand-700'
                    : 'text-surface-400 hover:bg-surface-100'
                }`}
              >
                {txt.logs[`filter${level.charAt(0).toUpperCase() + level.slice(1)}`] || level}
              </button>
            ))}
            <button
              onClick={() => logger?.clearSystemLogs()}
              className="ml-auto p-1 rounded text-surface-400 hover:text-danger-500"
              title={txt.logs.clearTooltip}
            >
              <Trash2 size={12} />
            </button>
          </div>

          {/* Log entries */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
            {filteredLogs.length === 0 ? (
              <p className="text-xs text-surface-400 text-center py-8">{txt.logs.emptyMessage}</p>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 py-1.5 border-b border-surface-50 last:border-0">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${LEVEL_COLORS[log.level] || LEVEL_COLORS.info}`}>
                    {log.level}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-surface-700 truncate">{log.message}</p>
                    <p className="text-[10px] text-surface-400">{log.event} · {new Date(log.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* API Calls Tab */}
      {activeTab === 'api' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-surface-100">
            <span className="text-xs text-surface-500">{apiLogs.length} {txt.api.callsLabel}</span>
            <button
              onClick={() => logger?.clearApiLogs()}
              className="p-1 rounded text-surface-400 hover:text-danger-500"
              title={txt.api.clearTooltip}
            >
              <Trash2 size={12} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
            {apiLogs.length === 0 ? (
              <p className="text-xs text-surface-400 text-center py-8">{txt.api.emptyMessage}</p>
            ) : (
              apiLogs.map((call) => (
                <div key={call.id} className="flex items-start gap-2 py-1.5 border-b border-surface-50 last:border-0">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${call.success ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'}`}>
                    {call.method}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-surface-700 font-mono truncate">{call.path}</p>
                    <p className="text-[10px] text-surface-400">
                      {call.statusCode} · {call.durationMs}ms · {new Date(call.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Report Issue Tab */}
      {activeTab === 'report' && (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <h3 className="text-sm font-bold text-surface-800 mb-1">{txt.report.title}</h3>
          <p className="text-xs text-surface-500 mb-4">{txt.report.description}</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1">{txt.report.issueTitleLabel}</label>
              <input type="text" placeholder={txt.report.issueTitlePlaceholder} className="w-full px-3 py-2 rounded-lg border border-surface-300 text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1">{txt.report.categoryLabel}</label>
              <select className="w-full px-3 py-2 rounded-lg border border-surface-300 text-xs">
                {txt.report.categories.map(cat => <option key={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1">{txt.report.descriptionLabel}</label>
              <textarea rows={4} placeholder={txt.report.descriptionPlaceholder} className="w-full px-3 py-2 rounded-lg border border-surface-300 text-xs resize-none" />
            </div>
            <button className="w-full py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors">
              {txt.report.submitButton}
            </button>
            <p className="text-[10px] text-surface-400 text-center">{txt.report.footerNote}</p>
          </div>
        </div>
      )}
    </div>
  );
}
