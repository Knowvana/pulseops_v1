// ============================================================================
// PlatformDashboard — PulseOps V1 (Core)
//
// PURPOSE: The root orchestrator for the authenticated UI. Fetches enabled
// modules from the database, dynamically loads their manifests via import(),
// merges with static core manifests, and renders the active module's view.
//
// THIS FILE CONTAINS ZERO MODULE-SPECIFIC CODE.
// All module data flows through the manifest contract. Adding a new module
// requires ZERO changes here — register it in the DB, platform discovers it.
//
// ZERO-DOWNTIME MODULE ADDITION:
//   1. On mount, fetches enabled module list from DB via ModuleService.getAll()
//   2. Dynamically loads manifests for enabled add-on modules via import()
//   3. Merges DB records with core + dynamic manifests
//   4. Filters by user role + enabled state
//   5. Active module's navItems drive the SideNav
//   6. Active module's getViews() renders the center content
//   7. Config/settings views use the shared SettingsConfig component
//
// USAGE:
//   <PlatformDashboard user={user} onLogout={handleLogout} />
//
// DEPENDENCIES:
//   - @shared → AppShell, SettingsConfig, Logger, ModuleService
//   - @modules/moduleRegistry → getAllManifests, getManifestById, loadModuleManifests
//   - @shared/config/app.json → App name
// ============================================================================
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell, SettingsConfig, Logger, ModuleService, ApiClient } from '@shared';
import { getAllManifests, getManifestById, loadModuleManifests } from '@modules/moduleRegistry';
import appConfig from '@shared/config/app.json';
import logMessages from '@shared/config/logMessages.json';

// Wrapper component to handle routing
function PlatformDashboardRouter({ user, onLogout }) {
  return (
    <Routes>
      <Route path="/:moduleId/:viewId" element={<PlatformDashboard user={user} onLogout={onLogout} />} />
      <Route path="/:moduleId" element={<PlatformDashboard user={user} onLogout={onLogout} />} />
      <Route path="/" element={<PlatformDashboard user={user} onLogout={onLogout} />} />
    </Routes>
  );
}

function PlatformDashboard({ user, onLogout }) {
  // ── Routing ─────────────────────────────────────────────────────────────────────
  const navigate = useNavigate();
  const { moduleId: urlModuleId, viewId: urlViewId } = useParams();

  // ── State ─────────────────────────────────────────────────────────────────────
  const [dbModules, setDbModules] = useState([]);
  const [activeModuleId, setActiveModuleId] = useState(urlModuleId || null);
  const [activeView, setActiveView] = useState(urlViewId || null);
  const [modulesLoading, setModulesLoading] = useState(true);

  // ── Fetch modules from database + dynamically load enabled manifests ──────
  const fetchModules = useCallback(async () => {
    setModulesLoading(true);
    try {
      // Suppress session-expired events — backend may not be running in
      // core-admin-only mode. A 401 here should NOT flash the login page.
      ApiClient.suppressSessionExpired(true);
      const data = await ModuleService.getAll();
      ApiClient.suppressSessionExpired(false);
      setDbModules(data);
      Logger.debug('PlatformDashboard', logMessages.modules.fetched, { count: data.length });

      // Dynamically load manifests for enabled add-on modules
      const enabledIds = data.filter(m => m.enabled).map(m => m.moduleId);
      if (enabledIds.length > 0) {
        await loadModuleManifests(enabledIds);
        Logger.debug('PlatformDashboard', logMessages.modules.manifestLoaded, { loaded: enabledIds });
      }
    } catch (err) {
      ApiClient.suppressSessionExpired(false);
      // Backend not available — core modules still work (offline mode)
      Logger.warn('PlatformDashboard', logMessages.common.actionFailed, { error: err.message });
    } finally {
      setModulesLoading(false);
    }
  }, []);

  useEffect(() => { fetchModules(); }, [fetchModules]);

  // ── Merge DB modules with all loaded manifests ────────────────────────────
  const availableModules = useMemo(() => {
    const allManifests = getAllManifests();

    return allManifests
      .map(manifest => {
        const dbEntry = dbModules.find(m => m.moduleId === manifest.id);
        const isEnabled = manifest.isCore || (dbEntry?.enabled ?? manifest.enabled);
        const roles = dbEntry?.roles || manifest.roles || [];
        const userRole = user?.role || 'user';
        const hasAccess = roles.includes(userRole)
          || (roles.includes('admin') && userRole === 'super_admin')
          || userRole === 'super_admin';

        return {
          id: manifest.id,
          name: dbEntry?.name || manifest.name,
          shortName: manifest.shortName,
          description: dbEntry?.description || manifest.description,
          icon: manifest.icon,
          roles,
          enabled: isEnabled,
          isCore: manifest.isCore,
          order: dbEntry?.order ?? manifest.order,
          hasAccess,
        };
      })
      .filter(m => m.enabled && m.hasAccess)
      .sort((a, b) => (a.order || 99) - (b.order || 99));
  }, [dbModules, user?.role, modulesLoading]);

  // ── Sync URL params with state ───────────────────────────────────────────────────
  useEffect(() => {
    if (urlModuleId && urlModuleId !== activeModuleId) {
      setActiveModuleId(urlModuleId);
    }
    if (urlViewId && urlViewId !== activeView) {
      setActiveView(urlViewId);
    }
  }, [urlModuleId, urlViewId]);

  // ── Auto-select first module on load if no URL params ────────────────────────────
  useEffect(() => {
    if (availableModules.length > 0 && !activeModuleId && !urlModuleId) {
      const first = availableModules[0];
      const manifest = getManifestById(first.id);
      const defaultView = manifest?.defaultView || 'dashboard';
      navigate(`/${first.id}/${defaultView}`, { replace: true });
    }
  }, [availableModules, activeModuleId, urlModuleId, navigate]);

  // ── Active manifest lookup ────────────────────────────────────────────────
  const activeManifest = activeModuleId ? getManifestById(activeModuleId) : null;
  const activeModuleName = availableModules.find(m => m.id === activeModuleId)?.name || '';

  // ── SideNav items from active manifest ────────────────────────────────────
  const sideNavItems = useMemo(() => {
    if (!activeManifest?.navItems) return [];
    return activeManifest.navItems.map(item => ({
      ...item,
    }));
  }, [activeManifest]);

  // ── Module switching ────────────────────────────────────────────────────────────────
  const handleSwitchModule = useCallback((moduleId) => {
    const manifest = getManifestById(moduleId);
    const defaultView = manifest?.defaultView || 'dashboard';
    navigate(`/${moduleId}/${defaultView}`);
    Logger.debug('PlatformDashboard', logMessages.modules.manifestLoaded, { moduleId });
  }, [navigate]);

  // ── SideNav item selection ────────────────────────────────────────────────────────────────
  const handleSideNavSelect = useCallback((viewId) => {
    if (activeModuleId) {
      navigate(`/${activeModuleId}/${viewId}`);
    }
  }, [activeModuleId, navigate]);

  // ── Render tabbed views (settings/config) using shared SettingsConfig ─────
  const renderTabsView = useCallback((getTabsFn, title, subtitle, icon, defaultTab) => {
    if (!getTabsFn) return null;
    const tabs = typeof getTabsFn === 'function' ? getTabsFn() : getTabsFn;
    return (
      <SettingsConfig
        title={title}
        subtitle={subtitle}
        icon={icon}
        tabs={tabs}
        defaultTab={defaultTab}
      />
    );
  }, []);

  // ── Render active module content ──────────────────────────────────────────
  const renderModuleContent = useCallback(() => {
    if (!activeManifest) return null;

    // Settings view (admin settings tabs)
    if (activeView === 'settings' && activeManifest.getSettingsTabs) {
      return renderTabsView(
        activeManifest.getSettingsTabs,
        activeManifest.settingsTitle,
        activeManifest.settingsSubtitle,
        activeManifest.settingsIcon,
        activeManifest.settingsDefaultTab,
      );
    }

    // Config view (module configuration tabs)
    if (activeView === 'config' && activeManifest.getConfigTabs) {
      return renderTabsView(
        activeManifest.getConfigTabs,
        activeManifest.configTitle,
        activeManifest.configSubtitle,
        activeManifest.configIcon,
        activeManifest.configDefaultTab,
      );
    }

    // Regular views from manifest.getViews() - now returns component references
    if (activeManifest.getViews) {
      const views = activeManifest.getViews();
      const ViewComponent = views[activeView] || views[activeManifest.defaultView];
      
      if (!ViewComponent) return null;
      
      // Render component reference as JSX, passing necessary props
      return <ViewComponent user={user} onNavigate={handleSideNavSelect} onModulesChanged={fetchModules} />;
    }

    return null;
  }, [activeManifest, activeView, user, handleSideNavSelect, fetchModules, renderTabsView]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppShell
      appName={appConfig.appName || 'PulseOps'}
      modules={availableModules}
      activeModuleId={activeModuleId}
      onSwitchModule={handleSwitchModule}
      onLogout={onLogout}
      onSystemAdmin={() => { handleSwitchModule('platform_admin'); }}
      user={user}
      sideNavTitle={activeModuleName}
      sideNavItems={sideNavItems}
      activeSideNavItemId={activeView}
      onSelectSideNavItem={handleSideNavSelect}
      logger={Logger}
    >
      {(() => {
        const content = renderModuleContent();
        const Wrapper = activeManifest?.ViewWrapper;
        return Wrapper ? <Wrapper>{content}</Wrapper> : content;
      })()}
    </AppShell>
  );
}

export default PlatformDashboardRouter;
