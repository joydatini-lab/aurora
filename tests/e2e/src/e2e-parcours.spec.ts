/**
 * e2e-parcours.spec.ts — M-75 (S7, finitions) : les parcours E2E du lot
 * « Veille + Chat agentique » (A–D + Miroir + Focus).
 *
 * Le pattern suit `e2e-device.spec.ts` (S1..S20, OQ-08) : les specs de
 * Playwright sur l'app mobile Capacitor servie en `baseURL`
 * (http://localhost:5173, `playwright.config.ts`). Le S7 exige 6
 * parcours de bout-en-bout sur le lot :
 *
 *   A — Créer une veille par le chat (verb `veille_create`, le créneau
 *       confirmé par le M-73, le run est produit).
 *   B — Créer une veille à la main (le form /discovery, le créneau est
 *       créé sans le chat).
 *   C — Lire + confirmer un créneau (le M-73 : le bloc « À confirmer »
 *       de la page Agent, Confirmer / Modifier / Refuser).
 *   D — Supprimer une veille confirmée (le M-71 : le menu 3 pts de la
 *       carte `discovery`, le screen de confirmation destructive G3,
 *       la row + le vault archivé).
 *   E — Miroir : valider une preuve (le S6, M-63 : le `evidence_create`
 *       de Progress, l'agent ne le fait PAS, F-07).
 *   F — Focus : lancer un profil (le S5, M-52 : le bouton « Lancer » de
 *       la carte, la session démarre en mode pomodoro).
 *
 * Le spec EST un contrat : chaque `test` = un parcours ; les locators
 * sont les `data-test` SSoT de la repo (`agent-composer`,
 * `confirmation-cta`, `offline-badge` de `e2e-device.spec.ts`, +
 * `data-ux="offline"` du M-74) ; le `@aurora/workflows` SSoT n'a PAS
 * de contrats A–D encore (l'OQ-08 est DESIGNED_NOT_IMPLEMENTED — le
 * runner `runAllScenarios` existe, le device Playwright n'a JAMAIS
 * été provisionné). Ce spec EST le device Playwright du lot S7.
 *
 * Statut : le spec est le contrat (le test S7 M-75 du plan §"M-75 E2E
 * + RLS" ; l'OQ-08 reste le tooling global). L'exécution réelle sur
 * un device (l'émulateur Android, le webview Capacitor) passe au
 * checkpoint lead (le subagent ne déploie JAMAIS le relay PROD, ni
 * le device lab). Le RLS live (user A ne lit PAS user B) est un
 * gate SQL (`execute_sql` du MCP `supabase-aurora`, `SET ROLE
 * authenticated` + claims) et PAS un Playwright test.
 */
import { test, expect } from '@playwright/test';

// ——— Les locators SSoT du lot (les `data-test` de la repo) ———
// L'Agent composer (le NL input du S12 kernel command bus).
const AGENT_INPUT = '[data-test="agent-composer"]';
// Le CTA de confirmation du bloc M-73 (Confirmer / Modifier / Refuser).
const CONFIRM_BTN = '[data-test="confirmation-cta"]';
// Le bloc « À confirmer » du M-73 (la carte + le `data-confirmation`).
const CONFIRM_CARD = '[data-confirmation]';
// Le `data-ux` de l'offline (le M-74, le 5ᵉ état UX du plan §16).
const UX_OFFLINE = '[data-ux="offline"]';
// Le menu 3 pts de la carte discovery (le M-71, le delete destructive).
const DISCOVERY_CARD = '[data-purpose="discovery-card"]';
const DISCOVERY_CARD_DELETE = '[data-purpose="discovery-card-delete"]';
// Le créneau / form de création manuelle (le B, `/discovery` form).
const DISCOVERY_FORM = '[data-purpose="discovery-creation-form"]';
// Le minuteur Focus v2 (le S5 M-53, l'anneau / le chrono).
const FOCUS_TIMER = '[data-purpose="focus-timer"]';
// Le bloc Miroir (le S6, la détection typée + provenance).
const MIRROR_BLOCK = '[data-purpose="mirror-detection"]';
const MIRROR_VALIDATED = '[data-purpose="mirror-evidence-validated"]';

// ——— A : créer par le chat ————————————————————————————————————————————————

test('M-75 parcours A — créer une veille par le chat (le run est produit)', async ({ page }) => {
  await page.goto('/agent');
  const composer = page.locator(AGENT_INPUT);
  // Le verb `veille_create` (le M-41 kernel writer, le SSoT du payload).
  await composer.fill('Crée une veille sur « structures de béton armé » chaque lundi.');
  await composer.press('Enter');

  // Le bloc « À confirmer » s'affiche (le M-73) : le créneau est proposé.
  const card = page.locator(CONFIRM_CARD).first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  // Confirmer (le M-73 wiring, le SSoT `confirmations-wiring.ts`).
  await page.locator(CONFIRM_BTN).first().click();

  // Le run est produit : la carte de la veille existe dans /discovery.
  await page.goto('/discovery');
  const runCard = page.locator(DISCOVERY_CARD).first();
  await expect(runCard).toBeVisible({ timeout: 15_000 });
});

// ——— B : créer à la main (le form, pas le chat) ————————————————————————

test('M-75 parcours B — créer une veille à la main (le form, pas le chat)', async ({ page }) => {
  await page.goto('/discovery');
  // Le form de création (le M-45, `/discovery` « + Nouvelle veille »).
  const form = page.locator(DISCOVERY_FORM);
  await expect(form).toBeVisible();
  // Le topic (l'input du form, le SSoT du run `topic`).
  const topic = form.locator('input').first();
  await topic.fill('Veille structures');
  await form.locator('button[type="submit"]').click();

  // La carte est créée (le run est produit par le form, PAS le chat).
  const runCard = page.locator(DISCOVERY_CARD).first();
  await expect(runCard).toBeVisible({ timeout: 15_000 });
});

// ——— C : lire + confirmer un créneau (le M-73) ———————————————————————

test('M-75 parcours C — lire + confirmer un créneau (M-73, le bloc À confirmer)', async ({ page }) => {
  await page.goto('/agent');
  // Un run qui propose un créneau de révision (le `calendar.schedule`).
  const composer = page.locator(AGENT_INPUT);
  await composer.fill('Révise mes structures de béton demain matin.');
  await composer.press('Enter');

  // Le bloc « À confirmer » (le SSoT `confirmationMessage` de la row).
  const card = page.locator(CONFIRM_CARD).first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  // Le tap « Confirmer » renvoie `decisions[{ stepId, answer:'confirmed', stepHash }]`
  // au kernel (le M-73 wiring, le SSoT `confirmations-wiring.ts`).
  const confirmBtn = card.locator('button', { hasText: /confirmer/i }).first();
  await expect(confirmBtn).toBeVisible();
  await confirmBtn.click();

  // Le run est relu avec le créneau confirmé (l'event est appliqué par le
  // module Productivity, AD-7 : l'app ne crée JAMAIS l'event elle-même).
  const confirmed = page.getByText(/confirm/i).first();
  await expect(confirmed).toBeVisible({ timeout: 10_000 });
});

// ——— D : supprimer confirmée (le M-71 G3 destructive) —————————————————

test('M-75 parcours D — supprimer une veille confirmée (M-71, G3 destructive)', async ({ page }) => {
  await page.goto('/discovery');
  // La carte existe (un run produit par le A ou le B, l'ordre du lot).
  const card = page.locator(DISCOVERY_CARD).first();
  await expect(card).toBeVisible({ timeout: 10_000 });

  // Le menu 3 pts (le M-46 : l'en-tête coloré porte le menu).
  const del = card.locator(DISCOVERY_CARD_DELETE);
  await del.click();

  // Le screen de confirmation destructive (le M-71 : l'écran ajouté au
  // menu 3 pts, le gel G2 — le vault est ARCHIVÉ après confirmation).
  const confirm = page.locator('button', { hasText: /supprimer|confirmer/i }).last();
  await expect(confirm).toBeVisible({ timeout: 5_000 });
  await confirm.click();

  // La row disparaît (le `delete_automation` est appliqué par le kernel,
  // l'app est en lecture après le tap).
  await expect(card).toHaveCount(0, { timeout: 15_000 });
});

// ——— E : Miroir — valider une preuve (le S6 M-63, F-07) —————————————————

test('M-75 parcours E — Miroir : valider une preuve (M-63, F-07 Progress)', async ({ page }) => {
  await page.goto('/agent');
  // Le bloc Miroir s'affiche après un run de détection (le S6, le job
  // `mirror-analysis`).
  const block = page.locator(MIRROR_BLOCK).first();
  await expect(block).toBeVisible({ timeout: 15_000 });

  // Le tap « Valider » crée une preuve via Progress (le F-07 : PAS
  // l'agent qui crée, mais le module Progress qui commite).
  const validate = block.locator('button', { hasText: /valider/i }).first();
  await expect(validate).toBeVisible();
  await validate.click();

  // La preuve est validée (le `progress.evidence_create`, le flag
  // d'origine AD-11 est conservé).
  const proof = page.locator(MIRROR_VALIDATED).first();
  await expect(proof).toBeVisible({ timeout: 10_000 });
});

// ——— F : Focus — lancer un profil (le S5 M-52) ————————————————————————

test('M-75 parcours F — Focus : lancer un profil (M-52, la session démarre)', async ({ page }) => {
  await page.goto('/focus');
  // La carte du profil (le SSoT `displayOnFocusPage = true`, le 0027).
  const card = page.locator('[data-purpose="profile-card"]').first();
  await expect(card).toBeVisible({ timeout: 10_000 });

  // Le bouton « Lancer » (le M-51 wiring, le `launchProfile`).
  const launch = card.locator('button', { hasText: /lancer/i }).first();
  await launch.click();

  // Le minuteur démarre (le M-53 : l'anneau Pomodoro ou le chrono).
  const timer = page.locator(FOCUS_TIMER);
  await expect(timer).toBeVisible({ timeout: 10_000 });
});

// ——— Le 5ᵉ état UX (le M-74) sur chaque écran (le plan §16) —————————————

test('M-75 état offline (M-74) — le badge est affiché sur /focus (AD-7)', async ({
  page,
  context,
}) => {
  await context.setOffline(true);
  await page.goto('/focus');
  // Le bloc offline (le M-74 wiring, le SSoT `useOnlineStatus`).
  const offline = page.locator(UX_OFFLINE).first();
  await expect(offline).toBeVisible({ timeout: 10_000 });
  // L'attribute du root (le `data-offline="true"` du M-74).
  await expect(page.locator('[data-offline="true"]').first()).toBeVisible();
  await context.setOffline(false);
});
