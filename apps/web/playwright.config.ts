import { defineConfig, devices } from '@playwright/test';

/**
 * E2E du design space.
 *
 * La suite tourne sur `vite preview`, donc sur le build RÉEL : c'est le seul
 * moyen d'attraper une classe Tailwind qui n'existe pas en production (le
 * dev-server la génère à la volée et pardonnerait l'erreur).
 *
 * Deux profils, parce que le shell a deux chemins de navigation distincts de
 * part et d'autre de 1024 px : rail latéral fixe sur desktop, panneau
 * escamotable sur mobile. Tester uniquement le desktop laisserait la moitié
 * des utilisateurs sans couverture.
 */
const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    // `--strictPort` : si le port est pris, on veut une erreur franche plutôt
    // qu'un test qui interroge silencieusement un autre serveur.
    command: `pnpm build && pnpm preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
