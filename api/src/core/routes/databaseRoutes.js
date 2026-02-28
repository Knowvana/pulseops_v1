// ============================================================================
// Database Routes — PulseOps V1 API
//
// PURPOSE: REST endpoints for database configuration, connection testing,
// schema management, and data operations.
//
// AUTH STRATEGY (Selective):
//   - Public (no auth): setup/status routes (called before any user exists)
//     test-connection, schema-status, create-database, create-schema,
//     load-default-data, clean-default-data
//   - Protected (JWT required): destructive routes only
//     wipe, stats, delete-database
//
// ENDPOINTS:
//   POST   /database/create-database    — Create the database if not exists (public)
//   DELETE /database/delete-database    — Drop the database entirely (protected)
//   GET    /database/test-connection    — Test DB connection, return latency (public)
//   POST   /database/test-connection    — Test with custom config (public)
//   GET    /database/schema-status      — Check schema initialization state (public)
//   POST   /database/create-schema      — Create core schema and tables (public)
//   POST   /database/load-default-data  — Seed default admin user + config (public)
//   DELETE /database/load-default-data  — Clean default data (public)
//   POST   /database/wipe               — Drop entire schema (protected)
//   GET    /database/stats              — Table sizes and counts (protected)
// ============================================================================
import { Router } from 'express';
import DatabaseService from '../database/databaseService.js';
import { authenticate } from '../middleware/auth.js';
import { messages } from '../../shared/loadJson.js';
import logger from '../../shared/logger.js';

const router = Router();

// Create database if it doesn't exist (connects to 'postgres' DB first)
router.post('/create-database', async (req, res) => {
  try {
    const result = await DatabaseService.createDatabase();
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(messages.errors.dbCreateFailed, { error: err.message });
    res.status(500).json({ success: false, error: { message: err.message || messages.errors.dbCreateFailed } });
  }
});

// Test connection (GET = use server config, POST = use custom config)
router.get('/test-connection', async (req, res) => {
  try {
    const result = await DatabaseService.testConnection();
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(messages.errors.dbConnectionFailed, { error: err.message });
    // Return 200 with error details so frontend can show helpful message
    const isDbNotExist = err.message?.includes('does not exist');
    res.json({ 
      success: false, 
      error: { 
        message: err.message || messages.errors.dbConnectionFailed,
        code: isDbNotExist ? 'DB_NOT_EXIST' : 'CONNECTION_FAILED'
      } 
    });
  }
});

router.post('/test-connection', async (req, res) => {
  try {
    const result = await DatabaseService.testConnection();
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(messages.errors.dbConnectionFailed, { error: err.message });
    // Return 200 with error details so frontend can show helpful message
    const isDbNotExist = err.message?.includes('does not exist');
    res.json({ 
      success: false, 
      error: { 
        message: err.message || messages.errors.dbConnectionFailed,
        code: isDbNotExist ? 'DB_NOT_EXIST' : 'CONNECTION_FAILED'
      } 
    });
  }
});

// Schema status
router.get('/schema-status', async (req, res) => {
  try {
    const result = await DatabaseService.getSchemaStatus();
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(messages.errors.schemaInitFailed, { error: err.message });
    res.json({ success: true, data: { connected: false, initialized: false, hasDefaultData: false } });
  }
});

// Create schema
router.post('/create-schema', async (req, res) => {
  try {
    const result = await DatabaseService.createSchema();
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(messages.errors.schemaInitFailed, { error: err.message });
    res.status(500).json({ success: false, error: { message: err.message || messages.errors.schemaInitFailed } });
  }
});

// Load default data
router.post('/load-default-data', async (req, res) => {
  try {
    const result = await DatabaseService.loadDefaultData();
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(messages.errors.dbInitFailed, { error: err.message });
    res.status(500).json({ success: false, error: { message: err.message || messages.errors.dbInitFailed } });
  }
});

// Clean default data
router.delete('/load-default-data', async (req, res) => {
  try {
    const result = await DatabaseService.cleanDefaultData();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Delete database (drop the entire PostgreSQL database — PROTECTED)
router.delete('/delete-database', authenticate, async (req, res) => {
  try {
    const result = await DatabaseService.dropDatabase();
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(messages.errors.dbDeleteFailed, { error: err.message });
    res.status(500).json({ success: false, error: { message: err.message || messages.errors.dbDeleteFailed } });
  }
});

// Wipe schema (drop all tables, keep the database — PROTECTED)
router.post('/wipe', authenticate, async (req, res) => {
  try {
    const result = await DatabaseService.wipeDatabase();
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(messages.errors.dbWipeFailed, { error: err.message });
    res.status(500).json({ success: false, error: { message: err.message || messages.errors.dbWipeFailed } });
  }
});

// Database stats (PROTECTED)
router.get('/stats', authenticate, async (req, res) => {
  try {
    const result = await DatabaseService.getStats();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

export default router;
