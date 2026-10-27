# Aurora — plan de redéfinition des priorités, des specs MVP et de la suite

> **Statut** : plan, à ratifier. **Aucun code** (AD-13).
> **Branche** : `rebaseline/2026-10-23`. **Base mesurée** : `510b47e`.
> **Nature** : décision. Il remplace la navigation entre 5 documents de
> planification (`docs/frontend/implementation-index.md` §0).
> **Règle de lecture** : chaque affirmation porte une preuve (fichier, commande,
> commit). Une ligne sans preuve est signalée `À VÉRIFIER`.

---

## 0. Pourquoi ce document, et ce qu'il tranche

L'owner a demandé trois choses : (1) **redéfinir les priorités**, (2) **écrire des
specs MVP par module**, (3) une phrase a été coupée. Le point (3) doit être
précisé avant d'engager du travail — il est traité en §7.

Le problème n'est pas le manque de planification : le dépôt en porte **cinq**
(`repriorisation`, `redefinition-priorites`, `plan-directeur-v1`,
`decisions-d1-d5`, `phase0-rebaseline`, **1 368 lignes** au total) dont deux se
contredisaient sur le périmètre v1. `docs/frontend/implementation-index.md` a
déjà tranché cette contradiction. Le problème est **le volume de travail
spécifié contre le travail prouvé** :

| Mesure | Valeur | Preuve |
|---|---|---|
| Écrans au périmètre | **57** (44 existants + 13 Design Space) | `implementation-index.md` §4 |
| Écrans avec spec au cadre v1 (§15–§19) | **2** (`taches-liste`, `brand-dna`) | `grep -cE "^## §1[5-9]"` sur `docs/design-system/screens/*.md` |
| Lots ouverts | **L4 → L9** (6 lots) | `implementation-index.md` §3 |
| Packages `IMPLEMENTED` | **14 / 19** | `status-register.md` §1 |
| Apps réelles | **1** (`apps/mobile`) + **1** neuve (`apps/web-app`, L3) | `status-register.md` §2, commit `b92c722` |

**Ce que ce plan tranche** : la v1 ne peut pas être « 57 écrans ». Elle doit être
**un chemin vertical prouvé** — de la coquille à la donnée réelle — puis
s'élargir. Le reste est séquencé, pas supprimé.

---

## 1. État réel vérifié (au 2026-10-27, base `510b47e`)

### 1.1 Ce qui est prouvé vert

| Élément | Preuve |
|---|---|
| Gate complet local | `pnpm -r typecheck` 0 · `pnpm -r test` 0 (**1 324** `node:test` + **52** vitest) · `pnpm -r lint` 0 · boundaries G1–G4 · `check-rls.sh` (33 fichiers) · `check-view-joins.ts` (93 `.sql`) |
| Gate CI réel | `ci-gate` **vert** — run `40375929249`, `workflow_dispatch` sur `rebaseline/2026-10-23` |
| Coquille web | `apps/web-app` : 17 tests, 3 paliers vérifiés en live, `build` vert (`b92c722`) |
| Design system | `resolveThemeCSSVars` corrigé ; 4 gardes de nommage (`b92c722`) |
| Base live + RLS | `scripts/rls-live-check.sh` : 28 migrations appliquées, 58 tables, 0 pénétration (`status-register.md` §6 C3) |

### 1.2 Ce qui est spécifié mais non prouvé

| Élément | Statut | Preuve |
|---|---|---|
| Design Space Pro (famille L) | `PLANNED` docs / `MISSING` code | `status-register.md` §6 C1 |
| Knowledge (arbre, retrieval, OCR) | `PARTIAL`, **aucun package dédié** | `status-register.md` §5 |
| `scientific.*`, `artifact.*` | `PARTIAL` | idem |
| 3 packages `engineering-*` | `SCAFFOLDED` (`export {}`) | idem §1 |
| `apps/desktop` | `SCAFFOLDED` (spike, pas d'UI, pas de test) | idem §2 |
| 55 écrans sans cadre v1 | `NOT_READY` | `implementation-index.md` §4 |

### 1.3 Deux faits qui commandent l'ordre

- **F2 — le chemin de jobs.** `fn-job-dispatcher` importait 2 symboles
  inexistants ; corrigé par T1 (`4eae07c`, migration `0028`). **Motif de
  l'ordre** : on ne bâtit pas une 4ᵉ surface sur un socle asynchrone qui vient
  d'être réparé (`implementation-index.md` §1).
- **F3 — la coquille.** `apps/web-app` n'existait pas ; **créée** en L3
  (`b92c722`). C'était le chemin critique des deux options de périmètre.

---

## 2. Redéfinition des priorités — la décision

### 2.1 Le critère

Une priorité se justifie par **ce qu'elle débloque**, pas par ce qu'elle
promet. Trois niveaux :

| Niveau | Sens | Critère d'entrée |
|---|---|---|
| **P0 — chemin vertical** | rendre un parcours utilisable de bout en bout sur la coquille web, avec la donnée réelle | il traverse coquille → domaine → base → RLS |
| **P1 — couverture du socle** | rendre accessibles sur web les modules **déjà `IMPLEMENTED`** | le module existe et est testé |
| **P2 — construction neuve** | Design Space Pro et les modules `PARTIAL`/`MISSING` | le socle P0/P1 est prouvé |

**Ce qui change par rapport à l'état actuel** : `plan-directeur-v1` place
Design Space Pro **dans** le premier périmètre. Ce plan le place en **P2**.
Motif : Design Space dépend de 7 écrans d'éditeur et d'un package
`design-engines` **inexistant** ; le socle, lui, est `IMPLEMENTED` à 14/19. On
branche d'abord ce qui existe.

### 2.2 L'arbitrage à faire acter

| # | Question | Recommandation | Alternative |
|---|---|---|---|
| **A1** | Périmètre de la v1 web | **Le chemin vertical** : 1 parcours complet (capture → tâche → agent) prouvé de bout en bout, puis élargissement | Périmètre 57 écrans (`plan-directeur-v1`) — coût : 55 specs + 6 lots avant la première preuve |
| **A2** | Ordre socle / Design Space | **Socle d'abord** (P1), Design Space en P2 | Parallèle — coût : 2ᵉ moteur d'édition avant le 1ᵉʳ parcours |
| **A3** | Écran pilote de la vague 1 | **`taches-liste`** (déjà au cadre v1 : la seule spec réutilisable telle quelle) | `home` — coût : sa spec n'a pas §15–§19 |
| **A4** | Sort des 3 packages `engineering-*` | **Déclarer la dette** dans `status-register.md` et **ne pas les remplir** avant P2 | Les remplir — coût : 3 packages sans écran ni contrat |
| **A5** | `apps/mobile` | **Geler** (Phase 4, `adr-018` D-018.1) : correctifs seulement | Continuer à y livrer — coût : travail dans la coquille qu'on démonte |

---

## 3. Specs MVP par module — le livrable demandé

### 3.1 Le problème de forme

Le cadre v1 (`spec-template-v1.md` §15–§19) est **par écran**, pas par module.
Il est bon et déjà appliqué une fois (`taches-liste.md`). Mais « une spec par
module » demande une **deuxième forme** : un contrat qui dit, pour un module,
ce qui est disponible, sous quelles conditions, et comment on le prouve.

**Proposition** : ne pas inventer un second cadre. Étendre le premier.

### 3.2 Les deux artefacts de spec

| Artefact | Portée | Forme | Existe ? |
|---|---|---|---|
| **Spec d'écran** | 1 écran | 14 sections + §15–§19 (`spec-template-v1.md`) | ✅ cadre + 2 instances |
| **Spec de module MVP** | 1 module (ex. `productivity.tasks`) | **6 sections** (§M1–§M6, ci-dessous) | ❌ à créer |

### 3.3 Le gabarit de spec de module (§M1–§M6)

Chaque section renvoie à un SSoT existant — aucune n'invente de schéma.

| § | Contenu | SSoT qui fait autorité |
|---|---|---|
| **§M1 Capacités retenues en v1** | les sous-features livrées, et celles explicitement hors v1 | `docs/features/master-feature-catalog.md` (38 modules) |
| **§M2 Contrat de données** | tables, colonnes, RLS ; la propriété du module | `supabase/migrations/` + `packages/domain` |
| **§M3 Chemin agent** | capacités exposées, confirmation requise ou non, dégradation AD-1 | `docs/agent/feature-agentability-matrix.md` |
| **§M4 Contrat de surface** | écrans, routes, états (chargement/vide/erreur/hors-ligne) | `module-ownership-matrix.md` + `_inventory.md` |
| **§M5 Offline** | classe offline, ce qui marche sans réseau, ce qui exige le réseau | `master-feature-catalog.md` (colonne offline) |
| **§M6 Preuve** | commandes de test, seuils, critères de « fait » | `docs/testing/matrix.md` |

### 3.4 Le plan de rédaction — par priorité, pas par module

Écrire 38 specs d'un coup reproduirait l'erreur du plan-directeur (volume avant
preuve). On écrit **les specs des modules du chemin vertical**, puis on élargit.

| Vague | Modules | Nombre | Justification |
|---|---|---|---|
| **V0** | `productivity.tasks` + `agent.kernel` | **2** | ce sont les deux modules du parcours vertical §5 |
| **V1** | les 5 écrans des onglets primaires | **5 specs d'écran** | les points d'entrée (`spec-template-v1.md` §7) |
| **V2** | Productivity restant (10 modules) | 10 | tous `IMPLEMENTED` |
| **V3** | Learning + Knowledge (8 modules) | 8 | Learning `IMPLEMENTED`, Knowledge `PARTIAL` |
| **V4** | Discovery + Progress + Artifact (9 modules) | 9 | `IMPLEMENTED`/`PARTIAL` |
| **V5** | Design Space Pro (13 écrans) | 13 | neuf, sans dette de rétrofit |
| **V6** | Transverses (identité, intégrations, design system) | 5 | — |

**Porte de sortie de chaque vague** : la spec existe, porte ses 6 sections, et
chaque affirmation de §M2/§M6 est vérifiée par une commande exécutée. Une spec
dont §M6 n'est pas vérifiable reste `NOT_READY`.

---

## 4. La file de travail révisée

La file existante (`implementation-index.md` §3) reste valide en L0–L3. Elle
change à partir de L4 : on insère les **specs de module** avant les écrans.

| # | Lot | Livrable | Porte de sortie | Dépend de |
|---|---|---|---|---|
| **L0–L2b** | ✅ **faits** | gate, référentiel, Brand DNA, garde de dérive | — | — |
| **L3** | ✅ **fait** (`b92c722`) | coquille `apps/web-app` + correctif `resolveThemeCSSVars` | 21 tests, live 3 paliers | — |
| **L4** | **Specs de module V0** | `productivity.tasks` + `agent.kernel` au gabarit §M1–§M6 | 6 sections × 2, §M6 exécuté | L3 |
| **L5** | **Parcours vertical** | capture → tâche persistée → agent → preuve visible, données réelles | 1 test E2E, RLS positif | L4 |
| **L6** | **5 écrans primaires** | `home`, `taches-liste`, `cours-liste`, `progress-dashboard`, `agent-chat` | §15–§19 par écran | L5 |
| **L7** | **Couverture P1** | modules `IMPLEMENTED` accessibles sur web | 1 spec de module par module | L6 |
| **L8** | **Desktop** | Electron enveloppe `web-app` (pas un 3ᵉ front) | packaging + sécurité | L7 |
| **L9** | **Design Space Pro** | P2 : projet, brief, logo, charte, validateur | porte de sortie §10.4 | L7 |

**Changement de fond** : `plan-directeur-v1` avait L5 = Design Space. Ici
**L5 = le parcours vertical prouvé**, et Design Space passe en **L9**. Motif :
`status-register.md` §6 C1 constate « aucun package, aucune table, aucune route,
aucun écran » — c'est le plus gros chantier, il vient après la preuve que le
socle se branche.

---

## 5. Le parcours vertical (L5) — ce qu'il prouve

C'est **le** livrable qui distingue ce plan des précédents. Un seul parcours,
traversant toutes les couches, avec une preuve à chaque étape :

```
coquille web (L3)
  → écran de capture
    → commande typée du kernel (AD-7, single-writer)
      → module propriétaire (productivity.tasks)
        → écriture locale (PowerSync, AD-2)
          → synchro → Postgres (RLS FORCE, user_id)
            → capacités agent (fn-agent-run → job → kernel)
              → état relu par la coquille (poll, F-09/AD-3)
                → preuve visible dans l'UI
```

**Pourquoi ce parcours** : il traverse **chaque invariant** du dépôt (AD-2,
AD-3, AD-7, AD-9, AD-15, F-09, RLS) et chaque couche réelle. Si une seule couche
est fausse, il échoue — c'est ce qu'on veut. Il réutilise `taches-liste`
(la seule spec au cadre v1) et `agent.kernel` (le module agent déjà
`IMPLEMENTED`).

**Critères de succès** (à valider, pas à supposer) :
1. une tâche créée dans la coquille est relue après redémarrage (persistance locale) ;
2. la même tâche apparaît en base après synchro (round-trip réel) ;
3. `user A` ne lit pas la tâche de `user B` (RLS **positif**, pas seulement statique) ;
4. une demande à l'agent revient avec un état relu par la coquille (chemin complet) ;
5. les 5 états UX (chargement/vide/erreur/hors-ligne/partiel) sont exercés.

---

## 6. Risques (mesurés, avec mitigation)

| # | Risque | Preuve du risque | Mitigation |
|---|---|---|---|
| **R1** | **Le volume l'emporte sur la preuve** | 55 écrans sans cadre v1 ; 6 lots ouverts | §2.1 : le chemin vertical est la porte d'entrée |
| **R2** | **La contradiction des plans renaît** | 5 documents, 2 contradictoires | `implementation-index.md` reste **la** vue unique ; ce plan s'y ajoute, ne le remplace pas |
| **R3** | **La coquille n'a pas de repli de thème** | `apps/web-app` n'a pas l'équivalent de `styles/tokens.css` (constat L3) | à traiter en L5, avant tout rendu pré-hydratation |
| **R4** | **Le bundle est lourd** | 9,04 Mo pour `apps/web-app/dist` (import du barrel `@aurora/ui`) | point d'entrée `@aurora/ui/icons` — à faire en L6 |
| **R5** | **Deux versions de Tailwind** | `packages/ui` déclare v4 (`@tailwindcss/postcss`), `apps/web-app` v3 | déjà documenté (`postcss.config.cjs`) ; toute app web suit la forme v3 d'`apps/mobile` |
| **R6** | **Knowledge n'a pas de propriétaire unique** | `status-register.md` §5 : « propriété répartie sur `agent`/`data`/`workflows` » | à trancher (AD-15) **avant** de spécifier la vague V3 |
| **R7** | **La dette `engineering-*` masque du travail** | 3 packages `export {}`, 0 test, invisibles au gate | déclarer dans `status-register.md` (A4) |

---

## 7. Les trois points de l'owner, traités

1. **« Redéfinir nos priorités »** → §2. Décision : **P0 chemin vertical** d'abord,
   puis P1 (socle), puis P2 (Design Space). 5 arbitrages A1–A5 à acter.
2. **« Créer des specs MVP par feature/module »** → §3. Livrable : un gabarit
   **§M1–§M6** (6 sections, chacune adossée à un SSoT existant) + un plan de
   rédaction par vagues, en commençant par **2 modules** (V0), pas 38.
3. **« Une phrase a été coupée »** → **à préciser**. Le message s'arrête à
   « pour ça on va redéfinir nos priorités et ce qu'on veut réellement
   construire afin d'éviter de se perdre ». L'intention est claire ; ce qui
   manque est peut-être :
   - (a) une **contrainte** (délai, périmètre maximal, budget) ;
   - (b) un **doute précis** (un module, un écran, une techno) ;
   - (c) une **décision** attendue de moi.

   **Ce plan est écrit pour être ratifiable sans le point (3)** : les arbitrages
   A1–A5 sont posés en choix binaires, donc une réponse courte suffit.

---

## 8. Ce que je propose de faire maintenant

**Si tu valides §2 (A1–A5)** — je commence par **L4** : écrire les 2 specs de
module V0 (`productivity.tasks`, `agent.kernel`) au gabarit §M1–§M6, chacune
avec sa §M6 vérifiée par une commande exécutée. Livrable : 1 commit, 2 fichiers
sous `docs/features/specs/`, la porte verte.

**Si tu préfères une autre entrée** — le plan est ordonné pour que L4→L9
s'enchaînent ; changer l'entrée ne casse pas la file.

**Ce que je ne ferai pas sans accord** : toucher à Design Space (P2), remplir
les packages `engineering-*`, ni élargir le périmètre au-delà de la vague
courante.
