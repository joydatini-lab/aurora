/**
 * Progress module — evidence model (ADR S18.3, F-07).
 *
 * Progress is the SOLE producer of `progress_evidences` rows + the
 * `ProgressEvidenceCreated` event (F-07). Other modules emit their own
 * events (TaskCompleted, FlashcardReviewed, GoalUpdated,
 * DiscoveryItemCreated); Progress QUALIFIES them into evidence — no one
 * else writes `progress_evidences` (AD-7 single-writer).
 */
import type {
  FlashcardReviewedEvent,
  ProgressEvidence,
  TaskCompletedEvent,
} from '@aurora/domain';

/** The evidence kinds (ADR S18.3) — domain SSoT. */
export type EvidenceType = ProgressEvidence['type'];

/** The observed levels (ADR S18.2 scale) — domain SSoT. */
export type EvidenceLevel = ProgressEvidence['level'];

const LEVELS: readonly EvidenceLevel[] = [
  'discovered',
  'comprehended',
  'recalled',
  'guided-application',
  'autonomous-application',
  'novel-problem',
  'mastered',
  'expert',
];

export function levelIndex(level: EvidenceLevel): number {
  const i = LEVELS.indexOf(level);
  if (i < 0) throw new Error(`progress/unknown_level: ${level}`);
  return i;
}

export const EVIDENCE_TYPES: readonly EvidenceType[] = [
  'qcm',
  'active-recall',
  'standard-exercise',
  'new-exercise',
  'personal-explanation',
  'error-correction',
  'project',
  'professional-application',
  'successful-repetition',
];

/**
 * Qualify a `TaskCompleted` event into a `ProgressEvidence` (S18.3:
 * evidence minimum dataset = skill/goal, observed level, evidence, date,
 * freshness, context, confidence). Pure + deterministic given `now`.
 */
export function evidenceFromTaskCompleted(
  ev: TaskCompletedEvent,
  opts: { now: string; skillId?: string; confidence?: number; context?: string },
): ProgressEvidence {
  void opts.now;
  return {
    id: '',
    userId: ev.payload.userId,
    skillId: opts.skillId ?? ev.payload.taskId,
    goalId: undefined,
    type: 'successful-repetition',
    level: 'recalled',
    confidence: clamp01(opts.confidence ?? 0.6),
    sourceEventId: ev.eventId,
    observedAt: ev.payload.completedAt,
    context: opts.context ?? `task:${ev.payload.taskId}`,
  };
}

/** Qualify a `FlashcardReviewed` event (memory evidence, S18.2/18.3:
 *  recognition vs recall). */
export function evidenceFromFlashcardReviewed(
  ev: FlashcardReviewedEvent,
  opts: { now: string; skillId?: string; confidence?: number; context?: string },
): ProgressEvidence {
  // Rating scale 0..5 (typical FSRS): >=3 → recalled, else fragile.
  const recalled = ev.payload.rating >= 3;
  return {
    id: '',
    userId: ev.payload.userId,
    skillId: opts.skillId,
    goalId: undefined,
    type: 'active-recall',
    level: recalled ? 'recalled' : 'comprehended',
    confidence: clamp01(opts.confidence ?? (recalled ? 0.8 : 0.5)),
    sourceEventId: ev.eventId,
    observedAt: opts.now,
    context: opts.context ?? `card:${ev.payload.cardId} rating=${ev.payload.rating}`,
  };
}

/**
 * M-63 (S6, plan v2 Veille + Chat agentique, ADR mirror-contract.md) —
 * qualifie une détection Miroir validée (la commande `progress.evidence_create`
 * du kernel, M-63) en une `ProgressEvidence` de type `personal-explanation`.
 *
 * Le miroir produit une REFORMULATION explicite du sujet (le bloc « Ce que
 * j'ai compris » de la carte M-62) : c'est une preuve d'explication
 * personnelle (le doc `learning/overview.md` §21, le SSoT M-61) — pas un
 * QCM ni un exercice. La provenance AD-11 (le `nodeId` du corpus qui a
 * déclenché la détection) traverse le payload (`sourceNode`) et est
 * qualifiée dans `sourceEventId` + `context` de la row : le downstream
 * (l'événement `ProgressEvidenceCreated` AD-9, les recomputes) lit
 * l'origine sans relire le corpus.
 *
 * Invariant F-07 (le plus critique du sprint) : une détection NON validée
 * n'émet JAMAIS de preuve. Le bouton « Valider » du chat M-62 porte
 * `validated: true` (la confirmation utilisateur, ADR §5) — sans ce flag,
 * le module Progress refuse (zéro row `progress_evidences`). C'est le
 * module Progress qui écrit la row + émet l'événement (AD-2 single-writer)
 * : le kernel n'émet que la commande typée.
 */
export function evidenceFromMirrorValidation(
  input: {
    /** le sujet de la détection (le `skillId` du run miroir, M-62). */
    skillId?: string;
    /** le `kind` SSoT de la finding (le vocabulaire Learning, M-61). */
    kind?: string;
    /** la confirmation utilisateur (le bouton « Valider », ADR §5). */
    validated?: boolean;
    /** la provenance AD-11 optionnelle (le `nodeId` du corpus). */
    sourceNode?: string;
    /** l'identité du propriétaire de la row (le kernel ne porte PAS de
     *  userId — c'est le module Progress qui le sait, AD-7). */
    userId?: string;
  },
  opts: { now: string; userId: string },
): ProgressEvidence {
  // Invariant F-07 : la validation est la SEULE entrée qui produit une
  // preuve miroir. Le payload sans le flag `validated: true` = zéro row.
  if (input.validated !== true) {
    throw new Error('progress/mirror_unvalidated: zéro preuve sans validation (F-07)');
  }
  const context = [
    'mirror',
    input.sourceNode ? `node:${input.sourceNode}` : undefined,
    input.kind ? `kind:${input.kind}` : undefined,
  ]
    .filter(Boolean)
    .join(' ');
  return {
    id: '',
    userId: opts.userId,
    skillId: input.skillId,
    goalId: undefined,
    type: 'personal-explanation',
    level: 'comprehended',
    confidence: 0.7,
    sourceEventId: input.sourceNode,
    observedAt: opts.now,
    context,
  };
}

/**
 * The sole-writer factory for a raw `ProgressEvidence` (AD-7): Progress is
 * the only module that inserts `progress_evidences` rows. `id` + row ids
 * are allocated by the persisting side (server ULID). `now` injectable
 * (deterministic tests).
 */
export function buildEvidence(input: {
  userId: string;
  skillId?: string;
  goalId?: string;
  type: EvidenceType;
  level: EvidenceLevel;
  confidence?: number;
  sourceEventId?: string;
  observedAt: string;
  context?: string;
}): ProgressEvidence {
  if (!EVIDENCE_TYPES.includes(input.type)) {
    throw new Error(`progress/unknown_evidence_type: ${input.type}`);
  }
  return {
    id: '',
    userId: input.userId,
    skillId: input.skillId,
    goalId: input.goalId,
    type: input.type,
    level: input.level,
    confidence: clamp01(input.confidence ?? 0.5),
    sourceEventId: input.sourceEventId,
    observedAt: input.observedAt,
    context: input.context,
  };
}

/** Clamp confidence to 0..1 (domain invariant, 01 S4.4). */
export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
