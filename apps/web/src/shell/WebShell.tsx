/**
 * WebShell — le chrome de la coquille WEB.
 *
 * Ce que ce shell N'EST PAS (par construction, pivot 2026-10-28) :
 *   - pas d'`IonFooter`/tabs natifs, pas de gestes de retour Android ;
 *   - pas de self-updater APK (`useUpdater` → no-op web, et on ne le monte pas) ;
 *   - pas de DPC / boot-receiver (Android-only, hors bundle).
 *
 * Ce qu'il EST : une navigation responsive honnête —
 *   - ≥ 900 px : rail vertical fixe à gauche (le web est un grand écran) ;
 *   - < 900 px : barre basse, comme l'app d'origine.
 *
 * Responsabilités conservées de l'ancien shell :
 *   - `<IonApp>` reste la racine (les écrans partagés utilisent IonHeader /
 *     IonContent : ils attendent le contexte de layout Ionic) ;
 *   - `<AgentBus />` monté UNE fois, sous le routeur (le command bus a besoin
 *     de `useNavigate`) — même contrat qu'avant (02 §4, kernel S15) ;
 *   - un seul `<Outlet />`, chaque écran possède son propre header/content.
 */
import { IonApp } from '@ionic/react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AURORA_ICONS } from '@aurora/ui';
import { AgentBus } from '@app/shell/AgentBus';

const Home = AURORA_ICONS.Home;
const CheckSquare = AURORA_ICONS.CheckSquare;
const BookOpen = AURORA_ICONS.BookOpen;
const TrendingUp = AURORA_ICONS.TrendingUp;
const Bot = AURORA_ICONS.Bot;
const Settings = AURORA_ICONS.Settings;

interface NavItem {
  path: string;
  label: string;
  Icon: typeof Home;
}

/** Les 5 destinations principales (02 S6.1 : 5 onglets max). */
const NAV: NavItem[] = [
  { path: '/home', label: 'Accueil', Icon: Home },
  { path: '/tasks', label: 'Tâches', Icon: CheckSquare },
  { path: '/learn', label: 'Apprendre', Icon: BookOpen },
  { path: '/progress', label: 'Progrès', Icon: TrendingUp },
  { path: '/agent', label: 'Agent', Icon: Bot },
];

export function WebShell() {
  const navigate = useNavigate();
  const location = useLocation();

  // Sur l'assistant, le chrome s'efface : l'écran gère son propre menu latéral
  // (même règle que la coquille mobile).
  const isAgent = location.pathname.startsWith('/agent');
  const isActive = (item: NavItem) =>
    location.pathname === item.path || location.pathname.startsWith(item.path + '/');

  return (
    <IonApp>
      <AgentBus />
      <div className="web-shell" data-agent={isAgent ? 'true' : 'false'}>
        {!isAgent && (
          <nav className="web-nav" aria-label="Navigation principale">
            <div className="web-nav-brand">
              <span className="web-nav-dot" aria-hidden="true" />
              <span className="web-nav-name">Aurora</span>
            </div>
            <ul className="web-nav-list">
              {NAV.map((item) => (
                <li key={item.path}>
                  <button
                    type="button"
                    className="web-nav-item"
                    data-active={isActive(item) ? 'true' : 'false'}
                    onClick={() => navigate(item.path)}
                  >
                    <item.Icon aria-hidden />
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="web-nav-item web-nav-settings"
              data-active={isActive({ path: '/settings', label: 'Réglages', Icon: Settings }) ? 'true' : 'false'}
              onClick={() => navigate('/settings')}
            >
              <Settings aria-hidden />
              <span>Réglages</span>
            </button>
          </nav>
        )}
        <main className="web-main">
          <Outlet />
        </main>
      </div>
    </IonApp>
  );
}
