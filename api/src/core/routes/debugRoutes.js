// ============================================================================
// Debug Routes — PulseOps V1 API
//
// PURPOSE: Temporary debugging endpoints to troubleshoot module installation.
// Remove these routes in production!
//
// ENDPOINTS:
//   GET /debug/modules-db — Show raw database contents
//   GET /debug/modules-available — Show available modules from filesystem
// ============================================================================
import { Router } from 'express';
import DatabaseService from '../database/databaseService.js';
import ModuleScanner from '../modules/moduleScanner.js';
import config from '../../config/index.js';

const router = Router();
const schema = config.database.schema || 'pulseops';
const db = DatabaseService;

// Show raw database contents
router.get('/modules-db', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM ${schema}.system_modules ORDER BY "order" ASC`
    );
    res.json({ 
      success: true, 
      data: result.rows,
      count: result.rows.length 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Show available modules from filesystem
router.get('/modules-available', (req, res) => {
  try {
    const modules = ModuleScanner.scan();
    res.json({ 
      success: true, 
      data: modules,
      count: modules.length 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Check specific module installation status
router.get('/module/:moduleId/status', async (req, res) => {
  const { moduleId } = req.params;
  try {
    // Check database
    const dbResult = await db.query(
      `SELECT * FROM ${schema}.system_modules WHERE module_id = $1`,
      [moduleId]
    );
    
    // Check filesystem
    const available = ModuleScanner.scan();
    const fsModule = available.find(m => m.moduleId === moduleId);
    
    res.json({
      success: true,
      data: {
        moduleId,
        inDatabase: dbResult.rows.length > 0 ? dbResult.rows[0] : null,
        inFilesystem: fsModule || null,
        canInstall: fsModule && dbResult.rows.length === 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
