/**
 * Knowledge module — event relationship (AD-9).
 *
 * Knowledge produces NO domain event. It is a CONSUMER of exactly two:
 *   - `ProgressEvidenceCreated` (Progress) → updates `node_state`
 *   - `SkillStateChanged`        (Progress) → updates `node_state`
 *
 * This is why there is no `buildXxx` here, unlike `@aurora/productivity`
 * (`TaskCompleted` + `GoalUpdated`) or `@aurora/artifact` (`ArtifactGenerated`).
 * The AD-9 vocabulary is CLOSED at 9 events; "Knowledge should emit
 * SomethingHappened" is not an option the contract offers, and inventing a 10th
 * event would break the SSoT union in `packages/domain/src/events.ts`.
 *
 * The relation is recorded in code rather than a comment so a future reader can
 * assert it: see `KNOWLEDGE_CONSUMED_EVENTS` and the test that pins it.
 */

/**
 * The two events Knowledge observes to maintain `node_state` (AD-6/F-02).
 * Consuming them is how Knowledge becomes the sole writer of that table
 * WITHOUT Progress reaching into a Knowledge-owned table.
 */
export const KNOWLEDGE_CONSUMED_EVENTS = [
  'ProgressEvidenceCreated',
  'SkillStateChanged',
] as const;

export type KnowledgeConsumedEvent = (typeof KNOWLEDGE_CONSUMED_EVENTS)[number];

/**
 * Knowledge's producer list, which is empty by contract (AD-9).
 * Exported so the invariant is testable instead of implied.
 */
export const KNOWLEDGE_PRODUCED_EVENTS: readonly string[] = [];
