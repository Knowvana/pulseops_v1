// ============================================================================
// Vite Module Build Configuration — PulseOps V1
//
// PURPOSE: Builds individual modules as standalone ES module bundles for
// hot-drop deployment. Each module is compiled into a single JS file that
// can be dropped into the server's modules/ folder and loaded at runtime.
//
// HOW IT WORKS:
//   1. Module source lives in src/modules/<moduleId>/
//   2. This config builds manifest.jsx → dist-modules/<moduleId>/manifest.js
//   3. React, ReactDOM, lucide-react are externalized (use host app's copies)
//   4. The built bundle exports the manifest object as default export
//
// USAGE:
//   node scripts/build-module.js auth
//   node scripts/build-module.js logging
//   node scripts/build-module.js demo
//
// OUTPUT:
//   dist-modules/<moduleId>/
//     ├── manifest.js        (ES module bundle)
//     └── constants.json     (copied for metadata discovery)
// ============================================================================
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const moduleId = process.env.MODULE_ID;
if (!moduleId) {
  throw new Error('MODULE_ID environment variable is required. Usage: MODULE_ID=auth vite build -c vite.module.config.js');
}

const __dirname = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@modules': path.resolve(__dirname, 'src/modules'),
    },
  },
  build: {
    outDir: `dist-modules/${moduleId}`,
    emptyOutDir: true,
    sourcemap: false,
    lib: {
      entry: path.resolve(__dirname, `src/modules/${moduleId}/manifest.jsx`),
      formats: ['es'],
      fileName: () => 'manifest.js',
    },
    rollupOptions: {
      // Externalize host app dependencies — modules use the host's copies
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'lucide-react',
        /^@shared/,
        /^@modules\/(?!${moduleId})/,
        /^@core/,
      ],
      output: {
        // Preserve external imports as-is for runtime resolution
        paths: {
          'react': '/vendor/react.js',
          'react-dom': '/vendor/react-dom.js',
          'react/jsx-runtime': '/vendor/react-jsx-runtime.js',
          'lucide-react': '/vendor/lucide-react.js',
        },
      },
    },
  },
  // CSS is inlined into the JS bundle for simplicity
  css: {
    modules: false,
  },
});
