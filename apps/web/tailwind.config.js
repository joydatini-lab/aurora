import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Aurora WEB — Tailwind v3 for the shadcn/ui layer (@aurora/ui).
 *
 * Same token contract as the dormant mobile shell: every color is a runtime
 * CSS variable written by <AuroraThemeProvider> (`toShadcnVars`, AD-17), so the
 * shadcn layer follows the active theme / preset and never carries a
 * hardcoded palette. No `#000` / `#fff` here.
 *
 * `content` scans the web shell AND the shared screens (`../mobile/src`), plus
 * the @aurora/ui component source consumed via the Vite `@aurora/ui` alias.
 */
const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    path.resolve(here, 'index.html'),
    path.resolve(here, 'src/**/*.{ts,tsx}'),
    path.resolve(here, '../mobile/src/**/*.{ts,tsx}'),
    path.resolve(here, '../../packages/ui/src/**/*.{ts,tsx}'),
  ],
  theme: {
    extend: {
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
