// ============================================================================
// Database Routes — PulseOps V1 API
//
// PURPOSE: REST endpoints for database configuration, connection testing,
// schema management, and data operations.
//
// ENDPOINTS:
//   GET  /database/test-connection   — Test DB connection, return latency
//   POST /database/test-connection   — Test with custom config
//   GET  /database/schema-status     — Check schema initialization state
//   POST /database/create-schema     — Create core schema and tables
//   POST /database/load-default-data — Seed default admin user + config
//   DELETE /database/load-default-data — Clean default data
//   POST /database/wipe              — Drop entire schema (destructive!)
//   GET  /database/stats             — Table sizes and counts
// ============================================================================
import { Router } from 'express';
import DatabaseService from '../database/databaseService.js';
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
    res.status(500).json({ success: false, error: { message: messages.errors.dbConnectionFailed } });
  }
});

router.post('/test-connection', async (req, res) => {
  try {
    const result = await DatabaseService.testConnection();
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(messages.errors.dbConnectionFailed, { error: err.message });
    res.status(500).json({ success: false, error: { message: messages.errors.dbConnectionFailed } });
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

// Wipe database
router.post('/wipe', async (req, res) => {
  try {
    const result = await DatabaseService.wipeDatabase();
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(messages.errors.dbWipeFailed, { error: err.message });
    res.status(500).json({ success: false, error: { message: err.message || messages.errors.dbWipeFailed } });
  }
});

// Database stats
router.get('/stats', async (req, res) => {
  try {
    const result = await DatabaseService.getStats();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

export default router;
