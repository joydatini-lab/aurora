/**
 * Integrations module repo — branchement module A6 (integrations).
 *
 * Le module `@aurora/integrations` est la logique SSoT server-side
 * (AD-1 : vendors only in adapter packages, AD-7 single-writer) : 4
 * sous-modules :
 *   - `research-provider` : les adapters Exa/Tavily/You.com du port
 *     `ResearchProvider` (packages/domain) — le `createResearchProvider`
 *     factory résout le provider configuré (le reste court sur l'EF
 *     `fn-research`, AD-12 server-only).
 *   - `composio` : le provider Composio (tool discovery + connected
 *     accounts + tool execution) — le `createIntegrationProvider`
 *     factory ; `filterAvailableTools` (la SSoT du filter "un tool est
 *     disponible SI l'app a un connected account connecté").
 *   - `notifications` : le split des notifications (04 §3.4) —
 *     `decideChannel` (la SSoT du anti-double-push : 1 objet = 1
 *     channel), `isWithinQuietHours`, `assertNoDoublePush`,
 *     `OneSignalServerClient` (REST key server-only, AD-3).
 *   - `automations` : les job payloads + dedup keys (AD-8) —
 *     `automationDedupKey` (la SSoT du idempotency key cron),
 *     `cronInsertSql`, `buildAutomationJobPayload`,
 *     `INTEGRATIONS_JOB_HANDLERS` / `INTEGRATIONS_JOB_KINDS`.
 *
 * C'est **ce repo** (confiné à la couche provider, AD-15) qui consomme
 * le module et le relie à la page / à l'EF. Le module est la SSoT du
 * calcul ; ce repo est le READ facade (AD-7 : le module ne fait JAMAIS
 * de réseau depuis l'app — les adapters composio/onesignal/research
 * courent sur l'EF, pas ici). La page / /integrations lit le hook
 * React Query — elle n'importe jamais `@aurora/integrations`.
 *
 * NOTE (AD-3 / AD-12) : le `OneSignalServerClient` (REST key
 * server-only) + les adapters `ExaResearchProvider` /
 * `TavilyResearchProvider` / `YouComResearchProvider` sont les
 * ADAPTERS vendor (AD-1 : vendors ONLY in adapter packages) — ils
 * sont EXPOSÉS par le repo mais ne sont PAS construits côté app
 * (la construction court sur l'EF `fn-integrations` / `fn-research` /
 * `fn-notifications`, AD-3 publishable scope only, zero provider keys
 * on device). Le repo expose le CONTRACT (les types + les factories)
 * pour que l'EF + les tests partagent une SSoT ; la construction des
 * adapters vendor est server-only.
 */
import type {
  ResearchProvider,
  Automation,
  JobKind,
} from '@aurora/domain';
import type { LocalStore } from '@aurora/data';
import {
  createResearchProvider,
  createIntegrationProvider,
  createOneSignalServerClient,
  filterAvailableTools,
  toIntegrationsState,
  toOneSignalIntegrationsState,
  decideChannel,
  isWithinQuietHours,
  assertNoDoublePush,
  automationDedupKey,
  cronInsertSql,
  buildAutomationJobPayload,
  isJobKind,
  INTEGRATIONS_JOB_HANDLERS,
  INTEGRATIONS_JOB_KINDS,
  filterJobCompletedForAutomation,
} from '@aurora/integrations';
import type {
  IntegrationProvider,
  OneSignalClient,
  AutomationJobPayload,
  NotificationPlan,
  NotificationRequest,
  ConnectedAccount,
  ComposioTool,
} from '@aurora/integrations';

// ---------------------------------------------------------------------------
// snake_case mirror row → camelCase `@aurora/domain` entity
// (le repo lit les miroirs `integrations_state` + `automations`)
// ---------------------------------------------------------------------------

type RawRow = Record<string, unknown>;

const str = (v: unknown): string | undefined =>
  typeof v === 'string' ? v : undefined;

const optStr = (v: unknown): string | undefined =>
  v === null || v === undefined ? undefined : String(v);

function collectRows(
  store: LocalStore,
  entity: string,
  userId?: string,
): RawRow[] {
  const rows = store.allRows(entity) as RawRow[];
  if (!userId) return rows;
  return rows.filter((r) => r.user_id === userId || r.userId === userId);
}

export interface IntegrationsStateRow {
  id: string;
  userId: string;
  vendor?: string;
  connection?: string;
  status?: string;
  connectionRef?: string;
  createdAt: string;
  updatedAt: string;
}

function mapIntegrationsState(row: RawRow): IntegrationsStateRow {
  return {
    id: str(row.id) ?? '',
    userId: str(row.user_id) ?? '',
    vendor: optStr(row.vendor),
    connection: optStr(row.connection),
    status: optStr(row.status),
    connectionRef: optStr(row.connection_ref),
    createdAt: str(row.created_at) ?? '',
    updatedAt: str(row.updated_at) ?? '',
  };
}

export interface AutomationRow {
  id: string;
  userId: string;
  name?: string;
  trigger?: string;
  action?: string;
  active?: number;
  config?: string;
  createdAt: string;
  updatedAt: string;
}

function mapAutomation(row: RawRow): AutomationRow {
  return {
    id: str(row.id) ?? '',
    userId: str(row.user_id) ?? '',
    name: optStr(row.name),
    trigger: optStr(row.trigger),
    action: optStr(row.action),
    active: typeof row.active === 'number' ? row.active : undefined,
    config: optStr(row.config),
    createdAt: str(row.created_at) ?? '',
    updatedAt: str(row.updated_at) ?? '',
  };
}

// ---------------------------------------------------------------------------
// Read facade over the local mirrors
// ---------------------------------------------------------------------------

export interface IntegrationsRead {
  integrationsStates: IntegrationsStateRow[];
  automations: AutomationRow[];
}

/** Read the integrations input sets from the local store (AD-7 local-only). */
export function readIntegrations(
  store: LocalStore,
  userId?: string,
): IntegrationsRead {
  return {
    integrationsStates: collectRows(store, 'integrations_state', userId).map(
      mapIntegrationsState,
    ),
    automations: collectRows(store, 'automations', userId).map(mapAutomation),
  };
}

// ---------------------------------------------------------------------------
// Public compute surface (thin wrappers over the @aurora/integrations module)
// ---------------------------------------------------------------------------

/**
 * The `ResearchProvider` factory (AD-15: open to additions). Résolution
 * exa → tavily → you-dot-com ; le premier provider CONFIGURÉ gagne.
 * Quand aucun n'est configuré, retourne le provider "offline" (isConfigured
 * = false) pour que le loop degrade à `uncertain` sans éclater le produit
 * (01 §6). L'adapters vendor courent sur l'EF `fn-research` (AD-12) —
 * ce repo expose le FACTORY ; la construction est server-only.
 */
export function createResearchProviderRepo(): ResearchProvider {
  return createResearchProvider();
}

/**
 * The `IntegrationProvider` factory (Composio, AD-1 vendor isolation).
 * Le provider composio est construit sur l'EF `fn-integrations`
 * (server-side, AD-12) — ce repo expose le FACTORY ; l'API key
 * `COMPOSIO_API_KEY` vit dans le secret store server (AD-3), jamais
 * dans le bundle mobile.
 */
export function createIntegrationProviderRepo(): IntegrationProvider {
  return createIntegrationProvider();
}

/**
 * The `OneSignalServerClient` factory (AD-1 vendor isolation). Le REST
 * API key OneSignal vit sur le server (env, AD-3, 04 §7.2e anti-leak) —
 * jamais dans le bundle mobile. Le client est construit sur l'EF
 * `fn-notifications` (server-side) ; ce repo expose le FACTORY.
 */
export function createOneSignalServerClientRepo(): OneSignalClient {
  return createOneSignalServerClient();
}

/**
 * Filter the available Composio tools (composio.md §3 Tool Registry
 * merge) : un tool est disponible SI l'app a un connected account
 * connecté. La SSoT du filter (la page / l'agent kernel consomment ce
 * calcul ; le module est la SSoT du `filterAvailableTools`).
 */
export function computeFilterAvailableTools(
  tools: ComposioTool[],
  accounts: ConnectedAccount[],
): Array<ComposioTool & { available: boolean; reason?: string }> {
  return filterAvailableTools(tools, accounts);
}

/** Map a Composio account to the module's `IntegrationsState` SSoT (01 §4.7). */
export function computeToComposioIntegrationsState(
  userId: string,
  account: ConnectedAccount,
): ReturnType<typeof toIntegrationsState> {
  return toIntegrationsState(userId, account);
}

/** Map a OneSignal delivery outcome to the `IntegrationsState` SSoT (01 §4.7). */
export function computeToOneSignalIntegrationsState(
  userId: string,
  ok: { accepted: boolean; reason?: string },
): ReturnType<typeof toOneSignalIntegrationsState> {
  return toOneSignalIntegrationsState(userId, ok);
}

/**
 * The single channel decision point (anti-double-push, 04 §7). La SSoT
 * du split des notifications (04 §3.4) : 1 objet = 1 channel (push /
 * local / in-app). Le module est la SSoT ; ce repo l'expose pour la
 * page + l'EF `fn-notifications`.
 */
export function computeDecideChannel(
  req: NotificationRequest,
  pref: Parameters<typeof decideChannel>[1],
): NotificationPlan {
  return decideChannel(req, pref);
}

/**
 * Are we in a quiet-hours window (AD-13 style quiet hours, 04 §3.4).
 * La SSoT du parsing "HH:MM-HH:MM" + le cross-midnight handling.
 */
export function computeIsWithinQuietHours(
  quietHours: string[] | undefined,
  nowIso: string,
): boolean {
  return isWithinQuietHours(quietHours, nowIso);
}

/**
 * The anti-double-push assertion (04 §7 test) : un plan ne doit JAMAIS
 * porter à la fois un `onesignal` ET un `local` delivery (le module est
 * la SSoT du check ; le repo l'expose pour le test + la page).
 */
export function computeAssertNoDoublePush(plan: NotificationPlan): boolean {
  return assertNoDoublePush(plan);
}

/**
 * The deterministic dedup key for a cron tick (AD-8) : même minute
 * cron + même automation = même key ; le re-dispatch est un no-op.
 * La SSoT du format `kind|automationId|minute-epoch`.
 */
export function computeAutomationDedupKey(
  automationId: string,
  cronMinuteEpoch: number,
  jobKind: JobKind,
): string {
  return automationDedupKey(automationId, cronMinuteEpoch, jobKind);
}

/**
 * The SQL a cron tick inserts into `job_queue` (single-writer : le
 * module propriétaire de l'automation build la statement ; le `ON
 * CONFLICT DO NOTHING` + le `not exists` guard rendent un double
 * firing no-op, AD-8). La SSoT du SQL idempotent.
 */
export function computeCronInsertSql(
  automation: Automation,
  cronMinuteEpoch: number,
  jobId: string,
): string {
  return cronInsertSql(automation, cronMinuteEpoch, jobId);
}

/**
 * Build the `AutomationJobPayload` for a cron tick (typed per kind par
 * le worker, 01 §5.3). La SSoT du payload (le dispatcher ORION route
 * le job vers le module-scoped handler).
 */
export function computeBuildAutomationJobPayload(
  automation: Automation,
  cronMinuteEpoch: number,
): AutomationJobPayload {
  return buildAutomationJobPayload(automation, cronMinuteEpoch);
}

/**
 * The closed JobKind type guard (AD-15) : `isJobKind` retourne true
 * si le string est un des JobKind SSoT (le repo l'expose pour la page
 * / l'EF qui valident un jobKind avant dispatch).
 */
export { isJobKind, INTEGRATIONS_JOB_HANDLERS, INTEGRATIONS_JOB_KINDS };

/**
 * Filter the `JobCompleted` events for an automation (AD-9 consumer side,
 * 01 §6). La SSoT du filter "le job terminé est-il celui de l'automation
 * ?" — le module s'en sert pour le UI success state (01 §6 : l'UI observe
 * le `JobCompleted` via la table events, AD-2 : pas d'import direct du
 * writer d'un autre module).
 */
export function computeFilterJobCompletedForAutomation(
  ...args: Parameters<typeof filterJobCompletedForAutomation>
): ReturnType<typeof filterJobCompletedForAutomation> {
  return filterJobCompletedForAutomation(...args);
}

// ---------------------------------------------------------------------------
// Type re-exports (le contract partagé EF + tests + page, AD-10)
// ---------------------------------------------------------------------------

export type {
  AutomationJobPayload,
};
