# Spec de module MVP — `discovery.veille`

> **Gabarit** : §M1–§M6 (`docs/plans/2026-10-27-redefinition-priorites-et-specs-mvp.md` §3.3).
> **Nature** : constat **vérifié**. Chaque ligne de §M2/§M6 porte un fichier ou une
> commande. Aucune ligne n'est déduite d'un README (AD-13, `AI_RULES.md` §1).
> **Base mesurée** : branche `rebaseline/2026-10-23`, arbre de travail de
> `ws2b/specs-modules-7-11`.
> **Statut du module** : `PARTIAL` — le pipeline de veille (qualification +
> notification + vault) est écrit et **solidement** testé (48/48
> `@aurora/discovery`), mais l'**insertion** des `discovery_items` produits et
> l'appel vendor du push ne sont pas branchés côté serveur. Voir §M2 drifts et §M6.
> **Priorité** : **V4** (Discovery + Progress + Artifact, plan §3.4).

---

## §M1 Capacités retenues en v1

| Sous-capacité | En v1 | Preuve |
|---|---|---|
| Port de recherche multi-source (`ResearchProvider`, AD-1 optionnel) | ✅ | `packages/discovery/src/research-provider.ts:33` (`OfflineResearchProvider`) |
| Dégradation `uncertain` si provider absent (01 §6, AD-1) | ✅ | `degradeToUncertain` — `research-provider.ts:48` |
| Cross-check multi-familles (ADR §13.2, ≥ 2 familles) | ✅ | `crossCheck` — `research-provider.ts:70` |
| Séparation typée 5 classes (`FACT/TREND/ANALYSIS/SCENARIO/UNCERTAINTY`) | ✅ | `DISCOVERY_ITEM_KINDS` — `packages/discovery/src/discovery.ts:48` |
| Qualification d'un hit en fiche + décision de filtre | ✅ | `DiscoveryService.qualify` — `discovery.ts:166` |
| Construction de l'item (single-writer `discovery_items`, AD-7) | ✅ | `buildDiscoveryItem` — `discovery.ts:90` |
| **Pipeline de veille** (research → sheet → notification) | ✅ | `runVeillePipeline` — `packages/discovery/src/veille-pipeline.ts:107` |
| Invariant AD-16b : flag `uncertain` **jamais supprimé** | ✅ | `veille-pipeline.ts:144-145` ; testé `veille-pipeline.test.ts:64` |
| Handler `research` (`payload.discoverySheet === true` → pipeline) | ✅ | `buildDiscoveryResearchHandler` — `packages/discovery/src/jobs.ts:179` |
| Vault de veille (VAULT.md évolutif + manifest append-only) | ✅ | `appendRun`/`buildVaultMd`/`decideVerbe` — `packages/discovery/src/vault.ts:339,228,46` |
| Dédup « avec mémoire » (le run N+1 ne refait pas les recherches) | ✅ | `dedupeAgainstVault` — `vault.ts:157` ; `runVerdictFromDelta` `:202` |
| Lecture du vault par le chat-agent (READ-ONLY, AD-7) | ✅ | `vault-read.ts` + capacité `discovery.vault.read` (`capability.ts:827`) |
| **Hors v1** : insertion effective des `discovery_items` | ❌ | aucun writer serveur — `grep -n "discovery_items" fn-job-dispatcher/index.ts` → **aucun résultat** (DD-1) |
| **Hors v1** : appel vendor OneSignal | ❌ (par conception) | AD-1 : le module ne fait que **retourner** le payload (`veille-pipeline.ts:21-24`) |
| **Hors v1** : gaps (détection) — propriété contradictoire (DD-5) | ⚠️ détection seule | `detectGap` — `packages/discovery/src/gaps.ts:73` ; aucun writer réel |

**Vocabulaire fermé** : 5 classes d'item (`discovery.ts:48`) ; statut SQL
`new/investigating/resolved/stale` (`0006_discovery.sql:16`).

---

## §M2 Contrat de données

### Tables propriétaires (SSoT = migration, AD-15)

`supabase/migrations/0006_discovery.sql` + `0025_discovery_vault.sql` :

**`discovery_items`** (`0006:5-22`) :

| Colonne | Type | Note |
|---|---|---|
| `id` / `user_id` | `uuid` | `user_id NOT NULL` → `auth.users` — `0006:7` |
| `title` | `text NOT NULL` | `0006:8` |
| `question` | `text` | `0006:9` |
| `why_now` | `text` | `0006:10` |
| `factual_summary` | `text` | `0006:11` — **le nom diffère du SSoT** (voir DD-2) |
| `sources` | `jsonb` (OR-Set) | `0006:12` |
| `kind` | `text` CHECK 5 valeurs | `scientific/professional/innovation/trend/uncertain` — `0006:13-14` |
| `status` | `text` CHECK 4 valeurs | `new/investigating/resolved/stale` — `0006:15-16` |
| `crdt_*` / `local_mutation_id` | `jsonb` / `text` | `0006:17-19` |

**`discovery_vault`** (`0025:26-40`) : une ligne par `(user, domaine)` — `vault_md
text`, `vault_hash text` (SHA-256), `runs_manifest jsonb` (append-only),
`storage_prefix text`, `UNIQUE (user_id, domaine)` (`0025:40`).

**Autres tables Discovery** (`0006`) : `discovery_source_profiles` (`:24`),
`domain_timeline` (`:37`) — pas de builder dans `packages/discovery/src/`.

### RLS — héritée, pas ajoutée

`discovery_items`/`discovery_source_profiles`/`domain_timeline` sont dans la
boucle générique `0006:51-58` : `ENABLE` + **`FORCE`** ROW LEVEL SECURITY,
policy `<table>_user_isolation` (`user_id = auth.uid()`) + `<table>_service_role`
en `SELECT`. `discovery_vault` a ses 2 policies dédiées (`0025:62-72`), avec
justification service_role documentée (`0025:68-70`). Le module ne pose
**aucune** policy.

### Écriture — single-writer (AD-7 / F-03)

`buildDiscoveryItem` (`discovery.ts:90`) est la **seule** fabrique d'un
`DiscoveryItem` ; Discovery est le seul writer de `discovery_items`
(`discovery.ts:86-87`). Le vault est écrit **uniquement** par le handler
`research` (`jobs.ts:246-285`, commentaire `0025:47`). Le module **n'écrit
pas** `gaps` — il ne fait que **détecter** (`gaps.ts:73`) ; mais le propriétaire
de `gaps` est **contradictoire** (DD-5).

### Synchronisation

Le stream `discovery` (`powersync/sync-config.yaml:105-109`) expose
`discovery_items` et `discovery_vault` → lisibles **hors-ligne**. `gaps` est
exposée par le flux **progress** (`sync-config.yaml:89`), pas par Discovery
(F-03, commentaire `:92-97`). La vue relay est `v_discovery_scope`
(`0015_powersync_relay_views.sql:71-75`).

### ⚠ Drifts mesurés (documentés, **non corrigés**)

| # | Drift | Preuve |
|---|---|---|
| **DD-1** | **Rien n'insère les `discovery_items` produits.** `runVeillePipeline` retourne `discoveryItems` (`veille-pipeline.ts:79`) et le handler les met dans son `result` (`jobs.ts:298`), mais **aucun writer serveur** ne les insère : `grep -n "discovery_items" supabase/functions/fn-job-dispatcher/index.ts` → **aucun résultat**. Le `result` est persisté dans `job_queue.result` (`fn-job-dispatcher/index.ts:766`), pas dans la table métier. La fiche de veille n'existe donc jamais comme ligne `discovery_items`. |
| **DD-2** | **`summary` (SSoT) ≠ `factual_summary` (colonne).** `DiscoveryItem.summary` (`packages/domain/src/entities-discovery.ts:23`) est écrit par `buildDiscoveryItem` (`discovery.ts:111`) alors que la table porte `factual_summary` (`0006:11`, miroir `powersync-schema.ts:435`). Aucun mapping `summary → factual_summary` n'existe dans `packages/discovery/src/` (`grep -rn "factual_summary" packages/discovery/src/` → **aucun résultat**). |
| **DD-3** | **Vocabulaire `kind` divergent.** Le module produit `FACT/TREND/ANALYSIS/SCENARIO/UNCERTAINTY` (`discovery.ts:48`) mais le CHECK SQL n'accepte que `scientific/professional/innovation/trend/uncertain` (`0006:14`). Les valeurs `FACT`, `ANALYSIS`, `SCENARIO` **violent** la contrainte ; `TREND`/`UNCERTAINTY` ne matchent que par casse (`trend` vs `TREND`). |
| **DD-4** | **Champs `DiscoveryItem` sans colonne.** `recommendedActions`, `semanticNodeIds`, `relatedGoalIds`, `relatedCourseIds`, `relatedSkillIds`, `confirmsOrContradicts`, `domainRef`, `openQuestions` (`discovery.ts:112-125`) n'ont **aucune colonne** dans `0006` (vérifié : `grep -rn "recommended_actions\|semantic_node_ids" supabase/migrations/0006_discovery.sql` → **aucun résultat**). La fiche produite ne peut pas être persistée telle quelle. |
| **DD-5** | **Propriété de `gaps` contradictoire.** La migration `0005:87` dit « Rows owned by PROGRESS » et `sync-config.yaml:82` dit « owned par le module Progress » ; mais `OWNER_MODULE_BY_ENTITY` (`packages/data/src/commands.ts:205`) et `validate.ts:68` disent `'Discovery'`. Aucun writer réel. La présente spec suit le **commentaire** (Progress) ; le **routeur** dit Discovery — les deux SSoT se contredisent. |

Même famille que les drifts `tasks.tags` (corrigés par `0032`) : la valeur est
**produite en test** puis **perdue/rejetée** au déploiement. `discovery_items`
n'est pas dans `PAIRS` de `tests/db/domain-schema-drift.test.ts` — aucune garde
automatique.

> **Documentation, pas correction** (consigne) : DD-2/DD-3/DD-4 exigent une
> décision AD-15 (migration additive ou alignement du module) ;
> `supabase/migrations/*` et `packages/domain/src/**` sont **interdits** ici.

---

## §M3 Chemin agent

SSoT : `docs/agent/feature-agentability-matrix.md:20`.

| Champ | Valeur | Preuve |
|---|---|---|
| Capacité | `discovery.research` | matrix L20 |
| Énoncé type | « research X » | matrix L20 |
| Outil | `research` (job `research`, AD-8) | matrix L20 ; `packages/agent/src/tools.ts:131` |
| Scopes | `discovery:read` / `discovery:write` | matrix L20 |
| Confirmation | **non** | matrix L20 |
| Dégradation AD-1 | `uncertain`-marked results (01 §6) | matrix L20 ; `research-provider.ts:48` |
| Vérification | source typing + uncertainty (ADR §13.7) | matrix L20 |
| Reprise | job retry | matrix L20 |
| Niveau | **FULL** | matrix L20 |

**Capacité complémentaire** : `discovery.vault.read` (`capability.ts:827`, outil
`discovery_vault_read` `tools.ts:603`) — **READ-ONLY** (`writeScopes: []`,
`capability.ts:832`), sans confirmation, sans job. L'outil émet la commande typée
`discovery.vault_read` (`tools.ts:614`).

> **Écart constaté (documenté, non corrigé)** : l'outil `research` émet
> `jobKind: 'research'` (`tools.ts:145`) — le kind **est** routé par le
> dispatcher (`DISCOVERY_JOB_HANDLERS`, `jobs.ts:355`). Mais le résultat
> `discoveryItems` n'est **jamais persisté** (DD-1). Le chemin agent est donc
> **routé jusqu'au handler**, mais **non abouti** jusqu'à la table métier :
> `NOT_READY` pour la persistance de la fiche.

---

## §M4 Contrat de surface

SSoT : `docs/design-system/screens/_inventory.md:118-119`.

| Écran | Route | Statut spec |
|---|---|---|
| `discovery-feed` | `/discovery` | **GAP (OQ-41)** — `_inventory.md:118` |
| `discovery-sheet` | (sheet, ADR §13.8) | **ADDITIF / GAP (OQ-42)** — `_inventory.md:119` |

**Routes réelles** : `/discovery` est codée (`_inventory.md:219` liste 22 routes
codées). Le repo mobile lit `discovery_items` (`apps/mobile/src/lib/discovery-repo.ts`)
via le miroir local.

> **Écart constaté (documenté, non corrigé)** : les deux écrans sont **GAP**
> (OQ-41/OQ-42) — `docs/discovery/overview.md` est « claimé, NON détaillé »
> (`_inventory.md:118`). La surface n'est donc **pas ratifiée** au v1.

**Les 5 états UX** : non prouvés pour ce module (pas d'inventaire d'états trouvé
dans la page discovery).

---

## §M5 Offline

| Opération | Sans réseau | Preuve |
|---|---|---|
| Lire les fiches (`discovery_items`) | ✅ | stream `discovery` (`sync-config.yaml:108`) |
| Lire le vault (`discovery_vault`) | ✅ | stream `discovery` (`sync-config.yaml:109`) |
| Lire le vault par l'agent (READ-ONLY) | ✅ | `vault-read.ts:61` (`store: VaultStore`) |
| Qualifier des hits en items (pur) | ✅ | `runVeillePipeline` — `veille-pipeline.ts:107` (synchrone, pur ; testé `:115`) |
| Recherche multi-source réelle | ❌ **réseau + provider** | `ResearchProvider` (You.com/Tavily/Exa) — `research-provider.ts:33` dégrade si absent |
| Dédup / verdict du vault (purs) | ✅ | `dedupeAgainstVault`/`runVerdictFromDelta` (`vault.ts:157,202`) |
| Écrire le vault | ❌ **réseau + dispatcher** | `deps.vaultStore.write` (`jobs.ts:285`) |
| Push de fin de run (OneSignal) | ❌ **réseau + adapter** | payload seulement (`veille-pipeline.ts:149-156`) ; vendor dans `fn-notifications` |

**Classe offline** : `online-required (jobs) ; dégradation uncertain (01 §6)`
(`_inventory.md:118`).

> **Ne pas confondre** : la **lecture** des fiches et du vault est hors-ligne
> (miroir local) ; la **recherche** et l'**écriture** du vault ne le sont pas.

---

## §M6 Preuve

### Commandes (exécutées)

```sh
pnpm -F @aurora/discovery test        # tests du module — 48/48 vert
grep -n "discovery_items" supabase/functions/fn-job-dispatcher/index.ts   # → aucun résultat (DD-1)
grep -rn "factual_summary" packages/discovery/src/                        # → aucun résultat (DD-2)
grep -n "recommended_actions\|semantic_node_ids" supabase/migrations/0006_discovery.sql  # → aucun résultat (DD-4)
```

### Couverture actuelle (mesurée)

`pnpm -F @aurora/discovery test` → **48 tests, 48 pass, 0 fail** (exécuté).
Répartition : `discovery.test.ts` 8 · `jobs.test.ts` 10 · `vault.test.ts` 15 ·
`vault-read.test.ts` 5 · `veille-pipeline.test.ts` 7. Tests de ce module :

| Test | Ligne | Ce qu'il prouve |
|---|---|---|
| `G9: runVeillePipeline returns items + notification job payload (uncertain flag AD-16b)` | `veille-pipeline.test.ts:39` | items + payload de notification, flag AD-16b |
| `G9: AD-16b — un hit UNCERTAIN-source produit un item au suffixe (uncertain) + flag job true` | `veille-pipeline.test.ts:64` | invariant AD-16b (source incertaine) |
| `G9: hit OFF-domaine … = pas d'item ; dégradation AD-1 force le flag uncertain` | `veille-pipeline.test.ts:82` | filtre discipline + dégradation AD-1 |
| `G9: résultat vide = 0 item, flag uncertain true (dégradation AD-1, aucun provider)` | `veille-pipeline.test.ts:100` | résultat vide → `uncertain` |
| `G9: le pipeline est SYNCHRONE + PUR (pas de vendor, pas de job queue)` | `veille-pipeline.test.ts:115` | pureté (aucun vendor, AD-1) |
| `G9 (wave 3) : le handler research discovery porte discoverySheet=true → …` | `veille-pipeline.test.ts:132` | branchement dispatcher → pipeline |
| `G9 (wave 3) : le flag discoverySheet ABSENT → shape legacy` | `veille-pipeline.test.ts:177` | comportement par défaut (pas de pipeline) |
| `LOT 1: resolveUserContext + discoveryProfile.disciplines → the real filterCtx` | `jobs.test.ts:75` | contexte par utilisateur (G-D14) |
| `M-72 : le notificationJob du run research porte le topic du run dans le body` | `jobs.test.ts:228` | SSoT du body de push |
| `M-43 dedupeAgainstVault: only the delta survives` | `vault.test.ts` | mémoire du vault (dédup) |
| `M-43 scénario gelé (3/15) : le delta + le taux de doublons avec mémoire ≤ 20 %` | `vault.test.ts` | seuil de doublons gelé |

### Seuils

Référence : `docs/testing/matrix.md`. Le pipeline est **solidement** couvert
(48 tests exécutés, dont l'invariant AD-16b et des scénarios de doublons gelés).
Mais les drifts **DD-1 → DD-4** ne sont gardés par **aucun** test → `NOT_READY`
sur la persistance de la fiche. La **surface** (OQ-41/OQ-42 = GAP) n'est pas
prouvée → `NOT_READY`.

> **Note de statut doc** : `docs/discovery/overview.md` est « claimé, NON
> détaillé » (`_inventory.md:118`). Mesure : le pipeline et le vault **sont**
> implémentés et testés ; l'insertion métier et la surface manquent. Doc-lag
> partiel.

---

## §M7 Questions ouvertes

| # | Question | État |
|---|---|---|
| **DV-1** | Qui insère les `discovery_items` produits par `runVeillePipeline` (DD-1) — le dispatcher, un `VaultStore`-like port, ou un job dédié ? | **ouverte** — AD-7/AD-8 |
| **DV-2** | Aligner `summary` (SSoT) et `factual_summary` (colonne) (DD-2) ? | **ouverte** — AD-15 ; migration interdite ici |
| **DV-3** | Aligner le vocabulaire `kind` module ↔ CHECK SQL (DD-3) ? | **ouverte** — AD-15 |
| **DV-4** | Où persister les champs sans colonne (`recommendedActions`, `semanticNodeIds`, …) (DD-4) — jsonb, ou colonnes additives ? | **ouverte** — AD-15 |
| **DV-5** | `gaps` appartient-il à Progress (`0005:87`) ou à Discovery (`commands.ts:205`) ? Le commentaire du code et la table de routage se contredisent. | **ouverte** — AD-15 |
| **DV-6** | Les écrans `discovery-feed`/`discovery-sheet` sont-ils ratifiés (OQ-41/OQ-42 = GAP) ? | **ouverte** — `_inventory.md:118-119` |
| **DV-7** | Le kind `notification` (push fin de run) est-il routé par le dispatcher vers `fn-notifications` ? | **ouverte** — vérifier `INTEGRATIONS_JOB_HANDLERS` |
