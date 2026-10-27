import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * dyad/beta: L3 (coquille `apps/web-app`).
 *
 * Même stratégie de résolution que `apps/mobile` (R1, AI_RULES §5) : les
 * paquets `@aurora/*` résolvent vers la SOURCE TS (chaque package.json
 * `exports` → `src/index.ts`). Vite suit les symlinks pnpm, donc l'app
 * bundle le monorepo directement — pas de pré-build tsc.
 *
 * L'alias `^src/` route les imports internes de `packages/ui`
 * (`import { cn } from "src/lib/utils"`, résolus par son tsconfig `paths`)
 * vers `packages/ui/src/...` : sans lui, le build échoue en TS2307 sur les
 * imports `src/...` du design system.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const pkgSrc = (name: string) => path.resolve(here, `../../packages/${name}/src`);

export default defineConfig({
  root: here,
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@aurora/web-app', replacement: path.resolve(here, 'src') },
      { find: '@aurora/domain', replacement: pkgSrc('domain') },
      { find: '@aurora/data', replacement: pkgSrc('data') },
      { find: '@aurora/ui', replacement: pkgSrc('ui') },
      { find: /^src\//, replacement: pkgSrc('ui') + '/' },
    ],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    host: '0.0.0.0',
  },
});
