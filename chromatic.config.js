// Aurora — Chromatic config (run from repo root)
//
// Chromatic CLI s'exécute depuis la racine du monorepo, mais Storybook
// vit dans packages/ui. Le script racine `build-storybook` (package.json)
// appelle `pnpm --filter @aurora/ui build-storybook` (storybook build →
// packages/ui/storybook-static).
//
// Ce fichier dit à Chromatic le dossier de sortie exact (storybookBuildDir),
// car par défaut il cherche `storybook-static/` à la racine du repo, pas
// dans `packages/ui/`.

export default {
  storybookBuildDir: "packages/ui/storybook-static",
};
