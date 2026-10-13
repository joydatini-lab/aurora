/**
 * Discovery local-mirror repo — branchement module A4 (discovery).
 *
 * Le module `@aurora/discovery` est la logique métier pure (AD-1/AD-10) :
 * `DiscoveryService` (qualify / select / explain / link), `detectGap` /
 * `weighGapsAgainstStates` (gap detection S1), `applyDiscoveryFilters`
 * (Benin data-driven filter, S5), `buildDiscoveryItem` /
 * `buildDiscoveryItemCreated` (AD-9), `runVeillePipeline` (veille
 * pipeline), `buildVaultMd` / `appendRun` / `decideVerbe` (vault
 * LOT 2/3/4), `buildDiscoveryResearchHandler` (AD-8 job handler).
 *
 * C'est **ce repo** (confiné à la couche provider, AD-15) qui consomme
 * le module et le relie au store local `LocalStore` (miroirs PowerSync
 * `discovery_items` + `gaps` + `automations` — 03 S4.2, AD-7 local-only).
 * Les tables `discovery_vault` (VAULT.md + manifest append-only) sont
 * déjà branchées par `discovery-vault-repo.ts` (Lot 4) — ce repo n'en
 * double PAS le work ; il apporte la couche de calcul du module
 * (recherche + qualif + gap detection) sur le miroir local.
 *
 * Pattern : le module ne fait JAMAIS de réseau (AD-7 local-first) ; il
 * reçoit les entités du `LocalStore` et produit des types SSoT
 * (`DetectedGap`, `FilterDecision`, `ChartSpec`). La page lit le hook
 * React Query — elle n'importe jamais `@aurora/discovery`.
 *
 * LE RECHERCHE EST SERVER-ONLY (AD-12/F-09) : le repo expose le
 * `DiscoveryService` + `buildDiscoveryResearchHandler` pour le calcul
 * local sur les miroirs (`discovery_items` + `gaps`), mais le search
 * lui-même court sur `fn-research` (EF) via le `ResearchProvider`
 * (Exa/Tavily/You.com, packages/integrations). Le device lit les
 * résultats miroitis (`discovery_items`) — jamais l'inverse (AD-7).
 */
import type {
  DiscoveryItem,
  SkillState,
  ResearchResult,
  VaultVerbe,
  VaultRunManifest,
  VeilleVault,
} from '@aurora/domain';
import type {
  LocalFilter,
  LocalQueryRepository,
  LocalStore,
} from '@aurora/data';
import {
  DiscoveryService,
  buildDiscoveryItem,
  detectGap,
  weighGapsAgainstStates,
  applyDiscoveryFilters,
  buildDiscoveryItemCreated,
  runVeillePipeline,
  buildVaultMd,
  appendRun,
  decideVerbe,
  OfflineResearchProvider,
  crossCheck,
  degradeToUncertain,
  buildFilterCtx,
  discoveryCadence,
  prioritySkills,
  buildDiscoveryResearchHandler,
  type DiscoveryItemKind,
  type SheetDraft,
  type SheetWithDecision,
  type GapDetectionInput,
  type DetectedGap,
  type GapUrgency,
  type FilterableItem,
  type FilterableResearchResult,
  type DiscoveryFilterContext,
  type FilterDecision,
  type VeillePipelineOutput,
} from '@aurora/discovery';

// ---------------------------------------------------------------------------
// snake_case mirror row → camelCase `@aurora/domain` entity
// ---------------------------------------------------------------------------

type RawRow = Record<string, unknown>;

const str = (v: unknown): string | undefined =>
  typeof v === 'string' ? v : undefined;

const optStr = (v: unknown): string | undefined =>
  v === null || v === undefined ? undefined : String(v);

/** JSONB-in-TEXT → parsed array (PowerSync stores JSONB columns as TEXT). */
function jsonArr(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export interface DiscoveryItemRow {
  id: string;
  userId: string;
  title: string;
  url?: string;
  summary?: string;
  source?: string;
  status?: string;
  crdtAdded: unknown[];
  crdtRemoved: unknown[];
  createdAt: string;
  updatedAt: string;
}

function mapDiscoveryItem(row: RawRow): DiscoveryItemRow {
  return {
    id: str(row.id) ?? '',
    userId: str(row.user_id) ?? '',
    title: str(row.title) ?? '',
    url: optStr(row.url),
    summary: optStr(row.summary),
    source: optStr(row.source),
    status: optStr(row.status),
    crdtAdded: jsonArr(row.crdt_added),
    crdtRemoved: jsonArr(row.crdt_removed),
    createdAt: str(row.created_at) ?? '',
    updatedAt: str(row.updated_at) ?? '',
  };
}

export interface GapRow {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

function mapGap(row: RawRow): GapRow {
  return {
    id: str(row.id) ?? '',
    userId: str(row.user_id) ?? '',
    title: str(row.title) ?? '',
    description: optStr(row.description),
    status: optStr(row.status),
    createdAt: str(row.created_at) ?? '',
    updatedAt: str(row.updated_at) ?? '',
  };
}

// ---------------------------------------------------------------------------
// Read facade over the local mirrors
// ---------------------------------------------------------------------------

function collectRows(
  store: LocalStore,
  entity: string,
  userId?: string,
): RawRow[] {
  const rows = store.allRows(entity) as RawRow[];
  if (!userId) return rows;
  return rows.filter((r) => r.user_id === userId || r.userId === userId);
}

export interface DiscoveryRead {
  items: DiscoveryItemRow[];
  gaps: GapRow[];
}

/** Read the discovery input sets from the local store (AD-7 local-only). */
export function readDiscovery(
  store: LocalStore,
  userId?: string,
): DiscoveryRead {
  return {
    items: collectRows(store, 'discovery_items', userId).map(
      mapDiscoveryItem,
    ),
    gaps: collectRows(store, 'gaps', userId).map(mapGap),
  };
}

// ---------------------------------------------------------------------------
// LocalQueryRepository facade (pattern `learning-repo.ts` /
// `progress-repo.ts`) — the provider-layer read surface.
// ---------------------------------------------------------------------------

/** camelCase `where` keys → the snake_case mirror column names. */
function toSnakeWhere(
  where?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!where) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(where)) {
    out[key.replace(/([A-Z])/g, (m) => '_' + m.toLowerCase())] = value;
  }
  return out;
}

function matches(
  row: RawRow,
  where?: Record<string, unknown>,
): boolean {
  return !where || Object.entries(where).every(([k, v]) => row[k] === v);
}

/**
 * Build the discovery `LocalQueryRepository` family over the `LocalStore`
 * mirrors (`discovery_items`, `gaps`). Read-only + local (AD-7) : the
 * write side (item creation, gap detection) vit dans le module
 * `@aurora/discovery` + l'EF `fn-research` ; ce repo est le READ path
 * seulement.
 */
export function createDiscoveryRepo(store: LocalStore): {
  items: LocalQueryRepository<DiscoveryItemRow>;
  gaps: LocalQueryRepository<GapRow>;
} {
  const getById =
    <T>(
      entity: string,
      mapRow: (row: RawRow) => T,
    ): ((id: string) => Promise<T | undefined>) =>
    async (id: string) => {
      const row = store.row(entity, id) as RawRow | undefined;
      return row === undefined ? undefined : mapRow(row);
    };

  const listMirror =
    <T>(
      entity: string,
      mapRow: (row: RawRow) => T,
    ): ((filter: LocalFilter<T>) => Promise<T[]>) =>
    async (filter: LocalFilter<T>) => {
      const where = toSnakeWhere(
        filter.where as Record<string, unknown> | undefined,
      );
      return (store.allRows(entity) as RawRow[])
        .filter((row) => matches(row, where))
        .map(mapRow);
    };

  const watchMirror =
    <T>(
      entity: string,
      mapRow: (row: RawRow) => T,
    ): ((
      filter: LocalFilter<T>,
      onChange: (rows: T[]) => void,
    ) => () => void) =>
    (filter: LocalFilter<T>, onChange: (rows: T[]) => void) => {
      const where = toSnakeWhere(
        filter.where as Record<string, unknown> | undefined,
      );
      const deliver = (rows: RawRow[]): void => {
        onChange(rows.filter((row) => matches(row, where)).map(mapRow));
      };
      deliver(store.allRows(entity) as RawRow[]);
      return store.watch(
        { entity, where } as unknown as LocalFilter<T>,
        (rows) => deliver(rows as RawRow[]),
      );
    };

  return {
    items: {
      getById: getById('discovery_items', mapDiscoveryItem),
      list: listMirror('discovery_items', mapDiscoveryItem),
      watch: watchMirror('discovery_items', mapDiscoveryItem),
    },
    gaps: {
      getById: getById('gaps', mapGap),
      list: listMirror('gaps', mapGap),
      watch: watchMirror('gaps', mapGap),
    },
  };
}

// ---------------------------------------------------------------------------
// Public compute surface (thin wrappers over the @aurora/discovery module)
// ---------------------------------------------------------------------------

/**
 * Build the `DiscoveryService` instance (ADR S13.9 loop: observe → need
 * → search → compare & qualify → select → explain → link → create →
 * measure → improve). Le repo construit l'instance sur le
 * `OfflineResearchProvider` par défaut (AD-1 fallback, 01 S6 : absence de
 * provider n'éclate jamais le produit) — le provider réel (Exa/Tavily/
 * You.com, packages/integrations) est injecté via l'EF `fn-research`
 * (server-only, AD-12). Ce wrapper est l'entrée du repo pour le calcul
 * local sur les miroirs.
 */
export function buildDiscoveryService(
  filterCtx: DiscoveryFilterContext,
  provider?: import('@aurora/domain').ResearchProvider,
): DiscoveryService {
  return new DiscoveryService(filterCtx, provider ?? new OfflineResearchProvider());
}

/** Build the filter context (data-driven, S5: Benin-specific filtering). */
export { buildFilterCtx, discoveryCadence, prioritySkills };

/**
 * Qualify one research hit into a discovery sheet + its filter decision
 * (ADR S13.9 step "compare & qualify → select → explain → link").
 * Pure : le repo expose le calcul ; la page le lit via le hook.
 */
export function computeQualify(
  userId: string,
  hit: ResearchResult & FilterableItem,
  kind: DiscoveryItemKind,
  filterCtx: DiscoveryFilterContext,
): SheetWithDecision {
  const svc = new DiscoveryService(filterCtx, new OfflineResearchProvider());
  return svc.qualify(userId, hit, kind);
}

/** Build a `DiscoveryItem` from a sheet draft + filter decision (AD-7). */
export function computeBuildDiscoveryItem(
  draft: SheetDraft,
  decision: FilterDecision,
): DiscoveryItem {
  return buildDiscoveryItem(draft, decision);
}

/** Build the `DiscoveryItemCreated` event (AD-9, PRODUCTION = Discovery). */
export function computeBuildDiscoveryItemCreated(
  item: DiscoveryItem,
  nowIso: string,
): ReturnType<typeof buildDiscoveryItemCreated> {
  return buildDiscoveryItemCreated(item, nowIso);
}

/** Detect a gap when a Discovery result references a concept NOT in the tree. */
export function computeDetectGap(
  input: GapDetectionInput,
): DetectedGap | null {
  return detectGap(input);
}

/**
 * Weigh a set of detections against competence states: a gap whose
 * referenced skill is already `mastered`/`expert` is downgraded to 'low'.
 */
export function computeWeighGapsAgainstStates(
  gaps: readonly DetectedGap[],
  states: readonly Pick<SkillState, 'skillId' | 'level' | 'confidence'>[],
): DetectedGap[] {
  return weighGapsAgainstStates(gaps, states);
}

/** Apply the Benin data-driven filters to a research hit (S5). */
export function computeApplyDiscoveryFilters(
  ctx: DiscoveryFilterContext,
  item: FilterableResearchResult,
  gaps: readonly Pick<import('@aurora/domain').Gap, 'id' | 'kind' | 'description'>[],
): FilterDecision {
  return applyDiscoveryFilters(ctx, item, gaps);
}

/**
 * Run the veille pipeline (LOT 4, discovery-vault plan 2026-10-10).
 * LE PIPELINE EST L'EF `fn-research` (AD-12, server-side) ; ce wrapper
 * expose le calcul local pour le test + le pre-degrade des résultats
 * miroitis (discovery_items) avant le vault build. Le module est la
 * SSoT du pipeline ; le repo n'est que le read facade (AD-15).
 */
export function computeRunVeillePipeline(
  researchResults: ResearchResult[],
  draft: Partial<SheetDraft>,
  filterCtx: DiscoveryFilterContext,
  notificationPayload: { channelId: string; title: string; body?: string },
): VeillePipelineOutput {
  return runVeillePipeline(researchResults, draft, filterCtx, notificationPayload);
}

/** Build the VAULT.md (LOT 2, discovery-vault plan 2026-10-10). */
export function computeBuildVaultMd(
  prev: VeilleVault | null,
  run: VaultRunManifest,
  decision: { verbe: VaultVerbe; section: string; note?: string },
): string {
  return buildVaultMd(prev, run, decision);
}

/** Append a run to the vault manifest (LOT 2, append-only AD-7). */
export function computeAppendRun(
  prev: VeilleVault | null,
  run: VaultRunManifest,
  vaultMd: string,
  hash: string,
  userId: string,
  newVaultId: string,
): VeilleVault {
  return appendRun(prev, run, vaultMd, hash, userId, newVaultId);
}

/** The verbe decision (LOT 4: add / update / skip based on the run). */
export function computeDecideVerbe(
  prevVault: VeilleVault | null,
  run: VaultRunManifest,
): ReturnType<typeof decideVerbe> {
  return decideVerbe(prevVault, run);
}

/** Cross-check + degrade the research results (01 S6: never break product). */
export { crossCheck, degradeToUncertain };

/**
 * The AD-8 job handler factory (ORION): `buildDiscoveryResearchHandler`
 * wires the `research` job kind to the module's logic. L'EF
 * `fn-job-dispatcher` (server-side) injecte le `ResearchProvider` réel
 * (Exa/Tavily/You.com, packages/integrations) — le repo n'expose que
 * l'entrée du factory (le handler en lui-même court sur l'EF).
 */
export function buildDiscoveryResearchHandlerRepo(
  deps: Parameters<typeof buildDiscoveryResearchHandler>[0],
): ReturnType<typeof buildDiscoveryResearchHandler> {
  return buildDiscoveryResearchHandler(deps);
}

export type {
  DiscoveryItemKind,
  SheetDraft,
  SheetWithDecision,
  GapDetectionInput,
  DetectedGap,
  GapUrgency,
  FilterableItem,
  FilterableResearchResult,
  DiscoveryFilterContext,
  FilterDecision,
  VeillePipelineOutput,
};
