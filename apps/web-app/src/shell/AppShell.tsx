/**
 * L3 — la coquille web (§3.1) : barre supérieure + navigation latérale +
 * zone de contenu, et la tab bar basse sous `md`.
 *
 * LE POINT STRUCTURANT (§2.1) : **le palier de largeur décide du MODE, le
 * gabarit de l'écran décide de l'ARRANGEMENT**. Ce composant ne fait que le
 * premier — il publie le mode via un contexte (`useLayoutMode`), et chaque
 * écran lit ce mode pour choisir son arrangement. Aucun écran ne teste la
 * largeur lui-même.
 *
 * POURQUOI UN CONTEXTE ET PAS DES CLASSES TAILWIND SEULES
 * Le mode n'est pas seulement une question de CSS : il change la FORME de la
 * navigation (tab bar / rail / barre latérale) et le NOMBRE de panneaux
 * autorisés. Ces décisions doivent être lisibles et testables en TypeScript
 * (`layout-tokens.ts`), pas enfouies dans des variantes `md:` dispersées.
 *
 * OQ-1 (owner, 2026-10-24) : React PUR, aucun `ion-*`. `packages/ui` est bâti
 * sur Radix/shadcn ; mélanger Ionic produirait des conflits de style, de focus
 * et d'a11y (docs/frontend/web-shell-and-responsive.md §3.2).
 */
import * as React from 'react';
import { AURORA_ICONS } from '@aurora/ui';
import { cn } from '../lib/cn';
import { NAV_SECTIONS, PRIMARY_TABS, sectionForPath } from '../lib/navigation';
import {
  gutterForMode,
  modeForWidth,
  navFormForMode,
  type LayoutMode,
} from '../lib/layout-tokens';

/**
 * Le mode courant, dérivé de la largeur de la fenêtre. Le shell le publie ; les
 * écrans le consomment.
 */
const LayoutModeContext = React.createContext<LayoutMode>('desktop');

export function useLayoutMode(): LayoutMode {
  return React.useContext(LayoutModeContext);
}

/**
 * Observe la largeur et renvoie le mode. `matchMedia` est absent de jsdom : le
 * défaut `desktop` est renvoyé quand il n'existe pas, ce qui rend le shell
 * testable sans mock (les tests de mode appellent `modeForWidth` directement).
 */
export function useLayoutModeFromWindow(): LayoutMode {
  const [mode, setMode] = React.useState<LayoutMode>(() =>
    typeof window === 'undefined' ? 'desktop' : modeForWidth(window.innerWidth),
  );

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.addEventListener) return;
    const onResize = () => setMode(modeForWidth(window.innerWidth));
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return mode;
}

export interface AppShellProps {
  /** La route courante, pour marquer l'entrée active. */
  pathname: string;
  /** Navigue vers une route (fourni par le routeur). */
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

export function AppShell({ pathname, onNavigate, children }: AppShellProps) {
  const mode = useLayoutModeFromWindow();
  const navForm = navFormForMode(mode);
  const gutter = gutterForMode(mode);
  const active = sectionForPath(pathname);

  return (
    <LayoutModeContext.Provider value={mode}>
      <div
        className="flex h-screen w-full flex-col bg-background text-foreground"
        data-testid="app-shell"
        data-layout-mode={mode}
        data-nav-form={navForm}
      >
        <TopBar pathname={pathname} onNavigate={onNavigate} />

        <div className="flex min-h-0 flex-1">
          {navForm !== 'tabbar' && (
            <SideNav
              form={navForm}
              activeId={active?.id}
              onNavigate={onNavigate}
            />
          )}

          <main
            className="min-w-0 flex-1 overflow-y-auto"
            style={{ paddingLeft: gutter, paddingRight: gutter }}
            data-testid="content-region"
          >
            {children}
          </main>
        </div>

        {navForm === 'tabbar' && (
          <TabBar activeId={active?.id} onNavigate={onNavigate} />
        )}
      </div>
    </LayoutModeContext.Provider>
  );
}

/** La barre supérieure (§3.1) : marque · recherche ⌘K · thème · compte. */
function TopBar({
  pathname: _pathname,
  onNavigate: _onNavigate,
}: {
  pathname: string;
  onNavigate: (path: string) => void;
}) {
  return (
    <header
      className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4"
      data-testid="top-bar"
    >
      <span className="text-sm font-semibold tracking-tight">Aurora</span>
      <button
        type="button"
        className={cn(
          'ml-2 flex h-9 flex-1 items-center gap-2 rounded-md border border-border',
          'bg-background px-3 text-left text-sm text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
        // La recherche globale ⌘K est le lot W1 complet : ici la commande est
        // déclarée et accessible au clavier, son ouverture arrive avec le
        // palier suivant. Le bouton n'est pas un mensonge : il annonce la
        // palette, il ne prétend pas déjà filtrer des données.
        aria-keyshortcuts="Meta+K Control+K"
        data-testid="search-trigger"
      >
        <AURORA_ICONS.Search size={16} aria-hidden="true" />
        <span>Rechercher</span>
      </button>
    </header>
  );
}

/**
 * La navigation latérale, sous DEUX formes (§2.2) : `rail` (icônes seules,
 * 64 px) à `md`, `sidebar` (240 px, libellés) à `lg`+. Même liste, même ordre.
 */
function SideNav({
  form,
  activeId,
  onNavigate,
}: {
  form: 'rail' | 'sidebar';
  activeId?: string;
  onNavigate: (path: string) => void;
}) {
  const collapsed = form === 'rail';
  return (
    <nav
      aria-label="Navigation principale"
      className={cn(
        'flex shrink-0 flex-col gap-1 border-r border-border bg-surface p-2',
        collapsed ? 'w-16' : 'w-60',
      )}
      data-testid="side-nav"
      data-nav-variant={form}
    >
      {NAV_SECTIONS.map((section) => (
        <NavButton
          key={section.id}
          section={section}
          active={section.id === activeId}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

/** La tab bar basse (< md), 5 onglets (§3.1). */
function TabBar({
  activeId,
  onNavigate,
}: {
  activeId?: string;
  onNavigate: (path: string) => void;
}) {
  return (
    <nav
      aria-label="Navigation principale"
      className="flex h-14 shrink-0 items-stretch border-t border-border bg-surface"
      data-testid="tab-bar"
    >
      {PRIMARY_TABS.map((section) => {
        const active = section.id === activeId;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onNavigate(section.path)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
            data-testid={`tab-${section.id}`}
          >
            <section.icon size={20} aria-hidden="true" />
            <span>{section.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function NavButton({
  section,
  active,
  collapsed,
  onNavigate,
}: {
  section: (typeof NAV_SECTIONS)[number];
  active: boolean;
  collapsed: boolean;
  onNavigate: (path: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(section.path)}
      aria-current={active ? 'page' : undefined}
      // `title` en mode rail : sans libellé visible, le nom reste accessible
      // au survol ET aux lecteurs d'écran (contrat C3 : jamais pointeur seul).
      title={collapsed ? section.label : undefined}
      aria-label={collapsed ? section.label : undefined}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        collapsed && 'justify-center px-0',
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
      )}
      data-testid={`nav-${section.id}`}
    >
      <section.icon size={18} aria-hidden="true" />
      {!collapsed && <span className="truncate">{section.label}</span>}
    </button>
  );
}
