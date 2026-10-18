/**
 * M-42 — Matérialiseur cron → job `research` (AD-8, plan S4 veille).
 *
 * Une automation due (`trigger:'schedule'`, cron satisfait, non déjà
 * matérialisée cette minute) produit UN job `research` de `job_queue`
 * avec le payload EXACT du handler discovery (packages/discovery/src/jobs.ts) :
 *   `module:'discovery'`, `op:'multi-source'`, `discoverySheet:true`,
 *   `vaultDomaine`, `channelId`, `query:{topic,domains,userId}`
 * → « run with memory » : le handler lit le vault avant de chercher (M-43).
 *
 * Idempotence (AD-8, 0010/0011 pattern) : `dedupKey =
 * kind|automationId|minute` — déjà exposé par `automations.ts`
 * (`automationDedupKey`). Le port `JobEnqueuePort` enfile avec
 * `ON CONFLICT DO NOTHING` : un double tir du cron (même minute) est
 * un no-op.
 *
 * D1 (MVP) : les triggers `event`/`condition` ne se matérialisent PAS
 * par le cron (leur déclenchement vient de l'événement AD-9, lot
 * suivant) ; le tick cron ne produit QUE les jobs de veilles
 * (jobKind:'research'). Les jobKind dégradés ('notification', etc.)
 * sont déjà couverts par `cronInsertSql` — le matérialiseur ne les
 * rejoue pas (pas de double enfilement).
 *
 * AD-8 : le module EST autorisé à enfileter (seul le dispatcher ne le
 * fait pas). La write `job_queue` est service_role (verb EF
 * `materialize_due_automations` dans fn-integrations) ; le module
 * n'importe JAMAIS le vendor (AD-1).
 *
 * Pure + déterministe : le minute courant (`nowMinute`) est porté par
 * l'appelant (l'EF, ou le test) — jamais `Date.now()` interne. Le
 * « due » d'une row est évalué contre sa propre `lastMaterializedMinute`
 * (le port EF mappera `last_run_at` de la row `automations` sur
 * `lastMaterializedMinute` ; une row NULL/absente = jamais couru = due).
 */
import { automationDedupKey } from './automations.ts';
export { automationDedupKey };

// ---------------------------------------------------------------------------
// Contrat des rows portées par l'EF (read service_role `automations`)
// ---------------------------------------------------------------------------

/** Une row `automations` lue par le tick EF — le champ
 *  `lastMaterializedMinute` = la minute (epoch-seconds/60) du dernier
 *  tick couru, mappée par l'EF depuis `automations.last_run_at`
 *  (migration 0026) ; `null` = jamais couru → due. */
export interface MaterializeDueAutomationRow {
    id: string;
    userId: string;
    /** 'schedule' uniquement côté due (le tick ne traite que ceux, D1). */
    trigger: 'schedule' | 'event' | 'condition';
    /** expression cron (informationnelle — le tick sait qu'il est
     *  satisfait, la row a été pré-filtrée par l'EF). */
    cron?: string;
    /** le JobKind de l'automation (AD-15 fermé). */
    jobKind: string;
    enabled: boolean;
    /** le sujet / topic de la veille (l'action G1). */
    action?: string;
    /** le domaine du vault (join 1 vault / programme,
     *  `domaine === automation.id` ; porté par l'EF). */
    domain: string;
    /** l'époque minute du dernier tick couru, ou null si jamais couru. */
    lastMaterializedMinute: number | null;
}

// ---------------------------------------------------------------------------
// Port d'enfilement (AD-8 : le module enfile, le dispatcher exécute)
// ---------------------------------------------------------------------------

/** Un job à enfileter sur `job_queue` (les champs du port — l'EF
 *  mappera sur l'insert REST service_role, `ON CONFLICT DO NOTHING`). */
export interface MaterializedJob {
    /** ULID de job (idempotent : tick + automation id + minute). */
    id: string;
    userId: string;
    /** le JobKind fermé (AD-15) — 'research' pour la veille. */
    kind: string;
    /** module propriétaire du payload ('discovery' pour la veille). */
    module: string;
    payload: Record<string, unknown>;
    /** la clé de déduplication AD-8 : `kind|automationId|minute`. */
    dedupKey: string;
    /** ISO du tick courant (le tick a couré maintenant). */
    dueAt: string;
}

/** Port d'enfilement `job_queue` (le module EST autorisé à enfileter,
 *  AD-8 — seul le dispatcher ne le fait pas). `ON CONFLICT DO NOTHING`
 *  sur `dedupKey` : un re-dispatch du même tick est un no-op. */
export interface JobEnqueuePort {
    /** Enfile le job ; `deduped=true` si la row existait déjà
     *  (re-dispatch du même tick, 0010/0011 pattern). */
    enqueue(job: MaterializedJob): { ok: boolean; deduped: boolean };
}

export interface MaterializeResult {
    /** le nombre de jobs réellement enfilés (deduped exclus). */
    enqueued: number;
    /** les ids des automations traitées (diagnostic EF). */
    automationIds: string[];
}

// ---------------------------------------------------------------------------
// Payload EXACT du handler discovery (jobs.ts L157-270)
// ---------------------------------------------------------------------------

/** Le payload EXACT que le handler `research` du module Discovery
 *  attend (packages/discovery/src/jobs.ts) pour un run « avec mémoire »
 *  (M-43 : `dedupeAgainstVault` + verdict du delta). */
function buildResearchJobPayload(
    row: MaterializeDueAutomationRow,
): Record<string, unknown> {
    return {
        module: 'discovery',
        op: 'multi-source',
        discoverySheet: true,
        vaultDomaine: row.domain,
        channelId: 'default',
        sheetTitle: row.action ?? row.domain,
        query: {
            userId: row.userId,
            topic: row.action ?? row.domain,
            domains: [row.domain],
            kinds: ['web', 'academic', 'professional'],
        },
    };
}

// ---------------------------------------------------------------------------
// Coeur du matérialiseur (pur + déterministe)
// ---------------------------------------------------------------------------

/** Est l'automation due au tick courant ?
 *  - trigger 'schedule' uniquement (D1 : event/condition ne se
 *    matérialisent pas par le cron) ;
 *  - `jobKind === 'research'` (la veille ; les kind dégradés sont déjà
 *    couverts par `cronInsertSql`, pas de double enfilement) ;
 *  - `enabled` ;
 *  - non déjà matérialisée à cette minute (`lastMaterializedMinute <
 *    nowMinute` ou `null`). */
function isDue(
    row: MaterializeDueAutomationRow,
    nowMinute: number,
): boolean {
    if (row.trigger !== 'schedule') return false;
    if (row.jobKind !== 'research') return false;
    if (!row.enabled) return false;
    if (row.lastMaterializedMinute !== null && row.lastMaterializedMinute >= nowMinute) {
        return false;
    }
    return true;
}

/**
 * Matérialiser les automations dues (M-42, AD-8) : pour chaque row due,
 * enfile UN job `research` de `job_queue` avec le payload EXACT du
 * handler discovery (run « avec mémoire », M-43). Idempotent : le
 * `dedupKey` (kind|automationId|minute) + le port `ON CONFLICT DO
 * NOTHING` font d'un double tir du cron un no-op.
 *
 * Le ULID de job est déterministe (`aut|<id>|<minute>` — stable pour
 * un tick + une automation ; le `dedupKey` reste la clé d'idempotence
 * AD-8). Le paramètre `nowMinute` est porté par l'appelant pour le
 * `dueAt` du job ; la row evaluable est contre sa propre
 * `lastMaterializedMinute` (l'EF mappera la colonne SSoT sur le row).
 */
export function materializeDueAutomations(
    automations: readonly MaterializeDueAutomationRow[],
    enqueue: JobEnqueuePort,
    nowMinute: number,
): MaterializeResult {
    let enqueued = 0;
    const ids: string[] = [];
    for (const row of automations) {
        if (!isDue(row, nowMinute)) continue;
        const minute = nowMinute;
        const dedupKey = automationDedupKey(row.id, minute, 'research');
        const job: MaterializedJob = {
            id: `aut|${row.id}|${minute}`,
            userId: row.userId,
            kind: 'research',
            module: 'discovery',
            payload: buildResearchJobPayload(row),
            dedupKey,
            dueAt: new Date(minute * 60_000).toISOString(),
        };
        const r = enqueue.enqueue(job);
        if (r.ok && !r.deduped) enqueued += 1;
        ids.push(row.id);
    }
    return { enqueued, automationIds: ids };
}
