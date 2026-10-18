/**
 * integrations/data.ts — SSoT de la Page Intégrations v2 (S3, M-31 · écran 7).
 *
 * Le SSoT pur de l'écran 7 (briefing §8 « Page Intégrations » + le plan S3
 * M-31) : zéro React, zéro réseau, zéro PowerSync (le pattern
 * `veille-programs-join.js` de la repo — le test `integrations-wiring.test.ts`
 * importe CE module, pas le composant `.tsx` qui ne résout pas sous
 * node:test, à cause de l'import `@ionic/react` → `@ionic/core/components`).
 *
 * Les 2 sections de l'écran 7 (Q6, gelées au S0) :
 *   - **Connectées** : Google Agenda (lecture + écriture), Google Docs
 *     (lecture + création) — chaque ligne mène aux PERMISSIONS du service
 *     (le briefing §16 point 2 « Détail d'une intégration (permissions par
 *     action) ») ;
 *   - **Disponibles** : Google Drive, Gmail, Notion — bouton « Connecter ».
 *
 * Le rappel du plan §12 (CONFIRMATION_REQUIRED) : chaque ÉCRITURE demande
 * confirmation — la lecture non. Et AD-3 : aucune clé ne passe par
 * l'appareil (l'auth est côté serveur, Composio).
 *
 * AD-1 : le module Discovery/Agent n'appelle JAMAIS le vendor (Composio
 * vit dans l'EF `fn-integrations` — ce module décrit seulement le
 * CATALOG statique device-side, le subset v3.1 du toolkit catalog
 * (le même que l'ancienne page — 9 connecteurs → le subset MVP v2, 6
 * services du briefing §8, dont le Google Agenda 1er branché (M-33))).
 */

/**
 * Le type d'un tool du composio SSoT (`ComposioTool`, le
 * `IntegrationTool` de `integrations-client.ts` L20-27) — re-déclaré
 * ici (structural, zéro import du package : ce module est du pure-JS
 * device-side, le `ComposioTool` reste le SSoT dans le package
 * `@aurora/integrations` — AD-1, jamais d'import du vendor côté app).
 */
export interface ServiceTool {
  toolId: string;
  app: string;
  name: string;
  description?: string;
  requiredAuth: 'oauth' | 'api-key' | 'none';
  /**
   * Le flag SSoT du PERMISSION ENGINE (briefing §12 + composio.md §8) :
   * `destructive: true` = l'action est une ÉCRITURE dans le service
   * externe (créer/modifier/supprimer) → CONFIRMATION_REQUIRED.
   * Absent / `false` = lecture.
   */
  destructive?: boolean;
}

/** Le détail d'un service (briefing §16 point 2 — permissions par action). */
export interface ServicePermissions {
  app: string;
  /** les actions de LECTURE (jamais de confirmation). */
  reads: ServiceTool[];
  /** les actions d'ÉCRITURE (chacune = CONFIRMATION_REQUIRED, §12). */
  writes: ServiceTool[];
  /** le CATALOG des actions du service (reads + writes, l'ordre SSoT). */
  actions: ServiceTool[];
}

/**
 * Une ligne du catalog de l'écran 7 (le service externe de l'agent).
 *
 * LA RÈGLE LOGO (S3 update, gelée) : le logo d'une intégration est
 * TOUJOURS le `image_url` du toolkit Composio (M-34, `listToolkits`) —
 * JAMAIS un asset hardcodé (`assets/*logo*.png`) ni une table statique
 * `app → icône`. Ce SSoT statique ne porte que le NOM + `defaultOn` ;
 * le `logoUrl?` vient du catalog LIVE (absent ici) et son fallback
 * (pas d'image / échec de load) = la pastille initiale (les 2
 * premières lettres du nom).
 */
export interface IntegrationService {
  /** le slug SSoT du toolkit Composio v3.1 (le `connect(app)` est passé à ce slug, AD-7 : l'EF applique). */
  app: string;
  /** le nom affiché (français, zéro jargon — roadmap 10-07). */
  name: string;
  /** le vendor (le preset « Google Workspace par défaut » du plan Q6). */
  vendor: string;
  /** le 1er service branché (M-33 : Google Agenda). */
  firstService?: boolean;
  /** le preset Google Workspace = `defaultOn: true` (le briefing §8 : « Google Workspace by default »). */
  defaultOn: boolean;
  /** la permission résumé affichée sous le nom (briefing §8 : Agenda = lecture + écriture, Docs = lecture + création, …). */
  permissionSummary: string;
  /** le logo LIVE (le `image_url` du toolkit, M-34 `listToolkits`). */
  logoUrl?: string;
}

/** Le plan d'un CTA « Connecter » (AD-7 : le module/EF applique, jamais l'app). */
export interface ConnectPlan {
  app: string;
  /** le verb SSoT émis par le CTA (le client EF `fn-integrations` l'applique — le plan §12 : jamais de write directe depuis l'app). */
  verb: 'connect';
}

/** L'état dégradé AD-7 (pas de client : pas de Supabase env → pas de connexion possible). */
export interface DegradedIntegrations {
  connected: IntegrationService[];
  /** le catalog à afficher quand le client est présent ; `undefined` = à masquer (état dégrade). */
  available?: IntegrationService[];
  message: string;
}

// ——— Le CATALOG v2 (le subset MVP du briefing §8, Q6 gelée au S0) ———————
//
// L'ancienne page (v1) portait 9 connecteurs (le preset « Tout connecter »
// + Spotify + Slack + GitHub). Le v2 resserrer à 6 (le briefing §8) :
// Google Agenda (1er branché, M-33) + Google Docs = « Connectées » quand
// les comptes sont live ; Drive, Gmail, Notion = « Disponibles » par
// défaut. Spotify/Slack/GitHub/Sheets sont hors MVP (le config suivant —
// le plan S3 M-33 : « le reste des services est configurable »).

/** Le slug SSoT du connecteur Google Agenda (le toolkit Composio v3.1
 *  `GOOGLECALENDAR` — le SSoT du code existant, le `Connector` L41 de la
 *  page v1 + le `DEFAULT_CONNECTORS` de `pages/agent/index.tsx`).
 *  M-33 : c'est le 1er service branché. */
export const GOOGLE_CALENDAR_SERVICE: IntegrationService = {
  app: 'GOOGLECALENDAR',
  name: 'Google Agenda',
  vendor: 'Google Workspace',
  firstService: true,
  defaultOn: true,
  permissionSummary: 'Lecture et écriture de l’agenda (créer/modifier un event) — chaque écriture demandera confirmation.',
};

export const INTEGRATION_CATALOG: readonly IntegrationService[] = [
  GOOGLE_CALENDAR_SERVICE,
  {
    app: 'GOOGLEDOCS',
    name: 'Google Docs',
    vendor: 'Google Workspace',
    defaultOn: true,
    permissionSummary: 'Lecture et création de documents — chaque écriture demandera confirmation.',
  },
  {
    app: 'GOOGLEDRIVE',
    name: 'Google Drive',
    vendor: 'Google Workspace',
    defaultOn: true,
    permissionSummary: 'Lecture des fichiers du Drive.',
  },
  {
    app: 'GOOGLESHEETS',
    name: 'Google Sheets',
    vendor: 'Google Workspace',
    defaultOn: true,
    permissionSummary: 'Lecture et édition de feuilles de calcul — chaque écriture demandera confirmation.',
  },
  {
    app: 'GOOGLESLIDES',
    name: 'Google Slides',
    vendor: 'Google Workspace',
    defaultOn: true,
    permissionSummary: 'Lecture et édition de présentations — chaque écriture demandera confirmation.',
  },
  {
    app: 'GMAIL',
    name: 'Gmail',
    vendor: 'Google Workspace',
    defaultOn: true,
    permissionSummary: 'Lecture et envoi de mails — chaque envoi demandera confirmation.',
  },
  {
    app: 'NOTION',
    name: 'Notion',
    vendor: 'Notion',
    defaultOn: true,
    permissionSummary: 'Lecture et création de pages — chaque écriture demandera confirmation.',
  },
  {
    app: 'SLACK',
    name: 'Slack',
    vendor: 'Slack',
    defaultOn: true,
    permissionSummary: 'Lecture et envoi de messages — chaque écriture demandera confirmation.',
  },
  {
    app: 'GITHUB',
    name: 'GitHub',
    vendor: 'GitHub',
    defaultOn: true,
    permissionSummary: 'Lecture et actions sur issues/PR — chaque écriture demandera confirmation.',
  },
];

// ——— M-34 : le CATALOG COMPLET (le « Parcourir les intégrations ») ———
//
// La section 3 de l'écran 7 (S3 update) liste le CATALOG COMPLET
// Composio (le verb `browse_integrations` → `GET {base}/toolkits`),
// PAS seulement le preset v2 ci-dessus. Un outil local de recherche
// filtre les résultats en temps réel (le SSoT `filterCatalog`) ; les
// apps de ce preset local sont le subset MVP du `browse_integrations`
// quand l'EF (le client Composio) est live.

export interface CatalogEntry {
  /** le slug SSoT du toolkit Composio (l'id de `connect(app)`) */
  app: string;
  /** le nom affiché */
  name: string;
  /** le logo LIVE (le `image_url` du toolkit, M-34) */
  logoUrl?: string;
  /** le vendor */
  vendor?: string;
}

export function filterCatalog(
  catalog: readonly CatalogEntry[],
  query: string,
): CatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (q === '') return [...catalog];
  return catalog.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.app.toLowerCase().includes(q) ||
      (e.vendor?.toLowerCase().includes(q) ?? false),
  );
}

// ——— M-34 : la persistance device-side du CATALOG local ajouté ———
//
// Le S3 update M-34 (§3) : le CTA « Ajouter » d'une app du browse
// rejoint le CATALOG LOCAL AJOUTÉ PAR L'UTILISATEUR (persistance
// `@capacitor/preferences` / localStorage, clé SSoT ci-dessous). Le
// preset par défaut reste IMMUTABLE ; seul CET ajout est persistant
// device-side (AD-3 : aucun secret, jamais de liste de comptes sur
// l'appareil, juste une liste de slug d'app ajoutées).

export const USER_ADDED_INTEGRATIONS_KEY = 'integrations.userAdded';

/**
 * La clé SSoT du catalog local ajouté (M-34) : `integrations.userAdded`
 * (la persistance device-side — le preset par défaut reste immutable,
 * seul CET ajout est persistant ; AD-3 : jamais de compte / secret,
 * seulement des slugs d'app ajoutées). Le format de stockage est une
 * JSON string (un tableau de slugs d'app) que le composant lit/écrit
 * via `localStorage` (le bridge webview du Capacitor, le même que
 * `ui-state.ts`).
 */
export type UserAddedIntegrations = string[];

export function loadUserAddedIntegrations(storage: Pick<Storage, 'getItem'>): UserAddedIntegrations {
  try {
    const raw = storage.getItem(USER_ADDED_INTEGRATIONS_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === 'string');
  } catch {
    return [];
  }
}

export function saveUserAddedIntegrations(storage: Pick<Storage, 'setItem'>, apps: UserAddedIntegrations): void {
  storage.setItem(USER_ADDED_INTEGRATIONS_KEY, JSON.stringify(apps));
}

export function isUserAdded(app: string, userAdded: readonly string[]): boolean {
  return userAdded.some((a) => a.toUpperCase() === app.toUpperCase());
}

// ——— Les PERMISSIONS par action (le SSoT device-side, le subset du
//      `discoverTools()` qui RESTE le SSoT runtime — ce catalog statique
//      sert le DÉTAIL d'un service (le briefing §16 point 2) quand le
//      live catalog n'est pas chargé ; l'EF valide chaque slug contre le
//      catalog live avant exécution, un slug périmé ici ne corrompt
//      rien (le même garant que la page v1) ——————————————————————————

const PERMISSIONS_BY_SERVICE: Record<string, readonly ServiceTool[]> = {
  GOOGLECALENDAR: [
    { toolId: 'GOOGLECALENDAR_LIST_EVENTS', app: 'GOOGLECALENDAR', name: 'list_events', description: 'Lire les events de l’agenda', requiredAuth: 'oauth' },
    { toolId: 'GOOGLECALENDAR_GET_EVENT', app: 'GOOGLECALENDAR', name: 'get_event', description: 'Lire un event précis', requiredAuth: 'oauth' },
    { toolId: 'GOOGLECALENDAR_CREATE_EVENT', app: 'GOOGLECALENDAR', name: 'create_event', description: 'Créer un event (lecture seule non) — CONFIRMATION_REQUIRED', requiredAuth: 'oauth', destructive: true },
    { toolId: 'GOOGLECALENDAR_UPDATE_EVENT', app: 'GOOGLECALENDAR', name: 'update_event', description: 'Modifier un event — CONFIRMATION_REQUIRED', requiredAuth: 'oauth', destructive: true },
  ],
  GOOGLEDOCS: [
    { toolId: 'GOOGLEDOCS_READ_DOCUMENT', app: 'GOOGLEDOCS', name: 'read_document', description: 'Lire un document', requiredAuth: 'oauth' },
    { toolId: 'GOOGLEDOCS_CREATE_DOCUMENT', app: 'GOOGLEDOCS', name: 'create_document', description: 'Créer un document — CONFIRMATION_REQUIRED', requiredAuth: 'oauth', destructive: true },
    { toolId: 'GOOGLEDOCS_APPEND_DOCUMENT', app: 'GOOGLEDOCS', name: 'append_document', description: 'Écrire dans un document — CONFIRMATION_REQUIRED', requiredAuth: 'oauth', destructive: true },
  ],
  GOOGLEDRIVE: [
    { toolId: 'GOOGLEDRIVE_LIST_FILES', app: 'GOOGLEDRIVE', name: 'list_files', description: 'Liser les fichiers du Drive', requiredAuth: 'oauth' },
    { toolId: 'GOOGLEDRIVE_GET_FILE', app: 'GOOGLEDRIVE', name: 'get_file', description: 'Liser le contenu d’un fichier', requiredAuth: 'oauth' },
  ],
  GMAIL: [
    { toolId: 'GMAIL_READ_MESSAGE', app: 'GMAIL', name: 'read_message', description: 'Lire un mail', requiredAuth: 'oauth' },
    { toolId: 'GMAIL_LIST_MESSAGES', app: 'GMAIL', name: 'list_messages', description: 'Lister les mails du compte', requiredAuth: 'oauth' },
    { toolId: 'GMAIL_SEND_EMAIL', app: 'GMAIL', name: 'send_email', description: 'Envoyer un mail — CONFIRMATION_REQUIRED', requiredAuth: 'oauth', destructive: true },
  ],
  NOTION: [
    { toolId: 'NOTION_READ_PAGE', app: 'NOTION', name: 'read_page', description: 'Lire une page', requiredAuth: 'oauth' },
    { toolId: 'NOTION_CREATE_PAGE', app: 'NOTION', name: 'create_page', description: 'Créer une page — CONFIRMATION_REQUIRED', requiredAuth: 'oauth', destructive: true },
    { toolId: 'NOTION_UPDATE_PAGE', app: 'NOTION', name: 'update_page', description: 'Modifier une page — CONFIRMATION_REQUIRED', requiredAuth: 'oauth', destructive: true },
  ],
  SLACK: [
    { toolId: 'SLACK_READ_CHANNEL', app: 'SLACK', name: 'read_channel', description: 'Lire un canal', requiredAuth: 'oauth' },
    { toolId: 'SLACK_SEND_MESSAGE', app: 'SLACK', name: 'send_message', description: 'Envoyer un message — CONFIRMATION_REQUIRED', requiredAuth: 'oauth', destructive: true },
  ],
  GITHUB: [
    { toolId: 'GITHUB_LIST_REPOS', app: 'GITHUB', name: 'list_repos', description: 'Lister les dépôts', requiredAuth: 'oauth' },
    { toolId: 'GITHUB_CREATE_ISSUE', app: 'GITHUB', name: 'create_issue', description: 'Créer une issue — CONFIRMATION_REQUIRED', requiredAuth: 'oauth', destructive: true },
  ],
};

// ——— Les rappels SSoT (le plan §12 : CONFIRMATION_REQUIRED + AD-3) ————

/** Le rappel « chaque écriture demande confirmation » (briefing §8 + le plan §12). */
export const WRITE_CONFIRMATION_REMINDER =
  'Chaque écriture dans un service (agenda, docs, mails…) demande ta confirmation avant d’être appliquée. La lecture est sans confirmation.';

/** Le rappel AD-3 (aucune clé sur l'appareil, auth serveur). */
export const AD3_NO_KEY_REMINDER =
  'Aucune clé ne passe par cet appareil : l’authentification se fait côté serveur (Composio). Rien n’est stocké ici.';

// ——— La dégradation AD-7 (client absent) ——————————————————————————

/** L'état honnête quand le client EF est absent (pas de Supabase env) : section Connectées VIDE, section Disponibles à masquer (`available === undefined`), le message SSoT de la dégradation AD-7 (jamais une fausse connexion). */
export const DEGRADED_INTEGRATIONS: DegradedIntegrations = {
  connected: [],
  message: 'Les intégrations ne sont pas encore prêtes sur cet appareil.',
};

// ——— Les fonctions pures du SSoT (le test d'abord, `integrations-wiring.test.ts`) ———

/** Le détail d'un service par action (le briefing §16 point 2) : lecture/écriture par action, chaque écriture = `destructive` (le flag SSoT du Permission Engine). `service` peut être le slug ou l'objet du service (le typage de la page passe l'objet du catalog). */
export function servicePermissions(
  service: string | IntegrationService,
): ServicePermissions {
  const app = (typeof service === 'string' ? service : service.app).toUpperCase();
  const actions: ServiceTool[] = [...(PERMISSIONS_BY_SERVICE[app] ?? [])];
  return {
    app,
    reads: actions.filter((t) => !t.destructive),
    writes: actions.filter((t) => t.destructive === true),
    actions,
  };
}

/**
 * Le même détail, mais bâti depuis le CATALOG LIVE du `discoverTools()`
 * (le SSoT runtime — le `IntegrationTool[]` normalisé par
 * `integrations-client.ts`, AD-1 : ce module n'importe JAMAIS le
 * vendor, le struct `ServiceTool` est le même shape que le `ComposioTool`
 * du package `@aurora/integrations`). Quand le catalog live est chargé
 * (le `useEffect` de la page), CE calcul remplace le catalog statique
 * (le `PERMISSIONS_BY_SERVICE`) — un tool inconnu au statique (nouveau
 * toolkit) n'est pas masqué.
 */
export function servicePermissionsFromTools(app: string, tools: ServiceTool[]): ServicePermissions {
  const actions = tools.filter((t) => t.app.toUpperCase() === app.toUpperCase());
  const readActions = actions
    .filter((t) => t.destructive !== true)
    .map((t) => ({ ...t, destructive: false as const }));
  const writeActions = actions.filter((t) => t.destructive === true);
  return {
    app,
    reads: readActions,
    writes: writeActions,
    actions: [...readActions, ...writeActions],
  };
}

/** Le flag SSoT « est-ce une écriture ? » (le plan §12 : `destructive`/write = confirmation ; lecture = non). */
export function isWriteAction(tool: ServiceTool): boolean {
  return tool.destructive === true;
}

// ——— LA RÈGLE LOGO (S3 update, gelée) ——————————————————————————
//
// Le logo d'une intégration est TOUJOURS le `image_url` du toolkit
// Composio (M-34, `listToolkits`) — JAMAIS un asset hardcodé ni une
// table statique `app → icône`. Le `logoUrl` du live catalog est
// MERGÉ sur le preset statique (qui ne porte que le nom + `defaultOn`),
// et son fallback (absent / échec de load) = la pastille initiale :
// les 2 premières lettres du nom.

/** Les 2 premières lettres du nom (le fallback pastille initiale). */
export function serviceInitials(name: string): string {
  const s = name.trim();
  if (s.length === 0) return '?';
  return s.slice(0, 2).toUpperCase();
}

/** Une entrée du browse (M-34) : le slug + le nom + le logo live. */
export interface BrowseEntry {
  app: string;
  name: string;
  logoUrl?: string;
}

/**
 * Le merge SSoT (la règle logo) : chaque service du preset (le nom +
 * `defaultOn` immutable) reçoit le `logoUrl` du live catalog quand il
 * existe (le `image_url` de l'app) ; sinon le logo reste `undefined`
 * et le composant affiche la pastille initiale (le `serviceInitials`).
 * Les apps du browse (hors preset) ne sont JAMAIS ajoutées au preset
 * — le preset reste immutable (M-34 : seul le catalog local ajouté est
 * persistant).
 */
export function mergeServiceLogos(
  services: readonly (IntegrationService | BrowseEntry)[],
  live: readonly BrowseEntry[],
): Array<IntegrationService | BrowseEntry> {
  const byApp = new Map<string, BrowseEntry>();
  for (const e of live) byApp.set(e.app.toUpperCase(), e);
  return services.map((s) => {
    const app = (s as IntegrationService & BrowseEntry).app.toUpperCase();
    const liveEntry = byApp.get(app);
    return liveEntry?.logoUrl ? { ...s, logoUrl: liveEntry.logoUrl } : s;
  });
}

export interface ConnectedAccounts {
  connectedAccountId: string;
  app: string;
  state: 'connected' | 'disconnected' | 'token_expired' | 'reauth_required';
  lastCheckedAt?: string;
}

export interface SplitCatalog {
  /** la section « Connectées » (les services du catalog qui ont un compte live `connected`). */
  connected: IntegrationService[];
  /** la section « Disponibles » (le reste du catalog, chaque service avec le CTA « Connecter »). */
  available: Array<IntegrationService & { connectable: boolean }>;
}

/**
 * Le split Connectées / Disponibles (le briefing §8 + le Q6 gelée) :
 * « Connectées » = les services du catalog qui ont un compte LIVE
 * (`state === 'connected'`, lu depuis le client EF `listAccounts()`,
 * AD-3 : JAMAIS lu depuis l'appareil) ; « Disponibles » = le reste du
 * catalog (bouton « Connecter »). Un service absent du catalog (un
 * compte live pour un toolkit hors MVP) est ignoré ici — il reste
 * géré par l'EF (le `listAccounts` SSoT), pas par l'écran.
 */
export function splitConnectedAndAvailable(
  catalog: readonly IntegrationService[],
  accounts: readonly ConnectedAccounts[],
): SplitCatalog {
  const connectedApps = new Set(
    accounts.filter((a) => a.state === 'connected').map((a) => a.app.toUpperCase()),
  );
  return {
    connected: catalog.filter((s) => connectedApps.has(s.app.toUpperCase())),
    available: catalog
      .filter((s) => !connectedApps.has(s.app.toUpperCase()))
      .map((s) => ({ ...s, connectable: true })),
  };
}

/**
 * Le plan du CTA « Tout connecter » (le preset Google Workspace par
 * défaut, le plan Q6) : chaque service du preset (`defaultOn: true`)
 * PAS ENCORE connecté devient un item `connect(app)` — le client EF
 * `fn-integrations` applique le connect (AD-7 : l'app ne fait JAMAIS de
 * write directe, elle émet le plan, le module/EF l'applique). Un
 * service déjà connecté est éliminé (re-connect = no-op honest).
 */
export function planConnectPreset(
  catalog: readonly IntegrationService[],
  accounts: readonly ConnectedAccounts[],
): ConnectPlan[] {
  const connectedApps = new Set(
    accounts.filter((a) => a.state === 'connected').map((a) => a.app.toUpperCase()),
  );
  return catalog
    .filter((s) => s.defaultOn && !connectedApps.has(s.app.toUpperCase()))
    .map((s) => ({ app: s.app, verb: 'connect' as const }));
}
