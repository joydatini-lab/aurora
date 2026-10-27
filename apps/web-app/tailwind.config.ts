import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Config } from 'tailwindcss';
import { BREAKPOINTS, LAYOUT_TOKENS } from './src/lib/layout-tokens';

/**
 * L3 — Tailwind v3 de la coquille web.
 *
 * POURQUOI CE FICHIER NE FAIT PAS `presets: [auroraPreset]`
 * `packages/ui/tailwind.config.ts` mappe ses couleurs sur des TRIPLETS HSL
 * (`hsl(var(--aurora-bg-h) / 1)`) : c'est la forme statique du SSoT, utilisée
 * À L'INTÉRIEUR de `packages/ui`. Or `<AuroraThemeProvider>` n'écrit PAS ces
 * triplets sur `<html>` : il écrit les ALIAS SHADCN en valeur PLEINE
 * (`--background: #ffffff`, `toShadcnVars` dans `themes/resolve.ts`). Brancher
 * le preset ici produit donc `hsl(var(--aurora-bg-h))` sur une variable
 * INEXISTANTE → tout devient transparent. Vérifié en live : `--aurora-bg-h`
 * était vide et `background-color` valait `rgba(0,0,0,0)`.
 *
 * La coquille suit donc la convention de `apps/mobile/tailwind.config.js`, qui
 * est la forme qui FONCTIONNE avec ce provider : chaque couleur est un alias
 * shadcn en valeur pleine. Aucune couleur n'est codée ici — elles viennent
 * toutes du thème actif (AD-17), et changer de thème change le rendu.
 *
 * CE QUE CE FICHIER AJOUTE : les tokens de LAYOUT (§5), que `apps/mobile` n'a
 * pas — ils sont importés de `src/lib/layout-tokens.ts`, la source unique que
 * les tests lisent. Pas de seconde copie des valeurs.
 */
const here = path.dirname(fileURLToPath(import.meta.url));

const config: Config = {
  darkMode: 'class',
  content: [
    path.resolve(here, 'index.html'),
    path.resolve(here, 'src/**/*.{ts,tsx}'),
    // Les composants `@aurora/ui` sont consommés depuis leur SOURCE
    // (`resolve.alias` de Vite, AD-15) : Tailwind doit scanner cette source,
    // sinon leurs classes ne sont jamais générées.
    path.resolve(here, '../../packages/ui/src/**/*.{ts,tsx}'),
  ],
  theme: {
    extend: {
      screens: {
        sm: `${BREAKPOINTS.sm}px`,
        md: `${BREAKPOINTS.md}px`,
        lg: `${BREAKPOINTS.lg}px`,
        xl: `${BREAKPOINTS.xl}px`,
        '2xl': `${BREAKPOINTS['2xl']}px`,
      },
      colors: {
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        info: 'var(--info)',
        // `surface` est le nom du design system pour le fond de la barre
        // supérieure / latérale (§5) ; il pointe sur l'alias shadcn `card`.
        surface: 'var(--card)',
      },
      width: {
        rail: `${LAYOUT_TOKENS.rail}px`,
        'rail-collapsed': `${LAYOUT_TOKENS.railCollapsed}px`,
      },
      minWidth: {
        panel: `${LAYOUT_TOKENS.panelMin}px`,
      },
      maxWidth: {
        reading: `${LAYOUT_TOKENS.readingMax}px`,
        content: `${LAYOUT_TOKENS.contentMax}px`,
      },
      spacing: {
        gutter: `${LAYOUT_TOKENS.gutter}px`,
        'gutter-lg': `${LAYOUT_TOKENS.gutterLg}px`,
        inspector: `${LAYOUT_TOKENS.inspector}px`,
        tabbar: `${LAYOUT_TOKENS.tabbar}px`,
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: '4px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
