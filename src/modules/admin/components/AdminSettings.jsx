// ============================================================================
// AdminSettings — PulseOps V1 (Admin Module)
//
// PURPOSE: Platform settings view with tabbed interface for database
// configuration, database objects management, and general settings.
// Uses the shared SettingsConfig component for consistent tab layout.
//
// ARCHITECTURE: Each tab renders its own content component inline.
// All text from uiText.json, all logs from logMessages.json.
// Database Config and Objects UI matches existing pulseops design.
//
// USED BY: admin/manifest.jsx → getSettingsTabs() / getConfigTabs()
//
// DEPENDENCIES:
//   - @shared → Card, Button, StatusTile, ConfirmDialog, Logger, ApiClient
//   - ../uiText.json        → All UI labels
//   - ../logMessages.json   → All log message templates
//   - ../errorMessages.json → All error message templates
// ============================================================================
import React, { useState, useCallback, useEffect } from 'react';
import {
  Database, Layers, Settings, RefreshCw, Save, CheckCircle2,
  XCircle, AlertTriangle, Eye, EyeOff, Loader2, Trash2, Download
} from 'lucide-react';
import { Card, Button, StatusTile, ConfirmDialog, Logger, ApiClient } from '@shared';
import uiText from '@modules/admin/uiText.json';
import logMsgs from '@modules/admin/logMessages.json';
import errorMsgs from '@modules/admin/errorMessages.json';
import urls from '@shared/config/urls.json';

const dbTxt = uiText.settings.database;
const objTxt = uiText.settings.dbObjects;
const commonTxt = uiText.settings;

// ── Reusable editable field (module-specific, not shared) ────────────────────
function EditableField({ label, value, onChange, placeholder, disabled, type = 'text', rightAddon }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-surface-600 mb-1">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition-all disabled:bg-surface-50 disabled:text-surface-400 ${rightAddon ? 'pr-9' : ''}`}
        />
        {rightAddon && (
          <div className="absolute inset-y-0 right-2 flex items-center">
            {rightAddon}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Database Configuration Tab ──────────────────────────────────────────────
export function DatabaseConfigTab() {
  const [config, setConfig] = useState({
    host: 'localhost', port: '5432', database: 'pulseops_v1',
    schema: 'pulseops', username: 'postgres', password: '', ssl: false,
  });
  const [unifiedStatus, setUnifiedStatus] = useState({ type: null, status: 'neutral', message: '', meta: null });
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const checkOnLoad = async () => {
      try {
        ApiClient.suppressSessionExpired(true);
        const result = await ApiClient.get(urls.databaseTestConnection);
        ApiClient.suppressSessionExpired(false);
        if (result?.success) {
          const latency = result.data?.latencyMs || 0;
          const dbVersion = result.data?.dbVersion || null;
          const versionShort = dbVersion ? dbVersion.split(',')[0].replace('PostgreSQL ', '') : '';
          setUnifiedStatus({
            type: 'connection', status: 'success',
            message: result.data?.message || dbTxt.status.connected,
            meta: versionShort ? `Response: ${latency}ms • Version: ${versionShort}` : `Response: ${latency}ms`,
          });
        } else {
          // Check if error is due to DB not existing
          const errorMsg = result?.error?.message || '';
          const isDbNotExist = errorMsg.includes('does not exist') || errorMsg.includes('database') && errorMsg.includes('not');
          setUnifiedStatus({ 
            type: 'connection', 
            status: 'error', 
            message: isDbNotExist ? dbTxt.status.dbNotExist : dbTxt.status.connectionFailed,
            meta: null 
          });
        }
      } catch {
        ApiClient.suppressSessionExpired(false);
        setUnifiedStatus({ type: 'connection', status: 'error', message: dbTxt.status.connectionFailed, meta: null });
      }
    };
    checkOnLoad();
  }, []);

  const handleTestConnection = useCallback(async () => {
    setIsTesting(true);
    setUnifiedStatus({ type: null, status: 'neutral', message: '', meta: null });
    try {
      ApiClient.suppressSessionExpired(true);
      const result = await ApiClient.post(urls.databaseTestConnection, config);
      ApiClient.suppressSessionExpired(false);
      if (result?.success) {
        const latency = result.data?.latencyMs || 0;
        const dbVersion = result.data?.dbVersion || null;
        const versionShort = dbVersion ? dbVersion.split(',')[0].replace('PostgreSQL ', '') : '';
        setUnifiedStatus({
          type: 'connection', status: 'success',
          message: result.data?.message || dbTxt.status.connected,
          meta: versionShort ? `Response: ${latency}ms • Version: ${versionShort}` : `Response: ${latency}ms`,
        });
        Logger.info('AdminSettings', logMsgs.dbConfigSaved, { latencyMs: latency });
      } else {
        // Check if error is due to DB not existing
        const errorMsg = result?.error?.message || '';
        const isDbNotExist = errorMsg.includes('does not exist') || (errorMsg.includes('database') && errorMsg.includes('not'));
        setUnifiedStatus({
          type: 'connection', status: 'error',
          message: isDbNotExist ? dbTxt.status.dbNotExist : (result?.error?.message || dbTxt.status.connectionFailed),
          meta: null,
        });
      }
    } catch (err) {
      ApiClient.suppressSessionExpired(false);
      setUnifiedStatus({
        type: 'connection', status: 'error',
        message: err.message || dbTxt.status.connectionFailed, meta: null,
      });
    } finally {
      setIsTesting(false);
    }
  }, [config]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      ApiClient.suppressSessionExpired(true);
      const result = await ApiClient.post(urls.configEndpoint, { key: 'database', value: config });
      ApiClient.suppressSessionExpired(false);
      if (result?.success) {
        setUnifiedStatus({
          type: 'save', status: 'success',
          message: dbTxt.status.configSaved, meta: null,
        });
        Logger.info('AdminSettings', logMsgs.dbConfigSaved, config);
      } else {
        throw new Error(result?.error?.message || errorMsgs.dbConfigSaveFailed);
      }
    } catch (err) {
      ApiClient.suppressSessionExpired(false);
      setUnifiedStatus({
        type: 'save', status: 'error',
        message: err.message || errorMsgs.dbConfigSaveFailed, meta: null,
      });
      Logger.error('AdminSettings', errorMsgs.dbConfigSaveFailed, { error: err.message });
    } finally {
      setIsSaving(false);
    }
  }, [config]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-base font-bold text-surface-800 mb-1">{dbTxt.title}</h3>
        <p className="text-sm text-surface-400">{dbTxt.description}</p>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-brand-50 to-teal-50 border border-brand-200/50 mb-4">
          <div className="p-2 rounded-lg bg-white shadow-sm">
            <Database size={18} className="text-brand-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-surface-800">{dbTxt.typeLabel}</p>
            <p className="text-[10px] text-surface-500">{dbTxt.typeDescription}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <EditableField label={dbTxt.fields.host} value={config.host} onChange={(v) => setConfig(p => ({ ...p, host: v }))} placeholder={dbTxt.placeholders.host} />
            <EditableField label={dbTxt.fields.port} value={config.port} onChange={(v) => setConfig(p => ({ ...p, port: v }))} placeholder={dbTxt.placeholders.port} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <EditableField label={dbTxt.fields.database} value={config.database} onChange={(v) => setConfig(p => ({ ...p, database: v }))} placeholder={dbTxt.placeholders.database} />
            <EditableField label={dbTxt.fields.schema} value={config.schema} onChange={(v) => setConfig(p => ({ ...p, schema: v }))} placeholder={dbTxt.placeholders.schema} />
          </div>
          <EditableField label={dbTxt.fields.username} value={config.username} onChange={(v) => setConfig(p => ({ ...p, username: v }))} placeholder={dbTxt.placeholders.username} />
          <EditableField
            label={dbTxt.fields.password}
            value={config.password}
            onChange={(v) => setConfig(p => ({ ...p, password: v }))}
            placeholder={dbTxt.placeholders.password}
            type={showPassword ? 'text' : 'password'}
            rightAddon={
              <button type="button" onClick={() => setShowPassword(p => !p)} className="text-surface-400 hover:text-surface-600 transition-colors">
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
          />

          <div className="flex items-center gap-2 py-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                className={`relative w-9 h-5 rounded-full transition-colors ${config.ssl ? 'bg-brand-500' : 'bg-surface-300'}`}
                onClick={() => setConfig(p => ({ ...p, ssl: !p.ssl }))}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${config.ssl ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-xs font-semibold text-surface-600">{dbTxt.fields.ssl}</span>
            </label>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-surface-200 to-transparent my-4" />

        {unifiedStatus.type && (
          <div className="mb-4">
            {unifiedStatus.status === 'error' && unifiedStatus.message === dbTxt.status.dbNotExist ? (
              <div className="bg-gradient-to-r from-pink-50 via-rose-50 to-pink-50 rounded-xl border border-pink-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gradient-to-br from-pink-100 to-rose-100 rounded-lg shrink-0">
                    <AlertTriangle size={16} className="text-pink-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-pink-800 mb-1">{dbTxt.connectionStatusLabel}</h4>
                    <p className="text-xs text-pink-700 leading-relaxed mb-2">{unifiedStatus.message}</p>
                    <p className="text-[11px] text-pink-600 font-semibold">{dbTxt.status.dbNotExistAction}</p>
                  </div>
                </div>
              </div>
            ) : (
              <StatusTile
                label={unifiedStatus.type === 'connection' ? dbTxt.connectionStatusLabel : dbTxt.saveStatusLabel}
                value={
                  unifiedStatus.status === 'success'
                    ? (unifiedStatus.type === 'connection' ? dbTxt.status.connected : dbTxt.status.configSaved)
                    : (unifiedStatus.type === 'connection' ? dbTxt.status.connectionFailed : dbTxt.status.saveFailed)
                }
                status={unifiedStatus.status === 'success' ? 'success' : 'danger'}
                detail={unifiedStatus.meta || unifiedStatus.message}
              />
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={handleTestConnection} loading={isTesting}>
            {isTesting ? dbTxt.buttons.testing : dbTxt.buttons.testConnect}
          </Button>
          <Button variant="primary" size="sm" icon={Save} onClick={handleSave} loading={isSaving}>
            {isSaving ? dbTxt.buttons.saving : dbTxt.buttons.saveConfig}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ── Database Objects Tab ────────────────────────────────────────────────────
export function DatabaseObjectsTab() {
  const [dbConnected, setDbConnected] = useState(null);
  const [dbExists, setDbExists] = useState(null);
  const [schemaStatus, setSchemaStatus] = useState({ initialized: false });
  const [defaultDataStatus, setDefaultDataStatus] = useState({ loaded: false });
  const [isCreatingDb, setIsCreatingDb] = useState(false);
  const [isDeletingDb, setIsDeletingDb] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isCleaningData, setIsCleaningData] = useState(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [showDeleteDbConfirm, setShowDeleteDbConfirm] = useState(false);
  const [isWiping, setIsWiping] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      ApiClient.suppressSessionExpired(true);
      const result = await ApiClient.get(urls.databaseSchemaStatus);
      ApiClient.suppressSessionExpired(false);
      if (result?.success && result?.data) {
        // Backend returns connected:false when DB doesn't exist
        if (result.data.connected === false) {
          setDbConnected(true); // API is up, show Create Database UI
          setDbExists(false);
          setSchemaStatus({ initialized: false });
          setDefaultDataStatus({ loaded: false });
        } else {
          // DB exists and is connected
          setDbConnected(true);
          setDbExists(true);
          setSchemaStatus({ initialized: result.data.initialized !== false });
          setDefaultDataStatus({ loaded: result.data.hasDefaultData !== false });
        }
      } else {
        // API error but returned success:false — show Create Database UI
        setDbConnected(true);
        setDbExists(false);
      }
    } catch {
      ApiClient.suppressSessionExpired(false);
      // Network error or API down — show "not connected" screen
      setDbConnected(false);
      setDbExists(false);
    }
  }, []);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  // ── Not connected state ─────────────────────────────────────────────
  if (dbConnected === false) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h3 className="text-base font-bold text-surface-800 mb-1">{objTxt.title}</h3>
          <p className="text-sm text-surface-400">{objTxt.description}</p>
        </div>
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 rounded-2xl border border-amber-200 p-8 flex flex-col items-center text-center">
          <div className="p-4 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl mb-4">
            <Database size={32} className="text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-surface-800 mb-2">{objTxt.dbNotSetupTitle}</h3>
          <p className="text-sm text-surface-500 max-w-md mb-4">{objTxt.dbNotSetupMessage}</p>
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={checkStatus}>
            {objTxt.retryConnection}
          </Button>
        </div>
      </div>
    );
  }

  // ── Loading state ───────────────────────────────────────────────────
  if (dbConnected === null) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin text-brand-500" size={32} />
      </div>
    );
  }

  const handleCreateDatabase = async () => {
    setIsCreatingDb(true);
    try {
      ApiClient.suppressSessionExpired(true);
      const result = await ApiClient.post(urls.databaseCreateDatabase);
      ApiClient.suppressSessionExpired(false);
      if (result?.success) {
        Logger.info('AdminSettings', logMsgs.dbCreated || 'Database created');
        checkStatus();
      } else {
        throw new Error(result?.error?.message || errorMsgs.dbCreateFailed || 'Failed to create database');
      }
    } catch (err) {
      ApiClient.suppressSessionExpired(false);
      Logger.error('AdminSettings', err.message);
    } finally {
      setIsCreatingDb(false);
    }
  };

  const handleDeleteDatabase = async () => {
    setShowDeleteDbConfirm(false);
    setIsDeletingDb(true);
    try {
      const result = await ApiClient.delete(urls.databaseDeleteDatabase);
      if (result?.success) {
        Logger.info('AdminSettings', logMsgs.dbDeleted || 'Database deleted');
        setDbExists(false);
        setDbConnected(false);
        setSchemaStatus({ initialized: false });
        setDefaultDataStatus({ loaded: false });
      } else {
        throw new Error(result?.error?.message || errorMsgs.dbDeleteFailed || 'Failed to delete database');
      }
    } catch (err) {
      Logger.error('AdminSettings', err.message);
    } finally {
      setIsDeletingDb(false);
    }
  };

  const handleInitializeSchema = async () => {
    setIsInitializing(true);
    try {
      const result = await ApiClient.post(urls.databaseCreateSchema);
      if (result?.success) {
        setSchemaStatus({ initialized: true });
        Logger.info('AdminSettings', logMsgs.dbSchemaInitialized);
        checkStatus();
      } else {
        throw new Error(result?.error?.message || errorMsgs.dbSchemaFailed);
      }
    } catch (err) {
      Logger.error('AdminSettings', errorMsgs.dbSchemaFailed, { error: err.message });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleLoadDefaultData = async () => {
    setIsLoadingData(true);
    try {
      const result = await ApiClient.post(urls.databaseLoadDefaultData);
      if (result?.success) {
        setDefaultDataStatus({ loaded: true });
        Logger.info('AdminSettings', logMsgs.dbDataLoaded);
        checkStatus();
      } else {
        throw new Error(result?.error?.message || errorMsgs.dbDataLoadFailed);
      }
    } catch (err) {
      Logger.error('AdminSettings', errorMsgs.dbDataLoadFailed, { error: err.message });
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleCleanDefaultData = async () => {
    setIsCleaningData(true);
    try {
      const result = await ApiClient.delete(urls.databaseLoadDefaultData);
      if (result?.success) {
        setDefaultDataStatus({ loaded: false });
        checkStatus();
      }
    } catch (err) {
      Logger.error('AdminSettings', errorMsgs.dbDataLoadFailed, { error: err.message });
    } finally {
      setIsCleaningData(false);
    }
  };

  const handleWipeDatabase = async () => {
    setShowWipeConfirm(false);
    setIsWiping(true);
    try {
      const result = await ApiClient.post(urls.databaseWipe);
      if (result?.success) {
        Logger.info('AdminSettings', logMsgs.dbWiped);
        checkStatus();
      } else {
        throw new Error(result?.error?.message || errorMsgs.dbWipeFailed);
      }
    } catch (err) {
      Logger.error('AdminSettings', errorMsgs.dbWipeFailed, { error: err.message });
    } finally {
      setIsWiping(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-base font-bold text-surface-800 mb-1">{objTxt.title}</h3>
        <p className="text-sm text-surface-400">{objTxt.description}</p>
      </div>

      {/* Database Instance Status - Pink warning when not exists */}
      {!dbExists ? (
        <div className="bg-gradient-to-r from-pink-50 via-rose-50 to-pink-50 rounded-xl border border-pink-200 p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 bg-gradient-to-br from-pink-100 to-rose-100 rounded-lg shrink-0">
              <AlertTriangle size={16} className="text-pink-600" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-pink-800 mb-1">{objTxt.dbInstanceNotFound}</h4>
              <p className="text-[11px] text-pink-700 leading-relaxed">{objTxt.dbInstanceNotFoundDesc}</p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={Database}
            onClick={handleCreateDatabase}
            loading={isCreatingDb}
            className="bg-pink-600 hover:bg-pink-700 text-white"
          >
            {isCreatingDb ? objTxt.creating : objTxt.createDatabase}
          </Button>
        </div>
      ) : (
        <Card className="p-4 border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-teal-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg">
                <Database size={16} className="text-emerald-600" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-surface-700">{objTxt.createDatabaseTitle}</h4>
                <p className="text-[11px] text-surface-500">{objTxt.createDatabaseDescription}</p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-600">{objTxt.createDatabaseExists}</span>
          </div>
        </Card>
      )}

      {/* Schema Status Card */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-surface-400">{objTxt.schemaStatus}</h4>
          <span className={`text-xs font-bold ${schemaStatus.initialized ? 'text-emerald-600' : 'text-amber-600'}`}>
            {schemaStatus.initialized ? objTxt.schemaInitialized : objTxt.schemaNotInitialized}
          </span>
        </div>

        {!schemaStatus.initialized ? (
          <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 rounded-xl border border-amber-200 p-4 mb-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg shrink-0">
                <AlertTriangle size={16} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-800 mb-1">{objTxt.schemaNotInitialized}</p>
                <p className="text-[11px] text-amber-700 leading-relaxed">{objTxt.schemaDescription}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-emerald-50 border border-emerald-200 mb-3">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">{objTxt.schemaReady}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {!schemaStatus.initialized && (
            <Button 
              variant="primary" 
              size="sm" 
              icon={Database} 
              onClick={handleInitializeSchema} 
              loading={isInitializing}
              disabled={!dbExists}
            >
              {isInitializing ? objTxt.initializing : objTxt.initializeSchema}
            </Button>
          )}
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={checkStatus}>
            Refresh
          </Button>
        </div>
      </Card>

      {/* Default Data Card */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-surface-400">{objTxt.defaultData}</h4>
          <span className={`text-xs font-bold ${defaultDataStatus.loaded ? 'text-emerald-600' : 'text-amber-600'}`}>
            {defaultDataStatus.loaded ? objTxt.defaultDataLoaded : objTxt.defaultDataNotLoaded}
          </span>
        </div>
        <p className="text-xs text-surface-500 mb-3">{objTxt.defaultDataDescription}</p>

        <div className="flex items-center gap-2">
          <Button
            variant={defaultDataStatus.loaded ? 'secondary' : 'primary'}
            size="sm"
            icon={Download}
            onClick={handleLoadDefaultData}
            loading={isLoadingData}
            disabled={!schemaStatus.initialized}
          >
            {isLoadingData ? objTxt.loading : (defaultDataStatus.loaded ? objTxt.reloadDefaultData : objTxt.loadDefaultData)}
          </Button>
          {defaultDataStatus.loaded && (
            <Button variant="ghost" size="sm" icon={Trash2} onClick={handleCleanDefaultData} loading={isCleaningData} className="text-danger-600 hover:bg-danger-50">
              {objTxt.cleanDefaultData}
            </Button>
          )}
        </div>
      </Card>

      {/* Danger Zone — Wipe Schema & Delete Database */}
      <Card className="p-4 border-rose-200 bg-gradient-to-r from-rose-50/50 to-red-50/30">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 bg-gradient-to-br from-rose-100 to-red-100 rounded-lg shrink-0">
            <AlertTriangle size={16} className="text-rose-600" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">{objTxt.wipeTitle}</h4>
            <p className="text-xs text-surface-500">{objTxt.wipeDescription}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="danger" 
            size="sm" 
            icon={Trash2} 
            onClick={() => setShowWipeConfirm(true)} 
            loading={isWiping}
            disabled={!dbExists || !schemaStatus.initialized}
          >
            {objTxt.wipeDatabase}
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={Trash2}
            onClick={() => setShowDeleteDbConfirm(true)}
            loading={isDeletingDb}
            disabled={!dbExists}
          >
            {objTxt.deleteDatabase}
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        isOpen={showWipeConfirm}
        onClose={() => setShowWipeConfirm(false)}
        onConfirm={handleWipeDatabase}
        title={objTxt.wipeTitle}
        message={objTxt.wipeDescription}
        variant="danger"
        confirmLabel={objTxt.wipeDatabase}
        loading={isWiping}
      />

      <ConfirmDialog
        isOpen={showDeleteDbConfirm}
        onClose={() => setShowDeleteDbConfirm(false)}
        onConfirm={handleDeleteDatabase}
        title={objTxt.deleteDatabaseTitle}
        message={objTxt.deleteDatabaseDescription}
        variant="danger"
        confirmLabel={objTxt.deleteDatabase}
        loading={isDeletingDb}
      />
    </div>
  );
}

// ── General Settings Tab ────────────────────────────────────────────────────
export function GeneralSettingsTab() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-base font-bold text-surface-800 mb-1">{commonTxt.tabs.general}</h3>
        <p className="text-sm text-surface-400">{commonTxt.subtitle}</p>
      </div>
      <Card className="flex flex-col items-center justify-center py-12">
        <Settings size={40} className="text-surface-300 mb-3" />
        <h3 className="text-sm font-bold text-surface-700 mb-1">{commonTxt.tabs.general}</h3>
        <p className="text-xs text-surface-400 text-center max-w-sm">
          Platform-wide configuration options will be available in a future update.
        </p>
      </Card>
    </div>
  );
}
