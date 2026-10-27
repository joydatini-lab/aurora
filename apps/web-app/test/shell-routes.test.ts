/**
 * L3 — le contrat navigation ↔ routes.
 *
 * LE DÉFAUT QUE CE TEST FERME
 * Une entrée de navigation peut pointer vers une route qui n'existe pas : le
 * clic mène alors à une page vide, sans erreur. Le dépôt a déjà payé cette
 * classe de défaut (états vides fantômes). Ici les deux ensembles viennent du
 * MÊME module (`lib/navigation.ts`), et le routeur (`src/app.tsx`) itère
 * dessus — ce test vérifie que la déclaration reste celle de la référence
 * §4.2 (9 sections A→I) et que la forme de la navigation ne perd aucune entrée.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  NAV_SECTIONS,
  PRIMARY_TABS,
  sectionForPath,
} from '../src/lib/navigation.ts';

test('web-app: les 9 sections de la référence §4.2 sont déclarées, dans l’ordre A → I', () => {
  // Les 9 lettres de §4.2, dans l'ordre de la référence. Une section oubliée
  // ou réordonnée casse ce test — c'est la traçabilité spec → code.
  const refs = NAV_SECTIONS.filter((s) => s.ref).map((s) => s.ref);
  assert.deepEqual(refs, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']);
});

test('web-app: chaque section a un chemin et un libellé non vides', () => {
  for (const section of NAV_SECTIONS) {
    assert.ok(section.path.startsWith('/'), `${section.id}: chemin absolu attendu`);
    assert.ok(section.label.trim().length > 0, `${section.id}: libellé vide`);
    assert.ok(section.id.length > 0, 'id vide');
  }
});

test('web-app: les identifiants de section sont uniques', () => {
  const ids = NAV_SECTIONS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, `ids dupliqués: ${ids.join(',')}`);
});

test('web-app: la tab bar basse porte exactement 5 onglets (§3.1)', () => {
  // La référence §3.3 et le schéma §3.1 en veulent 5. Le shell retombe sur
  // cette liste sous `md` : si elle dérive, la tab bar change de sens.
  assert.equal(PRIMARY_TABS.length, 5);
  const ids = PRIMARY_TABS.map((s) => s.id);
  assert.deepEqual(ids, ['accueil', 'apprendre', 'organiser', 'connaissances', 'agent']);
});

test('web-app: la section active se résout par le préfixe le plus long', () => {
  // `/tasks/42` doit rester dans « S'organiser » : sinon le détail d'une entité
  // désactive la navigation, et l'utilisateur perd son repère.
  assert.equal(sectionForPath('/home')?.id, 'accueil');
  assert.equal(sectionForPath('/tasks')?.id, 'organiser');
  assert.equal(sectionForPath('/tasks/42')?.id, 'organiser');
  assert.equal(sectionForPath('/agent')?.id, 'agent');
  assert.equal(sectionForPath('/agent/conversations')?.id, 'agent');
  assert.equal(sectionForPath('/knowledge/node-7')?.id, 'connaissances');
  assert.equal(sectionForPath('/inconnu'), undefined);
});

test('web-app: chaque chemin de navigation a une route dans le routeur', () => {
  // Le routeur (`src/app.tsx`) génère une `<Route>` par section, avec le motif
  // `${path}/*`. On relit la source pour vérifier que la génération est bien
  // pilotée par NAV_SECTIONS — si quelqu'un remplace la boucle par une liste
  // écrite à la main, ce test échoue avant que le lien mort n'existe.
  const routerSource = readFileSync(
    new URL('../src/app.tsx', import.meta.url),
    'utf8',
  );
  assert.ok(
    routerSource.includes('NAV_SECTIONS.map'),
    'le routeur doit générer ses routes depuis NAV_SECTIONS',
  );
  assert.ok(
    routerSource.includes('path={`${section.path}/*`}'),
    'le motif de route doit être `${section.path}/*`',
  );
  // Et chaque chemin déclaré doit être couvert par ce motif.
  for (const section of NAV_SECTIONS) {
    assert.ok(
      section.path.startsWith('/'),
      `${section.id}: le motif de route exige un chemin absolu`,
    );
  }
});
