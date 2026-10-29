import { expect, test } from '@playwright/test';

/**
 * Parcours 6 — personnalisation.
 *
 * On ne teste pas l'existence d'un sélecteur : on teste que le choix ATTEINT
 * les composants. La différence se voit le jour où un provider écrit bien sa
 * préférence mais n'applique rien — l'interface a l'air correcte et n'a rien
 * changé.
 */

const varOf = (page: import('@playwright/test').Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);

const presetCard = (page: import('@playwright/test').Page, name: string) =>
  page.getByRole('button', { name: new RegExp(name, 'i') }).first();

test('un preset change réellement la couleur des composants', async ({ page }) => {
  await page.goto('/apparence');

  const before = await varOf(page, '--primary');
  const button = page.getByRole('button', { name: /^Clair$/i });
  const buttonColorBefore = await button.evaluate((el) => getComputedStyle(el).backgroundColor);

  await presetCard(page, 'Cosmic Night').click();

  // La variable est écrite sur <html>…
  await expect(page.locator('html')).toHaveAttribute('data-preset', 'cosmic-night');
  const after = await varOf(page, '--primary');
  expect(after).not.toBe(before);

  // …et le rendu effectif d'un composant a bougé, pas seulement la variable.
  const buttonColorAfter = await button.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(buttonColorAfter).not.toBe(buttonColorBefore);
});

test('le choix de thème survit au rechargement', async ({ page }) => {
  await page.goto('/apparence');
  await presetCard(page, 'Catppuccin').click();
  await expect(page.locator('html')).toHaveAttribute('data-preset', 'catppuccin');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-preset', 'catppuccin');
  await expect(page.getByRole('button', { name: /Catppuccin/i }).first()).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('le mode sombre applique le jeu de couleurs sombre du preset', async ({ page }) => {
  await page.goto('/apparence');
  await presetCard(page, 'Catppuccin').click();
  const lightPrimary = await varOf(page, '--primary');

  await page.getByRole('button', { name: /^Sombre$/i }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);

  const darkPrimary = await varOf(page, '--primary');
  expect(darkPrimary).not.toBe(lightPrimary);
});

test('un dégradé devient le fond et fait passer les cartes en verre', async ({ page }) => {
  await page.goto('/apparence');

  await page.locator('button.bg-webgradient-plum-plate').click();
  await expect(page.locator('html')).toHaveAttribute('data-backdrop', 'gradient');

  const backdrop = page.locator('.aurora-backdrop');
  const image = await backdrop.evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(image).toContain('gradient');

  // La carte doit porter un fond translucide ET un flou d'arrière-plan.
  const card = page.locator('[data-slot="card"]').first();
  const { backgroundColor, backdropFilter } = await card.evaluate((el) => {
    const s = getComputedStyle(el);
    return { backgroundColor: s.backgroundColor, backdropFilter: s.backdropFilter };
  });
  expect(backgroundColor).toMatch(/rgba?\(|color\(|oklch/);
  expect(parseFloat(backgroundColor.match(/[\d.]+\)$/)?.[0] ?? '1')).toBeLessThan(1);
  expect(backdropFilter).toContain('blur');
});

test('le thème maison se restaure et efface les surcharges', async ({ page }) => {
  await page.goto('/apparence');
  await presetCard(page, 'Cosmic Night').click();
  await expect(page.locator('html')).toHaveAttribute('data-preset', 'cosmic-night');

  await presetCard(page, 'Encre & Lumière').click();
  await expect(page.locator('html')).not.toHaveAttribute('data-preset');
  const inline = await page.evaluate(() => document.documentElement.style.getPropertyValue('--primary'));
  expect(inline).toBe('');
});

test('chaque carte de preset annonce son contraste mesuré', async ({ page }) => {
  await page.goto('/apparence');

  // Le badge est soit « AA », soit un ratio chiffré : jamais une promesse
  // muette. On vérifie qu'il existe sur toutes les cartes de thème.
  const badges = page.locator('button[aria-pressed] span[title^="Contraste"]');
  await expect(badges.first()).toBeVisible();
  expect(await badges.count()).toBeGreaterThanOrEqual(11);
});
