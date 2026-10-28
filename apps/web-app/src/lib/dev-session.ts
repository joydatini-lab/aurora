// =============================================================================
// dev-session.ts — identité locale synthétique, MODE DÉVELOPPEMENT UNIQUEMENT.
//
// POURQUOI UN MODULE SÉPARÉ
// Il est chargé par `import()` DYNAMIQUE, uniquement sous
// `import.meta.env.DEV` (data-session.ts). Vite remplace `import.meta.env.DEV`
// par `false` au build de production et élimine la branche : ce fichier n'est
// alors embarqué dans AUCUN chunk. C'est vérifiable (le chunk n'existe pas),
// contrairement à une simple condition sur une propriété d'objet — que le
// minifieur ne peut pas replier.
//
// À QUOI ÇA SERT
// Prouver le chemin d'écriture RÉEL (module → kernel → apply → miroir
// persistant) sans identifiants Supabase live. L'identité est synthétique et
// n'a aucun accès réseau : `powersyncUrl` reste absent, donc aucune donnée ne
// quitte la machine. Le dépôt n'a aucun chemin d'authentification côté
// web-app ; c'est donc le seul moyen de prouver L5#1 de bout en bout.
// =============================================================================

/** Identifiant stable de l'utilisateur de développement (jamais en prod). */
export const DEV_LOCAL_USER_ID = '00000000-0000-0000-0000-0000000000a1';

export function devLocalIdentity(override?: string): string {
  return override ?? DEV_LOCAL_USER_ID;
}
