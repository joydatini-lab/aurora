# CI Gate — état vérifié (2026-10-24)

**Ref:** `AI_RULES.md` §9, `.github/workflows/ci.yml` (job `ci-gate`), AD-16c.
**Contexte:** Phase 0, lot P0-A (rebaselining). Ce document remplace l'état
« wave 0, skip-with-reason » par un **baseline mesuré** sur `main` (`07d70a6`).

> ⚠️ **Le gate n'a JAMAIS tourné sur GitHub.** `GET /repos/joydatini-lab/aurora/actions/runs`
> renvoie `total_count: 0`. Les `continue-on-error` de `ci.yml` (hérités de wave 0, quand
> `packages/` était vide) sont toujours en place alors que les 19 packages existent :
> la CI est donc **silencieusement inopérante**. C'est un constat, pas un jugement.

---

## 1. Baseline mesuré (2026-10-24, `main` @ `07d70a6`)

Environnement : Node v24.21.0 · pnpm 10.28.0 (via corepack) · `pnpm install` OK (17,3 s).

| Check | Commande | Résultat | Cause |
|---|---|---|---|
| install | `pnpm install` | ✅ **OK** | — |
| typecheck | `pnpm -r typecheck` | ❌ **ROUGE** | ~95 erreurs TS, 7 packages (voir §2.1) |
| lint | `pnpm -r lint` | ❌ **ROUGE** | `eslint.config.js` importe un plugin non résolu (voir §2.2) |
| tests | `pnpm -r test` | ⚠️ **2 échecs** | `platform` + `focus` (voir §2.3) |
| boundaries | `sh scripts/check-boundaries.sh` | ❌ **ROUGE** | G2 faux positif (voir §2.4) |
| RLS static | `sh scripts/check-rls.sh` | ✅ **OK** | 28 migrations |
| view-joins | `node --experimental-strip-types scripts/check-view-joins.ts` | ✅ **OK** | 88 .sql, 0 JOIN inter-module |
| spine | `node --experimental-strip-types tests/spine/spine.test.ts` | ✅ **OK** | exit 0 |
| build | `pnpm -r build` | ❌ **ROUGE** | 1 seul package a un script `build` (voir §2.5) |

**Verdict : le gate est ROUGE, et l'était déjà avant toute modification de cette session.**

---

## 2. Causes racines (toutes pré-existantes)

### 2.1 typecheck — 7 packages en échec

`tsconfig.base.json` déclare `"lib": ["ES2022"]` **sans `dom`** et aucun `@types/node`
global. Les packages qui utilisent `fetch` / `process` / `console` / `structuredClone` /
`queueMicrotask` / `node:*` échouent donc :

| Package | Erreurs | Exemple |
|---|---|---|
| `discovery` | 33 | `Cannot find name 'fetch'` (`vault-store-rest.ts:60`) |
| `integrations` | 30 | `Cannot find name 'process'` (`composio.ts:259`) |
| `workflows` | 14 | `Cannot find module 'node:test'` (tests) |
| `ascent` | 13 | `Cannot find name 'structuredClone'` (`adapter.ts:108`) |
| `platform` | 6 | `Cannot find module '@capacitor/core'` |
| `data` | 2 | `Cannot find name 'console'` (`powersync-client.ts:196`) |
| `mobile` | 1 | `Cannot find module '@capacitor/preferences'` (`apkUpdater.ts:16`) |

Les packages qui **passent** (`domain`, `agent`, `ui`, `productivity`, `learning`,
`progress`, `goal-engine`, `focus`, `scientific-engine`, `engineering-*`, `server`,
`desktop`) n'utilisent pas ces globales — le défaut est donc **latent**, pas uniforme.

**Note :** `packages/ui` et `apps/mobile` ajoutent `DOM` localement ; `apps/desktop`
ajoute `DOM` + `types: ["node"]`. Le pattern de correction existe donc déjà dans le dépôt.

### 2.2 lint — le config racine importe un plugin non résolu

`eslint.config.js` ligne 2 : `import storybook from "eslint-plugin-storybook";`

Or `eslint-plugin-storybook` est déclaré **uniquement** dans `packages/ui/package.json`
(l.157), **pas** dans le `package.json` racine. Résultat : **toute** invocation d'eslint
échoue au chargement du config, quel que soit le package.

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'eslint-plugin-storybook'
imported from /workspace/project/eslint.config.js
```

`pnpm -r lint` s'arrête au premier package (`domain`) → **les 18 autres ne sont jamais lintés.**

### 2.3 tests — 2 échecs

| Package | Résultat | Cause |
|---|---|---|
| `platform` | 0 pass / 1 fail | `Cannot find package '@capacitor/core'` — `@capacitor/core` est déclaré dans `packages/platform/package.json` mais **pas lié** dans son `node_modules` |
| `focus` | 12 pass / 1 fail | idem (importe `platform/src/lifecycle.ts`) |

**Tous les autres packages passent** : agent 150 · mobile 206 · integrations 54 ·
discovery 48 · ascent 35 · goal-engine 34 · workflows 26 · progress 19 · learning 17 ·
productivity 16 · scientific-engine 14 · focus 12 · data 7 fichiers · ui 48 · engineering-adapters 3.

### 2.4 check-boundaries — G2 faux positif

G1/G3/G4 passent. **G2 (« secrets en clair ») échoue à tort** : son motif capture la
classe CSS `sk-progress` dans `apps/mobile/src/ux/skeletons.tsx` et l'identifiant de
domaine `sk-capacite-portante` dans `apps/mobile/test/mirror-wiring.test.ts`
(préfixe `sk-` = *skill*), en les prenant pour des clés Stripe (`sk_live_`).

→ Le check est **trop large**, pas le code. C'est un bug du script, pas une fuite.

### 2.5 build — un seul package a un script `build`

Sur 19 packages, **seul `packages/goal-engine`** déclare `"build": "tsc -p tsconfig.json"`.
Les 18 autres n'en ont pas → `pnpm -r build` ne construit rien, et le `tsc -b` global
échoue en cascade (`TS6305` : `packages/domain/dist` absent).

Le dépôt utilise pourtant des **project references** (`tsconfig.json` racine, 14 refs) :
le mode correct est `tsc -b`, pas `tsc -p` par package.

### 2.6 Défaut transverse du gate : arrêt au premier échec

`pnpm -r <script>` s'arrête au **premier** package en échec. Un « gate vert » annoncé
sur cette base est donc structurellement trompeur — un package vert masque tous les
suivants. Il faut itérer package par package (comme fait ici).

---

## 3. Ce qui est réellement vert

- `pnpm install` (lockfile **non modifié** par l'install — reproductible)
- `check-rls.sh` — 28 migrations, RLS + FORCE RLS, 0 policy permissive
- `check-view-joins.ts` — 88 .sql, 0 JOIN inter-module
- `tests/spine/spine.test.ts` — exit 0
- **15 packages sur 17 testés : 100 % de leurs tests passent** (≈ 700 tests cumulés)

## 4. Ce qui est rouge (à corriger en Phase 0, lot P0-A)

1. `tsconfig.base.json` : ajouter `DOM` + `@types/node` (ou les déclarer par package).
2. `package.json` racine : déclarer `eslint-plugin-storybook` en devDependency.
3. `packages/platform` : lier `@capacitor/core` (dépendance déclarée mais absente).
4. `scripts/check-boundaries.sh` : resserrer le motif G2 (faux positif `sk-`).
5. `ci.yml` : retirer les `continue-on-error` wave-0 désormais caducs, sinon la CI
   reste inopérante.

> **Aucune de ces corrections n'a été appliquée.** Ce document est un constat :
> `AI_RULES.md` §2 interdit d'attribuer à mes changements une défaillance pré-existante,
> et l'inverse — corriger en silence — masquerait le vrai état du dépôt.
