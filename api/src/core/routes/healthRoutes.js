// ============================================================================
// Health Routes — PulseOps V1 API
//
// ENDPOINTS:
//   GET /health            — Basic health check
//   GET /health/liveness   — K8s liveness probe
//   GET /health/readiness  — K8s readiness probe (checks DB)
// ============================================================================
import { Router } from 'express';
import DatabaseService from '../database/databaseService.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'pulseops-v1-api' });
});

router.get('/liveness', (req, res) => {
  res.json({ status: 'alive' });
});

router.get('/readiness', async (req, res) => {
  try {
    await DatabaseService.testConnection();
    res.json({ status: 'ready', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'not_ready', database: 'disconnected' });
  }
});

export default router;
