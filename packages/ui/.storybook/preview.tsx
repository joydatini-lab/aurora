import type { Preview } from "@storybook/react-vite";
import { INITIAL_VIEWPORTS } from "storybook/viewport";

import { AuroraThemeProvider } from "../src/theme/provider";
import { TooltipProvider } from "../src/components/ui/tooltip";

// NOTE (SB 10.6) — SSoT CSS de @aurora/ui : `src/styles/aurora.css` est en
// **Tailwind v4** (`@import "tailwindcss"`). Le builder-vite de Storybook
// n'active PAS le pipeline Tailwind par défaut : il faut le déclarer
// explicitement via PostCSS (`postcss.config.cjs` du package, ici) OU
// inline plus bas dans `main.ts` via `viteFinal`.
//
// Les variables `--aurora-*` tombent sur `document.documentElement` via
// `AuroraThemeProvider` (AD-17) — l'import CSS global fournit le fallback
// light/dark du thème `solara`.
import "../src/styles/aurora.css";

/**
 * Préview global Storybook — @aurora/ui.
 *
 * 1) Thème : `AuroraThemeProvider` écrit les variables `--aurora-*` sur
 *    `document.documentElement` (AD-17) — ancêtre du canvas ET des
 *    portails Radix montés sur `document.body` → le thème s'applique à
 *    tout par héritage CSS. Cible par défaut : `solara` / `dark`.
 * 2) Tooltip : le seul provider Radix requis globalement (sinon
 *    `console.error` à chaque mount de `Tooltip.Trigger`).
 *    `delayDuration=0` : apparition instantanée dans les stories/tests.
 *
 * Les stories restent des rendus purs : aucune story ne re-déclare un
 * provider.
 */

const themeDecorator = (Story: any, context: any) => (
  <AuroraThemeProvider
    theme={(context?.parameters?.auroraTheme ?? "solara") as "solara"}
    style={(context?.parameters?.auroraStyle ?? "dark") as "dark"}
  >
    <Story />
  </AuroraThemeProvider>
);

const tooltipDecorator = (Story: any) => (
  <TooltipProvider delayDuration={0}>
    <Story />
  </TooltipProvider>
);

const preview: Preview = {
  tags: ["autodocs"],
  decorators: [themeDecorator, tooltipDecorator],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
    viewport: {
      // Jeu détaillé d'appareils (iPhone/iPad/desktop) — toolbar Viewport.
      options: INITIAL_VIEWPORTS,
    },
    auroraTheme: "solara",
    auroraStyle: "dark",
  },
  initialGlobals: {
    // Viewport par défaut du canvas (modifiable via la toolbar).
    viewport: { value: "ipad", isRotated: false },
  },
};

export default preview;
