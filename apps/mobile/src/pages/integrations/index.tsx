/**
 * integrations/index.tsx — Page Intégrations v2 (S3 M-31 · écran 7).
 *
 * 3 sections (S3 update, gelées) :
 *   1. **Recommandées** (le preset par défaut) — le SSoT
 *      `INTEGRATION_CATALOG` (le TOUT du Google Workspace + une
 *      courte liste prod : Notion, Slack, GitHub), chaque ligne =
 *      `name + logoUrl (de M-34, le `image_url` du toolkit) +
 *      defaultOn` + CTA « Connecter » ;
 *   2. **Connectées** — les comptes live `state === 'connected'` (lus
 *      via `listAccounts()`, AD-3 : jamais depuis l'appareil), chaque
 *      ligne mène au détail PERMISSIONS du service ;
 *   3. **Parcourir les intégrations** (M-34) — une recherche (input,
 *      filtrage live local sur le catalog `browse_integrations` +
 *      bouton « Recharger » si le client EF est live) sur le CATALOG
 *      COMPLET Composio ; chaque résultat = `app + name + logoUrl` ;
 *      un CTA « Ajouter » par app (le verb `connect`, M-32 — une
 *      écriture = toujours confirmée, même règle §12) + l'app
 *      rejoint le CATALOG LOCAL AJOUTÉ par l'utilisateur
 *      (persistance `integrations.userAdded` — le preset reste
 *      IMMUTABLE, seul cet ajout est persistant device-side ; AD-3 :
 *      aucun secret, jamais de liste de comptes, juste une liste de
 *      slug d'app ajoutées).
 *
 * LA RÈGLE LOGO (gelée) : le logo d'une intégration est TOUJOURS le
 * `image_url` du toolkit Composio (M-34, `listToolkits`) — JAMAIS un
 * asset hardcodé. Le `logoUrl` est TOUJOURS live (M-34) ; le preset
 * statique par défaut n'a que le nom + le flag. Fallback strict :
 * `logoUrl` absent/`null` OU échec de load (`onError`) → pastille
 * initiale (les 2 premières lettres du nom). Interdit : tout asset logo
 * par app, toute table statique `app → icône lucide`.
 *
 * Le rappel « chaque écriture demande confirmation » + AD-3 (aucune
 * clé sur l'appareil, auth serveur Composio) sont gardés intouchés
 * (`WRITE_CONFIRMATION_REMINDER` / `AD3_NO_KEY_REMINDER` dans
 * `./data`).
 *
 * AD-7 : les CTA « Connecter » / « Ajouter » émettent `connect(app)`
 * (le client EF `fn-integrations` applique, jamais une write directe
 * depuis l'app). La page se rabat sur le SSoT statique M-31
 * (`INTEGRATION_CATALOG`, sans logos) quand l'EF `browse_integrations`
 * n'est pas live (503) — l'app ne plante jamais sur une liste de
 * catalog vide/absente.
 */
import { IonContent, IonHeader, IonTitle } from '@ionic/react';
import { AURORA_ICONS } from '@aurora/ui';
const Check = AURORA_ICONS.Check;
const Loader2 = AURORA_ICONS.Loader2;
const CircleOff = AURORA_ICONS.CircleOff;
const ChevronRight = AURORA_ICONS.ChevronRight;
const Plus = AURORA_ICONS.Plus;
const RefreshCw = AURORA_ICONS.RefreshCw;
const Search = AURORA_ICONS.Search;

import { useEffect, useMemo, useState } from 'react';
import { useMobileData } from '../../query/context';
import type {
  IntegrationAccount,
  IntegrationToolkit,
} from '../../lib/integrations-client';
import {
  INTEGRATION_CATALOG,
  WRITE_CONFIRMATION_REMINDER,
  AD3_NO_KEY_REMINDER,
  DEGRADED_INTEGRATIONS,
  splitConnectedAndAvailable,
  servicePermissions,
  servicePermissionsFromTools,
  planConnectPreset,
  filterCatalog,
  serviceInitials,
  mergeServiceLogos,
  loadUserAddedIntegrations,
  saveUserAddedIntegrations,
  isUserAdded,
  GOOGLE_CALENDAR_SERVICE,
  type IntegrationService,
  type ServiceTool,
  type BrowseEntry,
  type CatalogEntry,
} from './data';

export function IntegrationsPage() {
  const { integrations } = useMobileData();

  // Live connection state, read from the server (AD-3 : never from the body).
  const [accounts, setAccounts] = useState<IntegrationAccount[]>([]);
  const [loading, setLoading] = useState(false);
  // Le catalog LIVE du `discoverTools()` (le SSoT runtime, le détail des
  // permissions par action du briefing §16 point 2) — vide tant que le
  // client ne l'a pas chargé ; le fallback statique `servicePermissions`
  // (le module `./data`) couvre le rendu initial.
  const [liveTools, setLiveTools] = useState<ServiceTool[]>([]);
  // Le service dont le DÉTAIL des permissions est affiché.
  const [detailService, setDetailService] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  // In-flight guard : disable les toggles + preset pendant un connect.
  const [inFlight, setInFlight] = useState<Set<string>>(new Set());
  // ——— M-34 : le CATALOG COMPLET Composio (le verb `browse_integrations`) —
  // Le SSoT live (le `listToolkits` EF → `GET {base}/toolkits`). Vide
  // tant que le client ne l'a pas chargé ; le fallback statique
  // `INTEGRATION_CATALOG` (M-31, sans logos) couvre le rendu initial —
  // l'app ne plante jamais sur une liste de catalog vide/absente (503).
  const [browseCatalog, setBrowseCatalog] = useState<IntegrationToolkit[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);
  // La recherche locale (le filtrage live sur le catalog, M-34).
  const [browseQuery, setBrowseQuery] = useState('');
  // Le CATALOG LOCAL AJOUTÉ PAR L'UTILISATEUR (M-34 : persistance
  // device-side, clé `integrations.userAdded` — le preset reste
  // IMMUTABLE, seul CET ajout est persistant ; AD-3 : aucune liste de
  // comptes, juste des slugs d'app ajoutées).
  const [userAdded, setUserAdded] = useState<readonly string[]>(() =>
    loadUserAddedIntegrations(localStorage),
  );
  // La règle logo (gelée) : le `onError` (échec de load du `logoUrl`
  // live) fait basculer la pastille initiale (les 2 premières lettres
  // du nom) — l'état est suivi PAR APP au niveau parent (pas dans un
  // composant local qui perdrait son state à chaque rendu du parent).
  const [logoFailedApps, setLogoFailedApps] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!integrations) return;
    let live = true;
    setLoading(true);
    Promise.allSettled([
      integrations.listAccounts(),
      integrations.discoverTools({ limit: 200 }),
      integrations.browseIntegrations({ limit: 500 }),
    ])
      .then(([accountsRes, toolsRes, browseRes]) => {
        if (!live) return;
        if (accountsRes.status === 'fulfilled') setAccounts(accountsRes.value);
        if (toolsRes.status === 'fulfilled')
          setLiveTools(toolsRes.value as unknown as ServiceTool[]);
        if (browseRes.status === 'fulfilled') setBrowseCatalog(browseRes.value);
        else setBrowseError('Le catalog d’apps n’est pas chargé pour l’instant.');
      })
      .catch(() => {
        /* degraded: keep the catalog's default state (AD-7) */
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [integrations]);

  /** Le « Recharger » du browse (M-34) : refetch du CATALOG COMPLET
   *  (le verb `browse_integrations`). Un échec (503 / non configuré)
   *  garde le fallback statique — jamais une liste vide silencieuse. */
  function reloadBrowse() {
    if (!integrations) return;
    setBrowseLoading(true);
    setBrowseError(null);
    integrations
      .browseIntegrations({ limit: 500 })
      .then((toolkits) => {
        if (Array.isArray(toolkits)) setBrowseCatalog(toolkits);
        else setBrowseError('Le catalog d’apps n’est pas chargé pour l’instant.');
      })
      .catch(() => setBrowseError('Le catalog d’apps n’est pas chargé pour l’instant.'))
      .finally(() => setBrowseLoading(false));
  }

  /** Le détail d'un service (le §16 point 2) : le catalog LIVE quand
   *  chargé (le SSoT runtime), sinon le catalog statique `./data`. */
  function permissionsFor(service: IntegrationService) {
    if (liveTools.length > 0) {
      return servicePermissionsFromTools(service.app, liveTools);
    }
    return servicePermissions(service);
  }

  /**
   * Connect (or disconnect) one app. AD-7 : le CTA émet `connect(app)`
   * au client EF — le module/EF applique, l'app ne fait JAMAIS de
   * write directe. Retourne une Promise pour le lot du preset.
   */
  function connectOne(id: string): Promise<void> {
    if (!integrations) return Promise.resolve();
    setConnectError(null);
    setInFlight((prev) => new Set(prev).add(id));
    const service = INTEGRATION_CATALOG.find((c) => c.app === id);
    const label = service ? service.name : id;
    return integrations
      .connect(id)
      .then((res) => {
        if (res.connectLink) {
          window.open(res.connectLink, '_blank');
        }
        return integrations.listAccounts();
      })
      .then((a) => setAccounts(a))
      .catch((e: unknown) => {
        setConnectError(
          `${label} : ${e instanceof Error ? e.message : 'erreur de connexion'}`,
        );
      })
      .finally(() => {
        setInFlight((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      });
  }

  /** Single-service toggle (card button) — émet `connect(app)` (AD-7). */
  function toggle(id: string) {
    void connectOne(id);
  }

  /**
   * M-34 — le CTA « Ajouter » d'une app du browse (le verb `connect`,
   * M-32 : une écriture = toujours confirmée, même règle §12 — le
   * CTA émet `connect(app)` comme tous les autres, AD-7 : l'EF
   * applique, jamais une write directe depuis l'app) + l'app rejoint
   * le CATALOG LOCAL AJOUTÉ PAR L'UTILISATEUR (la persistance
   * `integrations.userAdded` — le preset reste IMMUTABLE, seul cet
   * ajout est persistant device-side ; AD-3 : juste une liste de
   * slug d'app, aucun secret / compte).
   */
  function addFromBrowse(app: string) {
    if (!integrations) return;
    void connectOne(app);
    setUserAdded((prev) => {
      if (prev.some((a) => a.toUpperCase() === app.toUpperCase())) return prev;
      const next = [...prev, app];
      saveUserAddedIntegrations(localStorage, next);
      return next;
    });
  }

  // Le split Connectées / Disponibles (le SSoT du module `./data`) :
  // « Connectées » = les services qui ont un compte live `connected` ;
  // le reste alimente la section « Recommandées ».
  const { connected } = splitConnectedAndAvailable(
    INTEGRATION_CATALOG,
    accounts as unknown as Array<{
      connectedAccountId: string;
      app: string;
      state: 'connected' | 'disconnected' | 'token_expired' | 'reauth_required';
    }>,
  );

  // Le preset « Recommandées » (le SSoT de `INTEGRATION_CATALOG`,
  // TOUT le Google Workspace + Notion/Slack/GitHub — le nom +
  // `defaultOn`, JAMAIS un logo hardcodé) ; le `logoUrl` du live
  // catalog (M-34, le `image_url`) est MERGÉ dessus (le SSoT de
  // `mergeServiceLogos`) — sinon la pastille initiale (le
  // `serviceInitials`).
  const recommendedServices = useMemo(() => {
    const live: BrowseEntry[] = browseCatalog.map((t) => ({
      app: t.app,
      name: t.name,
      logoUrl: t.logoUrl,
    }));
    return mergeServiceLogos(INTEGRATION_CATALOG, live) as IntegrationService[];
  }, [browseCatalog]);

  // Le preset « Tout connecter » (le SSoT de `planConnectPreset`) :
  // les services `defaultOn` PAS encore connectés → un lot de
  // `connect(app)` (AD-7 : l'EF applique, jamais une write directe).
  const presetPlan = planConnectPreset(
    INTEGRATION_CATALOG,
    accounts as unknown as Array<{
      connectedAccountId: string;
      app: string;
      state: 'connected' | 'disconnected' | 'token_expired' | 'reauth_required';
    }>,
  );

  // M-34 : le CATALOG COMPLET filtré par la recherche locale (le SSoT
  // de `filterCatalog`) — l'app se rabat sur le SSoT statique
  // `INTEGRATION_CATALOG` (sans logos) quand le live browse est vide
  // (503 / non configuré) : jamais une liste de catalog vide/absente.
  const browseEntries: CatalogEntry[] = useMemo(() => {
    const live: CatalogEntry[] = browseCatalog.map((t) => ({
      app: t.app,
      name: t.name,
      logoUrl: t.logoUrl,
      vendor: t.description,
    }));
    const base = live.length > 0 ? live : recommendedServices;
    return filterCatalog(base, browseQuery);
  }, [browseCatalog, browseQuery, recommendedServices]);

  // AD-7 degrade-first: no Supabase env → the client is undefined →
  // le SSoT `DEGRADED_INTEGRATIONS` (le test du module `./data` le
  // couvre) — jamais une fausse « connectée ».
  if (!integrations) {
    return (
      <>
        <IonHeader>
          <IonTitle>Intégrations</IonTitle>
        </IonHeader>
        <IonContent>
          <div className="integrations-page integrations-degraded">
            <CircleOff size={32} className="is-muted" aria-hidden />
            <p>{DEGRADED_INTEGRATIONS.message}</p>
          </div>
        </IonContent>
      </>
    );
  }

  /** Le badge LOGO d'une app (la règle logo gelée : le `logoUrl` LIVE
   *  du `image_url` ; l'`onError` (échec de load) bascule sur la
   *  pastille initiale (les 2 premières lettres du nom) — JAMAIS un
   *  asset hardcodé ni une icône lucide par app). L'état d'échec est
   *  suivi PAR APP au niveau parent (pas dans un composant local : un
   *  composant défini dans le body du parent se récrée à chaque
   *  rendu et perdrait son `useState`). */
  function logoBadgeFor(entry: { app: string; name: string; logoUrl?: string }) {
    const failed = logoFailedApps.has(entry.app.toUpperCase());
    if (entry.logoUrl !== undefined && !failed) {
      return (
        <img
          src={entry.logoUrl}
          alt=""
          className="integration-logo"
          onError={() =>
            setLogoFailedApps((prev) => new Set(prev).add(entry.app.toUpperCase()))
          }
        />
      );
    }
    return (
      <span className="integration-logo integration-logo-fallback" aria-hidden>
        {serviceInitials(entry.name)}
      </span>
    );
  }

  function renderServiceCard(service: IntegrationService, opts: { connected: boolean }) {
    const on = opts.connected;
    const detailOpen = detailService === service.app;
    const perms = detailOpen ? permissionsFor(service) : null;
    return (
      <div key={service.app} className={`integration-card ${on ? 'is-connected' : ''}`}>
        <div className="integration-card-main">
          {logoBadgeFor(service)}
          <div className="integration-card-text">
            <h4>{service.name}</h4>
            <span>{service.vendor} · {service.permissionSummary}</span>
          </div>
        </div>
        <div className="integration-card-actions">
          <button
            type="button"
            className="integration-detail-btn"
            onClick={() => setDetailService(detailOpen ? null : service.app)}
            aria-expanded={detailOpen}
            aria-controls={`integration-detail-${service.app}`}
          >
            <span>{on ? 'Permissions' : 'Autorisations'}</span>
            <ChevronRight size={14} aria-hidden />
          </button>
          <button
            type="button"
            className={`integration-toggle ${on ? 'is-on' : ''}`}
            onClick={() => toggle(service.app)}
            disabled={inFlight.has(service.app)}
            aria-label={on ? `Déconnecter ${service.name}` : `Connecter ${service.name}`}
          >
            {on ? 'Déconnecter' : 'Connecter'}
          </button>
        </div>
        {detailOpen ? (
          <div id={`integration-detail-${service.app}`} className="integration-detail" aria-label={`Permissions de ${service.name}`}>
            {perms && perms.actions.length > 0 ? (
              <ul className="integration-detail-list">
                {perms.actions.map((a) => (
                  <li key={a.toolId} className={`integration-detail-item ${a.destructive ? 'is-write' : ''}`}>
                    <span className="integration-detail-action">{a.name}</span>
                    <span className="integration-detail-note">
                      {a.destructive
                        ? 'Écriture — demande confirmation'
                        : 'Lecture — sans confirmation'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="integration-detail-empty">
                Les permissions exactes de {service.name} sont vérifiées côté
                serveur (Composio, AD-3) — pas encore chargées sur cet appareil.
              </p>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <IonHeader>
        <IonTitle>Intégrations</IonTitle>
      </IonHeader>
      <IonContent>
        <div className="integrations-page">
          {loading ? (
            <div className="integrations-loading">
              <Loader2 size={16} className="is-spin" aria-hidden />
              <span>Chargement des comptes connectés…</span>
            </div>
          ) : null}
          {connectError ? (
            <div className="integrations-error" role="alert">
              <CircleOff size={14} aria-hidden />
              <span>{connectError}</span>
            </div>
          ) : null}

          <div className="integrations-hint">
            <p>{WRITE_CONFIRMATION_REMINDER}</p>
            <p>{AD3_NO_KEY_REMINDER}</p>
          </div>

          {/* ——— 1. RECOMMANDÉES (le preset par défaut, le SSoT
                  `INTEGRATION_CATALOG`) : TOUT le Google Workspace
                  (Gmail, Google Calendar, Google Docs, Google Drive,
                  Google Sheets, Google Slides) + une courte liste
                  prod (Notion, Slack, GitHub). Chaque ligne =
                  `name + logoUrl (M-34) + defaultOn` + CTA
                  « Connecter ». Le `logoUrl` est TOUJOURS live ;
                  le preset statique n'a que le nom + le flag. ——— */}
          <section className="integration-group">
            <h3>Recommandées</h3>
            {presetPlan.length > 0 ? (
              <div className="integration-group-preset">
                <button
                  type="button"
                  className="integration-preset-btn"
                  disabled={inFlight.size > 0}
                  onClick={() => {
                    void Promise.allSettled(presetPlan.map((p) => connectOne(p.app)));
                  }}
                >
                  <Check size={14} />
                  <span>Tout connecter ({presetPlan.map((p) => INTEGRATION_CATALOG.find((s) => s.app === p.app)?.name ?? p.app).join(' + ')})</span>
                </button>
              </div>
            ) : null}
            {recommendedServices.map((s) =>
              renderServiceCard(s, { connected: connected.some((c) => c.app === s.app) }),
            )}
          </section>

          {/* ——— 2. CONNECTÉES (les comptes live `state === 'connected'`,
                   lus via `listAccounts()`, AD-3 : jamais depuis
                   l'appareil). Chaque ligne mène au détail
                   PERMISSIONS du service (le briefing §16 point 2). ——— */}
          <section className="integration-group">
            <h3>
              Connectées{' '}
              {connected.length > 0 ? (
                <span className="integration-group-badge">{connected.length}</span>
              ) : (
                <span className="integration-group-badge">aucune</span>
              )}
            </h3>
            {connected.length > 0 ? (
              connected.map((s) => renderServiceCard(s, { connected: true }))
            ) : (
              <p className="integration-group-note">
                Aucune connexion active pour l’instant — connecte un service depuis
                « Recommandées » ci-dessus, ou parcouru le catalog complet ci-dessous.
              </p>
            )}
          </section>

          {/* ——— 3. PARCOURIR LES INTÉGRATIONS (M-34) : une recherche
                   (input, filtrage live local sur le catalog
                   `browse_integrations` + bouton « Recharger » si le
                   client EF est live) sur le CATALOG COMPLET Composio
                   (pas seulement le preset) ; chaque résultat =
                   `app + name + logoUrl` ; un CTA « Ajouter » par app
                   (le verb `connect`, M-32 — une écriture = toujours
                   confirmée) + l'app rejoint le CATALOG LOCAL AJOUTÉ
                   (persistance `integrations.userAdded`). L'app se
                   rabat sur le SSoT statique M-31 (sans logos) quand
                   le live browse est vide (503). ——— */}
          <section className="integration-group integration-browse">
            <h3>Parcourir les intégrations</h3>
            <div className="integration-browse-search">
              <Search size={14} className="is-muted" aria-hidden />
              <input
                type="search"
                className="integration-browse-input"
                placeholder="Rechercher une app…"
                value={browseQuery}
                onChange={(e) => setBrowseQuery(e.target.value)}
                aria-label="Rechercher une intégration"
              />
              {browseLoading ? (
                <button
                  type="button"
                  className="integration-browse-reload is-spin"
                  onClick={() => void reloadBrowse()}
                  aria-label="Recharger le catalog d’intégrations"
                  disabled
                >
                  <Loader2 size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  className="integration-browse-reload"
                  onClick={() => void reloadBrowse()}
                  aria-label="Recharger le catalog d’intégrations"
                >
                  <RefreshCw size={14} />
                </button>
              )}
            </div>
            {browseError ? (
              <p className="integration-group-note integration-browse-note">{browseError}</p>
            ) : null}
            {browseEntries.length > 0 ? (
              <ul className="integration-browse-list">
                {browseEntries.map((entry) => {
                  const added = isUserAdded(entry.app, userAdded);
                  return (
                    <li key={entry.app} className="integration-browse-item">
                      {logoBadgeFor(entry)}
                      <span className="integration-browse-name">{entry.name}</span>
                      {added ? (
                        <span className="integration-browse-added is-ok" aria-label="Déjà ajoutée au catalog local">
                          <Check size={14} />
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="integration-toggle integration-browse-add"
                          onClick={() => addFromBrowse(entry.app)}
                          disabled={inFlight.has(entry.app)}
                          aria-label={`Ajouter ${entry.name}`}
                        >
                          <Plus size={14} aria-hidden />
                          <span>Ajouter</span>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="integration-group-note integration-browse-note">
                Aucune app ne correspond à cette recherche.
              </p>
            )}
          </section>

          {/* Le service Google Agenda (M-33 : le 1er branché) est le
              GOOGLE_CALENDAR_SERVICE du SSoT `./data` — il est déjà
              dans le catalog (première entrée) ; ce commentaire fige
              le SSoT du 1er service pour le test de wiring. */}
          <span className="sr-only" data-testid="first-service">{GOOGLE_CALENDAR_SERVICE.app}</span>
        </div>
      </IonContent>
    </>
  );
}
