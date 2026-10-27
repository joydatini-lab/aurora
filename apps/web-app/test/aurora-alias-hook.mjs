/**
 * L3 — alias de workspace pour les tests `node:test` de la coquille web.
 *
 * `@aurora/ui` résout vers sa SOURCE (`packages/ui/src/index.ts`), pas vers un
 * `dist/` — c'est l'AD-15 : la source est le SSoT, et un artefact de build
 * périmé ferait échouer les tests sur du code qui n'existe plus.
 *
 * L'alias `src/*` est celui du design system : `packages/ui` importe ses
 * propres helpers en chemin absolu nu (`import { cn } from "src/lib/utils"`),
 * forme résolue par son tsconfig. Sans cet alias, l'import échoue en TS2307 —
 * exactement ce que `apps/mobile` corrige dans son `vite.config.ts`.
 *
 * Le hook `load` pour `.json` : le barrel `@aurora/ui` importe les thèmes
 * (`src/themes/*.json`) SANS attribut d'import, ce que Vite accepte et Node
 * refuse (« needs an import attribute of "type: json" »). On lit donc le JSON
 * ici et on émet le module nous-mêmes. C'est de l'infrastructure de test : le
 * code produit reste inchangé, et le build Vite n'est pas concerné.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * L'esbuild du WORKSPACE, jamais un esbuild global. On l'ancre sur
 * `packages/ui` (qui le déclare) puis sur la racine — `apps/web-app` ne le
 * liste pas lui-même, et pnpm n'hoiste pas dans son `node_modules`.
 */
const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * L'esbuild du WORKSPACE, jamais un esbuild global. `apps/web-app` ne déclare
 * pas esbuild et pnpm n'hoiste pas : le paquet vit dans le store `.pnpm`. On
 * le cherche donc dans `.pnpm` (le store réel) et on prend la version la plus
 * haute — c'est celle que Vite utilise au build, donc les tests transpilent
 * avec le MÊME moteur que le build (pas un moteur divergent).
 */
function findEsbuild() {
  const store = path.resolve(here, '../../../node_modules/.pnpm');
  const dirs = readdirSync(store).filter((d) => d.startsWith('esbuild@'));
  if (dirs.length === 0) return null;
  dirs.sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  // Le fichier d'entrée, pas le dossier : un import ESM d'un dossier est
  // refusé (« Directory import ... is not supported »).
  const candidate = path.join(
    store,
    dirs[dirs.length - 1],
    'node_modules/esbuild/lib/main.js',
  );
  return existsSync(candidate) ? candidate : null;
}
const ESBUILD = findEsbuild();
const pkgSrc = (name) => path.resolve(here, `../../../packages/${name}/src`);

const ALIASES = {
  '@aurora/ui': path.join(pkgSrc('ui'), 'index.ts'),
  '@aurora/domain': path.join(pkgSrc('domain'), 'index.ts'),
  '@aurora/data': path.join(pkgSrc('data'), 'index.ts'),
};

export async function resolve(specifier, context, nextResolve) {
  const exact = ALIASES[specifier];
  if (exact) {
    return { url: pathToFileURL(exact).href, shortCircuit: true };
  }
  if (specifier.startsWith('src/')) {
    const hit = probe(path.join(pkgSrc('ui'), specifier.slice(4)));
    if (hit) return { url: pathToFileURL(hit).href, shortCircuit: true };
  }
  // Un import relatif sans extension : on sonde `.ts`, `.tsx`, puis l'index du
  // dossier. `packages/ui` a les deux formes (`./theme/provider` est un
  // `provider.tsx`, `./themes` est un `index.ts`), et le hook partagé ne tente
  // que `.ts` — donc il échoue sur les `.tsx` sans cette sonde.
  if (specifier.startsWith('.')) {
    const base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    const hit = probe(base);
    if (hit) return { url: pathToFileURL(hit).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

/** Résout un chemin sans extension : fichier `.ts`/`.tsx`, puis index de dossier. */
function probe(base) {
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

export async function load(url, context, nextLoad) {
  // Un `.css` importé par un composant du design system : Vite l'injecte dans
  // la page, Node n'a pas d'équivalent. On émet un module VIDE — le style n'est
  // pas ce qu'un test `node:test` vérifie, et l'alternative (faire échouer tout
  // import qui traverse `@aurora/ui`) rendrait le design system intestable.
  if (url.endsWith('.css')) {
    return { format: 'module', source: 'export default {};', shortCircuit: true };
  }
  if (url.endsWith('.json')) {
    const raw = readFileSync(fileURLToPath(url), 'utf8');
    return {
      format: 'module',
      source: `export default ${raw};`,
      shortCircuit: true,
    };
  }
  // `--experimental-strip-types` ne connaît que `.ts` : un `.tsx` échoue en
  // « Unknown file extension ». Le dépôt a des `.tsx` dans la chaîne du design
  // system (`theme/provider.tsx`), donc on les transpile avec l'esbuild du
  // workspace — le même que Vite. C'est de l'infrastructure de TEST ; le build
  // Vite n'est pas concerné.
  if (url.endsWith('.tsx')) {
    const file = fileURLToPath(url);
    const { transformSync } = await import(ESBUILD);
    const out = transformSync(readFileSync(file, 'utf8'), {
      loader: 'tsx',
      format: 'esm',
      jsx: 'automatic',
      target: 'es2022',
    });
    return { format: 'module', source: out.code, shortCircuit: true };
  }
  return nextLoad(url, context);
}

