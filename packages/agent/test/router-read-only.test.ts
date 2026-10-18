/**
 * M-11 (v2 MVP Veille + Chat agentique, S1) — gating READ-ONLY en mode Ask.
 *
 * Contrat (plan S1 §M-11, Q9) : quand `taskProfile.agentMode === 'chat'`
 * (le mode Ask), le kernel N'ÉMET JAMAIS de commande d'écriture — seules
 * les capacités READ-ONLY (zéro `writeScopes`) sont résolues par
 * `resolveTool`. `agentMode: 'agent'` (ou l'absence de mode) autorise les
 * tools d'écriture (les confirmations s'appliquent au-dessus, non ici).
 *
 * TDD : ce test FAIL d'abord (le gate n'existe pas dans `resolveTool`),
 * puis PASS après l'implémentation.
 *
 * Run: `pnpm --filter @aurora/agent test`
 * Node 22: `node --experimental-strip-types --test test/router-read-only.test.ts`
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DefaultCapabilityRegistry,
  resolveTool,
  buildPlan,
  type AgentContext,
  type PlanStep,
} from '../src/index.ts';
import type { PermissionContext } from '../src/permission.ts';

/** Minimal AgentContext — only the forms `resolveTool` reads. */
function ctxFor(over: { agentMode?: 'chat' | 'agent' | 'mirror' | 'ascent' }): AgentContext {
  return {
    intent: {
      raw: 'test intent',
      kind: 'chat',
      parts: [],
      profile: { agentMode: over.agentMode, level: 'ROUTINE', tools: 0, reasoning: 'none' },
    },
    tool: { availability: 'online' },
    permission: {},
  } as unknown as AgentContext;
}

const registry = new DefaultCapabilityRegistry();

test('M-11 baseline: an agent-mode run RESOLVES the write tool task_update', () => {
  const entry = resolveTool('task_update', ctxFor({ agentMode: 'agent' }), registry);
  assert.ok(entry, 'agent mode: task_update resolves (writes stay legal)');
  assert.ok(
    entry.writeScopes.length > 0,
    'task_update carries a write scope (the gate only fires in chat mode)',
  );
});

test('M-11: chat mode (Ask) REJECTS the write tool task_update', () => {
  const entry = resolveTool('task_update', ctxFor({ agentMode: 'chat' }), registry);
  assert.equal(
    entry,
    undefined,
    'Ask is READ-ONLY (Q9): a write tool must NOT resolve in chat mode',
  );
});

test('M-11: chat mode REJECTS every destructive / confirmation tool', () => {
  for (const tool of ['task_delete', 'canvas_write', 'goal_create', 'delete_automation']) {
    const entry = resolveTool(tool, ctxFor({ agentMode: 'chat' }), registry);
    assert.equal(entry, undefined, `chat mode: ${tool} must be gated out`);
  }
});

test('M-11: chat mode RESOLVES the read-only tools (no writeScopes)', () => {
  for (const tool of ['goal_status', 'course_search', 'progress_trajectories', 'artifact_preview']) {
    const entry = resolveTool(tool, ctxFor({ agentMode: 'chat' }), registry);
    assert.ok(entry, `chat mode: ${tool} stays available (read-only)`);
  }
});

test('M-11: chat mode ACCEPTS a docs tool that only writes a representation row', () => {
  // docs_parse / docs_inspect are READ-ONLY on the SOURCE document — they
  // only emit a parsed-representation row (Artifact module applies, AD-7).
  // The task's allowed read-only list keeps them available in Ask mode:
  // gating is scoped to the user's DOMAIN data, not a computed artifact row.
  for (const tool of ['docs_parse', 'docs_inspect', 'scientific_evaluate']) {
    const entry = resolveTool(tool, ctxFor({ agentMode: 'chat' }), registry);
    assert.ok(
      entry,
      `chat mode: ${tool} resolves (representation-row writes are not domain writes)`,
    );
  }
});

test('M-11: mirror / ascent / undefined modes are NOT gated (full write loop)', () => {
  for (const agentMode of ['mirror', 'ascent', undefined] as const) {
    const entry = resolveTool('planDay', ctxFor({ agentMode: agentMode as 'agent' }), registry);
    assert.ok(
      entry,
      `mode '${String(agentMode)}': planDay resolves (only chat is read-only)`,
    );
  }
});

test('M-11: the gate is the writeScopes/READ-ONLY contract, not a hard tool list', () => {
  // The plan pins `*_read`, `*_search`, `course_search`, `discovery_vault_read`
  // as the canonical read-only set. Every tool the kernel exposes as
  // writeScopes === [] must stay available in chat mode.
  const readOnlyTools = registry
    .all()
    .filter((e) => e.writeScopes.length === 0)
    .map((e) => e.tool);
  assert.ok(readOnlyTools.length >= 4, 'the registry exposes a real read-only set');
  for (const tool of readOnlyTools) {
    const entry = resolveTool(tool, ctxFor({ agentMode: 'chat' }), registry);
    assert.ok(entry, `chat mode: read-only tool ${tool} stays available`);
  }
});

// ---------------------------------------------------------------------------
// Planner level — the kernel CONSUMES `taskProfile.agentMode` (AD-7:
// "Ask n'écrit JAMAIS"). `buildPlan` degrades every write step to
// `skipped` in chat mode; agent mode keeps the full write loop.
// ---------------------------------------------------------------------------

const planners = {
  registry,
  permission: (_step: PlanStep, _ctx: AgentContext, _perm: PermissionContext) => 'allowed',
  now: () => '2026-10-17T00:00:00.000Z',
  ulid: () => 'test-ulid',
};

test('M-11 planner: chat mode SKIPS every write step of an organize_day plan', () => {
  const ctx = ctxFor({ agentMode: 'chat' });
  (ctx.intent as { kind?: string }).kind = 'organize_day';
  const plan = buildPlan(ctx, {}, planners);
  assert.ok(plan.steps.length > 0, 'the plan has steps');
  const writeSteps = plan.steps.filter((s) => s.risk === 'write' || s.risk === 'destructive');
  assert.ok(writeSteps.length > 0, 'organize_day carries write steps (planDay / startFocus…)');
  for (const s of writeSteps) {
    assert.equal(
      s.status,
      'skipped',
      `chat mode: write step ${s.tool} is skipped (Ask never writes, §14)`,
    );
  }
});

test('M-11 planner: agent mode keeps write steps pending (full loop + confirmations)', () => {
  const ctx = ctxFor({ agentMode: 'agent' });
  (ctx.intent as { kind?: string }).kind = 'organize_day';
  const plan = buildPlan(ctx, {}, planners);
  const writeSteps = plan.steps.filter((s) => s.risk === 'write' || s.risk === 'destructive');
  for (const s of writeSteps) {
    assert.equal(s.status, 'pending', `agent mode: ${s.tool} stays pending (confirmations apply above)`);
  }
});

test('M-11 planner: chat mode keeps read-only steps pending', () => {
  const ctx = ctxFor({ agentMode: 'chat' });
  (ctx.intent as { kind?: string }).kind = 'organize_day';
  const plan = buildPlan(ctx, {}, planners);
  const readSteps = plan.steps.filter((s) => s.risk === 'read');
  for (const s of readSteps) {
    assert.equal(s.status, 'pending', `chat mode: read step ${s.tool} stays executable`);
  }
});
