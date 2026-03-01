// ============================================================================
// API Manager Module Manifest — PulseOps V1
//
// PURPOSE: Self-describing manifest for the API Manager module. This is the
// platform's API gateway — manages all API endpoints, provides testing tools,
// health monitoring, and API configuration (rate limiting, CORS, security).
//
// FEATURES:
//   - API endpoint registry and management
//   - Built-in API testing (like Postman, in-browser)
//   - API health monitoring with latency tracking
//   - Rate limiting, CORS, and security configuration
//
// CONTRACT: See admin/manifest.jsx header for full contract specification.
//
// ADD-ON MODULE: Not core. Installed via Module Manager. Loaded dynamically
// via import() when enabled — zero downtime module addition.
//
// USED BY:
//   - src/modules/moduleRegistry.js → dynamically imported when enabled
//   - src/core/PlatformDashboard.jsx → rendered when module is active
// ============================================================================
import React from 'react';
import {
  LayoutDashboard, Globe, TestTube, HeartPulse, Sliders,
  Settings, Shield, Workflow, RefreshCw
} from 'lucide-react';
import uiText from '@modules/api_manager/uiText.json';
import moduleConstants from '@modules/api_manager/constants.json';
import ApiManagerDashboard from '@modules/api_manager/components/ApiManagerDashboard';
import { Card, EmptyState } from '@shared';

const navTxt = uiText.navItems;
const cfgTxt = uiText.config;

const apiManagerManifest = {
  id: moduleConstants.moduleId,
  name: moduleConstants.moduleName,
  shortName: moduleConstants.moduleShortName,
  version: moduleConstants.moduleVersion,
  description: moduleConstants.moduleDescription,
  icon: Globe,
  roles: moduleConstants.roles,
  enabled: true,
  isCore: moduleConstants.isCore,
  order: moduleConstants.order,
  defaultView: moduleConstants.defaultView,

  // ── Left SideNav items (mandatory: dashboard + config) ──────────────────
  navItems: [
    { id: 'dashboard', label: navTxt.dashboard, icon: LayoutDashboard },
    { id: 'endpoints', label: navTxt.endpoints, icon: Workflow },
    { id: 'testing', label: navTxt.testing, icon: TestTube },
    { id: 'health', label: navTxt.health, icon: HeartPulse },
    { id: 'config', label: navTxt.config, icon: Sliders },
  ],

  // ── View renderer ───────────────────────────────────────────────────────
  getViews: () => ({
    dashboard: ApiManagerDashboard,
    endpoints: () => <PlaceholderView title={uiText.endpoints.pageTitle} subtitle={uiText.endpoints.subtitle} icon={Workflow} />,
    testing: () => <PlaceholderView title={uiText.testing.pageTitle} subtitle={uiText.testing.subtitle} icon={TestTube} />,
    health: () => <PlaceholderView title={uiText.health.pageTitle} subtitle={uiText.health.subtitle} icon={HeartPulse} />,
  }),

  // ── Config tabs (rendered when activeView === 'config') ─────────────────
  getConfigTabs: () => [
    { id: 'api_general', label: cfgTxt.tabs.general, icon: Settings, content: <ConfigPlaceholder section="general" /> },
    { id: 'api_rateLimit', label: cfgTxt.tabs.rateLimit, icon: RefreshCw, content: <ConfigPlaceholder section="rateLimit" /> },
    { id: 'api_cors', label: cfgTxt.tabs.cors, icon: Globe, content: <ConfigPlaceholder section="cors" /> },
    { id: 'api_security', label: cfgTxt.tabs.security, icon: Shield, content: <ConfigPlaceholder section="security" /> },
  ],
  configDefaultTab: 'api_general',
  configTitle: cfgTxt.pageTitle,
  configSubtitle: cfgTxt.pageSubtitle,
  configIcon: Sliders,
};

export default apiManagerManifest;

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

function ConfigPlaceholder({ section }) {
  const sectionData = cfgTxt[section];
  return (
    <Card>
      <h3 className="text-sm font-bold text-surface-800 mb-1">{sectionData?.title || section}</h3>
      <p className="text-xs text-surface-500 mb-4">{sectionData?.description || ''}</p>
      <EmptyState icon={Settings} title={sectionData?.title || section} description="Configuration UI coming in next iteration." />
    </Card>
  );
}
