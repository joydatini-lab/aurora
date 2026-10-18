/**
 * veille-create-ssoT.ts (M-45, v2 MVP Veille + Chat agentique, S4 — plan
 * 2026-10-17 L478–488, écran 15 « Nouvelle veille »).
 *
 * Le SSoT PUR du formulaire de création d'une veille (zéro React, zéro
 * réseau, testable par `node:test` sous `--experimental-strip-types`) :
 *
 *   - `buildVeilleCreatePayload(form)` : la validation (Nom + Sujet +
 *     userId requis, AD-13 : jamais un payload factice) + le mapping
 *     cadence→cron (jour/semaine/mois/trimestre + jour + heure) → la
 *     commande G1 EXACTE du writer M-41 (`applyAutomationCommand` de
 *     `packages/integrations/src/automation-writer.ts`) :
 *
 *       { ok: true, command: 'integrations.automation_create',
 *         payload: { name, trigger:'schedule', schedule:<cron>,
 *                   jobKind:'research', action:<sujet>, userId } }
 *
 *     Le trigger est `schedule` par défaut (Q1 gelé S0 : `event` /
 *     `condition` = les variants Réactif/Conditionnel, hors MVP — les
 *     stubs honnêtes du formulaire B, Q6 lot suivant). L'app n'écrir
 *     JAMAIS `automations` elle-même (AD-7) : la surface `.tsx` émet
 *     cette commande, le module Integrations l'applique (single-writer).
 *
 *   - `VEILLE_CADENCES` / `VEILLE_DAYS` : les SSoT fermés du formulaire
 *     (les cadences + les jours de semaine du cron POSIX 0–6, 1 = lundi).
 *
 * Cohérence SSoT : le cron généré ici EST lu par `cadenceLabel` de
 * `components/veille/veille-rapport.js` (le sous-titre « · mensuel » du
 * rapport/carte, le mapping INVERSE du formulaire — jamais dupliqué).
 *
 * Bornes (AD-1 / AD-13) : cadence inconnue → rejet, jamais un cron
 * inventé ; `weekDay` borné 0–6 (le 7 est l'alias du 0, dégradé au 0) ;
 * heure/min bornées 0–23 / 0–59 (dégradées au 0, jamais un cron invalide).
 */

/** Les cadences fermes du formulaire (le SSoT de l'écran 15). */
export const VEILLE_CADENCES = ['jour', 'semaine', 'mois', 'trimestre'] as const;
export type VeilleCadence = (typeof VEILLE_CADENCES)[number];

/** Les jours de semaine du cron POSIX (0–6, 0 = dimanche ; le dow=7 est
 *  l'alias du 0 — borné ici à 6, le `dow=6` = le samedi du cron 0–6,
 *  l'affichage « Dimanche (semaine suivante) » du formulaire). */
export const VEILLE_DAYS = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche (semaine suivante)',
] as const;

/** Les familles de sources de l'écran 15 (les checkbox du formulaire). */
export const VEILLE_SOURCE_FAMILIES = [
  'academiques',
  'web',
  'professionnelles',
] as const;
export type VeilleSourceFamily = (typeof VEILLE_SOURCE_FAMILIES)[number];

/** Le formulaire du « Nouvelle veille » (le SSoT de l'écran 15). */
export interface VeilleCreateForm {
  /** Nom du programme (REQUIS — `name` du G1). */
  name: string;
  /** Sujet à surveiller (REQUIS — `action` du G1, le payload du run). */
  subject: string;
  /** Cadence du run (le SSoT fermé, par défaut « mois » de la maquette). */
  cadence: VeilleCadence;
  /** Le jour du run : 1–28 (mois/trimestre) — le `dayOfMonth` du cron. */
  dayOfMonth?: number;
  /** Le jour de semaine (semaine) : 0–6 (le `dow` du cron, 1 = lundi). */
  weekDay?: number;
  /** L'heure du run (0–23, par défaut 8 — le « 08:00 » de la maquette). */
  hour?: number;
  /** Les minutes du run (0–59, par défaut 0). */
  minutes?: number;
  /** Les familles de sources cochées (AD-1 : informatives au MVP — le
   *  payload du run `research` ne porte pas encore le SSoT fermé des
   *  familles ; l'agent lit le sujet, les familles restent du formulaire). */
  sourceFamilies?: readonly VeilleSourceFamily[];
  /** Push à la fin de chaque run (le `notification_job`, M-72). */
  pushOnRun?: boolean;
  /** L'identité du user (PORTÉE par la surface via `currentSession`,
   *  AD-7 : le port est userId-borné — jamais un insert anonyme). */
  userId?: string;
}

/** La commande G1 du writer M-41 (`AutomationCreatePayload` de
 *  `packages/integrations/src/automation-writer.ts`) : le payload EXACT
 *  qu'`applyAutomationCommand` consomme (le kernel dégrade l'inconnu à
 *  `'notification'` — ici le SSoT `'research'`, le job du run veille). */
export type VeilleCreateCommand = {
  ok: true;
  command: 'integrations.automation_create';
  payload: {
    name: string;
    trigger: 'schedule';
    schedule: string;
    jobKind: 'research';
    action: string;
    userId: string;
  };
};

/** Le résultat du SSoT : la commande G1, ou le rejet validé (AD-13). */
export type VeilleCreateResult =
  | VeilleCreateCommand
  | { ok: false; error: 'name_required' | 'subject_required' | 'user_required' | 'cadence_unknown' };

const clamp = (n: number | undefined, min: number, max: number, fallback: number): number => {
  if (typeof n !== 'number' || Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
};

/** Le mapping cadence → expression cron (le SSoT du G1 `schedule`).
 *  Bornes : heure 0–23 / minute 0–59 (dégradées au 0 — jamais un cron
 *  invalide) ; le jour est 1–28 (le 29–31 est le cas exotique des mois
 *  courts, hors SSoT du formulaire → rejeté par le clamp à 28). */
function buildSchedule(form: VeilleCreateForm): string {
  const minute = clamp(form.minutes, 0, 59, 0);
  const hour = clamp(form.hour, 0, 23, 8);
  switch (form.cadence) {
    case 'jour':
      // « Chaque jour à H:M » — le quotidien (le `cadenceLabel` :
      // `m h * * *` = quotidien).
      return `${minute} ${hour} * * *`;
    case 'semaine': {
      // « Chaque <dow> à H:M » — le dow POSIX 0–6 (1 = lundi) ; le
      // dow=7 (l'alias du 0) est dégradé au 0 (le dimanche).
      const dow = clamp(form.weekDay, 0, 6, 1);
      return `${minute} ${hour} * * ${dow}`;
    }
    case 'mois': {
      // « Le <D> du mois à H:M » (le 1er par défaut de la maquette).
      const dom = clamp(form.dayOfMonth, 1, 28, 1);
      return `${minute} ${hour} ${dom} * *`;
    }
    case 'trimestre': {
      // « Le <D> de janv/avr/juil/oct » — le SSoT du `cadenceLabel`
      // inverse (`0 8 1 1,4,7,10 *` = trimestriel).
      const dom = clamp(form.dayOfMonth, 1, 28, 1);
      return `${minute} ${hour} ${dom} 1,4,7,10 *`;
    }
  }
}

/** Construire la commande G1 EXACTE depuis le formulaire (le SSoT du
 *  M-45 : la surface `.tsx` le consomme, le writer M-41 l'applique). */
export function buildVeilleCreatePayload(form: VeilleCreateForm): VeilleCreateResult {
  // La validation SSoT (AD-13 : jamais un payload factice) :
  const name = form.name?.trim();
  const subject = form.subject?.trim();
  const userId = form.userId?.trim();
  if (!name) return { ok: false, error: 'name_required' };
  if (!subject) return { ok: false, error: 'subject_required' };
  if (!userId) return { ok: false, error: 'user_required' };
  if (!(VEILLE_CADENCES as readonly string[]).includes(form.cadence)) {
    return { ok: false, error: 'cadence_unknown' };
  }

  return {
    ok: true,
    command: 'integrations.automation_create',
    payload: {
      name,
      trigger: 'schedule',
      schedule: buildSchedule(form),
      jobKind: 'research',
      action: subject,
      userId,
    },
  };
}
