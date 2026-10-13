/**
 * @aurora/ui — PostCSS pipeline (Vite builder de Storybook).
 *
 * SSoT du package : `tailwindcss@3.4.19` (runtime v3) + `tailwind.config.ts`
 * (tokens `--aurora-*-h` en HSL, `darkMode: ["class"]`). Le `@import
 * "tailwindcss"` de `src/styles/aurora.css` (syntaxe v4) est neutralisé
 * par ce pipeline v3 : le plugin `tailwindcss` (v3) ne comprend pas cette
 * directive et la laisse littérale, mais génère bien les utilitaires via
 * `tailwind.config.ts`.
 *
 * Autoprefixer : le pipeline Tailwind v3 ne se préfixe pas lui-même —
 * à conserver.
 */
const tailwindcss = require("tailwindcss");
const autoprefixer = require("autoprefixer");

module.exports = {
  plugins: [tailwindcss, autoprefixer],
};
