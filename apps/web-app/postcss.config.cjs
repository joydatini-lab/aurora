/**
 * Tailwind v3 + autoprefixer.
 *
 * POURQUOI LA RÉSOLUTION NUE ICI (et pas depuis `packages/ui`)
 * `packages/ui` déclare Tailwind **v4** (le `@import "tailwindcss"` de son
 * `aurora.css`), dont le paquet n'expose PAS de plugin PostCSS — le charger
 * pour ce build échoue. La coquille web est en Tailwind **v3** (la même
 * génération que `apps/mobile`, celle que le preset `@aurora/ui` cible).
 * On charge donc depuis le `node_modules` de l'app, qui déclare v3 : la
 * résolution est locale, déterministe, et ne dépend pas de l'ordre pnpm.
 */
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
