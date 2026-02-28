// ============================================================================
// Auth Module Manifest — PulseOps V1
//
// PURPOSE: Self-describing manifest for the Authentication & Authorization
// module. Provides global authentication for the entire platform so that
// individual modules do NOT need to manage their own auth. Industry-grade,
// product-ready, compliant with enterprise security standards.
//
// FEATURES:
//   - User management (CRUD, role assignment, status control)
//   - Role-based access control (RBAC) with 5-tier hierarchy
//   - Active session monitoring and revocation
//   - Authentication audit log
//   - Configurable auth provider (Local DB, LDAP)
//   - Password, session, lockout, and token policies
//
// CONTRACT: See admin/manifest.jsx header for full contract specification.
//
// CORE MODULE: Always present, cannot be paused or removed.
// Statically imported in moduleRegistry.js. Governs all authentication
// for both UI and API via the active provider (json_file | database | social).
//
// USED BY:
//   - src/modules/moduleRegistry.js → STATIC_MANIFESTS (always loaded)
//   - src/core/PlatformDashboard.jsx → rendered when module is active
// ============================================================================
import React from 'react';
import {
  LayoutDashboard, Users, ShieldCheck, Clock, ScrollText,
  Sliders, Shield, Key, Lock, Timer, Coins
} from 'lucide-react';
import uiText from '@modules/auth/uiText.json';
import moduleConstants from '@modules/auth/constants.json';
import AuthDashboard from '@modules/auth/components/AuthDashboard';
import {
  AuthProviderTab, PasswordPolicyTab, SessionPolicyTab,
  LockoutPolicyTab, TokenSettingsTab
} from '@modules/auth/components/AuthConfig';
import { Card, EmptyState } from '@shared';

const navTxt = uiText.navItems;
const cfgTxt = uiText.config;

const authManifest = {
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
    { id: 'users', label: navTxt.users, icon: Users },
    { id: 'roles', label: navTxt.roles, icon: ShieldCheck },
    { id: 'sessions', label: navTxt.sessions, icon: Clock },
    { id: 'auditLog', label: navTxt.auditLog, icon: ScrollText },
    { id: 'config', label: navTxt.config, icon: Sliders },
  ],

  // ── View renderer ───────────────────────────────────────────────────────
  getViews: () => ({
    dashboard: <AuthDashboard />,
    users: <PlaceholderView title={uiText.users.pageTitle} subtitle={uiText.users.subtitle} icon={Users} />,
    roles: <PlaceholderView title={uiText.roles.pageTitle} subtitle={uiText.roles.subtitle} icon={ShieldCheck} />,
    sessions: <PlaceholderView title={uiText.sessions.pageTitle} subtitle={uiText.sessions.subtitle} icon={Clock} />,
    auditLog: <PlaceholderView title={uiText.auditLog.pageTitle} subtitle={uiText.auditLog.subtitle} icon={ScrollText} />,
  }),

  // ── Config tabs (rendered when activeView === 'config') ─────────────────
  getConfigTabs: () => [
    { id: 'auth_provider', label: cfgTxt.tabs.provider, icon: Key, content: <AuthProviderTab /> },
    { id: 'auth_password', label: cfgTxt.tabs.password, icon: Lock, content: <PasswordPolicyTab /> },
    { id: 'auth_session', label: cfgTxt.tabs.session, icon: Timer, content: <SessionPolicyTab /> },
    { id: 'auth_lockout', label: cfgTxt.tabs.lockout, icon: Shield, content: <LockoutPolicyTab /> },
    { id: 'auth_tokens', label: cfgTxt.tabs.tokens, icon: Coins, content: <TokenSettingsTab /> },
  ],
  configDefaultTab: 'auth_provider',
  configTitle: cfgTxt.pageTitle,
  configSubtitle: cfgTxt.pageSubtitle,
  configIcon: Sliders,
};

export default authManifest;

// ── Reusable placeholder for views under construction ───────────────────────
function PlaceholderView({ title, subtitle, icon: Icon }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="flex flex-col items-center justify-center min-h-[400px]">
        <EmptyState icon={Icon} title={title} description={`${subtitle} — Coming in next iteration.`} />
      </Card>
    </div>
  );
}
