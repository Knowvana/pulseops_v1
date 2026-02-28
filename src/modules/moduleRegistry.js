// ============================================================================
// Module Registry — PulseOps V1 (Dynamic Plug-and-Play)
//
// PURPOSE: Central registry that discovers and exposes module manifests.
// Supports BOTH static (core) and dynamic (add-on) module loading.
//
// ZERO-DOWNTIME ARCHITECTURE:
//   1. CORE modules (admin, logging) are statically imported — they ship
//      with the platform and cannot be removed or disabled.
//   2. ADD-ON modules (auth, api_manager, demo, custom) are discovered
//      from the database at runtime. Their manifests are loaded via
//      dynamic import() — NO rebuild or redeployment needed.
//   3. PlatformDashboard calls getAllManifests() which merges
//      static + dynamic manifests, filtered by enabled state.
//
// ADDING A NEW MODULE (zero downtime, zero code changes):
//   1. Place module folder under modules/<name>/ with manifest.jsx
//   2. Register it in the database via Module Manager UI
//   3. Platform discovers and loads it via dynamic import()
//   4. No rebuild. No restart. No downtime.
//
// MODULE CONTRACT: Every module must export a manifest object with:
//   REQUIRED: id, name, version, description, icon, defaultView,
//             navItems, getViews
//   OPTIONAL: roles, order, isCore, getConfigTabs, getSettingsTabs,
//             ViewWrapper, dependencies
//
// DEPENDENCIES:
//   - Static manifest imports for core modules only
//   - Dynamic import() for add-on modules
//   - ModuleService for database module discovery
// ============================================================================

// ─── Static imports for CORE modules (always bundled, cannot be removed) ────
// Only the essential platform module (Admin) is statically imported.
// ALL other modules are loaded dynamically via import() at runtime.
import adminManifest from '@modules/admin/manifest.jsx';
import urls from '@shared/config/urls.json';

// ─── Core manifest list (only admin at build time) ─────────────────────────
const STATIC_MANIFESTS = [
  adminManifest,
];

// ─── Dynamic import map (runtime-extensible) ─────────────────────────────────
// Maps module IDs to their import functions.
// HOT-DROP modules are loaded from API URL: /api/modules/bundle/<id>/manifest.js
// DEV FALLBACK: If API is unreachable, falls back to bundled @modules/ paths.
// Extended at runtime via registerModulePath() when new modules are discovered.
const MODULE_IMPORT_MAP = {};

// ─── Dev-only fallback paths (bundled in source, used when no API) ────────────
const DEV_FALLBACK_MAP = {
  logging: () => import('@modules/logging/manifest.jsx'),
  auth: () => import('@modules/auth/manifest.jsx'),
  api_manager: () => import('@modules/api_manager/manifest.jsx'),
  demo: () => import('@modules/demo/manifest.jsx'),
};

/**
 * Build the hot-drop import URL for a module.
 * @param {string} moduleId
 * @returns {string} Full URL like /api/modules/bundle/demo/manifest.js
 */
function getHotDropUrl(moduleId) {
  const base = urls.apiBaseUrl || '/api';
  return `${base}${urls.modulesBundle || '/modules/bundle'}/${moduleId}/manifest.js`;
}

// ─── Dynamic manifest store (populated at runtime from DB) ──────────────────
let _dynamicManifests = [];

/**
 * Register a module import path at runtime (zero-downtime module addition).
 * Called when a new module is uploaded/registered without a rebuild.
 * @param {string} moduleId - Module identifier
 * @param {Function} importFn - Function returning import() promise
 */
export function registerModulePath(moduleId, importFn) {
  if (!moduleId || typeof importFn !== 'function') return;
  MODULE_IMPORT_MAP[moduleId] = importFn;
}

/**
 * Register a dynamic manifest at runtime (called by Module Manager).
 * This is how non-core modules get added without rebuilding the app.
 * @param {Object} manifest - Module manifest object following the contract
 */
export function registerDynamicManifest(manifest) {
  if (!manifest?.id) return;
  // Prevent duplicates
  _dynamicManifests = _dynamicManifests.filter(m => m.id !== manifest.id);
  _dynamicManifests.push(manifest);
}

/**
 * Dynamically load a module's manifest by its ID.
 * LOADING ORDER:
 *   1. Check if already loaded (cached dynamic manifest)
 *   2. Check if it's a core module (static import)
 *   3. Check MODULE_IMPORT_MAP (registered hot-drop paths)
 *   4. Try hot-drop URL: /api/modules/bundle/<id>/manifest.js
 *   5. Fall back to dev bundled path: @modules/<id>/manifest.jsx
 *
 * @param {string} moduleId - Module to load
 * @returns {Promise<Object|null>} Loaded manifest or null
 */
export async function loadModuleManifest(moduleId) {
  // Already loaded as dynamic?
  const existing = _dynamicManifests.find(m => m.id === moduleId);
  if (existing) return existing;

  // Already a core module?
  const coreMatch = STATIC_MANIFESTS.find(m => m.id === moduleId);
  if (coreMatch) return coreMatch;

  // Try registered import function first (from MODULE_IMPORT_MAP)
  const registeredFn = MODULE_IMPORT_MAP[moduleId];
  if (registeredFn) {
    try {
      const mod = await registeredFn();
      const manifest = mod.default || mod;
      if (manifest?.id) {
        registerDynamicManifest(manifest);
        return manifest;
      }
    } catch {
      // Registered path failed — continue to hot-drop URL
    }
  }

  // Try hot-drop URL (true runtime loading from API)
  try {
    const hotDropUrl = getHotDropUrl(moduleId);
    const mod = await import(/* @vite-ignore */ hotDropUrl);
    const manifest = mod.default || mod;
    if (manifest?.id) {
      // Cache the import function for future loads
      MODULE_IMPORT_MAP[moduleId] = () => import(/* @vite-ignore */ hotDropUrl);
      registerDynamicManifest(manifest);
      return manifest;
    }
  } catch {
    // Hot-drop URL not available — try dev fallback
  }

  // Dev fallback: try bundled @modules/ paths (only works in dev with Vite)
  const devFn = DEV_FALLBACK_MAP[moduleId];
  if (devFn) {
    try {
      const mod = await devFn();
      const manifest = mod.default || mod;
      if (manifest?.id) {
        registerDynamicManifest(manifest);
        return manifest;
      }
    } catch (err) {
      console.error(`Failed to load module '${moduleId}':`, err);
    }
  }

  return null;
}

/**
 * Load multiple module manifests by their IDs (parallel).
 * @param {string[]} moduleIds - Array of module IDs to load
 * @returns {Promise<Object[]>} Array of loaded manifests
 */
export async function loadModuleManifests(moduleIds) {
  const results = await Promise.allSettled(
    moduleIds.map(id => loadModuleManifest(id))
  );
  return results
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value);
}

/**
 * Remove a dynamic manifest (called when a module is uninstalled).
 * @param {string} moduleId - Module ID to remove
 */
export function unregisterDynamicManifest(moduleId) {
  _dynamicManifests = _dynamicManifests.filter(m => m.id !== moduleId);
}

/**
 * Get all registered manifests (static + dynamic), sorted by order.
 * @returns {Array} All manifests
 */
export function getAllManifests() {
  const combined = [...STATIC_MANIFESTS, ..._dynamicManifests];
  // Deduplicate by id (static takes precedence)
  const seen = new Set();
  const unique = combined.filter(m => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
  return unique.sort((a, b) => (a.order || 99) - (b.order || 99));
}

/**
 * Get a specific module manifest by ID.
 * @param {string} moduleId - Module identifier
 * @returns {Object|null} Manifest or null
 */
export function getManifestById(moduleId) {
  return STATIC_MANIFESTS.find(m => m.id === moduleId)
    || _dynamicManifests.find(m => m.id === moduleId)
    || null;
}

/**
 * Get all modules accessible by a specific role (static fallback).
 * @param {string} role - User role
 * @returns {Array} Filtered and sorted manifests
 */
export function getModulesForRole(role) {
  return getAllManifests()
    .filter(m => m.enabled && m.roles?.includes(role))
    .sort((a, b) => (a.order || 99) - (b.order || 99));
}

/**
 * Get all enabled module manifests (regardless of role).
 * @returns {Array}
 */
export function getAllEnabledModules() {
  return getAllManifests().filter(m => m.enabled);
}

/**
 * Validate a manifest against the module contract.
 * Returns { valid: boolean, errors: string[] }
 * @param {Object} manifest - Manifest to validate
 * @returns {Object} { valid, errors }
 */
export function validateManifest(manifest) {
  const required = ['id', 'name', 'version', 'description', 'icon', 'defaultView', 'navItems', 'getViews'];
  const errors = [];

  required.forEach(field => {
    if (!manifest?.[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  if (manifest?.navItems && !Array.isArray(manifest.navItems)) {
    errors.push('navItems must be an array');
  }

  if (manifest?.getViews && typeof manifest.getViews !== 'function') {
    errors.push('getViews must be a function');
  }

  // Check mandatory nav items (dashboard + config)
  if (Array.isArray(manifest?.navItems)) {
    const navIds = manifest.navItems.map(n => n.id);
    if (!navIds.includes('dashboard')) errors.push('navItems must include a "dashboard" item');
    if (!navIds.includes('config')) errors.push('navItems must include a "config" item');
  }

  return { valid: errors.length === 0, errors };
}

export default STATIC_MANIFESTS;
