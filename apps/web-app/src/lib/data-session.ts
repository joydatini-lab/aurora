/**
 * L5 — la session de données de la coquille web (03 S8.1 « le relais
 * opérationnel », le SWAP du moteur derrière `LocalStore`).
 *
 * POURQUOI CE FICHIER EST UNE COPIE MINCE, PAS UNE RÉÉCRITURE
 * `apps/mobile/src/lib/boot-data.ts` fait déjà exactement ce travail, mais il
 * vit dans l'app (AD-1 : les apps consomment la surface `@aurora/data`, elles
 * ne la possèdent pas). La coquille web a besoin des MÊMES briques : on les
 * recompose ici en réutilisant la surface publique, plutôt que d'importer le
 * boot du mobile (ce qui créerait une dépendance app→app).
 *
 * Les trois briques réutilisées telles quelles :
 *   - `createPowerSyncClientEngine(options, dbFactory)` — le point
 *     d'injection du constructor. On passe `PowerSyncDatabase` de
 *     `@powersync/web` (WASQLite/IndexedDB) à la place du
 *     `@powersync/capacitor` du mobile. C'est le MÊME moteur, MÊME schéma,
 *     MÊMES streams (`SYNC_STREAMS`) — exactement la voie déjà empruntée par
 *     le spike desktop (`apps/desktop/renderer.jsx`).
 *   - `EngineLocalStoreBridge` — le `LocalStore` réel derrière le miroir.
 *   - `SqliteCommandRepository.apply('productivity', …)` — l'écriture
 *     single-writer (AD-7/F-03).
 *
 * AD-3 : seules les valeurs PUBLIABLES viennent de l'env (`.env.local`,
 * `VITE_*`) ; aucune clé privilégiée ne touche ce fichier.
 *
 * ÉTAT HONNÊTE SANS SESSION SUPABASE
 * Le moteur s'initialise TOUJOURS (le miroir local existe hors-ligne, AD-7) ;
 * c'est la SYNCHRO qui exige une session (`fetchCredentials` lit
 * `auth.getSession()`). Sans session on reste sur le miroir local — la
 * capture fonctionne, la synchro non. C'est un état dégradé HONNÊTE, pas une
 * panne : `sessionState` le dit à l'UI.
 */
import type {
  AuroraSupabaseClient,
  LocalCommandRepository,
  LocalQueryRepository,
  LocalStore,
  PowerSyncClientEngine,
  PowerSyncDatabaseCtor,
} from '@aurora/data';
import type { Task } from '@aurora/domain';

/** L'état de la session Supabase, tel que l'UI doit le dire. */
export type WebSessionState =
  | 'idle'
  | 'no-session'
  | 'signed-in'
  | 'error'
  /** DEV UNIQUEMENT : identité locale synthétique, aucune synchro. */
  | 'dev-local';

export interface WebDataEnv {
  supabaseUrl?: string;
  supabasePublishableKey?: string;
  powersyncUrl?: string;
  /** Nom de base WASQLite (IndexedDB) — distinct du desktop/mobile. */
  dbFilename?: string;
  /** Arme la preuve locale en DEV (jamais lue au build : cf. `connect`). */
  VITE_LOCAL_DEV_SESSION?: string;
  VITE_LOCAL_DEV_USER_ID?: string;
}

export interface WebDataSession {
  /** lecture locale des `tasks` (03 S3.1) — jamais de réseau sur ce chemin. */
  tasks: LocalQueryRepository<Task>;
  /** écriture single-writer (AD-7) — la seule porte d'écriture. */
  commands: LocalCommandRepository;
  /** le miroir local (contrat `LocalStore`, pour les mappers snake_case). */
  store(): LocalStore;
  /** l'id du user connecté, ou null hors session (le kernel l'exige). */
  userId(): string | null;
  sessionState(): WebSessionState;
  /** init du miroir + `connect` (fire-and-forget) + `waitForFirstSync`. */
  connect(): Promise<void>;
  dispose(clear?: boolean): Promise<void>;
}

/** Lit l'env publiée par Vite (`VITE_*`) — jamais un secret privilégié (AD-3). */
export function readWebDataEnv(): WebDataEnv {
  const env = import.meta.env as Record<string, string | undefined>;
  return {
    supabaseUrl: env.VITE_SUPABASE_URL,
    supabasePublishableKey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
    powersyncUrl: env.VITE_POWERSYNC_URL,
    VITE_LOCAL_DEV_SESSION: env.VITE_LOCAL_DEV_SESSION,
    VITE_LOCAL_DEV_USER_ID: env.VITE_LOCAL_DEV_USER_ID,
  };
}

/** Les colonnes du miroir `tasks` que le mapper lit (snake_case, 03 S4.1). */
type TaskRow = Record<string, unknown>;

/**
 * `tasks` (miroir) → `Task` (domaine). Le miroir nomme le titre `subject`
 * alors que le domaine le nomme `title` : on lit `subject` en priorité et on
 * retombe sur `title` (même dual-read défensif que `productivity-repo.ts`).
 * Les OR-Set arrivent en JSON (colonne TEXT) — on ne les invente jamais.
 */
export function mapTaskRow(row: TaskRow): Task {
  const orSet = (v: unknown): Task['tags'] => {
    if (Array.isArray(v)) return v as Task['tags'];
    if (typeof v === 'string' && v.length > 0) {
      try {
        const parsed: unknown = JSON.parse(v);
        return Array.isArray(parsed) ? (parsed as Task['tags']) : [];
      } catch {
        return [];
      }
    }
    return [];
  };
  const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v.length > 0 ? v : undefined;
  return {
    id: String(row.id ?? ''),
    userId: str(row.user_id) ?? str(row.userId) ?? '',
    title: str(row.subject) ?? str(row.title) ?? '',
    description: str(row.description),
    status: (str(row.status) ?? 'todo') as Task['status'],
    projectId: str(row.project_id),
    goalId: str(row.goal_id),
    dueAt: str(row.due_at),
    priority: typeof row.priority === 'number' ? row.priority : undefined,
    tags: orSet(row.tags),
    dependencies: orSet(row.dependencies),
    evidenceRefs: orSet(row.evidence_refs),
    recurring: typeof row.recurring === 'boolean' ? row.recurring : undefined,
    recurrenceRule: str(row.recurrence_rule),
    createdAt: str(row.created_at) ?? '',
    updatedAt: str(row.updated_at) ?? '',
  };
}

/**
 * Compose la session de données web (03 S8.1). Le moteur est construit mais
 * NON connecté : `connect()` est la porte de disponibilité.
 *
 * POURQUOI CETTE FABRIQUE EST ASYNCHRONE (et pourquoi ça compte)
 * `@aurora/data` traîne PowerSync + wa-sqlite (glue WASM) ; `@powersync/web`
 * traîne le sync engine et son worker. Importés statiquement, ils entraient
 * dans le bundle PRINCIPAL : 14 685 modules, ~15,8 Mo, et le `vite build` de
 * la CI mourait en `JavaScript heap out of memory` (mesuré, 4 Go de heap).
 * Un `import()` dynamique les déplace dans un chunk SÉPARÉ, chargé au montage
 * du provider — le bundle initial redevient celui d'avant L5.
 *
 * Ce n'est pas une optimisation cosmétique : c'est le correctif du gate. Le
 * budget perf (300 Ko gz, 02 S9.1) ne peut pas être tenu avec la glue WASM
 * dans le chemin critique.
 */
export async function createWebDataSession(env: WebDataEnv): Promise<WebDataSession> {
  // Le moteur n'entre dans le graphe qu'ici, jamais à l'évaluation du module.
  const [
    {
      createAuroraSupabaseClient,
      createPowerSyncClientEngine,
      EngineLocalStoreBridge,
      SqliteCommandRepository,
      SqliteQueryRepository,
      SYNC_STREAMS,
      UpsyncQueue,
    },
    { PowerSyncDatabase },
  ] = await Promise.all([import('@aurora/data'), import('@powersync/web')]);

  const clientFactory: () => AuroraSupabaseClient = () =>
    createAuroraSupabaseClient({
      env: {
        supabaseUrl: env.supabaseUrl ?? '',
        supabasePublishableKey: env.supabasePublishableKey ?? '',
      },
      powersyncUrl: env.powersyncUrl ?? '',
    });

  const engine: PowerSyncClientEngine = createPowerSyncClientEngine(
    {
      endpoint: env.powersyncUrl ?? '',
      createClient: clientFactory,
      dbFilename: env.dbFilename ?? 'aurora-web.db',
    },
    // La voie A web : WASQLite (IndexedDB) au lieu du Capacitor de mobile.
    // Le cast est le point d'injection prévu par le type : `PowerSyncDatabaseCtor`
    // est volontairement `unknown` sur `schema`/`database` pour rester
    // assignable aux deux moteurs (voir powersync-client.ts:35-39).
    PowerSyncDatabase as unknown as PowerSyncDatabaseCtor,
  );

  const bridge = new EngineLocalStoreBridge(engine.storeAdapter());
  // La file d'upsync AD-7 : même montage que `boot-data.ts` (le transport
  // montant réel est la file CRUD native de PowerSync ; cette file est la
  // trace locale des mutations, lue par le statut de synchro).
  const upsync = new UpsyncQueue();
  const commands = new SqliteCommandRepository(bridge, upsync);
  // Le mapper est BRANCHÉ : sans lui le repository livrait la ligne miroir
  // telle quelle (`subject`), et l'écran affichait un titre vide.
  const tasks = new SqliteQueryRepository<Task>(bridge, 'tasks', mapTaskRow);

  let state: WebSessionState = 'idle';
  let currentUserId: string | null = null;

  return {
    tasks,
    commands,
    store: () => bridge,
    userId: () => currentUserId,
    sessionState: () => state,

    async connect(): Promise<void> {
      // AD-7 : le miroir local est TOUJOURS disponible, session ou non.
      await engine.init();
      void bridge.bindEngineWatch('tasks');

      // PAS DE CONFIGURATION ≠ PANNE. Sans `VITE_SUPABASE_URL`/clé
      // publiables, `createClient` lève — mais ce n'est pas un échec : c'est
      // l'absence de relais, donc le mode local seul (AD-7). On le distingue
      // d'une erreur de session réelle, sinon l'UI annoncerait une panne
      // là où le produit fonctionne hors-ligne.
      const configured = Boolean(env.supabaseUrl && env.supabasePublishableKey);
      if (!configured) {
        // Chemin DEV de preuve. `import.meta.env.DEV` est remplacé par `false`
        // au build : Vite élimine la branche ET le chunk importé
        // (`lib/dev-session.ts`), donc aucun chemin d'identité synthétique ne
        // subsiste en production. Le flag runtime ne fait qu'armer la preuve.
        if (import.meta.env.DEV && env.VITE_LOCAL_DEV_SESSION === '1') {
          const { devLocalIdentity } = await import('./dev-session');
          currentUserId = devLocalIdentity(env.VITE_LOCAL_DEV_USER_ID);
          state = 'dev-local';
          return;
        }
        state = 'no-session';
        return;
      }

      let session: { user?: { id?: string } } | null = null;
      try {
        const { data } = await clientFactory().auth.getSession();
        session = data.session;
      } catch {
        state = 'error';
        return;
      }

      if (!session?.user?.id) {
        // Dégradé honnête : capture locale seulement, pas de relais.
        state = 'no-session';
        return;
      }

      currentUserId = session.user.id;
      state = 'signed-in';
      for (const stream of SYNC_STREAMS) {
        await engine.addScope(stream);
      }
    },

    async dispose(clear = false): Promise<void> {
      bridge.releaseEngineWatches();
      await engine.close(clear);
      currentUserId = null;
      state = 'idle';
    },
  };
}
