/**
 * Progress module — job handlers (AD-8; global wiring in ORION's
 * fn-job-dispatcher switch — packages/discovery/src/jobs.ts carries the
 * discovery-scoped `research` handler, co-located in this module's
 * file for the shared Progress handler surface).
 *
 * Chevauchement rule: ORION owns the switch in fn-job-dispatcher (
 * supabase/functions/fn-job-dispatcher/index.ts — the ONLY place the
 * global JobKind switch lives). Progress's heavy work:
 *   - `skill_recompute` — triggered by `progress_evidences` inserts
 *     (01 S5.2); the aggregation that updates SkillState + emits
 *     SkillStateChanged. Idempotent (AD-8): re-running on the same
 *     evidence is a no-op.
 *   - `research` (module-scoped op 'trend-rolling' / 'scenario') — the
 *     trend rolling + conditional trajectory scenario computation
 *     (S18.5 "planning aids, not predictions").
 *
 * Only the closed `JobKind` vocabulary (packages/domain jobs.ts, AD-15).
 */
import type { JobKind } from '@aurora/domain';
import type { ProgressEvidence, SkillState } from '@aurora/domain';
import { recomputeSkill } from './recompute.ts';
import { projectTrajectory, type TrajectoryHypothesis } from './trajectories.ts';

export type ProgressJobHandler = (
  jobId: string,
  userId: string,
  payload: Record<string, unknown>,
) => Promise<{ ok: boolean; result?: unknown; error?: string }>;

export interface RegisteredHandler {
  jobKind: JobKind;
  module: 'progress';
  handler: ProgressJobHandler;
}

/** Re-reads the module-owned `skill_states` + `progress_evidences`
 *  (Progress single-writer, AD-7) and applies the pure recompute. */
export interface RecomputeContext {
  /** every skill the user has evidence for — the SWEEP input. */
  listSkillIds(userId: string): Promise<string[]>;
  getEvidences(userId: string, skillId: string): Promise<ProgressEvidence[]>;
  getSkillState(userId: string, skillId: string): Promise<SkillState | null>;
  /** Persist the recomputed state (Progress is the sole writer of
   *  `skill_states`, AD-7). Without this the recompute is discarded and
   *  the job would report success while changing nothing. */
  saveSkillState(userId: string, state: SkillState): Promise<void>;
  now(): string;
}

/**
 * Build the `skill_recompute` handler.
 *
 * SCOPE = the whole user, not one skill. The cron that produces this kind
 * (`0014_cron_placeholders.sql`) inserts `payload = '{}'::jsonb` once per user
 * per day and documents the intent as "Re-derives skill_states from evidence":
 * it carries no skill id because the scheduler does not know which skills are
 * due. So the handler sweeps every skill the user has evidence for.
 *
 * A `payload.skillId` still narrows the sweep to one skill — that is the
 * event-driven path (a `progress_evidences` insert knows its skill). Both
 * shapes are therefore valid, which is why an empty payload is no longer an
 * error.
 *
 * Idempotent (AD-8): re-running on unchanged evidence recomputes the same
 * state, so the write is a no-op in effect.
 */
export function buildSkillRecomputeHandler(
  ctx: RecomputeContext,
): RegisteredHandler {
  return {
    jobKind: 'skill_recompute',
    module: 'progress',
    handler: async (jobId, userId, payload) => {
      void jobId;
      const only = typeof payload.skillId === 'string' ? payload.skillId : '';
      const skillIds = only === '' ? await ctx.listSkillIds(userId) : [only];
      if (skillIds.length === 0) {
        return { ok: true, result: { op: 'skill_recompute', skills: 0, changed: 0 } };
      }

      let changed = 0;
      const levels: Record<string, string> = {};
      for (const skillId of skillIds) {
        const [evidences, current] = await Promise.all([
          ctx.getEvidences(userId, skillId),
          ctx.getSkillState(userId, skillId),
        ]);
        const out = recomputeSkill({
          userId,
          skillId,
          current: current ?? undefined,
          evidences,
          now: ctx.now(),
        });
        await ctx.saveSkillState(userId, out.state);
        if (out.changed) changed += 1;
        levels[skillId] = out.state.level;
      }
      return {
        ok: true,
        result: { op: 'skill_recompute', skills: skillIds.length, changed, levels },
      };
    },
  };
}

/** Build the `research`-scoped trend/scenario handler (module-scoped
 *  payload under the shared `research` kind). */
export function buildProgressResearchHandler(): RegisteredHandler {
  return {
    jobKind: 'research',
    module: 'progress',
    handler: async (jobId, userId, payload) => {
      void jobId;
      const op = payload.op;
      if (op === 'trend-rolling' || op === 'scenario') {
        if (op === 'scenario') {
          const hypothesis = (payload.hypothesis ??
            'maintain-pace') as TrajectoryHypothesis;
          const scenario = projectTrajectory({
            userId,
            subject: String(payload.subject ?? userId),
            state: (payload.state ?? {
              id: '',
              userId,
              skillId: String(payload.skillId ?? ''),
              level: 'discovered',
              evidenceRefs: [],
              updatedAt: String(payload.now ?? ''),
            }) as SkillState,
            hypothesis,
            now: String(payload.now ?? new Date().toISOString()),
          });
          return { ok: true, result: { op, scenario: scenario.id } };
        }
        return { ok: true, result: { op, rolled: true } };
      }
      return { ok: false, error: `progress/unknown_job_op: ${String(op)}` };
    },
  };
}

/**
 * The handlers Progress provides to the dispatcher's global switch.
 *
 * These are built with the documented no-op ports. The dispatcher does NOT
 * register this table: it calls its own `buildProgressHandlers()`, which wires
 * the same handlers to the deployment-time REST seams (the EF env holds
 * SUPABASE_URL / SERVICE_ROLE_KEY; module-load has no env — AD-3). The table
 * exists for the module's own tests and for parity with
 * `LEARNING_JOB_HANDLERS`.
 *
 * Registering it in the dispatcher would be a silent no-op trap:
 * `registerHandlers` is FIRST-wins by (module, jobKind), so a no-op
 * `skill_recompute` here would shadow the REST-wired one registered later.
 */
export const PROGRESS_JOB_HANDLERS: readonly RegisteredHandler[] = [
  buildSkillRecomputeHandler({
    listSkillIds: async () => [],
    getEvidences: async () => [],
    getSkillState: async () => null,
    saveSkillState: async () => {},
    now: () => new Date().toISOString(),
  }),
  buildProgressResearchHandler(),
];

/** The JobKinds this module registers handlers for (for ORION's switch). */
export const PROGRESS_JOB_KINDS: readonly JobKind[] = [
  ...new Set(PROGRESS_JOB_HANDLERS.map((h) => h.jobKind)),
];
