/**
 * env.ts — lecture de configuration isomorphe (navigateur ↔ Node/Deno).
 *
 * POURQUOI CE MODULE EXISTE
 * -------------------------
 * Les adapters de ce package (Exa, Tavily, You.com, OneSignal, Composio) lisent
 * leurs clés depuis l'environnement du serveur (AD-3 : jamais de secret côté
 * client). Ils écrivaient `process.env.EXA_API_KEY` directement.
 *
 * Or, en ESM, `process` est un identifiant GLOBAL : dans un navigateur il
 * n'existe pas, et l'expression ne renvoie pas `undefined` — elle lève
 * `ReferenceError: process is not defined`. Ce n'est pas attrapable de façon
 * utile, parce que la lecture se fait dans un constructeur appelé au CHARGEMENT
 * du module : le graphe d'imports entier échoue et l'application ne démarre
 * jamais (observé le 2026-10-28 : écran blanc sur la coquille web).
 *
 * Ce package est atteignable depuis le bundle client (`@aurora/integrations` →
 * `@aurora/discovery` → écrans). Deux options existaient :
 *
 *   1. exclure ces adapters du bundle client — la bonne cible, mais elle
 *      suppose de découper `index.ts`, ce qui casse les imports existants ;
 *   2. rendre la lecture TOLÉRANTE : sans `process`, la variable est absente,
 *      donc `isConfigured()` renvoie `false`, donc l'adapter dégrade vers le
 *      provider « offline » — comportement déjà prévu par AD-1.
 *
 * (2) est retenue : elle ne change rien au comportement serveur, elle rend juste
 * la lecture non-fatale côté client. Un adapter sans clé n'est pas un adapter
 * cassé : c'est un adapter non configuré, ce que le produit sait déjà gérer.
 *
 * NOTE : `process.env.NODE_ENV` n'est PAS concerné. Vite le remplace à la
 * compilation par une valeur littérale, il ne touche donc jamais le global.
 */

/** Forme minimale de `process` cherchée sur `globalThis` (jamais `import`). */
interface ProcessLike {
  env?: Record<string, string | undefined>;
}

/**
 * Lit une variable d'environnement, ou `fallback` si elle est absente.
 *
 * Ne lève jamais : un environnement sans `process` (navigateur) et une variable
 * non définie donnent le même résultat, ce qui est exactement la sémantique
 * voulue par les adapters (« pas de clé → non configuré »).
 */
export function readEnv(key: string, fallback = ''): string {
  const proc = (globalThis as { process?: ProcessLike }).process;
  const value = proc?.env?.[key];
  return value === undefined || value === '' ? fallback : value;
}

/** Vrai si au moins une des variables listées porte une valeur non vide. */
export function hasEnv(...keys: string[]): boolean {
  return keys.some((key) => readEnv(key) !== '');
}
