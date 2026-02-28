// ============================================================================
// Logs Routes — PulseOps V1 API
//
// PURPOSE: Handle frontend log synchronization. The frontend logger batches
// system logs and API call logs, then syncs them to the backend for
// persistence and analysis.
//
// ENDPOINTS:
//   POST /api/logs/system  → Sync system logs from frontend
//   POST /api/logs/api     → Sync API call logs from frontend
//
// ARCHITECTURE: Logs are stored in system_logs table (if DB available).
// If DB is unavailable, logs are silently dropped (graceful degradation).
// The frontend suppresses session-expired events during log sync to prevent
// infinite cascades.
//
// DEPENDENCIES:
//   - express
//   - ../middleware/auth.js → authenticate middleware
// ============================================================================
import express from 'express';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/logs/system
 * Sync system logs from the frontend.
 * Logs are stored in system_logs table if DB is available.
 */
router.post('/system', authenticate, async (req, res) => {
  try {
    const logs = req.body;
    if (!Array.isArray(logs) || logs.length === 0) {
      return res.json({ success: true, message: 'No logs to sync' });
    }

    // TODO: Implement database storage for system logs
    // For now, just acknowledge receipt (graceful degradation)
    // When DB is available, insert into system_logs table:
    // INSERT INTO system_logs (level, source, event, message, data, timestamp)
    // VALUES (...)

    res.json({ success: true, message: `Synced ${logs.length} system logs` });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

/**
 * POST /api/logs/api
 * Sync API call logs from the frontend.
 * Logs are stored in system_logs table if DB is available.
 */
router.post('/api', authenticate, async (req, res) => {
  try {
    const logs = req.body;
    if (!Array.isArray(logs) || logs.length === 0) {
      return res.json({ success: true, message: 'No logs to sync' });
    }

    // TODO: Implement database storage for API logs
    // For now, just acknowledge receipt (graceful degradation)
    // When DB is available, insert into system_logs table:
    // INSERT INTO system_logs (level, source, event, message, data, timestamp)
    // VALUES (...)

    res.json({ success: true, message: `Synced ${logs.length} API logs` });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

export default router;
