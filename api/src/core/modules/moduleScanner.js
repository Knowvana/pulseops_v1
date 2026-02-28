// ============================================================================
// Module Scanner — PulseOps V1 API
//
// PURPOSE: Scans the hot-drop modules directory for available add-on modules.
// Each module folder must contain a constants.json with module metadata.
// This enables zero-redeployment module discovery.
//
// HOT-DROP FLOW:
//   1. Developer builds module: npm run build:module auth
//   2. Output goes to dist-modules/auth/ (constants.json + manifest.js)
//   3. This scanner reads dist-modules/ and returns available modules
//   4. Module Manager UI shows them as "Available" for installation
// ============================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../../config/index.js';
import logger from '../../shared/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getModulesDir() {
  const dir = path.resolve(__dirname, '../../..', config.modulesDir || '../dist-modules');
  return dir;
}

const ModuleScanner = {
  /**
   * Scan the hot-drop directory for available modules.
   * Each subdirectory must contain a constants.json with module metadata.
   * @returns {Array} List of module metadata objects
   */
  scan() {
    const modulesDir = getModulesDir();
    const results = [];

    if (!fs.existsSync(modulesDir)) {
      logger.warn(`Modules directory not found: ${modulesDir}`);
      return results;
    }

    const entries = fs.readdirSync(modulesDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const constantsPath = path.join(modulesDir, entry.name, 'constants.json');
      const manifestPath = path.join(modulesDir, entry.name, 'manifest.js');

      if (!fs.existsSync(constantsPath)) continue;

      try {
        const constants = JSON.parse(fs.readFileSync(constantsPath, 'utf8'));
        results.push({
          moduleId: constants.moduleId || entry.name,
          name: constants.moduleName || entry.name,
          shortName: constants.moduleShortName || '',
          version: constants.moduleVersion || '1.0.0',
          description: constants.moduleDescription || '',
          roles: constants.roles || [],
          isCore: constants.isCore || false,
          order: constants.order ?? 99,
          hasManifest: fs.existsSync(manifestPath),
          source: 'hot-drop',
        });
      } catch (err) {
        logger.warn(`Failed to read module constants: ${entry.name}`, { error: err.message });
      }
    }

    return results.sort((a, b) => (a.order || 99) - (b.order || 99));
  },
};

export default ModuleScanner;
