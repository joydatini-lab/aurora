/**
 * L5 — le contrat du parcours vertical, testé SANS DOM ni réseau.
 *
 * CE QUI EST PROUVÉ ICI, ET CE QUI NE PEUT PAS L'ÊTRE
 * Ce test prouve la partie que l'on peut prouver hors ligne : l'adaptateur
 * module → kernel (`op`, `id`, `userId`, `patch`) et la table de décision des
 * 5 états UX. Il NE prouve PAS le round-trip serveur (critère L5 #2) ni le RLS
 * positif (critère #3) : ces deux-là exigent une base vivante et sont
 * documentés comme tels dans le rapport.
 *
 * POURQUOI L'ADAPTATEUR EST TESTÉ SI SÉRIEUSEMENT
 * C'est le seul endroit qui connaît les trois écarts module↔kernel
 * (`op`, `userId` au niveau enveloppe, `title`/`subject`). Une erreur ici
 * écrit une colonne fantôme — le défaut exact que
 * `packages/data/test/mirror-column-alias.test.ts` vient de fermer côté data.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCaptureCommand,
  toDomainCommand,
  toTaskList,
  resolveCaptureUxState,
} from '../src/lib/capture.ts';
import { mapTaskRow } from '../src/lib/data-session.ts';

/** `DomainCommand` est une union (une variante `*DeleteCommand` n'a pas de
 *  `patch`) : on extrait le patch de façon typée plutôt que de caster à
 *  l'aveugle. */
function patchOf(cmd: unknown): Record<string, unknown> {
  if (typeof cmd === 'object' && cmd !== null && 'patch' in cmd) {
    const p = (cmd as { patch?: unknown }).patch;
    if (p !== null && typeof p === 'object') return p as Record<string, unknown>;
  }
  return {};
}
import { captureTask } from '@aurora/productivity';
import type { Task } from '@aurora/domain';

const ctx = { userId: 'user-a', clientId: 'client-1', now: 1_700_000_000_000 };

test('L5: la commande de capture porte le `op` que le kernel exige', () => {
  const cmd = buildCaptureCommand('Réviser les dérivées', ctx, 'task-1');
  assert.equal(cmd.op, 'task.create');
  assert.equal(cmd.id, 'task-1');
  assert.equal(cmd.userId, 'user-a');
});

test('L5: le titre part dans `subject` (nom de colonne), pas dans `title`', () => {
  const cmd = buildCaptureCommand('Réviser les dérivées', ctx, 'task-1');
  const patch = patchOf(cmd);
  assert.equal(patch.subject, 'Réviser les dérivées');
  assert.equal(patch.title, undefined, 'pas de colonne fantôme `title`');
});

test('L5: `id` et `user_id` ne sont pas dupliqués dans le patch (enveloppe)', () => {
  const cmd = buildCaptureCommand('Tâche', ctx, 'task-9');
  const patch = patchOf(cmd);
  assert.equal(patch.id, undefined);
  assert.equal(patch.user_id, undefined);
});

test('L5: la capture vide est refusée par le MODULE, pas par l’écran', () => {
  assert.throws(
    () => buildCaptureCommand('   ', ctx, 'task-1'),
    /capture_empty/,
    'la règle vit dans productivity/inbox.ts — on ne la duplique pas',
  );
});

test('L5: l’adaptateur refuse une table qui n’appartient pas au module (AD-15)', () => {
  const foreign = captureTask('x', ctx, 'task-1');
  const tampered = { ...foreign, table: 'notes' as typeof foreign.table };
  assert.throws(
    () => toDomainCommand(tampered, ctx),
    /AD-15/,
    'une commande vers une table non possédée est un constat bloquant',
  );
});

test('L5: les 5 états UX se résolvent dans l’ordre de précédence', () => {
  // chargement
  assert.equal(
    resolveCaptureUxState({ booting: true, failed: false, noSession: false, taskCount: 0 }),
    'loading',
  );
  // vide (miroir prêt, zéro ligne, session active)
  assert.equal(
    resolveCaptureUxState({ booting: false, failed: false, noSession: false, taskCount: 0 }),
    'empty',
  );
  // partiel (des lignes, mais pas la totalité synchronisée)
  assert.equal(
    resolveCaptureUxState({ booting: false, failed: false, noSession: false, taskCount: 3 }),
    'partial',
  );
  // hors-ligne : le miroir répond, la synchro manque → PAS une erreur
  assert.equal(
    resolveCaptureUxState({ booting: false, failed: false, noSession: true, taskCount: 3 }),
    'offline',
  );
  // erreur l'emporte sur tout le reste
  assert.equal(
    resolveCaptureUxState({ booting: false, failed: true, noSession: true, taskCount: 3 }),
    'error',
  );
});

test('L5: hors-ligne prime sur vide (la capture reste possible sans session)', () => {
  assert.equal(
    resolveCaptureUxState({ booting: false, failed: false, noSession: true, taskCount: 0 }),
    'offline',
    'sans session on annonce « hors ligne », pas « aucune tâche » : sinon ' +
      'l’utilisateur croit à tort que sa capture n’a rien produit',
  );
});

test('L5: la liste trie les tâches ouvertes avant les terminées', () => {
  const mk = (id: string, status: Task['status'], createdAt: string): Task => ({
    id,
    userId: 'user-a',
    title: id,
    status,
    tags: [],
    dependencies: [],
    evidenceRefs: [],
    createdAt,
    updatedAt: createdAt,
  });
  const rows = [
    mk('done-1', 'done', '2026-01-02T00:00:00Z'),
    mk('open-old', 'todo', '2026-01-01T00:00:00Z'),
    mk('open-new', 'todo', '2026-01-03T00:00:00Z'),
  ];
  const sorted = toTaskList(rows).map((t) => t.id);
  assert.deepEqual(sorted, ['open-new', 'open-old', 'done-1']);
});

// ---------------------------------------------------------------------------
// L5 — RÉGRESSION : le titre vient de la colonne miroir `subject`
// ---------------------------------------------------------------------------

test('L5: mapTaskRow lit le titre dans la colonne miroir subject (dérive AD-15)', () => {
  // La ligne telle qu'elle sort du miroir PowerSync : snake_case, titre dans
  // `subject` (l'entité `Task` l'appelle `title`).
  const row = {
    id: 'task-1',
    user_id: 'user-a',
    subject: 'Réviser les dérivées',
    status: 'todo',
    created_at: '2026-01-01T00:00:00Z',
  };
  assert.equal(
    mapTaskRow(row).title,
    'Réviser les dérivées',
    'sans ce mapping l’écran affichait une ligne blanche : la tâche existait ' +
      'et persistait, mais son titre était vide',
  );
  assert.equal(mapTaskRow(row).userId, 'user-a');
});

test('L5: mapTaskRow accepte aussi un titre déjà nommé title', () => {
  assert.equal(mapTaskRow({ id: 't', title: 'Autre nom' }).title, 'Autre nom');
});

test('L5: une ligne de miroir n’est PAS une Task (le cast direct perdait le titre)', () => {
  const row = { id: 'task-1', user_id: 'user-a', subject: 'Titre réel', status: 'todo' };
  // Preuve du défaut corrigé : la ligne brute n'a pas de `title`.
  assert.equal(
    (row as Record<string, unknown>).title,
    undefined,
    'la ligne miroir ne porte pas `title` — un cast direct en Task rendait ' +
      'un titre vide (c’était le défaut)',
  );
  assert.equal(mapTaskRow(row).title, 'Titre réel');
});
