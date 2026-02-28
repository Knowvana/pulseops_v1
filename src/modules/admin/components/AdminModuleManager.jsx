// ============================================================================
// AdminModuleManager — PulseOps V1 (Admin Module)
//
// PURPOSE: The Module Manager UI that enables true plug-and-play. Allows
// administrators to install, enable, disable, and remove modules from
// the running platform WITHOUT touching any code or redeploying.
//
// ARCHITECTURE: Fetches installed modules from /api/modules and available
// modules from /api/modules/available. Uses ModuleService for all CRUD
// operations. Module state changes are reflected immediately in the
// TopNav and SideNav via PlatformDashboard's fetchModules() callback.
//
// FEATURES:
//   - View installed modules with status (enabled/disabled/core)
//   - Install new modules from the available registry
//   - Enable/disable installed modules
//   - Remove non-core modules
//   - Schema initialization wizard
//
// USED BY: admin/manifest.jsx → getViews() → 'moduleManager' view
//
// DEPENDENCIES:
//   - @shared → Card, Button, PageHeader, EmptyState, ConfirmDialog,
//               Logger, ModuleService
//   - ../uiText.json       → All UI labels
//   - ../logMessages.json  → All log message templates
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Download, Power, PowerOff, Trash2,
  CheckCircle2, XCircle, Shield, RefreshCw, Loader2
} from 'lucide-react';
import { Card, Button, PageHeader, EmptyState, ConfirmDialog, Logger, ModuleService, ApiClient } from '@shared';
import { getAllManifests, getManifestById } from '@modules/moduleRegistry';
import uiText from '@modules/admin/uiText.json';
import logMsgs from '@modules/admin/logMessages.json';

const txt = uiText.moduleManager;

export default function AdminModuleManager({ onModulesChanged }) {
  const [activeTab, setActiveTab] = useState('installed');
  const [dbModules, setDbModules] = useState([]);
  const [availableModules, setAvailableModules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, moduleId: null, action: null });

  // ── Fetch modules from database + discover available modules ───────────────
  const fetchModules = useCallback(async () => {
    setIsLoading(true);
    try {
      // Suppress session-expired — backend may not be running yet
      ApiClient.suppressSessionExpired(true);
      const [installed, available] = await Promise.all([
        ModuleService.getAll(),
        ModuleService.getAvailable(),
      ]);
      ApiClient.suppressSessionExpired(false);
      setDbModules(installed);
      
      // Filter out already installed modules from available list
      const installedIds = new Set(installed.map(m => m.moduleId));
      const notYetInstalled = available.filter(mod => !installedIds.has(mod.moduleId || mod.id));
      setAvailableModules(notYetInstalled);
    } catch (err) {
      ApiClient.suppressSessionExpired(false);
      Logger.warn('AdminModuleManager', logMsgs.moduleManagerOpened, { error: err.message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchModules(); }, [fetchModules]);

  // ── Show all modules from database + merge with manifests ───────────────────
  const installedModules = dbModules.map(dbEntry => {
    // Find matching manifest (might be loaded or not)
    const manifest = getAllManifests().find(m => m.id === dbEntry.moduleId);
    
    return {
      // Use manifest data if available, otherwise use database data
      id: dbEntry.moduleId,
      name: dbEntry.name,
      shortName: manifest?.shortName || dbEntry.name,
      description: dbEntry.description,
      version: dbEntry.version,
      icon: manifest?.icon || 'Package',
      roles: manifest?.roles || [],
      isCore: dbEntry.isCore,
      
      // Database state
      dbEnabled: dbEntry.enabled,
      dbInstalled: true,
      schemaReady: dbEntry.schemaInitialized,
      dbOrder: dbEntry.order,
      
      // Manifest data (if loaded)
      defaultView: manifest?.defaultView,
      navItems: manifest?.navItems || [],
      getViews: manifest?.getViews,
      getConfigTabs: manifest?.getConfigTabs,
      getSettingsTabs: manifest?.getSettingsTabs,
    };
  }).sort((a, b) => (a.dbOrder || 99) - (b.dbOrder || 99));

  // ── Module actions ────────────────────────────────────────────────────────
  const handleAction = useCallback(async (moduleId, action) => {
    setActionInProgress(`${moduleId}:${action}`);
    try {
      switch (action) {
        case 'install':
          await ModuleService.install(moduleId);
          Logger.info('AdminModuleManager', logMsgs.moduleInstalled, { moduleId });
          // Refresh modules to update both installed and available lists
          await fetchModules();
          break;
        case 'enable':
          await ModuleService.enable(moduleId);
          Logger.info('AdminModuleManager', logMsgs.moduleEnabled, { moduleId });
          // Refresh modules to reload the registry
          await fetchModules();
          break;
        case 'disable':
          await ModuleService.disable(moduleId);
          Logger.info('AdminModuleManager', logMsgs.moduleDisabled, { moduleId });
          break;
        case 'remove':
          await ModuleService.remove(moduleId);
          Logger.info('AdminModuleManager', logMsgs.moduleRemoved, { moduleId });
          // Refresh modules to update both installed and available lists
          await fetchModules();
          break;
        case 'initialize':
          await ModuleService.initializeSchema(moduleId);
          break;
        default:
          break;
      }
      onModulesChanged?.();
    } catch (err) {
      Logger.error('AdminModuleManager', `Module ${action} failed`, { moduleId, error: err.message });
    } finally {
      setActionInProgress(null);
      setConfirmDialog({ open: false, moduleId: null, action: null });
    }
  }, [fetchModules, onModulesChanged]);

  // ── Confirm dangerous actions ─────────────────────────────────────────────
  const openConfirm = (moduleId, action) => {
    setConfirmDialog({ open: true, moduleId, action });
  };

  const isActioning = (moduleId, action) => actionInProgress === `${moduleId}:${action}`;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={txt.pageTitle}
        subtitle={txt.subtitle}
        icon={Package}
        actions={
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={fetchModules} loading={isLoading}>
            Refresh
          </Button>
        }
      />

      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-surface-100 rounded-lg p-1 w-fit">
        {Object.entries(txt.tabs).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              activeTab === key
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-surface-500 hover:text-surface-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Installed Modules Tab */}
      {activeTab === 'installed' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {installedModules.length === 0 ? (
            <EmptyState icon={Package} title={txt.noModulesInstalled} />
          ) : (
            installedModules.map((mod) => {
              const ModIcon = mod.icon || Package;
              const isCore = mod.isCore;
              const isEnabled = isCore || mod.dbEnabled;

              return (
                <Card key={mod.id} className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isEnabled ? 'bg-brand-50' : 'bg-surface-100'}`}>
                        <ModIcon size={20} className={isEnabled ? 'text-brand-600' : 'text-surface-400'} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-surface-800">{mod.name}</h3>
                          {isCore && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-brand-100 text-brand-700">
                              {txt.coreBadge}
                            </span>
                          )}
                          <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                            isEnabled ? 'bg-success-100 text-success-700' : 'bg-surface-200 text-surface-500'
                          }`}>
                            {isEnabled ? txt.enabledBadge : txt.disabledBadge}
                          </span>
                        </div>
                        <p className="text-xs text-surface-500 mt-0.5">{mod.description}</p>
                        <p className="text-[10px] text-surface-400 mt-1">{txt.version}: {mod.version || '1.0.0'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Schema status */}
                  <div className="flex items-center gap-1.5 mb-3 ml-[52px]">
                    {mod.schemaReady || isCore ? (
                      <><CheckCircle2 size={12} className="text-success-500" /><span className="text-[10px] text-success-600 font-medium">Schema Ready</span></>
                    ) : (
                      <><XCircle size={12} className="text-warning-500" /><span className="text-[10px] text-warning-600 font-medium">Schema Not Initialized</span></>
                    )}
                  </div>

                  {/* Actions */}
                  {!isCore && (
                    <div className="flex items-center gap-2 ml-[52px]">
                      {!isEnabled && !mod.schemaReady && (
                        <Button
                          variant="secondary" size="sm" icon={Download}
                          onClick={() => handleAction(mod.id, 'initialize')}
                          loading={isActioning(mod.id, 'initialize')}
                        >
                          Initialize
                        </Button>
                      )}
                      {!isEnabled && mod.schemaReady && (
                        <Button
                          variant="primary" size="sm" icon={Power}
                          onClick={() => handleAction(mod.id, 'enable')}
                          loading={isActioning(mod.id, 'enable')}
                        >
                          {txt.enableButton}
                        </Button>
                      )}
                      {isEnabled && (
                        <Button
                          variant="secondary" size="sm" icon={PowerOff}
                          onClick={() => openConfirm(mod.id, 'disable')}
                          loading={isActioning(mod.id, 'disable')}
                        >
                          {txt.disableButton}
                        </Button>
                      )}
                      <Button
                        variant="ghost" size="sm" icon={Trash2}
                        onClick={() => openConfirm(mod.id, 'remove')}
                        loading={isActioning(mod.id, 'remove')}
                        className="text-danger-600 hover:bg-danger-50"
                      >
                        {txt.removeButton}
                      </Button>
                    </div>
                  )}

                  {isCore && (
                    <div className="ml-[52px]">
                      <div className="flex items-center gap-1.5 text-xs text-surface-400">
                        <Shield size={12} />
                        <span>{txt.coreMessage}</span>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Available Modules Tab */}
      {activeTab === 'available' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {availableModules.length === 0 ? (
            <EmptyState icon={Package} title={txt.noModulesAvailable} />
          ) : (
            availableModules.map((mod) => (
              <Card key={mod.moduleId || mod.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-surface-800">{mod.name}</h3>
                    <p className="text-xs text-surface-500 mt-0.5">{mod.description}</p>
                    <p className="text-[10px] text-surface-400 mt-1">{txt.version}: {mod.version || '1.0.0'}</p>
                  </div>
                  <Button
                    variant="primary" size="sm" icon={Download}
                    onClick={() => handleAction(mod.moduleId || mod.id, 'install')}
                    loading={isActioning(mod.moduleId || mod.id, 'install')}
                  >
                    {txt.installButton}
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Confirm dialog for dangerous actions */}
      <ConfirmDialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, moduleId: null, action: null })}
        onConfirm={() => handleAction(confirmDialog.moduleId, confirmDialog.action)}
        title={`${confirmDialog.action === 'remove' ? 'Remove' : 'Disable'} Module?`}
        message={confirmDialog.action === 'remove'
          ? 'This will remove the module and all its data. This action cannot be undone.'
          : 'This will disable the module. Users will no longer see it in navigation.'}
        variant={confirmDialog.action === 'remove' ? 'danger' : 'warning'}
        confirmLabel={confirmDialog.action === 'remove' ? txt.removeButton : txt.disableButton}
        loading={actionInProgress !== null}
      />
    </div>
  );
}
