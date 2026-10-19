/**
 * Ionic app shell (04 S1, 02 §6.1) — the root mobile chrome of the app.
 *
 * Structure (one chrome, no double-nesting):
 *   <IonApp>
 *     <Outlet />          → each page OWNS its own IonHeader + IonContent
 *                            (screen = page, 02 §6.1) — the shell never
 *                            wraps pages in an extra IonContent/menu.
 *     <IonFooter>        → the single global bottom tab bar (02 §6.1:
 *                            max 5 tabs, 44-60 px; details open OVER the
 *                            current tab so the bar persists).
 *     <AgentBus />        → the single application Command Bus (02 §4,
 *                            kernel S15) — at the router root so
 *                            useNavigate works; headless (returns null).
 *
 * Legacy removals (10-07) : l'IonMenu « reveal » (chrome desktop,
 * source de l'erreur [ion-menu] "must have a content element") et
 * l'IonRouterOutlet vide (pont nav Ionic inutile avec React Router)
 * ne montent PLUS ici — le shell mobile = onglets bas + écrans.
 */
import { IonApp, IonFooter, IonHeader } from '@ionic/react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AURORA_ICONS } from '@aurora/ui';
const Settings = AURORA_ICONS.Settings;

import { IN_APP_LOGO, IN_APP_LOGO_ASSET } from '../brand/logo';
import { AgentBus } from './AgentBus';
import { ShellTabBar } from './ShellTabBar';
import { useUpdater } from '../updater/useUpdater';
import { UpdateDialog } from '../updater/UpdateDialog';

export function Shell() {
  const navigate = useNavigate();
  const location = useLocation();
  // S8 M-85 (plan 2026-10-17 L666) : l'intégration au démarrage du
  // self-updater APK — le hook est monté au shell root (après le
  // PowerSync/Supabase boot de `main.tsx`, sans le bloquer : le check
  // est asynchrone post-mount, le render n'est JAMAIS bloqué). Sur
  // web/iOS le hook reste `idle` pour toujours (le plan L723–724 : ne
  // fait rien, ne génère AUCUNE erreur).
  const updater = useUpdater();
  /** M-13 (v2 MVP S1, plan S1 §M-13) : la page Agent N'A PAS de barre
   *  d'onglets (« AUCUNE barre de navigation sur la page Agent ») — la
   *  sortie de l'assistant passe par SON MENU LATÉRAL (nouvelle
   *  conversation / navigation / récentes, Stitch `agent_menu_lat_ral_
   *  fraunces` : bouton menu en haut à gauche → feuille basse). Le Shell
   *  masque l'IonFooter global sur `/agent*` (règle de prefix) ; sur
   *  toutes les autres routes la barre v2 (4 entrées) reste permanente
   *  (02 §6.1 : les détails s'ouvrent AU-DESSUS de l'onglet courant). */
  const tabBarHidden =
    location.pathname === '/agent' || location.pathname.startsWith('/agent/');
  return (
    <IonApp>
      {/* Global app header (ui-libraries §9.1 l.380, owner 2026-09-27) :
          « la marque COLOREE porte TOUJOURS le header » — chaque écran
          porte le logo in-app (coloré, sans fond, SSoT S9 l.352–358) + le
          wordmark. C'est l'en-tête « de l'app » (vs le header de page des
          écrans en IonTitle). Tap sur la barre → /settings (l'unique point
          d'entrée de l'écran « Réglages », 02 §6.1). */}
      <IonHeader data-app-header>
        <button
          type="button"
          className="app-brand-bar"
          onClick={() => navigate('/settings')}
          aria-label="Aurora — Réglages"
        >
          <img
            src={IN_APP_LOGO}
            alt=""
            className="app-brand-logo"
            width={20}
            height={20}
            data-asset={IN_APP_LOGO_ASSET}
            loading="lazy"
            decoding="async"
          />
          <span className="app-brand-wordmark">Aurora</span>
          <Settings size={16} aria-hidden className="app-brand-settings" />
        </button>
      </IonHeader>
      <Outlet />
      {/* 02 §6.1 : la barre d'onglets est permanente SAUF sur /agent*
          (M-13, plan S1 : la page Agent n'a PAS de barre — la sortie
          passe par le menu latéral de l'assistant). Un IonFooter place
          le chrome sous chaque IonContent de page (layout Ionic natif,
          safe-area basse gérée en CSS). */}
      {!tabBarHidden && (
        <IonFooter>
          <ShellTabBar />
        </IonFooter>
      )}
      <AgentBus />
      {/* S8 M-85 : le dialogue de mise à jour (le plan L664) — il
          n'apparaît que si le hook `useUpdater` détecte une version
          plus récente (le plan L719) ; sur web/iOS il reste `idle`
          et rend `null` (le plan L723–724). */}
      <UpdateDialog updater={updater} />
    </IonApp>
  );
}
