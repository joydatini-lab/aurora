import * as React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Moon, Sun, Menu, X, Layers, Type, Palette, Ruler, Wand2, Component, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui';
import { useTheme } from './theme';

/**
 * Shell du design space.
 *
 * Ce n'est PAS la coquille du produit : c'est la navigation de la
 * documentation. Elle disparaîtra le jour où les écrans métier reviennent.
 * Le choix de la garder séparée évite de recréer l'erreur précédente — une
 * coquille qui portait à la fois la doc et le produit.
 */

interface NavSection {
  title: string;
  items: Array<{ to: string; label: string; icon: React.ElementType }>;
}

const SECTIONS: NavSection[] = [
  {
    title: 'Fondations',
    items: [
      { to: '/couleurs', label: 'Couleurs', icon: Palette },
      { to: '/typographie', label: 'Typographie', icon: Type },
      { to: '/espacement', label: 'Espacement & formes', icon: Ruler },
      { to: '/mouvement', label: 'Mouvement', icon: Wand2 },
    ],
  },
  {
    title: 'Composants',
    items: [{ to: '/composants', label: 'Galerie', icon: Component }],
  },
  {
    title: 'Personnalisation',
    items: [{ to: '/apparence', label: 'Apparence', icon: Sparkles }],
  },
];

export function Shell() {
  const { mode, toggleMode } = useTheme();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Toute navigation ferme le panneau mobile : sinon le contenu reste masqué
  // derrière un menu ouvert.
  const closeOnNavigate = () => setMobileOpen(false);

  return (
    <div className="aurora-shell min-h-dvh text-foreground">
      {/* Couche de fond : image ou dégradé, choisie par l'utilisateur.
          `z-index: -1` la place derrière tout, sans avoir à ordonner le reste. */}
      <div className="aurora-backdrop" aria-hidden />
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Aller au contenu
      </a>

      {/* Barre mobile */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md lg:hidden">
        <Brand />
        <div className="flex items-center gap-1">
          <ThemeToggle mode={mode} onToggle={toggleMode} />
          <Button
            variant="ghost"
            size="icon"
            aria-label={mobileOpen ? 'Fermer la navigation' : 'Ouvrir la navigation'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[264px_1fr]">
        {/* Rail latéral */}
        <aside
          data-slot="sidebar"
          className={cn(
            'z-30 border-border bg-background lg:sticky lg:top-0 lg:h-dvh lg:border-r',
            mobileOpen
              ? 'fixed inset-x-0 top-14 bottom-0 z-30 overflow-y-auto border-t'
              : 'hidden lg:block',
          )}
        >
          <div className="hidden h-14 items-center justify-between border-b border-border px-5 lg:flex">
            <Brand />
            <ThemeToggle mode={mode} onToggle={toggleMode} />
          </div>

          <nav aria-label="Sections du design system" className="p-3">
            <NavLink
              to="/"
              end
              onClick={closeOnNavigate}
              className={({ isActive }) =>
                cn(
                  'mb-1 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground hover:bg-muted',
                )
              }
            >
              <Layers className="size-4" />
              Vue d'ensemble
            </NavLink>

            {SECTIONS.map((section) => (
              <div key={section.title} className="mt-5">
                <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {section.title}
                </p>
                <ul className="space-y-0.5">
                  {section.items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        onClick={closeOnNavigate}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors duration-150',
                            isActive
                              ? 'bg-accent font-medium text-accent-foreground'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          )
                        }
                      >
                        <item.icon className="size-4" />
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="mt-6 border-t border-border p-4">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Design system v0 — reconstruit après la purge du 28 octobre.
            </p>
          </div>
        </aside>

        <main id="contenu" className="min-w-0 px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
          <div className="mx-auto w-full max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="aurora-gradient grid size-7 place-items-center rounded-lg text-[13px] font-bold text-white shadow-sm"
      >
        A
      </span>
      <span className="text-sm font-semibold tracking-tight">Aurora</span>
    </div>
  );
}

/**
 * Bascule de thème.
 *
 * Le libellé décrit l'ACTION (« passer en thème clair ») et change donc avec
 * l'état ; `data-testid` fournit aux tests un point d'ancrage stable qui, lui,
 * ne dépend pas du thème courant.
 */
function ThemeToggle({ mode, onToggle }: { mode: 'light' | 'dark'; onToggle: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      aria-label={mode === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
      title={mode === 'dark' ? 'Thème clair' : 'Thème sombre'}
      data-testid="theme-toggle"
    >
      {mode === 'dark' ? <Sun /> : <Moon />}
    </Button>
  );
}
