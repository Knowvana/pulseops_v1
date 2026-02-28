// ============================================================================
// Config Routes — PulseOps V1 API
//
// PURPOSE: System configuration CRUD — stores key/value pairs in the
// system_config table. Used for database config, feature flags, etc.
//
// ENDPOINTS:
//   GET  /config        — List all config entries
//   GET  /config/:key   — Get a specific config entry
//   POST /config        — Create or update a config entry
// ============================================================================
import { Router } from 'express';
import DatabaseService from '../database/databaseService.js';
import config from '../../config/index.js';
import { messages } from '../../shared/loadJson.js';
import logger from '../../shared/logger.js';

const router = Router();
const schema = config.database.schema || 'pulseops';
const db = DatabaseService;

router.get('/', async (req, res) => {
  try {
    const result = await db.query(`SELECT key, value, description FROM ${schema}.system_config ORDER BY key`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

router.get('/:key', async (req, res) => {
  try {
    const result = await db.query(`SELECT key, value FROM ${schema}.system_config WHERE key = $1`, [req.params.key]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Config not found' } });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

router.post('/', async (req, res) => {
  const { key, value, description } = req.body;
  if (!key) {
    return res.status(400).json({ success: false, error: { message: 'Key is required' } });
  }
  try {
    await db.query(
      `INSERT INTO ${schema}.system_config (key, value, description, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, description = $3, updated_at = NOW()`,
      [key, JSON.stringify(value), description || null]
    );
    logger.info(messages.success.configSaved, { key });
    res.json({ success: true, data: { key, message: messages.success.configSaved } });
  } catch (err) {
    logger.error(messages.errors.configSaveFailed, { key, error: err.message });
    res.status(500).json({ success: false, error: { message: err.message || messages.errors.configSaveFailed } });
  }
});

export default router;
