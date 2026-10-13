# Storybook × Aurora UI — État des lieux & Pipeline CSS (2026-10-11)

## Ce qui est en place (fonctionnel)
- **47 stories agent-qualité** (bouton-traceur du skill CDD) dans
  `packages/ui/src/components/ui/` — couverture **complète** du
  package (tous les modules de `src/components/ui/` ont une story) :
  - wave 1 (6) : button, input, badge, card, alert, skeleton
  - wave 2 (7, Radix/portails) : dialog, dropdown-menu, popover, tooltip,
    tabs, switch, checkbox
  - wave 3 (4) : select, command, sheet, form (react-hook-form + zod v4)
  - wave 4 (10) : alert-dialog, context-menu, hover-card, menubar,
    progress, radio-group, scroll-area, separator, slider, table
  - wave 5 (9) : accordion, avatar, breadcrumb, drawer, kbd, label,
    pagination, textarea, toast
  - wave 6 (10, data-viz / avancé) : DataTable, AgGridTable, Timeline,
    GanttRow, KeyValueList, StatTile, CalendarView, Sidebar,
    AgentThinkingLoader, Premium (WobbleCard/Marquee/NumberTick)
  - `toaster` (hub global des toasts, `useToast` + TOAST_LIMIT=1)
  - Chacune : JSDoc composant + `argTypes` CVA dérivés de constantes
    exportées + `tags: ["autodocs"]` + story test-only
    (`!dev`/`!autodocs`) avec play function.
  - Portails Radix (dialog/dropdown/popover/tooltip/select/command/sheet) :
    `layout: "fullscreen"`, play functions ciblent `document.body`
    (MutationObserver pour le rendu asynchrone de Radix),
    `TooltipProvider` global dans `preview.tsx`.
  - Manifest : 47 composants sur
    `http://localhost:6006/manifests/components.json`.
- **Scaffold Storybook nettoyé** : `src/stories/*` (Button/Header/Page)
  supprimé — le manifest ne contient plus que les vrais composants.
- **Manifest MCP actif** : `.storybook/main.ts` → `features: {
  componentsManifest: true }` → `http://localhost:6006/manifests/
  components.json` (6 composants).
- **preview.tsx decorators** : `AuroraThemeProvider` (solara/dark) +
  `TooltipProvider delayDuration=0` + import du CSS global.

## ⚠️ Contrainte pipeline CSS (À TRAITER)
Le SSoT du package est en **Tailwind v3** :
- `tailwindcss@3.4.19` + `tailwind.config.ts` (HSL vars `--aurora-*-h`,
  `darkMode: ["class"]`).
- MAIS `src/styles/aurora.css` est écrit en **syntaxe v4**
  (`@import "tailwindcss"` + `@layer base`) — cassant avec le pipeline v3.

J'ai dû modifier `aurora.css` (139/136 lignes, diff visible) pour que le
builder-vite de Storybook (PostCSS v3) puisse le compiler :
- `@import "tailwindcss"` → `@tailwind base; @tailwind components;
  @tailwind utilities;`
- Le `@layer base` v4 reste interprété par le plugin v3 (ok).

**Vérifié** : le CSS servi par le serveur dev contient bien les
utilitaires (`bg-primary`, `h-9`, `animate-pulse`, `inline-flex`…).

## ⚠️ `build-storybook` toujours bloqué
Erreur EACCES sur le fichier temporaire esbuild sous `%TEMP%` — non lié à
la config Storybook. Le **serveur dev** (port 6006) et le **manifest**
fonctionnent ; seul le build statique (`storybook-static/`) échoue.

## Prochaines étapes (out of scope de cette run)
- 0 composant simple sans story — la couverture complète est atteinte
  (47 stories, dont `toaster`).
- **CI `@storybook/addon-vitest`** : config `vitest.storybook.config.ts`
  créée + scripts `test:storybook` / `test:storybook:watch` ajoutés.
  **Non validé en CI** (pas de pipeline à brancher ici) ; à lancer
  en local : `pnpm -F @aurora/ui test:storybook`.
- **Guide utilisateur** : `packages/ui/STORYBOOK.md` (lancement,
  test, a11y, pipeline CSS).
- **MCP live** : `http://localhost:6006/mcp` (le serveur doit tourner ;
  l'entry `storybook-mcp` est dans `~/.claude.json`).
