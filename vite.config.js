// ============================================================================
// Vite Configuration — PulseOps V1
//
// PURPOSE: Build tool configuration for the PulseOps V1 platform.
// Defines path aliases using @ notation so NO relative imports (../../)
// are needed anywhere in the codebase. All imports use clean aliases.
//
// ALIASES:
//   @shared    → src/shared/          (design system, services, config)
//   @core      → src/core/            (app bootstrap, shell, auth)
//   @modules   → src/modules/         (pluggable feature modules)
//
// HOW TO USE:
//   import { Button } from '@shared';
//   import AppShell from '@core/AppShell';
//   import { getAllManifests } from '@modules/moduleRegistry';
// ============================================================================
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

const urls = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'src/shared/config/urls.json'), 'utf8'));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@modules': path.resolve(__dirname, 'src/modules'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_SERVER_URL || urls.APIServerURL || 'http://localhost:4001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});
