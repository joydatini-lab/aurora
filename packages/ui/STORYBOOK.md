# @aurora/ui — Storybook : guide de lancement & test

## 1. Lancer le serveur (dev + tests visuels + a11y + MCP)

```bash
# depuis le monorepo
pnpm -F @aurora/ui storybook
# ou directement :
cd packages/ui && pnpm exec storybook dev -p 6006
```

- **UI** : http://localhost:6006/
- **Manifest agentique** : http://localhost:6006/manifests/components.json
- **MCP** : http://localhost:6006/mcp (le client `storybook-mcp` dans
  `~/.claude.json` pointe dessus ; `/mcp` répond **uniquement** tant que
  `storybook dev` tourne)

Le serveur HMR recharge les stories à chaud — modifier un `.stories.tsx`
n'a pas besoin de redémarrage.

## 2. Tester chaque composant (play functions)

```bash
# toutes les play functions (47 stories), en CI, un seul passage
pnpm -F @aurora/ui test:storybook

# watch local (re-lance après chaque édition)
pnpm -F @aurora/ui test:storybook:watch
```

Sous le capot : `vitest run --project=storybook` via
`@storybook/addon-vitest` + `@vitest/browser` (Playwright, Chromium
headless), config dédiée `vitest.storybook.config.ts` (séparée de
`vitest.config.ts` pour les tests unitaires jsdom du package). Les
stories test-only (taguées `!dev` `!autodocs`) s'exécutent ; les
stories de doc pure sont ignorées.

## 3. Ce que tu vois dans le navigateur

Chaque composant `Aurora/UI/<Nom>` a :
- **Docs** : la page autodocs (table de props générée par JSDoc +
  `react-docgen-typescript` + controls CVA)
- **Canvas** : les stories de concept (Défaut, variantes, états vide/erreur)
- **Interactions** : les play functions (panneau à droite, bouton ▶)
- **a11y** : les violations axe-core du panneau (actuellement `test:
  "todo"` dans `preview.tsx` — passe à `"error"` pour faire échouer la CI)

Le thème est appliqué globalement par le decorator `AuroraThemeProvider`
(solara/dark par défaut) — aucune story ne redéclare les tokens. Les
portails Radix (Dialog, Popover, Select, Tooltip, etc.) sont sur
`layout: "fullscreen"` pour que l'overlay ne soit pas coupé.

## 4. Vérifier le typecheck

```bash
pnpm -F @aurora/ui typecheck   # tsc --noEmit sur tout le package
```

## 5. Pipeline CSS (contexte, si tu touches `aurora.css`)

Le SSoT de `@aurora/ui` est **Tailwind v3** :
- `postcss.config.cjs` → plugin `tailwindcss` (v3) + `autoprefixer`
- `src/styles/aurora.css` contient les directives `@tailwind base/
  components/utilities` (pas l'import v4 `@import "tailwindcss"`
  — celui-ci fait planter le builder-vite de Storybook sans le
  pipeline v4 actif)
- Les tokens `--aurora-*` sont écrits par `AuroraThemeProvider` sur
  `document.documentElement` (AD-17) — le CSS global fournit le
  fallback light/dark

Si tu repasses `aurora.css` en syntaxe v4 (pour un futur upgrade
Tailwind v4 global), il faudra soit activer `@tailwindcss/postcss`
dans `postcss.config.cjs` (forme objet, pas array de strings), soit
revenir aux directives v3.

## 6. Controls & Viewport (modules Essentials)

Les deux modules sont portés par le runtime `storybook@10.6.1`
(aucune version 10.x du package d'addon n'est publiée sur npm —
dernière : 9.0.8, installé en dépendance pour compatibilité).

### Controls (panneau à droite, panneau "Controls")

- Déclarés dans `preview.tsx` → `parameters.controls.matchers` :
  - `color`: `/(background|color)$/i` → color picker
  - `date`: `/Date$/i` → date picker
- Auto-générés par storybook à partir des `args` + inférence du
  type (react-docgen-typescript).
- Pour typer un control précis dans une story :

```ts
const meta = {
  component: Button,
  argTypes: {
    variant: {
      options: ["primary", "secondary"],
      control: { type: "radio" },
    },
  },
} satisfies Meta<typeof Button>;
```

- Contrôles conditionnels : `argTypes: { advanced: { control: "boolean" },
  margin: { control: "number", if: { arg: "advanced" } } }`.

### Viewport (toolbar "Viewport", raccourcis `alt+v` / `alt+shift+v` / `alt+ctrl+v`)

- `preview.tsx` → `parameters.viewport.options` : le jeu détaillé
  `INITIAL_VIEWPORTS` (importé depuis `storybook/viewport`), qui
  inclut iPhone/iPad/desktop et leurs dimensions.
- `preview.tsx` → `initialGlobals.viewport` : viewport par défaut du
  canvas (`ipad`, non-roté), modifiable via la toolbar.
- Pour forcer un viewport par story (non modifiable par la toolbar) :

```ts
export const OnPhone = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
};
```

- Pour des appareils non-prédéfinis (ex Kindle) :

```ts
parameters.viewport.options = {
  ...INITIAL_VIEWPORTS,
  kindleFireHD: { name: "Kindle Fire HD", styles: { width: "533px", height: "801px" } },
};
```
