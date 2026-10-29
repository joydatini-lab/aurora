import { expect, test } from '@playwright/test';

/**
 * Parcours 1 — le démarrage.
 *
 * L'écran blanc du 2026-10-28 ne doit plus pouvoir se produire sans le dire.
 * Ce test vérifie les deux faces de la garantie :
 *   - l'application SE MONTE (marqueur `data-aurora-app`) ;
 *   - le filet de diagnostic n'est PAS affiché (aucun `#aurora-fatal`).
 */

test('l’application se monte et remplace l’amorce HTML', async ({ page }) => {
  await page.goto('/');

  // Le marqueur applicatif est posé par <App />, pas par React lui-même :
  // il atteste qu'un arbre est réellement rendu.
  await expect(page.locator('[data-aurora-app]')).toBeVisible();

  // L'amorce statique de index.html a été remplacée par le rendu.
  await expect(page.locator('#aurora-boot')).toHaveCount(0);

  // Aucun panneau de diagnostic : une erreur d'amorçage serait visible ici.
  await expect(page.locator('#aurora-fatal')).toHaveCount(0);

  await expect(page).toHaveTitle(/Aurora/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Aurora');
});

test('aucune erreur de script pendant le chargement initial', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto('/');
  await expect(page.locator('[data-aurora-app]')).toBeVisible();

  // Un laissez-passer au cas où une extension de navigateur pollue la console
  // en CI : on n'ignore QUE des messages hors de notre code.
  const ours = errors.filter((e) => !/favicon|Download the React DevTools/i.test(e));
  expect(ours).toEqual([]);
});
