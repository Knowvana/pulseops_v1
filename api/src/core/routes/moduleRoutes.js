// ============================================================================
// Module Routes — PulseOps V1 API (PROTECTED — JWT Required)
//
// PURPOSE: REST endpoints for module management — listing, installing,
// enabling, disabling, removing, and scanning the hot-drop folder.
// All routes here require JWT authentication.
//
// ENDPOINTS:
//   GET  /modules                — List all installed modules from DB
//   GET  /modules/available      — Scan hot-drop folder for available modules
//   GET  /modules/scan           — Force re-scan of hot-drop folder
//   POST /modules/:id/install    — Install a module (register in DB)
//   POST /modules/:id/enable     — Enable an installed module
//   POST /modules/:id/disable    — Disable an installed module
//   DELETE /modules/:id          — Remove a module entirely
//   POST /modules/:id/initialize — Initialize module schema
//   GET  /modules/:id/status     — Check module schema status
//
// NOTE: Bundle serving (manifest.js, assets) is in moduleBundleRoutes.js (public).
// ============================================================================
import { Router } from 'express';
import DatabaseService from '../database/databaseService.js';
import ModuleScanner from '../modules/moduleScanner.js';
import config from '../../config/index.js';
import { messages } from '../../shared/loadJson.js';
import logger from '../../shared/logger.js';

const router = Router();
const schema = config.database.schema || 'pulseops';
const db = DatabaseService;

// List all installed modules from database
router.get('/', async (req, res) => {
  try {
    const status = await db.getSchemaStatus();
    if (!status.initialized) {
      return res.json({ success: true, data: [] });
    }
    const result = await db.query(
      `SELECT module_id as "moduleId", name, version, description, is_core as "isCore",
              enabled, schema_initialized as "schemaInitialized", "order",
              installed_at as "installedAt", updated_at as "updatedAt"
       FROM ${schema}.system_modules ORDER BY "order" ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    logger.error('Failed to list modules', { error: err.message });
    res.json({ success: true, data: [] });
  }
});

// Scan hot-drop folder for available modules
router.get('/available', (req, res) => {
  try {
    const modules = ModuleScanner.scan();
    res.json({ success: true, data: modules });
  } catch (err) {
    logger.error('Module scan failed', { error: err.message });
    res.json({ success: true, data: [] });
  }
});

// Force re-scan
router.get('/scan', (req, res) => {
  try {
    const modules = ModuleScanner.scan();
    res.json({ success: true, data: modules, count: modules.length });
  } catch (err) {
    logger.error('Module scan failed', { error: err.message });
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// NOTE: Bundle serving routes (manifest.js, assets) are in moduleBundleRoutes.js
// They are public (no auth) because the frontend uses dynamic import() to load them.

// Install a module
router.post('/:moduleId/install', async (req, res) => {
  const { moduleId } = req.params;
  try {
    const available = ModuleScanner.scan();
    const moduleMeta = available.find(m => m.moduleId === moduleId);
    if (!moduleMeta) {
      return res.status(404).json({ success: false, error: { message: messages.errors.moduleNotFound } });
    }
    const existing = await db.query(
      `SELECT module_id FROM ${schema}.system_modules WHERE module_id = $1`, [moduleId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: { message: messages.errors.moduleAlreadyInstalled } });
    }
    await db.query(
      `INSERT INTO ${schema}.system_modules (module_id, name, version, description, is_core, enabled, schema_initialized, "order")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [moduleId, moduleMeta.name, moduleMeta.version, moduleMeta.description,
       moduleMeta.isCore, false, false, moduleMeta.order || 99]
    );
    logger.info(messages.success.moduleInstalled, { moduleId });
    res.json({ success: true, data: { moduleId, message: messages.success.moduleInstalled } });
  } catch (err) {
    logger.error(messages.errors.moduleInstallFailed, { moduleId, error: err.message });
    res.status(500).json({ success: false, error: { message: err.message || messages.errors.moduleInstallFailed } });
  }
});

// Enable a module
router.post('/:moduleId/enable', async (req, res) => {
  const { moduleId } = req.params;
  try {
    await db.query(
      `UPDATE ${schema}.system_modules SET enabled = true, updated_at = NOW() WHERE module_id = $1`, [moduleId]
    );
    logger.info(messages.success.moduleEnabled, { moduleId });
    res.json({ success: true, data: { moduleId, message: messages.success.moduleEnabled } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Disable a module
router.post('/:moduleId/disable', async (req, res) => {
  const { moduleId } = req.params;
  try {
    const modCheck = await db.query(
      `SELECT is_core FROM ${schema}.system_modules WHERE module_id = $1`, [moduleId]
    );
    if (modCheck.rows[0]?.is_core) {
      return res.status(400).json({ success: false, error: { message: messages.errors.coreModuleCannotDisable } });
    }
    await db.query(
      `UPDATE ${schema}.system_modules SET enabled = false, updated_at = NOW() WHERE module_id = $1`, [moduleId]
    );
    logger.info(messages.success.moduleDisabled, { moduleId });
    res.json({ success: true, data: { moduleId, message: messages.success.moduleDisabled } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Remove a module
router.delete('/:moduleId', async (req, res) => {
  const { moduleId } = req.params;
  try {
    const modCheck = await db.query(
      `SELECT is_core FROM ${schema}.system_modules WHERE module_id = $1`, [moduleId]
    );
    if (modCheck.rows[0]?.is_core) {
      return res.status(400).json({ success: false, error: { message: messages.errors.coreModuleCannotRemove } });
    }
    await db.query(`DELETE FROM ${schema}.system_modules WHERE module_id = $1`, [moduleId]);
    logger.info(messages.success.moduleRemoved, { moduleId });
    res.json({ success: true, data: { moduleId, message: messages.success.moduleRemoved } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Initialize module schema (placeholder — modules define their own tables)
router.post('/:moduleId/initialize', async (req, res) => {
  const { moduleId } = req.params;
  try {
    await db.query(
      `UPDATE ${schema}.system_modules SET schema_initialized = true, updated_at = NOW() WHERE module_id = $1`,
      [moduleId]
    );
    res.json({ success: true, data: { moduleId, message: messages.success.schemaInitialized } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Module status
router.get('/:moduleId/status', async (req, res) => {
  const { moduleId } = req.params;
  try {
    const result = await db.query(
      `SELECT module_id as "moduleId", name, enabled, schema_initialized as "schemaInitialized"
       FROM ${schema}.system_modules WHERE module_id = $1`, [moduleId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: messages.errors.moduleNotFound } });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.json({ success: true, data: { initialized: false, error: err.message } });
  }
});

export default router;
