# Écran — LOGO Studio (`logo-studio`)

Module : **Design Space Pro** · Route : `/design/:projectId/logo/:artifactId` · Statut : **neuf** ·
SSoT écran : `Aurora-Reference-Produit-Fonctionnelle-v1.1.md` §6.4 (chaîne technique LOGO : pipeline, règles de représentation, périmètre initial),
§6.7 (édition et interaction), §10.4 étape 3 · SSoT moteur : `LOGO.md` §5 (schémas), §6 (règles), §7 (pièges), §9 (décisions socle) ·
SSoT périmètre : `docs/frontend/design-space-scope.md` §3 (écran 4) · SSoT arbitrages : `docs/frontend/design-space-oq-rulings.md` OQ-8, OQ-12 ·
Gabarit : **Éditeur** (`web-shell-and-responsive.md` §2.3) · Cadre : `docs/frontend/spec-template-v1.md` §15–§19.

---

## §1 Psychologie du designer

| Dimension | Valeur |
|---|---|
| Objectif utilisateur | Produire un **logo vectoriel structuré et modifiable** — pas une image pixelisée difficile à reprendre (§6.4 Objectif). |
| Contexte (appareil/moment/réseau) | Web/desktop, grand écran, session longue. Le moteur LOGO est **local et déterministe** (AD-3) : composer/canonicaliser/valider ne requiert **aucune** connexion. |
| Fréquence | Rare et concentrée — à la création de la marque, puis lors des révisions. |
| État émotionnel cible | **Maître de la géométrie.** Le créatif doit voir la structure (calques, ordre de rendu) et pouvoir éditer un objet sans casser la composition. |
| Erreur la plus probable | **Dépendre de l'ordre d'apparition des paths** (§7.7) : sans ordre de rendu explicite, l'édition et l'interpolation deviennent instables. Ou éditer un « logo » qui est en fait une image raster importée. |
| Ce que l'écran RÉSOUT | La question « comment ce logo est-il construit, et comment je le modifie sans le détruire ? » — structure sémantique visible, calques éditables individuellement. |
| Invariant | **§6.4 / LOGO.md §5.5 / OQ-12** : le logo est du **SVG structuré** (graphe de calques + géométrie continue), pas une toile Fabric.js. L'écran **ne redéfinit aucun type de domaine** ; il consomme le contrat des moteurs (`packages/design-engines`, créé au lot du premier moteur — OQ-8). |

---

## §2 Zones de l'écran

| Zone | Contenu | SSoT |
|---|---|---|
| TopBar | Nom du livrable + `Badge` « source SVG » + version du Brand DNA utilisée | §6.8 ; `Artifact` |
| Panneau gauche (calques) | **Graphe de calques** : liste ordonnée (fond → premier plan), nom sémantique, visibilité, verrou | `LOGO.md` §5.2 |
| Toile (plein écran) | Rendu du logo + sélection d'un objet ; canvas canonique | `LOGO.md` §6.1 (canon 256 ou 512) |
| Panneau droit (inspecteur) | Attributs de l'objet sélectionné (géométrie, remplissage, trait, opacité) | `LOGO.md` §5.7 ; §6.4 |
| Barre d'action | « Canonicaliser » · « Optimiser (SVGO) » · « Comparer avant/après » · « Exporter » | §6.4 étapes 6–9 |
| Bandeau de rendu | Rendu intermédiaire pour inspection (Render-in-the-Loop) | `LOGO.md` §5.3 |

---

## §3 Éléments de l'écran (table 100 % de la zone)

| Élément | Composant DS | Lib (`ui-libraries.md` §1) | Tokens (AD-17) | Variante responsive | Source SSoT |
|---|---|---|---|---|---|
| TopBar livrable | TopBar | shadcn (pattern header) | `text.xl`, `color.neutral.900/100` | même ; panneaux repliés < `lg` | §6.8 |
| `Badge` « source SVG » | Badge (tonal) | shadcn Badge | `color.info`, `color.info-surface`, `font.mono` | même | §6.9 (source ≠ distribution) |
| Liste des calques | `ListItem` réordonnable | shadcn List + drag handle | `row.min-height=44`, `text.sm`, `border` | panneau repliable | `LOGO.md` §5.2 |
| Poignée de réordonnancement | IconButton (`GripVertical`) | shadcn Button ghost | `icon.size=20`, `touch.target=44` | même | `LOGO.md` §6.3 (ordre explicite) |
| Toggle visibilité calque | IconButton (`Eye`/`EyeOff`) | shadcn Button ghost | `icon.size=20`, `text-muted` (masqué) | même | `LOGO.md` §5.1 (`vi`) |
| **Toile SVG** | Canvas (renderer SVG du DS) | renderer `packages/ui` (AD-10) | `surface`, `border`, `radius.md` | plein écran dès `md` | §6.4 ; AD-10 |
| Sélection d'objet | Halo de sélection | — | `accent-primary`, `focus-ring` 2px | même | §6.7 |
| Inspecteur géométrie | Champs numériques | shadcn Input (number) | `font.mono`, `text.sm`, `border` | panneau repliable | `LOGO.md` §5.7 |
| Bouton « Canonicaliser » | Button secondary | shadcn Button | `color.brand.primary` | sticky bas | `LOGO.md` §6.1 |
| Bouton « Optimiser (SVGO) » | Button secondary | shadcn Button | `color.brand.primary` | sticky bas | `LOGO.md` §9.6 |
| Bouton « Comparer avant/après » | Button ghost | shadcn Button | `text-secondary` | sticky bas | §6.4 étape 7 |
| Bouton « Exporter » | Button **primary** (**seul** CTA) | shadcn Button | `color.brand.primary`, `touch.target=48` | sticky bas | §6.9 ; `design-exports` |
| Bandeau rendu intermédiaire | Card + image | shadcn Card | `surface`, `shadow.2` | colonne < `lg` | `LOGO.md` §5.3 |
| État `loading` | Skeleton (forme de la toile) | shadcn Skeleton | `color.skeleton`, pulse | même | §4 |

> **AD-14 (par analogie)** : « Exporter » est la **seule** action primaire. Les
> transformations (canonicaliser, optimiser) sont `secondary` : ce sont des étapes,
> pas des décisions.

---

## §4 États de l'écran (6 états S6 + états §6.1)

| État | Déclencheur | Rendu | CTA |
|---|---|---|---|
| `loading` | chargement du SVG source local | Skeleton de la toile | aucun |
| `empty` | projet sans logo | EmptyState : « Aucun logo. Générez une première structure. » | « Générer un logo » |
| `success` | logo chargé | toile + calques + inspecteur | « Exporter » |
| `error` | lecture locale / rendu impossible | Callout danger + « Réessayer » | Réessayer |
| `offline` | réseau coupé | **tout reste actif** (moteur local, AD-3) ; badge « Hors-ligne » informatif | Exporter reste actif (source locale) |
| `killed` | app tuée puis relancée | Skeleton + re-sync ; édition non enregistrée **signalée** | Reprendre |
| `404` | livrable inexistant ou non autorisé | pattern 404 global (**jamais** un 404 brut) | Retour |
| `en-cours` | canonicalisation / optimisation en cours | progression par étape (pipeline §6.4), **la toile reste affichée** | Annuler |
| `échec` | élément **dégénéré** rejeté (rendu vide, path vide, hors-canevas) | Callout danger + objet fautif surligné ; **rien** n'est silencieusement supprimé | Corriger / Réessayer |
| `terminé` | export prêt | Toast 3 s + entrée dans `design-exports` | — |

> **Point dur** : le rejet d'un élément dégénéré (§6.4 étape 5) est **visible** —
> jamais une suppression silencieuse. Un logo qui « change tout seul » après
> optimisation est le défaut que la comparaison avant/après (§6.4 étape 7) existe
> pour empêcher.

---

## §5 Micro-interactions (GPU-only, 150–250 ms, smooth)

| Interaction | Effet | Durée |
|---|---|---|
| Sélection d'un objet sur la toile | halo de sélection | 150 ms |
| Réordonnancement d'un calque | déplacement + réordonnancement (transform only) | 200 ms |
| Bascule visibilité d'un calque | opacité du calque 1→0 | 150 ms |
| Canonicalisation / optimisation | barre de progression déterministe | 200 ms |
| Comparaison avant/après | fondu entre les deux rendus | 250 ms |

`reduced-motion` : transitions remplacées par un changement d'état instantané.

---

## §6 Modals / BottomSheets

| Modal | Déclencheur | Contenu |
|---|---|---|
| Comparaison avant/après | bouton « Comparer » | deux rendus côte à côte + liste des différences de paths/attributs (§6.4 étape 7) |
| Confirmation d'écrasement | « Optimiser » sur un objet `locked` | « Cet objet est verrouillé. Le déverrouiller ? » (§6.7) |
| Sélection de variante | « Décliner » | renvoi vers `logo-variants` (ratios, palettes) |

---

## §7 Formulaires

L'inspecteur édite les attributs d'un calque (géométrie, remplissage, trait,
opacité). **Règles** (`LOGO.md` §5.7, §6) :
- géométrie **continue** : jamais de quantisation en bins (§7.5) ;
- courbes émises en **Bézier cubiques**, jamais en arc elliptique `A` (§6.1, §7.9) ;
- contre-formes émises en `{outline, fill, erase}` (règle de remplissage non-nulle, §6.2) ;
- les objets utiles restent **individuellement éditables** (§6.4 règles de représentation).

---

## §8 Pagination / Tri / Filtres

Pas de pagination (éditeur). **Tri** de la liste de calques = **ordre de rendu**
(bas → haut), explicite et manipulable (`o_j`, AFFICHE §5.1 / LOGO §6.3). Un
**filtre** utile : « afficher seulement les calques visibles » et « masquer les
contours de construction ».

---

## §9 Transitions entre écrans

- entrée depuis `brand-dna` (l'identité visuelle produit un `Artifact`) ou `design-space` ;
- sortie vers `logo-variants` (déclinaisons), `design-validator` (violations), `design-exports` (export) ;
- retour arrière : conserve la sélection et le zoom de la toile (C5).

---

## §10 Thèmes (10 + 3 presets, par couche — AD-17)

La **toile** reste sur un fond neutre (`bg` clair/sombre, G-H2) pour ne pas fausser
la perception des couleurs du logo. Les couleurs du logo viennent de la **palette de
la charte** (héritage de la marque), pas des tokens Aurora. Les panneaux et
contrôles utilisent les tokens `packages/ui` (AD-17).

---

## §11 Accessibilité (WCAG AA)

- chaque calque est un élément focusable, ordonné au clavier (réordonnancement
  via boutons haut/bas, pas seulement par glisser) ;
- sélection et édition utilisables **au clavier et au pointeur** (§4.3 C3) ;
- les icônes seules (visibilité, verrou) portent un `aria-label` ;
- cibles ≥ 44 px, focus visible, `reduced-motion` respecté.

---

## §12 Offline (classe = `hybrid`)

| Capacité | Offline |
|---|---|
| Ouvrir et éditer un logo (SVG structuré) | ✅ local (moteur déterministe, AD-3) |
| Canonicaliser / optimiser / valider | ✅ local (aucune clé, aucun réseau) |
| Comparer avant/après | ✅ local |
| **Générer** une structure depuis une intention | ❌ `online-required` — désactivé avec motif |
| Exporter (upload R2) | ❌ `online-required` — file d'attente ; la **source** reste locale |

> Le moteur LOGO est **local et déterministe** (`design-space-integration.md` §7,
> AD-3) : seules la génération et l'export exige le serveur.

---

## §13 Occurrences du logo (S9)

Le logo **Aurora** apparaît dans la TopBar selon la matrice S9. Le **logo édité**
est un `Artifact` de l'utilisateur, affiché sur la toile — jamais confondu avec le
logo Aurora, jamais recréé dans `src/`. La variante monochrome (état dégradé S9)
n'est pas utilisée ici : l'éditeur exige les couleurs réelles.

---

## §14 Questions ouvertes (OQ)

| # | Question | Verdict |
|---|---|---|
| OQ-8 | Un package `design-engines` ou un par moteur ? | **TRANCHÉE** : **un** package, créé avec le premier moteur (LOGO) — OQ-8 |
| OQ-12 | Moteur d'édition du LOGO ? | **TRANCHÉE** : **pas Fabric.js** pour le LOGO — SVG structuré en données (OQ-12) |
| OQ-25 | Canon SVG : `256` ou `512` ? | **DÉFAUT-RÉVERSIBLE** : un seul canon retenu par le moteur ; la valeur exacte est un détail d'implémentation (LOGO.md §6.1 recommande 512 si SVGFloat, 256 sinon) |
| OQ-26 | La correction optique (§6.7 LOGO.md, `[À ÉVALUER]`) est-elle dans le périmètre v1 ? | **DÉRIVÉE** : **non** — marquée `[À ÉVALUER]`, à tester empiriquement ; le périmètre initial est wordmarks, monogrammes, icônes simples |

---

## §15 Responsive (cadre v1 — `docs/frontend/spec-template-v1.md`)

Gabarit : **Éditeur** (`web-shell-and-responsive.md` §2.3) — **plein écran dès `md`**.

| Breakpoint | Layout | Navigation | Notes |
|---|---|---|---|
| base → `md` (< 768 px) | 1 colonne, **toile `T`** plein écran ; calques/inspecteur en `Sheet` | tab bar basse | édition limitée (Phase 4) ; la toile reste manipulable |
| `md` → `lg` (768–1023 px) | toile `T` + rail de calques | rail latéral | — |
| **`lg+` (≥ 1024 px)** | toile `T` + panneau calques + inspecteur ; `xl`+ ajoute le panneau de validation | panneau latéral | cible web/desktop (Phase 1–2) |

**Règle** (§2.3 règle 3) : l'éditeur est plein écran dès `md` — il ne tient pas
dans une colonne. Les panneaux de calques et d'inspection sont **repliables** et
leur état est persisté (§4.3 C2).

> **OQ-4** : le seuil de bascule overlay→panneau (`lg` proposé) n'est pas ratifié globalement.

---

## §16 Critères de readiness (avant de coder)

| # | Critère | État | Preuve |
|---|---|---|---|
| R1 | Owner identifié | ✅ | Design Space Pro (famille **Artifacts**) |
| R2 | Ligne de catalogue | ⏳ à ajouter : `design.logo` (lot L10) |
| R3 | Types SSoT déclarés | ✅ | `Artifact`/`ArtifactFile` (`entities-artifact.ts:10`/`:50`) ; le contrat du moteur LOGO vit dans `packages/design-engines` (créé au lot L10, OQ-8) |
| R4 | Spec §1–§14 complète | ✅ | ce document |
| R5 | 6 états S6 couverts | ✅ | §4 |
| R6 | États §6.1 couverts | ✅ | §4 (`en-cours`, `échec`, `terminé`, `404`) |
| R7 | Classe offline déclarée | ✅ | `hybrid` (§12) |
| R8 | Événements | **`ArtifactGenerated`** (post-upload R2, `events.ts:125`) — seul producteur : `markUploaded` (`packages/artifact/src/commands.ts:179`) |
| R9 | Permissions | aucune (fichiers via R2 presigned, AD-3) |
| R10 | Entrée de nav déclarée | ✅ | section **C. Créer** ; depuis `design-space`/`brand-dna` |
| R11 | Tokens identifiés | ✅ | §3 (aucune valeur brute) |
| R12 | Contrat de données | ✅ | source = `ArtifactFile` ; single-writer **Artifact** (AD-7) ; l'écran **n'écrit aucune table** d'autrui |
| R13 | OQ bloquantes fermées | ✅ | OQ-8/12/25/26 tranchées (§14) |

**Verdict readiness** : `NOT_READY` jusqu'à L10 — R3 dépend de la création de
`packages/design-engines` (OQ-8 : créé **avec** le premier moteur). C'est un
manque **planifié**, pas une OQ ouverte.

---

## §17 Critères de succès (pour déclarer « fait »)

| # | Critère | Mesure |
|---|---|---|
| S1 | Données réelles | le SVG vient du `ArtifactFile` ; aucun SVG codé en dur |
| S2 | 6 états prouvés | §4 — 1 story + 1 test par état |
| S3 | 404/feature-disabled | §4 — pattern global, jamais un 404 brut |
| S4 | Offline vérifié | édition + canonicalisation locales ; génération/export désactivés avec motif |
| S5 | Retour arrière | tuer/relancer → source intacte |
| S6 | Isolation utilisateur | un autre utilisateur ne lit pas le livrable (RLS sur `artifacts`) |
| S7 | Tokens-only | 0 valeur brute |
| S8 | A11y AA | calques focusables, réordonnancement clavier, `aria-label`, 44 px |
| S9 | Responsive | 3 paliers conformes à §15 |
| S10 | Gate vert | typecheck + lint + tests |
| S11 | Aucune régression | suites existantes vertes |
| S12 | **Non-régression visuelle** | comparaison avant/après optimisation : aucune régression (§6.4 étape 7 ; §12.4) |

---

## §18 Critères de QA (9 classes — `docs/testing/matrix.md` §1)

| Classe | Question | Preuve attendue |
|---|---|---|
| Unitaire (domaine) | canonicalisation / ordre de rendu corrects ? | Vitest sur `packages/design-engines` (moteur LOGO) |
| Intégration | la source se relit-elle après coupure ? | test PowerSync sur `artifacts` |
| Contrat | `ArtifactGenerated` émis **après** upload R2 (F-06) ? | test AD-9 producer/consumer |
| E2E | « générer → éditer → exporter » | Playwright web |
| Failure | élément dégénéré → rejet visible, pas de suppression | test failure |
| Permission | n/a | — |
| Offline | édition locale OK, export désactivé | test offline |
| Recovery | relance froide → source intacte | test recovery |
| Plateforme | n/a (web) | — |

---

## §19 Couverture de tests exigée (seuils + DoD)

| Périmètre | Seuil |
|---|---|
| `packages/design-engines` (moteur LOGO) | **≥ 80 %** lignes |
| `design.logo` | ≥ 1 test par classe applicable (§18) |
| Région « toile » | **6 tests d'état S6** + états §6.1 applicables |
| Écran `logo-studio` | ≥ 1 story (`Defaut`+`vide`+`chargement`+`erreur`) + ≥ 1 test `play` |
| Non-régression | ≥ 1 exemple représentatif avec comparaison avant/après (§12.4) |

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
| OQ-27 | Le logo vit-il dans `canvas_sessions.blocks` (markdown) ou dans l'`ArtifactFile` ? | **TRANCHÉE** : dans l'`ArtifactFile` — OQ-9 (les calques/la géométrie ne sont **pas** du markdown ; `blocks` reste `md`, AD-16b) |
| OQ-28 | Fabric.js peut-il servir à la toile du LOGO ? | **TRANCHÉE** : **non** — OQ-12 ; Fabric.js est réservé à AFFICHE/Document |
