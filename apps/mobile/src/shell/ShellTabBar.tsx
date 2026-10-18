/**
 * ShellTabBar — la barre d'onglets mobile v2 (M-13, plan v2 MVP S1).
 *
 * 4 entrées SSoT (plan S1 §M-13) : `Agent · Discovery · Focus · Plus`
 * (Intégrations vit dans « Plus » — le hub /settings). La page Agent
 * N'A PAS de barre : le Shell (Shell.tsx) masque l'IonFooter sur
 * `/agent*` — la sortie de l'assistant passe par son menu latéral
 * (nouvelle conversation / navigation / récentes, Stitch `agent_menu_
 * lat_ral_fraunces`).
 *
 * Règle de prefix (l'onglet actif suit la route courante) :
 *   `/discovery*` → Discovery · `/focus*` → Focus ·
 *   `/settings*`  → Plus · `/agent*`     → (barre masquée, Shell)
 *
 * Navigation : React Router (navigate) + state cosmétique `activeTab`
 * (ui-state, AD-7 — jamais de données entités). Icônes lucide 20 px
 * (strokeWidth 2, taille multiple de 4 — règle du repo), tokens only
 * (--aurora-*), tap target ≥ 44 px, safe-area basse (Capacitor/Android).
 */
import { Bot, Compass, Focus, Plus } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUiStateStore, type TabId } from '../state/ui-state';

/** Les 4 entrées v2 (le SSoT du plan S1 §M-13). */
const TABS: Array<{ id: TabId; path: string; label: string; Icon: typeof Bot }> = [
  { id: 'agent', path: '/agent', label: 'Agent', Icon: Bot },
  { id: 'discovery', path: '/discovery', label: 'Discovery', Icon: Compass },
  { id: 'focus', path: '/focus', label: 'Focus', Icon: Focus },
  { id: 'plus', path: '/settings', label: 'Plus', Icon: Plus },
];

export function ShellTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setActiveTab } = useUiStateStore();

  /** L'onglet actif suit le PREFIX de la route (le détail s'ouvre
   *  au-dessus de l'onglet courant — la barre reste, l'onglet actif ne
   *  change pas, 02 §6.1). `/agent*` ne met AUCUN onglet actif : la
   *  barre est masquée sur l'assistant (Shell), la sortie = menu
   *  latéral (plan S1). */
  const isActive = (tab: (typeof TABS)[number]) =>
    tab.id === 'discovery'
      ? location.pathname === '/discovery' || location.pathname.startsWith('/discovery/')
      : tab.id === 'focus'
        ? location.pathname === '/focus' || location.pathname.startsWith('/focus/')
        : tab.id === 'plus'
          ? location.pathname === '/settings' || location.pathname.startsWith('/settings/')
          : location.pathname === '/agent' || location.pathname.startsWith('/agent/');

  return (
    <nav className="shell-tabbar" data-tabbar="true" aria-label="Navigation principale">
      {TABS.map(({ id, path, label, Icon }) => {
        const active = isActive({ id, path, label, Icon });
        return (
          <button
            key={id}
            type="button"
            className="shell-tab"
            data-tab={id}
            data-active={active || undefined}
            aria-current={active ? 'page' : undefined}
            onClick={() => {
              setActiveTab(id);
              navigate(path);
            }}
          >
            <Icon size={20} strokeWidth={2} aria-hidden />
            <span className="shell-tab-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
