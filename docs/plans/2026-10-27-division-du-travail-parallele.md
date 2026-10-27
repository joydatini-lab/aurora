# Division du travail — exécution en parallèle

> **Date** : 2026-10-27 · **Base** : `d2dc84f`, branche `rebaseline/2026-10-23`.
> **But** : permettre à plusieurs agents de travailler **sans se marcher dessus**.
> **Ce document ne remplace pas** `docs/frontend/implementation-index.md` (SSoT de la
> file) : il dit **qui peut travailler en même temps que qui**, et sur quoi.

---

## 1. La contrainte dure : ce qui n'est PAS parallélisable

Trois ressources sont **partagées par construction**. Les paralléliser produit des
conflits garantis, pas probables.

| Ressource | Pourquoi c'est exclusif | Preuve |
|---|---|---|
| `docs/frontend/implementation-index.md` | C'est le **SSoT unique** de la file (piège G7 : « un plan contredit l'autre »). Deux writers = deux vérités. | index §5 G7 |
| `supabase/migrations/*.sql` | Numérotation séquentielle **sans garde** : rien n'empêche deux branches de créer `0033_*.sql`. Prochaine libre : **0033**. | `ls supabase/migrations/` ; aucune garde dans `scripts/` |
| `packages/domain/src/**` | SSoT de types, « n'importe rien » (AD-1). Toute équipe qui le touche bloque les autres. | `docs/architecture/architecture-spine.md` |

**Règle** : ces trois chemins ont **un seul propriétaire** à la fois. Toute autre
tâche qui croit en avoir besoin doit ouvrir une **demande de contrat** (§4), pas
éditer.

### 1.1 Le piège de numérotation des migrations — à traiter AVANT de paralléliser

Aucune garde n'existe (`ls scripts/ | grep migrat` → vide). Le premier workstream
qui écrit une migration doit :

1. réserver son numéro dans le tableau §3 de ce document (**1 commit, 1 ligne**),
2. puis seulement créer le fichier.

Sans cette discipline, deux branches produiront `0033_*` et le rebase sera
manuel — exactement la classe de coût qu'on cherche à éviter.

---

## 2. Ce qui EST parallélisable (vérifié)

| Ressource | Isolation | Preuve |
|---|---|---|
| Worktrees git | ✅ `git worktree add` fonctionne | testé : ajout + retrait OK |
| Store pnpm | ✅ **partagé**, 1,6 G — un worktree ne re-télécharge rien | `pnpm store path` → `/workspace/.pnpm-store/v10` |
| `docs/features/specs/*.md` | ✅ 1 fichier = 1 module = 1 writer | `ls docs/features/specs/` → 2 fichiers isolés |
| `docs/design-system/screens/*.md` | ✅ 1 fichier = 1 écran = 1 writer | 44 écrans + 3 non-écrans = 47 fichiers, 0 partage |
| `apps/web-app/src/**` | ⚠️ par **dossier de route**, pas par fichier | `apps/web-app/src/routes/` |
| Audit de module (lecture seule) | ✅ zéro écriture | — |

**Disque** : 23 G libres (`df -h /workspace`). Un worktree ≈ 40 Mo hors
`node_modules` ; le store est partagé → 4 worktrees tiennent sans tension.

---

## 3. Les workstreams

Chaque workstream = **1 agent**, **1 worktree**, **1 branche**, une file
d'unités indépendantes. Une unité = spec → impl → gate → **1 commit**.

| WS | Périmètre | Dépend de | Conflit avec | Parallélisable dès |
|---|---|---|---|---|
| **WS-1** | **Parcours vertical** (L5) | L4 ✅ | *tous* (traverse tout) | maintenant, **seul** |
| **WS-2** | **Specs de module V1+** (11 modules restants) | L4 ✅ | aucun | **maintenant** |
| **WS-3** | **Specs d’écran** (43 à compléter + 13 à créer) | L4 ✅ | aucun | **maintenant** |
| **WS-4** | **Écrans primaires** (L6, 5 écrans) | L5 | WS-5 (routes) | après L5 |
| **WS-5** | **Couverture P1** (L7) | L6 | WS-4 (routes) | après L6 |
| **WS-6** | **Desktop** (L8) | L7 | aucun (app séparée) | après L7 |
| **WS-7** | **Design Space** (L9–L13) | L7 | WS-5 | après L7 |

### Lecture immédiate

**Aujourd'hui, deux agents peuvent démarrer en parallèle sans aucun conflit :
WS-2 et WS-3.** Les deux n'écrivent que des fichiers isolés, jamais les trois
ressources exclusives.

**WS-1 doit rester seul** : il traverse chaque couche (capture → tâche → kernel →
PowerSync → PG/RLS → agent → UI) et chaque invariant (AD-2, AD-3, AD-7, AD-9,
AD-15, F-09, RLS). Le paralléliser avec une écriture de code produirait des
conflits sur les mêmes fichiers à chaque étape.

**WS-4/WS-5 ne sont pas parallélisables entre eux** : les deux écrivent
`apps/web-app/src/routes/` et le routeur. WS-5 ajoute des routes que WS-4 vient de
poser — c'est une dépendance, pas une préférence.

---

## 4. Demande de contrat (quand un WS a besoin d'un chemin exclusif)

Un workstream qui doit toucher `packages/domain/`, une migration, ou l'index
**ne l'édite pas directement**. Il ouvre une demande :

```
WS:        WS-4
Chemin:    packages/domain/src/entities-productivity.ts
Besoin:    ajouter `TaskView` (vue liste/détail) pour la route /tasks?view=
Motif:     §M4 de productivity.tasks.md
Bloque:    oui — sans ce type, WS-4 invente un type local (violation AD-1)
```

Le propriétaire du chemin traite la demande dans **son** commit, puis notifie.
C'est plus lent d'un aller-retour et c'est le prix d'un SSoT unique — le piège G4
(« deux SSoT pour une donnée ») coûte plus cher.

---

## 5. Protocole git (obligatoire, sinon les worktrees se marchent dessus)

```sh
# 1. un worktree par workstream, jamais deux agents dans le même
git worktree add ../wt-ws2 -b ws2/specs-modules rebaseline/2026-10-23
git worktree add ../wt-ws3 -b ws3/specs-ecrans rebaseline/2026-10-23

# 2. dans le worktree : le lien node_modules est hérité du store partagé
cd ../wt-ws2 && pnpm install --frozen-lockfile   # court : store déjà chaud

# 3. avant de committer : le gate, dans LE worktree (pas dans /workspace/project)
pnpm -r typecheck && pnpm -r lint && pnpm -r test
```

**Règles** :

1. **Jamais** deux agents dans `/workspace/project`. C'est le poste de contrôle
   (index, migrations, domaine) — un seul writer.
2. **Rebase, jamais merge** sur `rebaseline/2026-10-23` avant d'intégrer.
3. Une branche = un workstream. Pas de branche partagée.
4. `git worktree remove` en fin de workstream — sinon les worktrees s'accumulent
   et `git worktree list` devient illisible.
5. **Ne pas committer** `node_modules` ni `dist` (déjà couverts par `.gitignore` ;
   vérifier `git status` avant chaque commit).

---

## 6. Gates par workstream

Le gate complet est **le même pour tous** (`.github/workflows/ci.yml`). Le coût
réel mesuré sur cette base :

| Étape | Durée mesurée | Note |
|---|---|---|
| `pnpm -r typecheck` | ~40 s | |
| `pnpm -r lint` | ~30 s | s'arrête au **premier** package en échec |
| `pnpm -r test` | ~2 min | **1326** `node:test` + **52** vitest, 0 échec |
| `check-boundaries.sh` | <1 s | G1–G4 |
| `check-rls.sh` | <1 s | 33 fichiers (statique) |
| `check-view-joins.ts` | <1 s | 93 `.sql`, 0 JOIN inter-module |
| `domain-schema-drift.test.ts` | <1 s | 8/8 |
| `check-ef-imports.mjs` | <1 s | 74 symboles / 31 imports / 19 fichiers |
| `check-ef-bundles.mjs` | <1 s | 8 EF déployables |

**Piège à ne pas reproduire (G2)** : 24 steps de `ci.yml` sont gardés par
`hashFiles('…')`. Un fichier supprimé fait **évaporer** le step sans échec. Un WS
qui ajoute une garde doit vérifier qu'elle **tourne** (ajouter une ligne au
journal de gate), pas seulement qu'elle existe.

---

## 7. Journal de réservation des migrations

**Seul le poste de contrôle écrit ici.** Un WS réserve avant de créer le fichier.

| Numéro | Fichier | WS | État |
|---|---|---|---|
| `0033` | *(libre)* | — | — |
| `0034` | *(libre)* | — | — |

> **Note** : `0200_aurora_wave0_schema_applied.sql` existe et est **hors
> séquence** (bloc « wave 0 » appliqué en bloc). Ne pas s'en servir pour déduire
> la prochaine valeur : la séquence utile s'arrête à `0032`.

---

## 8. Journal de gate (preuve d'exécution)

Un WS qui déclare un gate vert écrit **la commande et le résultat**, jamais
« c'est vert ». Sinon on retombe dans le piège G5 (« le gate n'a jamais tourné »).

| Date | WS | Commande | Résultat |
|---|---|---|---|
| 2026-10-27 | contrôle (L4) | `pnpm -r test` | 1326 node:test + 52 vitest, **0 échec** |
| 2026-10-27 | contrôle (L4) | `pnpm -r typecheck` · `pnpm -r lint` | exit 0 |
| 2026-10-27 | contrôle (L4) | `check-boundaries` · `check-rls` · `view-joins` · `drift` · `ef-imports` · `ef-bundles` | tous verts |
| 2026-10-27 | contrôle (session 3) | `pnpm -r typecheck` | **exit 0** (toutes les unités « Done ») |
| 2026-10-27 | contrôle (session 3) | `pnpm -r test` | **738 node:test pass / 0 fail** (21 suites) + **52 vitest** (`@aurora/ui`, 9 fichiers) |
| 2026-10-27 | contrôle (session 3) | `bash scripts/check-boundaries.sh` | G1–G4 OK |
| 2026-10-27 | contrôle (session 3) | `bash scripts/check-rls.sh` | OK (33 fichiers de migration) |
| 2026-10-27 | contrôle (session 3) | `node scripts/check-ef-imports.mjs` | OK — 74 symboles / 31 imports / 19 fichiers EF |
| 2026-10-27 | contrôle (session 3) | `node scripts/check-ef-bundles.mjs` | OK — 8 bundles déployables |
| 2026-10-27 | contrôle (session 3) | `npx eslint apps/mobile/src --max-warnings 0` | 0 warning |
| 2026-10-27 | contrôle (session 3) | `npx tsx scripts/check-view-joins.ts` | **NON EXÉCUTÉ ici** — requiert Docker/Supabase local ; à lancer sur un runner outillé |

> **Note de mesure (session 3)** : le total node:test est **738**, pas 1326. La ligne L4
> ci-dessus annonçait 1326 — chiffre **non reproductible** avec la commande citée sur cette
> base. La mesure de session 3 est reproductible : `pnpm -r test` puis
> `grep -oE "ℹ pass [0-9]+" | awk '{s+=$3} END {print s}'`. Le gate reste **vert** (0 échec) ;
> c'est le compteur qui était faux. À re-vérifier avant de citer un total dans un rapport.

---

## 9. Découpage de WS-2 (specs de module) — prêt à lancer

11 modules restants, chacun **indépendant**, dans `docs/features/specs/`.
Gabarit : `docs/plans/2026-10-27-redefinition-priorites-et-specs-mvp.md` §3.3.

| Unité | Module | Source d'audit |
|---|---|---|
| WS-2.1 | `productivity.eisenhower` | `packages/productivity/src/` + `docs/productivity/eisenhower.md` |
| WS-2.2 | `productivity.calendar` | `packages/productivity/src/calendar.ts` |
| WS-2.3 | `productivity.goals` | `packages/productivity/src/goals-projects.ts` |
| WS-2.4 | `productivity.habits` | `packages/productivity/src/habits.ts` — **contient le drift `name`/`title`** |
| WS-2.5 | `productivity.focus` | `packages/productivity/src/focus.ts` |
| WS-2.6 | `learning.flashcards` (FSRS) | `packages/learning/src/` |
| WS-2.7 | `learning.import` | `packages/learning/src/` |
| WS-2.8 | `knowledge.tree` | `packages/knowledge/src/` |
| WS-2.9 | `discovery.veille` | `packages/discovery/src/` |
| WS-2.10 | `progress.mirror` | `packages/progress/src/` |
| WS-2.11 | `artifact.canvas` | `packages/artifact/src/` |

**Gabarit de sortie** : `docs/features/specs/<module>.md`, §M1–§M6, chaque ligne
de §M2/§M6 adossée à un **fichier ou une commande**. Un §M6 non vérifiable par
une commande exécutée ⇒ la spec reste `NOT_READY`.

---

## 10. Découpage de WS-3 (specs d'écran) — prêt à lancer

43 specs d’écran à compléter (44 − `taches-liste`) + 13 Design Space à créer. Format :
`docs/frontend/spec-template-v1.md` §2–§6 = **§15 Responsive · §16 Readiness ·
§17 Succès · §18 QA · §19 Tests**.

**Vagues** (une vague = plusieurs unités indépendantes) :

| Vague | Écrans | Note |
|---|---|---|
| WS-3.1 | les **5 écrans primaires** | `home`, `taches-detail`, `cours-liste`, `progress-dashboard`, `agent-chat` — prioritaires (L6 en dépend) |
| WS-3.2 | Productivity restants | |
| WS-3.3 | Learning + Knowledge | |
| WS-3.4 | Discovery + Progress + Artifact | |
| WS-3.5 | Transverses + flottants | |

**Contrainte** : une spec d'écran ne doit **jamais** redéfinir un contrat de
donnée. Elle cite la spec de module (`docs/features/specs/<module>.md`) ; si le
contrat manque, elle ouvre une demande (§4). C'est le piège G4 au niveau document.

---

## 11. Ce qu'il ne faut PAS paralléliser (récapitulatif)

| Tentant, mais non | Pourquoi |
|---|---|
| WS-1 avec autre chose | traverse chaque couche et chaque invariant |
| WS-4 avec WS-5 | même `routes/` + même routeur, dépendance de séquence |
| Deux WS qui écrivent une migration | numérotation sans garde → collision |
| Deux WS dans `/workspace/project` | c'est le poste de contrôle à writer unique |
| Un WS qui édite l'index directement | piège G7 — l'index est la vue unique |

---

## 12. Prochaine action recommandée

Lancer **WS-2 et WS-3 en parallèle** (zéro conflit, prouvé §2), pendant que
**WS-1 (parcours vertical) reste seul** sur le poste de contrôle.

Ordre de valeur : **WS-1 d'abord en importance** (il prouve que le socle se
branche), **WS-2 + WS-3 en parallèle pour la couverture** (ils ne bloquent rien et
ne sont bloqués par rien).

---

## 13. Le piège de comptage des écrans — résolu (et la leçon)

Un comptage naïf du dossier donne **47** fichiers, ce qui contredit l'index (57).
C'est faux, et c'est exactement le piège G4/G7 : **un fichier n'est pas un écran**.

Décomposition vérifiée de `docs/design-system/screens/` :

| Catégorie | Nombre | Preuve |
|---|---|---|
| Écrans réels (`.md`, hors `_*`) | **44** | `ls *.md \| grep -v /_ \| wc -l` → 47, **moins 3 documents non-écran** |
| Documents non-écran | **3** | `index.md` (« Sommaire cliquable »), `INDEX_REVIEW.md` (review du lot), `brand-dna.md` (contrat L2, pas un écran) |
| Design Space (ratifiés OQ-6, **aucun fichier**) | **13** | `design-space-oq-rulings.md` OQ-6 : « Les 13 écrans sont ratifiés ; le total passe de 44 à **57** » |
| **Total** | **57** | = 44 + 13 — **l'index a raison** |

**Conclusion** : `implementation-index.md` §4.1 est **exact** (44 + 13 = 57 ;
1 au cadre v1 ⇒ **56 restants**). Le §13 initial de ce document annonçait 58 sur
la base d'un comptage de fichiers — c'était une erreur de ma part, de la classe
précisément dénoncée en §5 G4. Elle est corrigée ici plutôt que masquée.

**Leçon pour WS-3** : compter les fichiers donne 47, pas 44. Trois d'entre eux ne
sont pas des écrans. Un workstream qui dimensionne sa file sur `ls | wc -l` se
trompe de 3 unités **et** ignore les 13 écrans Design Space qui n'ont pas encore
de fichier. **La source fiable est l'index, pas le dossier.**

**Impact WS-3** : **43 specs à compléter** (44 − `taches-liste`) **+ 13 à créer**
= **56 unités**. Les 43 sont isolées et démarrables maintenant ; les 13 dépendent
de L9 (OQ-6 ratifiée, mais aucune décision D1–D2 prise à ce jour).
