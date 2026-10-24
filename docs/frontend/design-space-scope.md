# Design Space Pro — périmètre, écrans et topologie

> **Ref** : `Aurora-Reference-Produit-Fonctionnelle-v1.1.md` §6 (spécification
> fonctionnelle), §7 (modèle de projet), §10.2 (Phase 0), §10.4 (Phase 1B),
> §11.1 (parcours de preuve), §12.2 (critères spécifiques) · `LOGO.md` (680 l) ·
> `AFFICHE.md` (369 l) · `VIDEO.md` · `deep-research-report.md`.
> **Objet** : combler l'écart de périmètre identifié — Design Space Pro est un
> module de **première version** et n'a **aucun** artefact dans le dépôt.
> **Statut** : cadrage. **Aucun code** (AD-13).

---

## 1. Le trou, vérifié

**Design Space Pro est acté dans la première version cible** : référence §3
décision **D-03** (« Design Space Pro est la première extension créative
professionnelle »), §6 = ~200 lignes de spécification, et §10.4 lui dédie la
**Phase 1B**. Or :

| Artefact attendu | Constat | Commande de vérification |
|---|---|---|
| Package studio | ❌ absent | `ls packages/` → 19 packages, aucun studio |
| Ligne au catalogue | ❌ aucune | `grep -in "design space\|brand\|logo\|charte\|affiche" docs/features/master-feature-catalog.md` → 0 |
| Écran | ❌ aucun | `ls docs/design-system/screens/ \| grep -i "canvas\|studio\|logo\|brand\|affiche"` → 0 |
| Table SQL | ❌ aucune | `grep -ril "brand_dna\|design_project\|logo_variant" supabase/ packages/data/src/` → 0 |
| Route | ❌ aucune | `grep -i "design\|logo\|brand" apps/mobile/src/router.tsx` → 0 |
| Entrée de navigation | ❌ absente | `docs/mobile/navigation-and-page-composition.md` : 5 tabs, aucune entrée « Créer » |

**Classification (vocabulaire AI_RULES)** : `MISSING` — spécifié dans la
référence produit, zéro implémentation, zéro spécification d'écran, zéro contrat.

**C'est le principal écart entre la vision ratifiée et le dépôt.**

---

## 2. Périmètre fonctionnel (référence §6.1)

Six capacités, dans l'ordre du pipeline de marque (§6.3) :

| # | Capacité | Contenu (§6) | Sortie attendue |
|---|---|---|---|
| 1 | **Identité et système de marque** | Brand DNA versionné (§6.2) : stratégie, personnalité, identité visuelle, règles d'usage, identité numérique, provenance | modèle structuré + versionné |
| 2 | **Logos et déclinaisons vectorielles** | LOGO Studio (§6.4) : SVG structuré, calques sémantiques, ordre de rendu explicite, canonicalisation, comparaison avant/après | SVG éditable + source |
| 3 | **Chartes et guides de marque** | Document Studio spécialisé (§6.5–§6.6) : héritage du thème racine, surcharges par document | document multipages |
| 4 | **Affiches et supports** | AFFICHE Studio (§6.5) : JSON de calques, validateur déterministe, verrouillage d'attributs, boucle plafonnée | layout éditable + export |
| 5 | **Documents professionnels multipages** | Document Studio (§6.6) : plan, hiérarchie, grille, pagination, 20–100 p. | publication + source |
| 6 | **Cohérence, validation, versions, export** | §6.7–§6.9 : sélection/édition de calque, verrouillage, comparaison de variantes, validateur, exports vérifiés | version + rapport de validation |

**Hors périmètre du premier lot** (référence §6.1, §10.7) : studios **3D**,
**Vidéo**, **Musique**, **Web avancé**, **Data Viz**. Ils sont dans la vision
cible mais **pas** dans la première livraison.

---

## 3. Inventaire d'écrans **proposé**

> ⚠️ **La référence ne liste pas les écrans** (§6 est une spécification
> fonctionnelle, pas un inventaire d'interface). Cet inventaire est donc une
> **proposition dérivée** de §6 + §10.4, **à ratifier par le owner**.
> Il s'ajoute aux **44 écrans** existants.

| # | Écran proposé | Source § | Gabarit de composition |
|---|---|---|---|
| 1 | `design-space` — accueil du studio (projets de marque, récents, créer) | §10.4.1 | Tableau de bord |
| 2 | `design-brief` — brief modifiable et versionné | §6.3.1, §12.2 | Formulaire |
| 3 | `brand-dna` — Brand DNA (6 blocs : stratégie, personnalité, visuel, règles, numérique, provenance) | §6.2 | Formulaire + panneaux |
| 4 | `logo-studio` — éditeur vectoriel (canvas, calques, ordre de rendu) | §6.4 | **Éditeur** (plein écran) |
| 5 | `logo-variants` — déclinaisons multi-ratios / multi-palettes | §6.4 | Liste + détail |
| 6 | `affiche-studio` — éditeur d'affiche (calques, fonds, sous-couches) | §6.5 | **Éditeur** (plein écran) |
| 7 | `document-studio` — publication multipages (plan, grille, pagination) | §6.6 | **Éditeur** (plein écran) |
| 8 | `charte` — charte graphique / guide de marque | §6.5–§6.6 | Éditeur / lecture |
| 9 | `design-validator` — panneau des violations typées | §6.5, §12.2 | Panneau (transverse) |
| 10 | `design-versions` — comparaison de variantes, retour arrière | §6.7, §6.8 | Liste + détail |
| 11 | `design-exports` — exports, vérification, source vs distribution | §6.9 | Liste + détail |
| 12 | `design-assets` — bibliothèque d'actifs (logos, palettes, typographies) | §6.2 | Liste + détail |
| 13 | `brand-impact` — livrables affectés par un changement de marque | §6.8, §11.1.12 | Liste |

**Décompte** : **44 + ~13 = ~57 écrans**. À ratifier — c'est le chiffre qui doit
entrer dans le plan de lots.

**Contrainte de composition (référence §4.3)** : ce sont des **grandes surfaces
de travail**. Elles exigent le gabarit « Éditeur » (plein écran) et des panneaux
repliables — le responsive n'est pas optionnel ici, c'est une exigence de la
référence : « Les grandes surfaces de travail peuvent adapter leurs panneaux et
leurs contrôles à la largeur disponible ».

---

## 4. Réemploi des entités existantes (référence §7.2)

La référence **interdit** de créer une entité racine nouvelle avant audit :

> « **À ne pas faire avant audit** : créer immédiatement une nouvelle entité racine
> ou un nouveau package sans examiner les concepts existants. »

Audit fait — les concepts existent déjà :

| Concept de la référence (§7.2) | Entité existante | Emplacement |
|---|---|---|
| Projet de productivité | `Project` | `packages/domain/src/entities-productivity.ts` l.61 |
| Objectif | `Goal` | `entities-productivity.ts` l.89 |
| Lien objectif↔projet | `GoalProject`, `GoalProgress` | `entities-goal.ts` l.11, l.67 |
| **Artefact / livrable** | `Artifact`, `ArtifactFile` | `entities-artifact.ts` l.10, l.50 |
| Événement de production | `ArtifactGeneratedEvent` | `events.ts` l.125 |

→ **Conséquence de conception** : un logo, une affiche ou un document Design
Space **est un `Artifact`** (versionnable, lié à un projet). Le Brand DNA est une
**représentation structurée** rattachée au projet de marque — pas une nouvelle
racine. Cela respecte AD-6 (un propriétaire par donnée) et évite une seconde
source de vérité.

**Question à trancher (référence A-05)** : Brand DNA = entité dédiée, ou
représentation d'un `Artifact`/`Project` existant ? → voir OQ-7.

---

## 5. Topologie de packages (référence §8.7.2)

La référence propose `packages/design-engines/` (« contrats des moteurs LOGO,
AFFICHE et documentaires ») et `packages/contracts/`. Constat :

| Package proposé (§8.7.2) | Réel |
|---|---|
| `packages/domain` | ✅ existe |
| `packages/data` | ✅ existe |
| `packages/ui` | ✅ existe |
| `packages/agent` | ✅ existe |
| `packages/contracts` | ❌ **absent** (les schémas Zod sont dispersés) |
| `packages/design-system` | ❌ **absent** (`packages/ui` porte les tokens/thèmes) |
| `packages/design-engines` | ❌ **absent** |
| `packages/modules` | ❌ **absent** (19 packages par module) |

**Décision proposée** : la référence dit elle-même que sa topologie est « une
proposition de responsabilités, pas une obligation de noms de répertoires si le
dépôt courant impose déjà une organisation équivalente » (§8.7.2). Donc :
- **ne pas** créer `design-system` (les tokens vivent dans `packages/ui` — AD-17) ;
- **ne pas** créer `modules` (19 packages existants jouent ce rôle) ;
- **créer** un package de moteurs Design Space **uniquement** quand le premier
  moteur (LOGO) entre en implémentation — voir OQ-8 ;
- `contracts` : à évaluer (les schémas Zod sont aujourd'hui par module).

---

## 6. Trois tensions à trancher

### 6.1 Ionic : la décision owner contredit la référence **D-06**

La référence est **explicite** et à **trois** endroits :

> §8.7.1 : « **Ionic React** fournit les composants et l'expérience de
> l'application métier Web responsive ; il ne remplace pas le modèle métier
> d'Aurora. »
> §10.2 item 6 : « proposer la topologie `Next.js site public` + `Ionic React
> application métier`, **ou déposer un ADR motivant une topologie différente** »
> D-06 : « TypeScript, **Ionic React**, Capacitor, Electron, Next.js, … »

La décision owner du 2026-10-24 (**Ionic = mobile seulement ; web et desktop =
React + shadcn/ReUI purs**) est donc une **topologie différente de D-06**.

**La référence autorise cette déviation, mais impose de la motiver par un ADR.**
C'est fait dans `adr-018-direction-plateforme-web-first.md` §8. Éléments de
motivation :

1. `packages/ui` est bâti sur **Radix + shadcn** (23 paquets `@radix-ui/*`,
   `components.json` style `new-york`) — **pas** sur Ionic.
2. Ionic et Radix sont **deux systèmes de composants concurrents** ; les
   mélanger dans un shell produit des conflits de style et d'a11y.
3. La porte de validation qu'Ionic s'assigne lui-même dans la référence §8.7.3
   — « Navigation, accessibilité, **grands écrans**, petits écrans et **éditeurs**
   testés » — **n'est pas prouvée**, et c'est exactement le besoin de Design
   Space Pro (éditeurs plein écran).
4. Coût assumé : **deux shells** (web React / mobile Ionic) → la référence
   elle-même signale ce risque en **A-01** (« réutilisation insuffisante entre
   Web, Electron et Capacitor »). Mitigation : contrats et tokens partagés, seule
   la couche shell diffère.

### 6.2 Next.js : la référence le conserve, la décision owner n'en parle pas

D-06 retient **Next.js pour le site public** (`apps/marketing`), séparé de
l'application métier. Le dépôt n'a **pas** d'`apps/marketing` et le web est
aujourd'hui servi par `apps/mobile` (`build:web` = `vite build`).
**OQ-9** : le site public Next.js fait-il partie du périmètre ? Quand ?

### 6.3 `apps/web-app` n'existe pas

La référence propose `apps/web-app/` (application métier) séparée de
`apps/mobile/`. Aujourd'hui **une seule app web** existe (`apps/mobile`).
**OQ-10** : créer `apps/web-app` (shell React web/desktop) et garder
`apps/mobile` (Ionic) ? C'est la conséquence directe de la décision OQ-1.

---

## 7. Dépendances et arbitrages ouverts

| Sujet | Candidats (recherche) | Statut |
|---|---|---|
| Moteur d'édition canvas | **Fabric.js** | candidat validé (AFFICHE.md §1) — **A-02** à arbitrer |
| Représentation logo | **SVG structuré** | [VALIDÉ] LOGO.md |
| Documents structurés | **Tiptap/ProseMirror** | candidat (référence §Points non gelés) |
| Pipeline PDF/DOCX | à arbitrer | A-02 |
| Sortie layout | **JSON de calques** | [VALIDÉ] AFFICHE.md §2.1 |
| Graphe de connaissance | **LightRAG** | [VALIDÉ] AFFICHE.md §1 |
| Parsing | **Docling** | [VALIDÉ] AFFICHE.md §1 |

**Règle de la référence (§6.9)** : « ne jamais afficher un format comme
disponible avant le test réel de sa chaîne d'export ».

---

## 8. Questions ouvertes

| # | Question | Bloque |
|---|---|---|
| **OQ-6** | L'inventaire de ~13 écrans (§3) est-il ratifié ? Combien d'écrans au total (44 + N) ? | plan de lots, décompte |
| **OQ-7** | Brand DNA = entité dédiée, ou représentation d'un `Artifact`/`Project` ? (référence **A-05**) | modèle de données |
| **OQ-8** | Un package `design-engines` (ou un package par moteur) ? Quand le créer ? | topologie |
| **OQ-9** | Site public Next.js : dans le périmètre ? Quand ? (D-06) | topologie |
| **OQ-10** | Créer `apps/web-app` séparée de `apps/mobile` ? | shell, build |
| **OQ-11** | Ordre de construction : §10.4 propose 10 étapes ; confirmer la séquence | plan de lots |
| **OQ-12** | Moteur d'édition : Fabric.js confirmé ? (référence **A-02**) | Phase 1B |

---

## 9. Séquence de construction proposée (référence §10.4)

| Lot | Contenu | Dépend de |
|---|---|---|
| **D0** | Cadrage ratifié (OQ-6…OQ-12) + spécifications d'écrans (§15–§19 du cadre v1) | owner |
| **D1** | Projet Design Space + brief + source de référence | D0, entités `Project`/`Artifact` |
| **D2** | Modèle Brand DNA versionné | D1, OQ-7 |
| **D3** | LOGO Studio : logos vectoriels simples (SVG, calques) | D2, OQ-12 |
| **D4** | Charte + héritage des tokens de marque | D3 |
| **D5** | AFFICHE : affiches à calques éditables | D4 |
| **D6** | Éditeur visuel + édition manuelle des calques | D3–D5 |
| **D7** | Validateur déterministe (layout, ordre, lisibilité, style) | D5–D6 |
| **D8** | Document Studio : publications multipages | D4 |
| **D9** | Export + vérification des formats confirmés | D3–D8 |
| **D10** | Versions, verrouillage d'attributs, propagation contrôlée | D9 |

**Porte de sortie (référence §10.4)** : « un utilisateur peut partir d'un brief,
créer une identité cohérente, modifier logo/affiche/charte/document, vérifier le
résultat, revenir en arrière et exporter une production dont les sources sont
conservées. »

**Parcours de preuve (référence §11.1)** : les 12 étapes du parcours « Entreprise
crée sa marque et ses supports » constituent le **test d'intégration de
référence** de ce module.
