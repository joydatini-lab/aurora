/**
 * theme-css-vars-naming.test.ts — le contrat de NOMMAGE des variables émises
 * par `resolveThemeCSSVars`.
 *
 * LE DÉFAUT QUE CE GARDE FERME
 * `resolveThemeCSSVars` émettait `--aurora-${key}` en gardant le POINT des
 * clés de token (`--aurora-accent.primary`, `--aurora-text.primary`…). Or TOUT
 * le dépôt lit la forme TIRET :
 *   - `packages/ui/src/styles/aurora.css` (`--aurora-accent-primary-h`) ;
 *   - les CSS de `apps/mobile` (`var(--aurora-accent-primary)`) ;
 *   - `toShadcnVars` juste en dessous (`g("--aurora-accent-primary")`).
 *
 * Conséquence : `--primary`, `--accent`, `--secondary`… n'étaient JAMAIS
 * définis par le provider. `apps/mobile` le masquait par ses replis
 * `styles/tokens.css` (chargés dans `main.tsx`) ; la coquille web
 * (`apps/web-app`), qui n'a pas ces replis, affichait un état actif
 * transparent — constaté en mesurant le rendu live (`--accent` = ""), pas en
 * relisant le code.
 *
 * Un nom de variable CSS est une INTERFACE entre deux fichiers. Ce test
 * l'affirme directement, donc une régression sur le nommage échoue ici.
 */
import { describe, expect, it } from "vitest";
import { THEMES } from "../src/themes";
import { resolveThemeCSSVars, toShadcnVars } from "../src/themes/resolve";

describe("theme CSS variable naming (dot vs dash)", () => {
  it("émet la forme TIRET, jamais la forme POINT des clés de token", () => {
    const vars = resolveThemeCSSVars("aurora", "light");
    const names = Object.keys(vars);

    // La forme point est le défaut historique : elle doit avoir disparu.
    const dotted = names.filter((n) => n.includes("."));
    expect(dotted).toEqual([]);

    // Les variables que le reste du dépôt lit doivent exister.
    for (const expected of [
      "--aurora-accent-primary",
      "--aurora-accent-on-primary",
      "--aurora-accent-selected-surface",
      "--aurora-accent-focus-ring",
      "--aurora-text-primary",
      "--aurora-surface-alt",
    ]) {
      expect(names).toContain(expected);
    }
  });

  it("alimente `toShadcnVars` : plus aucun alias shadcn vide", () => {
    // C'est la preuve d'intégration : l'émetteur et le lecteur se parlent.
    // Avant le correctif, `--primary`/`--accent` sortaient vides parce que le
    // lecteur cherchait une forme que l'émetteur n'écrivait pas.
    const vars = resolveThemeCSSVars("aurora", "light");
    const shadcn = toShadcnVars(vars);

    for (const alias of ["--primary", "--accent", "--secondary", "--border", "--ring"]) {
      expect(shadcn[alias], `${alias} doit être défini`).toBeTruthy();
    }
  });

  it("chaque thème émet des accents résolus (aucun trou sur le catalogue)", () => {
    // Un thème qui oublierait un accent produirait un état actif invisible sur
    // ce thème seulement — le genre de défaut qu'on ne voit qu'en le mesurant.
    for (const name of Object.keys(THEMES)) {
      const vars = resolveThemeCSSVars(name as keyof typeof THEMES, "light");
      const shadcn = toShadcnVars(vars);
      expect(shadcn["--accent"], `${name}: --accent`).toBeTruthy();
      expect(shadcn["--primary"], `${name}: --primary`).toBeTruthy();
    }
  });

  it("les deux styles (light/dark) émettent les mêmes NOMS de variables", () => {
    // Un nom qui n'existerait qu'en light rendrait le basculement de style
    // destructeur : le composant garderait une valeur vide en dark.
    const light = Object.keys(resolveThemeCSSVars("aurora", "light")).sort();
    const dark = Object.keys(resolveThemeCSSVars("aurora", "dark")).sort();
    expect(dark).toEqual(light);
  });
});
