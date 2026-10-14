// Aurora — Chromatic config (run from repo root)
//
// Chromatic CLI est appelé depuis la racine du monorepo, mais
// Storybook vit dans packages/ui. Le script racine `build-storybook-ui`
// appelle `pnpm --filter @aurora/ui build-storybook` (storybook build
// → packages/ui/storybook-static).
//
// Ce fichier dit à Chromatic :
//   1. quel script lance le build Storybook (buildScriptName)
//   2. où est le dossier de sortie (storybookBuildDir)

export default {
  buildScriptName: "build-storybook-ui",
  storybookBuildDir: "packages/ui/storybook-static",
};
