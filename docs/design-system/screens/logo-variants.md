# Écran — Déclinaisons de logo (`logo-variants`)

Module : **Design Space Pro** · Route : `/design/:projectId/logo/:artifactId/variants` · Statut : **neuf** ·
SSoT écran : `Aurora-Reference-Produit-Fonctionnelle-v1.1.md` §6.4 (« les déclinaisons multi-ratios et multi-palettes demeurent des capacités à implémenter/évaluer »),
§6.7 (aperçu à différents formats), §12.2 · SSoT moteur : `LOGO.md` §3.8 (déclinaisons par contrôle en inférence), §6.6 (contrôles de déclinaison — `[À ÉVALUER]`) ·
SSoT périmètre : `docs/frontend/design-space-scope.md` §3 (écran 5) · SSoT arbitrages : `docs/frontend/design-space-oq-rulings.md` OQ-12 ·
Gabarit : **Liste + détail** (`web-shell-and-responsive.md` §2.3) · Cadre : `docs/frontend/spec-template-v1.md` §15–§19.

---

## §1 Psychologie du designer

| Dimension | Valeur |
|---|---|
| Objectif utilisateur | Voir toutes les **déclinaisons** d'un logo (ratios, palettes, complexité) et vérifier qu'aucune ne casse la marque. |
| Contexte (appareil/moment/réseau) | Web/desktop. Les déclinaisons sont **dérivées localement** du logo source (moteur déterministe, AD-3). |
| Fréquence | Après la création d'un logo, avant chaque production (charte, affiche). |
| État émotionnel cible | **Rassuré sur la cohérence.** Le créatif voit d'un coup d'œil que chaque déclinaison respecte les règles (fond clair/foncé, taille minimale, espace de protection). |
| Erreur la plus probable | Croire qu'une déclinaison est **générée automatiquement** alors que certaines (correction optique, emblèmes complexes) sont `[À ÉVALUER]` — l'écran doit distinguer ce qui est **produit** de ce qui est **à évaluer**. |
| Ce que l'écran RÉSOUT | La question « ce logo tient-il partout ? » — chaque déclinaison présentée dans son contexte d'usage réel. |
| Invariant | **§6.4 / OQ-9** : les déclinaisons sont des **variantes de source** (graphe de calques + thème), stockées dans l'`ArtifactFile` — **pas** dans `canvas_sessions.blocks` (qui reste `md`, AD-16b). Aucun type de domaine redéclaré. |

---

## §2 Zones de l'écran

| Zone | Contenu | SSoT |
|---|---|---|
| TopBar | Nom du logo source + `Badge` « n déclinaisons » | §6.8 |
| Panneau gauche (liste) | Déclinaisons par **ratio** (1:1, 4:1) × **palette** (fond clair, fond foncé) × **complexité** (icône seule, icône + détail) | `LOGO.md` §6.6 |
| Détail (panneau droit) | Aperçu grand format + contexte d'usage + règles appliquées (taille min., espace de protection) | §6.2 ; `BrandUsageRules` |
| Bandeau d'avertissement | Déclinaisons **`[À ÉVALUER]`** explicitement marquées | `LOGO.md` §6.6 |
| Barre d'action | « Exporter la sélection » (**seul** CTA) · « Ajouter une déclinaison » (secondary) | §6.9 |

---

## §3 Éléments de l'écran (table 100 % de la zone)

| Élément | Composant DS | Lib (`ui-libraries.md` §1) | Tokens (AD-17) | Variante responsive | Source SSoT |
|---|---|---|---|---|---|
| TopBar | TopBar | shadcn (pattern header) | `text.xl`, `color.neutral.900/100` | même | §6.8 |
| `Badge` « n déclinaisons » | Badge (tonal) | shadcn Badge | `color.info`, `color.info-surface`, `font.mono` | même | §6.8 |
| Liste des déclinaisons | `ListItem` + vignette | shadcn List | `row.min-height=64`, `text.sm`, `border` | liste < `lg`, détail en overlay | §6.4 |
| Axe ratio (1:1 / 4:1) | SegmentedControl | shadcn Tabs | `color.brand.primary` (actif) | même | `LOGO.md` §6.6 |
| Axe palette (clair/foncé) | SegmentedControl | shadcn Tabs | `color.brand.primary` (actif) | même | `LOGO.md` §6.6 |
| Axe complexité | SegmentedControl | shadcn Tabs | `color.brand.primary` (actif) | même | `LOGO.md` §6.6 |
| Aperçu grand format | Card + renderer SVG | renderer `packages/ui` (AD-10) | `surface`, `border`, `radius.md` | plein < `lg` | §6.7 |
| Contexte d'usage | `KeyValueList` | shadcn Card | `text.muted` (clés), `text-primary` (valeurs) | repliable | §6.2 |
| Badge `[À ÉVALUER]` | Badge warning | shadcn Badge | `color.warning`, `color.warning-surface` | même | `LOGO.md` §6.6 |
| Bouton « Exporter la sélection » | Button **primary** (**seul** CTA) | shadcn Button | `color.brand.primary`, `touch.target=48` | sticky bas | §6.9 |
| Bouton « Ajouter une déclinaison » | Button secondary | shadcn Button | `color.brand.primary` | sticky bas | §6.4 |
| État `loading` | Skeleton (forme de la liste) | shadcn Skeleton | `color.skeleton`, pulse | même | §4 |

---

## §4 États de l'écran (6 états S6 + états §6.1)

| État | Déclencheur | Rendu | CTA |
|---|---|---|---|
| `loading` | dérivation des déclinaisons locales | Skeleton de la liste | aucun |
| `empty` | logo sans déclinaison | EmptyState : « Aucune déclinaison. Générez les ratios et palettes. » | « Générer les déclinaisons » |
| `success` | déclinaisons prêtes | liste + détail | « Exporter la sélection » |
| `error` | dérivation locale impossible | Callout danger + « Réessayer » | Réessayer |
| `offline` | réseau coupé | **tout reste actif** (moteur local, AD-3) ; badge « Hors-ligne » informatif | Export (R2) en file d'attente |
| `killed` | app tuée puis relancée | Skeleton + re-sync | Reprendre |
| `404` | logo source inexistant ou non autorisé | pattern 404 global (**jamais** un 404 brut) | Retour |
| `en-cours` | dérivation d'une nouvelle déclinaison | progression, la liste existante reste affichée | Annuler |
| `échec` | déclinaison impossible (ratio hors périmètre, élément dégénéré) | Callout danger + motif ; **aucune** déclinaison ajoutée | Réessayer |
| `terminé` | export prêt | Toast 3 s + entrée dans `design-exports` | — |

> **Point dur** : une déclinaison **`[À ÉVALUER]`** (correction optique, emblèmes
> complexes — `LOGO.md` §6.6/§6.7) n'est **jamais** présentée comme une capacité
> acquise. Elle porte un badge explicite. Ne jamais afficher un format ou une
> capacité comme disponible avant le test réel (§6.9).

---

## §5 Micro-interactions (GPU-only, 150–250 ms, smooth)

| Interaction | Effet | Durée |
|---|---|---|
| Changement de déclinaison | fondu + translation 8 px | 180 ms |
| Changement d'axe (ratio/palette/complexité) | re-rendu de la grille | 200 ms |
| Sélection multiple (export) | surbrillance des vignettes | 150 ms |
| Export de la sélection | Toast + progression | 200 ms |

`reduced-motion` : transitions remplacées par un changement d'état instantané.

---

## §6 Modals / BottomSheets

| Modal | Déclencheur | Contenu |
|---|---|---|
| Ajout de déclinaison | « Ajouter une déclinaison » | choix ratio × palette × complexité, avec avertissement si la combinaison est `[À ÉVALUER]` |
| Aperçu plein écran | tap sur une vignette | rendu agrandi + contexte d'usage |

---

## §7 Formulaires

Formulaire d'ajout de déclinaison : `ratio`, `palette` (fond clair/foncé),
`complexité` (icône seule / icône + détail). Les valeurs disponibles sont
contraintes par `LOGO.md` §6.6 — toute combinaison hors périmètre est **signalée**,
jamais silencieusement produite.

---

## §8 Pagination / Tri / Filtres

- **Tri** : par ratio, puis palette, puis complexité (ordre stable).
- **Filtres** : « seulement les déclinaisons validées », « seulement les `[À ÉVALUER]` ».
- **Pagination** : le nombre de déclinaisons est petit (ratios × palettes ×
  complexités) — scroll natif, pas d'AG Grid.

---

## §9 Transitions entre écrans

- entrée depuis `logo-studio` (« Décliner ») ;
- sortie vers `design-exports` (export de la sélection), `design-validator` (violations) ;
- retour arrière : conserve la déclinaison sélectionnée et le filtre (C5).

---

## §10 Thèmes (10 + 3 presets, par couche — AD-17)

Les **aperçus** de logo se font sur les fonds **de la charte** (clair/foncé de la
marque), pas sur les tokens Aurora. Les panneaux et contrôles utilisent les tokens
`packages/ui`. Le preset **High-Contrast** n'altère pas les aperçus (qui doivent
montrer les vraies couleurs de la marque).

---

## §11 Accessibilité (WCAG AA)

- chaque vignette de déclinaison est focusable avec un `aria-label` (ratio +
  palette + complexité) ;
- le badge `[À ÉVALUER]` porte un **texte**, pas seulement une couleur ;
- sélection multiple utilisable au clavier ;
- cibles ≥ 44 px, focus visible, `reduced-motion` respecté.

---

## §12 Offline (classe = `hybrid`)

| Capacité | Offline |
|---|---|
| Voir les déclinaisons existantes | ✅ local (AD-7) |
| Dériver une nouvelle déclinaison | ✅ local (moteur déterministe, AD-3) |
| **Générer** une structure depuis une intention | ❌ `online-required` — désactivé avec motif |
| Exporter | ❌ `online-required` — file d'attente ; les sources restent locales |

---

## §13 Occurrences du logo (S9)

Le logo **Aurora** apparaît dans la TopBar selon la matrice S9. Les déclinaisons
affichées sont des `Artifact` de l'utilisateur (variantes du logo de marque) ;
elles ne sont jamais confondues avec le logo Aurora ni recréées dans `src/`.

---

## §14 Questions ouvertes (OQ)

| # | Question | Verdict |
|---|---|---|
| OQ-12 | Moteur d'édition ? | **TRANCHÉE** : SVG structuré en données (pas Fabric.js pour le LOGO) — OQ-12 |
| OQ-29 | Les déclinaisons sont-elles des `Artifact` distincts, ou des variantes d'un même `Artifact` ? | **DÉRIVÉE** : variantes d'un même `Artifact` (fichiers dans `artifact_files`, `entities-artifact.ts:50`) — créer N artefacts pour N ratios multiplierait les lignes sans bénéfice (AD-6) |
| OQ-30 | Le périmètre des déclinaisons v1 : ratios + palettes seulement, ou complexité incluse ? | **DÉFAUT-RÉVERSIBLE** : ratios + palettes **et** complexité par troncature (`LOGO.md` §6.6), la complexité restant `[À ÉVALUER]` |
| OQ-31 | « Aperçu du rendu à différents formats » (§6.7) fait-il partie de cet écran ou de `design-exports` ? | **DÉRIVÉE** : les deux — aperçu **visuel** ici, **vérification d'export** dans `design-exports` (§6.9) |

---

## §15 Responsive (cadre v1 — `docs/frontend/spec-template-v1.md`)

Gabarit : **Liste + détail** (`web-shell-and-responsive.md` §2.3).

| Breakpoint | Layout | Navigation | Notes |
|---|---|---|---|
| base → `md` (< 768 px) | 1 colonne, détail en **overlay `O`** | tab bar basse | grille de vignettes + détail plein écran |
| `md` → `lg` (768–1023 px) | 1 colonne + détail en overlay | rail latéral | — |
| **`lg+` (≥ 1024 px)** | **2 panneaux** : liste de déclinaisons \| détail ; `xl`+ ajoute l'inspecteur | panneau latéral | cible web/desktop |

**Règle** (§2.3 règle 2) : le détail est un **overlay sous `lg`**, un **panneau à
`lg`+** — même composant, conteneur différent.

> **OQ-4** : le seuil de bascule overlay→panneau (`lg` proposé) n'est pas ratifié globalement.

---

## §16 Critères de readiness (avant de coder)

| # | Critère | État | Preuve |
|---|---|---|---|
| R1 | Owner identifié | ✅ | Design Space Pro (famille **Artifacts**) |
| R2 | Ligne de catalogue | ⏳ à ajouter : `design.logo-variants` (lot L10) |
| R3 | Types SSoT déclarés | ✅ | `Artifact`/`ArtifactFile` (`entities-artifact.ts:10`/`:50`) ; contrat moteur dans `packages/design-engines` (L10, OQ-8) |
| R4 | Spec §1–§14 complète | ✅ | ce document |
| R5 | 6 états S6 couverts | ✅ | §4 |
| R6 | États §6.1 couverts | ✅ | §4 (`en-cours`, `échec`, `terminé`, `404`) |
| R7 | Classe offline déclarée | ✅ | `hybrid` (§12) |
| R8 | Événements | **`ArtifactGenerated`** (`events.ts:125`) pour l'export ; aucun autre |
| R9 | Permissions | aucune |
| R10 | Entrée de nav déclarée | ✅ | section **C. Créer** ; depuis `logo-studio` |
| R11 | Tokens identifiés | ✅ | §3 (aucune valeur brute) |
| R12 | Contrat de données | ✅ | source = `ArtifactFile` ; single-writer **Artifact** (AD-7) |
| R13 | OQ bloquantes fermées | ✅ | OQ-12/29/30/31 tranchées (§14) |

**Verdict readiness** : `NOT_READY` jusqu'à L10 (dépendance `design-engines`, planifiée).

---

## §17 Critères de succès (pour déclarer « fait »)

| # | Critère | Mesure |
|---|---|---|
| S1 | Données réelles | déclinaisons dérivées du `ArtifactFile` ; aucun rendu codé en dur |
| S2 | 6 états prouvés | §4 — 1 story + 1 test par état |
| S3 | 404/feature-disabled | §4 — pattern global, jamais un 404 brut |
| S4 | Offline vérifié | dérivation locale OK, export désactivé avec motif |
| S5 | Retour arrière | tuer/relancer → déclinaisons intactes |
| S6 | Isolation utilisateur | un autre utilisateur ne lit pas le livrable (RLS) |
| S7 | Tokens-only | 0 valeur brute |
| S8 | A11y AA | vignettes focusables, badge `[À ÉVALUER]` avec texte, 44 px |
| S9 | Responsive | 3 paliers conformes à §15 |
| S10 | Gate vert | typecheck + lint + tests |
| S11 | Aucune régression | suites existantes vertes |
| S12 | **Honnêteté des capacités** | aucune déclinaison `[À ÉVALUER]` présentée comme acquise (§6.9) |

---

## §18 Critères de QA (9 classes — `docs/testing/matrix.md` §1)

| Classe | Question | Preuve attendue |
|---|---|---|
| Unitaire (domaine) | dérivation ratio/palette correcte ? | Vitest sur `packages/design-engines` |
| Intégration | les variantes se relisent-elles après coupure ? | test PowerSync sur `artifacts` |
| Contrat | `ArtifactGenerated` après upload (F-06) ? | test AD-9 |
| E2E | « décliner → vérifier → exporter » | Playwright |
| Failure | combinaison hors périmètre → signalée, pas produite | test |
| Permission | n/a | — |
| Offline | dérivation locale OK | test offline |
| Recovery | relance froide → déclinaisons intactes | test recovery |
| Plateforme | n/a (web) | — |

---

## §19 Couverture de tests exigée (seuils + DoD)

| Périmètre | Seuil |
|---|---|
| `packages/design-engines` (déclinaisons) | **≥ 80 %** lignes |
| `design.logo-variants` | ≥ 1 test par classe applicable (§18) |
| Région « liste des déclinaisons » | **6 tests d'état S6** + états §6.1 applicables |
| Écran `logo-variants` | ≥ 1 story (`Defaut`+`vide`+`chargement`+`erreur`) + ≥ 1 test `play` |

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
| OQ-32 | L'écran liste-t-il aussi les **variantes de Brand DNA** ou seulement les déclinaisons du logo ? | **DÉRIVÉE** : seulement les déclinaisons du logo — les variantes de marque relèvent de `design-versions` (§6.7–§6.8) |
| OQ-33 | La palette par fond (`LOGO.md` §6.6) est-elle une donnée du Brand DNA ou une déclinaison locale ? | **DÉRIVÉE** : les règles de fond (clair/foncé) sont dans `BrandUsageRules` (`entities-design.ts`) ; les déclinaisons les **appliquent** |
