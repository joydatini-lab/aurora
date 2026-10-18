/**
 * canvas-run-wiring.test.ts — SSoT du branchement agent ↔ canvas (le
 * minimum manquant, lot Canvas AI 2026-10-18).
 *
 * Deux manquements du lot canvas agentique (le socle kernel/canal/fn-canvas
 * existe déjà — il manquait la SURFACE device du chat) :
 *   1. le MAPPING canvasId → URL : quand un run a écrit/créé un canvas,
 *      le chat affiche un CTA « Ouvrir le canvas » → /canvas/<id> (le CTA
 *      actuel va toujours /canvas/new, jamais le canvas que l'agent a
 *      réellement touché).
 *   2. la DIFF « suggestion d'écriture » : pour un prompt de confirmation
 *      canvas_write, la carte affiche le contenu ACTUEL du bloc (lu via
 *      canvas.get) vs le nouveau contenu proposé (le prompt.input.markdown)
 *      — le pattern Review Changes du doc Tiptap, sans l'add-on payant.
 *
 * Run: node --experimental-strip-types --no-warnings --test
 *      apps/mobile/test/canvas-run-wiring.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canvasIdsOf,
  canvasIdOfStep,
  buildCanvasUrl,
  buildCanvasDiff,
  currentToolStateOf,
  type RawCanvasRunRow,
} from '../src/lib/canvas-run-wiring';

// ——— Mapping canvasId → URL (manquement 1) —————————————————————————

test('canvasIdsOf: extraie les ids de canvas touchés par un run depuis steps_json', () => {
  const row: RawCanvasRunRow = {
    steps_json: [
      { tool: 'canvas_read', input: { canvasId: 'c1' } },
      { tool: 'canvas_write', input: { canvasId: 'c1', blockId: 'b1', markdown: 'x' } },
      { tool: 'canvas_create', input: { title: 'S', canvasId: 'c2' } },
      { tool: 'progress.evidence_create', input: { whatever: 1 } },
    ],
  };
  assert.deepEqual(canvasIdsOf(row), ['c1', 'c2']);
});

test('canvasIdsOf: dedup + ordre de première apparition', () => {
  const row: RawCanvasRunRow = {
    steps_json: [
      { tool: 'canvas_write', input: { canvasId: 'c9' } },
      { tool: 'canvas_comment', input: { canvasId: 'c9' } },
      { tool: 'canvas_write', input: { canvasId: 'c7' } },
      { tool: 'canvas_write', input: { canvasId: 'c9' } },
    ],
  };
  assert.deepEqual(canvasIdsOf(row), ['c9', 'c7']);
});

test('canvasIdsOf: aucun canvas touché → [] (pas de CTA à afficher)', () => {
  const row: RawCanvasRunRow = {
    steps_json: [
      { tool: 'progress.evidence_create', input: {} },
      { tool: 'discovery_vault_read', input: { canvasId: 'c1' } }, // c1 ne sera PAS un canvas touché (le tool n'est pas canvas.*)
    ],
  };
  assert.deepEqual(canvasIdsOf(row), []);
});

test('canvasIdsOf: rows vides / malformés → [] (jamais de crash)', () => {
  assert.deepEqual(canvasIdsOf({}), []);
  assert.deepEqual(canvasIdsOf({ steps_json: null }), []);
  assert.deepEqual(canvasIdsOf({ steps_json: 'pas-un-tableau' }), []);
  assert.deepEqual(canvasIdsOf({ steps_json: [null, {}, { tool: 'canvas_write' }] }), []);
  assert.deepEqual(canvasIdsOf({ steps_json: [{ tool: 'canvas_write', input: null }] }), []);
});

test('canvasIdOfStep: un step canvas_* porte l id, sinon undefined', () => {
  assert.equal(canvasIdOfStep({ tool: 'canvas_write', input: { canvasId: 'c3' } }), 'c3');
  assert.equal(canvasIdOfStep({ tool: 'canvas_read', input: { canvasId: 'c4' } }), 'c4');
  assert.equal(canvasIdOfStep({ tool: 'inbox.capture', input: { canvasId: 'c5' } }), undefined);
  assert.equal(canvasIdOfStep({ tool: 'canvas_write', input: {} }), undefined);
  assert.equal(canvasIdOfStep({ input: { canvasId: 'c6' } }), undefined);
});

test('buildCanvasUrl: l URL du canvas (le mapping id -> /canvas/<id>)', () => {
  assert.equal(buildCanvasUrl('c1'), '/canvas/c1');
  assert.equal(buildCanvasUrl('c-2'), '/canvas/c-2');
  assert.equal(buildCanvasUrl(''), ''); // vide → pas d'URL (pas de CTA)
});

// ——— Diff « suggestion d'écriture » (manquement 2) —————————————————

test('buildCanvasDiff: propose le contenu actuel vs le nouveau (canvas_write, bloc cible)', () => {
  const row: RawCanvasRunRow = {
    confirmationTool: 'canvas_write',
    confirmationStepInput: { canvasId: 'c1', blockId: 'b1', markdown: '# Nouveau\n\ncontenu' },
  };
  const current = { blocks: [{ id: 'b1', kind: 'md', content: 'Contenu actuel' }] };
  const diff = buildCanvasDiff(row, current);
  assert.ok(diff);
  assert.equal(diff.canvasId, 'c1');
  assert.equal(diff.blockId, 'b1');
  assert.equal(diff.current, 'Contenu actuel');
  assert.equal(diff.proposed, '# Nouveau\n\ncontenu');
});

test('buildCanvasDiff: création (bloc absent du courant) → le current est vide', () => {
  const row: RawCanvasRunRow = {
    confirmationTool: 'canvas_write',
    confirmationStepInput: { canvasId: 'c1', blockId: 'bNouveau', markdown: 'nouveau' },
  };
  const current = { blocks: [{ id: 'b1', kind: 'md', content: 'existant' }] };
  const diff = buildCanvasDiff(row, current);
  assert.ok(diff);
  assert.equal(diff.current, ''); // bloc bNouveau n'existe pas → vide
  assert.equal(diff.proposed, 'nouveau');
});

test('buildCanvasDiff: non-canvas_write ou input absente → null (pas de diff à montrer)', () => {
  const row: RawCanvasRunRow = {
    confirmationTool: 'progress.evidence_create',
    confirmationStepInput: { evidence: 1 },
  };
  assert.equal(buildCanvasDiff(row, { blocks: [] }), null);

  const rowNoInput: RawCanvasRunRow = { confirmationTool: 'canvas_write' };
  assert.equal(buildCanvasDiff(rowNoInput, { blocks: [] }), null);
});

test('buildCanvasDiff: markdown vide proposé → le contenu est identique au courant (pas de diff utile)', () => {
  const row: RawCanvasRunRow = {
    confirmationTool: 'canvas_write',
    confirmationStepInput: { canvasId: 'c1', blockId: 'b1', markdown: '' },
  };
  const current = { blocks: [{ id: 'b1', kind: 'md', content: '' }] };
  assert.equal(buildCanvasDiff(row, current), null); // rien à confirmer
});

// ——— État courant du tool (le minimum du « Tool Streaming » du doc
//     Tiptap, SANS le protocole de streaming des chunks) ————————————————

test('currentToolStateOf: expose le tool/status/label d un step pending', () => {
  const row: RawCanvasRunRow & { confirmationStepRaw?: Record<string, unknown> | null } = {
    confirmationStepRaw: { tool: 'canvas_write', status: 'pending' },
  };
  const st = currentToolStateOf(row);
  assert.ok(st);
  assert.equal(st.tool, 'canvas_write');
  assert.equal(st.status, 'pending');
  assert.equal(st.label, "L'agent ecrit le canvas");
  assert.equal(st.result, undefined);
});

test('currentToolStateOf: un step déjà terminé porte son result (le dernier etat connu)', () => {
  const row: RawCanvasRunRow & { confirmationStepRaw?: Record<string, unknown> | null } = {
    confirmationStepRaw: {
      tool: 'canvas_read',
      status: 'completed',
      result: { blockCount: 4 },
    },
  };
  const st = currentToolStateOf(row);
  assert.ok(st);
  assert.equal(st.tool, 'canvas_read');
  assert.deepEqual(st.result, { blockCount: 4 });
  assert.equal(st.label, "L'agent lit le canvas");
});

test('currentToolStateOf: pas de prompt (raw absent) → null', () => {
  assert.equal(currentToolStateOf({}), null);
  assert.equal(
    currentToolStateOf({ confirmationStepRaw: null }),
    null,
  );
});

test('currentToolStateOf: un tool inconnu (sans label) → null', () => {
  const row: RawCanvasRunRow & { confirmationStepRaw?: Record<string, unknown> | null } = {
    confirmationStepRaw: { tool: 'progress.evidence_create', status: 'pending' },
  };
  assert.equal(currentToolStateOf(row), null);
});

test('currentToolStateOf: les 6 labels des verb canvas (SSoT du mapping)', () => {
  const rows: Array<{ raw: Record<string, unknown>; expected: string | null }> = [
    { raw: { tool: 'canvas_read', status: 'pending' }, expected: "L'agent lit le canvas" },
    { raw: { tool: 'canvas_write', status: 'pending' }, expected: "L'agent ecrit le canvas" },
    { raw: { tool: 'canvas_comment', status: 'pending' }, expected: "L'agent commente le canvas" },
    { raw: { tool: 'canvas_create', status: 'pending' }, expected: "L'agent cree un canvas" },
    { raw: { tool: 'canvas_lock', status: 'pending' }, expected: "L'agent verrouille le canvas" },
    { raw: { tool: 'canvas_rename', status: 'pending' }, expected: "L'agent renomme le canvas" },
    { raw: { tool: 'canvas.get', status: 'pending' }, expected: "L'agent lit le canvas" },
    { raw: { tool: 'tool_ineconnu', status: 'pending' }, expected: null },  ];
  for (const { raw, expected } of rows) {
    const st = currentToolStateOf({ confirmationStepRaw: raw } as RawCanvasRunRow & {
      confirmationStepRaw?: Record<string, unknown> | null;
    });
    if (expected === null) {
      assert.equal(st, null);
    } else {
      assert.equal(st?.label, expected);
    }
  }
});
