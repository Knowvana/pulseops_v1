#!/usr/bin/env node
// ============================================================================
// Build Module Script — PulseOps V1
//
// PURPOSE: Builds a single module as a standalone ES module bundle for
// hot-drop deployment. The built output goes to dist-modules/<moduleId>/
// and can be copied to the server's modules/ folder for runtime discovery.
//
// USAGE:
//   node scripts/build-module.js <moduleId>
//   node scripts/build-module.js auth
//   node scripts/build-module.js logging
//   node scripts/build-module.js demo
//   node scripts/build-module.js --all   (builds all non-core modules)
//
// OUTPUT:
//   dist-modules/<moduleId>/
//     ├── manifest.js        (ES module bundle)
//     └── constants.json     (copied for metadata discovery)
// ============================================================================
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const ROOT = path.resolve(__dirname, '..');
const MODULES_DIR = path.join(ROOT, 'src', 'modules');
const OUTPUT_DIR = path.join(ROOT, 'dist-modules');

// Get all module IDs (directories under src/modules/ that have a manifest.jsx)
function discoverModules() {
  return fs.readdirSync(MODULES_DIR).filter(dir => {
    const manifestPath = path.join(MODULES_DIR, dir, 'manifest.jsx');
    const constantsPath = path.join(MODULES_DIR, dir, 'constants.json');
    return fs.existsSync(manifestPath) && fs.existsSync(constantsPath);
  });
}

// Get non-core modules by reading their constants.json
function getNonCoreModules() {
  return discoverModules().filter(moduleId => {
    const constants = JSON.parse(fs.readFileSync(path.join(MODULES_DIR, moduleId, 'constants.json'), 'utf8'));
    return !constants.isCore;
  });
}

// Build a single module
function buildModule(moduleId) {
  const modulePath = path.join(MODULES_DIR, moduleId);
  if (!fs.existsSync(path.join(modulePath, 'manifest.jsx'))) {
    console.error(`Module '${moduleId}' not found at ${modulePath}`);
    process.exit(1);
  }

  console.log(`\n🔨 Building module: ${moduleId}`);
  console.log(`   Source: src/modules/${moduleId}/`);
  console.log(`   Output: dist-modules/${moduleId}/\n`);

  // Run Vite build with module-specific config
  execSync(`npx vite build -c vite.module.config.js`, {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, MODULE_ID: moduleId },
  });

  // Copy constants.json to output for metadata discovery by the scanner API
  const constantsSrc = path.join(modulePath, 'constants.json');
  const constantsDest = path.join(OUTPUT_DIR, moduleId, 'constants.json');
  fs.copyFileSync(constantsSrc, constantsDest);

  // Copy uiText.json if it exists (for module metadata)
  const uiTextSrc = path.join(modulePath, 'uiText.json');
  const uiTextDest = path.join(OUTPUT_DIR, moduleId, 'uiText.json');
  if (fs.existsSync(uiTextSrc)) {
    fs.copyFileSync(uiTextSrc, uiTextDest);
  }

  console.log(`\n✅ Module '${moduleId}' built successfully → dist-modules/${moduleId}/`);
}

// Main
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node scripts/build-module.js <moduleId>');
  console.log('       node scripts/build-module.js --all');
  console.log('\nAvailable modules:');
  discoverModules().forEach(m => {
    const constants = JSON.parse(fs.readFileSync(path.join(MODULES_DIR, m, 'constants.json'), 'utf8'));
    console.log(`  ${m} ${constants.isCore ? '(core)' : '(add-on)'}`);
  });
  process.exit(0);
}

if (args[0] === '--all') {
  const modules = getNonCoreModules();
  console.log(`Building ${modules.length} non-core modules: ${modules.join(', ')}`);
  modules.forEach(buildModule);
  console.log(`\n🎉 All ${modules.length} modules built successfully!`);
} else {
  buildModule(args[0]);
}
