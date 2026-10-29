import { expect, test } from '@playwright/test';

/**
 * Parcours 4 — accessibilité de base.
 *
 * Ce fichier ne remplace pas un audit (axe-core viendra plus tard) : il
 * verrouille les quatre propriétés qu'un design system ne peut pas perdre
 * sans que ça se voie — repères, titre unique, focus clavier, sémantique des
 * composants interactifs.
 */

test('la page expose les repères attendus et un seul h1', async ({ page }) => {
  await page.goto('/composants');

  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: /sections du design system/i })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
});

test('le lien d’évitement mène au contenu au clavier', async ({ page }) => {
  await page.goto('/');

  // Le lien est hors écran tant qu'il n'a pas le focus : c'est voulu, il ne
  // doit apparaître qu'au clavier.
  const skip = page.getByRole('link', { name: /aller au contenu/i });
  await expect(skip).toBeHidden();

  await page.keyboard.press('Tab');
  await expect(skip).toBeVisible();
  await expect(skip).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#contenu$/);
});

test('le focus clavier reste visible sur les boutons', async ({ page }) => {
  await page.goto('/composants');

  const button = page.getByRole('button', { name: 'Enregistrer' }).first();
  await button.focus();

  const outline = await button.evaluate((el) => {
    const s = getComputedStyle(el);
    return { width: s.outlineWidth, style: s.outlineStyle };
  });

  // `:focus-visible` pose un contour de 2 px : un focus supprimé rend le
  // parcours clavier impossible.
  expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(1);
  expect(outline.style).not.toBe('none');
});

test('les onglets se pilotent aux flèches, pas au Tab', async ({ page }) => {
  await page.goto('/composants');

  const summary = page.getByRole('tab', { name: 'Résumé' });
  await summary.focus();
  await expect(summary).toHaveAttribute('aria-selected', 'true');

  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Sources' })).toBeFocused();
  await expect(page.getByRole('tab', { name: 'Sources' })).toHaveAttribute('aria-selected', 'true');
});

test('chaque champ a une étiquette associée et les erreurs sont annoncées', async ({ page }) => {
  await page.goto('/composants');

  const email = page.getByLabel('Adresse e-mail');
  await expect(email).toBeVisible();
  await expect(email).toHaveAttribute('type', 'email');

  // L'erreur est reliée par aria-describedby, pas seulement colorée en rouge.
  const invalid = page.locator('#email-err');
  await expect(invalid).toHaveAttribute('aria-invalid', 'true');
  const describedBy = await invalid.getAttribute('aria-describedby');
  expect(describedBy).toBe('email-err-msg');
  await expect(page.locator('#email-err-msg')).toBeVisible();
});

test('les interrupteurs et cases exposent leur état', async ({ page }) => {
  await page.goto('/composants');

  const sync = page.getByRole('switch', { name: /synchronisation automatique/i });
  await expect(sync).toHaveAttribute('aria-checked', 'true');
  await sync.click();
  await expect(sync).toHaveAttribute('aria-checked', 'false');

  const archives = page.getByRole('checkbox', { name: /inclure les archives/i });
  await expect(archives).toHaveAttribute('aria-checked', 'true');
});
