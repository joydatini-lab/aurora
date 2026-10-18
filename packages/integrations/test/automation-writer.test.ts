// M-41 — Writer du module Integrations (AD-7 single-writer, G1/G2/G3).
//
// Test-first : ce test doit ÉCHOUER tant que `src/automation-writer.ts`
// n'existe pas. Avec un `fakeWriter` in-mem, les 3 commandes kernel
// (integrations.automation_create / _update / _delete) sont appliquées ;
// une delete met le vault en `archived: true` (gel G2 : archivage, pas
// destruction). La write directe depuis le kernel est interdite (AD-7) :
// le module est le SEUL qui écrit `automations`, via ce port.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
    applyAutomationCommand,
    ulidLike,
    type AutomationWriter,
    type VaultArchiver,
    type AutomationWriterResult,
} from "../src/automation-writer.ts";

// ---------------------------------------------------------------------------
// fakeWriter in-mem : port `AutomationWriter` borné par id + userId (RLS).
// ---------------------------------------------------------------------------

function makeFakeWriter(seed: Record<string, Record<string, unknown>> = {}) {
    const rows = new Map<string, Record<string, unknown>>(
        Object.entries(seed).flatMap(([userId, recs]) =>
            Object.values(recs).map((row) => [String(row.id), row]),
        ),
    );
    const calls: string[] = [];

    const writer: AutomationWriter = {
        insert(automation) {
            calls.push(`insert:${automation.id}`);
            rows.set(automation.id, { ...automation });
            return { status: "created" };
        },
        patch(automationId, userId, patch) {
            calls.push(`patch:${automationId}:${userId}`);
            const row = rows.get(automationId);
            if (!row || String(row.userId) !== userId) return { status: "not_found" };
            rows.set(automationId, { ...row, ...patch, updatedAt: "now" });
            return { status: "patched" };
        },
        delete(automationId, userId) {
            calls.push(`delete:${automationId}:${userId}`);
            const row = rows.get(automationId);
            if (!row || String(row.userId) !== userId) return { status: "not_found" };
            rows.delete(automationId);
            return { status: "deleted" };
        },
    };
    return { writer, rows, calls };
}

// fakeArchiver : gel G2 — le vault est ARCHIVÉ, jamais détruit.
function makeFakeArchiver(seed: Record<string, { archived?: boolean }> = {}) {
    const vaults = new Map<string, { archived?: boolean }>(Object.entries(seed));
    let archivedOnce = false;
    const archiver: VaultArchiver = {
        archive(userId, domaine) {
            const key = `${userId}|${domaine}`;
            const row = vaults.get(key) ?? { archived: false };
            vaults.set(key, { ...row, archived: true });
            if (row.archived !== true) archivedOnce = true;
            return archivedOnce || row.archived === true;
        },
    };
    return { archiver, vaults };
}

// ---------------------------------------------------------------------------
// G1 — create
// ---------------------------------------------------------------------------

test("applyAutomationCommand: integrations.automation_create -> writer.insert", () => {
    const { writer, rows } = makeFakeWriter();
    const result = applyAutomationCommand(
        {
            ok: true,
            command: "integrations.automation_create",
            payload: {
                name: "Veille Eurocode 7",
                trigger: "schedule",
                schedule: "0 8 1 * *",
                jobKind: "research",
                action: "Suivi de la révision 2026 de l'Eurocode 7",
                userId: "u1",
            },
        },
        writer,
    ) as AutomationWriterResult;

    assert.equal(result.status, "created");
    const id = ulidLike("u1|Veille Eurocode 7|schedule");
    const row = rows.get(id);
    assert.ok(row, "une row automations est insérée, bornée par userId");
    assert.equal(row.name, "Veille Eurocode 7");
    assert.equal(row.enabled, true);
    assert.equal(row.trigger, "schedule");
    assert.equal(row.cron, "0 8 1 * *");
});

// ---------------------------------------------------------------------------
// G2 — update (verrouiller = enabled:false, gel G2 réversible)
// ---------------------------------------------------------------------------

test("applyAutomationCommand: integrations.automation_update (verrouillage) -> writer.patch", () => {
    const { writer, rows } = makeFakeWriter({
        u1: {
            "a1": {
                id: "a1",
                userId: "u1",
                name: "Veille Eurocode 7",
                trigger: "schedule",
                enabled: true,
            },
        },
    });
    const result = applyAutomationCommand(
        {
            ok: true,
            command: "integrations.automation_update",
            payload: {
                automationId: "a1",
                patch: { enabled: false },
                userId: "u1",
            },
        },
        writer,
    ) as AutomationWriterResult;

    assert.equal(result.status, "patched");
    assert.equal(rows.get("a1")?.enabled, false, "verrouillage = enabled:false");
});

test("applyAutomationCommand: patch borné RLS — userId étranger -> not_found", () => {
    const { writer, rows } = makeFakeWriter({
        u1: {
            "a1": { id: "a1", userId: "u1", enabled: true },
        },
    });
    const result = applyAutomationCommand(
        {
            ok: true,
            command: "integrations.automation_update",
            payload: { automationId: "a1", patch: { enabled: false }, userId: "u2" },
        },
        writer,
    ) as AutomationWriterResult;

    assert.equal(result.status, "not_found");
    assert.equal(rows.get("a1")?.enabled, true, "rien n'a bougé pour l'utilisateur étranger");
});

// ---------------------------------------------------------------------------
// G2 (gel) — delete archive le vault, ne le détruit pas
// ---------------------------------------------------------------------------

test("applyAutomationCommand: integrations.automation_delete -> writer.delete + archiver le vault", () => {
    const { writer } = makeFakeWriter({
        u1: {
            "a1": { id: "a1", userId: "u1", enabled: true },
        },
    });
    const { archiver, vaults } = makeFakeArchiver({
        "u1|a1": { archived: false },
    });
    const result = applyAutomationCommand(
        {
            ok: true,
            command: "integrations.automation_delete",
            payload: { automationId: "a1", userId: "u1" },
        },
        writer,
        archiver,
    ) as AutomationWriterResult;

    assert.equal(result.status, "deleted");
    assert.equal(vaults.get("u1|a1")?.archived, true, "gel G2 : le vault est archivé, pas supprimé");
});

test("applyAutomationCommand: delete borné RLS — userId étranger -> not_found, vault intact", () => {
    const { writer, rows } = makeFakeWriter({
        u1: {
            "a1": { id: "a1", userId: "u1", enabled: true },
        },
    });
    const { archiver, vaults } = makeFakeArchiver({
        "u1|a1": { archived: false },
    });
    const result = applyAutomationCommand(
        {
            ok: true,
            command: "integrations.automation_delete",
            payload: { automationId: "a1", userId: "u2" },
        },
        writer,
        archiver,
    ) as AutomationWriterResult;

    assert.equal(result.status, "not_found");
    assert.ok(rows.get("a1"), "l'automation reste intacte");
    assert.equal(vaults.get("u1|a1")?.archived, false, "le vault n'est PAS archivé");
});

// ---------------------------------------------------------------------------
// AD-7 — le module est le SEUL qui écrit `automations`
// ---------------------------------------------------------------------------

test("AD-7 : le writer n'est jamais appelé par le kernel (thin emitters)", () => {
    // Le kernel émet { ok, command, payload } ; seul applyAutomationCommand
    // (porté par le module Integrations) appelle writer.insert/patch/delete.
    // Un call direct `writer.insert` depuis le kernel serait un bypass AD-7 —
    // ce test verrouille la discipline : le payload kernel ne contient JAMAIS
    // de row `automations` pré-écrite.
    const { writer, calls } = makeFakeWriter();
    applyAutomationCommand(
        {
            ok: true,
            command: "integrations.automation_create",
            payload: {
                name: "X",
                trigger: "schedule",
                schedule: "0 0 * * *",
                jobKind: "research",
                userId: "u1",
            },
        },
        writer,
    );
    // Seuls les verbes du module sont observés sur le port — pas de
    // write pré-écrite depuis le kernel (AD-7).
    assert.deepEqual(calls, [`insert:${ulidLike("u1|X|schedule")}`]);
});

// ---------------------------------------------------------------------------
// Robustesse — commandes inconnues / ok:false
// ---------------------------------------------------------------------------

test("command inconnue -> result.status === 'unhandled' (jamais de write)", () => {
    const { writer, rows, calls } = makeFakeWriter();
    const result = applyAutomationCommand(
        {
            ok: true,
            command: "integrations.automation_unknown",
            payload: {},
        } as never,
        writer,
    ) as AutomationWriterResult;
    assert.equal(result.status, "unhandled");
    assert.equal(rows.size, 0);
    assert.deepEqual(calls, []);
});

test("ok:false (degradation kernel) -> 'unhandled', rien n'est écrit", () => {
    const { writer, calls } = makeFakeWriter();
    const result = applyAutomationCommand(
        {
            ok: false,
            command: "integrations.automation_create",
            payload: {},
        },
        writer,
    ) as AutomationWriterResult;
    assert.equal(result.status, "unhandled");
    assert.deepEqual(calls, []);
});
