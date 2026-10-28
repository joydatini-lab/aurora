# Écran — Bibliothèque d'actifs (`design-assets`)

Module : **Design Space Pro** · Route : `/design/:projectId/assets` · Statut : **neuf** ·
SSoT écran : `Aurora-Reference-Produit-Fonctionnelle-v1.1.md` §6.2 (Brand DNA : identité visuelle = logos, palettes, typographies, iconographie, styles d'image, grilles),
§6.5 (brand kit : assets), §7.4 (objets conceptuels) · SSoT moteur : `AFFICHE.md` §5.2 (assets du brand kit), `LOGO.md` §5 (SVG structuré) ·
SSoT périmètre : `docs/frontend/design-space-scope.md` §3 (écran 12) · SSoT arbitrages : `docs/frontend/design-space-oq-rulings.md` OQ-7, OQ-9 ·
SSoT types : `packages/domain/src/entities-design.ts` (`BrandVisualIdentity`), `entities-artifact.ts` (`Artifact`) · Gabarit : **Liste + détail** (`web-shell-and-responsive.md` §2.3) · Cadre : `docs/frontend/spec-template-v1.md` §15–§19.

---

## §1 Psychologie du designer

| Dimension | Valeur |
|---|---|
| Objectif utilisateur | Retrouver et réutiliser les **actifs de la marque** — logos et variantes, palettes, typographies, iconographie, styles d'image — dans tous les documents. |
| Contexte (appareil/moment/réseau) | Web/desktop. La bibliothèque est une **lecture locale** (AD-7) ; les binaires vivent dans R2 (presigned, AD-3). |
| Fréquence | Transversale — à chaque composition, pour piocher un actif. |
| État émotionnel cible | **Approvisionné.** Un créatif doit trouver l'actif juste en un coup d'œil, sans dupliquer. |
| Erreur la plus probable | **Dupliquer un actif** (recréer une palette ou un logo au lieu de le référencer) — ce qui crée un 2ᵉ SSoT visuel et casse l'héritage de marque. |
| Ce que l'écran RÉSOUT | La question « quels actifs ai-je, et où sont-ils utilisés ? » — bibliothèque unique, réutilisation par référence. |
| Invariant | **AD-6 / OQ-7** : les actifs sont des `Artifact` (logos, images) ou des **valeurs de `BrandVisualIdentity`** (palettes, typographies) — **jamais** une table neuve. L'écran **référence**, il ne duplique pas. |

---

## §2 Zones de l'écran

| Zone | Contenu | SSoT |
|---|---|---|
| TopBar | Titre « Actifs » + recherche + filtre par type | §6.2 |
| Panneau gauche (types) | Logos · Palettes · Typographies · Iconographie · Styles d'image · Grilles | `BrandVisualIdentity` |
| Corps (grille) | Grille d'actifs avec vignette + nom + type | §6.2 |
| Détail (panneau droit) | Actif sélectionné : aperçu, source, usages, règles d'usage associées | `BrandUsageRules` |
| Barre d'action | « Ajouter un actif » (**seul** CTA) · « Copier la référence » (secondary) | §6.5 |

---

## §3 Éléments de l'écran (table 100 % de la zone)

| Élément | Composant DS | Lib (`ui-libraries.md` §1) | Tokens (AD-17) | Variante responsive | Source SSoT |
|---|---|---|---|---|---|
| TopBar actifs | TopBar | shadcn (pattern header) | `text.xl`, `color.neutral.900/100` | même | §6.2 |
| Recherche | Input search | shadcn Input | `text.sm`, `border` | même | §4.6 (recherche) |
| Filtre par type | SegmentedControl | shadcn Tabs | `color.brand.primary` (actif) | même | `BrandVisualIdentity` |
| **Grille d'actifs** | Card + vignette | shadcn Card | `surface`, `shadow.2`, `radius.md`, `space.4` | grid 2→3→4 colonnes | §6.2 |
| Vignette logo | renderer SVG | renderer `packages/ui` (AD-10) | `surface`, `border` | même | `LOGO.md` §5 |
| Vignette palette | Swatches | shadcn Card | couleurs = données de marque | même | `AFFICHE.md` §6.1 |
| Vignette typographie | Échantillon | shadcn Card | rôles typographiques | même | `AFFICHE.md` §5.2 |
| Badge type | Badge tonal | shadcn Badge | logo→`accent-primary` · palette→`info` · typo→`text-muted` | même | §6.2 |
| Détail de l'actif | `KeyValueList` | shadcn Card | `text.muted` (clés), `text-primary` (valeurs) | repliable | §6.2 |
| **Liste des usages** | `ListItem` | shadcn List | `row.min-height=44`, `text.sm` | même | §6.8 (impact) |
| Bouton « Ajouter un actif » | Button **primary** (**seul** CTA) | shadcn Button | `color.brand.primary`, `touch.target=48` | sticky bas | §6.5 |
| Bouton « Copier la référence » | Button secondary | shadcn Button | `color.brand.primary` | sticky bas | §6.5 |
| État `loading` | Skeleton (forme de la grille) | shadcn Skeleton | `color.skeleton`, pulse | même | §4 |

---

## §4 États de l'écran (6 états S6 + états §6.1)

| État | Déclencheur | Rendu | CTA |
|---|---|---|---|
| `loading` | chargement des actifs locaux | Skeleton de la grille | aucun |
| `empty` | marque sans actif | EmptyState : « Aucun actif. Créez un logo ou une palette. » | « Ajouter un actif » |
| `success` | actifs chargés | grille + détail + usages | « Ajouter un actif » |
| `error` | lecture locale impossible | Callout danger + « Réessayer » | Réessayer |
| `offline` | réseau coupé | **grille locale** lisible (métadonnées, AD-7) ; vignettes binaires non mises en cache = placeholder honnête | « Ajouter un actif » désactivé avec motif |
| `killed` | app tuée puis relancée | Skeleton + re-sync | Reprendre |
| `404` | actif inexistant ou non autorisé | pattern 404 global (**jamais** un 404 brut) | Retour |
| `en-cours` | upload d'un actif en cours | progression par actif ; **hors du cycle bloquant** | Annuler |
| `échec` | upload échoué | Callout danger + motif + `jobId`/retry ; **aucun** actif fantôme | Réessayer |
| `terminé` | actif ajouté | Toast 3 s + entrée dans la grille | — |

> **Point dur** : un actif dont le binaire n'est **pas** disponible hors-ligne
> affiche un **placeholder honnête** (« aperçu indisponible hors-ligne »), jamais
> une vignette factice. C'est la règle AD-7 appliquée aux binaires R2.

---

## §5 Micro-interactions (GPU-only, 150–250 ms, smooth)

| Interaction | Effet | Durée |
|---|---|---|
| Hover d'une vignette | `transition-colors` (bordure) | 150 ms |
| Sélection d'un actif | mise à jour du détail | 180 ms |
| Changement de filtre | re-rendu de la grille | 200 ms |
| Ajout d'un actif | Toast + apparition de la vignette | 200 ms |

`reduced-motion` : transitions remplacées par un changement d'état instantané.

---

## §6 Modals / BottomSheets

| Modal | Déclencheur | Contenu |
|---|---|---|
| Ajout d'un actif | « Ajouter un actif » | import (logo SVG, image), création de palette, ou référence à un `Artifact` existant |
| Usages d'un actif | tap sur un usage | document/écran qui utilise l'actif → navigation |
| Impact d'une suppression | suppression d'un actif | documents affectés (→ `brand-impact`) — **jamais** de suppression silencieuse |

---

## §7 Formulaires

Ajout d'un actif : `type` (logo/palette/typo/icône/style/grille), `source`
(import ou référence). **Règles** :
- un logo importé devient un `Artifact` (`ArtifactFile`), **pas** une valeur inline ;
- une palette/typographie est une **valeur de `BrandVisualIdentity`** (référencée), pas un binaire ;
- l'ajout **ne duplique** pas un actif existant : l'écran propose la réutilisation.

---

## §8 Pagination / Tri / Filtres

- **Tri** : par type, puis par date d'ajout.
- **Filtres** : par type, par usage (utilisé / non utilisé), par format.
- **Pagination** : grille avec virtualisation au-delà de ~100 actifs (S8).

---

## §9 Transitions entre écrans

- entrée depuis `design-space`, `brand-dna`, `charte`, ou tout studio (piocher un actif) ;
- sortie vers `logo-studio` (éditer un logo), `brand-impact` (impact d'une suppression), `design-versions` ;
- retour arrière : conserve le filtre et la sélection (C5).

---

## §10 Thèmes (10 + 3 presets, par couche — AD-17)

Les **vignettes** montrent les actifs **de la marque** (couleurs réelles), pas les
tokens Aurora. Les panneaux et contrôles utilisent les tokens `packages/ui`. Le
preset High-Contrast n'altère pas les aperçus d'actifs.

---

## §11 Accessibilité (WCAG AA)

- chaque vignette est focusable avec un `aria-label` (nom + type) ;
- les palettes portent un **libellé** (nom + valeur), pas seulement une couleur ;
- le placeholder « aperçu indisponible hors-ligne » est un texte, pas une image vide ;
- cibles ≥ 44 px, focus visible, `reduced-motion` respecté.

---

## §12 Offline (classe = `hybrid`)

| Capacité | Offline |
|---|---|
| Lister les actifs (métadonnées) | ✅ local (AD-7) |
| Voir palettes/typographies (valeurs) | ✅ local |
| Aperçu des binaires non mis en cache | ⚠️ placeholder honnête (pas de vignette factice) |
| **Ajouter** un actif (upload R2) | ❌ `online-required` — désactivé avec motif |

---

## §13 Occurrences du logo (S9)

Le logo **Aurora** apparaît dans la TopBar selon la matrice S9. La bibliothèque
**contient** les logos de marque de l'utilisateur (`Artifact`) — elle ne contient
jamais le logo Aurora comme actif réutilisable.

---

## §14 Questions ouvertes (OQ)

| # | Question | Verdict |
|---|---|---|
| OQ-7 | Les actifs sont-ils des entités neuves ? | **TRANCHÉE** : non — `Artifact` (binaires) ou valeurs de `BrandVisualIdentity` (palettes/typos) — OQ-7 |
| OQ-9 | Où vivent les valeurs d'actifs ? | **TRANCHÉE** : dans l'`ArtifactFile` / le Brand DNA ; `blocks` reste `md` (OQ-9) |
| OQ-60 | La bibliothèque est-elle par marque, ou globale à l'utilisateur ? | **DÉRIVÉE** : par marque (route `/design/:projectId/assets`) — les actifs sont rattachés à un `Project` (OQ-7) ; une vue globale serait une projection, pas un SSoT |
| OQ-61 | Un actif peut-il être partagé entre plusieurs marques ? | **À TRANCHER** au lot L11 — la référence ne le spécifie pas ; par défaut, non (chaque actif appartient à une marque) |

---

## §15 Responsive (cadre v1 — `docs/frontend/spec-template-v1.md`)

Gabarit : **Liste + détail** (`web-shell-and-responsive.md` §2.3) — la « liste »
est une **grille**.

| Breakpoint | Layout | Navigation | Notes |
|---|---|---|---|
| base → `md` (< 768 px) | 1 colonne (grille 2 col.), détail en **overlay `O`** | tab bar basse | consultation (Phase 4) |
| `md` → `lg` (768–1023 px) | grille 3 col. + détail en overlay | rail latéral | — |
| **`lg+` (≥ 1024 px)** | **2 panneaux** : grille (4 col.) \| détail ; `xl`+ ajoute l'inspecteur | panneau latéral | cible web/desktop |

**Règle** (§2.3 règle 2) : overlay sous `lg`, panneau à `lg`+.

> **OQ-4** : le seuil de bascule overlay→panneau (`lg` proposé) n'est pas ratifié globalement.

---

## §16 Critères de readiness (avant de coder)

| # | Critère | État | Preuve |
|---|---|---|---|
| R1 | Owner identifié | ✅ | Design Space Pro (famille **Artifacts**) |
| R2 | Ligne de catalogue | ⏳ à ajouter : `design.assets` (lot L11) |
| R3 | Types SSoT déclarés | ✅ | `BrandVisualIdentity` (`entities-design.ts:74`), `Artifact`/`ArtifactFile` (`entities-artifact.ts:10`/`:50`) |
| R4 | Spec §1–§14 complète | ✅ | ce document |
| R5 | 6 états S6 couverts | ✅ | §4 |
| R6 | États §6.1 couverts | ✅ | §4 (`en-cours`, `échec`, `terminé`, `404`) |
| R7 | Classe offline déclarée | ✅ | `hybrid` (§12) |
| R8 | Événements | **`ArtifactGenerated`** (`events.ts:125`) à l'ajout d'un actif binaire |
| R9 | Permissions | aucune (R2 presigned, AD-3) |
| R10 | Entrée de nav déclarée | ✅ | depuis `design-space`, `brand-dna`, `charte` |
| R11 | Tokens identifiés | ✅ | §3 (aucune valeur brute) |
| R12 | Contrat de données | ✅ | actifs = `Artifact` + valeurs de `BrandVisualIdentity` ; single-writer **Artifact** (AD-7) |
| R13 | OQ bloquantes fermées | ✅ | OQ-7/9/60 tranchées ; OQ-61 (partage inter-marques) **non bloquante** |

**Verdict readiness** : `NOT_READY` jusqu'à L11 (dépendance `design-engines` + R2, planifiée).

---

## §17 Critères de succès (pour déclarer « fait »)

| # | Critère | Mesure |
|---|---|---|
| S1 | Données réelles | les actifs viennent du store local / Brand DNA ; aucun actif codé en dur |
| S2 | 6 états prouvés | §4 — 1 story + 1 test par état |
| S3 | 404/feature-disabled | §4 — pattern global, jamais un 404 brut |
| S4 | Offline vérifié | liste locale ; binaires non cachés = placeholder honnête |
| S5 | Retour arrière | tuer/relancer → actifs intacts |
| S6 | Isolation utilisateur | un autre utilisateur ne lit pas les actifs (RLS) |
| S7 | Tokens-only | 0 valeur brute (les couleurs d'actifs sont des **données**) |
| S8 | A11y AA | vignettes focusables, palettes avec libellé, placeholder textuel |
| S9 | Responsive | 3 paliers conformes à §15 |
| S10 | Gate vert | typecheck + lint + tests |
| S11 | Aucune régression | suites existantes vertes |
| S12 | **Pas de duplication** | ajouter un actif existant propose la **référence**, pas une copie (test) |

---

## §18 Critères de QA (9 classes — `docs/testing/matrix.md` §1)

| Classe | Question | Preuve attendue |
|---|---|---|
| Unitaire (domaine) | résolution des valeurs de `BrandVisualIdentity` correcte ? | Vitest sur `packages/domain` |
| Intégration | les actifs se relisent-ils après coupure ? | test PowerSync sur `artifacts` |
| Contrat | `ArtifactGenerated` après upload (F-06) ? | test AD-9 |
| E2E | « ajouter un actif → le réutiliser dans un document » | Playwright |
| Failure | upload échoué → aucun actif fantôme | test failure |
| Permission | n/a | — |
| Offline | liste locale ; placeholder honnête | test offline |
| Recovery | relance froide → actifs intacts | test recovery |
| Plateforme | n/a (web) | — |

---

## §19 Couverture de tests exigée (seuils + DoD)

| Périmètre | Seuil |
|---|---|
| `packages/domain` (identité visuelle) | **≥ 80 %** lignes |
| `design.assets` | ≥ 1 test par classe applicable (§18) |
| Région « grille d'actifs » | **6 tests d'état S6** + états §6.1 applicables |
| Écran `design-assets` | ≥ 1 story (`Defaut`+`vide`+`chargement`+`erreur`) + ≥ 1 test `play` |
| Non-duplication | ≥ 1 test : ajouter un actif existant propose la référence |

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
| OQ-62 | La bibliothèque expose-t-elle les **tokens Aurora** comme actifs réutilisables ? | **DÉRIVÉE** : non — les tokens Aurora sont l'habillage du studio (AD-17) ; `BrandDigitalIdentity.designTokens` (`entities-design.ts:98`) décrit les tokens **de la marque de l'utilisateur**, un espace distinct |
| OQ-63 | Les actifs sont-ils versionnés comme les livrables ? | **DÉRIVÉE** : les actifs **binaires** (logos) sont des `Artifact` versionnables ; les **valeurs** (palettes/typos) suivent la version du Brand DNA — cohérent avec `design-versions` |
