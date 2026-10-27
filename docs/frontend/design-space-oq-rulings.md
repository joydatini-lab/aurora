# Arbitrages OQ — Design Space Pro (OQ-6 → OQ-12)

> **Ref** : `docs/frontend/derivation-protocol.md` (le protocole appliqué ici) ·
> `Aurora-Reference-Produit-Fonctionnelle-v1.1.md` §6/§7/§10.4 ·
> `docs/frontend/design-space-scope.md` · `docs/architecture/design-space-integration.md` ·
> `AFFICHE.md` · `LOGO.md` · `packages/domain/src/entities-{canvas,artifact}.ts` ·
> `supabase/migrations/0022_canvas.sql`.
> **Créé** : 2026-10-26. **Nature** : décision. **Aucun code** (AD-13).
> **Objet** : trancher les 7 OQ qui conditionnent les **13 écrans** de Design
> Space Pro, **par dérivation**, pour ne plus les poser au owner.
> **Résultat** : **0 ESCALADE.** Les 7 sont tranchées par preuve (5 `RÉSOLUE`,
> 1 `DÉRIVÉE`, 1 `DÉFAUT-RÉVERSIBLE`).

---

## 0. Synthèse

| OQ | Verdict | Réponse en une phrase |
|---|---|---|
| **OQ-6** | `RÉSOLUE` | Les 13 écrans sont ratifiés ; le total passe de 44 à **57**. |
| **OQ-7** | `DÉRIVÉE` | Brand DNA = **type `packages/domain` rattaché au `Project`**, pas une entité racine, pas un `Artifact`. |
| **OQ-8** | `RÉSOLUE` | **Un** package `design-engines`, créé **dans le lot du premier moteur (LOGO)**, jamais avant. |
| **OQ-9** | `RÉSOLUE` | Le canvas v1 ne porte que `kind:'md'` → **les calques vivent dans le JSON de l'`ArtifactFile`**, pas dans `blocks`. |
| **OQ-10** | `RÉSOLUE` | **Oui, créer `apps/web-app`** (React + ReUI, sans `ion-*`). |
| **OQ-11** | `RÉSOLUE` | Séquence §10.4 **confirmée**, avec **une correction d'ordre** prouvée ci-dessous. |
| **OQ-12** | `RÉSOLUE` | **Fabric.js confirmé** (MIT, `[VALIDÉ]` par la référence). |

---

## OQ-6 — L'inventaire de ~13 écrans est-il ratifié ?

- **Verdict** : `RÉSOLUE`
- **Réponse** : **Ratifié. Le total passe de 44 à 57 écrans.** Les 13 écrans de
  `design-space-scope.md` §3 sont retenus tels quels.
- **Preuve** : `design-space-scope.md` §3 dérive chaque écran d'une section de la
  référence — `§10.4.1` → `design-space`, `§6.3.1` → `design-brief`, `§6.2` →
  `brand-dna`, `§6.4` → `logo-studio` + `logo-variants`, `§6.5` → `affiche-studio`,
  `§6.6` → `document-studio`, `§6.5–§6.6` → `charte`, `§6.5/§12.2` →
  `design-validator`, `§6.7–§6.8` → `design-versions`, `§6.9` → `design-exports`,
  `§6.2` → `design-assets`, `§6.8/§11.1.12` → `brand-impact`. **Chaque écran a
  une source §.** L'inventaire n'est pas une invention : c'est une projection.
- **Options écartées** : *garder 44 et couvrir Design Space par des écrans
  existants* → rejeté : la référence §4.3 exige le gabarit « Éditeur » (plein
  écran) et « Les grandes surfaces de travail peuvent adapter leurs panneaux et
  leurs contrôles à la largeur disponible » ; aucun des 44 écrans n'est un éditeur
  vectoriel.
- **Conséquence** : le décompte `spec-template-v1.md` §7 passe de 44 à 57 ;
  les 13 entrent dans la **vague 6** (nouvelle).

---

## OQ-7 — Brand DNA : entité dédiée, ou `Artifact` / `Project` ?

- **Verdict** : `DÉRIVÉE`
- **Réponse** : **Un type de domaine versionné (`BrandDna`), rattaché au `Project`
  de marque. Ni une entité racine nouvelle, ni un `Artifact`, ni une table.**
  **Fait** — livré dans `packages/domain/src/entities-design.ts`.
- **Preuve** : trois sources convergent, et **elles écartent les deux autres
  options** :
  1. La référence §7.2 : *« À ne pas faire avant audit : créer immédiatement une
     nouvelle entité racine ou un nouveau package sans examiner les concepts
     existants »* → écarte « entité racine dédiée ».
  2. La référence §6.2 : le Brand DNA est *« la source de référence qui alimente
     les rendus et les documents dérivés »* — il **alimente** des `Artifact`, il
     n'en est pas un. Un `Artifact` est un livrable binaire/versionnable
     (`entities-artifact.ts:10`, `r2Key` l.30, `kind` l.14) ; le Brand DNA est une
     **structure de champs**, sans fichier. → écarte « `Artifact` typé ».
  3. `design-space-integration.md` §5 ligne 1 laissait le choix ouvert entre
     `Artifact` et `Project` : le §6.2 tranche pour `Project` (le DNA décrit une
     marque = une initiative = un `Project`).
- **Options écartées** :
  - *Entité racine `BrandDna` + table `brand_dna`* → **rejetée** : interdite par
    §7.2, et créerait un 2ᵉ SSoT d'identité à côté de `Project`.
  - *`Artifact` avec `kind:'brand-dna'`* → **rejetée** : un `Artifact` exige un
    `r2Key` et un binaire (`entities-artifact.ts:10` + `r2Key` l.30), or le Brand DNA est un
    objet structuré sans fichier. Le forcer produirait un artefact vide.
- **Réversibilité** : `packages/domain` est le SSoT ; le type n'est **consommé par
  aucun autre package** aujourd'hui (vérifié : 0 import). Le renommer coûte 1 lot.
- **Conséquence** : débloque D2 (fait), D3 (LOGO) et `brand-dna` (écran 3).

---

## OQ-8 — Un package `design-engines`, ou un package par moteur ? Quand ?

- **Verdict** : `RÉSOLUE`
- **Réponse** : **Un seul package `packages/design-engines`**, créé **dans le
  même lot que le premier moteur réel (LOGO)**, jamais avant.
- **Preuve** : `design-space-integration.md` §6 le prescrit déjà et en donne le
  motif vérifié : la référence §8.7.2 dit que sa topologie est *« une proposition
  de responsabilités, pas une obligation de noms de répertoires »*, et les 3
  packages `engineering-*` existent aujourd'hui en `export {}` — des stubs vides
  classés `SCAFFOLDED` (écart **C2** du registre de statut). Créer un 4ᵉ stub
  reproduirait exactement cette dette.
- **Options écartées** :
  - *Un package par moteur (`design-logo`, `design-affiche`, `design-document`)*
    → **rejetée** : 3 packages dont 2 vides au départ = 2 stubs de plus ; les
    moteurs partagent la validation et la canonicalisation.
  - *Mettre les moteurs dans `packages/ui`* → **rejetée** : `packages/ui` est la
    couche de rendu (AD-17 tokens, AD-10 renderers) ; un moteur de calcul y
    violerait la séparation moteur/rendu (le domaine calcule, l'UI dessine).
  - *Créer le package maintenant* → **rejetée** : c'est le piège des stubs.
- **Réversibilité** : un package vide se supprime ; un package à 1 moteur se
  scinde en 3 si besoin. Coût de sortie < 1 lot.
- **Conséquence** : débloque D3 (LOGO) ; le lot D3 **inclut** la création du
  package — c'est la définition du déclencheur.

---

## OQ-9 — `canvas_sessions.blocks` suffit-il pour l'affiche multipage ?

- **Verdict** : `RÉSOLUE`
- **Réponse** : **Non — et ce n'est pas nécessaire.** Les **calques** (JSON de
  mise en page) vivent dans l'`ArtifactFile` de l'`Artifact` ; le `Canvas` reste
  la session d'édition **markdown** (`kind:'md'`). Pas de structure de pages
  dans `blocks`.
- **Preuve** : `entities-canvas.ts:8` déclare `kind: 'md'` avec le commentaire
  *« v1 unique : 'md' (markdown éditable TipTap) »*, et `0022_canvas.sql:5` le
  confirme : `blocks jsonb` = `[{ id, kind: 'md', content: markdown }]` **(SSoT
  contenu)**. Or la référence `AFFICHE.md` §2.1 `[VALIDÉ]` dit : *« le contrat de
  sortie — JSON de mise en page = calques, pas pixels. Les coordonnées normalisées
  0–1 rendent le JSON indépendant du format de document (A4, poster 2:3, social
  4:5) »*. **Deux SSoT différents pour deux choses différentes** : `blocks` porte
  le **contenu éditorial**, le JSON de calques porte la **géométrie**. Les fondre
  dans `blocks` violerait AD-16b (Markdown SSoT de la sérialisation).
- **Options écartées** :
  - *Étendre `CanvasBlock.kind` à `'layers'`* → **rejetée** : AD-16b fait du
    Markdown le SSoT de sérialisation ; un bloc de calques n'est pas du markdown
    et casserait la jointure `canvas_comments` (ancres `anchor_start/anchor_end`
    dans le **texte plat** `blocks.map(b=>b.content).join('\n\n')` —
    `0022_canvas.sql:7`).
  - *Une table `design_pages`* → **rejetée** : `design-space-integration.md` §5
    conclut *« Aucune ligne de ce tableau ne demande une table neuve »*.
- **Réversibilité** : si un jour un éditeur de calques exige un SSoT relationnel,
  la migration ajoute une colonne `layers jsonb` sur `canvas_sessions` — additif.
- **Conséquence** : débloque D5 (AFFICHE) et D8 (Document) sans schéma neuf.

---

## OQ-10 — Créer `apps/web-app` séparée de `apps/mobile` ?

- **Verdict** : `RÉSOLUE`
- **Réponse** : **Oui.** `apps/web-app` = React + ReUI, **sans `ion-*`** ;
  `apps/mobile` (Ionic) est conservé comme cible Phase 4.
- **Preuve** : `decisions-d1-d5.md` §3 (D2) mesure le fait et recommande :
  *« `apps/web-app` **n'existe pas** (3 apps : desktop, mobile, server). Le travail
  d'UI existant est dans `apps/mobile` (Ionic), or `OQ-1` a écarté Ionic du web.
  **Recommandation : créer `apps/web-app` maintenant** (React + ReUI, sans `ion-*`) »*.
  Le motif est vérifié dans `design-space-scope.md` §6.1 : `packages/ui` est bâti
  sur **Radix + shadcn** (23 paquets `@radix-ui/*`, `components.json` style
  `new-york`) et *« Ionic et Radix sont deux systèmes de composants concurrents ;
  les mélanger dans un shell produit des conflits de style et d'a11y »*.
- **Options écartées** :
  - *Garder `apps/mobile` comme seule app web* → **rejetée** : construire des
    éditeurs plein écran dans une coquille Ionic qu'on démontera est le coût déjà
    identifié dans `web-shell-and-responsive.md`.
  - *Renommer `apps/mobile` en `apps/web-app`* → **rejetée** : la cible Phase 4
    (Android/iOS via Capacitor) reste Ionic ; renommer détruirait la cible mobile.
- **Réversibilité** : une app se supprime ou se fusionne ; coût > 1 lot **si** des
  écrans y sont déjà bâtis → d'où la décision **maintenant**, avant de bâtir.
- **Conséquence** : débloque D1 (projet Design Space) côté UI ; c'est le chemin
  critique des **deux** options de périmètre D1 (socle ou socle + Design Space).

---

## OQ-11 — L'ordre §10.4 est-il confirmé ?

- **Verdict** : `RÉSOLUE`
- **Réponse** : **Confirmé, avec une correction d'ordre** : le **contrat Brand DNA
  (D2) précède le projet Design Space (D1)**, et non l'inverse.
- **Preuve** : la référence §10.4 liste `1. projet Design Space, brief … 2. modèle
  Brand DNA versionné`. Mais la référence §7.2 impose de **réutiliser `Project`**
  (audit fait, `design-space-integration.md` §2) : il n'y a donc **aucun modèle
  « projet Design Space » neuf à construire** — le projet est un `Project`
  existant. Le seul objet neuf de D1+D2 est le **Brand DNA**. Le construire en
  premier ne coûte rien et **débloque** le brief (qui le remplit). L'ordre §10.4
  supposait un modèle de projet neuf ; ce n'est pas le cas ici.
- **Options écartées** :
  - *Suivre §10.4 à la lettre (projet d'abord)* → **rejetée** : le « projet Design
    Space » n'existe pas comme objet neuf ; on construirait une coquille vide.
- **Réversibilité** : un ordre de lots se réordonne à coût nul tant que le lot
  suivant n'est pas commencé.
- **Conséquence** : séquence de lots retenue : **D2 (Brand DNA, fait) → D1 (projet
  + brief) → D3 (LOGO) → D4 (charte) → D5 (affiche) → D6 (éditeur) → D7
  (validateur) → D8 (document) → D9 (export) → D10 (versions)**.

---

## OQ-12 — Le moteur d'édition : Fabric.js confirmé ?

- **Verdict** : `RÉSOLUE`
- **Réponse** : **Fabric.js confirmé** pour la toile éditable d'AFFICHE/Document.
  Le LOGO n'utilise **pas** Fabric.js : il manipule du **SVG structuré** en
  données (LOGO.md), rendu par un renderer du DS.
- **Preuve** : `AFFICHE.md` §4 le marque `[VALIDÉ]` avec licence et maturité :
  *« **Fabric.js** | Toile éditable : import du JSON de calques, édition par prompt
  (calques sélectionnés → prompt → patch du JSON), export SVG | **MIT** |
  Production (10+ ans) | **[VALIDÉ]** (déjà retenu par le projet) »*. Et §1 :
  *« Les outils validés restent **Fabric.js** (toile éditable), **Docling**
  (parsing) et **LightRAG** (graphe de connaissance) »*. La référence §9 de
  `design-space-scope.md` listait « Fabric.js — candidat validé (AFFICHE.md §1) —
  **A-02** à arbitrer » : le mot « arbitrer » portait sur la décision owner, pas
  sur un doute technique ; `[VALIDÉ]` + MIT + 10 ans de production la tranchent.
- **Options écartées** :
  - *Konva / paper.js / SVG.js* → **rejetées** : aucun n'est `[VALIDÉ]` par le
    corpus, et `ui-libraries.md` §3 interdit de mélanger deux bibliothèques sur
    un écran ; introduire une alternative créerait un 2ᵉ moteur sans motif.
  - *Fabric.js aussi pour le LOGO* → **rejetée** : LOGO.md `[VALIDÉ]` impose le
    **SVG structuré canonique** (`LOGO.md` l.52 « un logo = un graphe de calques »,
    l.58 « optimisation SVGO, canonicalisation des paths »). Le LOGO est un
    problème de **données**, pas de toile interactive.
- **Réversibilité** : **I1 s'applique** — changer de moteur après 3 studios coûte
  > 1 lot. C'est pourquoi la décision est prise **maintenant**, adossée à
  `[VALIDÉ]`, et **confinée derrière un contrat** : les studios consomment une
  interface, pas Fabric.js directement. Le coût de sortie devient « réécrire
  l'adaptateur », pas « réécrire les studios ».
- **Conséquence** : débloque D6 (éditeur) ; `Fabric.js` n'entre **jamais** dans
  `packages/domain` (AD-1) — il vit dans un adaptateur de `packages/ui`.

---

## Ce que ces 7 arbitrages débloquent

| Débloqué | Par |
|---|---|
| Le décompte 57 écrans entre au plan de lots | OQ-6 |
| D2 (Brand DNA) livré ; D3 non bloqué par un doute de modèle | OQ-7 |
| Le lot D3 inclut la création du package — déclencheur défini | OQ-8 |
| D5/D8 sans schéma neuf ; AD-16b préservé | OQ-9 |
| Le chemin critique web (`apps/web-app`) est décidé | OQ-10 |
| La séquence de lots est figée | OQ-11 |
| L'éditeur a un moteur, confiné derrière un contrat | OQ-12 |

**Reste au owner** : rien. Ces 7 OQ étaient les seules bloquantes pour les 13
écrans. Les OQ suivantes se poseront **au lot d'implémentation de chaque moteur**
et se dériveront de la même façon.
