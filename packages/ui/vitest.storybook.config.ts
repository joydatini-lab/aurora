/**
 * @aurora/ui — vitest config pour Storybook Test (addon-vitest).
 *
 * Projet `storybook` : exécute les play functions des stories dans
 * Playwright (Chromium headless), via le preview de Storybook.
 *
 * Séparé de `vitest.config.ts` (les tests jsdom unitaires du
 * package) pour éviter le conflit de `test` property (pitfall
 * documenté par Storybook : déplacer le `test` hors du config Vite
 * principal).
 */
import { defineConfig } from "vitest/config";
import path from "node:path";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";

export default defineConfig({
  resolve: {
    alias: {
      src: path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    storybookTest({
      configDir: path.join(__dirname, ".storybook"),
      storybookScript: "pnpm storybook --no-open",
      // Les stories test-only sont taguées `!dev` `!autodocs` et restent
      // incluses par défaut. On n'exécute que celles taguées `test`.
      testStoryName: "**--*",
    }),
  ],
  test: {
    name: "storybook",
    browser: {
      enabled: true,
      provider: "playwright",
      headless: true,
      instances: [{ browser: "chromium" }],
    },
    // Pas de test isolé par story (isolate: false) — évite les
    // "Cannot connect to the iframe" en CI (resource limits).
    isolate: false,
  },
});
