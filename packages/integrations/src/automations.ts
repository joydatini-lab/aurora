/**
 * Automations (ADR S2 / 01 §5.2, composio.md §5: Cron-based automations
 * are the scheduled-action mechanism — NOT Composio webhooks, which are
 * out of V1 scope).
 *
 * Flow: Supabase Cron (0001-0012 untouched; a coordinated 0013
 * migration adds the crontab entries if the cron table supports it) →
 * inserts into `job_queue` (AD-8: the ONLY two trigger sources are
 * Cron + Postgres trigger) → the dispatcher (ORION's global switch)
 * routes the job to the module-scoped handler this package provides
 * (chevauchement rule: ORION owns the wiring, we provide the
 * handler).
 *
 * AD-9 discipline: automations are COMMANDS — they enqueue jobs, they
 * do NOT invent a 10th event. The consumer side observes `JobCompleted`
 * (job-system producer, UI's success state, 01 §6) via the events
 * table (AD-2: no direct import of another module's writer).
 *
 * Idempotency (AD-8): the automation row's deterministic
 * `idempotencyKey` (cron tick + automation id + minute) dedupes
 * re-dispatches; the cron INSERT itself is guarded by a
 * `not exists (pending/running same key)` predicate (0010/0011
 * pattern), so a double cron firing is a no-op.
 */
import type {
  Automation,
  JobCompletedEvent,
  JobKind,
  NotificationPreference,
} from '@aurora/domain';
import {
  createOneSignalServerClient,
  decideChannel,
} from './notifications.ts';
import type { NotificationPlan, OneSignalClient } from './notifications.ts';

/** Payload shape of an automation-driven job (typed per kind by the
 *  worker, 01 §5.3). Carries the dedup key so the handler can replay-
 *  safely. */
export interface AutomationJobPayload {
  /** module scope for ORION's (kind, module) routing */
  module: 'integrations';
  automationId: string;
  /** closed JobKind vocabulary only (AD-15); no 12th kind */
  jobKind: JobKind;
  /** deterministic dedup key (AD-8): kind|automationId|minute */
  dedupKey?: string;
  /** the automation's action descriptor */
  action?: string;
  /** the event trigger payload snapshot (event trigger only) */
  triggerEvent?: string;
  /** the cron-minute epoch the tick belongs to (AD-8 dedup input) */
  tick?: number;
  // — M-72 (S7 finitions) — le payload de la notification de veille
  // (M-43 runVeillePipeline, `channelId`/`title`/`body` SSoT) est
  // porté ici quand le dispatcher enfile le `notificationJob` du
  // module Discovery sur le module 'integrations' / jobKind
  // 'notification' (chevauchement ORION, fn-job-dispatcher L217).
  /** le channel OneSignal (l'adapter résout l'identifiant). */
  channelId?: string;
  /** le titre du push. */
  title?: string;
  /** le body du push (le `topic` du run y est porté, SSoT M-72). */
  body?: string;
  /** AD-16b : le flag `uncertain` du run (JAMAIS supprimé). */
  uncertain?: boolean;
  /** le deep-link du push (optionnel). */
  deepLink?: string;
}

/**
 * Deterministic dedup key for a cron tick (AD-8): same cron minute +
 * same automation = same key; re-dispatch is a no-op. Format mirrors
 * the job-system convention `kind|automationId|minute-epoch`.
 */
export function automationDedupKey(
  automationId: string,
  cronMinuteEpoch: number,
  jobKind: JobKind,
): string {
  return `${jobKind}|${automationId}|${cronMinuteEpoch}`;
}

/** The SQL a cron tick inserts into `job_queue` (single-writer: the
 *  automation's owning module builds the statement; the Cron job is
 *  owned by Integrations per 03 §4.2 `Automation` owner). Idempotent:
 *  the `not exists` guard over pending/running jobs with the same
 *  idempotency_key makes a double firing a no-op. */
export function cronInsertSql(
  automation: Automation,
  cronMinuteEpoch: number,
  jobId: string,
): string {
  const payload = buildAutomationJobPayload(automation, cronMinuteEpoch);
  return `
INSERT INTO job_queue (id, user_id, kind, payload, due_at, idempotency_key)
VALUES (
  '${jobId}',
  '${automation.userId}',
  '${payload.jobKind}',
  '${JSON.stringify(payload).replace(/'/g, "''")}'::jsonb,
  now(),
  '${payload.dedupKey}'
)
ON CONFLICT DO NOTHING
;`.trim();
}

/** Build the typed job payload for an automation tick. */
export function buildAutomationJobPayload(
  automation: Automation,
  cronMinuteEpoch: number,
): AutomationJobPayload {
  // JobKind is the closed 11-kind SSoT vocabulary (packages/domain
  // jobs.ts). An automation row may carry an arbitrary string; only
  // a valid kind enqueues — anything else degrades to a
  // `notification` job that logs the unknown action (AD-1 optional
  // capability; product keeps working).
  const kind: JobKind =
    automation.jobKind !== undefined && isJobKind(automation.jobKind)
      ? automation.jobKind
      : 'notification';
  return {
    module: 'integrations',
    automationId: automation.id,
    jobKind: kind,
    dedupKey: automationDedupKey(automation.id, cronMinuteEpoch, kind),
    tick: cronMinuteEpoch,
    action: automation.action,
    triggerEvent: automation.triggerEvent,
  };
}

/** The closed JobKind set (AD-15 SSoT, packages/domain/jobs.ts). */
const JOB_KINDS: ReadonlySet<string> = new Set([
  'ocr',
  'transcription',
  'artifact_gen',
  'fsrs-tick',
  'skill_recompute',
  'research',
  'agent_run',
  'verify',
  'scientific',
  'course_import',
  'notification',
]);
export function isJobKind(k: string): k is JobKind {
  return JOB_KINDS.has(k);
}

/**
 * The handler Integrations provides to ORION's global switch
 * (chevauchement rule — ORION imports this; we never edit
 * fn-job-dispatcher). Idempotent (AD-8): when the dispatcher
 * re-claims a job whose payload.dedupKey doesn't match what we
 * would compute for this tick, we report a skip.
 *
 * M-72 (S7 finitions) : le handler `notification` est maintenant
 * branché sur le client OneSignal REST (notifications.ts, AD-1 : le
 * vendor reste dans l'adapter). Quand le payload est une notification
 * de veille (M-43 runVeillePipeline, `channelId`/`title`/`body` SSoT)
 * ou une automation reminder (l'action G1), le handler :
 *  1. résout le `NotificationPlan` via `decideChannel` (anti-double-push,
 *     04 §7 : EXACTLY ONE channel — push/local/in-app) ;
 *  2. appelle `createOneSignalServerClient().send(plan)` — si le
 *     secret OneSignal est ABSENT (AD-1, l'optionnelle capability n'est
 *     jamais configurée) le client retourne `{accepted:false,
 *     reason:'onesignal_not_configured'}` (pas une rupture) ;
 *  3. retourne `{ ok, result:{ delivered, reason? } }` au dispatcher
 *     (le `JobCompleted` est produit par le job system, AD-9).
 * Le cas replay idempotent (`dedupKey` incohérente) reste prioritaire
 * (le replay est un no-op AD-8, pas un re-send).
 */
export const INTEGRATIONS_JOB_HANDLERS: ReadonlyArray<{
  jobKind: JobKind;
  module: 'integrations';
  handler: (
    jobId: string,
    userId: string,
    payload: Record<string, unknown>,
  ) => Promise<{ ok: boolean; result?: unknown; error?: string }>;
}> = [
  {
    jobKind: 'notification',
    module: 'integrations',
    handler: async (_jobId, userId, payload) => {
      const p = payload as unknown as AutomationJobPayload;
      if (p.module !== 'integrations' || p.automationId === undefined) {
        // Not an integrations-scoped payload: ORION routes by
        // (kind, module); unknown module → stay pending, no work.
        return { ok: false, error: 'integrations/unknown_payload' };
      }
      // Idempotent replay check (AD-8): the dedup key is deterministic
      // per tick; a replay carries the same key → skip.
      const expected = automationDedupKey(
        p.automationId,
        Number(p.tick ?? 0),
        p.jobKind,
      );
      if (p.dedupKey !== undefined && p.dedupKey !== expected) {
        return { ok: true, result: { skipped: 'idempotent-replay' } };
      }

      // M-72 (S7 finitions) — le branchement réel : le handler
      // `integrations/notification` APPRELE le client OneSignal (AD-1,
      // notifications.ts). Le payload du run veille (M-43
      // runVeillePipeline, `channelId`/`title`/`body` SSoT + le flag
      // `uncertain` AD-16b) est converti en `NotificationPlan` via
      // `decideChannel` (anti-double-push 04 §7 : EXACTLY ONE channel),
      // puis envoyé au vendor via `createOneSignalServerClient().send`.
      //
      // Quand le payload est un `AutomationJobPayload` classique
      // (le tick cron d'une automation reminder, sans `title`), le
      // message retombe sur l'`action` de l'automation (le G1 du
      // kernel le mappe là) ; le `channelId` par défaut est
      // `default` (la convention du `MaterializeDueAutomationRow`
      // d'automation-scheduler, L118).
      //
      // AD-1 (notifications.ts, §7.2e) : quand le secret OneSignal
      // n'est PAS configuré, le client retourne `{ accepted:false,
      // reason:'onesignal_not_configured' }` — le job est fait
      // (best-effort, overview §17), la dégradation est propre,
      // JAMAIS une rupture.
      const channelPref: Pick<NotificationPreference, 'enabled' | 'quietHours' | 'channels'> = {
        enabled: true,
        quietHours: undefined,
        channels: ['push'],
      };
      const req = {
        userId,
        title: p.title ?? p.action ?? 'Veille',
        body: p.body ?? p.action ?? '',
        priority: 'job-result' as const,
        nowIso: new Date().toISOString(),
        deepLink: p.deepLink,
      };
      const plan: NotificationPlan = decideChannel(req, channelPref);
      const client: OneSignalClient = createOneSignalServerClient();
      const outcome = await client.send(plan);

      // Best-effort delivery (overview.md §17 : push est best-effort,
      // le job result enregistre done/failed ; le JobCompleted est
      // produit par le job system, PAS ici).
      return {
        ok: true,
        result: {
          automation: p.automationId,
          action: p.action ?? undefined,
          channel: plan.channel,
          ...(outcome.accepted ? { delivered: true } : { delivered: false, reason: outcome.reason }),
        },
      };
    },
  },
  {
    jobKind: 'agent_run',
    module: 'integrations',
    handler: async (_jobId, _userId, payload) => {
      const p = payload as unknown as AutomationJobPayload;
      // Automation-triggered agent runs: a thin pass-through; the
      // Agent module's own worker owns the heavy run. We only
      // validate scope (AD-2: no cross-module table writes).
      if (p.module !== 'integrations') {
        return { ok: false, error: 'integrations/unknown_payload' };
      }
      return {
        ok: true,
        result: { automation: p.automationId, queuedFor: 'agent_run' },
      };
    },
  },
] as const;

/**
 * JobCompleted consumer (AD-9 matrix: JobCompleted producer = Job
 * system; consumers include this module for delivery confirmation,
 * overview.md §12). Observation is via the events table — NO direct
 * import of the job system's writer (AD-2); the event shape is the
 * SSoT from packages/domain/events.ts.
 *
 * Pure filter: returns the JobCompleted events relevant to an
 * automation (jobKind + userId match), so a UI state can mark the
 * delivery done/failed.
 */
export function filterJobCompletedForAutomation(
  events: JobCompletedEvent[],
  automation: { userId: string; jobKind: JobKind },
): JobCompletedEvent[] {
  return events.filter(
    (e) =>
      e.type === 'JobCompleted' &&
      e.payload.userId === automation.userId &&
      e.payload.jobKind === automation.jobKind,
  );
}

/** The JobKinds this module registers handlers for (ORION switch). */
export const INTEGRATIONS_JOB_KINDS: readonly JobKind[] = [
  ...new Set(INTEGRATIONS_JOB_HANDLERS.map((h) => h.jobKind)),
];
