# Spec de module MVP — `productivity.eisenhower`

> **Gabarit** : §M1–§M6 (`docs/plans/2026-10-27-redefinition-priorites-et-specs-mvp.md` §3.3).
> **Nature** : constat **vérifié**. Chaque ligne de §M2/§M6 porte un fichier ou une
> commande. Aucune ligne n'est déduite d'un README (AD-13, `AI_RULES.md` §1).
> **Base mesurée** : branche `rebaseline/2026-10-23`, arbre de travail de
> `ws2a/specs-modules-1-6`.
> **Statut du module** : `DESIGNED_ONLY + NEEDS_DECISION (screen)`
> (`master-feature-catalog.md:20`). Le **domaine** est `IMPLEMENTED` et testé ;
> la **surface** est additive et non ratifiée ; le **chemin agent** n'est pas
> appliqué côté serveur (voir §M3, §M6).
> **Priorité** : **V2** (Productivity restant, plan §3.4 — le module n'est pas
> dans le parcours vertical V0).

---

## §M1 Capacités retenues en v1

| Sous-capacité | En v1 | Preuve |
|---|---|---|
| Quadrant **calculé**, jamais stocké | ✅ | `quadrantOf` — `packages/productivity/src/eisenhower.ts:70` ; doc `docs/productivity/eisenhower.md` §3 (« No `urgency` column exists ») |
| Urgence **dérivée** de `due_at` (overdue / due-today / due-48h) + `status=blocked` | ✅ | `urgencyOf` — `eisenhower.ts:48` (fenêtre 48 h par défaut, `eisenhower.ts:55`) |
| Importance explicite (`importance` 1–4) ou inférée du **horizon d'objectif** | ✅ | `quadrantOf` — `eisenhower.ts:70-79` (long → 4, medium → 3, sinon 2) |
| Tableau des 4 quadrants groupés, tâches `done`/`cancelled` exclues | ✅ | `quadrantBoard` — `eisenhower.ts:92-113` |
| **Suggestions explicables** (signaux listés) et déterministes | ✅ | `prioritizationSuggestion` — `eisenhower.ts:147` ; contrat `Signal`/`PrioritizationSuggestion` `eisenhower.ts:115-133` |
| Application d'une suggestion = **1 commande partielle** (AD-7) | ✅ | `applySuggestion` — `eisenhower.ts:217-231` (retourne `{ table:'tasks', patch:{ priority } }`) |
| Jamais de re-priorisation **silencieuse** (`requiresConfirmation: true`) | ✅ | `eisenhower.ts:133` + `eisenhower.ts:210` |
| **Hors v1** : écran quadrants **ratifié**, persistance d'un `urgency`/quadrant, scan d'impact serveur (job `prioritization`) | ❌ | écran = `ADDITIF / GAP (OQ-16)` (`_inventory.md:93`) ; pas de colonne `urgency` (`0002_productivity.sql:65-74`) ; pas de handler `prioritization` dans `packages/productivity/src/jobs.ts` |

**Vocabulaire fermé** : 4 quadrants `q1_do | q2_plan | q3_minimize | q4_defer`
(`eisenhower.ts:20`) ; 8 clés de signal (`eisenhower.ts:116`).

---

## §M2 Contrat de données

### Aucune table propriétaire — projection sur `tasks` (AD-15)

Le module **n'ajoute ni table ni colonne**. Les quadrants sont une **vue
calculée** sur les champs AD-15 de `tasks` :

`supabase/migrations/0002_productivity.sql:57-80`.

| Entrée du quadrant | Colonne | Note |
|---|---|---|
| Importance explicite | `importance int` 1–4 | `0002_productivity.sql:66` |
| Override manuel | `priority int` 1–4 | `0002_productivity.sql:65` (écrit par `applySuggestion`) |
| Urgence | `due_at timestamptz` | `0002_productivity.sql:67` |
| Urgence (blocage) | `status` CHECK `…blocked…` | `0002_productivity.sql:63` |
| Impact (lien objectif) | `goal_id uuid` | `0002_productivity.sql:61` |
| Effort (dépassement) | `actual_minutes int` | `0002_productivity.sql:71` |
| Dépendances | `dependencies jsonb` (OR-Set) | `0002_productivity.sql:73` |

> **Aucune colonne `urgency`** : la migration s'arrête à `dependencies`/`crdt_*`
> et la table n'a pas de champ de quadrant. Confirmé par
> `grep -n "urgency" supabase/migrations/0002_productivity.sql` → **aucun
> résultat** (exit 1, exécuté en §M6). Le seul `urgency` du dossier
> `supabase/migrations/` vit dans le **texte** du seed marketplace `0021`
> (contenu de skills), jamais dans une DDL de colonne.

### RLS — héritée, pas ajoutée

`tasks` est couverte par la boucle générique `0002_productivity.sql:174-202` :
`ENABLE` + **`FORCE`** ROW LEVEL SECURITY, policy `tasks_user_isolation`
(`USING`/`WITH CHECK` sur `user_id = auth.uid()`), policy `tasks_service_role`
en `SELECT` borné par `user_id`. Le module ne pose **aucune** policy.

### Écriture — single-writer (AD-7 / F-03)

`applySuggestion` (`eisenhower.ts:217`) retourne un `ProductivityCommand`
**partiel** (`tasks.ts:41`), appliqué par `LocalCommandRepository.apply('productivity', …)`.
Une suggestion confirmée = une commande = une table `tasks` ; aucun écrit
multi-table. Le module **ne touche jamais** la base directement.

### Synchronisation

`tasks` est dans le stream PowerSync (`powersync/sync-config.yaml:41`), donc les
**entrées** du calcul (importance, priority, due_at, status, dependencies,
actual_minutes) sont disponibles **hors-ligne**. Le module n'a pas de flux propre
(aucune table) : rien à synchroniser de plus.

Le schéma **client** porte ces colonnes (`packages/data/src/powersync-schema.ts:40-42`
pour `priority`/`importance`/`due_at`), gardées par `domain-schema-drift.test.ts`.

---

## §M3 Chemin agent

SSoT : `docs/agent/feature-agentability-matrix.md` — **la matrice ne porte pas de
ligne `eisenhower`** (vérifié : `grep -n "eisenhower" feature-agentability-matrix.md`
→ **aucun résultat**, §M6). L'entrée de capacité existe pourtant dans le registre.

| Champ | Valeur | Preuve |
|---|---|---|
| Capacité | `task.prioritize` | `packages/agent/src/capability.ts:653` |
| Outil | `eisenhower_prioritize` | `capability.ts:654`, `packages/agent/src/tools.ts:1247` |
| Énoncé type | « priorise mes tâches » | `tools.ts:1249` |
| Scopes | `productivity:read` / `productivity:write` | `capability.ts:656-657` |
| Confirmation | **non** (`requiresConfirmation: false`) | `capability.ts:659` |
| Destructif | non | `capability.ts:658` |
| Dégradation AD-1 | suggestions **locales par règles** (aucun serveur requis) | `eisenhower.ts:147` (pur, déterministe) ; `master-feature-catalog.md:20` |
| Niveau | outil **thin** (`{ ok, command, payload }`) | `tools.ts:1255` |

> **Écart constaté (documenté, non corrigé)** : l'outil émet une commande
> `productivity.eisenhower` (`tools.ts:1255`) mais **aucun consommateur ne
> l'applique** — `grep -rn "productivity.eisenhower"` ne renvoie que la
> définition de l'outil lui-même (§M6). Il n'existe **aucune route serveur**
> (pas de branche dans `supabase/functions/fn-agent-run/index.ts` ni dans
> `fn-canvas`) qui traduit cette commande en écriture `tasks`. Le chemin agent
> est donc **enregistré mais non abouti** : `NOT_READY` pour l'application
> serveur de la commande.

---

## §M4 Contrat de surface

SSoT : `docs/design-system/screens/eisenhower.md` +
`docs/design-system/screens/_inventory.md:93`.

| Élément | Route | Statut spec |
|---|---|---|
| Vue quadrants | sous `/tasks` (`?view=matrix`) | **ADDITIF / GAP (OQ-16)** — `_inventory.md:93`, à ratifier |
| Surface Home Q1 | « Priorité principale » (AD-14) | référence, non possédée par ce module |

**Implémentation présente** : `apps/mobile/src/pages/tasks/views/EisenhowerView.tsx`
(546 lignes), branchée dans `apps/mobile/src/pages/tasks/index.tsx:44`.

> **Écart constaté (documenté, non corrigé)** : la vue **redéfinit sa propre**
> règle de quadrant (`EisenhowerView.tsx:88-94` — « important » = `priority >= 4`,
> « urgent » = présence d'une échéance) au lieu d'importer `quadrantOf` du
> domaine (`@aurora/productivity`). Les deux règles **divergent** : le domaine
> utilise `importance` + bandes d'urgence (48 h, `blocked`) ; la vue utilise
> `priority` + présence d'échéance. Deux sources de vérité pour un même mot.
> Classe : duplication de logique, pas un défaut d'affichage. Décision AD-15
> requise pour aligner la vue sur le domaine — pas de correctif unilatéral.

**Les 5 états UX** (chargement · vide · erreur · hors-ligne · partiel) : le
squelette existe (`EisenhowerSkeleton` — `apps/mobile/src/pages/tasks/index.tsx:34`).
La matrice est **offline-capable** (`_inventory.md:93`).

---

## §M5 Offline

| Opération | Sans réseau | Preuve |
|---|---|---|
| Calculer la matrice | ✅ | pur, sans I/O — `quadrantOf`/`quadrantBoard` (`eisenhower.ts:70,92`) |
| Lire les entrées | ✅ | stream PowerSync `tasks` (`sync-config.yaml:41`) |
| Suggestion **locale** par règles | ✅ | `prioritizationSuggestion` (`eisenhower.ts:147`), déterministe |
| Confirmer une re-priorisation | ✅ (file locale) | `applySuggestion` → `ProductivityCommand` (AD-2/AD-7) |
| Suggestion **assistée serveur** (scan d'impact lourd) | ❌ **réseau requis** | AD-8 job `prioritization` — **non implémenté** (absent de `jobs.ts`) ; dégradation AD-1 = règles locales |

**Classe offline** : `offline-capable` (`master-feature-catalog.md:20`).

> **Ne pas confondre** : la **matrice** est hors-ligne (lecture locale) ; le scan
> d'impact **serveur** ne l'est pas — et n'existe pas encore.

---

## §M6 Preuve

### Commandes (exécutées)

```sh
pnpm -F @aurora/productivity test        # tests du module — 16/16 vert
grep -n "urgency" supabase/migrations/0002_productivity.sql  # → aucun résultat (exit 1 ; pas de colonne)
grep -n "eisenhower" docs/agent/feature-agentability-matrix.md  # → aucun résultat (exit 1)
grep -rn "productivity.eisenhower" --include=*.ts --include=*.tsx .  # → définition d'outil seule
```

### Couverture actuelle (mesurée)

`packages/productivity/test/productivity.test.ts` — **16 tests** au total
(commande ci-dessus : `tests 16 / pass 16 / fail 0`), dont pour ce module :

| Test | Ligne | Ce qu'il prouve |
|---|---|---|
| `eisenhower: quadrant derivation (computed, not stored)` | 96 | `quadrantOf` (overdue→Q1, futur→Q2, non important→Q3) + `quadrantBoard` exclut `done`/`cancelled` |
| `eisenhower: explainable suggestions + confirmed apply` | 114 | `prioritizationSuggestion` porte le signal `overdue`, `requiresConfirmation: true`, et `applySuggestion` retourne une commande `tasks` |

### Seuils

Référence : `docs/testing/matrix.md`. Un test qui ne peut pas échouer n'est pas
une preuve. Le domaine est couvert (2 tests, exécutés) ; **la surface et le
chemin agent ne sont pas prouvés** → §M3/§M4.

---

## §M7 Questions ouvertes

| # | Question | État |
|---|---|---|
| **ME-1** | La vue `EisenhowerView` doit-elle importer `quadrantOf` du domaine au lieu de sa règle locale divergente (`EisenhowerView.tsx:88`) ? | **ouverte** — décision AD-15 (duplication de logique) |
| **ME-2** | Qui applique la commande `productivity.eisenhower` émise par `eisenhower_prioritize` (`tools.ts:1255`) ? | **ouverte** — aucune route serveur trouvée ; chemin agent `NOT_READY` |
| **ME-3** | L'écran quadrants (OQ-16, additif) est-il ratifié au périmètre v1 ? | **ouverte** — `_inventory.md:93` = `ADDITIF / GAP` |
| **ME-4** | Faut-il persister `urgency`/quadrant ? | **non** — choix documenté (recalcul local, `0002` sans colonne) |
