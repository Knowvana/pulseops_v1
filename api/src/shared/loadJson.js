// ============================================================================
// JSON Loader Utility — PulseOps V1 API
//
// PURPOSE: Load JSON config files using fs.readFileSync instead of
// import assert { type: 'json' } which requires experimental Node flags.
// ============================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configDir = path.resolve(__dirname, '../config');

export function loadJson(relativePath) {
  const fullPath = path.resolve(configDir, relativePath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

export const messages = loadJson('messages.json');
