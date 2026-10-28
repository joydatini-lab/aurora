# Écran — Charte graphique (`charte`)

Module : **Design Space Pro** · Route : `/design/:projectId/charte/:artifactId` · Statut : **neuf** ·
SSoT écran : `Aurora-Reference-Produit-Fonctionnelle-v1.1.md` §6.5 (brand kit multiproductions : héritage du thème racine + surcharges),
§6.6 (charte = Document Studio spécialisé), §6.8 (cohérence de marque), §10.4 étape 4 · SSoT moteur : `AFFICHE.md` §5.2 (JSON de charte, racine du brand kit), §6.1 (palettes), §6.2 (grille) ·
SSoT périmètre : `docs/frontend/design-space-scope.md` §3 (écran 8) · SSoT arbitrages : `docs/frontend/design-space-oq-rulings.md` OQ-9, OQ-12 ·
Gabarit : **Éditeur** (lecture + édition) (`web-shell-and-responsive.md` §2.3) · Cadre : `docs/frontend/spec-template-v1.md` §15–§19.

---

## §1 Psychologie du designer

| Dimension | Valeur |
|---|---|
| Objectif utilisateur | Disposer d'une **charte graphique** qui fixe l'identité (palette, typographie, grille, règles d'usage) et qui sert de **racine** aux autres documents. |
| Contexte (appareil/moment/réseau) | Web/desktop. La charte est une **donnée locale** (AD-7) ; l'édition et la validation sont locales (moteur déterministe, AD-3). |
| Fréquence | Rare mais fondatrice — à la création de la marque, puis à chaque évolution du système visuel. |
| État émotionnel cible | **Référence stable.** La charte est le document auquel on revient ; elle doit être claire, pas un PDF figé. |
| Erreur la plus probable | **Confondre la charte (racine) et ses documents dérivés** : une affiche ou un guide *héritent* du thème racine mais peuvent avoir des surcharges contrôlées (§6.5 brand kit). Ou dupliquer la palette au lieu de la référencer. |
| Ce que l'écran RÉSOUT | La question « quelles sont les règles visuelles de la marque, et où s'appliquent-elles ? » — racine + héritage + surcharges visibles. |
| Invariant | **§6.5 / AD-6 / OQ-9** : la charte est le **JSON de charte** (racine du brand kit, `AFFICHE.md` §5.2) stocké dans l'`ArtifactFile` ; elle **hérite** et **surcharge** sans créer de table. La charte ne redéfinit **aucun** type de domaine. |

---

## §2 Zones de l'écran

| Zone | Contenu | SSoT |
|---|---|---|
| TopBar | Titre « Charte » + version du Brand DNA + type de document | §6.8 |
| Panneau gauche (sections) | Palette · Typographie · Grille et marges · Assets · Règles d'usage · Règles numériques | `AFFICHE.md` §5.2 |
| Corps (lecture/édition) | Section courante : valeurs + rendu d'exemple | §6.6 étape 4 |
| Panneau droit (héritage) | Ce qui est **hérité** du thème racine vs **surchargé** par ce document | §6.5 brand kit |
| Barre d'action | « Enregistrer » · « Régénérer la charte » (secondary) · « Exporter » (**seul** CTA) | §6.6 étapes 8–10 |

---

## §3 Éléments de l'écran (table 100 % de la zone)

| Élément | Composant DS | Lib (`ui-libraries.md` §1) | Tokens (AD-17) | Variante responsive | Source SSoT |
|---|---|---|---|---|---|
| TopBar charte | TopBar | shadcn (pattern header) | `text.xl`, `color.neutral.900/100` | même ; panneaux repliés < `lg` | §6.8 |
| Sommaire sections | Liste de navigation | shadcn Separator + boutons | `text.sm` 600 `text-muted` | replié < `lg` | `AFFICHE.md` §5.2 |
| **Aperçu de palette** | Swatches + modèles | shadcn Card | couleurs = palette de la marque (données), pas tokens Aurora | 1 colonne < `lg` | `AFFICHE.md` §6.1 |
| Modèle de palette (gabarit) | Select + orientation | shadcn Select + Slider | `text.sm`, `border` | même | `AFFICHE.md` §6.1 |
| Aperçu typographique | Échantillons de rôles | shadcn Card | rôles : titre/sous-titre/corps/note | même | `AFFICHE.md` §5.2 |
| **Aperçu de grille** | Grille + marges | — | `border-strong` (repères) | même | `AFFICHE.md` §6.2 |
| Liste des assets | `ListItem` + vignette | shadcn List | `row.min-height=56`, `text.sm` | même | `AFFICHE.md` §5.2 |
| **Panneau d'héritage** | Table hérité/surchargé | shadcn Table | `color.success` (hérité) / `color.info` (surchargé) | repliable | §6.5 brand kit |
| Règles d'usage | `KeyValueList` | shadcn Card | `text.muted` (clés), `text-primary` (valeurs) | repliable | `BrandUsageRules` |
| Bouton « Enregistrer » | Button secondary | shadcn Button | `color.brand.primary` | sticky bas | §6.6 étape 8 |
| Bouton « Exporter » | Button **primary** (**seul** CTA) | shadcn Button | `color.brand.primary`, `touch.target=48` | sticky bas | §6.9 |
| État `loading` | Skeleton (forme du document) | shadcn Skeleton | `color.skeleton`, pulse | même | §4 |

---

## §4 États de l'écran (6 états S6 + états §6.1)

| État | Déclencheur | Rendu | CTA |
|---|---|---|---|
| `loading` | chargement du JSON de charte local | Skeleton des sections | aucun |
| `empty` | marque sans charte | EmptyState : « Aucune charte. Générez-la depuis le Brand DNA. » | « Générer la charte » |
| `success` | charte chargée | sections + héritage + règles | « Exporter » |
| `error` | lecture locale impossible | Callout danger + « Réessayer » | Réessayer |
| `offline` | réseau coupé | **édition + validation locales** ; « Régénérer » désactivé avec motif | Enregistrer/Exporter (file d'attente) |
| `killed` | app tuée puis relancée | Skeleton + re-sync ; modifications non enregistrées **signalées** | Reprendre |
| `404` | charte inexistante ou non autorisée | pattern 404 global (**jamais** un 404 brut) | Retour |
| `en-cours` | génération de la charte en cours | progression par section | Annuler |
| `échec` | génération échouée / incohérence de palette | Callout danger + motif ; **aucune** section modifiée | Réessayer |
| `terminé` | charte enregistrée / export prêt | Toast 3 s | — |

> **Point dur** : modifier la charte **ne réécrit aucun** document dérivé en
> silence (§6.8). Le panneau d'héritage **montre** l'impact ; la propagation est
> proposée (→ `brand-impact`), jamais automatique.

---

## §5 Micro-interactions (GPU-only, 150–250 ms, smooth)

| Interaction | Effet | Durée |
|---|---|---|
| Changement de section | fondu + translation 8 px | 180 ms |
| Changement de gabarit de palette | re-rendu des swatches | 200 ms |
| Bascule grille | opacité de l'overlay | 150 ms |
| Enregistrement | Toast + état « à jour » | 200 ms |

`reduced-motion` : transitions remplacées par un changement d'état instantané.

---

## §6 Modals / BottomSheets

| Modal | Déclencheur | Contenu |
|---|---|---|
| Surcharge de document | « Surcharger pour ce document » | choix des règles héritées vs surchargées (§6.5) + motif |
| Impact d'un changement | modification d'une règle racine | liste des documents affectés (→ `brand-impact`) |
| Comparaison de versions | tap sur la version | → `design-versions` |

---

## §7 Formulaires

Édition de la palette (gabarit + orientation + couleurs **dérivées**, pas saisies
librement — `AFFICHE.md` §6.1), des rôles typographiques, de la grille
(colonnes/marges/gouttières) et des règles d'usage. **Règles** :
- le gabarit de palette est choisi selon la `style_category` (`AFFICHE.md` §6.4) ;
- un texte hors rôle déclaré = violation `STYLE_MISMATCH` (`AFFICHE.md` §5.3) ;
- les surcharges de document sont **explicites** et enregistrées (§6.5).

---

## §8 Pagination / Tri / Filtres

Pas de pagination (document structuré). **Filtres** : « seulement les règles
surchargées », « seulement les règles avec violation ». Navigation par sections.

---

## §9 Transitions entre écrans

- entrée depuis `brand-dna` (l'identité visuelle alimente la charte) ou `design-space` ;
- sortie vers `affiche-studio`/`document-studio` (les documents héritent de la charte),
  `design-validator`, `design-exports`, `brand-impact`, `design-assets` ;
- retour arrière : conserve la section courante (C5).

---

## §10 Thèmes (10 + 3 presets, par couche — AD-17)

Distinction clé : la **charte** définit les couleurs **de la marque de l'utilisateur** ;
les **thèmes Aurora** (10 + 3 presets) habillent l'**interface du studio**. Les deux
ne se mélangent jamais : un aperçu de palette montre les couleurs de la marque, pas
les tokens Aurora. Les panneaux et contrôles utilisent les tokens `packages/ui`.

---

## §11 Accessibilité (WCAG AA)

- les swatches de palette portent un **libellé** (nom + valeur), pas seulement une couleur ;
- le panneau d'héritage distingue hérité/surchargé par **texte**, pas seulement par couleur ;
- les aperçus de contraste affichent le **ratio** calculé (WCAG), pas une impression ;
- cibles ≥ 44 px, focus visible, `reduced-motion` respecté.

---

## §12 Offline (classe = `hybrid`)

| Capacité | Offline |
|---|---|
| Ouvrir, éditer, valider la charte | ✅ local (moteur déterministe, AD-3) |
| Voir l'héritage / les surcharges | ✅ local |
| **Générer** / régénérer la charte | ❌ `online-required` — désactivé avec motif |
| Exporter | ❌ `online-required` (job) — file d'attente ; la source reste locale |

---

## §13 Occurrences du logo (S9)

Le logo **Aurora** apparaît dans la TopBar selon la matrice S9. La charte **décrit**
les occurrences du logo de marque (fond clair/foncé, tailles minimales, espace de
protection — `BrandUsageRules`) et **montre** des exemples ; elle n'altère jamais
le logo Aurora.

---

## §14 Questions ouvertes (OQ)

| # | Question | Verdict |
|---|---|---|
| OQ-9 | La charte vit-elle dans `blocks` ? | **TRANCHÉE** : non — JSON de charte dans l'`ArtifactFile` (OQ-9) |
| OQ-12 | Moteur d'édition ? | **TRANCHÉE** : renderer DS pour la lecture/édition structurée ; Fabric.js pour les toiles (§6.5–§6.6) — OQ-12 |
| OQ-42 | La charte est-elle un écran distinct de `document-studio` ? | **TRANCHÉE** : oui — la charte est la **racine** (brand kit) ; `document-studio` produit des publications dérivées (§6.5–§6.6, écrans 7 et 8 de l'inventaire) |
| OQ-43 | Nombre de sections de la charte : figé ou extensible ? | **DÉFAUT-RÉVERSIBLE** : les 6 sections de `AFFICHE.md` §5.2 ; étendre est additif |

---

## §15 Responsive (cadre v1 — `docs/frontend/spec-template-v1.md`)

Gabarit : **Éditeur** (`web-shell-and-responsive.md` §2.3) — lecture et édition
structurée ; **plein écran dès `md`**.

| Breakpoint | Layout | Navigation | Notes |
|---|---|---|---|
| base → `md` (< 768 px) | 1 colonne (section courante) ; sommaire/héritage en `Sheet` | tab bar basse | lecture + corrections mineures (Phase 4) |
| `md` → `lg` (768–1023 px) | 1 colonne + rail de sections | rail latéral | — |
| **`lg+` (≥ 1024 px)** | sections (240 px) · corps (flex) · héritage (320 px) | panneau latéral | cible web/desktop (Phase 1–2) |

**Règle** : « Exporter » (seul CTA primaire, §3) reste **visible** aux 3 paliers.

> **OQ-4** : le seuil de bascule overlay→panneau (`lg` proposé) n'est pas ratifié globalement.

---

## §16 Critères de readiness (avant de coder)

| # | Critère | État | Preuve |
|---|---|---|---|
| R1 | Owner identifié | ✅ | Design Space Pro (famille **Artifacts**) |
| R2 | Ligne de catalogue | ⏳ à ajouter : `design.charte` (lot L11) |
| R3 | Types SSoT déclarés | ✅ | `Artifact`/`ArtifactFile` (`entities-artifact.ts:10`/`:50`) ; `BrandUsageRules` (`entities-design.ts:87`) ; JSON de charte = `AFFICHE.md` §5.2 |
| R4 | Spec §1–§14 complète | ✅ | ce document |
| R5 | 6 états S6 couverts | ✅ | §4 |
| R6 | États §6.1 couverts | ✅ | §4 (`en-cours`, `échec`, `terminé`, `404`) |
| R7 | Classe offline déclarée | ✅ | `hybrid` (§12) |
| R8 | Événements | **`ArtifactGenerated`** (`events.ts:125`) pour l'export |
| R9 | Permissions | aucune |
| R10 | Entrée de nav déclarée | ✅ | section **C. Créer** ; depuis `brand-dna`/`design-space` |
| R11 | Tokens identifiés | ✅ | §3 (aucune valeur brute) |
| R12 | Contrat de données | ✅ | source = `ArtifactFile` (JSON de charte) ; single-writer **Artifact** (AD-7) |
| R13 | OQ bloquantes fermées | ✅ | OQ-9/12/42/43 tranchées (§14) |

**Verdict readiness** : `NOT_READY` jusqu'à L11 (dépendance `design-engines`, planifiée).

---

## §17 Critères de succès (pour déclarer « fait »)

| # | Critère | Mesure |
|---|---|---|
| S1 | Données réelles | la charte vient du JSON local ; aucune palette codée en dur |
| S2 | 6 états prouvés | §4 — 1 story + 1 test par état |
| S3 | 404/feature-disabled | §4 — pattern global, jamais un 404 brut |
| S4 | Offline vérifié | édition + validation locales ; génération/export désactivés avec motif |
| S5 | Retour arrière | tuer/relancer → charte intacte |
| S6 | Isolation utilisateur | un autre utilisateur ne lit pas le livrable (RLS) |
| S7 | Tokens-only | 0 valeur brute (les couleurs de marque sont des **données**, pas des tokens d'UI) |
| S8 | A11y AA | swatches avec libellé, héritage distingué par texte, ratio de contraste affiché |
| S9 | Responsive | 3 paliers conformes à §15 |
| S10 | Gate vert | typecheck + lint + tests |
| S11 | Aucune régression | suites existantes vertes |
| S12 | **Héritage prouvé** | un document dérivé hérite de la charte et ses surcharges sont explicites (§6.5) |
| S13 | **Pas de réécriture silencieuse** | modifier la charte ne modifie aucun document approuvé sans accord (§6.8) |

---

## §18 Critères de QA (9 classes — `docs/testing/matrix.md` §1)

| Classe | Question | Preuve attendue |
|---|---|---|
| Unitaire (domaine) | palette (gabarit) / rôles typographiques corrects ? | Vitest sur `packages/design-engines` (`AFFICHE.md` §6.1) |
| Intégration | la charte se relit-elle après coupure ? | test PowerSync sur `artifacts` |
| Contrat | `ArtifactGenerated` après upload (F-06) ? | test AD-9 |
| E2E | « Brand DNA → charte → document dérivé » | Playwright |
| Failure | gabarit inadapté → violation `STYLE_MISMATCH` visible | test failure |
| Permission | n/a | — |
| Offline | édition + validation locales OK | test offline |
| Recovery | relance froide → charte intacte | test recovery |
| Plateforme | n/a (web) | — |

---

## §19 Couverture de tests exigée (seuils + DoD)

| Périmètre | Seuil |
|---|---|
| `packages/design-engines` (charte/brand kit) | **≥ 80 %** lignes |
| `design.charte` | ≥ 1 test par classe applicable (§18) |
| Région « sections de la charte » | **6 tests d'état S6** + états §6.1 applicables |
| Écran `charte` | ≥ 1 story (`Defaut`+`vide`+`chargement`+`erreur`) + ≥ 1 test `play` |
| Héritage | ≥ 1 test : document dérivé hérite + surcharge explicite (§6.5) |

```
[ ] R1–R13 vrais (readiness)
[ ] S1–S11 vrais (succès)
[ ] 6 états S6 testés + états §6.1 applicables
[ ] ≥ 1 story complète (cdd.md) + ≥ 1 test play
[ ] classe offline testée
[ ] responsive testé aux 3 paliers (§15)
[ ] a11y AA vérifiée (§11)
[ ] gate du lot vert (AI_RULES §9)
```

---

## §20 Nouvelles questions ouvertes (issues du cadre v1)

| # | Question | Verdict |
|---|---|---|
| OQ-44 | La charte réutilise-t-elle les **tokens Aurora** comme identité numérique de marque (`BrandDigitalIdentity`) ? | **DÉRIVÉE** : non — `BrandDigitalIdentity.designTokens` (`entities-design.ts:98`) décrit les tokens **de la marque de l'utilisateur** ; les tokens Aurora restent l'habillage du studio (AD-17). Deux espaces de tokens distincts, jamais fusionnés |
| OQ-45 | La charte est-elle un `Artifact` `kind:'pdf'` ou un format structuré ? | **DÉRIVÉE** : source **structurée** (JSON de charte) dans l'`ArtifactFile` ; le PDF n'est qu'un **export de distribution** (§6.9, source ≠ distribution) |
