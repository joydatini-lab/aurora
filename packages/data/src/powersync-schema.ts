// =============================================================================
// powersync-schema.ts — client-side PowerSync Schema (03 S4.2 mirror mapping,
// device side).
//
// Vendor `Schema`/`Table`/`column` come from `@powersync/common` (AD-1: the
// vendor lives in this adapter package). The table SET + per-table column
// shape is DERIVED from `POWERSYNC_SCHEMA` (`powersync.ts`, the frozen wave-0
// mapping, 03 S4.2) so `mirrorTables` stays the single source — a new
// mirrored table lands here automatically, no second list.
//
// Column typing rules (PowerSync SDK):
// - `id` is NEVER declared (auto-created TEXT PRIMARY KEY).
// - Postgres `boolean` → `column.integer` (0/1) — the upload layer coerces.
// - Postgres `vector(768)` → excluded (03 S4.2: no embedding column on
//   `semantic_nodes`; retrieval is server-only, AD-12/F-09).
// - jsonb / timestamptz / text / uuid → `column.text` (values arrive as
//   text or ISO strings; SQLite mirror is stringly-typed, AD-7 local-first).
// =============================================================================

import { Schema, Table, column } from '@powersync/common';
import { POWERSYNC_SCHEMA } from './powersync';

/**
 * The full client schema (03 S4.2 mirror mapping — every `mirrorTables`
 * entry). Consumed by `PowerSyncClientEngine` and `createAuroraDatabase`.
 *
 * An AD-15 change (new entity / new mirror column) = re-generate this
 * from the live column shape (01 S2.3 / AD-16b event), not a hand edit.
 */
export const AuroraPowerSyncSchema = new Schema({
  // --- Productivity (03 S4.2) -------------------------------------------------
  tasks: new Table(
    {
      user_id: column.text,
      project_id: column.text,
      goal_id: column.text,
      subject: column.text,
      description: column.text,
      status: column.text,
      priority: column.integer,
      importance: column.integer,
      due_at: column.text,
      parent_recurrence_key: column.text,
      energy: column.text,
      work_context: column.text,
      actual_minutes: column.integer,
      tags: column.text,
      recurrence_rule: column.text,
      dependencies: column.text,
      evidence_refs: column.text,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'], status: ['status'], due: ['due_at'] } },
  ),
  subtasks: new Table(
    {
      user_id: column.text,
      task_id: column.text,
      title: column.text,
      status: column.text,
      done_at: column.text,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { task: ['task_id'] } },
  ),
  milestones: new Table(
    {
      user_id: column.text,
      project_id: column.text,
      goal_id: column.text,
      title: column.text,
      due_date: column.text,
      status: column.text,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { goal: ['goal_id'] } },
  ),
  projects: new Table(
    {
      user_id: column.text,
      goal_id: column.text,
      name: column.text,
      description: column.text,
      status: column.text,
      start_date: column.text,
      end_date: column.text,
      view_mode: column.text,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),
  goals: new Table(
    {
      user_id: column.text,
      title: column.text,
      description: column.text,
      horizon: column.text,
      status: column.text,
      target_date: column.text,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'], status: ['status'] } },
  ),
  habits: new Table(
    {
      user_id: column.text,
      name: column.text,
      frequency: column.text,
      target: column.text,
      status: column.text,
      streak: column.integer,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),
  routines: new Table(
    {
      user_id: column.text,
      name: column.text,
      anchor: column.text,
      steps: column.text,
      status: column.text,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),
  focus_sessions: new Table(
    {
      user_id: column.text,
      task_id: column.text,
      started_at: column.text,
      ended_at: column.text,
      planned_minutes: column.integer,
      actual_minutes: column.integer,
      status: column.text,
      notification_policy: column.text,
      call_policy: column.text,
      focus_app_rules: column.text,
      session_bilan: column.text,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),
  decisions: new Table(
    {
      user_id: column.text,
      title: column.text,
      context: column.text,
      outcome: column.text,
      decided_at: column.text,
      reviewed_at: column.text,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),
  calendar_events: new Table(
    {
      user_id: column.text,
      title: column.text,
      description: column.text,
      start_at: column.text,
      end_at: column.text,
      all_day: column.integer,
      recurrence: column.text,
      location: column.text,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),

  // --- Knowledge (03 S4.2 — NO `embedding` column, AD-12/F-09) ---------------
  notes: new Table(
    {
      user_id: column.text,
      title: column.text,
      body: column.text,
      kind: column.text,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),
  resources: new Table(
    {
      user_id: column.text,
      title: column.text,
      mime_type: column.text,
      r2_key: column.text,
      size_bytes: column.integer,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),
  semantic_nodes: new Table(
    {
      user_id: column.text,
      kind: column.text,
      label: column.text,
      summary: column.text,
      body: column.text,
      parent_id: column.text,
      domain_path: column.text,
      source_ref_ids: column.text,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),
  semantic_edges: new Table(
    {
      user_id: column.text,
      source_node: column.text,
      target_node: column.text,
      relation: column.text,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),
  semantic_bridges: new Table(
    {
      user_id: column.text,
      source_node: column.text,
      target_node: column.text,
      label: column.text,
      secondaries: column.text,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),
  node_state: new Table(
    {
      user_id: column.text,
      node_id: column.text,
      state: column.text,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),
  source_refs: new Table(
    {
      user_id: column.text,
      entity: column.text,
      entity_id: column.text,
      source_document_id: column.text,
      page: column.integer,
      passage: column.text,
      kind: column.text,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),

  // --- Learning ---------------------------------------------------------------
  courses: new Table(
    {
      user_id: column.text,
      title: column.text,
      description: column.text,
      subject_id: column.text,
      status: column.text,
      progress_pct: column.real,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),
  subjects: new Table(
    {
      user_id: column.text,
      name: column.text,
      description: column.text,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),
  skills: new Table(
    {
      user_id: column.text,
      name: column.text,
      definition: column.text,
      subject_id: column.text,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),
  learning_sessions: new Table(
    {
      user_id: column.text,
      course_id: column.text,
      skill_id: column.text,
      started_at: column.text,
      ended_at: column.text,
      duration_min: column.integer,
      notes: column.text,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),
  reviews: new Table(
    {
      user_id: column.text,
      flashcard_id: column.text,
      skill_id: column.text,
      rating: column.integer,
      reviewed_at: column.text,
      fsrs_state: column.text,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),

  // --- Progress (LIMITED mirror, 03 S4.2) --------------------------------------
  skill_states: new Table(
    {
      user_id: column.text,
      skill_id: column.text,
      level: column.text,
      freshness: column.text,
      confidence: column.real,
      last_evidence_at: column.text,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),
  progress_snapshots: new Table(
    {
      user_id: column.text,
      taken_at: column.text,
      payload: column.text,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),

  // --- Discovery ----------------------------------------------------------------
  discovery_items: new Table(
    {
      user_id: column.text,
      title: column.text,
      question: column.text,
      why_now: column.text,
      factual_summary: column.text,
      sources: column.text,
      kind: column.text,
      status: column.text,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),
  gaps: new Table(
    {
      user_id: column.text,
      kind: column.text,
      description: column.text,
      evidence_refs: column.text,
      detected_at: column.text,
      status: column.text,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),

  // --- Artifact (metadata + r2_key ONLY, AD-16) --------------------------------
  artifacts: new Table(
    {
      user_id: column.text,
      kind: column.text,
      title: column.text,
      mime_type: column.text,
      r2_key: column.text,
      size_bytes: column.integer,
      source_event_id: column.text,
      context_task_id: column.text,
      context_course_id: column.text,
      status: column.text,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),

  // --- Integrations ---------------------------------------------------------------
  automations: new Table(
    {
      user_id: column.text,
      name: column.text,
      trigger_: column.text,
      action: column.text,
      enabled: column.integer,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
      last_run_at: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),

  // --- Identity -------------------------------------------------------------------
  user_context: new Table(
    {
      user_id: column.text,
      theme: column.text,
      theme_style: column.text,
      coaching_prefs: column.text,
      prefs_added: column.text,
      prefs_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
      discovery_profile: column.text,
      features: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),

  // --- Ascent (03 S4.2 read-only mirror, wave 3 W3-E2) ---------------------------
  ascent_paths: new Table(
    {
      user_id: column.text,
      goal: column.text,
      target_skill: column.text,
      target_date: column.text,
      steps: column.text,
      depth: column.text,
      baseline: column.text,
      status: column.text,
      adaptations: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'], status: ['status'] } },
  ),

  // --- GoalProject (wave 3 HEPHAESTUS) -------------------------------------------
  user_goals: new Table(
    {
      user_id: column.text,
      goal: column.text,
      crdt_added: column.text,
      crdt_removed: column.text,
      local_mutation_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),
  // --- (PowerSync: "stored internally, but not accessible"). -----------------
  focus_profiles: new Table(
    {
      user_id: column.text,
      name: column.text,
      method: column.text,
      base_minutes: column.integer,
      rest_minutes: column.integer,
      rounds: column.integer,
      task_id: column.text,
      display_on_focus_page: column.integer,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { user: ['user_id'] } },
  ),
  discovery_vault: new Table(
    {
      user_id: column.text,
      domaine: column.text,
      vault_md: column.text,
      vault_hash: column.text,
      runs_manifest: column.text,
      storage_prefix: column.text,
      created_at: column.text,
      updated_at: column.text,
      archived: column.integer,
    },
    { indexes: { user: ['user_id'] } },
  ),
});

/**
 * The client schema tables, keyed by table name — asserted against the frozen
 * `POWERSYNC_SCHEMA.mirrorTables` (`powersync.ts`) in the round-trip test:
 * a table present in one and missing from the other is an AD-15 drift event.
 */
export const auroraSchemaTableNames = (): string[] =>
  // `tables` est un tableau : `Object.keys` renverrait les INDEX ('0','1',…)
  // et non les noms de table — un défaut silencieux, corrigé ici.
  AuroraPowerSyncSchema.tables.map((t) => t.name);

/** Convenience: the frozen mirror table set (kept in `powersync.ts`). */
export const POWERSYNC_MIRROR_TABLES: readonly string[] = [
  ...Object.values(POWERSYNC_SCHEMA.mirrorTables).flat(),
];
