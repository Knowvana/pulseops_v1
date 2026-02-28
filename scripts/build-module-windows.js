#!/usr/bin/env node
// ============================================================================
// Windows-Compatible Build Module Script — PulseOps V1
//
// PURPOSE: Builds a single module as a standalone ES module bundle for
// hot-drop deployment. This version is optimized for Windows environments.
//
// USAGE:
//   node scripts/build-module-windows.js <moduleId>
//   node scripts/build-module-windows.js demo
// ============================================================================
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Windows-compatible path handling
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const MODULES_DIR = path.join(ROOT, 'src', 'modules');
const OUTPUT_DIR = path.join(ROOT, 'dist-modules');

console.log('🚀 PulseOps Module Builder (Windows Edition)');
console.log(`   Working directory: ${ROOT}`);
console.log(`   Modules directory: ${MODULES_DIR}`);
console.log(`   Output directory: ${OUTPUT_DIR}`);

// Get all module IDs (directories under src/modules/ that have a manifest.jsx)
function discoverModules() {
  try {
    return fs.readdirSync(MODULES_DIR).filter(dir => {
      const manifestPath = path.join(MODULES_DIR, dir, 'manifest.jsx');
      const constantsPath = path.join(MODULES_DIR, dir, 'constants.json');
      return fs.existsSync(manifestPath) && fs.existsSync(constantsPath);
    });
  } catch (err) {
    console.error(`❌ Failed to read modules directory: ${MODULES_DIR}`);
    console.error(`   Error: ${err.message}`);
    return [];
  }
}

// Get non-core modules by reading their constants.json
function getNonCoreModules() {
  return discoverModules().filter(moduleId => {
    try {
      const constants = JSON.parse(fs.readFileSync(path.join(MODULES_DIR, moduleId, 'constants.json'), 'utf8'));
      return !constants.isCore;
    } catch (err) {
      console.warn(`⚠️  Could not read constants for module '${moduleId}': ${err.message}`);
      return false;
    }
  });
}

// Build a single module
function buildModule(moduleId) {
  console.log(`\n🔨 Building module: ${moduleId}`);
  
  const modulePath = path.join(MODULES_DIR, moduleId);
  const manifestPath = path.join(modulePath, 'manifest.jsx');
  const constantsPath = path.join(modulePath, 'constants.json');
  
  console.log(`   Source: src/modules/${moduleId}/`);
  console.log(`   Manifest: ${manifestPath}`);
  console.log(`   Constants: ${constantsPath}`);
  console.log(`   Output: dist-modules/${moduleId}/`);
  
  // Verify module exists
  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ Module '${moduleId}' not found at ${modulePath}`);
    console.error(`   Expected manifest at: ${manifestPath}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(constantsPath)) {
    console.error(`❌ Constants file not found at: ${constantsPath}`);
    process.exit(1);
  }

  // Create output directory
  const outputModuleDir = path.join(OUTPUT_DIR, moduleId);
  if (!fs.existsSync(outputModuleDir)) {
    fs.mkdirSync(outputModuleDir, { recursive: true });
  }

  try {
    // Run Vite build with module-specific config
    console.log('   Running Vite build...');
    execSync(`npx vite build -c vite.module.config.js`, {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, MODULE_ID: moduleId },
    });

    // Copy constants.json to output for metadata discovery
    console.log('   Copying constants.json...');
    fs.copyFileSync(constantsPath, path.join(outputModuleDir, 'constants.json'));

    // Copy uiText.json if it exists
    const uiTextSrc = path.join(modulePath, 'uiText.json');
    const uiTextDest = path.join(outputModuleDir, 'uiText.json');
    if (fs.existsSync(uiTextSrc)) {
      console.log('   Copying uiText.json...');
      fs.copyFileSync(uiTextSrc, uiTextDest);
    }

    console.log(`\n✅ Module '${moduleId}' built successfully!`);
    console.log(`   Output: dist-modules/${moduleId}/`);
    console.log(`   Files: ${fs.readdirSync(outputModuleDir).join(', ')}`);

  } catch (err) {
    console.error(`❌ Failed to build module '${moduleId}': ${err.message}`);
    process.exit(1);
  }
}

// Main
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('\n📋 Available modules:');
  const modules = discoverModules();
  if (modules.length === 0) {
    console.log('   No modules found. Check that src/modules/ directory exists and contains modules.');
  } else {
    modules.forEach(m => {
      try {
        const constants = JSON.parse(fs.readFileSync(path.join(MODULES_DIR, m, 'constants.json'), 'utf8'));
        console.log(`   ${m} ${constants.isCore ? '(core)' : '(add-on)'}`);
      } catch {
        console.log(`   ${m} (unknown)`);
      }
    });
  }
  console.log('\nUsage: node scripts/build-module-windows.js <moduleId>');
  console.log('       node scripts/build-module-windows.js --all');
  process.exit(0);
}

if (args[0] === '--all') {
  const modules = getNonCoreModules();
  console.log(`\n🏗️  Building ${modules.length} non-core modules: ${modules.join(', ')}`);
  modules.forEach(buildModule);
  console.log(`\n🎉 All ${modules.length} modules built successfully!`);
} else {
  buildModule(args[0]);
}
