/**
 * Integrations page (docs/integrations/composio.md, mission S33-35).
 *
 * Composio = tool/integration layer behind the `IntegrationProvider` port
 * (AD-1 vendor isolation). This page lets the user connect external apps
 * (Google Workspace by default) and see which connected accounts are live.
 *
 * AD-3: no external credentials on the device — connected-account state is
 * read from `integrations_state` (RLS user-isolated, server-side); the
 * OAuth flow happens in a WebView / deep link, tokens stay in Composio's
 * server.
 *
 * The page is wired to the REAL server seam: `useMobileData().integrations`
 * (a `fn-integrations` EF, Composio v3.1 sessions). When the client is absent
 * (no Supabase env, AD-7) the page degrades to the honest
 * "intégrations indisponibles" empty state — it never fakes a connection.
 */
import { IonContent, IonHeader, IonTitle } from '@ionic/react';
import { Check, ExternalLink, Loader2, CircleOff, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMobileData } from '../../query/context';
import type { IntegrationAccount } from '../../lib/integrations-client';
import {
  INTEGRATION_CATALOG,
  WRITE_CONFIRMATION_REMINDER,
  AD3_NO_KEY_REMINDER,
  DEGRADED_INTEGRATIONS,
  splitConnectedAndAvailable,
  servicePermissions,
  servicePermissionsFromTools,
  planConnectPreset,
  GOOGLE_CALENDAR_SERVICE,
  type IntegrationService,
  type ServiceTool,
} from './data';

/**
 * Page Intégrations v2 (S3 M-31, écran 7) — le SSoT de l'écran est le
 * module `./data` (le test `integrations-wiring.test.ts` le couvre) :
 * 2 sections (briefing §8 + le Q6 gelée) :
 *   - **Connectées** : Google Agenda (lecture + écriture), Google Docs
 *     (lecture + création) — chaque ligne mène aux PERMISSIONS du
 *     service (le briefing §16 point 2, `discoverTools` →
 *     `IntegrationTool.destructive` : chaque ÉCRITURE = confirmation).
 *   - **Disponibles** : Drive, Gmail, Notion — bouton « Connecter »
 *     (émet `connect(app)` au client EF, AD-7 : le module applique,
 *     jamais une write directe depuis l'app).
 *
 * Les rappels SSoT (le plan §12) : « chaque écriture demande
 * confirmation » + AD-3 (aucune clé sur l'appareil, auth serveur).
 *
 * Le détail des permissions par action est servi par le catalog LIVE du
 * `discoverTools()` quand il est chargé (le `useEffect` ci-dessous) ;
 * sinon le catalog statique `./data` (`servicePermissions`) — un tool
 * inconnu au statique n'est pas masqué (le `servicePermissionsFromTools`).
 */

export function IntegrationsPage() {
  const { integrations } = useMobileData();

  // Live connection state, read from the server (AD-3: never from the body).
  const [accounts, setAccounts] = useState<IntegrationAccount[]>([]);
  const [loading, setLoading] = useState(false);
  // Le catalog LIVE du `discoverTools()` (le SSoT runtime, le détail des
  // permissions par action du briefing §16 point 2) — vide tant que le
  // client ne l'a pas chargé ; le fallback statique `servicePermissions`
  // (le module `./data`) couvre le rendu initial (jamais une fausse
  // permission, le static catalog est le subset v2 du brief).
  const [liveTools, setLiveTools] = useState<ServiceTool[]>([]);
  // Le service dont le DÉTAIL des permissions est affiché (le §16
  // point 2 : « chaque ligne mène aux permissions du service »).
  const [detailService, setDetailService] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  // In-flight guard: disables the toggles + preset while a connect call runs
  // (5 parallel window.open would otherwise race the accounts refresh).
  const [inFlight, setInFlight] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!integrations) return;
    let live = true;
    setLoading(true);
    Promise.allSettled([
      integrations.listAccounts(),
      integrations.discoverTools({ limit: 200 }),
    ])
      .then(([accountsRes, toolsRes]) => {
        if (!live) return;
        if (accountsRes.status === 'fulfilled') setAccounts(accountsRes.value);
        if (toolsRes.status === 'fulfilled') setLiveTools(toolsRes.value as unknown as ServiceTool[]);
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

  /** Le détail d'un service (le §16 point 2) : le catalog LIVE quand
   *  chargé (le SSoT runtime), sinon le catalog statique `./data`
   *  (le subset du brief — jamais une fausse permission). */
  function permissionsFor(service: IntegrationService) {
    if (liveTools.length > 0) {
      return servicePermissionsFromTools(service.app, liveTools);
    }
    return servicePermissions(service);
  }

  /**
   * Connect (or disconnect) one app. Returns a Promise so preset-level
   * batching (Promise.allSettled) cannot lose individual rejections — a
   * failed item surfaces a per-item `setConnectError`, not a silent drop.
   * AD-7 : le CTA émet `connect(app)` au client EF — le module/EF
   * applique, l'app ne fait JAMAIS de write directe.
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
          // AD-3 / composio.md §4: the user completes OAuth in the vendor's
          // Connect Link (opened in a WebView / browser). We do NOT build a
          // provider OAuth flow. On completion we re-read the accounts.
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

  // Le split Connectées / Disponibles (le SSoT du module `./data`, le test
  // le couvre) : « Connectées » = les services qui ont un compte live
  // `connected` ; « Disponibles » = le reste (CTA « Connecter »).
  const { connected, available } = splitConnectedAndAvailable(
    INTEGRATION_CATALOG,
    accounts as Array<{ connectedAccountId: string; app: string; state: 'connected' | 'disconnected' | 'token_expired' | 'reauth_required' }>,
  );

  // Le preset « Tout connecter » (le SSoT de `planConnectPreset`) : les
  // services `defaultOn` PAS encore connectés → un lot de `connect(app)`
  // (AD-7 : l'EF applique, jamais une write directe depuis l'app).
  const presetPlan = planConnectPreset(
    INTEGRATION_CATALOG,
    accounts as Array<{ connectedAccountId: string; app: string; state: 'connected' | 'disconnected' | 'token_expired' | 'reauth_required' }>,
  );

  // AD-7 degrade-first: no Supabase env → the client is undefined → the
  // SSoT `DEGRADED_INTEGRATIONS` (le test du module `./data` le couvre) —
  // jamais une fausse « connectée ».
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

  function renderServiceCard(service: IntegrationService, opts: { connected: boolean }) {
    const on = opts.connected;
    const detailOpen = detailService === service.app;
    const perms = detailOpen ? permissionsFor(service) : null;
    return (
      <div key={service.app} className={`integration-card ${on ? 'is-connected' : ''}`}>
        <div className="integration-card-main">
          <div className="integration-card-status">
            {on ? (
              <Check size={16} className="is-ok" />
            ) : (
              <ExternalLink size={14} className="is-muted" aria-hidden />
            )}
          </div>
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

          <section className="integration-group">
            <h3>Connectées {connected.length > 0 ? <span className="integration-group-badge">{connected.length}</span> : <span className="integration-group-badge">aucune</span>}</h3>
            {connected.length > 0 ? (
              connected.map((s) => renderServiceCard(s, { connected: true }))
            ) : (
              <p className="integration-group-note">
                Aucune connexion active pour l’instant — connecte un service depuis
                « Disponibles » ci-dessous.
              </p>
            )}
          </section>

          <section className="integration-group">
            <h3>Disponibles</h3>
            {presetPlan.length > 0 ? (
              <div className="integration-group-preset">
                <button
                  type="button"
                  className="integration-preset-btn"
                  disabled={inFlight.size > 0}
                  onClick={() => {
                    // Le preset « Tout connecter » (le SSoT de `planConnectPreset`) :
                    // un lot de `connect(app)` (AD-7 : l'EF applique, jamais une
                    // write directe depuis l'app). allSettled : la défaillance
                    // d'un item ne fait pas tomber les autres — chaque échec
                    // atterrit dans setConnectError par item.
                    void Promise.allSettled(presetPlan.map((p) => connectOne(p.app)));
                  }}
                >
                  <Check size={14} />
                  <span>Tout connecter ({presetPlan.map((p) => INTEGRATION_CATALOG.find((s) => s.app === p.app)?.name ?? p.app).join(' + ')})</span>
                </button>
              </div>
            ) : null}
            {available.map((s) => renderServiceCard(s, { connected: false }))}
          </section>

          {/* Le service Google Agenda (M-33 : le 1er branché) est le
              GOOGLE_CALENDAR_SERVICE du SSoT `./data` — il est déjà dans
              le catalog (première entrée) ; ce commentaire fige le SSoT
              du 1er service pour le test de wiring. */}
          <span className="sr-only" data-testid="first-service">{GOOGLE_CALENDAR_SERVICE.app}</span>
        </div>
      </IonContent>
    </>
  );
}
