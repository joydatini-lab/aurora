import { expect, test } from '@playwright/test';

/**
 * Parcours 3 — le thème.
 *
 * Un thème n'est correct que s'il est VRAIMENT appliqué. On vérifie donc le
 * `background-color` calculé, pas seulement la classe sur `<html>` : une
 * classe posée sans token derrière passerait un test naïf.
 *
 * Le shell monte deux bascules (barre mobile + rail desktop) ; `:visible`
 * sélectionne celle du chrome actif, quelle que soit la largeur.
 */

const toggleOf = (page: import('@playwright/test').Page) =>
  page.locator('[data-testid="theme-toggle"]:visible').first();

test('le thème suit la préférence système au premier chargement', async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: 'dark' });
  const page = await context.newPage();
  await page.goto('/');

  await expect(page.locator('html')).toHaveClass(/dark/);
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const [r, g, b] = bg.match(/\d+/g)!.map(Number);
  // Fond sombre ≈ oklch(0.17 …) : les trois canaux restent bas.
  expect(r).toBeLessThan(60);
  expect(g).toBeLessThan(60);
  expect(b).toBeLessThan(70);
  await context.close();
});

test('la bascule passe en clair et persiste après rechargement', async ({ page }) => {
  await page.goto('/');
  // État initial : le contexte Playwright est en clair, donc l'action proposée
  // est « passer en sombre ». On bascule deux fois pour revenir au clair.
  await toggleOf(page).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await toggleOf(page).click();

  await expect(page.locator('html')).toHaveClass(/light/);
  await expect(page.locator('html')).not.toHaveClass(/dark/);

  const bgLight = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const [r] = bgLight.match(/\d+/g)!.map(Number);
  expect(r).toBeGreaterThan(200); // papier chaud, quasi blanc

  await page.reload();
  await expect(page.locator('html')).toHaveClass(/light/);
});

test('le choix de l’utilisateur survit à un système en sombre', async ({ browser }) => {
  // L'erreur classique : écraser la préférence enregistrée par la préférence
  // système à chaque visite. Ici l'OS est sombre, l'utilisateur choisit clair.
  const context = await browser.newContext({ colorScheme: 'dark' });
  const page = await context.newPage();
  await page.goto('/');

  await expect(page.locator('html')).toHaveClass(/dark/);
  await toggleOf(page).click();
  await expect(page.locator('html')).toHaveClass(/light/);

  await page.reload();
  await expect(page.locator('html')).toHaveClass(/light/);
  await context.close();
});

test('la bascule expose un libellé accessible qui décrit l’action', async ({ page }) => {
  await page.goto('/');

  const toggle = toggleOf(page);
  const before = await toggle.getAttribute('aria-label');
  await toggle.click();
  const after = await toggle.getAttribute('aria-label');

  expect(before).toBeTruthy();
  expect(after).not.toBe(before);
  // Le libellé décrit ce qui VA se passer, pas l'état courant : un bouton qui
  // annonce l'état se lit comme une erreur par un lecteur d'écran.
  expect(after).toMatch(/passer en thème/i);
});
