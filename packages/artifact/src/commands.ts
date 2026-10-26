/**
 * Artifact module — command builders + event emission
 * (AD-7 single-writer, AD-9 producer, tranche 3 lot 3.2).
 *
 * WHY THIS PACKAGE EXISTS
 * `OWNER_MODULE_BY_ENTITY` declared `artifacts` and `artifact_files` owned by
 * `'artifact'`; both tables exist (0007_artifact.sql) and the read path is wired
 * (`v_artifact_scope` relay view + PowerSync stream). The owner module did not
 * exist, so no code could legally write. This module closes the seam. It owns
 * the EXISTING tables — ZERO new tables, ZERO columns, ZERO migrations.
 *
 * ARTIFACTS ARE NOT FILES (AD-16, 01 S4.6)
 * Binaries live ONLY in R2. These rows carry metadata + `r2_key`. A builder here
 * must never accept a blob; the `r2Key` it takes is a POINTER.
 *
 * `ArtifactGenerated` FIRES AFTER THE R2 UPLOAD (F-06)
 * This is the subtle part, and it is why `markUploaded` is a separate function
 * from `createArtifact`. The event means "the bytes are retrievable", not "a row
 * was inserted". Emitting it at row-creation time would tell Knowledge
 * (SourceRef) and Learning (proof) that a file exists when the R2 PUT may still
 * fail. The event is therefore built ONLY by `markUploaded`, which also requires
 * the `jobId` that produced the upload.
 */
import type { ArtifactGeneratedEvent, OrSetValue } from '@aurora/domain';

/** Local client identity for OR-Set elements (03 S5.3). */
export interface ArtifactCtx {
  userId: string;
  clientId: string;
  /** server-canonical timestamp (ms) — 03 S4.2 rule 3 */
  now: number;
}

/**
 * Partial command updates for tables owned by Artifact.
 * EXACTLY the set `OWNER_MODULE_BY_ENTITY` assigns to `'artifact'`.
 */
export interface ArtifactCommand {
  /** owned table (0007_artifact.sql) */
  table: 'artifacts' | 'artifact_files';
  /** upsert key */
  id: string;
  /** partial fields (server-wins merge, 03 S4.2) */
  patch: Record<string, unknown>;
  /** ULID of the local mutation (G-M4 traceability) */
  localMutationId: string;
  /** optional event emitted atomically with this command (AD-9) */
  event?: ArtifactGeneratedEvent;
}

function seedOrSet(ctx: ArtifactCtx, localMutationId: string): Record<string, unknown> {
  return {
    crdt_added: { [ctx.clientId]: ctx.now },
    crdt_removed: {},
    local_mutation_id: localMutationId,
  };
}

/**
 * The `kind` values the DATABASE accepts (0007 CHECK), not the wider SSoT list.
 *
 * Divergence D-1: `Artifact.kind` in `packages/domain/src/entities-artifact.ts`
 * also allows 'csv' | 'text' | 'code', which the `artifacts_kind_check`
 * constraint REJECTS (verified live: the constraint lists 10 kinds, the SSoT
 * lists 13). Inserting a `code` artifact would fail at the server with a check
 * violation. Rather than widen the CHECK unilaterally (an AD-15 owner decision),
 * the module types the narrow, provably-accepted set and records the gap.
 */
export type ArtifactKind =
  | 'pdf'
  | 'docx'
  | 'pptx'
  | 'xlsx'
  | 'image'
  | 'audio'
  | 'video'
  | 'markdown'
  | 'latex'
  | 'other';

/** The upload lifecycle (0007 CHECK on `artifacts.status`). */
export type ArtifactStatus =
  | 'queued'
  | 'generating'
  | 'uploaded'
  | 'failed'
  | 'expired';

export interface NewArtifact {
  userId: string;
  kind: ArtifactKind;
  title?: string;
  mimeType?: string;
  /** AD-16 R2 key convention — a POINTER, never the binary */
  r2Key?: string;
  sizeBytes?: number;
  /** the task / course context that produced it, if any */
  contextTaskId?: string;
  contextCourseId?: string;
}

/**
 * Register a new artifact, `status = 'queued'` (the 0007 default).
 *
 * NO EVENT. See the header: `ArtifactGenerated` is emitted by `markUploaded`,
 * once the bytes are actually in R2.
 */
export function createArtifact(
  input: NewArtifact,
  ctx: ArtifactCtx,
  localMutationId: string,
  id: string,
): ArtifactCommand {
  return {
    table: 'artifacts',
    id,
    localMutationId,
    patch: {
      id,
      user_id: input.userId,
      kind: input.kind,
      title: input.title ?? null,
      mime_type: input.mimeType ?? null,
      r2_key: input.r2Key ?? null,
      size_bytes: input.sizeBytes ?? null,
      context_task_id: input.contextTaskId ?? null,
      context_course_id: input.contextCourseId ?? null,
      status: 'queued' satisfies ArtifactStatus,
      created_at: new Date(ctx.now).toISOString(),
      updated_at: new Date(ctx.now).toISOString(),
      ...seedOrSet(ctx, localMutationId),
    },
  };
}

/**
 * Move an artifact through its lifecycle BEFORE the upload lands
 * (`queued` → `generating`, or → `failed`). Emits NO event: nothing is
 * retrievable yet, and a failure must not announce a generation.
 */
export function setArtifactStatus(
  id: string,
  status: Exclude<ArtifactStatus, 'uploaded'>,
  ctx: ArtifactCtx,
  localMutationId: string,
): ArtifactCommand {
  return {
    table: 'artifacts',
    id,
    localMutationId,
    patch: {
      status,
      updated_at: new Date(ctx.now).toISOString(),
      local_mutation_id: localMutationId,
    },
  };
}

export interface UploadConfirmed {
  artifactId: string;
  userId: string;
  kind: string;
  /** the confirmed R2 object key */
  r2Key: string;
  sizeBytes: number;
  /** the job that performed the upload (F-06 provenance) */
  jobId: string;
  /** the `source_event_id` column value (jobId / provenance, 0007) */
  sourceEventId?: string;
}

/**
 * Confirm the R2 upload landed: `status = 'uploaded'` AND emit
 * `ArtifactGenerated` atomically with the same command (AD-9).
 *
 * This is the ONLY place the event is built. The command and the event travel
 * together, so a consumer never sees the event without the row transition.
 */
export function markUploaded(
  input: UploadConfirmed,
  ctx: ArtifactCtx,
  localMutationId: string,
): ArtifactCommand {
  const generatedAt = new Date(ctx.now).toISOString();
  const event: ArtifactGeneratedEvent = {
    eventId: '', // allocated server-side in the `events` table (AD-9 transport)
    occurredAt: generatedAt,
    type: 'ArtifactGenerated',
    payload: {
      artifactId: input.artifactId,
      userId: input.userId,
      kind: input.kind,
      r2Key: input.r2Key,
      sizeBytes: input.sizeBytes,
      generatedAt,
      jobId: input.jobId,
    },
  };

  return {
    table: 'artifacts',
    id: input.artifactId,
    localMutationId,
    event,
    patch: {
      status: 'uploaded' satisfies ArtifactStatus,
      r2_key: input.r2Key,
      size_bytes: input.sizeBytes,
      source_event_id: input.sourceEventId ?? input.jobId,
      updated_at: generatedAt,
      local_mutation_id: localMutationId,
    },
  };
}

export interface NewArtifactFile {
  userId: string;
  artifactId: string;
  filename: string;
  mimeType?: string;
  r2Key?: string;
  sizeBytes?: number;
  sha256?: string;
}

/**
 * Attach a physical file record to an artifact (0007 `artifact_files`).
 * Its own table, its own command — never folded into `createArtifact` (AD-7).
 *
 * OUTSIDE THE CURRENT DEVICE PATH. See `ARTIFACT_UNROUTED_TABLES`: this table is
 * absent from the routing table, the sync config, and the relay views, so the
 * command below cannot be validated locally, synced, or relayed today. The
 * builder is provided because the write itself is correct and the gap is a
 * wiring decision, not a modelling one — but a caller must NOT treat it as a
 * working local-first path until those three are updated.
 *
 * NOTE: `ArtifactFile` (SSoT) declares no `filename`, but the table has
 * `filename text NOT NULL`. The builder requires it. Recorded as divergence
 * D-5 rather than patched.
 */
export function addArtifactFile(
  input: NewArtifactFile,
  ctx: ArtifactCtx,
  localMutationId: string,
  id: string,
): ArtifactCommand {
  return {
    table: 'artifact_files',
    id,
    localMutationId,
    patch: {
      id,
      user_id: input.userId,
      artifact_id: input.artifactId,
      filename: input.filename,
      mime_type: input.mimeType ?? null,
      r2_key: input.r2Key ?? null,
      size_bytes: input.sizeBytes ?? null,
      sha256: input.sha256 ?? null,
      status: 'uploaded',
      created_at: new Date(ctx.now).toISOString(),
      updated_at: new Date(ctx.now).toISOString(),
    },
  };
}

/**
 * The tables this module owns THROUGH THE ROUTING TABLE — the exact mirror of the
 * `'artifact'` entries in `OWNER_MODULE_BY_ENTITY`, which is `artifacts` ALONE.
 *
 * `artifact_files` is deliberately NOT here, because nothing routes to it:
 * verified 2026-10-24, the string `artifact_files` appears in NEITHER
 * `packages/data/src/commands.ts` (no `OWNER_MODULE_BY_ENTITY` entry, so
 * `commandEntity()` can never produce it), NOR `powersync/sync-config.yaml` (the
 * `artifact` stream selects `FROM artifacts` only), NOR
 * `0015_powersync_relay_views.sql` (`v_artifact_scope` reads `artifacts` only).
 * A local command aimed at it could not be validated, synced, or relayed.
 *
 * `addArtifactFile` still exists — the table is real and the write is correct —
 * but it is a SERVER-side / future-path builder, not a device path. `artifact.test.ts`
 * pins the gap so it is visible instead of assumed working.
 */
export const ARTIFACT_OWNED_TABLES = ['artifacts'] as const;

export type ArtifactOwnedTable = (typeof ARTIFACT_OWNED_TABLES)[number];

/** Real tables of the module that are NOT routed/synced yet (gap, not capability). */
export const ARTIFACT_UNROUTED_TABLES = ['artifact_files'] as const;

/** The single event this module produces (AD-9: Artifact owns exactly one). */
export const ARTIFACT_PRODUCED_EVENTS = ['ArtifactGenerated'] as const;

export type { OrSetValue };
