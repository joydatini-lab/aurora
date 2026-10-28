# Aurora — réorientation : Design Space → chat agentique → le reste

> **Statut** : plan, à ratifier. **Aucun code** (AD-13).
> **Branche** : `ws-themes/tweakcn-gradients`. **Base mesurée** : `3b0b2d8`.
> **Nature** : décision. Il **inverse** la séquence ratifiée le 2026-09-30
> (`design-space-oq-rulings.md` OQ-11 + `implementation-index.md` §2) et remplace
> l'ordre des lots L5→L13.
> **Règle de lecture** : chaque affirmation porte une preuve (fichier, commande,
> commit). Une ligne sans preuve est signalée `À VÉRIFIER`.

---

## 0. Ce que l'owner demande, et ce que ça change

L'owner demande de réordonner la construction du MVP :

1. **Design Space au complet** — d'abord.
2. **Le chat agentique** — ensuite.
3. **Productivité, apprentissage, organisation** — seulement après.

C'est un **renversement**. La séquence actuellement ratifiée place le socle
d'abord et Design Space **en dernier** (`implementation-index.md` l.71-79) :

| Lot | Contenu | Dépend de |
|---|---|---|
| L5 | parcours vertical (capture→kernel→PowerSync→RLS→agent) | L4 |
| L6 | 5 écrans primaires | L5 |
| L7 | couverture P1 (42 modules `IMPLEMENTED`) | L6 |
| L8 | Desktop | L7 |
| **L9-L13** | **Design Space (13 écrans)** | **L7** |

Le renversement **n'est pas gratuit** : Design Space est déclaré dépendant de L7,
lui-même de L6, lui-même de L5. Ce plan établit ce qui, dans cette chaîne, est une
**vraie** contrainte et ce qui n'est qu'un **choix d'ordonnancement** — car les
deux se réordonnent différemment.

---

## 1. L'état vérifié (preuves, pas mémoire)

### 1.1 Ce qui existe déjà pour Design Space

| Brique | Emplacement | État |
|---|---|---|
| **Type `BrandDna`** (D2) | `packages/domain/src/entities-design.ts:117` | ✅ **FAIT** — 280 l., 9 interfaces |
| Tests Brand DNA | `packages/domain/test/brand-dna.test.ts` | ✅ 270 l. |
| `Artifact` / `ArtifactFile` | `packages/domain/src/entities-artifact.ts:10,50` | ✅ existent |
| Tables `artifacts`, `artifact_files` | `supabase/migrations/0007_artifact.sql` | ✅ existent |
| `CanvasSession` + table | `entities-canvas.ts:13`, `0022_canvas.sql:11` | ✅ existent |
| Jointure `canvas_sessions.artifact_id` | `0022_canvas.sql` | ✅ **existe** |
| Route `/design-space` | `apps/web-app/src/lib/navigation.ts:85` | ✅ existe, `readiness: 'shell'` |
| Les 13 specs d'écran | `verify/ws3-specs:docs/design-system/screens/` | ✅ écrites |
| Référence `LOGO.md` / `AFFICHE.md` | racine du dépôt | ✅ 680 + 369 l. |

**Conséquence** : D2 (Brand DNA) **est déjà fait**. La séquence OQ-11
(`D2 → D1 → D3 → …`) a donc son **premier jalon derrière nous**. Le travail neuf
commence à D1 (projet + brief).

### 1.2 Ce qui n'existe pas

| Brique | Constat | Preuve |
|---|---|---|
| Package `design-engines` | ❌ absent — **à créer dans le lot LOGO** | `ls packages/` ; OQ-8 |
| Moteur LOGO (SVG canonique) | ❌ absent | — |
| Moteur AFFICHE (validateur déterministe) | ❌ absent | — |
| Moteur Document (multipages) | ❌ absent | — |
| Adaptateur Fabric.js | ❌ absent, **pas dans les manifests** | `grep fabric */package.json` → 0 |
| Écrans Design Space | ❌ **0/13** | `ls apps/web-app/src/routes/` |
| Specs au cadre §15-§19 | ❌ **0/11** mesurées | `grep -c "^## §1[5-9] "` |
| Table neuve | ✅ **aucune n'est requise** | `design-space-integration.md` §5 |

### 1.3 Le blocage qui commande tout le reste

**Le CI est rouge, et c'est mon delta qui l'a cassé** (`40738293322`). Isolé par
expérience contrôlée ce soir :

| # | Expérience | Résultat |
|---|---|---|
| 1 | CI sur `rebaseline` (base) | `Build` **SUCCESS**, chunk **9 475 ko** |
| 2 | CI sur ma branche | `Build` **OOM**, chunk **15 835 ko** |
| 3 | Thèmes HEAD + `web-app/src` rebaseline | **build OK** (41 s) |
| 4 | + `web-app/src` HEAD | **OOM** |

**Cause** : `lib/data-session.ts` + `lib/capture.ts` importent `@aurora/data`
(PowerSync + wa-sqlite, glue WASM) dans le **bundle principal**. Le runner CI a
~4 Go de heap.

**Pourquoi ça commande le plan** : `Build` est le **9ᵉ step** de `ci-gate`. Quand
il tombe, **20+ gardes d'aval sont `SKIPPED`** — dont le harnais RLS live. Un gate
rouge en amont **annule silencieusement** toute preuve que les lots suivants
produiraient. **Aucun lot ne peut être « prouvé » tant que ce point n'est pas
réglé.**

**Et le renversement l'aggrave** : Design Space ajoute **Fabric.js + un moteur SVG
+ des éditeurs canvas** à un bundle **déjà** en OOM. Le risque **R4** du plan
(`implementation-index.md` l.219 : « bundle lourd, 9,04 Mo → point d'entrée
`@aurora/ui/icons` à faire en L6 ») devient **bloquant**, pas cosmétique.

---

## 2. La vérité des dépendances — ce qui bloque vraiment quoi

C'est le cœur de ce plan. La chaîne « L9 dépend de L7 dépend de L6 dépend de L5 »
**mélange deux natures de dépendance** :

| Nature | Exemple | Se réordonne ? |
|---|---|---|
| **Algorithmique** | le moteur LOGO : `spec → SVG canonique` | ❌ non — mais **ne dépend pas du socle** |
| **Persistance** | sauver un Brand DNA, versionner un `Artifact` | ⚠️ oui, mais exige le **substrat** |
| **Substrat** | `command → kernel → PowerSync → PG/RLS` (AD-7) | ❌ **non** — c'est L5 |

### 2.1 Les moteurs sont purs → ils peuvent démarrer **maintenant**

`design-space-integration.md` §5 : le travail neuf de Design Space est
« **algorithmique** (moteurs) et **d'interface** (studios), **pas de schéma** ».
Les moteurs sont des **fonctions déterministes** (`overview.md` l.73 :
« spec → validation → SVG ; content separated from engine »).

**Un moteur déterministe n'a besoin ni de PowerSync, ni de RLS, ni du kernel.**
Il se teste en `expect(logo(spec)).toEqual(svgCanonique)`. **C'est un travail qui
peut commencer aujourd'hui**, en TDD, sans débloquer le reste.

### 2.2 Mais « Design Space **au complet** » exige le substrat

Un studio qui **ne persiste pas** n'est pas « au complet ». Or
`design-space-integration.md` §3 impose que tout livrable atterrisse dans
`Artifact` **via un `ArtifactGeneratedEvent` émis au kernel** (AD-7). Ce chemin
est **exactement** ce que L5 prouve : `command → kernel → PowerSync → PG/RLS`.

**Donc** : « Design Space au complet » **inclut** le substrat L5. On ne peut pas
l'éviter — seulement le **réduire au minimum**.

### 2.3 La synthèse honnête

| Élément | Verdict |
|---|---|
| Moteurs (LOGO, AFFICHE, Document, validateur) | ✅ **réordonnables** — aucune dépendance au socle |
| Écrans Design Space (13) | ⚠️ réordonnables **si** le substrat existe |
| Substrat (L5 : command→kernel→RLS) | ❌ **non contournable** — c'est le socle |
| Les 44 écrans existants (L6/L7) | ✅ **déplaçables** après Design Space + chat |
| Desktop (L8) | ✅ déplaçable |

**Conclusion** : le renversement de l'owner est **faisable**, à une condition —
garder L5 **réduit à son substrat minimal** et le traiter comme un **prérequis
technique**, pas comme un « lot de fonctionnalités ». L'erreur serait de croire
qu'on peut faire Design Space *sans* lui.

---

## 3. La séquence proposée

Quatre phases. Chaque phase a un **critère de sortie mesurable**.

### Phase 0 — Débloquer (prérequis absolu, 1 lot)

| # | Tâche | Preuve attendue |
|---|---|---|
| 0.1 | Sortir `@aurora/data` du chemin critique de `web-app` (`import()` dynamique au montage de l'écran) | `Build` vert en CI, chunk < 9,5 Mo |
| 0.2 | Vérifier que les 20+ gardes d'aval **réexécutent** | `ci-gate` vert, **0 `SKIPPED`** |
| 0.3 | Consolider les branches de specs (`verify/ws3-specs` : 56/64 au cadre) | specs au cadre sur la branche de travail |

**Pourquoi en premier** : sans gate vert, **aucune** phase suivante n'est
prouvable. Et le correctif 0.1 est **aussi** la condition de faisabilité de
Design Space (Fabric.js + SVG dans un bundle sain).

> ⚠️ `NODE_OPTIONS=--max-old-space-size` **n'est pas** le correctif : il masque le
> symptôme et laisse le budget perf 02 S9.1 (300 Ko gz) violé **11×**.

### Phase 1 — Le substrat minimal (L5 réduit)

**Objectif** : prouver `command → kernel → PowerSync → PG/RLS` avec **une seule**
entité réelle. Pas de fonctionnalité produit.

| # | Tâche | Preuve attendue |
|---|---|---|
| 1.1 | Le harnais RLS est **déjà** 58/58 — le brancher sur le chemin réel | `rls-live-check.sh` OK en CI |
| 1.2 | **RLS positif** : user A lit ses propres lignes | test E2E **positif** (le critère L5 ouvert) |
| 1.3 | Une écriture réelle via le kernel sur **une** table Design Space (`canvas_sessions`) | capture persistée après reload |

**Critère de sortie** : le critère L5 officiel
(`implementation-index.md` l.71 : « 1 test E2E, RLS **positif** ») est rempli.

> Le RLS positif exige une **session utilisateur réelle**. Je ne fabrique pas ce
> credential — c'est un **blocage owner** (§5, D1).

### Phase 2 — Design Space **au complet** (L9-L13, réordonnés)

Ordre interne **déjà ratifié** (OQ-11), avec D2 derrière nous :

| Sous-lot | Contenu | Dépend de | Réordonnable ? |
|---|---|---|---|
| **D2** | Brand DNA | — | ✅ **déjà fait** |
| **D1** | `design-space`, `design-brief` | substrat (P1) | non |
| **D3** | moteur LOGO + `logo-studio`, `logo-variants` | D1 | moteurs ✅ / écrans non |
| **D4-D5** | `charte`, `affiche-studio` + Fabric.js | D3 | écrans non |
| **D6** | éditeur de calques | D5 | non |
| **D7-D9** | `design-validator`, `document-studio`, `design-exports` | D6 | validateur ✅ / écrans non |
| **D10** | `design-versions`, `brand-impact` | D9 | non |

**Stratégie recommandée** : **paralléliser** les **moteurs** (purs, testables) dès
maintenant, et **sérialiser** les **écrans** derrière le substrat. C'est le seul
moyen de tenir « Design Space d'abord » sans attendre le socle pour tout.

**Critère de sortie** : les 13 écrans existent, chacun avec sa spec au cadre
§15-§19, ses 6 états UX, et une preuve de persistance réelle via `Artifact`.

### Phase 3 — Le chat agentique (L6 `agent-chat` promu)

**Objectif** : le chat comme **surface de première classe**, pas comme 5ᵉ écran.

| # | Tâche | État actuel |
|---|---|---|
| 3.1 | L'écran `agent-chat` dans `web-app` | ❌ absent (`/agent` = `readiness: 'shell'`) |
| 3.2 | Le brancher sur `fn-agent-run` + `agent_runs` | ✅ le backend existe (3 fichiers EF) |
| 3.3 | Les 4 doc-tools (`docs/agent/document-tools.md`) | ⏸️ spec écrite, non câblée |
| 3.4 | Les renderers AD-10 dans les tool-calls | ✅ `packages/ui/src/renderers/` (5) |
| 3.5 | `AgentThinkingLoader` (48 px, OQ-6 ratifié) | ✅ implémenté |

**Critère de sortie** : envoyer un message → réponse streamée → persistée →
reload → l'historique est là.

### Phase 4 — Productivité, apprentissage, organisation (L7 + L8)

Les 42 modules `IMPLEMENTED` + les 44 écrans + Desktop. **Déplacés en dernier**,
conformément à la demande.

---

## 4. Ce que ça coûte, et les risques

| Risque | Nature | Mitigation |
|---|---|---|
| **R-a** Le renversement contredit OQ-11 (ratifié) | décision | ce plan **est** la demande de ratification ; OQ-11 §« Réversibilité » autorise le réordonnancement |
| **R-b** Fabric.js + SVG aggravent l'OOM | **technique, réel** | Phase 0 **obligatoire** avant tout écran Design Space |
| **R-c** « Design Space au complet » sans substrat = studios qui ne sauvent rien | **architectural** | Phase 1 non contournable (§2.2) |
| **R-d** 13 specs à écrire au cadre | volume | Phase 0.3 (consolider `verify/ws3-specs`) |
| **R-e** Le chat recule derrière 5 sous-lots Design Space | **produit** | paralléliser les moteurs (Phase 2) |
| **R-f** Le substrat devient un « lot fourre-tout » | dérive | Phase 1 = **une** entité, **un** chemin, pas de feature |

**Coût honnête** : le renversement **n'ajoute pas** de travail — il **change
l'ordre**. Mais il **déplace** le substrat (L5) d'un « lot parmi d'autres » à
« prérequis bloquant », ce qui le rend **plus visible** et donc **plus difficile à
reporter**.

---

## 5. Décisions qui appartiennent à l'owner

| # | Question | Pourquoi je ne tranche pas seul |
|---|---|---|
| **D1** | Fournir une **session utilisateur réelle** (ou un moyen d'en créer une) | le RLS positif exige un vrai `user_id` ; je ne fabrique pas de credential |
| **D2** | Ratifier l'**inversion** (ce plan) vs garder OQ-11 | c'est une décision produit, pas technique |
| **D3** | Le substrat minimal est-il acceptable comme « L5 » ? | il ne livre **aucune** feature visible |
| **D4** | Fabric.js (MIT, OQ-12) est-il confirmé pour D4-D5 ? | 1ʳᵉ dépendance lourde ; impacte le bundle |
| **D5** | « Chat agentique » = écran `agent-chat` seul, ou **aussi** les 4 doc-tools ? | change la taille de la Phase 3 |

---

## 6. Critères d'acceptation du plan

- [ ] Phase 0 : `ci-gate` vert, **0 `SKIPPED`**, chunk `web-app` < 9,5 Mo.
- [ ] Phase 1 : critère L5 officiel rempli (E2E + **RLS positif**).
- [ ] Phase 2 : 13 écrans Design Space, chacun persisté via `Artifact`.
- [ ] Phase 3 : chat streamé, persisté, rechargeable.
- [ ] Phase 4 : 42 modules `IMPLEMENTED` accessibles sur web.
- [ ] Aucune table neuve inventée (OQ-9 / `design-space-integration.md` §5).
- [ ] Chaque lot : 1 commit, gate vert, preuve `fichier:ligne`.

---

## 7. Ce que ce plan ne fait pas

- Il **ne réécrit pas** la séquence interne de Design Space (OQ-11 reste valide).
- Il **ne supprime pas** L6/L7 — il les **déplace**.
- Il **ne crée aucune table** : `design-space-integration.md` §5 conclut qu'aucune
  ligne des 6 capacités n'en demande une.
- Il **ne déclare pas** le Design Space faisable sans le substrat — c'est
  précisément ce qu'il refuse de faire.
