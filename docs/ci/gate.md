# CI Gate — état vérifié (2026-10-24)

**Ref:** `AI_RULES.md` §9, `.github/workflows/ci.yml`, AD-16c.
**Contexte:** Phase 0, lot P0-A (rebaselining).

> **Mise à jour (lot P0-A, `b2d7040`).** Le gate est désormais **VERT** et le
> workflow a été corrigé : les 22 gardes `continue-on-error` héritées de wave 0
> sont supprimées, les commandes du workflow pointent les vrais scripts du dépôt,
> et `rebaseline/**` déclenche le CI. Détail des causes racines ci-dessous
> (§2), conservé comme trace : elles étaient toutes pré-existantes.

---

## 1. Baseline mesuré

Environnement : Node v24.21.0 · pnpm 10.28.0 (via corepack).

| Check | Commande | Avant P0-A (`main` @ `07d70a6`) | Après P0-A (`b2d7040`) |
|---|---|---|---|
| install | `pnpm install` | ✅ OK | ✅ OK (lockfile à jour) |
| typecheck | `pnpm -r typecheck` | ❌ ROUGE (~95 erreurs TS, 7 pkgs) | ✅ **0** |
| lint | `pnpm -r lint` | ❌ ROUGE (config non chargeable) | ✅ **0** (0 err / 0 warn) |
| tests | `pnpm -r test` | ⚠️ 2 échecs (`platform`, `focus`) | ✅ **661/661** |
| build | `pnpm -r build` | ❌ ROUGE (`tsc --noEmit` au lieu du vrai build) | ✅ **0** |
| boundaries | `sh scripts/check-boundaries.sh` | ❌ ROUGE (G2 faux positif) | ✅ **G1–G4 OK** |
| RLS static | `sh scripts/check-rls.sh` | ✅ OK | ✅ OK (28 fichiers) |
| view-joins | `node --experimental-strip-types scripts/check-view-joins.ts` | ✅ OK | ✅ OK (88 .sql) |
| spine | `node --experimental-strip-types tests/spine/spine.test.ts` | ✅ OK | ✅ OK |

**Verdict : le gate est VERT.** Toutes les causes du rouge initial étaient
pré-existantes (aucune introduite par ce lot).

---

## 2. Causes racines (toutes pré-existantes, toutes corrigées)

### 2.1 typecheck — `tsconfig.base.json` sans `dom` ni `@types/node`
`"lib": ["ES2022"]` sans `dom`, et aucun `@types/node` global : les packages qui
utilisent `fetch` / `process` / `console` / `structuredClone` / `node:*` échouaient
(`discovery` 33, `integrations` 30, `workflows` 14, `ascent` 13, `platform` 6,
`data` 2, `mobile` 1). Le défaut était **latent**, pas uniforme : 15 packages
passaient. Le pattern de correction existait déjà dans le dépôt (`packages/ui` et
`apps/mobile` ajoutaient `DOM` localement, `apps/desktop` ajoutait `DOM` + `node`).

### 2.2 lint — trois défauts distincts
1. `eslint.config.js` importait `eslint-plugin-storybook`, déclaré uniquement dans
   `packages/ui/package.json` → `ERR_MODULE_NOT_FOUND` au chargement, donc
   **aucun** package n'était réellement linté.
2. **`eslint-plugin-react-hooks` n'était pas installé du tout**, alors que ~31
   erreurs `react-hooks/*` étaient rapportées. Ce n'étaient pas des violations :
   ESLint échoue sur chaque directive `eslint-disable-next-line react-hooks/...`
   dont la règle est introuvable (*« Definition for rule … was not found »*).
   26 des 31 « erreurs » étaient cet artefact.
3. `packages/ui` figurait dans **son propre** bloc d'interdiction AD-10, alors
   qu'AD-10 réserve les moteurs **à** `packages/ui` : le barrel `src/index.ts`
   échouait pour avoir ré-exporté son propre `./motion`.

**Vrais bugs de code trouvés au passage** (pas du bruit de lint) :
`apps/mobile/src/ux/use-horizontal-swiper.ts` importait `useReducedMotion` depuis
`motion/react` (violation AD-10 réelle) ; `knowledgeFlags` / `emptyFlags` /
`taskFlags` (3 pages mobile) appelaient des hooks sans être nommés `use*`
(violation `rules-of-hooks`) ; 6 vrais warnings `exhaustive-deps` dans
`packages/ui`, invisibles tant que le plugin manquait.

### 2.3 tests — dépendances non liées
`platform` et `focus` échouaient sur `Cannot find package '@capacitor/core'`.
`@capacitor/core` (packages/platform) et `@capacitor/preferences` (apps/mobile)
sont importés par le code mais n'étaient pas déclarés.

### 2.4 check-boundaries — G2 faux positif
Le motif `sk-[A-Za-z0-9]{8,}` capturait la classe CSS `sk-progress`
(`apps/mobile/src/ux/skeletons.tsx`) et l'identifiant de domaine
`sk-capacite-portante` (préfixe `sk-` = *skill*), en les prenant pour des clés
Stripe (`sk_live_`) — 20 occurrences, **zéro secret réel**. Seuil porté à
`{20,}` : toute clé réelle fait ≥ 20 caractères après le préfixe. Vérifié : le
motif détecte toujours une vraie clé et laisse passer les faux positifs.

### 2.5 `ci.yml` — structurellement inopérant
- **Il n'a JAMAIS tourné sur GitHub** : `GET /repos/joydatini-lab/aurora/actions/runs`
  → `total_count: 0`. Les filtres `on.push` ne couvraient que `main`, `wave0/**`,
  `wave*/**`.
- **Les 22 `continue-on-error`** étaient keyés sur `!exists('packages/domain/package.json')`,
  package qui existe → ils étaient déjà sans effet, mais restaient comme dette
  trompeuse.
- **L'étape « Tests » ne pouvait jamais s'exécuter** : garde
  `hashFiles('vitest.config.ts')`, or ce fichier **n'existe pas** à la racine. Les
  661 tests ne tournaient donc jamais en CI.
- **Typecheck / Lint / Build** appelaient `pnpm -r exec tsc --noEmit` et
  `pnpm -r exec eslint . --max-warnings=0` au lieu des scripts du dépôt
  (`pnpm -r typecheck` / `pnpm -r lint` / `pnpm -r build`).

### 2.6 Défaut transverse : arrêt au premier échec
`pnpm -r <script>` s'arrête au **premier** package en échec. Un « gate vert »
annoncé sur cette base est structurellement trompeur — un package vert masque tous
les suivants. Itérer package par package pour un diagnostic.

---

## 3. État de `ci.yml` après P0-A

| Élément | Avant | Après |
|---|---|---|
| `on.push.branches` | `main`, `wave0/**`, `wave*/**` | + `rebaseline/**` |
| `continue-on-error` | 22 | **0** |
| Tests | `pnpm -r exec vitest run` (garde morte) | `pnpm -r test` |
| Build | `pnpm -r exec tsc --noEmit` | `pnpm -r build` |
| Typecheck / Lint | `exec tsc --noEmit` / `exec eslint .` | `pnpm -r typecheck` / `pnpm -r lint` |
| Node | 22 | 24 (`engines: node >=22`) |

`ci-base` (10 étapes) tourne sur chaque push ; `ci-gate` (18 étapes) tourne sur
`main` et sur les PR vers `main`.

### 3.1 Vérification en CI réelle (2026-10-24)

Le dépôt est un **fork** (`joydatini-lab/aurora` ← `joynagassi-cyber/aurora`) :
les évènements `push` n'y déclenchent pas le CI de façon fiable (0 run sur
2 pushes alors que la branche correspondait à `on.push.branches`). Un
`workflow_dispatch` explicite crée bien un run → `workflow_dispatch` a été
ajouté pour lever la dépendance à ce comportement.

| Run | Déclencheur | `ci-base` | `ci-gate` |
|---|---|---|---|
| [40060549578](https://github.com/joydatini-lab/aurora/actions/runs/40060549578) | dispatch, avant `b61445b` | ❌ ROUGE (TS6305/TS7006/TS18048) | skipped |
| [40061363155](https://github.com/joydatini-lab/aurora/actions/runs/40061363155) | dispatch, `b61445b` | ✅ **SUCCESS** | skipped (main-only) |

`ci-gate` ne s'exécute que sur `main` ou sur une PR vers `main` : il faut une PR
pour l'exercer. Le gate complet a été vérifié localement sur une arborescence
sans `dist/` (§1).

---

## 4. Précautions d'environnement (sandbox de développement)

- `pnpm -F @aurora/mobile build:web` dépasse le heap Node par défaut (SIGABRT,
  exit 134) au rendu des chunks : utiliser `NODE_OPTIONS=--max-old-space-size=8192`.
- `check-view-joins.ts` doit tourner via `node --experimental-strip-types`
  (comme le CI) ; `pnpm exec tsx` échoue (`tsx` n'est pas une dépendance du
  workspace).
- Le budget gz de `build:web` n'est vert qu'avec un `dist/` frais (`rm -rf dist`
  avant).

---

## 5. Recette de vérification

> **Piège du *clean checkout* (`b61445b`).** Un `pnpm -r typecheck` lancé sur une
> arborescence qui contient déjà des `dist/` (gitignorés, laissés par un
> `pnpm -r build` antérieur) **peut être vert à tort** : les artefacts périmés
> masquent les erreurs TS6305/TS6059/TS6307 que le CI, qui part propre, va
> rencontrer. C'est exactement ce qui s'est produit : gate vert en local, rouge
> en CI, pour le même commit. **Toujours supprimer les `dist/` avant de
> conclure.** Corrigé dans `b61445b` (references + `composite` + `rootDir`
> retirés ; 5 imports `src/...` rendus relatifs) : le typecheck passe désormais
> avec **zéro** `dist/`.

```sh
corepack pnpm install
rm -rf packages/*/dist apps/*/dist tests/e2e/dist   # sinon vert trompeur
corepack pnpm -r typecheck
corepack pnpm -r lint
corepack pnpm -r test
corepack pnpm -r build
sh scripts/check-boundaries.sh
sh scripts/check-rls.sh
node --experimental-strip-types --no-warnings scripts/check-view-joins.ts
node --experimental-strip-types --no-warnings tests/spine/spine.test.ts
```

### 5.1 Vérification **live** de la base et de la RLS (2026-10-24)

Le gate ci-dessus est **statique** : `check-rls.sh` lit le texte des migrations.
Il prouve la *forme* des policies, pas qu'elles **isolent réellement** deux
utilisateurs. Deux vérifications live ont été ajoutées, exécutables **sans
credential** (Docker uniquement) :

```sh
sh scripts/rls-live-check.sh      # RLS live : 2 users + contrôle négatif
```

Ce que `scripts/rls-live-check.sh` fait, et pourquoi c'est probant :

1. démarre `supabase/postgres:15.8.1.085` (mêmes schémas `auth`/`cron`/`vault`
   et extensions `vector`/`pg_cron` que le projet live) ;
2. applique **les 28 migrations dans l'ordre** — une migration qui ne
   s'applique pas fait échouer le script ;
3. crée **deux** `auth.users` (A et B) ;
4. exécute `tests/rls-penetration.sql` : pour **chaque** table publique portant
   `user_id`, une ligne possédée par B doit être invisible **et** intouchable
   (SELECT/UPDATE/DELETE) par A. Toute fuite lève une exception ;
5. **contrôle négatif** : désactive la RLS sur `tasks` et **exige** que le test
   échoue. Un test qui ne peut pas échouer ne prouve rien.

**Résultat 2026-10-24 :** 28/28 migrations appliquées, **58 tables** contrôlées,
**41** amorcées, **0 pénétration** ; contrôle négatif déclenché comme attendu.
Les 17 tables non amorcées le sont pour une raison **structurelle** (FK ou CHECK
qu'un générateur ne peut pas inventer), pas par échec de policy — la raison de
chaque saut est imprimée en `NOTICE`.

**Régression silencieuse 2026-10-26 → 2026-10-28 (corrigée).** Le harnais a
cessé de fonctionner sans que personne ne s'en aperçoive : `0029` (2026-10-26)
attache un trigger `BEFORE INSERT` à `auth.identities`, table que **GoTrue crée
au runtime** et que l'image `supabase/postgres` ne fournit pas. Le rejeu mourait
donc à `0029` sur `relation "auth.identities" does not exist`. Second défaut,
révélé une fois le premier corrigé : l'image embarque un GoTrue **plus ancien**
(21 colonnes, `confirmed_at`) que le projet live (37 colonnes,
`email_confirmed_at`), donc le trigger de `0029` échouait sur
`column "email_confirmed_at" does not exist`. La fenêtre existe parce que le
harnais n'est **pas** dans `ci.yml` : il ne tourne que si on l'invoque à la main.
Leçon : un gate manuel qui n'est pas relancé après chaque migration cesse
silencieusement de garder quoi que ce soit.

**Résultat 2026-10-28 (après correctif des fixtures) :** **33** migrations
rejouées (0001..0032 + 0200), 0 erreur, **58 tables** contrôlées, **41**
amorcées, **0 pénétration**, contrôle négatif déclenché. Le correctif réaligne le
fixture sur la forme **mesurée en production** (`information_schema` du projet) ;
aucune migration n'a été dégradée.

**Couverture portée à 58/58 (2026-10-28).** Les 17 tables non amorcées ne
l'étaient pas pour une raison « structurelle insurmontable » : le seedeur ne
lisait pas le catalogue assez loin. Deux causes, toutes deux lisibles depuis
`pg_constraint` :

1. **Clé étrangère vers un parent portant `user_id`** (13 tables) — un `uuid`
   aléatoire ne correspond à aucune ligne parente. Corrigé en amorçant le parent
   **à la demande, récursivement**, et en pointant l'enfant sur la ligne créée.
   Seules les FK que le seed remplit réellement (NOT NULL, sans défaut) sont
   résolues ; une FK nullable reste NULL, ce qui rompt au passage les cycles
   d'auto-référence (`semantic_nodes.parent_id`).
2. **CHECK sur un ensemble fermé** (6 tables : `artifacts.kind`, `gaps.kind`,
   `discovery_items.kind`, `semantic_nodes.kind`, `semantic_edges.relation`,
   `focus_profiles.method`) — plus les bornes numériques
   (`focus_profiles.base_minutes >= 1`). Corrigé en lisant le **premier littéral
   autorisé** (ou la borne) directement dans la définition de la contrainte, au
   lieu d'inventer une valeur.

Tout est **découvert**, jamais listé : le seedeur ne peut plus dériver quand une
migration ajoute une table, une FK ou un CHECK. Le contrôle négatif reste
déclenché (RLS coupée sur `tasks` ⇒ le test échoue), donc l'extension de
couverture n'a pas rendu le test complaisant.

**Résultat 2026-10-28 final : 58/58 tables contrôlées et amorcées, 0 SKIPPED,
0 pénétration.**

**Vérification live indépendante (2026-10-28, projet de production).** Le harnais
Docker prouve l'isolation sur un schéma rejoué ; la vérification suivante l'a
prouvée sur la **production réelle**, via `SET ROLE authenticated` +
`set request.jwt.claim.sub` (ce que `auth.uid()` lit) :

- A voit **1** ligne sur 2 (la sienne) et **0** ligne de B ; B symétriquement —
  `FORCE RLS = true` confirmé sur `tasks`, `projects`, `agent_runs`,
  `canvas_sessions` ;
- `INSERT` de A pour le compte de B → `42501 new row violates row-level security
  policy` ; `UPDATE` croisé → **0 ligne affectée** ;
- jeu de test marqué `RLS-PROOF-*`, inséré puis supprimé (0 ligne restante).

> **Ce que ce script a révélé.** Avant lui, `tests/rls-penetration.sql` **n'avait
> jamais été exécuté** : il portait une liste figée de 49 tables et supposait une
> colonne `id` partout. Les deux étaient faux (73 tables portent `user_id` ; 4 de
> la liste n'ont pas d'`id`). Il échouait donc dès la première table. Corrigé :
> le test **découvre** désormais les tables depuis le catalogue et ne peut plus
> dériver.
