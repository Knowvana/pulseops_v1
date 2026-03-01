// ============================================================================
// Admin Module Manifest — PulseOps V1
//
// PURPOSE: Self-describing manifest for the Platform Admin module. The module
// registry discovers this manifest and uses it to drive navigation, view
// rendering, and settings tabs — NO module-specific code lives in core.
//
// ARCHITECTURE: Plug-and-play module contract. Core module that ships with
// the platform — cannot be disabled or removed. Contains the Platform
// Dashboard, Module Manager, and Admin Settings.
//
// CONTRACT:
//   id          — unique module identifier (must match DB moduleId)
//   name        — display name for TopNav
//   version     — semantic version string
//   description — human-readable description
//   icon        — Lucide icon component
//   roles       — which user roles can access this module
//   order       — sort order in TopNav (lower = left)
//   isCore      — if true, always visible (cannot be disabled)
//   enabled     — default enabled state
//   defaultView — which navItem id to show on module load
//   navItems    — array of { id, label, icon } for the left SideNav
//   getViews    — function(props) returning { viewId: ReactElement } map
//   getSettingsTabs — function(props) returning tabs[] for SettingsConfig
//
// USED BY:
//   - src/modules/moduleRegistry.js → imported and registered as core module
//   - src/core/PlatformDashboard.jsx → rendered when module is active
// ============================================================================
import React from 'react';
import {
  LayoutDashboard, Package, Users, Settings as SettingsIcon,
  Database, Layers, Shield
} from 'lucide-react';
import uiText from '@modules/admin/uiText.json';
import moduleConstants from '@modules/admin/constants.json';
import AdminDashboard from '@modules/admin/components/AdminDashboard';
import AdminModuleManager from '@modules/admin/components/AdminModuleManager';
import { DatabaseConfigTab, DatabaseObjectsTab, GeneralSettingsTab } from '@modules/admin/components/AdminSettings';

const navTxt = uiText.navItems;
const settingsTxt = uiText.settings;

const adminManifest = {
  id: moduleConstants.moduleId,
  name: moduleConstants.moduleName,
  shortName: moduleConstants.moduleShortName,
  version: moduleConstants.moduleVersion,
  description: moduleConstants.moduleDescription,
  icon: Shield,
  roles: moduleConstants.roles,
  enabled: true,
  isCore: moduleConstants.isCore,
  order: moduleConstants.order,
  defaultView: moduleConstants.defaultView,

  // ── Left SideNav items (mandatory: dashboard + config) ──────────────────
  navItems: [
    { id: 'dashboard', label: navTxt.dashboard, icon: LayoutDashboard },
    { id: 'moduleManager', label: navTxt.moduleManager, icon: Package },
    { id: 'users', label: navTxt.users, icon: Users },
    { id: 'config', label: navTxt.settings, icon: SettingsIcon },
  ],

  // ── View renderer — returns { viewId: Component } map ────────────────
  getViews: () => ({
    dashboard: AdminDashboard,
    moduleManager: AdminModuleManager,
    users: UsersPlaceholder,
  }),

  // ── Settings tabs (rendered when activeView === 'config') ───────────────
  getSettingsTabs: () => [
    { id: 'settings_db', label: settingsTxt.tabs.database, icon: Database, content: <DatabaseConfigTab /> },
    { id: 'settings_objects', label: settingsTxt.tabs.dbObjects, icon: Layers, content: <DatabaseObjectsTab /> },
    { id: 'settings_general', label: settingsTxt.tabs.general, icon: SettingsIcon, content: <GeneralSettingsTab /> },
  ],
  settingsDefaultTab: 'settings_db',
  settingsTitle: settingsTxt.pageTitle,
  settingsSubtitle: settingsTxt.subtitle,
  settingsIcon: SettingsIcon,

  // ── Config tabs (reuse settings for admin — config === settings here) ────
  getConfigTabs: () => [
    { id: 'settings_db', label: settingsTxt.tabs.database, icon: Database, content: <DatabaseConfigTab /> },
    { id: 'settings_objects', label: settingsTxt.tabs.dbObjects, icon: Layers, content: <DatabaseObjectsTab /> },
    { id: 'settings_general', label: settingsTxt.tabs.general, icon: SettingsIcon, content: <GeneralSettingsTab /> },
  ],
  configDefaultTab: 'settings_db',
  configTitle: settingsTxt.pageTitle,
  configSubtitle: settingsTxt.subtitle,
  configIcon: SettingsIcon,
};

export default adminManifest;

// ── Inline placeholder for Users view (admin-specific, not shared) ──────────
function UsersPlaceholder() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-8 flex flex-col items-center justify-center min-h-[400px]">
        <Users size={48} className="text-surface-300 mb-4" />
        <h3 className="text-xl font-bold text-surface-800 mb-2">User Management</h3>
        <p className="text-surface-500 text-sm text-center max-w-md">
          Full user CRUD operations with role assignment and status management. Coming soon.
        </p>
      </div>
    </div>
  );
}
