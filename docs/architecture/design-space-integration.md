# Intégration de Design Space Pro dans l'architecture existante (Phase 0, §10.2 item 11)

> **Ref :** `Aurora-Reference-Produit-Fonctionnelle-v1.1.md` §6 (spécification),
> §7.2 (réemploi des entités), §8.7.2 (topologie) · `docs/frontend/design-space-scope.md`
> (cadrage) · `docs/architecture/status-register.md` (écart **C1**) ·
> `docs/architecture/navigation-mapping.md` (section cible **C**) ·
> `docs/adr/canvas-markdown-ssot.md` (AD-16b).
> **Créé :** 2026-10-24 · **Nature :** conception. **Aucun code** (AD-13).
> **Objet :** répondre à la question de l'item 11 — **comment** Design Space Pro
> s'insère dans les invariants Aurora, **sans** créer de seconde source de vérité.

---

## 1. La question, et pourquoi elle n'est pas rhétorique

Le registre de statut classe Design Space Pro `MISSING` (écart **C1**) : ~13 écrans
neufs, 0 package, 0 table, 0 route. La tentation est d'ouvrir un package
`design-engines` et une famille de tables `design_*`.

**La référence l'interdit explicitement** (§7.2) :

> « **À ne pas faire avant audit** : créer immédiatement une nouvelle entité racine
> ou un nouveau package sans examiner les concepts existants. »

Cet audit a été fait (`design-space-scope.md` §4). Ce document en tire les
**conséquences d'intégration**, avec les invariants comme contrainte dure.

---

## 2. Ce qui existe déjà et doit être réutilisé (preuves)

| Brique | Emplacement | Preuve |
|---|---|---|
| `Artifact` (livrable versionnable) | `packages/domain/src/entities-artifact.ts:10` | `export interface Artifact` |
| `ArtifactFile` | `entities-artifact.ts:50` | `export interface ArtifactFile` |
| Table `artifacts` + `artifact_files` | `supabase/migrations/0007_artifact.sql` | propriétaire = module **Artifact** |
| `CanvasSession` (édition) | `packages/domain/src/entities-canvas.ts:13` | `export interface CanvasSession` |
| Table `canvas_sessions` | `supabase/migrations/0022_canvas.sql:11` | `blocks jsonb`, **`artifact_id uuid REFERENCES artifacts(id)`** |
| `canvas_sessions.locked` (gel) | `supabase/migrations/0023_canvas_locked.sql:19` | `ADD COLUMN locked BOOLEAN` |
| `fn-canvas` (EF) | `supabase/functions/fn-canvas/index.ts` | 1 EF |
| ADR SSoT Markdown du canvas | `docs/adr/canvas-markdown-ssot.md` | AD-16b, `marked` 15.0.12 |

> **Le fait décisif :** `canvas_sessions.artifact_id` **relie déjà** une session
> d'édition à un `Artifact`. La référence §7.2 demande exactement cette relation
> (« un logo, une affiche ou un document **est un `Artifact`** »). **La jointure
> existe ; elle n'est pas à inventer.**

---

## 3. Décision d'intégration : Design Space est un **producteur** d'`Artifact`

```
        ┌─────────────────────────────────────────────────────┐
        │  Design Space Pro (nouveau : moteurs + studios UI)  │
        │  LOGO · AFFICHE · Document · Brand DNA              │
        └───────────────┬─────────────────────────────────────┘
                        │ produit / édite  (jamais propriétaire)
                        ▼
        ┌─────────────────────────────────────────────────────┐
        │  Artifact  (PROPRIÉTAIRE existant, AD-7)            │
        │  artifacts · artifact_files · versions              │
        └───────────────┬─────────────────────────────────────┘
                        │ édité par
                        ▼
        ┌─────────────────────────────────────────────────────┐
        │  Canvas  (session d'édition, existant)              │
        │  canvas_sessions.artifact_id ──┐                    │
        │  canvas_sessions.blocks (jsonb)│  AD-16b (Markdown) │
        └────────────────────────────────┴────────────────────┘
```

**Règle unique :** *Design Space ne possède aucune table de livrable.* Il possède
des **moteurs déterministes** (LOGO/AFFICHE/Document) et des **écrans** ; tout
livrable atterrit dans `Artifact`, toute session d'édition dans `Canvas`.

**Conséquence sur AD-6 (un propriétaire par donnée) :** Artifact reste seul
propriétaire de `artifacts`/`artifact_files`. Design Space n'écrit **jamais**
directement ces tables : il **émet** un `ArtifactGeneratedEvent`
(`packages/domain/src/events.ts:125`) et le module Artifact applique (AD-7).

---

## 4. Ce que la décision évite (et pourquoi c'était le risque)

| Risque si on n'avait pas audité | Ce que la décision garantit |
|---|---|
| Une 2ᵉ table « livrables Design » à côté d'`artifacts` | Une seule table de livrable (AD-6) |
| Un 2ᵉ système d'édition à côté de `canvas_sessions` | Une seule session d'édition, `artifact_id` déjà là |
| Deux formats de source de vérité (JSON d'un côté, Markdown de l'autre) | AD-16b : **Markdown est le SSoT** de la sérialisation |
| Un package de plus sans consommateur | Le package de moteurs n'est créé **qu'à** l'entrée en implémentation du 1ᵉʳ moteur (OQ-8) |

---

## 5. Les 6 capacités §6.1 → où elles atterrissent

| # | Capacité (§6.1) | Propriétaire de données | Support | Nature du travail neuf |
|---|---|---|---|---|
| 1 | Identité / Brand DNA (§6.2) | `Artifact` (variante `kind`) **ou** `Project` | `blocks`/`ArtifactFile` | **OQ-7** : entité dédiée ou `Artifact` typé ? |
| 2 | Logos vectoriels (§6.4) | `Artifact` (`artifact_files` = SVG) | Canvas (édition) | **moteur** LOGO neuf |
| 3 | Chartes / guides (§6.5–6.6) | `Artifact` | Canvas + export | moteur Document neuf |
| 4 | Affiches (§6.5) | `Artifact` | Canvas (`blocks` = JSON de calques) | **moteur** AFFICHE neuf |
| 5 | Documents multipages (§6.6) | `Artifact` | Canvas + pagination | moteur Document neuf |
| 6 | Validation / versions / export (§6.7–6.9) | `Artifact` (versions) | — | **validateur déterministe** neuf |

**Aucune ligne de ce tableau ne demande une table neuve.** Le travail neuf est
**algorithmique** (moteurs) et **d'interface** (studios), pas de **schéma**.

---

## 6. Topologie : ce qu'on crée, ce qu'on ne crée pas

| Package proposé (§8.7.2) | Décision | Raison (preuve) |
|---|---|---|
| `packages/contracts` | ❌ **ne pas créer** | les schémas Zod sont par module ; unifier est un refactor **sans rapport** avec Design Space |
| `packages/design-system` | ❌ **ne pas créer** | les tokens vivent dans `packages/ui` (AD-17) |
| `packages/modules` | ❌ **ne pas créer** | 19 packages jouent déjà ce rôle (§8.7.2 autorise l'équivalence) |
| `packages/design-engines` | ⏸️ **créer plus tard**, **pas maintenant** | la référence §8.7.2 dit « proposition de responsabilités, pas obligation ». Créer un package vide est un `SCAFFOLDED` de plus (écart C2). |

**Déclencheur de création** (pour ne pas répéter l'erreur des 3 stubs
`engineering-*`, aujourd'hui `export {}`) : le package de moteurs est créé **dans
le même lot** que le premier moteur réel (LOGO), **jamais avant**.

---

## 7. Contraintes d'invariants (le test de conformité)

| Invariant | Comment Design Space le respecte |
|---|---|
| **AD-2** (frontières de modules) | Les moteurs sont purs, sans import croisé de modules ; l'UI consomme, elle ne calcule pas |
| **AD-3** (zéro clé sur le device) | Les moteurs sont **locaux et déterministes** — aucune clé, aucun appel réseau requis pour composer/valider |
| **AD-6** (un propriétaire) | Artifact seul propriétaire des livrables ; Canvas seul des sessions |
| **AD-7** (single-writer) | Design Space **émet** des événements ; il n'écrit pas les tables d'autrui |
| **AD-8** (jobs idempotents) | Les exports lourds (PDF/PPTX) passent par `job_queue` avec `idempotency_key` |
| **AD-13** (design ≠ code) | Ce document est une **conception** ; le code vient au lot suivant |
| **AD-16b** (Markdown SSoT) | La sérialisation JSON↔Markdown est **idempotente** et vit dans le périmètre Canvas, pas dans un format neuf |
| **AD-17** (tokens dans `packages/ui`) | Les studios **consomment** les tokens ; ils n'en définissent pas |

---

## 8. Ce que l'audit ne tranche pas (remis au owner, sans invention)

| # | Question | Pourquoi elle n'est pas tranchable ici |
|---|---|---|
| **OQ-7** | Brand DNA = entité dédiée, ou `Artifact` typé / `Project` ? | C'est une décision de modèle de domaine (AD-15), pas d'intégration |
| **OQ-8** | Moteur d'édition définitif (§6 dit Fabric.js / SVG / Tiptap « candidats ») | La référence **ne tranche pas** ; ce choix a un coût de sortie élevé |
| **OQ-9** | `canvas_sessions.blocks` (JSON) suffit-il pour l'affiche multipage, ou faut-il une structure de pages ? | Dépend d'OQ-8 |
| **OQ-10** | Le Brand DNA doit-il être **versionné** séparément des livrables ? | Dépend d'OQ-7 |

**Aucune de ces questions ne bloque la Phase 0** : toutes se posent **au lot
d'implémentation du premier moteur**, pas avant.

---

## 9. Porte de sortie de ce livrable (item 11)

- ✅ La question « comment Design Space s'intègre » a une **réponse unique** :
  producteur d'`Artifact`, éditeur via `Canvas` — **aucune table neuve**.
- ✅ Chaque affirmation est **adossée à un fichier** (`entities-artifact.ts:10`,
  `0022_canvas.sql:11`, `0023_canvas_locked.sql:19`, `events.ts:125`).
- ✅ Les 4 questions réellement ouvertes sont **nommées et attribuées**, pas
  contournées par une invention.
- ✅ Le déclencheur de création de package est **défini** pour ne pas produire
  un 4ᵉ stub vide.
