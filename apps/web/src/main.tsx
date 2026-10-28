/**
 * main.tsx — WEB shell entry (Vite root: `apps/web`).
 *
 * Mount chain (identique à l'ancienne coquille mobile, à UNE différence) :
 *   createAuroraDataProvider(env, WebPowerSyncDatabase)  ← `@powersync/web`
 *     → mobileDataProviderFrom(provider, agent, integrations, skills, canvas)
 *       → <FocusThemeAdapter> → <ImageThemeLayer> → <WebDataCtx>
 *           → <AuroraWebApp>  (React Query + router)
 *
 * La différence, c'est le MOTEUR (B2) : le navigateur reçoit `@powersync/web`
 * (WASQLite, persisté en OPFS) au lieu de `@powersync/capacitor`. Sans ça,
 * AD-7 (local-first / offline) ne tient pas : il n'y a pas de SQLite natif
 * derrière le plugin Capacitor sur le web.
 *
 * ⚠️ Prérequis déploiement : WASQLite a besoin de `SharedArrayBuffer`, donc
 * d'une page CROSS-ORIGIN ISOLATED → COOP `same-origin` + COEP `require-corp`
 * (voir `public/_headers`).
 *
 * AD-3 : aucun secret ici. Seule la clé *publishable* Supabase et l'URL du
 * relay PowerSync entrent par `import.meta.env` (VITE_*).
 *
 * DIAGNOSTIC (2026-10-28) : tout l'amorçage est enveloppé. Une page blanche
 * n'était pas diagnosticable — plus maintenant : `./boot/fatal` installe ses
 * filets avant tout le reste et affiche un panneau avec l'étape atteinte, le
 * message d'erreur et l'état de l'environnement (isolation, SharedArrayBuffer).
 */
// ⚠️ ORDRE : ce module doit être évalué AVANT tous les autres. Il n'importe
// rien, il pose `window.onerror` / `unhandledrejection` / chien de garde, et il
// reste capable d'écrire dans le DOM même si tout le reste échoue.
import './boot/fatal';
import { fatal, markPainted, trace } from './boot/fatal';

import React from 'react';
import ReactDOM from 'react-dom/client';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

// Les feuilles de style vivent avec les écrans partagés (`@app/styles/...`) :
// une seule source de vérité de tokens + pages entre les deux coquilles.
import '@app/styles/tw.css';
import '@app/styles/tokens.css';
import '@app/styles/atoms.css';
import '@app/styles/home.css';
import '@app/styles/goals.css';
import '@app/styles/focus.css';
import '@app/styles/agent.css';
import '@app/styles/canvas.css';
import '@app/styles/ascent.css';
import '@app/styles/data.css';
import '@app/styles/floating.css';
import '@app/styles/skills.css';
import '@app/styles/integrations.css';
import '@app/styles/auth.css';
import '@app/styles/onboarding.css';
import '@app/styles/shell.css';
import '@app/styles/dynamic-theme.css';
import './styles/web-shell.css';

import { AuroraWebApp } from './app';
import { registerServiceWorker } from './pwa';
import { FocusThemeAdapter } from '@app/ux/theme-adapter';
import { ImageThemeLayer } from '@app/ux/image-theme';
import { MobileDataCtx } from '@app/query/context';
import { mobileDataProviderFrom } from '@app/query/query-client';
import { createAuroraDataProvider, type AuroraDataEnv } from '@app/lib/boot-data';
import { createAgentClient } from '@app/lib/agent-client';
import { createCanvasClient } from '@app/lib/canvas-client';
import { createIntegrationClient } from '@app/lib/integrations-client';
import { createSkillClient } from '@app/lib/skills-client';
import { setAuthClient } from '@app/lib/auth';
import { createUserContextClient, setUserContextClient } from '@app/lib/user-context-client';
import { useUiStateStore } from '@app/state/ui-state';
import { createAuroraSupabaseClient } from '@aurora/data';
// B2 — le moteur WEB. C'est LE point de divergence avec la coquille mobile.
import { WebPowerSyncDatabase } from '@aurora/data/powersync-engine-web';
import type { PowerSyncDatabaseCtor } from '@aurora/data';

/**
 * Budget d'attente de `connect()` avant de peindre, en ms.
 *
 * 03 S8.1 fait de la boucle de sync le critère de disponibilité — mais ce
 * critère ne doit jamais coûter l'écran. `connect()` enchaîne `engine.init()`
 * (ouverture WASQLite) puis `waitForFirstSync()`, dont AUCUN n'a de délai
 * propre : sur un réseau qui pend (portail captif, relay muet) la promesse ne
 * se résout pas et ne rejette pas non plus. Sans borne, `boot()` ne peint donc
 * jamais.
 *
 * 5 s laisse largement le temps au chemin nominal (l'ouverture de la base
 * locale est de l'ordre de la centaine de ms) tout en garantissant une
 * coquille utilisable en cas de nœud réseau.
 */
const CONNECT_BUDGET_MS = 5_000;

/**
 * Tout l'amorçage vit ici plutôt qu'au niveau du module : une exception levée
 * pendant l'évaluation d'un module est très difficile à rattraper, alors qu'un
 * appel de fonction se `try/catch` proprement — et on peut enfin DIRE ce qui a
 * échoué au lieu de laisser un écran blanc.
 */
function start(): void {
  trace('module:évalué');

  const env: AuroraDataEnv = {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
    supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
    powersyncUrl: import.meta.env.VITE_POWERSYNC_URL ?? '',
  };
  trace(
    `env: supabase=${env.supabaseUrl ? 'configuré' : 'ABSENT'} relay=${env.powersyncUrl ? 'configuré' : 'ABSENT'}`,
  );

  // Un seul GoTrueClient (AD-3 / 03 S8.1) : la surface auth et le connecteur du
  // relay partagent la même instance — sinon `fetchCredentials` reste bloqué sur
  // « No Supabase session » (l'événement `storage` ne se propage pas dans l'onglet).
  const sharedSupabaseClient =
    env.supabaseUrl && env.supabasePublishableKey
      ? createAuroraSupabaseClient({
          env: {
            supabaseUrl: env.supabaseUrl,
            supabasePublishableKey: env.supabasePublishableKey,
          },
        })
      : undefined;

  if (sharedSupabaseClient) setAuthClient(sharedSupabaseClient);
  trace(sharedSupabaseClient ? 'client supabase: créé' : 'client supabase: absent');

  const provider = createAuroraDataProvider(
    sharedSupabaseClient
      ? { ...env, clientFactory: () => sharedSupabaseClient }
      : env,
    WebPowerSyncDatabase as unknown as PowerSyncDatabaseCtor,
  );
  trace('provider: construit');

  const agent = sharedSupabaseClient ? createAgentClient(sharedSupabaseClient) : undefined;
  const integrations = sharedSupabaseClient
    ? createIntegrationClient(sharedSupabaseClient)
    : undefined;
  const skills = sharedSupabaseClient ? createSkillClient(sharedSupabaseClient) : undefined;
  const canvas = sharedSupabaseClient
    ? createCanvasClient(sharedSupabaseClient, env.supabasePublishableKey)
    : undefined;
  if (sharedSupabaseClient) setUserContextClient(createUserContextClient(sharedSupabaseClient));

  const dataProvider = mobileDataProviderFrom(provider, agent, integrations, skills, canvas);
  trace('dataProvider: construit');

  function Root() {
    const focusActive = useUiStateStore((s) => s.focusActive);
    const theme = useUiStateStore((s) => s.theme);
    const auroraTheme = useUiStateStore((s) => s.auroraTheme);
    const style = theme === 'dark' ? 'dark' : 'light';
    const themeName = auroraTheme === 'auto' ? 'aurora' : auroraTheme;
    return (
      <FocusThemeAdapter focusActive={focusActive} style={style} theme={themeName}>
        <ImageThemeLayer />
        <MobileDataCtx value={dataProvider}>
          <AuroraWebApp dataProvider={dataProvider} />
        </MobileDataCtx>
      </FocusThemeAdapter>
    );
  }

  async function boot(): Promise<void> {
    // 03 S8.1 : la boucle de sync est le critère de disponibilité. Hors ligne /
    // sans session → on garde la coquille local-mirror (AD-7), jamais de blocage.
    trace('connect:appel');
    const connect = provider.connect();
    // Si `connect` rejette APRÈS l'expiration du budget, la course est déjà
    // perdue : ce catch évite un unhandledRejection qui remonterait en erreur
    // de page sans rien apporter à l'utilisateur.
    connect.catch(() => {});

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        connect,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`connect() > ${CONNECT_BUDGET_MS} ms`)),
            CONNECT_BUDGET_MS,
          );
        }),
      ]);
      trace('connect:résolu');
    } catch (error) {
      console.warn(
        '[Aurora] connect() indisponible ou trop lent — mode local miroir (offline)',
        error,
      );
      trace('connect:abandonné (budget) → rendu quand même');
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }

    const rootEl = document.getElementById('root');
    if (!rootEl) throw new Error('[Aurora] #root introuvable');

    trace('rendu:appel');
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <Root />
      </React.StrictMode>,
    );

    // React 18 rend en deux passes : on constate le résultat plutôt que de le
    // supposer. Si rien n'est commité, le chien de garde de `fatal.ts` prendra
    // le relais avec la trace ci-dessus.
    requestAnimationFrame(() => {
      if (rootEl.childElementCount > 0) markPainted();
    });

    // PWA : enregistré APRÈS le premier paint (ne retarde jamais le rendu).
    registerServiceWorker();
  }

  // `boot` est async : un rejet doit remonter au panneau, pas finir en
  // « Uncaught (in promise) » dans une console que personne ne regarde.
  void boot().catch((error: unknown) => fatal('boot()', error));
}

try {
  start();
} catch (error) {
  fatal(
    'démarrage (start)',
    error,
    'Si l’étape indiquée est « provider: construit » ou avant, le problème vient des imports ou de `.env.local`.',
  );
}
