# Registre de statut — Aurora (Phase 0, porte de sortie §10.2)

> **Ref:** `Aurora-Reference-Produit-Fonctionnelle-v1.1.md` §10.2 (travaux 1–3, porte de
> sortie) · `AI_RULES.md` §1 (le code gagne sur les docs) · `.agents_tmp/PLAN.md`.
> **Créé :** 2026-10-24 · **Commit de référence :** `bc8ede2` (branche `rebaseline/2026-10-23`).
> **Nature :** constat **vérifié**. Chaque ligne porte un fichier, une commande ou un
> commit. Aucune ligne n'est déduite de la mémoire ou d'un README.

## 0. Méthode et échelles

Classification utilisée (`AI_RULES.md` §1, reprise de la taxonomie du brief) :

| Statut | Sens |
|---|---|
| **IMPLEMENTED** | code présent **et** testé (test vert, ou vérification reproductible) |
| **PARTIAL** | le code existe, une partie du comportement attendu manque |
| **SCAFFOLDED** | structure en place, comportement incomplet (stub, `export {}`) |
| **PLANNED** | intention documentée, **aucune** implémentation |
| **MISSING** | rien trouvé — ni code, ni schéma, ni route |
| **BROKEN** | implémentation présente mais échoue un test/une exécution |

**Portée du gate au moment du constat :** VERT, vérifié sur une arborescence **sans
`dist/`** (`docs/ci/gate.md` §1 et §5) — typecheck 0 · lint 0 · **709 tests** (661
`node --test` + 48 vitest) · build 0 · boundaries G1–G4 · RLS (28 fichiers) ·
view-joins (88 `.sql`) · spine. `ci-base` vert en CI réelle (run `40061363155`).

**Chiffres du dépôt** (vérifiés) : 19 packages · 3 apps · **28** migrations ·
**8** Edge Functions (+ `_shared`) · **65** tables · **12** streams PowerSync (33 `SELECT`) ·
**38** routes · **26** répertoires de page · **19** migrations portant des policies RLS.

---

## 1. Registre — packages

| Package | Statut | Preuve | Note |
|---|---|---|---|
| `@aurora/domain` | **IMPLEMENTED** | `src/index.ts` — 24 exports ; 23 fichiers ; 0 test | SSoT des types (AD-15). Aucun test propre : couvert indirectement par ses 18 consommateurs. |
| `@aurora/data` | **IMPLEMENTED** | 20 fichiers, 7 suites ; consommateurs : desktop, mobile, server | PowerSync client + schéma local. |
| `@aurora/agent` | **IMPLEMENTED** | 30 fichiers, **17 suites** (150 tests) | Le plus testé après `ui`. |
| `@aurora/ui` | **IMPLEMENTED** | **541** fichiers, 190 exports, 48 tests vitest + 7 suites | Design system (AD-6/AD-10/AD-17). Inclut 172 fichiers `assistant-ui` **dormants**. |
| `@aurora/productivity` | **IMPLEMENTED** | 11 fichiers, 1 suite (16 tests) | Tâches, projets, objectifs, habitudes, routines, focus, décisions, calendrier. |
| `@aurora/learning` | **IMPLEMENTED** | 8 fichiers, 1 suite (17 tests) | FSRS, cours, flashcards, reviews. |
| `@aurora/progress` | **IMPLEMENTED** | 6 fichiers, 2 suites (19 tests) | Snapshots, preuves, trajectoires. |
| `@aurora/discovery` | **IMPLEMENTED** | 12 fichiers, 5 suites (48 tests) | Veille, vault, lacunes. |
| `@aurora/integrations` | **IMPLEMENTED** | 9 fichiers, 8 suites (54 tests) | Connecteurs, env gardé (`readEnv`). |
| `@aurora/workflows` | **IMPLEMENTED** | 32 fichiers, 7 suites (26 tests) | Orchestration inter-features. |
| `@aurora/goal-engine` | **IMPLEMENTED** | 6 fichiers, 5 suites (34 tests) ; **seul** package avec `build` | Dynamique d'objectifs. |
| `@aurora/focus` | **IMPLEMENTED** | 6 fichiers, 3 suites (31 tests) | Profils + minuteries (DPC). |
| `@aurora/platform` | **IMPLEMENTED** | 9 fichiers, 1 suite (6 tests) | Adaptateurs Capacitor (`@capacitor/core` lié). |
| `@aurora/ascent` | **IMPLEMENTED** | 8 fichiers, 1 suite (35 tests) | Parcours d'élévation. |
| `@aurora/scientific-engine` | **PARTIAL** | 12 fichiers, 1 suite (14 tests) | Opérations prises en charge ; moteur externe non branché. |
| `@aurora/engineering-adapters` | **PARTIAL** | 2 fichiers, 1 suite (3 tests) ; `export * from './sympy.ts'` | Seul l'adaptateur SymPy existe (avec repli numérique). |
| `@aurora/engineering-core` | **SCAFFOLDED** | `src/index.ts` = `export {}` (1 fichier, 0 test) | Squelette wave 0, jamais rempli. |
| `@aurora/engineering-registry` | **SCAFFOLDED** | `src/index.ts` = `export {}` | idem. |
| `@aurora/engineering-solvers` | **SCAFFOLDED** | `src/index.ts` = `export {}` | idem. |

**Constat :** 14 packages sur 19 sont `IMPLEMENTED`. Les 3 `engineering-*` vides sont
des squelettes nommés — dette d'architecture (des packages existent sans contenu) mais
**aucun test rouge**, car ils ne déclarent pas de script `test`.

---

## 2. Registre — applications

| App | Statut | Preuve | Note |
|---|---|---|---|
| `@aurora/mobile` | **IMPLEMENTED** | 26 pages, 38 routes, `test` = 206 tests ; scripts `dev`, `build:web`, `typecheck`, `lint`, `test` | **La seule UI réelle.** Ionic/Capacitor. Cible `D-018.1` = **Phase 4**. |
| `@aurora/server` | **PARTIAL** | scripts `typecheck`, `lint` **seulement** ; 5 refs de projet ; pas de `build`/`test` | Coquille de types ; le serveur réel est Supabase (EF + PG). |
| `@aurora/desktop` | **SCAFFOLDED** | `main.cjs`/`preload.cjs`/`renderer.jsx`, scripts `dev`/`build`/`dist` ; **pas de `test`** | Spike Electron Phase 0. Sécurité correcte (contextIsolation, pas de nodeIntegration). Pas de vraie UI. |
| **`apps/web-app`** | **MISSING** | `ls apps/` → `desktop mobile server` | **Cible actée `D-018.1` (web d'abord) — n'existe pas.** Voir §6 C2. |
| **`apps/marketing`** (Next.js) | **MISSING** | `ls apps/` | Hors périmètre courant (`adr-018` §7.3). |

---

## 3. Registre — données et synchronisation

| Élément | Statut | Preuve |
|---|---|---|
| Schéma PG (28 migrations, **65 tables**) | **IMPLEMENTED** | `supabase/migrations/*.sql` ; 19 migrations portent des policies |
| RLS (policies + FORCE) | **IMPLEMENTED** (statique) | `check-rls.sh` OK — 28 fichiers, FORCE RLS présent |
| **RLS live (user A ≠ user B)** | **PLANNED** | `check-rls.sh` imprime lui-même `TODO(wave1): run against live Supabase` |
| PowerSync config (12 streams, 33 `SELECT`) | **IMPLEMENTED** | `powersync/sync-config.yaml` ; test de wiring vert |
| **PowerSync round-trip bout-en-bout** | **PLANNED** | `powersync/test/roundtrip.md` existe ; **jamais exécuté** (réf. §10.2 item 8) |
| Vues relay (`0015_powersync_relay_views.sql`) | **PARTIAL** | Couvre tasks/projects/goals/subtasks — **pas** habits/routines (cf. `docs/ci/gate.md` §2.6 drift) |
| Jobs persistés (idempotents, AD-8) | **PARTIAL** | `0010_jobs.sql` (`job_queue`, `job_logs`) + `fn-job-dispatcher` (529 l.) ; **E2E jamais exécuté** |
| `agent_runs` (0008) | **IMPLEMENTED** | **Seul** store de conversation ; aucune table `conversations`/`messages` |

---

## 4. Registre — Edge Functions

| EF | Lignes | Statut | Note |
|---|---:|---|---|
| `fn-job-dispatcher` | 529 | **IMPLEMENTED** | Le seul dispatcher (01 §5.2). Triggers cron + claim. |
| `fn-canvas` | 477 | **IMPLEMENTED** | Single-writer AD-7 (read/write/comment). |
| `fn-skills` | 441 | **IMPLEMENTED** | `skill_catalog` (global) + `user_skills`. |
| `fn-integrations` | 375 | **IMPLEMENTED** | Contrat session (Composio). |
| `fn-agent-run` | 270 | **IMPLEMENTED** | `{intent, contextRefs, taskProfile}` → 202 `{jobId}`. |
| `fn-dev-auth` | 160 | **PARTIAL / dette** | **DEV-only**, à supprimer (P6-6). |
| `fn-notifications` | 125 | **PARTIAL** | OneSignal « Phase 1 » — cible mobile. |
| `fn-import-course` | 36 | **PARTIAL** | Enveloppe fine → job. |
| **Déploiement des EF** | — | **PLANNED** | Le `config.toml` documente `supabase functions deploy` comme **commentaire** ; aucun déploiement prouvé. |

**Aucune EF n'est un stub** (`grep 501/TODO(wave)` → 0 hit). La dette est le
**déploiement**, pas le code.

---

## 5. Registre — modules produit (réf. §5) ↔ code

| Module (réf.) | Package propriétaire | Statut |
|---|---|---|
| `productivity.inbox` | `productivity` + `apps/mobile/pages/inbox` | **IMPLEMENTED** |
| `productivity.tasks` (+ sous-tâches) | `productivity` (0013) | **IMPLEMENTED** |
| `productivity.eisenhower` | `productivity` + `ui/EisenhowerMatrix` | **IMPLEMENTED** |
| `productivity.calendar` | `productivity` (0002) + `pages/calendar` | **IMPLEMENTED** |
| `productivity.projects` / `.goals` | `productivity` (0002) | **IMPLEMENTED** |
| `productivity.habits` / `.routines` | `productivity` (0002) | **IMPLEMENTED** (drift de colonne documenté) |
| `productivity.focus` | `focus` (0027) | **IMPLEMENTED** |
| `productivity.reviews` / `.analytics` | `progress` (0005) + `pages/reviews` | **PARTIAL** — `reviews` = entité FSRS, pas le bilan de période rendu par la page |
| `productivity.library` | `productivity` (0002 `resources`) | **IMPLEMENTED** |
| `learning.import` | `learning` (`course_imports`, `fn-import-course`) | **PARTIAL** |
| `learning.flashcards` / FSRS | `learning` (0003) | **IMPLEMENTED** |
| `learning.coach` / `.mirror` | `progress` + `ui/composites` | **IMPLEMENTED** |
| `knowledge.tree` / `.retrieval` / OCR | (0004) — **pas de package dédié** | **PARTIAL** — tables + `ui/SemanticTreeRenderer` ; propriété répartie sur `agent`/`data`/`workflows` |
| `discovery.*` | `discovery` (0006, 0025) | **IMPLEMENTED** |
| `progress.*` | `progress` (0005) | **IMPLEMENTED** |
| `agent.*` | `agent` (0008) + `fn-agent-run` | **IMPLEMENTED** (device voit `AgentRunState` seulement — F-09/AD-3) |
| `scientific.*` | `scientific-engine` | **PARTIAL** |
| `artifact.*` | (0007) + `pages/artifacts` | **PARTIAL** — aperçu/export limités aux formats supportés |
| `integrations.*` | `integrations` (0008) + `fn-integrations` | **IMPLEMENTED** |
| `identity.*` | `domain/entities-identity` + `platform` | **IMPLEMENTED** |
| **Design Space Pro** (Brand DNA, logo, charte, affiche, document) | — | **MISSING** — 0 package, 0 table, 0 écran, 0 route (cf. `docs/frontend/design-space-scope.md`) |
| Studios 3D / Vidéo / Musique / Web | — | **PLANNED** (réf. §10.7, Phase 3) |

---

## 6. Les 3 écarts structurants (ce que le registre met en évidence)

### C1 — Design Space Pro : ratifié en v1, **absent** du code
Réf. §10.1 : « le premier périmètre comprend l'ensemble des modules antérieurs **et
Design Space Pro** ». Vérifié : aucun package, aucune table, aucune route, aucun écran.
~13 écrans neufs + un moteur d'édition + un validateur déterministe.
→ **PLANNED côté docs, MISSING côté code.**

### C2 — La cible actée (web) n'a pas de coquille
`D-018.1` (web → desktop → mobile) et `OQ-1` (Ionic = **mobile seulement**) sont actés,
mais `apps/web-app` **n'existe pas**. Toute l'UI réelle est dans `apps/mobile` (Ionic),
c'est-à-dire la coquille qui **n'est plus la cible**. Le travail d'écrans web n'a donc
nulle part où atterrir.

### C3 — Phase 0 sans preuve d'exécution
Les **décisions** existent (`adr-018`, doctrine responsive, inventaire de 272 briques,
périmètre Design Space). Les **preuves d'exécution** n'existent pas : les 2 POC
(§10.2 items 8–9) n'ont jamais tourné, la migration de données (item 12) n'est pas
définie, et ce registre est le premier livrable de la porte de sortie à voir le jour.

---

## 7. Dette et doc-lag (signalés, non réécrits — `AI_RULES.md` §2)

| Élément | Constat |
|---|---|
| `AI_RULES.md` §3 | dit « **24** migrations (`0001…0023`) + **6** EF » → réel **28** migrations + **8** EF |
| `finalisation-v1.md` P0-3 | prétend le tag `v0.1.0` « existe déjà » → `git tag -l` **vide** |
| `adr-extract.md` §23 | « Phase 1 strictement mobile-only » → **contredit** par `D-018.1` |
| `AI_RULES.md` §7 | « no Electron » → **contredit** (desktop = Phase 2) |
| `docs/design-system/overview.md` | 44 écrans (05 §4) vs **54** (`screens/_inventory.md` §1 = 44 candidats + 10 variantes) → `OQ-1` ratifiée = 54 |
| `engineering-core/registry/solvers` | 3 packages vides (`export {}`) — dette d'architecture |
| `packages/ui/components/assistant-ui` | 172 fichiers dormants, exportés, jamais câblés (`D-018.2` = réserve) |
| Drift `powersync-schema.ts` | client déclare `title`, PG écrit `name` (habits/routines) — mappers dual-read |
| `fn-dev-auth` | EF **DEV-only** présente dans l'arbre (à supprimer, P6-6) |
| **Chaîne de citation erronée** | `docs/plans/finalisation-v1.md` G8 écrit « `AI_RULES.md` §3 **dit 20 migrations** » — or `AI_RULES.md` §3 dit **24** (`0001…0023`) et le réel est **28**. Une doc cite donc une autre doc **inexactement**. Tout constat repris d'un document tiers doit être **re-vérifié à la source** avant d'être propagé. |

---

## 8. Ce que ce registre change

1. **« Où en est-on ? » a désormais une réponse vérifiable** — plus besoin de la mémoire
   (qui s'est déjà trompée : l'épisode « intégration LibreChat », réfuté).
2. **Les 3 écarts sont nommés** : C1 (périmètre), C2 (coquille web), C3 (preuves Phase 0).
3. **La décision `D1` du plan de repriorisation devient informée** : le socle est
   `IMPLEMENTED` (14/19 packages), Design Space Pro est `MISSING`. Livrer l'un avant
   d'ouvrir l'autre **réduit** l'écart au lieu de l'augmenter.

## 9. Hors périmètre de ce document
- Aucune modification de code.
- Aucun POC exécuté ici (items 8–9 → lots dédiés).
- Aucune re-synchronisation des docs normatifs (§7 → lot dédié).
