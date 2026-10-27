/**
 * Identity module — command builders (AD-7 single-writer, tranche 3 lot 3.3).
 *
 * WHY THIS PACKAGE EXISTS (and why the plan did not list it)
 * `OWNER_MODULE_BY_ENTITY` assigns `user_context` to the module `'identity'`.
 * The table exists (0001_extensions_identity.sql) and the agent kernel already
 * EMITS commands for it — `settingsTheme` in `packages/agent/src/tools.ts`
 * returns `{ command: 'identity.set_theme' }`, and
 * `UserContextUpdateCommand` (`op: 'userContext.update'`) is declared in
 * `packages/data/src/commands.ts`. There was no module to receive them.
 *
 * Tranche 3 lists only 3.1 (knowledge) and 3.2 (artifact), but its OWN gate says
 * "chaque table a un module propriétaire ; `OWNER_MODULE_BY_ENTITY` ne nomme plus
 * de module absent". `identity` is a third missing owner, so the gate was
 * unreachable with the two listed lots. This lot closes it.
 *
 * SCOPE: it owns the EXISTING table `user_context` — ZERO new tables, ZERO
 * columns, ZERO migrations.
 *
 * THE PRIMARY KEY IS THE USER (0001)
 * `user_context.user_id` is the PK (one row per user), not a surrogate id. The
 * builders therefore key the command by `userId`, unlike every other module
 * whose rows have their own id.
 *
 * TWO DIVERGENCES, recorded not patched (AD-15 owner decisions):
 *   D-6: the SSoT `UserContext` declares `displayName`; the table has NO
 *        `display_name` column (it holds theme, theme_style, coaching_prefs).
 *   D-7: the SSoT declares `quietHours` + `coachCadence` as first-class fields;
 *        the table has only a single `coaching_prefs` jsonb. The builder writes
 *        the jsonb; it does not invent columns.
 */
import type { AuroraTheme } from '@aurora/domain';

/** Local client identity for OR-Set elements (03 S5.3). */
export interface IdentityCtx {
  userId: string;
  clientId: string;
  /** server-canonical timestamp (ms) — 03 S4.2 rule 3 */
  now: number;
}

/**
 * Partial command updates for the table owned by Identity.
 * EXACTLY the set `OWNER_MODULE_BY_ENTITY` assigns to `'identity'`.
 */
export interface IdentityCommand {
  /** owned table (0001_extensions_identity.sql) */
  table: 'user_context';
  /** upsert key — the user IS the key (0001: user_id is the PK) */
  id: string;
  /** partial fields (server-wins merge, 03 S4.2) */
  patch: Record<string, unknown>;
  /** ULID of the local mutation (G-M4 traceability) */
  localMutationId: string;
  /** Identity produces NO domain event (AD-9: the vocabulary is closed at 9). */
  event?: never;
}

/** The CRDT pair the `user_context` table uses (0001: prefs_added/prefs_removed). */
function seedPrefsOrSet(ctx: IdentityCtx, localMutationId: string): Record<string, unknown> {
  return {
    prefs_added: { [ctx.clientId]: ctx.now },
    prefs_removed: {},
    local_mutation_id: localMutationId,
  };
}

/**
 * Ensure the row exists (0001: one row per user).
 *
 * `user_id` is the PK, so this is a genuine upsert rather than an insert. The
 * SSoT default theme is `'aurora'` (AD-17), which matches the DDL default.
 */
export function ensureUserContext(
  userId: string,
  ctx: IdentityCtx,
  localMutationId: string,
): IdentityCommand {
  return {
    table: 'user_context',
    id: userId,
    localMutationId,
    patch: {
      user_id: userId,
      theme: 'aurora' satisfies AuroraTheme,
      theme_style: 'light',
      coaching_prefs: {},
      created_at: new Date(ctx.now).toISOString(),
      updated_at: new Date(ctx.now).toISOString(),
      ...seedPrefsOrSet(ctx, localMutationId),
    },
  };
}

export interface ThemeUpdate {
  /** AD-17 expressive theme id (enum SSoT domain) */
  theme: AuroraTheme;
  /** the light/dark axis, ORTHOGONAL to the theme (AD-17) */
  style: 'light' | 'dark';
}

/**
 * Set the theme + its light/dark axis (AD-17).
 *
 * This is the write the agent's `settingsTheme` tool requests: it returns
 * `{ command: 'identity.set_theme' }` and THIS module applies it (AD-7: the
 * kernel only requests, the owner writes).
 */
export function setTheme(
  userId: string,
  update: ThemeUpdate,
  ctx: IdentityCtx,
  localMutationId: string,
): IdentityCommand {
  return {
    table: 'user_context',
    id: userId,
    localMutationId,
    patch: {
      theme: update.theme,
      theme_style: update.style,
      updated_at: new Date(ctx.now).toISOString(),
      local_mutation_id: localMutationId,
    },
  };
}

export interface CoachingPrefs {
  cadence?: 'off' | 'low' | 'normal' | 'high';
  quietHours?: string[];
  interventionLevel?: string;
}

/**
 * Update the coaching preferences (ADR S13: cadence, silence windows,
 * intervention level — all user-controlled).
 *
 * DIVERGENCE D-7: `coachCadence` and `quietHours` are first-class fields in the
 * SSoT `UserContext`, but the table stores a single `coaching_prefs` jsonb. The
 * builder writes the jsonb. `coaching_prefs` is REPLACED wholesale, not merged:
 * jsonb merge semantics are not specified anywhere in the repo, and inventing
 * them silently would be worse than requiring the caller to pass the full
 * object.
 */
export function updateCoachingPrefs(
  userId: string,
  prefs: CoachingPrefs,
  ctx: IdentityCtx,
  localMutationId: string,
): IdentityCommand {
  return {
    table: 'user_context',
    id: userId,
    localMutationId,
    patch: {
      coaching_prefs: prefs,
      updated_at: new Date(ctx.now).toISOString(),
      local_mutation_id: localMutationId,
    },
  };
}

/**
 * The tables this module owns — the exact mirror of the `'identity'` entries in
 * `OWNER_MODULE_BY_ENTITY`. Asserted by the module test and by
 * `packages/data/test/owner-module-coverage.test.ts`.
 */
export const IDENTITY_OWNED_TABLES = ['user_context'] as const;

export type IdentityOwnedTable = (typeof IDENTITY_OWNED_TABLES)[number];

/** Identity produces no domain event (AD-9 closed vocabulary) — pinned for the test. */
export const IDENTITY_PRODUCED_EVENTS: readonly string[] = [];
