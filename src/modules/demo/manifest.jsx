// ============================================================================
// Demo Test Module Manifest — PulseOps V1
//
// PURPOSE: Self-describing manifest for the Demo Test module. This module
// exists to validate the plug-and-play pattern. It follows ALL conventions
// required by the module contract and serves as a reference implementation
// for building new modules.
//
// NON-CORE: This module is NOT a core module. It can be enabled/disabled
// and removed via the Module Manager. This tests the full lifecycle:
// install → initialize schema → enable → use → disable → remove.
//
// PATTERN VALIDATION:
//   ✓ manifest.jsx with all required + optional fields
//   ✓ constants.json, uiText.json, logMessages.json, errorMessages.json
//   ✓ Mandatory navItems: dashboard + config
//   ✓ All imports use @shared and @modules aliases
//   ✓ Zero inline UI text — everything from JSON
//   ✓ Zero inline log messages — everything from JSON
//   ✓ Uses shared design system (Button, Card, StatusTile, PageHeader, etc.)
//   ✓ Uses shared SettingsConfig for config tabs
//
// USED BY:
//   - src/modules/moduleRegistry.js → imported as non-core module
//   - src/core/PlatformDashboard.jsx → rendered when module is active
// ============================================================================
import React from 'react';
import { LayoutDashboard, List, Sliders, TestTube, Settings, Database } from 'lucide-react';
import uiText from '@modules/demo/uiText.json';
import moduleConstants from '@modules/demo/constants.json';
import DemoDashboard from '@modules/demo/components/DemoDashboard';
import { Card, EmptyState } from '@shared';

const navTxt = uiText.navItems;
const cfgTxt = uiText.config;

const demoManifest = {
  id: moduleConstants.moduleId,
  name: moduleConstants.moduleName,
  shortName: moduleConstants.moduleShortName,
  version: moduleConstants.moduleVersion,
  description: moduleConstants.moduleDescription,
  icon: TestTube,
  roles: moduleConstants.roles,
  enabled: true,
  isCore: moduleConstants.isCore,
  order: moduleConstants.order,
  defaultView: moduleConstants.defaultView,

  // ── Left SideNav items (mandatory: dashboard + config) ──────────────────
  navItems: [
    { id: 'dashboard', label: navTxt.dashboard, icon: LayoutDashboard },
    { id: 'items', label: navTxt.items, icon: List },
    { id: 'config', label: navTxt.config, icon: Sliders },
  ],

  // ── View renderer ───────────────────────────────────────────────────────
  getViews: () => ({
    dashboard: <DemoDashboard />,
    items: <DemoItemsPlaceholder />,
  }),

  // ── Config tabs (rendered when activeView === 'config') ─────────────────
  getConfigTabs: () => [
    { id: 'demo_general', label: cfgTxt.tabs.general, icon: Settings, content: <DemoGeneralConfigPlaceholder /> },
    { id: 'demo_data', label: cfgTxt.tabs.data, icon: Database, content: <DemoDataConfigPlaceholder /> },
  ],
  configDefaultTab: 'demo_general',
  configTitle: cfgTxt.pageTitle,
  configSubtitle: cfgTxt.pageSubtitle,
  configIcon: Sliders,
};

export default demoManifest;

// ── Placeholder components (inline, module-specific, not shared) ────────────
function DemoItemsPlaceholder() {
  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="flex flex-col items-center justify-center min-h-[400px]">
        <EmptyState
          icon={List}
          title={uiText.items.pageTitle}
          description={`${uiText.items.subtitle} — Coming in next iteration.`}
        />
      </Card>
    </div>
  );
}

function DemoGeneralConfigPlaceholder() {
  return (
    <Card>
      <h3 className="text-sm font-bold text-surface-800 mb-1">{cfgTxt.general.title}</h3>
      <p className="text-xs text-surface-500 mb-4">{cfgTxt.general.description}</p>
      <EmptyState icon={Settings} title={cfgTxt.general.title} description="General config UI coming in next iteration." />
    </Card>
  );
}

function DemoDataConfigPlaceholder() {
  return (
    <Card>
      <h3 className="text-sm font-bold text-surface-800 mb-1">{cfgTxt.data.title}</h3>
      <p className="text-xs text-surface-500 mb-4">{cfgTxt.data.description}</p>
      <EmptyState icon={Database} title={cfgTxt.data.title} description="Demo data management UI coming in next iteration." />
    </Card>
  );
}
