# ADR — Engineering v1 (exclusions + critère de déclenchement)

> **Statut** : Décision lead, 2026-10-14 (lot B, story A8 — `docs` only, pas de code).
> **Scope** : les 4 packages engineering actuels (`engineering-core`,
> `engineering-registry`, `engineering-solvers`, `engineering-adapters`) sont
> des **stubs morts** (`export {};` + zéro test + zéro consommateur, vérifié
> par l'audit lot B A0). Cette ADR tranche leur statut v1.
> **Principe** (cohérent parking lot Phase 2) : on **garde** les 4 packages
> (pas de `git rm` — Q1 du plan lot B), on écrit ici le critère de
> déclenchement qui, s'il se produit, imposera leur implémentation.

## Contexte

### Les 4 packages tels qu'ils existent (état SSoT, vérifié 2026-10-14)

| Package | Contenu actuel | État |
|---|---|---|
| `packages/engineering-core` | `export {};` (fichier unique, zéro symbol) | stub mort |
| `packages/engineering-registry` | `export {};` (fichier unique, zéro symbol) | stub mort |
| `packages/engineering-solvers` | `export {};` (fichier unique, zéro symbol) | stub mort |
| `packages/engineering-adapters` | placeholder explicite SymPy (zéro worker branché) | placeholder AD-15 |

Aucun des 4 packages n'est importé nulle part (grep `packages/*` +
`apps/*` confirmé zéro importeur, hors `package.json` workspace wiring).
Le module `@aurora/domain` (types SSoT, AD-15) n'expose aucun type
"engineering" (pas de `EngineeringSymbol` / `SolverPort` / `RegistryEntry`) :
le concept n'existe pas encore dans le SSoT, il n'est que **prospectif**.

### Pourquoi des stubs et non une suppression ?

Le plan lot B (Q1, validé owner 2026-10-13) a tranché : **garder + ADR**
(pas de `git rm`). Raison : les 4 packages font partie du
`engineering-*` cluster décrit dans `docs/architecture/` comme la
**future** couche "symboles / solveurs" (la SSoT d'un eventual
`@aurora/engineering` capability — cf. `scientific-engine` voisin mais
distinct : celui-ci est **implémenté**, ce cluster n'est pas). La
suppression totale ferait perdre l'emplacement (le `workspace:*`
wiring dans le monorepo, le package.json du package) au moment où le
critère de déclenchement se produira. Garder coûte zéro (pas de code,
pas de test, pas d'EF, pas de secret, pas de CI) et documente
l'intention.

## Décision

### Ruling 1 — `engineering-core` / `registry` / `solvers` : **exclus v1**

Les 3 packages sont **exclus du v1** : ils restent des stubs `export {};`
(même contenu, zéro ligne de code, zéro test, zéro consommateur) pour toute
la durée de la v1. **Rien ne les implémente, rien ne les consomme, rien
ne les teste** — l'état stub est l'état SSoT du v1 pour ce cluster.

**Critère de déclenchement** (la seule condition qui lèverait l'exclusion) :
> Un usage réel de **symboles** (une UI qui affiche un object
> `EngineeringSymbol` typé par `@aurora/domain`) ou de **solveurs**
> (une feature qui appelle `SolverPort.evaluate(...)` dans le kernel
> AD-12 ou dans une EF AD-12 server-side) **demandera l'implémentation**
> du package concerné. Tant que cette demande n'existe pas dans le
> SSoT `@aurora/domain` + un consommateur concret (page, agent
> capability AD-12, ou EF), le package reste stub.

C'est un critère **déclencheur** (pas une date) : il ne dit pas "v2" ni
"Phase 2" — il dit "quand un usage réel apparaîtra". C'est cohérent avec
le parking lot Phase 2 du plan (le cluster engineering est listé comme
work candidat pour la Phase 2, mais la Phase 2 n'est pas datée ; le
critère détermine si le cluster y entre).

### Ruling 2 — `engineering-adapters` (SymPy) : **différé**

Le placeholder SymPy (AD-15 : adapters vendor = 1 package isolé,
zéro import depuis le module) est **différé** au même critère que les
Ruling 1, mais avec une nuance AD-1 : l'adapter SymPy est un
**vendor-adapter** (AD-1 : vendors ONLY in adapter packages) — il
n'implémentera jamais de logique, il ne branchera **que** un solver
spécifique (SymPy). Le worker SymPy (EF server-side, AD-12) ne sera
**jamais** branché avant qu'au moins un `engineering-solvers` SSoT
exige explicitement ce vendor (le solver port `@aurora/domain`
devra référencer SymPy par name, pas par import — AD-1 le port est
le SSoT, l'adapter est l'implémentation swappable).

### Ruling 3 — pas de `git rm`, pas de test, pas de CI (scope v1)

Les 4 packages :
- **restent dans le workspace** (`pnpm-workspace.yaml` inchangé).
- **n'ont ni test ni CI** : un stub `export {};` n'a rien à tester ;
  le grep final (A9) vérifie simplement l'absence d'importeur.
- **n'ont pas d'EF ni de secret** (AD-3 : un package sans code =
  rien à sécuriser).
- **n'apparaissent pas dans `MobileDataProvider`** (AD-15 : la
  v1 n'a pas de capability engineering, donc pas de repo mobile).

## Conséquences

1. **A9 (validation transversale)** : le grep final
   `grep -r "@aurora/engineering" apps/ packages/ --include="*.ts" --include="*.tsx"`
   doit retourner **zéro** résultat (hors les 4 `package.json`
   `workspace:*` declarations dans `packages/engineering-*/package.json`
   themselves + le root `pnpm-workspace.yaml`). C'est le SSoT vérifiable
   du Ruling 3.
2. **Parking lot Phase 2** : le critère de déclenchement de cette ADR
   est la **seule** entrée de ce cluster dans la Phase 2. Si la
   Phase 2 démarre et que le critère ne se produit pas, les 4 stubs
   restent (pas de date d'expiration).
3. **AD-12 / AD-13** : l'ADR n'implémente rien, ne change pas de
   contract pack, ne crée pas de PR pipeline — c'est du `docs`
   only (Q3 du plan lot B : "Câblage seul" s'applique aux modules
   branchés ; A8 n'est pas un module branché, c'est un tranché
   documentaire).

## Alternative considérée et rejetée

- **Supprimer les 4 packages maintenant** (`git rm`) : rejeté (Q1 du
  plan lot B, validé owner). Coût : ré-faire le wiring pnpm + l'emplacement
  du package au moment du déclenchement. Bénéfice : 0 (les 4 packages
  sont déjà zéro coût — pas de code, pas de test, pas d'EF).
- **Implémenter un skeleton minimal (symbol + port) maintenant** :
  rejeté. Un skeleton sans consommateur crée une SSoT fantôme (AD-15
  : les types SSoT vivent dans `@aurora/domain` ; un skeleton dans
  `engineering-core` sans type dans `@aurora/domain` casserait AD-15).
- **Mettre une date d'expiration (ex. "revoir en Phase 2")** :
  rejeté. Le critère de déclenchement (usage réel) est plus précis
  qu'une date ; une date forcerait une décision arbitraire même si
  aucun usage n'existe.

## Références

- `docs/architecture/adr-traceability.md` — la table de traçabilité
  SSoT (AD-1..AD-16 + ADR S2.8, S13, S14, S15, S18) ; ce cluster
  engineering n'y apparaît pas (pas d'AD-# dédié) : c'est volontaire,
  le cluster n'a pas encore d'AD-#. Cette ADR est le **premier**
  écrit qui l'attache à un ruling explicite (exclusion v1 + critère).
- `docs/architecture/registries.md` — le `FeatureRegistry` (01 S4.7)
  est le SSoT des features optionnelles (AD-1 last paragraph) ; le
  cluster engineering, quand il déclenchera, deviendra une feature
  du `FeatureRegistry` (comme `scientific-engine` l'est déjà).
- Plan lot B `jiggly-pondering-milner.md` A8 — "Tranché Engineering
  (ADR, pas de code)".
