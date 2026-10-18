/**
 * M-41 — Writer du module Integrations (AD-7 single-writer, G1/G2/G3).
 *
 * Le kernel (packages/agent tools G1/G2/G3) émet des thin commands
 * `integrations.automation_create|_update|_delete` — il ne JAMAIS écrit
 * `automations` lui-même (AD-7 : le module Integrations est le SEUL qui
 * écrit la table, migration 0008). Ce module est l'unique port d'entrée
 * d'écriture : `applyAutomationCommand(command, writer, archiver?)` mappe
 * la commande kernel sur le port `AutomationWriter` (insert/patch/delete
 * bornés par `id + userId`, RLS user_isolation).
 *
 * Gel G2 (figé 10/14) : une `delete_automation` ARCHIVE le vault de
 * découverte associé (1 vault / programme, join `domaine === automation.id`),
 * elle ne le détruit pas — le port `VaultArchiver` porte la suture ; le
 * flag `archived: true` vivra sur la row `discovery_vault` (décision de
 * migration additive S8.0 ; une table `vault_archives` reste une option).
 *
 * AD-1 discipline : le archiver est optionnel — sans archiver, la delete
 * se borne à `writer.delete` (le vault, s'il existe, reste in touché :
 * dégradation, jamais cassure).
 */
import type { Automation, JobKind } from '@aurora/domain';

// ---------------------------------------------------------------------------
// Ports (AD-1 : optionnels, degradable — jamais de dépendance brute DB)
// ---------------------------------------------------------------------------

/** Port d'écriture `automations` (AD-7 : le module Integrations est le
 *  SEUL qui écrit cette table — le kernel et les apps émettent des
 *  thin commands, jamais de write directe). Borné RLS par `id + userId`. */
export interface AutomationWriter {
    /** G1 — insérer une automation (insert bornée userId). */
    insert(automation: Automation): { status: 'created' | 'error' };
    /** G2 — patcher une automation (verrouiller = `enabled:false`, gel
     *  G2 réversible → non-destructif). Bornée `id + userId`. */
    patch(
        automationId: string,
        userId: string,
        patch: Partial<Pick<Automation, 'name' | 'cron' | 'triggerEvent' | 'action' | 'enabled' | 'jobKind'>> & {
            condition?: string;
        },
    ): { status: 'patched' | 'not_found' | 'error' };
    /** G3 — supprimer une automation. Bornée `id + userId`. */
    delete(automationId: string, userId: string): { status: 'deleted' | 'not_found' | 'error' };
}

/** Port d'archivage du vault de découverte (gel G2 : ARCHIVÉ, pas
 *  détruit). Implémentation serveur : `archived: true` sur la row
 *  `discovery_vault` (user_id, domaine) — décision S8.0, additive. */
export interface VaultArchiver {
    /** Archive le vault du domaine (no-op idempotent si déjà archivé).
     *  @returns true si le vault a été (re)archivé, false si absent. */
    archive(userId: string, domaine: string): boolean;
}

// ---------------------------------------------------------------------------
// Commandes kernel (thin emitters, AD-7) — contrats G1/G2/G3
// ---------------------------------------------------------------------------

/** Payload G1 — `integrations.automation_create` (tools.ts L923 : le
 *  kernel passe uniquement le champ cohérent avec le trigger choisi). */
export interface AutomationCreatePayload {
    name: string;
    trigger: 'schedule' | 'event' | 'condition';
    /** expression cron (trigger 'schedule') */
    schedule?: string;
    /** nom d'événement AD-9 (trigger 'event') */
    triggerEvent?: string;
    /** clé / expression de condition (trigger 'condition') */
    condition?: string;
    /** JobKind fermé AD-15 ; le kernel dégrade l'inconnu à 'notification' */
    jobKind: JobKind | string;
    /** le payload / topic de l'action (ex. le sujet de la veille) */
    action?: string;
    /** l'identité du user (portée par le kernel, AD-7) */
    userId: string;
}

/** Payload G2 — `integrations.automation_update` (le payload kernel EST
 *  l'input : { automationId, patch, userId }). */
export interface AutomationUpdatePayload {
    automationId: string;
    patch: {
        name?: string;
        schedule?: string;
        triggerEvent?: string;
        condition?: string;
        action?: string;
        /** verrouiller = false (gel G2 réversible) */
        enabled?: boolean;
    };
    userId: string;
}

/** Payload G3 — `integrations.automation_delete`. */
export interface AutomationDeletePayload {
    automationId: string;
    userId: string;
}

/** Une thin command émise par le kernel (AD-7 : le kernel ne écrit
 *  JAMAIS les tables modules — il émet, le module applique). */
export type KernelAutomationCommand =
    | { ok: true; command: 'integrations.automation_create'; payload: AutomationCreatePayload }
    | { ok: true; command: 'integrations.automation_update'; payload: AutomationUpdatePayload }
    | { ok: true; command: 'integrations.automation_delete'; payload: AutomationDeletePayload }
    /** AD-1 : le kernel peut dégrader (ok:false) — jamais écrit. */
    | { ok: false; command: string; payload: Record<string, unknown> };

export interface AutomationWriterResult {
    status: 'created' | 'patched' | 'deleted' | 'not_found' | 'error' | 'unhandled';
    /** true si un vault a été archivé (G3 + gel G2). */
    vaultArchived?: boolean;
}

// ---------------------------------------------------------------------------
// Mapping commande → port
// ---------------------------------------------------------------------------

/** Construire l'entité `Automation` SSoT (domain) depuis le payload G1.
 *  `schedule` (cron) mappe sur le champ `cron` de l'entité ; le champ
 *  `condition` n'existe pas dans l'entité SSoT 0008 (il vit dans
 *  `action` jsonb côté DB, ou sera porté par la migration S8.0 — ici,
 *  on le préserve dans `action` par convention additive). */
function automationFromCreatePayload(p: AutomationCreatePayload): Automation {
    const now = new Date().toISOString();
    // Convention join (veille-programs-join) : 1 vault / programme,
    // domaine === automation.id. Le kernel n'émet pas d'id — le
    // générateur de row (DB DEFAULT gen_random_uuid()) le fournit ;
    // ici, un ULID-like déterministe à partir de (userId, name) pour
    // rester pur et idempotent à l'identique payload.
    const id = ulidLike(`${p.userId}|${p.name}|${p.trigger}`);
    const actionParts: string[] = [];
    if (p.action) actionParts.push(p.action);
    if (p.condition) actionParts.push(`condition:${p.condition}`);
    return {
        id,
        userId: p.userId,
        name: p.name,
        trigger: p.trigger,
        cron: p.schedule,
        triggerEvent: p.triggerEvent,
        jobKind: p.jobKind,
        action: actionParts.length ? actionParts.join(' ') : undefined,
        enabled: true,
        createdAt: now,
        updatedAt: now,
    };
}

/** ULID-like déterministe (hex de FNV-1a 32-bit × 3, lisible, pas de
 *  dépendance runtime) — stable pour un payload identique (idempotence
 *  de l'insert côté créateur ; la DB reste SSoT de l'uuid final). */
export function ulidLike(seed: string): string {
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193 ^ 0xdeadbeef;
    let h3 = 0x9dc5811c ^ 0x474d442a;
    for (let i = 0; i < seed.length; i++) {
        const c = seed.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 0x811c9dc5);
        h2 = Math.imul(h2 ^ c, 0x01000193);
        h3 = Math.imul(h3 ^ c, 0x9dc5811c);
    }
    const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
    return `aut_${hex(h1)}${hex(h2)}${hex(h3)}`;
}

/** Appliquer une thin command kernel sur le port `AutomationWriter`
 *  (AD-7 : SEUL chemin d'écriture de `automations`). G3 archive le vault
 *  associé via le port `VaultArchiver` (gel G2 : archivage, pas
 *  destruction). Sans archiver fourni, la delete se dégrade proprement.
 *
 *  Discipline AD-7 : un appel direct `writer.insert/patch/delete` depuis
 *  le kernel est interdit — seul ce mapper est autorisé à appeler le
 *  port, et il est porté par le module Integrations. */
export function applyAutomationCommand(
    command: KernelAutomationCommand,
    writer: AutomationWriter,
    archiver?: VaultArchiver,
): AutomationWriterResult {
    if (!command.ok) return { status: 'unhandled' };

    switch (command.command) {
        case 'integrations.automation_create': {
            const payload = command.payload as AutomationCreatePayload;
            const automation = automationFromCreatePayload(payload);
            const r = writer.insert(automation);
            return { status: r.status };
        }
        case 'integrations.automation_update': {
            const payload = command.payload as AutomationUpdatePayload;
            // Le patch kernel porte `schedule` (cron) — l'entité SSoT
            // s'appelle `cron` ; `condition` n'existe pas dans
            // l'entité (convention additive ci-dessus).
            const { schedule, condition, ...rest } = payload.patch;
            const patch: Parameters<AutomationWriter['patch']>[2] = { ...rest };
            if (schedule !== undefined) patch.cron = schedule;
            if (condition !== undefined) patch.condition = condition;
            // patch vide (le kernel a filtré) = no-op propre.
            if (Object.keys(patch).length === 0) {
                return { status: 'patched' };
            }
            const r = writer.patch(payload.automationId, payload.userId, patch);
            return { status: r.status };
        }
        case 'integrations.automation_delete': {
            const payload = command.payload as AutomationDeletePayload;
            const r = writer.delete(payload.automationId, payload.userId);
            if (r.status !== 'deleted') return { status: r.status };
            // Gel G2 : la row `automations` est supprimée, le vault
            // (join domaine === automation.id) est ARCHIVÉ, pas détruit.
            // AD-1 : sans archiver, on dégrade (pas de cassure).
            let vaultArchived = false;
            if (archiver) {
                vaultArchived = archiver.archive(payload.userId, payload.automationId);
            }
            return { status: 'deleted', vaultArchived };
        }
        default:
            // Commande inconnue (typo, version kernel plus récente…) :
            // jamais de write. AD-1 : le module reste intact.
            return { status: 'unhandled' };
    }
}
