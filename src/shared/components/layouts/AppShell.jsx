// ============================================================================
// AppShell — PulseOps V1 Layout System
//
// PURPOSE: The master layout that composes the entire authenticated UI.
// Composes: TopNav (top) + SideNav (left, collapsible) + MainContent (center)
//           + RightPanel (slide-out, right).
//
// ARCHITECTURE: Module-agnostic. Receives modules[], sideNavItems[],
// children for the active module's page content. ZERO module-specific
// code lives here — all module data flows through props.
//
// LAYOUT STRUCTURE:
//   ┌──────────────────────────────────────────────────┐
//   │              TopNav (fixed)              [📊] [👤]│
//   ├────────┬────────────────────────┬───────────────┤
//   │        │                        │  RightPanel   │
//   │ SideNav│     Main Content       │  (slide-out)  │
//   │  (◀▶)  │     (children)         │  Logs|API|Bug │
//   │        │                        │               │
//   └────────┴────────────────────────┴───────────────┘
//
// USAGE:
//   <AppShell
//     appName="PulseOps"
//     modules={modules}
//     activeModuleId="admin"
//     onSwitchModule={handleSwitch}
//     sideNavItems={navItems}
//     activeSideNavItemId="dashboard"
//     onSelectSideNavItem={handleSelect}
//   >
//     <DashboardView />
//   </AppShell>
//
// DEPENDENCIES:
//   - @shared/components/layouts/TopNav.jsx      → Top navigation bar
//   - @shared/components/layouts/SideNav.jsx     → Left sidebar navigation
//   - @shared/components/layouts/RightPanel.jsx  → Right slide-out panel
// ============================================================================
import React, { useState } from 'react';
import TopNav from '@shared/components/layouts/TopNav';
import SideNav from '@shared/components/layouts/SideNav';
import RightPanel from '@shared/components/layouts/RightPanel';

export default function AppShell({
  appName,
  modules = [],
  activeModuleId,
  onSwitchModule,
  onOpenSettings,
  onLogout,
  onSystemAdmin,
  user,

  sideNavTitle,
  sideNavItems = [],
  activeSideNavItemId,
  onSelectSideNavItem,
  sideNavCollapsed: controlledCollapsed,
  onToggleSideNav: controlledToggle,

  logger,
  children,
}) {
  const hasSideNav = sideNavItems.length > 0;

  // SideNav collapse state — controlled or internal
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const sideNavCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const onToggleSideNav = controlledToggle || (() => setInternalCollapsed((c) => !c));

  // RightPanel open state
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-surface-50 font-sans text-surface-800">
      {/* Top Navigation */}
      <TopNav
        appName={appName}
        modules={modules}
        activeModuleId={activeModuleId}
        onSwitchModule={onSwitchModule}
        onOpenSettings={onOpenSettings}
        onLogout={onLogout}
        onSystemAdmin={onSystemAdmin}
        user={user}
        onToggleRightPanel={() => setIsRightPanelOpen((o) => !o)}
        isRightPanelOpen={isRightPanelOpen}
      />

      {/* Body: SideNav + Main Content + RightPanel */}
      <div className="flex-1 flex min-h-0">
        {hasSideNav && (
          <SideNav
            title={sideNavTitle}
            items={sideNavItems}
            activeItemId={activeSideNavItemId}
            onSelectItem={onSelectSideNavItem}
            collapsed={sideNavCollapsed}
            onToggleCollapse={onToggleSideNav}
          />
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="w-full px-6 py-6">
            {children}
          </div>
        </main>

        {/* Right Panel (Logs, API, Report) - now inline */}
        <RightPanel
          isOpen={isRightPanelOpen}
          onClose={() => setIsRightPanelOpen(false)}
          logger={logger}
          className={isRightPanelOpen ? "w-96 animate-slide-right" : "w-0"}
        />
      </div>
    </div>
  );
}
