// ============================================================================
// Logging Module Manifest — PulseOps V1
//
// PURPOSE: Self-describing manifest for the global Logging module. Controls
// and governs logging for ALL modules and the main platform. Provides
// log viewing, querying, configuration, and retention management.
//
// FEATURES:
//   - Real-time system log viewer
//   - API call log viewer
//   - Log query with filters (level, source, date, user)
//   - Configurable log levels, buffer sizes, flush thresholds
//   - Log retention policy management
//   - Output target configuration (DB, console, external)
//
// CONTRACT: See admin/manifest.jsx header for full contract specification.
//
// ADD-ON MODULE: Not core. Requires database for log persistence.
// Loaded dynamically via import() when enabled.
//
// USED BY:
//   - src/modules/moduleRegistry.js → dynamically imported when enabled
//   - src/core/PlatformDashboard.jsx → rendered when module is active
// ============================================================================
import React from 'react';
import {
  LayoutDashboard, Activity, Globe, Search, Sliders,
  ScrollText, Settings, Clock, Monitor
} from 'lucide-react';
import uiText from '@modules/logging/uiText.json';
import moduleConstants from '@modules/logging/constants.json';
import LoggingDashboard from '@modules/logging/components/LoggingDashboard';
import { Card, EmptyState } from '@shared';

const navTxt = uiText.navItems;
const cfgTxt = uiText.config;

const loggingManifest = {
  id: moduleConstants.moduleId,
  name: moduleConstants.moduleName,
  shortName: moduleConstants.moduleShortName,
  version: moduleConstants.moduleVersion,
  description: moduleConstants.moduleDescription,
  icon: ScrollText,
  roles: moduleConstants.roles,
  enabled: true,
  isCore: moduleConstants.isCore,
  order: moduleConstants.order,
  defaultView: moduleConstants.defaultView,

  // ── Left SideNav items (mandatory: dashboard + config) ──────────────────
  navItems: [
    { id: 'dashboard', label: navTxt.dashboard, icon: LayoutDashboard },
    { id: 'systemLogs', label: navTxt.systemLogs, icon: Activity },
    { id: 'apiLogs', label: navTxt.apiLogs, icon: Globe },
    { id: 'query', label: navTxt.query, icon: Search },
    { id: 'config', label: navTxt.config, icon: Sliders },
  ],

  // ── View renderer ───────────────────────────────────────────────────────
  getViews: () => ({
    dashboard: <LoggingDashboard />,
    systemLogs: <PlaceholderView title={uiText.systemLogs.pageTitle} subtitle={uiText.systemLogs.subtitle} icon={Activity} />,
    apiLogs: <PlaceholderView title={uiText.apiLogs.pageTitle} subtitle={uiText.apiLogs.subtitle} icon={Globe} />,
    query: <PlaceholderView title={uiText.query.pageTitle} subtitle={uiText.query.subtitle} icon={Search} />,
  }),

  // ── Config tabs (rendered when activeView === 'config') ─────────────────
  getConfigTabs: () => [
    { id: 'log_general', label: cfgTxt.tabs.general, icon: Settings, content: <LoggingGeneralConfigPlaceholder /> },
    { id: 'log_retention', label: cfgTxt.tabs.retention, icon: Clock, content: <LoggingRetentionConfigPlaceholder /> },
    { id: 'log_output', label: cfgTxt.tabs.output, icon: Monitor, content: <LoggingOutputConfigPlaceholder /> },
  ],
  configDefaultTab: 'log_general',
  configTitle: cfgTxt.pageTitle,
  configSubtitle: cfgTxt.pageSubtitle,
  configIcon: Sliders,
};

export default loggingManifest;

// ── Placeholder components ──────────────────────────────────────────────────
function PlaceholderView({ title, subtitle, icon: Icon }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="flex flex-col items-center justify-center min-h-[400px]">
        <EmptyState icon={Icon} title={title} description={`${subtitle} — Coming in next iteration.`} />
      </Card>
    </div>
  );
}

function LoggingGeneralConfigPlaceholder() {
  return (
    <Card>
      <h3 className="text-sm font-bold text-surface-800 mb-1">{cfgTxt.general.title}</h3>
      <p className="text-xs text-surface-500 mb-4">{cfgTxt.general.description}</p>
      <EmptyState icon={Settings} title="General Config" description="Log level, buffer size, and console output settings — coming next." />
    </Card>
  );
}

function LoggingRetentionConfigPlaceholder() {
  return (
    <Card>
      <h3 className="text-sm font-bold text-surface-800 mb-1">{cfgTxt.retention.title}</h3>
      <p className="text-xs text-surface-500 mb-4">{cfgTxt.retention.description}</p>
      <EmptyState icon={Clock} title="Retention Policy" description="Log retention days, max stored logs, auto-cleanup — coming next." />
    </Card>
  );
}

function LoggingOutputConfigPlaceholder() {
  return (
    <Card>
      <h3 className="text-sm font-bold text-surface-800 mb-1">{cfgTxt.output.title}</h3>
      <p className="text-xs text-surface-500 mb-4">{cfgTxt.output.description}</p>
      <EmptyState icon={Monitor} title="Output Targets" description="Database, console, and external service targets — coming next." />
    </Card>
  );
}
