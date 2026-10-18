// fn-integrations — Composio IntegrationProvider seam (v3.1, sessions).
//
// Session-based contract (docs.composio.dev/docs/toolkits.md §3):
//   - REST base: https://backend.composio.dev/api/v3.1
//   - Per-user session: POST /sessions { user_id } → session_id
//   - Session tools:    GET  /sessions/{id}/tools → meta-tools
//   - Execute:          POST /sessions/{id}/tools/execute { tool_slug, input }
//
// Auth model (AD-3, composio.md §3/§4):
//   - Device identity comes from the Supabase user JWT (Authorization header),
//     NEVER from the request body (single-writer, AD-7).
//   - The Composio project key is read from the server secret store
//     (`Deno.env.get("COMPOSIO_API_KEY")`) — it is never on the device.
//   - Per-user sessions are cached in-process by the adapter (one session
//     per user, reused across calls — the docs say sessions persist for
//     the application user; a fresh session per call would burn quota).
//
// Endpoints (POST, authenticated by the user JWT like every other EF):
//   { verb: 'discover_tools', app?, limit? }
//   { verb: 'list_accounts' }
//   { verb: 'execute_tool', toolSlug, input, idempotencyKey? }
//   { verb: 'connect', app }  → returns the Composio Connect Link. The
//      user completes OAuth in the link; the token stays in Composio,
//      never in Aurora (we do NOT build our own provider OAuth flow).
//   { verb: 'browse_integrations', limit? }  → the GLOBAL toolkit
//      catalog (`GET {base}/toolkits`, M-34 : not session-scoped).
//      `image_url` is the app-logo source (the UI falls back to the
//      initial pill when missing, never a hardcoded asset).
//   { verb: 'materialize_due_automations' }  → M-42 (S4 plan veille
//      2026-10-17) : le tick cron (service_role) enfile les jobs
//      `research` des veilles dues (AD-8, run « avec mémoire » M-43).
//      SANS user JWT — le verb lit les rows `automations` dues et écrit
//      `job_queue` sous service_role ; Composio n'est JAMAIS impliqué.
//
// Failure mode (composio.md §7): `connect` returns a degraded note when
// the key is not configured; it does not fabricate a link. All other
// verbs return 503 when unconfigured so the UI can show "configure your
// Composio key" instead of a silent empty catalog.

import { ok, err } from "../_shared/envelope.ts";
import {
  createIntegrationProvider,
  type ComposioTool,
  type IntegrationProvider,
} from "../../../packages/integrations/src/composio.ts";
// M-42 (S4 plan veille 2026-10-17) — le matérialiseur cron → job research
// (AD-8 : le module EST autorisé à enfileter ; le dispatcher exécute).
// Verb `materialize_due_automations` (service_role, appelé par le tick
// Supabase Cron) : lit les automations dues (trigger 'schedule', cron
// satisfait, non déjà matérialisée cette minute), enfile UN job
// `research` de `job_queue` par automation due avec le payload EXACT du
// handler discovery (M-43 run « avec mémoire »). Idempotent : le
// dedupKey (kind|automationId|minute) + ON CONFLICT DO NOTHING font d'un
// double tir du cron un no-op.
import {
  materializeDueAutomations,
  type JobEnqueuePort,
  type MaterializeDueAutomationRow,
} from "../../../packages/integrations/src/automation-scheduler.ts";

function provider(): IntegrationProvider {
  return createIntegrationProvider(Deno.env.get("COMPOSIO_API_KEY") ?? "");
}

// ——— M-42 (S4 plan veille 2026-10-17) : le matérialiseur cron ———
//
// `materialize_due_automations` (service_role, appelé par le tick
// Supabase Cron de la minute) :
//   1. lit les automations dues (REST service_role, RLS-bornées ; le
//      `trigger_` jsonb de 0008 porte la forme de la SSoT
//      `Automation.trigger`, `cron` (schedule), `jobKind`, `action`,
//      `last_run_at` (0026) ; la colonne domaine de la vue
//      `v_discovery_vault_scope` n'existe pas sur la row — le domaine
//      du vault est porté par le payload G1 de l'automation, résolu
//      ici par la convention de join 1 vault / programme :
//      `domaine === automation.id` (veille-programs-join, lot B)).
//   2. appelle le module pur `materializeDueAutomations` (M-42) avec
//      un port `JobEnqueuePort` qui enfile sur `job_queue` en
//      service_role (`ON CONFLICT DO NOTHING` sur idempotency_key =
//      le dedupKey AD-8 ; double tir du même tick = no-op).
//   3. patche `automations.last_run_at` = la minute du tick (service_role,
//      ADDITIF 0026) pour le tick suivant (le due est «
//      last_run_at < maintenant »).
//
// Idempotence AD-8 : le dedupKey `research|<automationId>|<minute>`
// est la clé SSoT (automations.ts `automationDedupKey`) — ce verb
// reste sans effet si re-invoqué à la même minute.

interface AutomationRow {
  id: string;
  user_id: string;
  name: string;
  trigger_: Record<string, unknown>;
  action: Record<string, unknown>;
  enabled: boolean;
  last_run_at: string | null;
}

function nowMinuteEpoch(): number {
  return Math.floor(Date.now() / 60_000);
}

function automationRowToDueRow(
  row: AutomationRow,
  minute: number,
): MaterializeDueAutomationRow {
  const trigger = String(row.trigger_?.trigger ?? "event");
  const cron =
    typeof row.trigger_?.schedule === "string"
      ? row.trigger_.schedule
      : typeof row.trigger_?.cron === "string"
        ? row.trigger_.cron
        : undefined;
  const jobKind = String(row.trigger_?.jobKind ?? "notification");
  // Le sujet G1 vit dans le `action` jsonb (le kernel le mappe là).
  const action =
    typeof row.action?.topic === "string"
      ? row.action.topic
      : typeof row.action?.action === "string"
        ? row.action.action
        : row.name;
  // Domaine du vault = la convention 1 vault / programme (join
  // `domaine === automation.id`, veille-programs-join) ; le `domain`
  // explicite porte par le payload G1 gagne s'il est présent.
  const domain =
    typeof row.action?.domain === "string"
      ? row.action.domain
      : row.id;
  const lastRun = row.last_run_at !== null ? new Date(row.last_run_at).getTime() / 60_000 : null;
  return {
    id: row.id,
    userId: row.user_id,
    trigger: (trigger === "schedule" ? "schedule" : trigger === "condition" ? "condition" : "event") as MaterializeDueAutomationRow["trigger"],
    cron,
    jobKind,
    enabled: row.enabled,
    action,
    domain,
    lastMaterializedMinute: lastRun !== null ? Math.floor(lastRun) : null,
  };
}

function enqueuePort(
  supabaseUrl: string,
  serviceRoleKey: string,
): JobEnqueuePort {
  const seen = new Set<string>();
  return {
    async enqueue(job) {
      if (seen.has(job.dedupKey)) return { ok: true, deduped: true };
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (serviceRoleKey) {
        headers.apikey = serviceRoleKey;
        if (serviceRoleKey.startsWith("eyJ")) {
          headers.Authorization = `Bearer ${serviceRoleKey}`;
        }
      }
      headers["Prefer"] = "resolution=merge-duplicates";
      const res = await fetch(`${supabaseUrl}/rest/v1/job_queue`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          id: job.id,
          user_id: job.userId,
          kind: job.kind,
          payload: job.payload,
          status: "pending",
          due_at: job.dueAt,
          idempotency_key: job.dedupKey,
        }),
      });
      if (!res.ok) {
        // Le 409 / unique-violation = le dedup (0010
        // `uq_job_queue_idempotency`) → no-op idempotent (AD-8).
        const text = await res.text().catch(() => "");
        if (res.status === 409 || text.includes("duplicate") || text.includes("uq_job_queue_idempotency")) {
          seen.add(job.dedupKey);
          return { ok: true, deduped: true };
        }
        console.error(`[fn-integrations] materialize enqueue failed status=${res.status} ${text}`);
        return { ok: false, deduped: false };
      }
      seen.add(job.dedupKey);
      return { ok: true, deduped: false };
    },
  };
}

async function materializeDue(
  body: Record<string, unknown>,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<Response> {
  // L'identité du tick = le SERVICE_ROLE (le cron tick n'a pas de
  // user JWT ; l'identity des automations dues est lue par row,
  // bornée RLS user_isolation + service_role SELECT 0008). Le verb
  // N'EST PAS un appel Composio (AD-1) : il lit `automations` + écrit
  // `job_queue` (2 writes service_role) + patche `automations.last_run_at`.
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (serviceRoleKey) {
    headers.apikey = serviceRoleKey;
    if (serviceRoleKey.startsWith("eyJ")) {
      headers.Authorization = `Bearer ${serviceRoleKey}`;
    }
  }
  // 1. Lire les automations dues (le LIMIT borne le scan ; une page
  //    de 500 couvrirait ~500 users actifs, un plus gros lot passe
  //    au prochain tick — la due est bornée par `last_run_at`, pas par
  //    une pagination). Le `trigger_` jsonb de 0008 porte la SSoT
  //    forme ; on filtre côté JS (le filtre SQL serait borné par le
  //    shape du jsonb — une version future migre vers les colonnes
  //    additives S8.0 du lot suivant).
  const res = await fetch(`${supabaseUrl}/rest/v1/automations?limit=500&select=id,user_id,name,trigger_,action,enabled,last_run_at`, {
    headers,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[fn-integrations] materialize read failed status=${res.status} ${text}`);
    return err("integrations/materialize_read_failed", text, 502);
  }
  const rows = (await res.json().catch(() => [])) as unknown as AutomationRow[];
  const minute = nowMinuteEpoch();
  const dueRows = rows.map((r) => automationRowToDueRow(r, minute));
  const port = enqueuePort(supabaseUrl, serviceRoleKey);
  const result = materializeDueAutomations(dueRows, port, minute);

  // 2. Patcher `automations.last_run_at` pour chaque automation traitée
  //    (service_role ; l'UPDATE est bornée par l'id, le trigger
  //    0008 `set_updated_at()` reste intacts).
  for (const id of result.automationIds) {
    const upd = await fetch(`${supabaseUrl}/rest/v1/automations?id=eq.${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ last_run_at: new Date(minute * 60_000).toISOString() }),
    });
    if (!upd.ok) {
      console.error(`[fn-integrations] materialize last_run_at patch failed id=${id} status=${upd.status}`);
    }
  }

  return ok({
    minute,
    enqueued: result.enqueued,
    automationIds: result.automationIds,
  });
}

Deno.serve(async (req: Request) => {
  try {
    // user id from the auth header (never trust the body for identity).
    const authHeader = req.headers.get("Authorization") ?? "";
    const match = /Bearer\s+(.+)/.exec(authHeader);
    if (!match?.[1]) return err("integrations/unauthorized", "Bearer token required", 401);
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    // Le secret service_role est stocké sous SERVICE_ROLE_KEY (Supabase refuse
    // tout nom commençant par SUPABASE_). Les EF lisent SERVICE_ROLE_KEY.
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return err("integrations/env", "SUPABASE env not configured", 503);
    }
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${match[1]}` },
    });
    if (!userRes.ok) return err("integrations/unauthorized", "invalid user token", 401);
    const user = (await userRes.json()) as { id?: string };
    const userId = user.id ?? "unknown";

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const verb = String(body.verb ?? "");
    const p = provider();

    // M-42 — verb service_role (tick Supabase Cron) : le matérialiseur
    // enfile des jobs `research` de `job_queue` pour les automations
    // dues. Le cron tick court sous service_role (pas de user JWT) —
    // on court-circuite le composio gate ci-dessous (le verb N'EST
    // PAS un appel vendor : il lit `automations` + écrit `job_queue`,
    // les 2 writes service_role bornées AD-8/AD-7). Composio n'est
    // JAMAIS impliqué (AD-1 : le vendor reste dans l'adapter).
    if (verb === "materialize_due_automations") {
      return await materializeDue(body, SUPABASE_URL, SERVICE_ROLE_KEY);
    }

    if (!p.isConfigured()) {
      return err(
        "integrations/not_configured",
        "COMPOSIO_API_KEY is not set on this deployment. " +
          "Run `supabase secrets set` with that key name to enable.",
        503,
      );
    }

    switch (verb) {
      case "discover_tools": {
        const tools: ComposioTool[] = await p.discoverTools(userId, {
          app: body.app ? String(body.app) : undefined,
          limit: body.limit ? Number(body.limit) : 50,
        });
        return ok({ tools });
      }
      case "list_accounts": {
        const accounts = await p.listConnectedAccounts(userId);
        return ok({ accounts });
      }
      case "execute_tool": {
        // v3.1: the tool slug comes from the catalog (we never trust a
        // device-supplied schema — AD-11 provenance: the catalog is the
        // SSoT). The `toolSlug` field is the v3.1 name for `toolId`.
        const toolSlug = String(body.toolSlug ?? body.toolId ?? "");
        if (!toolSlug) return err("integrations/missing_tool", "toolSlug is required", 400);
        const catalog = await p.discoverTools(userId, { limit: 500 });
        const tool = catalog.find((t) => t.toolId === toolSlug);
        if (!tool) {
          return err(
            "integrations/unknown_tool",
            `tool "${toolSlug}" not in the user's session catalog`,
            404,
          );
        }
        const result = await p.executeTool(
          userId,
          tool,
          (body.input as Record<string, unknown>) ?? {},
          { idempotencyKey: body.idempotencyKey ? String(body.idempotencyKey) : undefined },
        );
        return ok({ ...result });
      }
      case "connect": {
        // composio.md §4: the connect flow is the vendor's own Connect
        // Link — the user completes OAuth in their browser; the token
        // stays in Composio, never in Aurora (we do NOT build a
        // provider OAuth flow).
        //
        // In v3.1 the connect link is obtained by calling
        // `COMPOSIO_MANAGE_CONNECTIONS` (a meta-tool) inside the
        // user's session. The adapter's `executeTool` path covers this
        // — but the Connect Link itself is a Composio-provided
        // deep-link that requires a toolkit slug + an auth_config.
        // Until the app-level `auth_config` is provisioned (out of
        // scope for this EF — it's a dashboard setup step), we return
        // a degraded note with the toolkit slug so the UI can show
        // the user what to do.
        const app = String(body.app ?? "");
        if (!app) return err("integrations/missing_app", "app is required", 400);
        return ok({
          connectLink: null,
          app,
          note: "Connect flow is provisioned via a Composio AuthConfig. " +
            "The user's OAuth + token stay in Composio (AD-3). " +
            "Toolkits with managed OAuth (GMAIL, GOOGLECALENDAR, NOTION, …) " +
            "need only the project key; Spotify requires a custom OAuth app " +
            "(no managed OAuth — see docs.composio.dev/toolkits/spotify.md).",
        });
      }
      case "browse_integrations": {
        // M-34 — the GLOBAL Composio catalog (`GET {base}/toolkits?limit=500`).
        // Not session-scoped : it lists the provider's toolkits, each row
        // { slug, name, image_url?, description? }. The UI maps
        // `image_url → logoUrl` and falls back to the initial pill when
        // missing (the S3 logo rule, "jamais un asset hardcodé").
        // The verb itself is gated on `COMPOSIO_API_KEY` above → 503
        // when the key is absent (not a crash ; the app falls back to
        // the static M-31 catalog).
        const toolkits = await p.listToolkits({
          limit: body.limit ? Number(body.limit) : 500,
        });
        return ok({ toolkits });
      }
      default:
        return err("integrations/unknown_verb", `unknown verb "${verb}"`, 400);
    }
  } catch (e) {
    console.error("[fn-integrations] error", e);
    return err("integrations/error", e instanceof Error ? e.message : String(e), 500);
  }
});
