// ============================================================================
// ModuleService — PulseOps V1
//
// PURPOSE: Frontend service for communicating with the /api/modules
// endpoints. Handles listing, installing, enabling, disabling, removing,
// schema initialization, and demo data operations for platform modules.
//
// ARCHITECTURE: Uses ApiClient for all HTTP calls. All module state is
// persisted in the database (system_modules table), ensuring Kubernetes
// pod restarts do not lose module configuration. This is THE service
// that makes true plug-and-play possible — modules are discovered from
// the database at runtime, NOT from static imports.
//
// USED BY:
//   - moduleRegistry.js      → Fetches enabled modules for navigation
//   - Module Manager UI      → Install, enable, disable, remove modules
//   - PlatformDashboard      → Filters visible modules by enabled state
//   - TopNav                 → Filters visible modules by enabled state
//
// INTEGRATION FLOW:
//   UI calls ModuleService → ApiClient → /api/modules → system_modules table →
//   response drives navigation and module visibility
//
// DEPENDENCIES:
//   - @shared/services/apiClient.js     → HTTP calls
//   - @shared/services/logger.js        → Logging
//   - @shared/config/urls.json          → Module endpoints
//   - @shared/config/logMessages.json   → Log message templates
// ============================================================================
import ApiClient from '@shared/services/apiClient';
import Logger from '@shared/services/logger';
import urls from '@shared/config/urls.json';
import logMessages from '@shared/config/logMessages.json';

const MODULE_URL = urls.modulesEndpoint;

// ── Dev-only bundled module constants (offline discovery fallback) ─────────
// Used by scanBundledModules() ONLY when the API is unreachable.
// In production with hot-drop, the API /modules/available endpoint is the
// single source of truth — it scans dist-modules/ on the server.
const DEV_BUNDLED_CONSTANTS = {
  logging: () => import('@modules/logging/constants.json'),
  auth: () => import('@modules/auth/constants.json'),
  api_manager: () => import('@modules/api_manager/constants.json'),
  demo: () => import('@modules/demo/constants.json'),
};

const ModuleService = {
  /**
   * Fetch all installed modules from the database.
   * @returns {Promise<Array>} List of module records
   */
  async getAll() {
    try {
      const response = await ApiClient.get(MODULE_URL);
      return response?.data || [];
    } catch (err) {
      Logger.error('ModuleService', logMessages.common.actionFailed, { action: 'getAll', error: err.message });
      return [];
    }
  },

  /**
   * Fetch available modules from the backend (hot-drop folder scan).
   * Falls back to bundled module discovery if backend is unavailable.
   * @returns {Promise<Array>} List of available module definitions
   */
  async getAvailable() {
    try {
      ApiClient.suppressSessionExpired(true);
      const response = await ApiClient.get(urls.modulesAvailable);
      ApiClient.suppressSessionExpired(false);
      if (response?.data?.length > 0) return response.data;
    } catch {
      ApiClient.suppressSessionExpired(false);
    }
    // Fallback: scan bundled modules
    return this.scanBundledModules();
  },

  /**
   * Discover available add-on modules from the bundled codebase.
   * Used when no backend is running (pre-database setup).
   * Reads each module's constants.json for metadata.
   * @returns {Promise<Array>} Module metadata objects
   */
  async scanBundledModules() {
    const results = [];
    for (const [moduleId, importFn] of Object.entries(DEV_BUNDLED_CONSTANTS)) {
      try {
        const mod = await importFn();
        const constants = mod.default || mod;
        results.push({
          moduleId: constants.moduleId,
          name: constants.moduleName,
          shortName: constants.moduleShortName,
          version: constants.moduleVersion,
          description: constants.moduleDescription,
          roles: constants.roles,
          isCore: constants.isCore,
          order: constants.order,
          source: 'bundled',
        });
      } catch {
        // Module constants not loadable — skip
      }
    }
    return results.sort((a, b) => (a.order || 99) - (b.order || 99));
  },

  /**
   * Get the hot-drop manifest URL for a module.
   * Used by moduleRegistry to import() the built ES module from the API.
   * @param {string} moduleId
   * @returns {string} e.g. /api/modules/bundle/demo/manifest.js
   */
  getManifestUrl(moduleId) {
    const base = urls.apiBaseUrl || '/api';
    return `${base}${urls.modulesBundle || '/modules/bundle'}/${moduleId}/manifest.js`;
  },

  /**
   * Get a single module by its moduleId.
   * @param {string} moduleId - Unique module identifier
   * @returns {Promise<Object|null>}
   */
  async getById(moduleId) {
    try {
      const response = await ApiClient.get(`${MODULE_URL}/${moduleId}`);
      return response?.data || null;
    } catch (err) {
      Logger.error('ModuleService', logMessages.common.actionFailed, { action: 'getById', moduleId, error: err.message });
      return null;
    }
  },

  /**
   * Install a new module from the available registry.
   * Creates the module record in the database and optionally initializes schema.
   * @param {string} moduleId - Module to install
   * @returns {Promise<Object>}
   */
  async install(moduleId) {
    try {
      const response = await ApiClient.post(`${MODULE_URL}/${moduleId}/install`);
      Logger.info('ModuleService', logMessages.modules.installed, { moduleId });
      return response?.data || {};
    } catch (err) {
      Logger.error('ModuleService', logMessages.modules.installFailed, { moduleId, error: err.message });
      throw err;
    }
  },

  /**
   * Check if a module's schema is initialized.
   * @param {string} moduleId - Module to check
   * @returns {Promise<Object>} { initialized, existing, missing }
   */
  async checkStatus(moduleId) {
    try {
      const response = await ApiClient.get(`${MODULE_URL}/${moduleId}/status`);
      return response?.data || { initialized: false, existing: [], missing: [] };
    } catch (err) {
      Logger.error('ModuleService', logMessages.common.actionFailed, { action: 'checkStatus', moduleId, error: err.message });
      return { initialized: false, existing: [], missing: [], error: err.message };
    }
  },

  /**
   * Initialize module schema (create database tables).
   * @param {string} moduleId - Module to initialize
   * @returns {Promise<Object>}
   */
  async initializeSchema(moduleId) {
    try {
      const response = await ApiClient.post(`${MODULE_URL}/${moduleId}/initialize`);
      Logger.info('ModuleService', logMessages.modules.schemaInitialized, { moduleId });
      return response?.data || {};
    } catch (err) {
      Logger.error('ModuleService', logMessages.modules.schemaCheckFailed, { moduleId, error: err.message });
      throw err;
    }
  },

  /**
   * Enable a module (must be installed and schema initialized first).
   * @param {string} moduleId - Module to enable
   * @returns {Promise<Object>}
   */
  async enable(moduleId) {
    try {
      const response = await ApiClient.post(`${MODULE_URL}/${moduleId}/enable`);
      Logger.info('ModuleService', logMessages.modules.enabled, { moduleId });
      return response?.data || {};
    } catch (err) {
      Logger.error('ModuleService', logMessages.modules.enableFailed, { moduleId, error: err.message });
      throw err;
    }
  },

  /**
   * Disable a module (core modules cannot be disabled).
   * @param {string} moduleId - Module to disable
   * @returns {Promise<Object>}
   */
  async disable(moduleId) {
    try {
      const response = await ApiClient.post(`${MODULE_URL}/${moduleId}/disable`);
      Logger.info('ModuleService', logMessages.modules.disabled, { moduleId });
      return response?.data || {};
    } catch (err) {
      Logger.error('ModuleService', logMessages.modules.disableFailed, { moduleId, error: err.message });
      throw err;
    }
  },

  /**
   * Remove a module entirely (deletes schema, data, and module record).
   * Core modules cannot be removed.
   * @param {string} moduleId - Module to remove
   * @returns {Promise<Object>}
   */
  async remove(moduleId) {
    try {
      const response = await ApiClient.delete(`${MODULE_URL}/${moduleId}`);
      Logger.info('ModuleService', logMessages.modules.removed, { moduleId });
      return response?.data || {};
    } catch (err) {
      Logger.error('ModuleService', logMessages.modules.removeFailed, { moduleId, error: err.message });
      throw err;
    }
  },

  /**
   * Load demo data for a module.
   * @param {string} moduleId - Module to load demo data for
   * @returns {Promise<Object>}
   */
  async loadDemoData(moduleId) {
    try {
      const response = await ApiClient.post(`${MODULE_URL}/${moduleId}/demo-data`);
      Logger.info('ModuleService', logMessages.modules.demoDataLoaded, { moduleId });
      return response?.data || {};
    } catch (err) {
      Logger.error('ModuleService', logMessages.common.actionFailed, { action: 'loadDemoData', moduleId, error: err.message });
      throw err;
    }
  },

  /**
   * Wipe all data for a module.
   * @param {string} moduleId - Module to wipe data for
   * @returns {Promise<Object>}
   */
  async wipeData(moduleId) {
    try {
      const response = await ApiClient.delete(`${MODULE_URL}/${moduleId}/data`);
      Logger.info('ModuleService', logMessages.modules.dataWiped, { moduleId });
      return response?.data || {};
    } catch (err) {
      Logger.error('ModuleService', logMessages.common.actionFailed, { action: 'wipeData', moduleId, error: err.message });
      throw err;
    }
  },
};

export default ModuleService;
