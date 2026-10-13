// vite.config.ts — desktop renderer build (spike Phase 0, voie A).
//
// R1 (même que apps/mobile) : les `@aurora/*` workspace s'exposent via
// `src/index.ts` (exports), donc l'alias les route vers la SOURCE
// (Vite/esbuild transpile les `.ts`, zéro pré-build tsc).
//
// `optimizeDeps.exclude` (même que apps/mobile) : le sync engine
// PowerSync (`@powersync/web`) spawn un Web Worker (`lib/worker/client.js`)
// — si le dep-optimizer l'inline, le worker disparaît du bundle et la base
// se casse. On le sert nativement (non optimisé) pour que `new URL(...)`
// du worker résolve.
//
// `build.rollupOptions.output.format` = ESM : le worker PowerSync fait du
// code-splitting (2 chunks). L'`iife` (défaut Vite pour un build HTML
// single-file) est incompatible → on émet du ESM multi-fichiers.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgSrc = (name: string) => path.resolve(here, `../../packages/${name}/src`);

export default defineConfig({
  root: here,
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@aurora/data', replacement: pkgSrc('data') },
      { find: '@aurora/domain', replacement: pkgSrc('domain') },
    ],
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  server: { port: 5199, strictPort: true },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        format: 'es',
        // Un chunk par feature (le worker + l'app) : le code-splitting que
        // `@powersync/web` exige.
        manualChunks: undefined,
      },
    },
  },
  optimizeDeps: {
    // Même qu'apps/mobile : le sync engine + sa famille restent hors
    // dep-optimizer (le Web Worker doit résoudre nativement).
    exclude: ['@powersync/web', '@powersync/capacitor', '@powersync/common', '@powersync/shared-internals'],
  },
});
