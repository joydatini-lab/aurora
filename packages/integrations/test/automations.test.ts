/**
 * @aurora/integrations — automations tests (AD-8 idempotency, AD-15
 * closed JobKind, JobCompleted consumer).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  INTEGRATIONS_JOB_HANDLERS,
  automationDedupKey,
  buildAutomationJobPayload,
  cronInsertSql,
  filterJobCompletedForAutomation,
  isJobKind,
} from '../src/automations.ts';
import type { Automation, JobCompletedEvent } from '@aurora/domain';

const automation: Automation = {
  id: 'auto-1',
  userId: 'u-1',
  name: 'Daily reminder sweep',
  trigger: 'schedule',
  cron: '0 8 * * *',
  jobKind: 'notification',
  action: 'reminder-sweep',
  enabled: true,
  createdAt: '2026-09-25T00:00:00Z',
  updatedAt: '2026-09-25T00:00:00Z',
};

/** AD-8: deterministic dedup key (kind|automationId|minute) — re-
 *  dispatch of the same tick is a no-op. */
test('automations: dedup key is deterministic', () => {
  const a = automationDedupKey('auto-1', 1000, 'notification');
  const b = automationDedupKey('auto-1', 1000, 'notification');
  assert.equal(a, b);
  assert.equal(a, 'notification|auto-1|1000');
  const c = automationDedupKey('auto-1', 1001, 'notification');
  assert.notEqual(a, c);
});

/** AD-15: unknown jobKind on an automation row degrades to
 *  `notification` (closed 11-kind vocabulary, no 12th kind). */
test('automations: unknown kind degrades to notification', () => {
  const p = buildAutomationJobPayload(
    { ...automation, jobKind: 'speak_to_me_please' },
    42,
  );
  assert.equal(p.jobKind, 'notification');
  assert.equal(isJobKind(p.jobKind), true);
  // and valid kinds pass through
  const p2 = buildAutomationJobPayload(
    { ...automation, jobKind: 'agent_run' },
    42,
  );
  assert.equal(p2.jobKind, 'agent_run');
});

/** The cron INSERT is idempotent (ON CONFLICT DO NOTHING +
 *  deterministic idempotency_key). */
test('automations: cron SQL carries the dedup key', () => {
  const sql = cronInsertSql(automation, 1730000000, 'job-xyz');
  assert.match(sql, /ON CONFLICT DO NOTHING/);
  assert.match(sql, /notification\|auto-1\|1730000000/);
  assert.match(sql, /job-xyz/);
});

/** Handler idempotent-replay: a re-dispatched job with a stale dedup
 *  key is reported as skipped (AD-8). */
test('automations: notification handler skips idempotent replays', async () => {
  const handler = INTEGRATIONS_JOB_HANDLERS[0].handler;
  const payload = buildAutomationJobPayload(automation, 100);
  payload.tick = 100;
  const ok = await handler('job-1', 'u-1', payload);
  assert.equal(ok.ok, true);
  assert.equal((ok.result as { skipped?: string }).skipped, undefined);

  // replay with a mismatched dedup key → skip
  const replay = { ...payload, dedupKey: automationDedupKey('auto-1', 999, 'notification') };
  const out = await handler('job-1', 'u-1', replay);
  assert.equal(out.ok, true);
  assert.equal((out.result as { skipped?: string }).skipped, 'idempotent-replay');
});

/**
 * M-72 (S7 finitions) — le handler `integrations/notification` APPRELE
 * le client OneSignal REST (AD-1, notifications.ts). Quand le payload
 * est une notification de veille (M-43 runVeillePipeline,
 * `channelId`/`title`/`body` SSoT + le flag `uncertain` AD-16b), le
 * handler :
 *  1. convertit le payload en `NotificationPlan` via `decideChannel`
 *     (anti-double-push 04 §7 : EXACTLY ONE channel) ;
 *  2. appelle `createOneSignalServerClient().send(plan)` ;
 *  3. retourne le résultat du send (AD-1 : le secret absent →
 *     `{accepted:false, reason:'onesignal_not_configured'}`,
 *     dégradation propre, JAMAIS une rupture).
 *
 * Le test pinne le wiring end-to-end du trigger M-72 : le payload du
 * run veille est bien branché sur le vendor OneSignal (AD-1), le
 * secret absent est signalé proprement (AD-1 last paragraph).
 */
test('M-72 : le handler notification appelle le client OneSignal (AD-1 wiring, S7)', async () => {
  const handler = INTEGRATIONS_JOB_HANDLERS[0].handler;
  // Le payload EXACT que le module Discovery produit (M-43
  // runVeillePipeline, M-72 SSoT : le `topic` du run est dans le
  // body, le `channelId` est l'id du run/vault).
  const payload: Record<string, unknown> = {
    module: 'integrations',
    automationId: 'run-vault-1',
    jobKind: 'notification',
    channelId: 'vault-ch1',
    title: 'Veille structures',
    body: 'ta veille sur structures est prête',
    uncertain: false,
    dedupKey: automationDedupKey('run-vault-1', 100, 'notification'),
    tick: 100,
  };

  // AD-1 : le secret OneSignal est ABSENT dans l'environnement de test
  // → le client dégrade à {accepted:false, reason:'onesignal_not_configured'}.
  const prevApp = process.env.ONESIGNAL_APP_ID;
  const prevKey = process.env.ONESIGNAL_REST_API_KEY;
  process.env.ONESIGNAL_APP_ID = '';
  process.env.ONESIGNAL_REST_API_KEY = '';
  try {
    const res = await handler('j-m72', 'u-1', payload);
    assert.equal(res.ok, true, 'M-72: le handler ne casse jamais (AD-1 dégradation)');
    const r = res.result as {
      automation?: string;
      channel?: string;
      delivered?: boolean;
      reason?: string;
    };
    // Le channel décidé est « push » (le pref par défaut du handler :
    // enabled + channels:['push'], pas de localDeadline, pas de
    // quietHours) — le client OneSignal EST appelé (AD-1 wiring M-72).
    assert.equal(r.channel, 'push', 'M-72: le decideChannel route vers le push');
    // AD-1 : le secret absent → le send est dégradé, JAMAIS une rupture.
    assert.equal(r.delivered, false, 'M-72: le secret absent → delivered:false (AD-1)');
    assert.equal(
      r.reason,
      'onesignal_not_configured',
      'M-72: le secret absent → reason:onesignal_not_configured (AD-1 SSoT) — pas un placeholder vide',
    );
    // Le job reste fait (best-effort, overview §17).
    assert.equal(r.automation, 'run-vault-1');
  } finally {
    if (prevApp === undefined) delete process.env.ONESIGNAL_APP_ID;
    else process.env.ONESIGNAL_APP_ID = prevApp;
    if (prevKey === undefined) delete process.env.ONESIGNAL_REST_API_KEY;
    else process.env.ONESIGNAL_REST_API_KEY = prevKey;
  }
});

/**
 * M-72 (S7 finitions) — le payload classique (le tick cron d'une
 * automation reminder, SANS `title`/`body`) retombe sur l'`action`
 * de l'automation pour le message (le G1 du kernel le mappe là). Le
 * wiring reste le même : le client OneSignal EST appelé (AD-1).
 */
test('M-72 : le payload classique (sans title/body) retombe sur l\'action (AD-1 wiring conservé)', async () => {
  const handler = INTEGRATIONS_JOB_HANDLERS[0].handler;
  const payload: Record<string, unknown> = {
    module: 'integrations',
    automationId: 'auto-2',
    jobKind: 'notification',
    action: 'reminder-sweep',
    tick: 200,
    dedupKey: automationDedupKey('auto-2', 200, 'notification'),
  };

  const prevApp = process.env.ONESIGNAL_APP_ID;
  const prevKey = process.env.ONESIGNAL_REST_API_KEY;
  process.env.ONESIGNAL_APP_ID = '';
  process.env.ONESIGNAL_REST_API_KEY = '';
  try {
    const res = await handler('j-m72b', 'u-1', payload);
    assert.equal(res.ok, true);
    const r = res.result as { channel?: string; delivered?: boolean };
    // Le wiring M-72 est le même : le client EST appelé, AD-1 dégrade.
    assert.equal(r.channel, 'push');
    assert.equal(r.delivered, false);
  } finally {
    if (prevApp === undefined) delete process.env.ONESIGNAL_APP_ID;
    else process.env.ONESIGNAL_APP_ID = prevApp;
    if (prevKey === undefined) delete process.env.ONESIGNAL_REST_API_KEY;
    else process.env.ONESIGNAL_REST_API_KEY = prevKey;
  }
});

/** JobCompleted consumer: events observed via the events table,
 *  filtered by automation (userId + jobKind). */
test('automations: JobCompleted filter is userId+jobKind scoped', () => {
  const events: JobCompletedEvent[] = [
    {
      eventId: 'e-1',
      occurredAt: '2026-09-25T08:00:00Z',
      type: 'JobCompleted',
      payload: { jobId: 'j-1', jobKind: 'notification', userId: 'u-1', status: 'done' },
    },
    {
      eventId: 'e-2',
      occurredAt: '2026-09-25T08:00:00Z',
      type: 'JobCompleted',
      payload: { jobId: 'j-2', jobKind: 'notification', userId: 'u-2', status: 'done' },
    },
    {
      eventId: 'e-3',
      occurredAt: '2026-09-25T08:00:00Z',
      type: 'JobCompleted',
      payload: { jobId: 'j-3', jobKind: 'agent_run', userId: 'u-1', status: 'failed' },
    },
  ];
  const out = filterJobCompletedForAutomation(events, {
    userId: 'u-1',
    jobKind: 'notification',
  });
  assert.deepEqual(out.map((e) => e.eventId), ['e-1']);
});
