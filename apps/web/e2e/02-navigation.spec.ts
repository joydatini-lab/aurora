import { expect, test } from '@playwright/test';

/**
 * Parcours 2 — la navigation.
 *
 * Trois propriétés :
 *   - chaque section du rail mène à un titre h1 distinct ;
 *   - le lien actif est marqué (`aria-current="page"`) ;
 *   - une URL profonde survit à un rechargement (fallback SPA du serveur).
 */

const SECTIONS = [
  { path: '/couleurs', link: 'Couleurs', heading: /^Couleurs$/i },
  { path: '/typographie', link: 'Typographie', heading: /^Typographie$/i },
  { path: '/espacement', link: 'Espacement & formes', heading: /Espacement/i },
  { path: '/mouvement', link: 'Mouvement', heading: /^Mouvement$/i },
  { path: '/composants', link: 'Galerie', heading: /^Galerie$/i },
];

test('chaque section est atteignable depuis le rail', async ({ page, isMobile }) => {
  await page.goto('/');

  for (const section of SECTIONS) {
    // Sur mobile, le rail est escamoté derrière un bouton : on l'ouvre à
    // chaque itération plutôt que de simuler un viewport desktop.
    if (isMobile) {
      await page.getByRole('button', { name: /ouvrir la navigation/i }).click();
      await expect(page.getByRole('navigation', { name: /sections/i })).toBeVisible();
    }

    await page
      .getByRole('navigation', { name: /sections du design system/i })
      .getByRole('link', { name: section.link, exact: true })
      .first()
      .click();

    await expect(page).toHaveURL(new RegExp(`${section.path.replace('/', '\\/')}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(section.heading);

    if (isMobile) {
      // Le panneau doit se refermer après navigation, sinon le contenu reste
      // masqué derrière un menu ouvert.
      await expect(page.getByRole('navigation', { name: /sections/i })).toBeHidden();
    }
  }
});

test('le lien actif porte aria-current', async ({ page }) => {
  await page.goto('/couleurs');
  const active = page
    .getByRole('navigation', { name: /sections du design system/i })
    .locator('a[aria-current="page"]');

  await expect(active).toHaveCount(1);
  await expect(active).toHaveText(/Couleurs/);
});

test('une URL profonde survit au rechargement direct', async ({ page }) => {
  // Navigation serveur (pas cliente) : c'est le fallback SPA qui est testé.
  const response = await page.goto('/composants');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Galerie/i);
});

test('une route inconnue affiche la 404 applicative', async ({ page }) => {
  await page.goto('/cette-route-nexiste-pas');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/n'existe pas/i);
  // On ne renvoie pas l'utilisateur vers l'accueil en silence : il doit pouvoir
  // lire ce qui s'est passé et repartir d'un clic.
  await expect(page.getByRole('link', { name: /vue d'ensemble/i })).toBeVisible();
});
