import type { StorybookConfig } from "@storybook/react-vite";

// NOTE (SB 10.6) — Le builder-vite de Storybook fusionne sa config par
// défaut avec `vite.config.ts`. Le pipeline Tailwind v4 (`@import
// "tailwindcss"` dans src/styles/aurora.css) doit passer par PostCSS :
// c'est fait dans `postcss.config.cjs` du package (plugin v4 objet
// `@tailwindcss/postcss`). Ici on n'ajoute rien de plus.
//
// NOTE — Controls & Viewport : aucune version 10.x des packages
// `@storybook/addon-controls` / `@storybook/addon-viewport` n'est
// publiée (dernière : 9.0.8). Les modules Essentials restent portés par
// le runtime de storybook@10.6.1 ; les paramètres (controls.matchers,
// viewport.options/initialGlobals) sont déclarés dans `preview.tsx`.
const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-controls",
    "@storybook/addon-viewport",
    "@storybook/addon-mcp"
  ],
  "features": {
    // Manifest composants (API agentique MCP — /manifests/components.json).
    // Requis par @storybook/addon-mcp.
    "componentsManifest": true
  },
  "framework": "@storybook/react-vite"
};

// NOTE (Windows) — Fix build statique : esbuild temp file lock +
// minify rollup provoque "Accès refusé". Target esnext + minify false
// (même fix que apps/desktop et apps/mobile, cf. mémoire).
config.viteFinal = async (config) => ({
  ...config,
  build: {
    target: "esnext",
    minify: false,
  },
  esbuild: {
    target: "esnext",
  },
});

export default config;
