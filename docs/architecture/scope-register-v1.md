# Registre de périmètre v1 — famille par famille, confronté au code et à la base live

> **Ref** : périmètre v1 ratifié par le owner (familles A–M, 2026-10-24) ·
> `docs/features/master-feature-catalog.md` · `docs/design-system/screens/_inventory.md`
> (54 slugs) · `docs/architecture/data-ownership-matrix.md` ·
> `docs/plans/2026-10-24-decisions-d1-d5.md`.
> **Créé** : 2026-10-24. **Objet** : appliquer la règle de frontière du périmètre —
> *« une capacité P1 déjà implémentée et testée est réutilisée ; une capacité non
> implémentée fait l'objet d'une tâche explicite »* — **sans** transformer la liste
> en promesse, **sans** réduire le périmètre en silence.
> **Nature** : constat. **Aucun code** (AD-13).

---

## 1. Comment lire ce registre

**Vocabulaire** (imposé, `AI_RULES.md`) : `IMPLEMENTED` · `PARTIALLY IMPLEMENTED` ·
`SCAFFOLDED` · `PLANNED` · `MISSING` · `BROKEN` · `BLOCKED` · `UNKNOWN`.

**Règle d'évidence.** Une ligne n'est `IMPLEMENTED` que si elle a **un propriétaire
de code**, **des tables** et **un écran** (ou une raison explicite d'absence
d'écran). Un nom de package, un type ou un README ne prouve rien.

**Mesures de référence** (2026-10-24) :

| Mesure | Valeur | Source |
|---|---|---|
| Packages | **19** | `ls packages/` |
| dont stubs (`export {}`) | **3** (`engineering-core`, `-registry`, `-solvers`) | 5 lignes chacun |
| Apps | **3** (`mobile`, `desktop`, `server`) | `ls apps/` |
| Tables `public` live | **64** | MCP Supabase |
| Vues live | **15** | MCP Supabase |
| Politiques RLS | **124** | MCP Supabase |
| Fonctions `public` live | **119** | MCP Supabase |
| Migrations dépôt / tracées live | **28** / **27** | `ls` vs `schema_migrations` |
| Edge Functions dépôt / live | **8** / **5** | `ls` vs MCP |
| Routes mobile réelles | **38** | `apps/mobile/src/router.tsx` |
| Pages mobile (fichiers) | **26** | `find apps/mobile/src/pages -name index.tsx` |
| Écrans spécifiés | **54** | `_inventory.md` |

**Le delta 26 vs 54 s'explique** : l'inventaire compte les **variantes comme des
slugs** (`_inventory.md` §1 règle 2 : projets 4 vues, goal dashboard 5 layouts,
pagers jour/semaine/mois ×2, enveloppes). Les 26 pages portent ces variantes
**en interne** (vues empotées, pagers partagés). **Ce n'est pas un écart de
périmètre** — c'est une différence d'unité de comptage, déjà documentée.

---

## 2. Le constat structurel : 4 familles sans propriétaire de code

`packages/data/src/commands.ts:180` déclare `OWNER_MODULE_BY_ENTITY` — la carte
officielle « entité → module propriétaire ». Elle nomme **`knowledge`**,
**`artifact`** et **`identity`** comme propriétaires. Or :

| Module déclaré propriétaire | Package | Tables live | Vue live | Verdict |
|---|---|---|---|---|
| `productivity` | ✅ `packages/productivity` (2 017 l.) | 13 | `v_productivity_*` | OK |
| `learning` | ✅ `packages/learning` (1 318 l.) | 6 | `v_learning_scope` | OK |
| `progress` | ✅ `packages/progress` (952 l.) | 6 | `v_progress_*` | OK |
| `discovery` | ✅ `packages/discovery` (1 902 l.) | 4 | `v_discovery_*` | OK |
| `integrations` | ✅ `packages/integrations` (2 243 l.) | 3 | `v_integrations_scope` | OK |
| **`knowledge`** | ❌ **ABSENT** | **10** (`knowledge_documents`, `document_chunks`, `semantic_nodes/edges/bridges`, `node_state`, `semantic_tree_version`, `source_refs`, +`notes`/`resources`) | `v_knowledge_public`, `v_knowledge_scope` | **PARTIAL** |
| **`artifact`** | ❌ **ABSENT** | **2** (`artifacts`, `artifact_files`) | `v_artifact_scope` | **PARTIAL** |
| **`identity`** | ❌ **ABSENT** | **1** (`user_context`) | `v_identity_scope` | **PARTIAL** |

**Lecture :** ces trois modules ont **tables + vues + politiques RLS + entités de
domaine** (`packages/domain/src/entities-artifact.ts`, `entities-identity.ts`),
**mais aucun package**. Leur logique est **dispersée** : `packages/learning/src/
retrieval.ts` lit le Knowledge ; `packages/agent/src/tools.ts` manipule artifacts
et semantic_nodes ; `packages/data/src/commands.ts` porte les commandes.

**Conséquence directe sur le périmètre :** les familles **C (Knowledge)** et
**H (Artifact)** — deux des familles ratifiées — **n'ont pas de propriétaire
implémenté**, alors que la référence §7.2 interdit d'en créer un « sans examiner
les concepts existants ». L'examen est fait : **les concepts existent, le package
manque.** C'est une **tâche explicite**, pas une absence de périmètre.

---

## 3. Le défaut bloquant : le chemin de jobs est mort

**Fait prouvé** (`scripts/check-ef-imports.mjs`, exit 1) : `fn-job-dispatcher`
importe `PROGRESS_FSRS_TICK_HANDLER` et `PROGRESS_COURSE_IMPORT_HANDLER` — **deux
symboles inexistants**. L'EF ne peut pas démarrer, n'est pas déployée, et
**34 jobs attendent depuis le 2026-10-08**.

**Ce que cela bloque dans le périmètre ratifié :**

| Famille | Capacité bloquée | Pourquoi |
|---|---|---|
| **B.3** Flashcards/FSRS | planification des rappels | le `fsrs-tick` n'a **aucun handler** (pas même de constructeur) |
| **B.1** Import de cours | ingestion asynchrone | `course_import` importé mais **inexistant** |
| **E.1** Tableaux de progression | recalcul des snapshots | `skill_recompute` produit, jamais consommé |
| **F** Agent Kernel | runs longs, reprises | `agent_run` passe par le dispatcher |
| **H** Artifact | exports longs, files de travaux | idem |
| **I.4** Intégrations | exécution asynchrone | idem |
| **K** transversaux | jobs, reprise, observabilité | `job_logs` = **0 ligne** |

**Et le réveil est structurellement impossible :** le cron 0014 fait
`pg_notify('aurora_job_dispatcher', …)` — un Edge Function HTTP **ne peut pas**
tenir un `LISTEN` — et **`pg_net` n'est pas installé** (extensions live :
`pg_cron`, `pgcrypto`, `vector`). **Aucun** mécanisme ne peut réveiller le
dispatcher aujourd'hui.

**C'est la tâche n°1 du périmètre**, parce qu'elle bloque **6 familles sur 11**.

---

## 4. Registre famille par famille

### A — Productivité (11 familles)

| # | Famille | Statut | Preuve / manque |
|---|---|---|---|
| 1 | Inbox universelle | `PARTIALLY IMPLEMENTED` | page `/inbox` + `notes`/`resources` ; **conversion capture→objet métier** non vérifiée |
| 2 | Tâches / sous-tâches | `PARTIALLY IMPLEMENTED` | `tasks`+`subtasks`+`/tasks` ; **pièces jointes, énergie, historique de reports** à vérifier |
| 3 | Eisenhower | `IMPLEMENTED` | `packages/productivity/src/eisenhower.ts:70` (`quadrantOf`) **+ vue « Quadrants » dans `/tasks`** (`pages/tasks/index.tsx:62`, `TASK_VIEWS`) |
| 4 | Calendrier / time blocking | `IMPLEMENTED` | `calendar_events` + `/calendar` |
| 5 | Projets (4 vues) | `IMPLEMENTED` | `projects`+`milestones` + `/projects` et `/projects/:id` (Liste/Kanban/Timeline/Gantt) |
| 6 | Objectifs | `IMPLEMENTED` | `goals`+`user_goals` + `packages/goal-engine` (1 103 l.) + `/goals`, `/goals/:id` |
| 7 | Habitudes / routines | `IMPLEMENTED` | `habits`+`routines` + `/habits`, `/routines` — **dérive `name`/`title`** documentée (à trancher, AD-15) |
| 8 | Focus | `PARTIALLY IMPLEMENTED` | `focus_sessions`+`focus_profiles`+`packages/focus` + `/focus` ; **blocage d'apps = PLATFORM_DEPENDENT** (conforme au périmètre qui ne le promet pas dans le navigateur) |
| 9 | Revues / journal de décisions | `PARTIALLY IMPLEMENTED` | `decisions` + `/reviews`, `/retro` ; **le bilan périodique est un vide honnête** (la table `reviews` = entité FSRS du Learning, **pas** un bilan de période) |
| 10 | Analytics personnels | `PARTIALLY IMPLEMENTED` | `progress_snapshots` + `/progress`, `/progress/:id` |
| 11 | Bibliothèque de ressources | `IMPLEMENTED` | `resources` + `/learn`, `/learn/:id` |

**Tâches explicites A :** bilan périodique réel (#9) ; vérifier PJ/énergie/reports
(#2) ; conversion capture→objet (#1) ; trancher la dérive `name`/`title` (#7).

### B — Apprentissage (7 familles)

| # | Famille | Statut | Preuve / manque |
|---|---|---|---|
| 1 | Import cours/ressources | `PARTIALLY IMPLEMENTED` | `fn-import-course` **déployée** + `course_imports` ; **handler `course_import` inexistant** → partie asynchrone morte |
| 2 | Fiches de révision | `PARTIALLY IMPLEMENTED` | `learning_items` + `course_imports` ; génération IA = **routage modèle à vérifier** |
| 3 | Flashcards / FSRS | `PARTIALLY IMPLEMENTED` | `flashcards`+`reviews`+`packages/learning` ; **`fsrs-tick` sans handler** → rappels non planifiés |
| 4 | QCM / exercices | `PARTIALLY IMPLEMENTED` | `learning_items` |
| 5 | Coach d'apprentissage | `PARTIALLY IMPLEMENTED` | cadence contrôlée utilisateur ; OneSignal |
| 6 | Mirror Cognitive | `PARTIALLY IMPLEMENTED` | `agent.mirror` (skill builtin) + preuves Progress ; **mécanisme à valider** (le périmètre le dit lui-même) |
| 7 | Compétences | `IMPLEMENTED` | `skills`+`skill_states`+`user_skills`+`skill_catalog` (**607 lignes**, 18 builtin) + `/skills` |

**Tâches explicites B :** handler `fsrs-tick` (#3) et `course_import` (#1) — **le
cœur de la dette** ; valider le mécanisme Mirror (#6).

### C — Knowledge (3 familles) — **sans package**

| # | Famille | Statut | Preuve / manque |
|---|---|---|---|
| 1 | Arbre sémantique | `PARTIALLY IMPLEMENTED` | 7 tables + `v_knowledge_public`/`_scope` + `/knowledge`, `/knowledge/:nodeId` ; **pas de package** |
| 2 | Recherche / récupération | `PARTIALLY IMPLEMENTED` | `packages/learning/src/retrieval.ts` ; `document_chunks` ; **pas de propriétaire** |
| 3 | OCR / numérisation | `MISSING` | `ocr` n'est qu'un **vocabulaire de JobKind** (`packages/domain/src/jobs.ts:13`) ; **aucun provider** (`grep tesseract/runOcr` → seulement du texte de catalogue `skill_catalog`) |

**Tâche explicite C :** créer `packages/knowledge` — propriétaire des 10 tables
existantes — **sans nouvelle table** (les concepts existent déjà).

### D — Discovery (4 familles)

| # | Famille | Statut | Preuve / manque |
|---|---|---|---|
| 1 | Recherche multi-source | `IMPLEMENTED` | `research-provider.ts` + séparation FACT/TREND/ANALYSIS/SCENARIO/UNCERTAINTY (`discovery.ts`, `veille-pipeline.ts`) ; **clés API requises** (AD-3, server-only) |
| 2 | Analyse des lacunes | `PARTIALLY IMPLEMENTED` | `gaps` + domaine ; lignes **owned by Progress** |
| 3 | Horizons / scénarios | `PARTIALLY IMPLEMENTED` | `domain_timeline` ; scénarios datés |
| 4 | Fiches de découverte | `IMPLEMENTED` | `discovery_items`+`discovery_vault` + `/discovery`, `/discovery/:id`, `/discovery/nouveau` |

### E — Progress (4 familles)

| # | Famille | Statut | Preuve / manque |
|---|---|---|---|
| 1 | Tableaux de progression | `PARTIALLY IMPLEMENTED` | `progress_snapshots` + `/progress` ; recalcul dépend du dispatcher (**mort**) |
| 2 | Preuves | `IMPLEMENTED` | `progress_evidences` + règle F-07 sole-producer |
| 3 | Analyse causale | `PARTIALLY IMPLEMENTED` | `progress.cause` (outil agent) ; discipline corrélation≠causalité documentée |
| 4 | Trajectoires conditionnelles | `PARTIALLY IMPLEMENTED` | `trajectory_scenarios` |

### F — Agent Aurora / Kernel

| Bloc | Statut | Preuve / manque |
|---|---|---|
| Noyau (comprendre → planifier → vérifier → mémoriser) | `IMPLEMENTED` | `packages/agent` **7 864 l. / 30 fichiers** ; `agent_runs`+`agent_actions`+`expert_skills` ; `fn-agent-run` **déployée** |
| Capacités Planner/Coach/Tutor/Researcher/Executor | `PARTIALLY IMPLEMENTED` | `tools.ts` + `capability.ts` ; **capacités orchestrées, pas 5 agents** (conforme au périmètre) |
| Chaînes multi-agents | `PARTIALLY IMPLEMENTED` | `packages/workflows` (2 138 l., W1–W23) |
| **Runs longs / reprises / jobs** | **`BROKEN`** | le chemin `agent_run` passe par le **dispatcher mort** |

### G — Scientific Engine

| Bloc | Statut | Preuve / manque |
|---|---|---|
| Formules, calcul, conversions, unités | `IMPLEMENTED` | `packages/scientific-engine` **1 916 l. / 12 fichiers** |
| Symbolique, algèbre linéaire | `PARTIALLY IMPLEMENTED` | **choix des moteurs = NEEDS_DECISION** (le périmètre dit « selon les moteurs retenus ») |
| Écran | `MISSING` | **aucune route** dans les 38 (vérifié) |

### H — Artifact — **sans package**

| Bloc | Statut | Preuve / manque |
|---|---|---|
| Artefacts, versions, provenance | `PARTIALLY IMPLEMENTED` | `artifacts`+`artifact_files`+`v_artifact_scope` + `entities-artifact.ts` + `/artifacts/:id` ; **pas de package** |
| Prévisualisation par format | `MISSING` | `/artifacts/:id` existe mais = `GAP (OQ-46)` ; « aucun aperçu fictif » = règle **non implémentée** |
| Exports + files de travaux | `MISSING` | dépend du dispatcher (**mort**) |

**Tâche explicite H :** créer `packages/artifact` — propriétaire des 2 tables
existantes — **avant** Design Space (L), qui en dépend.

### I — Integrations

| Bloc | Statut | Preuve / manque |
|---|---|---|
| Connecteurs | `PARTIALLY IMPLEMENTED` | `packages/integrations` **2 243 l.** ; `integrations` table + `/integrations` ; **`fn-integrations` non déployée** |
| Automatisations | `PARTIALLY IMPLEMENTED` | `automations` + `automation-scheduler.ts` |
| Notifications | `PARTIALLY IMPLEMENTED` | `fn-notifications` **déployée** + `notification_preferences` |
| Exécution asynchrone | **`BROKEN`** | dispatcher mort |

### J — Identity — **sans package**

| Bloc | Statut | Preuve / manque |
|---|---|---|
| Auth, profil, préférences, thèmes | `IMPLEMENTED` | `user_context` + `entities-identity.ts` + `/settings` |
| Périodes de silence | `PARTIALLY IMPLEMENTED` | colonnes présentes |
| Permissions / isolation | `IMPLEMENTED` | **124 politiques**, RLS FORCE — **vérifié par exécution** (`scripts/rls-live-check.sh` : 58 tables, 0 pénétration, contrôle négatif) |
| Organisations / SSO / RBAC | `PLANNED` | **hors v1** (le périmètre demande de ne pas présumer) |

### K — Design System et services transversaux

| Bloc | Statut | Preuve / manque |
|---|---|---|
| Design System, tokens, thèmes, états | `IMPLEMENTED` | `packages/ui` + `reui` + `hugeicons-mapping.ts` |
| Contrats / schémas | `PARTIALLY IMPLEMENTED` | Zod **par module** ; `packages/contracts` **absent** (proposition §8.7.2, non retenue — voir `design-space-integration.md` §6) |
| Accès données, migrations | `IMPLEMENTED` | 28 migrations ; **mais dérive dépôt↔live** (27 tracées, 3 fonctions live-only) |
| PowerSync/SQLite | `PARTIALLY IMPLEMENTED` | config + règles ; **round-trip jamais exécuté** (`BLOCKED` sur le relay) |
| Stockage fichiers | `PARTIALLY IMPLEMENTED` | `artifact_files` (réf. R2) |
| Recherche globale | `PARTIALLY IMPLEMENTED` | FTS + pgvector côté serveur |
| Routage modèles / coûts | `PARTIALLY IMPLEMENTED` | `model_registry`+`ai_usage`+`ai_health` |
| **Jobs, reprise, annulation, observabilité** | **`BROKEN`** | dispatcher mort ; `job_logs` = 0 ligne |
| Journalisation filtrée | `PARTIALLY IMPLEMENTED` | table présente, jamais alimentée |
| Gestion uniforme des erreurs | `IMPLEMENTED` | `packages/workflows/src/error-recovery.ts` (10 classes) |
| Adaptateurs de plateforme | `IMPLEMENTED` | `packages/platform` (711 l.) |

### L — Design Space Pro (11 capacités)

| # | Capacité | Statut | Preuve |
|---|---|---|---|
| 1–11 | Brief, Brand DNA, LOGO, Charte, AFFICHE, Validateur, Document multipages, Édition/IA, Import, Export, Cohérence | **`MISSING` (0/11)** | **0 package, 0 table, 0 route, 0 écran** — vérifié par `grep` + MCP |

**Tâche explicite L :** 11 capacités neuves. **Dépendances** : H (Artifact) et le
Canvas (existant) — voir `docs/architecture/design-space-integration.md` §3.

### M — Hors premier périmètre créatif

`PLANNED` — roadmap. Aucune tâche v1. **À auditer séparément** si des capacités
existent déjà (le périmètre le demande).

---

## 5. Synthèse : réutilisé vs tâche explicite

**Réutilisé tel quel (aucune tâche) — 14 familles** : A.3 Eisenhower, A.4
calendrier, A.5 projets, A.6 objectifs, A.7 habitudes/routines, A.11 bibliothèque,
B.7 compétences, D.1 recherche, D.4 fiches de découverte, E.2 preuves, F noyau,
G calcul, J auth/isolation, K design system + plateforme.

**Tâche explicite — 4 chantiers structurants** :

| # | Tâche | Débloque | Ordre |
|---|---|---|---|
| **T1** | **Dispatcher** : implémenter `fsrs-tick`+`course_import` **ou** retirer les imports morts ; **puis** rendre le réveil réel (`pg_net` ou cron HTTP) ; déployer les 8 EF | B.1, B.3, E.1, F, H, I.4, K | **1** |
| **T2** | **`packages/knowledge`** — propriétaire des 10 tables existantes | C.1, C.2 | 2 |
| **T3** | **`packages/artifact`** — propriétaire des 2 tables existantes | H, puis L | 3 |
| **T4** | **Design Space Pro** (11 capacités) | L | 4 |

**Tâches ponctuelles** : bilan périodique (A.9) · OCR (C.3) · prévisualisation par
format (H) · valider Mirror (B.6) · trancher `name`/`title` (A.7) · versionner les
3 fonctions live-only (K) · round-trip PowerSync (K, `BLOCKED`) ·
`packages/identity` (J, consolidation).

---

## 6. Séquencement proposé (tranches ordonnées par dépendance)

```
Tranche 0  T1  Dispatcher + réveil + déploiement des 8 EF
               → débloque 6 familles. Aucune fonctionnalité neuve.
Tranche 1  T2  packages/knowledge      (C)   ─┐
           T3  packages/artifact        (H)   ─┤ propriétaires des tables existantes
Tranche 2  Coquille web (apps/web-app) — décision D2
Tranche 3  T4  Design Space Pro (L) — dépend de T3 + Canvas
Tranche 4  Ponctuelles (bilan, OCR, prévisualisation)
Tranche 5  Entreprise (J) — hors v1, décision séparée
```

**Justification de l'ordre** : T1 d'abord parce qu'elle bloque **6 familles sur
11** et que rien d'autre n'est vérifiable sans elle. T2/T3 avant T4 parce que
Design Space **écrit** dans Artifact et **lit** Knowledge
(`design-space-integration.md` §3). Le web (tranche 2) peut démarrer en parallèle
de T2/T3 : il ne dépend pas d'eux.

---

## 7. Corrections au corpus (doc-lag trouvé en établissant ce registre)

| Doc | Affirmation | Réalité mesurée |
|---|---|---|
| `AI_RULES.md:18` | « 24 migrations (`0001…0023`) + 6 Edge Functions » | **28** migrations, **8** EF |
| `AI_RULES.md:18` | « 4 jobs pg_cron 100 % `succeeded` — `job_queue` vide » (vérif 2026-10-07) | **34 jobs `pending`** depuis le **2026-10-08** ; dispatcher non déployé |
| `master-feature-catalog.md` | couvre A–K | **ne couvre pas L** (Design Space) — écart C1 du registre de statut |
| `data-ownership-matrix.md` | Knowledge/Artifact/Identity = modules propriétaires | **aucun package** pour les 3 |

**Ces corrections ne changent pas le périmètre ratifié.** Elles changent l'écart
réel entre le périmètre et le code — c'est précisément ce que ce registre mesure.
