// M-42 — Matérialiseur cron → job research (AD-8, plan S4).
//
// Test-first : ce test doit ÉCHOUER tant que `src/automation-scheduler.ts`
// n'existe pas. Une automation due (trigger:'schedule', cron satisfait,
// non déjà matérialisée cette minute) produit UN job `research` de
// `job_queue` avec le payload EXACT du handler discovery (module:'discovery',
// op:'multi-source', discoverySheet:true, vaultDomaine, channelId,
// query:{topic,domains,userId}). Idempotence : dedupKey =
// kind|automationId|minute (AD-8, déjà exposé par automations.ts) ;
// re-dispatch = no-op. Les triggers `event`/`condition` ne se
// matérialisent PAS par le cron (MVP = schedule, D1).
//
// Le module EST autorisé à enfileter (AD-8 : seul le dispatcher ne le fait
// pas). La write `job_queue` est service_role (l'EF fn-integrations, verb
// `materialize_due_automations`) ; le module n'importe JAMAIS le vendor.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
    automationDedupKey,
    materializeDueAutomations,
    type JobEnqueuePort,
    type MaterializeDueAutomationRow,
} from "../src/automation-scheduler.ts";

// ---------------------------------------------------------------------------
// Port de test : jobQueue fake in-mem
// ---------------------------------------------------------------------------

function makeFakeJobQueue() {
    const enqueued: Array<{
        id: string;
        userId: string;
        kind: string;
        module: string;
        payload: Record<string, unknown>;
        dedupKey: string;
        dueAt: string;
    }> = [];
    const seen: Set<string> = new Set();

    const port: JobEnqueuePort = {
        enqueue(job) {
            if (seen.has(job.dedupKey)) {
                // ON CONFLICT DO NOTHING (idempotente)
                enqueued.push(job);
                return { ok: true, deduped: true };
            }
            seen.add(job.dedupKey);
            enqueued.push(job);
            return { ok: true, deduped: false };
        },
    };
    return { port, enqueued, seen };
}

// ---------------------------------------------------------------------------
// Une automation due (schedule, cron satisfait) → UN job research
// ---------------------------------------------------------------------------

test("materializeDueAutomations : une automation due produit UN job research avec le payload EXACT du handler", () => {
    const { port, enqueued } = makeFakeJobQueue();

    const automations: MaterializeDueAutomationRow[] = [
        {
            id: "aut-1",
            userId: "u1",
            trigger: "schedule",
            cron: "0 8 1 * *",
            jobKind: "research",
            enabled: true,
            action: "Suivi Eurocode 7 — dimensionnement fondations",
            domain: "genie-civil-sol",
            // Non déjà matérialisée cette minute :
            lastMaterializedMinute: null,

        },
    ];

    const result = materializeDueAutomations(automations, port, 1762084800);
    assert.equal(result.enqueued, 1, "1 job enfilé pour 1 automation due");
    assert.equal(enqueued.length, 1);
    const job = enqueued[0];
    assert.equal(job.kind, "research");
    assert.equal(job.module, "discovery");
    assert.equal(job.userId, "u1");
    assert.equal(job.dedupKey, automationDedupKey("aut-1", 1762084800, "research"));
    assert.equal(job.payload.op, "multi-source");
    assert.equal(job.payload.discoverySheet, true);
    assert.equal(job.payload.vaultDomaine, "genie-civil-sol");
    assert.equal(job.payload.channelId, "default");
    assert.deepEqual(job.payload.query, {
        topic: "Suivi Eurocode 7 — dimensionnement fondations",
        domains: ["genie-civil-sol"],
        userId: "u1",
        kinds: ["web", "academic", "professional"],
    });
});

// ---------------------------------------------------------------------------
// Idempotence : re-dispatch = no-op
// ---------------------------------------------------------------------------

test("materializeDueAutomations : idempotence — re-dispatch = no-op (ON CONFLICT DO NOTHING)", () => {
    const { port, enqueued, seen } = makeFakeJobQueue();

    const automations: MaterializeDueAutomationRow[] = [
        {
            id: "aut-1",
            userId: "u1",
            trigger: "schedule",
            cron: "0 8 1 * *",
            jobKind: "research",
            enabled: true,
            action: "X",
            domain: "genie-civil-sol",
            lastMaterializedMinute: 1762084800, // déjà matérialisée cette minute
        },
    ];

    // Première passe : le tick a déjà couru (le lastMaterializedMinute est à
    // la même minute que nowMinute) → le matérialiseur doit passer (no-op).
    const result = materializeDueAutomations(automations, port, 1762084800);
    assert.equal(result.enqueued, 0, "déjà matérialisée cette minute → no-op");
    assert.equal(enqueued.length, 0);
    assert.equal(seen.size, 0);
});

test("materializeDueAutomations : même tick appelé 2× → 2e appel est dédupliqué par le port", () => {
    const { port, seen } = makeFakeJobQueue();
    const automations: MaterializeDueAutomationRow[] = [
        {
            id: "aut-1",
            userId: "u1",
            trigger: "schedule",
            cron: "0 8 1 * *",
            jobKind: "research",
            enabled: true,
            action: "X",
            domain: "genie-civil-sol",
            lastMaterializedMinute: null,
        },
    ];
    materializeDueAutomations(automations, port, 1762084800);
    // Re-dispatch du même tick (le cron a tiré 2× à la même minute —
    // 0010/0011 pattern : ON CONFLICT DO NOTHING) : le port enfile la row
    // mais son insert est un no-op (dedupKey déjà vue).
    const second = materializeDueAutomations(automations, port, 1762084800);
    assert.equal(second.enqueued, 0, "le 2e tick dédupliqué = 0 nouveaux jobs");
    // Le port observe la tentative (le ON CONFLICT DO NOTHING est la
    // suture DB) ; seul le compteur de nouveaux jobs est stable.
    assert.equal(seen.size, 1, "une seule dedupKey réellement vue");
});

// ---------------------------------------------------------------------------
// Triggers non-cron (event / condition) ne se matérialisent PAS (D1)
// ---------------------------------------------------------------------------

test("materializeDueAutomations : trigger='event' / 'condition' ne se matérialisent PAS par le cron (MVP = schedule, D1)", () => {
    const { port, enqueued } = makeFakeJobQueue();
    const automations: MaterializeDueAutomationRow[] = [
        {
            id: "aut-ev",
            userId: "u1",
            trigger: "event",
            cron: "0 8 1 * *",
            jobKind: "research",
            enabled: true,
            domain: "x",
            lastMaterializedMinute: null,
        },
        {
            id: "aut-cond",
            userId: "u1",
            trigger: "condition",
            cron: "0 8 1 * *",
            jobKind: "research",
            enabled: true,
            domain: "y",
            lastMaterializedMinute: null,
        },
    ];
    const result = materializeDueAutomations(automations, port, 1762084800);
    assert.equal(result.enqueued, 0, "ni event, ni condition → aucun job");
    assert.equal(enqueued.length, 0);
});

// ---------------------------------------------------------------------------
// disabled / jobKind inconnu
// ---------------------------------------------------------------------------

test("materializeDueAutomations : enabled=false → no-op", () => {
    const { port, enqueued } = makeFakeJobQueue();
    const automations: MaterializeDueAutomationRow[] = [
        {
            id: "aut-off",
            userId: "u1",
            trigger: "schedule",
            cron: "0 8 1 * *",
            jobKind: "research",
            enabled: false,
            domain: "z",
            lastMaterializedMinute: null,
        },
    ];
    const result = materializeDueAutomations(automations, port, 1762084800);
    assert.equal(result.enqueued, 0);
    assert.equal(enqueued.length, 0);
});

test("materializeDueAutomations : jobKind='notification' (dégradation AD-15) → pas de job research (le tick cron l'a déjà dégraissé)", () => {
    const { port, enqueued } = makeFakeJobQueue();
    const automations: MaterializeDueAutomationRow[] = [
        {
            id: "aut-notif",
            userId: "u1",
            trigger: "schedule",
            cron: "0 8 1 * *",
            jobKind: "notification",
            enabled: true,
            domain: "z",
            lastMaterializedMinute: null,
        },
    ];
    const result = materializeDueAutomations(automations, port, 1762084800);
    // Le tick cron (cronInsertSql) a déjà enfilé le notification job —
    // le matérialiseur ne produit QUE les jobs research (veille).
    assert.equal(result.enqueued, 0);
    assert.equal(enqueued.length, 0);
});

// ---------------------------------------------------------------------------
// Multiple automations dues + un non-due (dernière matérialisation plus
// récente que maintenant) = 1 job enfilé
// ---------------------------------------------------------------------------

test("materializeDueAutomations : 2 dues + 1 non-due → 2 jobs", () => {
    const { port, enqueued } = makeFakeJobQueue();
    const automations: MaterializeDueAutomationRow[] = [
        {
            id: "a1",
            userId: "u1",
            trigger: "schedule",
            cron: "0 8 1 * *",
            jobKind: "research",
            enabled: true,
            domain: "sol",
            lastMaterializedMinute: null,
        },
        {
            id: "a2",
            userId: "u1",
            trigger: "schedule",
            cron: "0 8 1 * *",
            jobKind: "research",
            enabled: true,
            domain: "structures",
            lastMaterializedMinute: null,
        },
        {
            id: "a3",
            userId: "u1",
            trigger: "schedule",
            cron: "0 8 1 * *",
            jobKind: "research",
            enabled: true,
            domain: "hydraulics",
            // Non due : la dernière matérialisation est plus récente que
            // maintenant (tick déjà passé).
            lastMaterializedMinute: 1762084801,
        },
    ];
    const result = materializeDueAutomations(automations, port, 1762084800);
    assert.equal(result.enqueued, 2);
    assert.equal(enqueued.length, 2);
    assert.equal(enqueued[0].payload.vaultDomaine, "sol");
    assert.equal(enqueued[1].payload.vaultDomaine, "structures");
});

// ---------------------------------------------------------------------------
// La fonction est pure + synchronisable (pas de fetch, pas de Date.now()
// interne — `nowMinute` est porté par l'EF)
// ---------------------------------------------------------------------------

test("materializeDueAutomations : pure — même input, même output (pas d'effet Date.now)", () => {
    const { port: p1, enqueued: e1 } = makeFakeJobQueue();
    const { port: p2, enqueued: e2 } = makeFakeJobQueue();
    const automations: MaterializeDueAutomationRow[] = [
        {
            id: "a1",
            userId: "u1",
            trigger: "schedule",
            cron: "0 8 1 * *",
            jobKind: "research",
            enabled: true,
            domain: "sol",
            lastMaterializedMinute: null,
        },
    ];
    const r1 = materializeDueAutomations(automations, p1, 1762084800);
    const r2 = materializeDueAutomations(automations, p2, 1762084800);
    assert.deepEqual(r1, r2);
    assert.deepEqual(e1, e2);
});
