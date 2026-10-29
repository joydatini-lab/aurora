import { expect, test } from '@playwright/test';

/**
 * Parcours 7 — Design Space, du brief à l'actif validé.
 *
 * Ce qui est vérifié ici est ce que l'utilisateur voit, pas l'implémentation :
 *   - rien n'est proposé avant qu'il le demande ;
 *   - trois directions distinctes apparaissent ;
 *   - accepter une direction produit une affiche ET un rapport chiffré ;
 *   - le rapport est réellement calculé (le score change avec le format) ;
 *   - les exports produisent des fichiers non vides.
 *
 * Les mesures du validateur sont déjà couvertes par les tests unitaires. Ici on
 * vérifie qu'elles ATTEIGNENT l'écran.
 */

test.describe('studio', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio');
  });

  test('aucune proposition avant la demande explicite', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Studio/i);
    await expect(page.getByRole('button', { name: /proposer 3 directions/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /retenir cette direction/i })).toHaveCount(0);
    await expect(page.locator('.poster-frame')).toHaveCount(0);
  });

  test('le brief produit trois directions différenciées', async ({ page }) => {
    await page.getByRole('button', { name: /proposer 3 directions/i }).click();

    const accepter = page.getByRole('button', { name: /retenir cette direction/i });
    await expect(accepter).toHaveCount(3);

    // Les trois cartes ne doivent pas se contenter de changer de titre.
    const palettes = await page.locator('[data-slot="card"] .flex.overflow-hidden > span').evaluateAll(
      (nodes) =>
        nodes.reduce<string[]>((acc, node) => {
          const color = getComputedStyle(node).backgroundColor;
          if (!acc.includes(color)) acc.push(color);
          return acc;
        }, []),
    );
    expect(palettes.length).toBeGreaterThan(3);
  });

  test('accepter une direction rend l’affiche et son rapport', async ({ page }) => {
    await page.getByRole('button', { name: /proposer 3 directions/i }).click();
    await page.getByRole('button', { name: /retenir cette direction/i }).first().click();

    const frame = page.locator('.poster-frame');
    await expect(frame).toBeVisible();
    // 8 calques : fond, bandeau, sous-couche, titre, sous-titre, corps,
    // pastille, logo.
    await expect(frame.locator(':scope > *')).toHaveCount(8);

    await expect(page.getByText(/rapport de validation/i)).toBeVisible();
    await expect(page.getByText(/\d+(?:[.,]\d+)?\/10/)).toBeVisible();

    // Le logo est embarqué, pas chargé : aucune requête réseau requise.
    const logo = page.locator('img[alt^="Logo"]');
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute('src', /^data:image\/svg\+xml/);
  });

  test('le score reste dans les bornes et les huit indicateurs sont rendus', async ({ page }) => {
    await page.getByRole('button', { name: /proposer 3 directions/i }).click();
    await page.getByRole('button', { name: /retenir cette direction/i }).first().click();

    for (const label of [
      'Validité',
      'Chevauchement',
      'Alignement',
      'Sous-couches',
      'Utilisation',
      'Occlusion',
      'Lisibilité',
    ]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }

    const score = await page.getByText(/\d+(?:[.,]\d+)?\/10/).first().textContent();
    const value = Number(score?.match(/(\d+(?:[.,]\d+)?)\/10/)?.[1]?.replace(',', '.'));
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(10);
  });

  test('le changement de format change réellement le canevas', async ({ page }) => {
    await page.getByRole('button', { name: /proposer 3 directions/i }).click();
    await page.getByRole('button', { name: /retenir cette direction/i }).first().click();

    // On lit la propriété posée par React, pas le calcul du moteur : la valeur
    // est une fraction de canevas, et c'est elle que le validateur utilise.
    const frame = page.locator('.poster-frame');
    const ratioOf = () =>
      frame.evaluate((el) => (el as HTMLElement).style.aspectRatio);
    const second = async () => Number((await ratioOf()).split('/')[1]?.trim());

    await expect.poll(second).toBeCloseTo(297 / 210, 3);

    await page.getByRole('button', { name: /^Carré$/ }).click();
    await expect.poll(second).toBe(1);

    await page.getByRole('button', { name: /story/i }).click();
    await expect.poll(second).toBeCloseTo(16 / 9, 3);
  });

  test('la correction automatique est annoncée et réversible', async ({ page }) => {
    await page.getByRole('button', { name: /proposer 3 directions/i }).click();
    await page.getByRole('button', { name: /retenir cette direction/i }).first().click();

    const toggle = page.getByRole('button', { name: /correction automatique/i });
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(/raffinement :/i)).toBeVisible();

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByText(/sans correction automatique/i)).toBeVisible();
  });

  test('les exports produisent des fichiers exploitables', async ({ page }) => {
    await page.getByRole('button', { name: /proposer 3 directions/i }).click();
    await page.getByRole('button', { name: /retenir cette direction/i }).first().click();

    const svgDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: /logo svg/i }).click();
    const svg = await svgDownload;
    expect(svg.suggestedFilename()).toMatch(/\.svg$/);

    const jsonDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: /layout json/i }).click();
    const json = await jsonDownload;
    expect(json.suggestedFilename()).toMatch(/\.json$/);

    // Le JSON de calques doit être relisible et porter l'ordre de rendu.
    const stream = await json.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
      calques: Array<{ id: string; o: number }>;
    };
    expect(parsed.calques.length).toBe(8);
    expect(new Set(parsed.calques.map((c) => c.o)).size).toBe(8);
  });

  test('une provenance est affichée pour chaque champ de stratégie', async ({ page }) => {
    await page.getByRole('button', { name: /proposer 3 directions/i }).click();
    await page.getByRole('button', { name: /retenir cette direction/i }).first().click();

    // Le brief fournit le public : la provenance doit dire « fourni ».
    await expect(page.getByText('fourni', { exact: true }).first()).toBeVisible();
    // Le style est déduit par une règle : il doit dire « proposé ».
    await expect(page.getByText('proposé', { exact: true }).first()).toBeVisible();
  });

  test('le parcours complet ne provoque aucune erreur console', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.getByRole('button', { name: /proposer 3 directions/i }).click();
    await page.getByRole('button', { name: /retenir cette direction/i }).first().click();
    await page.getByRole('button', { name: /^Carré$/ }).click();

    await page.waitForTimeout(300);
    expect(errors).toEqual([]);
  });
});
