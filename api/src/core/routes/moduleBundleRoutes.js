// ============================================================================
// Module Bundle Routes — PulseOps V1 API (PUBLIC — No Auth Required)
//
// PURPOSE: Serve built ES module bundles from the hot-drop folder (dist-modules/).
// These routes are PUBLIC because the frontend uses dynamic import() to load
// module manifests at runtime — import() cannot attach auth headers.
//
// ENDPOINTS:
//   GET /modules/bundle/:moduleId/manifest.js  — Serve built ES module bundle
//   GET /modules/bundle/:moduleId/:fileName    — Serve module assets (json, css)
//
// SECURITY:
//   - Only serves files from the hot-drop folder (path traversal safe)
//   - Only allows .js, .json, .css extensions
//   - No auth required (static asset serving for dynamic import())
// ============================================================================
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../../config/index.js';
import { messages } from '../../shared/loadJson.js';
import logger from '../../shared/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// ── Serve built manifest.js as ES module ─────────────────────────────────────
router.get('/:moduleId/manifest.js', (req, res) => {
  const { moduleId } = req.params;
  const modulesDir = path.resolve(__dirname, '../../..', config.modulesDir || '../dist-modules');
  const manifestPath = path.join(modulesDir, moduleId, 'manifest.js');

  // Path traversal guard
  if (!manifestPath.startsWith(modulesDir)) {
    return res.status(403).json({ success: false, error: { message: 'Access denied' } });
  }

  if (!fs.existsSync(manifestPath)) {
    logger.warn(`Manifest not found for module: ${moduleId}`, { path: manifestPath });
    return res.status(404).json({ success: false, error: { message: messages.errors.moduleNotFound } });
  }

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  fs.createReadStream(manifestPath).pipe(res);
});

// ── Serve other module assets (constants.json, uiText.json, etc.) ────────────
router.get('/:moduleId/:fileName', (req, res) => {
  const { moduleId, fileName } = req.params;
  const allowedExtensions = ['.json', '.js', '.css'];
  const ext = path.extname(fileName);
  if (!allowedExtensions.includes(ext)) {
    return res.status(403).json({ success: false, error: { message: 'File type not allowed' } });
  }

  const modulesDir = path.resolve(__dirname, '../../..', config.modulesDir || '../dist-modules');
  const filePath = path.join(modulesDir, moduleId, fileName);

  // Path traversal guard
  if (!filePath.startsWith(modulesDir)) {
    return res.status(403).json({ success: false, error: { message: 'Access denied' } });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: { message: 'File not found' } });
  }

  const mimeTypes = { '.js': 'application/javascript', '.json': 'application/json', '.css': 'text/css' };
  res.setHeader('Content-Type', (mimeTypes[ext] || 'application/octet-stream') + '; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  fs.createReadStream(filePath).pipe(res);
});

export default router;
