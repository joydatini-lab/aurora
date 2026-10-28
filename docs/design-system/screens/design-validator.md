# Écran — Validateur de design (`design-validator`)

Module : **Design Space Pro** · Route : panneau transverse (ouvert depuis `logo-studio`, `affiche-studio`, `document-studio`, `charte` ; pas de route autonome) · Statut : **neuf** ·
SSoT écran : `Aurora-Reference-Produit-Fonctionnelle-v1.1.md` §6.5 (validation déterministe), §6.7 (affichage des problèmes + application/refus des corrections),
§12.2 (« Le moteur de validation renvoie des violations typées et compréhensibles ») · SSoT moteur : `AFFICHE.md` §5.3 (types de violation), §5.4 (8 métriques PosterLayout), §7.10 (le validateur est déterministe, le VLM n'évalue que l'esthétique) ·
SSoT périmètre : `docs/frontend/design-space-scope.md` §3 (écran 9) · SSoT arbitrages : `docs/frontend/design-space-oq-rulings.md` OQ-12 ·
Gabarit : **Panneau (transverse)** — hérite du gabarit **Éditeur** de l'écran porteur (`web-shell-and-responsive.md` §2.3) · Cadre : `docs/frontend/spec-template-v1.md` §15–§19.

---

## §1 Psychologie du designer

| Dimension | Valeur |
|---|---|
| Objectif utilisateur | Voir **toutes** les violations objectives d'une composition, savoir **pourquoi** chacune est une violation, et décider d'appliquer ou de refuser la correction. |
| Contexte (appareil/moment/réseau) | Web/desktop, panneau ouvert pendant l'édition. Le validateur est **local et déterministe** (AD-3) : aucun réseau, aucun modèle. |
| Fréquence | À chaque validation — après une édition, une génération ou une transformation. |
| État émotionnel cible | **Informé, pas jugé.** Les violations sont des **faits** (règles objectives), distinctes des évaluations subjectives (attrait, adéquation) qui sont **assistées**, pas déterministes (§6.5). |
| Erreur la plus probable | **Confondre une violation déterministe et une évaluation subjective** — ou croire qu'un VLM peut vérifier la géométrie (il produit des faux négatifs, `AFFICHE.md` §7.10). |
| Ce que l'écran RÉSOUT | La question « qu'est-ce qui est objectivement faux dans ce layout, et où ? » — liste typée, localisée, cliquable. |
| Invariant | **§6.5 / §12.2 / `AFFICHE.md` §7.10** : le validateur est **déterministe** et renvoie des **violations typées**. Le VLM **ne vérifie jamais** la géométrie ; il n'évalue que l'esthétique. L'écran ne redéfinit aucun type : les types de violation sont le contrat du moteur (`packages/design-engines`). |

---

## §2 Zones de l'écran

| Zone | Contenu | SSoT |
|---|---|---|
| En-tête de panneau | Nom du livrable + compteur de violations + bouton « Revalider » | §6.5 |
| Liste des violations | Chaque violation = type + calque concerné + règle + source | `AFFICHE.md` §5.3 |
| Détail d'une violation | Règle violée, valeur mesurée vs seuil, calque | `AFFICHE.md` §5.3 |
| Indicateurs | 8 indicateurs PosterLayout (Val, Ove, Ali, Undl, Unds, Uti, Occ, Rea) + score 0–10 | `AFFICHE.md` §5.4 |
| Section « évaluations assistées » | Évaluations subjectives **séparées** et étiquetées comme telles | §6.5 |
| Pied d'action | « Appliquer la correction » / « Refuser » (par violation) | §6.7 |

---

## §3 Éléments de l'écran (table 100 % de la zone)

| Élément | Composant DS | Lib (`ui-libraries.md` §1) | Tokens (AD-17) | Variante responsive | Source SSoT |
|---|---|---|---|---|---|
| En-tête de panneau | Panneau + Badge compteur | shadcn (pattern header) | `text.sm` 600, `color.neutral.900/100` | même | §6.5 |
| Bouton « Revalider » | Button ghost | shadcn Button | `text-secondary`, `touch.target=44` | même | §6.5 |
| Liste des violations | `ListItem` + Badge de type | shadcn List + Badge | `row.min-height=56`, `text.sm` | liste verticale | `AFFICHE.md` §5.3 |
| **Badge de type de violation** | Badge tonal | shadcn Badge | géométrie→`warning` · lisibilité→`danger` · style→`info` | même | `AFFICHE.md` §5.3 |
| Détail de violation | Card | shadcn Card | `surface`, `border`, `text.sm` | repliable | `AFFICHE.md` §5.3 |
| Indicateurs PosterLayout | 8 valeurs + score | shadcn Card + Badge | `font.mono`, `text.sm` | grille 2 colonnes < `lg` | `AFFICHE.md` §5.4 |
| Score global | Badge mono + barre | shadcn Badge + Progress | `color.info` (score), `font.mono` | même | `AFFICHE.md` §5.3 |
| Section « évaluations assistées » | Callout info | shadcn Alert | `color.info` + `-surface` | même | §6.5 |
| Bouton « Appliquer la correction » | Button secondary | shadcn Button | `color.brand.primary` | sticky bas | §6.7 |
| Bouton « Refuser » | Button ghost | shadcn Button | `text-secondary` | sticky bas | §6.7 |
| État `loading` | Skeleton (forme de la liste) | shadcn Skeleton | `color.skeleton`, pulse | même | §4 |

> **Séparation normative** : les **violations déterministes** (géométrie, lisibilité,
> style, ordre) et les **évaluations assistées** (attrait, adéquation stratégique)
> sont **deux sections distinctes**. Les premières sont des faits ; les secondes
> sont étiquetées comme évaluations (§6.5).

---

## §4 États de l'écran (6 états S6 + états §6.1)

| État | Déclencheur | Rendu | CTA |
|---|---|---|---|
| `loading` | validation en cours | Skeleton de la liste | aucun |
| `empty` | aucune violation | EmptyState : « Aucune violation objective. » + rappel que l'esthétique reste subjective | « Revalider » |
| `success` | violations listées | liste typée + indicateurs + score | « Appliquer » / « Refuser » |
| `error` | validation impossible | Callout danger + « Réessayer » | Réessayer |
| `offline` | réseau coupé | **validation pleinement active** (moteur local, AD-3) ; badge « Hors-ligne » informatif | Appliquer/Refuser actifs |
| `killed` | app tuée puis relancée | Skeleton + re-validation | Reprendre |
| `404` | livrable inexistant ou non autorisé | pattern 404 global (**jamais** un 404 brut) | Retour |
| `en-cours` | re-validation en cours (après édition) | progression ; la liste précédente reste affichée | Annuler |
| `échec` | validation échouée | Callout danger + motif ; **aucune** violation inventée | Réessayer |
| `terminé` | corrections appliquées | Toast 3 s + liste mise à jour | — |

> **Point dur** : appliquer une correction **modifie le layout** ; c'est une action
> **confirmée** (aperçu du delta), jamais silencieuse (§6.7). Une violation sans
> correction déterministe disponible (ex. choix esthétique) est présentée comme
> **évaluation assistée**, pas comme une erreur à corriger.

---

## §5 Micro-interactions (GPU-only, 150–250 ms, smooth)

| Interaction | Effet | Durée |
|---|---|---|
| Sélection d'une violation | surbrillance du calque sur la toile | 150 ms |
| Application d'une correction | mise à jour du calque + disparition de la violation | 200 ms |
| Re-validation | re-rendu de la liste | 200 ms |
| Barre de score | progression du score | 200 ms |

`reduced-motion` : transitions remplacées par un changement d'état instantané.

---

## §6 Modals / BottomSheets

| Modal | Déclencheur | Contenu |
|---|---|---|
| Aperçu de correction | « Appliquer la correction » | delta proposé (avant/après) + « Confirmer » / « Annuler » (§6.7) |
| Détail d'un indicateur | tap sur un indicateur PosterLayout | définition + source (`AFFICHE.md` §5.4) + calques concernés |
| Application en lot | « Tout corriger » | liste des corrections déterministes + confirmation explicite |

---

## §7 Formulaires

Pas de formulaire de saisie. Le panneau expose des **décisions** par violation
(appliquer / refuser). Les violations sont **typées** (`AFFICHE.md` §5.3 :
`BOUNDARY_OVERRUN`, `TEXT_OVERLAP`, `LABEL_DUP`, `WCAG_CONTRAST`,
`UNDERLAY_MISPLACE`, `ZORDER_INVERSION`, `ROUND_INSTABILITY`,
`CONSTANTIONAL_VIOLATION`, `STYLE_MISMATCH`) — le libellé affiché est le type, plus
une explication en langage clair (§12.2 « compréhensibles »).

---

## §8 Pagination / Tri / Filtres

- **Tri** : par sévérité (danger → warning → info), puis par calque.
- **Filtres** : par type de violation, par calque, « seulement les violations non résolues ».
- **Pagination** : scroll natif (le nombre de violations reste borné par le layout).

---

## §9 Transitions entre écrans

- entrée depuis n'importe quel studio (`logo-studio`, `affiche-studio`,
  `document-studio`, `charte`) via l'action « Valider » ;
- sortie : retour au studio porteur avec la sélection conservée ;
- pas de route autonome (panneau) — l'URL reste celle de l'écran porteur.

---

## §10 Thèmes (10 + 3 presets, par couche — AD-17)

Les couleurs **des violations** utilisent les tokens sémantiques (`danger`,
`warning`, `info`) qui sont **figés** et ne changent pas d'un thème à l'autre
(règle bloquante `overview.md` §5.1). Le panneau lui-même utilise les tokens
`packages/ui`.

---

## §11 Accessibilité (WCAG AA)

- chaque violation est focusable et son type est **lu** (pas seulement coloré) ;
- le compteur de violations est `aria-live="polite"` ;
- la distinction déterministe/assisté est portée par le **texte**, pas par la couleur ;
- cibles ≥ 44 px, focus visible, `reduced-motion` respecté.

---

## §12 Offline (classe = `offline-capable`)

| Capacité | Offline |
|---|---|
| Valider une composition | ✅ local (moteur déterministe, AD-3) |
| Appliquer / refuser une correction | ✅ local |
| Évaluer l'esthétique (assisté) | ❌ `online-required` — section désactivée avec motif |

> Le validateur est le cas le plus **offline-capable** du studio : la géométrie ne
> dépend ni du réseau ni d'un modèle.

---

## §13 Occurrences du logo (S9)

Le panneau n'affiche pas de logo Aurora (il vit dans l'écran porteur). Il ne
manipule **jamais** le logo de marque : il signale une violation **sur** un calque
logo (ex. `BOUNDARY_OVERRUN`, `UNDERLAY_MISPLACE`) sans l'altérer lui-même.

---

## §14 Questions ouvertes (OQ)

| # | Question | Verdict |
|---|---|---|
| OQ-12 | Moteur d'édition / validation ? | **TRANCHÉE** : le validateur est un composant **déterministe** du moteur (OQ-12) ; pas de Fabric.js dans la logique de validation |
| OQ-46 | Le panneau est-il un écran à part entière ou une surface flottante ? | **DÉRIVÉE** : **panneau transverse** (pas d'écran dédié) — `web-shell-and-responsive.md` §2.3 le classe « Panneau (transverse) » ; il hérite du gabarit de l'écran porteur |
| OQ-47 | Le score 0–10 (PosterLayout) est-il bloquant pour l'export ? | **DÉRIVÉE** : **non** — il **propose** l'arrêt de la boucle (`AFFICHE.md` §5.3) ; l'export reste décidé par l'utilisateur (§6.9 : « signaler les limites restantes ») |
| OQ-48 | Les évaluations subjectives (VLM) sont-elles dans le périmètre v1 ? | **DÉFAUT-RÉVERSIBLE** : section séparée, désactivable sans perte (elle n'est jamais déterministe) |

---

## §15 Responsive (cadre v1 — `docs/frontend/spec-template-v1.md`)

Gabarit : **hérite du gabarit de l'écran porteur** (Éditeur pour les studios,
Formulaire pour la charte) — `web-shell-and-responsive.md` §2.3.

| Breakpoint | Layout | Navigation | Notes |
|---|---|---|---|
| base → `md` (< 768 px) | panneau en **overlay `O`** plein écran (via `Sheet`) | tab bar basse | consultation + corrections ponctuelles |
| `md` → `lg` (768–1023 px) | panneau en overlay | rail latéral | — |
| **`lg+` (≥ 1024 px)** | panneau **latéral** intégré à l'écran porteur (3ᵉ panneau à `xl`+) | panneau latéral | cible web/desktop |

**Règle** (§2.3 règle 2) : overlay sous `lg`, panneau à `lg`+ — même composant,
conteneur différent. L'état replié/déplié est persisté (§4.3 C2).

> **OQ-4** : le seuil de bascule overlay→panneau (`lg` proposé) n'est pas ratifié globalement.

---

## §16 Critères de readiness (avant de coder)

| # | Critère | État | Preuve |
|---|---|---|---|
| R1 | Owner identifié | ✅ | Design Space Pro (famille **Artifacts**) |
| R2 | Ligne de catalogue | ⏳ à ajouter : `design.validator` (lot L12) |
| R3 | Types SSoT déclarés | ✅ | types de violation = contrat du moteur (`packages/design-engines`, L12) ; `BrandDnaViolation` (`entities-design.ts:144`) pour la variante Brand DNA |
| R4 | Spec §1–§14 complète | ✅ | ce document |
| R5 | 6 états S6 couverts | ✅ | §4 |
| R6 | États §6.1 couverts | ✅ | §4 (`en-cours`, `échec`, `terminé`, `404`) |
| R7 | Classe offline déclarée | ✅ | `offline-capable` (§12) |
| R8 | Événements | **aucun** (le validateur produit un rapport, pas un événement AD-9) |
| R9 | Permissions | aucune |
| R10 | Entrée de nav déclarée | ✅ | panneau transverse ouvert depuis les studios (pas de route) |
| R11 | Tokens identifiés | ✅ | §3 (aucune valeur brute) |
| R12 | Contrat de données | ✅ | lecture seule du layout ; le validateur **ne modifie rien** sans confirmation (§6.7) ; single-writer **Artifact** (AD-7) |
| R13 | OQ bloquantes fermées | ✅ | OQ-12/46/47/48 tranchées (§14) |

**Verdict readiness** : `NOT_READY` jusqu'à L12 (dépendance `design-engines`, planifiée).

---

## §17 Critères de succès (pour déclarer « fait »)

| # | Critère | Mesure |
|---|---|---|
| S1 | Données réelles | les violations sont **calculées** sur la composition ; aucune liste codée en dur |
| S2 | 6 états prouvés | §4 — 1 story + 1 test par état |
| S3 | 404/feature-disabled | §4 — pattern global, jamais un 404 brut |
| S4 | Offline vérifié | validation locale complète ; évaluation assistée désactivée avec motif |
| S5 | Retour arrière | tuer/relancer → dernière validation rejouée |
| S6 | Isolation utilisateur | un autre utilisateur ne lit pas le livrable (RLS) |
| S7 | Tokens-only | 0 valeur brute |
| S8 | A11y AA | type de violation lu, `aria-live`, distinction par texte, 44 px |
| S9 | Responsive | 3 paliers conformes à §15 |
| S10 | Gate vert | typecheck + lint + tests |
| S11 | Aucune régression | suites existantes vertes |
| S12 | **Déterminisme prouvé** | deux validations de la même composition → **mêmes** violations (test) |
| S13 | **Séparation fait/assisté** | aucune évaluation subjective présentée comme déterministe (§6.5) |

---

## §18 Critères de QA (9 classes — `docs/testing/matrix.md` §1)

| Classe | Question | Preuve attendue |
|---|---|---|
| Unitaire (domaine) | chaque type de violation correct ? | Vitest sur `packages/design-engines` — 1 test par type (`AFFICHE.md` §5.3) |
| Intégration | le rapport se relit-il après coupure ? | test (rapport local) |
| Contrat | aucun événement émis (AD-9) | test d'absence |
| E2E | « éditer → valider → corriger → revalider » | Playwright |
| Failure | composition dégénérée → violation visible, pas de crash | test failure |
| Permission | n/a | — |
| Offline | validation locale complète | test offline |
| Recovery | relance froide → re-validation identique | test recovery |
| Plateforme | n/a (web) | — |

---

## §19 Couverture de tests exigée (seuils + DoD)

| Périmètre | Seuil |
|---|---|
| `packages/design-engines` (validateur) | **≥ 80 %** lignes |
| `design.validator` | ≥ 1 test par classe applicable (§18) |
| Région « liste des violations » | **6 tests d'état S6** + états §6.1 applicables |
| Écran `design-validator` | ≥ 1 story (`Defaut`+`vide`+`chargement`+`erreur`) + ≥ 1 test `play` |
| Types de violation | ≥ 1 test **par type** (9 types, `AFFICHE.md` §5.3) |
| Déterminisme | ≥ 1 test : même composition → mêmes violations |

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
| OQ-49 | Le validateur couvre-t-il le Brand DNA (violations de §6.2) ou seulement les layouts ? | **DÉRIVÉE** : les deux, mais **deux contrats distincts** — `BrandDnaViolation` (`entities-design.ts:144`, déjà livré, 3 kinds) pour le DNA ; les types `AFFICHE.md` §5.3 pour les layouts. Le panneau peut afficher les deux, jamais les confondre |
| OQ-50 | La non-régression du rendu après optimisation (§6.5, étape 9 de §6.4) est-elle une violation ou une comparaison ? | **DÉRIVÉE** : une **comparaison** avant/après (§12.4) ; le validateur signale la régression comme un fait, la comparaison la rend visible |
