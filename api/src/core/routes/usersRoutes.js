// ============================================================================
// Users Routes — PulseOps V1 API
//
// PURPOSE: Handle user management and statistics endpoints.
//
// ENDPOINTS:
//   GET /api/users/stats → Get user statistics (total users, etc.)
//
// ARCHITECTURE: User data is stored in system_users table (if DB available).
// If DB is unavailable, returns default/empty stats (graceful degradation).
//
// DEPENDENCIES:
//   - express
//   - ../middleware/auth.js → authenticate middleware
// ============================================================================
import express from 'express';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/users/stats
 * Get user statistics (total users, active sessions, etc.)
 * Requires authentication.
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    // TODO: Implement database query for user statistics
    // For now, return default stats (graceful degradation when DB is unavailable)
    // When DB is available, query system_users table:
    // SELECT COUNT(*) as total FROM system_users;

    const stats = {
      total: 0,
      active: 0,
      locked: 0,
      lastLogin: null,
    };

    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

export default router;
