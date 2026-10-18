/**
 * mirror-findings-card.ts — la carte du retour structuré Miroir (S6 M-62,
 * plan v2 Veille + Chat agentique). Vit DANS le chat (/agent), pas une
 * page dédiée (le contrat M-61, `docs/adr/mirror-contract.md`).
 *
 * Design SSoT : `stitch_design_system_optimization/agent_mode_miroir_fraunces/
 * code.html` (AuroraEvaluationCard) — les 3 blocs :
 *   1. « CE QUE J'AI COMPRIS » (reformulation, corpus-dominant AD-11)
 *   2. « LACUNES DÉTECTÉES » (findings typés SSoT Learning — ADR
 *      M-61 : les `kind` sont `gap | contradiction | error` du module
 *      Learning, JAMAIS les labels « Manquant / Fragile » du briefing,
 *      signalé en écart dans le rapport S6)
 *   3. « QUESTION POUR VOUS » (la relance ciblée)
 * + le sujet (l'état de Stitch « Sujet : … ») + les 2 actions du
 *   maquette (« Planifier un Focus » / « Créer une veille ») + la
 *   validation (M-63 : « Valider » → `progress.evidence_create`).
 *
 * AD-7 (single-writer) : ce module ne produit QUE des `command` typées
 * (thin emitters) — zéro écriture directe, zéro PowerSync, zéro réseau.
 * Les modules propriétaires (Productivity/Focus, Discovery, Progress)
 * appliquent les mutations ; le chat n'émet jamais `ProgressEvidence`
 * (F-07 : seul Progress l'émet, via la commande typée + confirmation).
 *
 * COULEUR DYNAMIQUE (AD-17) : le CSS (`agent.css`, `.agent-mirror-*`)
 * lit UNIQUEMENT les tokens `var(--aurora-*)` — zéro hex hardcodé ici.
 *
 * Structure testable (wiring node:test, S6 M-62) : les fonctions pures
 * (`MIRROR_FINDING_*`, `buildMirrorFindingsCard`, `mirrorCardActions`)
 * sont testées sans React DOM ; le composant React (le bloc `<div>`)
 * est le consommateur de ces pures fonctions (zéro logique dupliquée).
 */
import type { MirrorFinding } from '@aurora/learning';

// ---------------------------------------------------------------------------
// 1. Vocabulaire SSoT (M-61 : le doc Learning l'emporte sur le briefing)
// ---------------------------------------------------------------------------

/** Les 3 `kind` SSoT du détecteur Learning (`mirror-cognitive.ts`). */
export const MIRROR_FINDING_KINDS = ['gap', 'contradiction', 'error'] as const;
export type MirrorFindingKind = (typeof MIRROR_FINDING_KINDS)[number];

/**
 * Les labels FR de la carte (ADR M-61 : `gap`=lacune, `contradiction`=
 * contradiction, `error`=erreur). Les labels du briefing
 * (« Manquant » / « Fragile ») ne sont PAS ici — écart signalé.
 */
export const MIRROR_FINDING_LABELS: Record<MirrorFindingKind, string> = {
  gap: 'Lacune',
  contradiction: 'Contradiction',
  error: 'Erreur',
};

/** Le label FR d'un `kind` SSoT (inconnu → « Finding » neutre, AD-1). */
export function mirrorFindingLabel(kind: string): string {
  return MIRROR_FINDING_LABELS[kind as MirrorFindingKind] ?? 'Finding';
}

/**
 * Une finding de la carte = le SSoT `MirrorFinding` du module Learning
 * (zéro redéclaration, AD-15 : le type est la SSoT, pas une copie).
 */
export type MirrorCardFinding = MirrorFinding;

// ---------------------------------------------------------------------------
// 2. Structure de la carte (les 3 blocs — ordre Stitch AuroraEvaluationCard)
// ---------------------------------------------------------------------------

export type MirrorCardBlockKind = 'reformulation' | 'findings' | 'question';

export interface MirrorCardBlock {
  kind: MirrorCardBlockKind;
  /** reformulation / question : le texte du bloc (les 2 sont du texte). */
  text?: string;
  /** findings : les findings typées SSoT (l'ordre du détecteur est
      conservé — l'état vide = liste vide, le bloc reste affiché
      avec « Aucune lacune détectée. » (AD-13 : jamais de bloc
      masqué, l'erreur est affichée)). */
  findings?: MirrorCardFinding[];
}

export interface MirrorCardPayload {
  /** Le sujet de l'analyse (le dernier cours / la veille du M-62 flow). */
  subjectLabel?: string;
  /** Le contenu des 3 blocs du contrat M-61. */
  reformulation: string;
  findings: MirrorCardFinding[];
  question: string;
}

export interface MirrorFindingsCardModel {
  /** Les 3 blocs du contrat M-61 (ordre Stitch : reformulation, findings,
      question — l'ordre de rendu du composant est fixé par `blocks`). */
  blocks: MirrorCardBlock[];
  /** Le sujet (l'état de Stitch « Sujet : … ») — `undefined` si le
      run n'a pas de subjectId (l'état vide du sujet, AD-13). */
  subjectLabel?: string;
}

/**
 * Construit le modèle de la carte (le pure fonction testable, S6 M-62).
 * L'ordre des blocs est FIXÉ (le contrat M-61 : reformulation →
 * findings typées → question ciblée) — jamais de bloc masqué, le
 * findings vide rend « Aucune lacune détectée. » (AD-13).
 */
export function buildMirrorFindingsCard(
  payload: MirrorCardPayload,
): MirrorFindingsCardModel {
  return {
    subjectLabel: payload.subjectLabel,
    blocks: [
      { kind: 'reformulation', text: payload.reformulation },
      { kind: 'findings', findings: payload.findings },
      { kind: 'question', text: payload.question },
    ],
  };
}

// ---------------------------------------------------------------------------
// 3. Actions de la carte (AD-7 : le chat PROPOSE — commandes typées)
// ---------------------------------------------------------------------------

export interface MirrorCardAction {
  /** La clé stable de l'action (l'UI y attache l'aria-label / le data). */
  id: 'focus.plan' | 'discovery.create' | 'progress.evidence_validate';
  /** Le libellé du Stitch (`« Planifier un Focus »` / `« Créer une
      veille »` / `« Valider »`). */
  label: string;
  /** La commande typée (thin, AD-7) que le module propriétaire applique.
      Le chat n'écrit JAMAIS une table directement (F-07 : seule la
      commande `progress.evidence_create` mène à une `ProgressEvidence`
      — et c'est le module Progress qui la qualifie + écrit, pas le
      chat, pas le kernel : l'agent propose, Progress commite). */
  command: string;
  /** Le payload de la commande (le module cible lit ces champs). */
  payload: Record<string, unknown>;
  /** `true` quand la confirmation utilisateur est OBLIGATOIRE avant
      l'application (ADR §5 : les actions importantes / irréversibles).
      La validation d'une preuve (M-63) = confirmation (briefing §12 :
      OUI). Les 2 actions « Focus » / « Veille » = non destructives,
      pas de confirmation dans ce cas (le module cible décide). */
  requiresConfirmation: boolean;
}

/**
 * Les 3 actions de la carte (le Stitch : 2 boutons — « Planifier un
 * Focus » + « Créer une veille » ; + la validation « Valider » qui est
 * l'action du flow M-63 — elle n'apparaît que si le bloc findings est
 * non vide (zéro finding = zéro preuve à valider, AD-13 état vide).
 *
 * `subjectId` = le sujet du run (le payload des commandes). Le payload
 * « discovery.create » porte `topic` (le sujet du veille) + `source`
 * (= 'mirror', AD-11 provenance : la veille naît d'un miroir, pas d'un
 * clic du module Discovery directement).
 */
export function mirrorCardActions(
  input: { subjectId?: string; subjectLabel?: string },
): MirrorCardAction[] {
  const subject = input.subjectId ?? input.subjectLabel ?? '';
  return [
    {
      id: 'focus.plan',
      label: 'Planifier un Focus',
      // Le module Focus/Productivity applique (le chat n'écrit rien,
      // AD-7) : le command `focus.plan` porte le `skillId` du sujet
      // (le focus cible le skill / le concept du miroir, pas un
      // créneau calendaire arbitraire).
      command: 'focus.plan',
      payload: { skillId: subject },
      requiresConfirmation: false,
    },
    {
      id: 'discovery.create',
      label: 'Créer une veille',
      // Le module Discovery applique (G1 writer automations, lot B) :
      // le command `discovery.create` porte le `topic` (= le sujet du
      // miroir) + `source: 'mirror'` (AD-11 : la provenance de la
      // veille = le run du miroir, jamais un clic du module).
      command: 'discovery.create',
      payload: { topic: subject, source: 'mirror' },
      requiresConfirmation: false,
    },
    {
      id: 'progress.evidence_validate',
      label: 'Valider',
      // M-63 (ADR mirror-contract.md) : la commande typée
      // `progress.evidence_create` (confirmation OBLIGATOIRE — ADR §5,
      // briefing §12). Le module Progress qualifie la détection validée
      // en `ProgressEvidence` (type `personal-explanation`, F-07) +
      // écrit la row + émet `ProgressEvidenceCreated`. Le chat n'émet
      // JAMAIS cet événement (F-07 invariant, AD-2 : seul Progress
      // l'émet).
      command: 'progress.evidence_create',
      payload: { skillId: subject, type: 'personal-explanation', validated: true },
      requiresConfirmation: true,
    },
  ];
}

