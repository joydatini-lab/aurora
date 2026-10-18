/**
 * skill-slash-parse.ts — M-22 (plan v2 S2, Q13) : le SSoT pur de
 * l'appel `/nom` dans le brouillon du chat (la page /agent et le test
 * `skills-wiring.test.ts` consomment le MÊME module — zéro React,
 * zéro réseau, zéro PowerSync, AD-7).
 *
 * Contrat (le plan v2 S2, Q13) :
 *  - Quand le brouillon commence par `/`, le PREMIER mot après la
 *    barre est le nom du skill appelé.
 *  - La résolution est EXACTE (jamais floue) sur le nom / la key des
 *    skills installés : un match UNIQUE → le skill est forcé dans le
 *    taskProfile du run (`forceSkillKey`) ; 0 ou 2+ matches → pas de
 *    forçage (le kernel garde l'indexation normale, les skills actifs
 *    restent le layer 1 du prompt).
 *  - Un brouillon qui ne commence PAS par `/` → pas d'appel du tout
 *    (l'indexation des skills actifs reste gérée par le kernel).
 *
 * Le composant de parsing est factorisé ici (pas dans la page) pour
 * être testable + réutilisable (la page l'importe, le test aussi).
 */

/** Le shape minimal d'un skill installé pour le parsing (le SSoT du
 *  `UserSkillRow` réduit aux champs que le parsing utilise). */
export interface SkillCandidate {
  skillKey: string;
  name: string;
  /** présent dans `UserSkillRow` — le label court de la sous-écran. */
  trigger?: string | null;
  objective?: string | null;
  active: boolean;
}

/** Résultat du parsing d'un brouillon qui peut porter un appel `/nom`. */
export interface SkillSlashCall {
  /** le nom brut tapé après le `/` (minuscules, non-vide). */
  name: string;
  /** le skill forcé (match UNIQUE exact sur nom / key) — null sinon. */
  skill: SkillCandidate | null;
  /** tous les matches exacts (2+ = ambigu, le forçage est refusé). */
  candidates: SkillCandidate[];
}

/**
 * Parse le premier mot `/nom` d'un brouillon et le résout dans les
 * skills installés (match exact nom / key, jamais flou).
 *
 * `null` = le brouillon ne commence pas par `/` (pas d'appel) — le
 * caller garde l'indexation normale du kernel.
 */
export function parseSkillSlashCall(
  draft: string,
  skills: readonly SkillCandidate[],
): SkillSlashCall | null {
  const t = draft.trimStart();
  if (!t.startsWith('/')) return null;
  const rest = t.slice(1);
  const ws = rest.search(/\s/);
  const name = (ws === -1 ? rest : rest.slice(0, ws)).toLowerCase();
  if (!name) {
    // `/` seul ou `/  …` (nom vide) : l'appel est détecté mais aucun
    // skill n'est forcé (le kernel garde l'indexation normale).
    return { name: '', skill: null, candidates: [] };
  }
  const candidates = skills.filter(
    (s) => s.name.toLowerCase() === name || s.skillKey.toLowerCase() === name,
  );
  return {
    name,
    skill: candidates.length === 1 ? candidates[0]! : null,
    candidates,
  };
}

/**
 * Injecte le skill forcé dans le taskProfile du run (`forceSkillKey`).
 * Le kernel reçoit le skill déjà résolu (le parsing est fait CÔTÉ
 * APP, pas par le model) ; le module skills l'active pour le run si
 * inactif (AD-7 : le kernel émet, le module applique — pas de write
 * persistante depuis le chat).
 */
export function withForcedSkill<
  T extends { forceSkillKey?: string } = Record<string, unknown>,
>(profile: T, skill: SkillCandidate | null | undefined): T {
  if (!skill) return profile;
  return { ...profile, forceSkillKey: skill.skillKey };
}
