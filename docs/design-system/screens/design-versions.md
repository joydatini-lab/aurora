# Écran — Versions de design (`design-versions`)

Module : **Design Space Pro** · Route : `/design/:projectId/versions` (et `/design/:projectId/versions/:versionId`) · Statut : **neuf** ·
SSoT écran : `Aurora-Reference-Produit-Fonctionnelle-v1.1.md` §6.7 (« comparaison des variantes et retour à une version antérieure »),
§6.8 (gestion des versions et cohérence de marque), §12.2 (« Une nouvelle version n'écrase pas une version approuvée sans possibilité de retour ») ·
SSoT périmètre : `docs/frontend/design-space-scope.md` §3 (écran 10) · SSoT arbitrages : `docs/frontend/design-space-oq-rulings.md` OQ-7 ·
SSoT types : `packages/domain/src/entities-design.ts` (`diffBrandDna`, `BrandDnaChange`, `lockedFields`) · Gabarit : **Liste + détail** (`web-shell-and-responsive.md` §2.3) · Cadre : `docs/frontend/spec-template-v1.md` §15–§19.

---

## §1 Psychologie du designer

| Dimension | Valeur |
|---|---|
| Objectif utilisateur | **Comparer** deux variantes et **revenir** à une version antérieure sans rien perdre. |
| Contexte (appareil/moment/réseau) | Web/desktop, grand écran (la comparaison aime la largeur). Lecture des versions **locale** (AD-7) ; restauration locale. |
| Fréquence | À chaque révision — plus fréquente pendant les phases de recherche visuelle. |
| État émotionnel cible | **Libre d'essayer.** Savoir qu'on peut revenir en arrière retire la peur de casser une version approuvée. |
| Erreur la plus probable | Croire qu'une restauration **écrase** la version courante ; ou comparer deux versions du **mauvais** livrable (Brand DNA vs logo vs affiche). |
| Ce que l'écran RÉSOUT | La question « qu'est-ce qui a changé, et comment je reviens à la version que j'aimais ? » — diff lisible + retour réversible. |
| Invariant | **§6.8 / §12.2** : une nouvelle version n'écrase **jamais** une version approuvée sans possibilité de retour. Chaque version référence la **version de Brand DNA** utilisée. L'écran ne redéclare aucun type : le diff utilise `diffBrandDna`/`BrandDnaChange` (`entities-design.ts`). |

---

## §2 Zones de l'écran

| Zone | Contenu | SSoT |
|---|---|---|
| TopBar | Nom du livrable + sélecteur de type (Brand DNA / logo / affiche / document) | §6.8 |
| Panneau gauche (liste) | Versions (numéro, date, auteur, version de Brand DNA, statut approuvé/brouillon) | §6.8 ; `BrandDnaProvenance` |
| Détail (panneau droit) | Diff entre la version sélectionnée et la version courante (ou une autre) | §6.7 ; `diffBrandDna` |
| Bandeau « verrouillé » | Champs verrouillés touchés par le diff, **signalés** | §6.7 ; `lockedFields` |
| Barre d'action | « Revenir à cette version » (**seul** CTA) · « Comparer à… » (secondary) | §6.7 |

---

## §3 Éléments de l'écran (table 100 % de la zone)

| Élément | Composant DS | Lib (`ui-libraries.md` §1) | Tokens (AD-17) | Variante responsive | Source SSoT |
|---|---|---|---|---|---|
| TopBar livrable | TopBar | shadcn (pattern header) | `text.xl`, `color.neutral.900/100` | même | §6.8 |
| Sélecteur de type | SegmentedControl | shadcn Tabs | `color.brand.primary` (actif) | même | §6.8 |
| Liste des versions | `ListItem` + Badge | shadcn List + Badge | `row.min-height=56`, `text.sm`, `border` | liste < `lg`, détail overlay | §6.8 |
| Badge « approuvée » | Badge success | shadcn Badge | `color.success`, `color.success-surface` | même | §12.2 |
| Badge « brouillon » | Badge tonal | shadcn Badge | `color.info`, `color.info-surface` | même | §6.8 |
| Date / auteur | Texte mono | — | `font.mono`, `text.muted`, `text.xs` | même | `BrandDnaProvenance` |
| **Vue de diff** | Table de changements | shadcn Table | `color.success` (ajout) · `color.danger` (retrait) · `color.warning` (modif) | 1 colonne < `lg` | `diffBrandDna` |
| Ligne « champ verrouillé modifié » | `ListItem` + Badge warning | shadcn List + Badge | `color.warning`, `color.warning-surface` | même | `lockedFields` |
| Référence Brand DNA | Chip + lien | shadcn Badge + Button ghost | `color.info` | sous la version | §6.8 |
| Bouton « Revenir à cette version » | Button **primary** (**seul** CTA) | shadcn Button | `color.brand.primary`, `touch.target=48` | sticky bas | §6.7 |
| Bouton « Comparer à… » | Button secondary | shadcn Button | `color.brand.primary` | sticky bas | §6.7 |
| État `loading` | Skeleton (forme de la liste) | shadcn Skeleton | `color.skeleton`, pulse | même | §4 |

> **AD-14 (par analogie)** : « Revenir à cette version » est la **seule** action
> primaire. Comparer est `secondary` : une lecture, pas une décision.

---

## §4 États de l'écran (6 états S6 + états §6.1)

| État | Déclencheur | Rendu | CTA |
|---|---|---|---|
| `loading` | chargement de l'historique local | Skeleton de la liste | aucun |
| `empty` | une seule version | EmptyState : « Une seule version pour l'instant. » | « Comparer » désactivé avec motif |
| `success` | versions listées | liste + diff | « Revenir à cette version » |
| `error` | lecture locale impossible | Callout danger + « Réessayer » | Réessayer |
| `offline` | réseau coupé | **liste + diff + retour actifs** (local, AD-7) ; badge « Hors-ligne » informatif | Retour actif (local) |
| `killed` | app tuée puis relancée | Skeleton + re-sync | Reprendre |
| `404` | version inexistante ou non autorisée | pattern 404 global (**jamais** un 404 brut) | Retour |
| `en-cours` | calcul du diff en cours | progression ; liste affichée | Annuler |
| `échec` | restauration échouée | Callout danger + motif ; **version courante intacte** | Réessayer |
| `terminé` | version restaurée | Toast 3 s + nouvelle version créée (la restauration **n'écrase pas**, elle produit une version) | — |

> **Point dur** : « revenir à une version » ne **détruit** aucune version. La
> restauration crée une **nouvelle** version dérivée (monotone, §6.8) — la version
> approuvée reste accessible. C'est la garantie de §12.2.

---

## §5 Micro-interactions (GPU-only, 150–250 ms, smooth)

| Interaction | Effet | Durée |
|---|---|---|
| Sélection d'une version | mise à jour du diff | 180 ms |
| Bascule de comparaison | fondu entre les deux diffs | 200 ms |
| Restauration | Toast + nouvelle entrée en tête de liste | 200 ms |
| Champ verrouillé modifié | pulse du badge warning | 250 ms |

`reduced-motion` : transitions remplacées par un changement d'état instantané.

---

## §6 Modals / BottomSheets

| Modal | Déclencheur | Contenu |
|---|---|---|
| Choix de version à comparer | « Comparer à… » | liste des versions + sélection |
| Confirmation de restauration | « Revenir à cette version » | aperçu du delta + « Cette action crée une nouvelle version, elle n'écrase rien. » |
| Impact d'un retour | retour impliquant un changement de marque | documents affectés (→ `brand-impact`) |

---

## §7 Formulaires

Pas de saisie. L'écran expose des **décisions** : comparer, revenir. La
restauration est une action **confirmée** (§6.7) ; elle **préserve** les
modifications verrouillées signalées (`lockedFields`, `entities-design.ts:276`).

---

## §8 Pagination / Tri / Filtres

- **Tri** : par date desc (version la plus récente en tête) ; option par numéro.
- **Filtres** : « seulement les versions approuvées », « seulement celles avec champ verrouillé modifié ».
- **Pagination** : scroll natif jusqu'à ~50 versions, puis pagination shadcn (S8).

---

## §9 Transitions entre écrans

- entrée depuis `brand-dna`, `logo-studio`, `affiche-studio`, `document-studio`, `charte` ;
- sortie vers `brand-impact` (conséquences d'un retour), le studio porteur ;
- retour arrière : conserve la version sélectionnée et le diff (C5).

---

## §10 Thèmes (10 + 3 presets, par couche — AD-17)

Les couleurs du **diff** (ajout/retrait/modif) utilisent les tokens sémantiques
(`success`, `danger`, `warning`), **figés** quel que soit le thème (règle bloquante
`overview.md` §5.1). Les panneaux utilisent les tokens `packages/ui`.

---

## §11 Accessibilité (WCAG AA)

- le diff distingue ajout/retrait/modif par **texte** (préfixe +/–/≠), pas seulement par couleur ;
- chaque version est focusable avec un `aria-label` (numéro + date + statut) ;
- la confirmation de restauration est un dialogue accessible (focus trap) ;
- cibles ≥ 44 px, focus visible, `reduced-motion` respecté.

---

## §12 Offline (classe = `offline-capable`)

| Capacité | Offline |
|---|---|
| Lister les versions | ✅ local (AD-7) |
| Comparer deux versions | ✅ local |
| Revenir à une version | ✅ local (crée une version locale en file d'attente) |
| Référencer une version de Brand DNA non encore synchronisée | ⏳ file d'attente ; signalée « en attente de sync » |

---

## §13 Occurrences du logo (S9)

Le logo **Aurora** apparaît dans la TopBar selon la matrice S9. Les vignettes de
version montrent le **livrable de l'utilisateur** (logo/affiche/document) ; elles
n'utilisent jamais le logo Aurora comme substitut.

---

## §14 Questions ouvertes (OQ)

| # | Question | Verdict |
|---|---|---|
| OQ-7 | Les versions sont-elles celles du Brand DNA ou du livrable ? | **TRANCHÉE** : les **deux**, mais séparément — le Brand DNA a ses versions (`BrandDna.version`, monotone) ; chaque livrable référence la version de Brand DNA utilisée (§6.8) |
| OQ-51 | Une restauration crée-t-elle une nouvelle version ou réutilise-t-elle l'ancienne ? | **DÉRIVÉE** : crée une **nouvelle** version (§6.8 : le numéro est monotone ; §12.2 : pas d'écrasement) |
| OQ-52 | Le diff du Brand DNA et le diff d'un layout partagent-ils le même affichage ? | **DÉRIVÉE** : même **présentation**, contrats distincts — `BrandDnaChange` (`entities-design.ts:235`) pour le DNA ; un diff de calques pour les layouts |
| OQ-53 | Combien de versions conserve-t-on ? | **À TRANCHER** au lot L13 — la rétention n'est pas fixée par la référence ; à décider avec la politique de stockage (R2, AD-16) |

---

## §15 Responsive (cadre v1 — `docs/frontend/spec-template-v1.md`)

Gabarit : **Liste + détail** (`web-shell-and-responsive.md` §2.3).

| Breakpoint | Layout | Navigation | Notes |
|---|---|---|---|
| base → `md` (< 768 px) | 1 colonne, détail (diff) en **overlay `O`** | tab bar basse | comparaison limitée (Phase 4) |
| `md` → `lg` (768–1023 px) | 1 colonne + détail en overlay | rail latéral | — |
| **`lg+` (≥ 1024 px)** | **2 panneaux** : versions \| diff ; `xl`+ ajoute le 3ᵉ panneau de comparaison côte à côte | panneau latéral | cible web/desktop |

**Règle** (§2.3 règle 2) : le détail est un **overlay sous `lg`**, un **panneau à
`lg`+** — même composant, conteneur différent. La comparaison côte à côte (deux
rendus) exige `xl`+ (2–3 panneaux).

> **OQ-4** : le seuil de bascule overlay→panneau (`lg` proposé) n'est pas ratifié globalement.

---

## §16 Critères de readiness (avant de coder)

| # | Critère | État | Preuve |
|---|---|---|---|
| R1 | Owner identifié | ✅ | Design Space Pro (famille **Artifacts**) |
| R2 | Ligne de catalogue | ⏳ à ajouter : `design.versions` (lot L13) |
| R3 | Types SSoT déclarés | ✅ | `diffBrandDna`, `BrandDnaChange`, `lockedFields`, `BrandDnaProvenance` (`entities-design.ts`) ; `Artifact` pour les livrables |
| R4 | Spec §1–§14 complète | ✅ | ce document |
| R5 | 6 états S6 couverts | ✅ | §4 |
| R6 | États §6.1 couverts | ✅ | §4 (`en-cours`, `échec`, `terminé`, `404`) |
| R7 | Classe offline déclarée | ✅ | `offline-capable` (§12) |
| R8 | Événements | **aucun** émis par l'écran (AD-9 fermé à 9) |
| R9 | Permissions | aucune |
| R10 | Entrée de nav déclarée | ✅ | depuis les studios ; pas d'onglet |
| R11 | Tokens identifiés | ✅ | §3 (aucune valeur brute) |
| R12 | Contrat de données | ✅ | lecture locale AD-7 ; la restauration produit une version (single-writer **Artifact**, AD-7) |
| R13 | OQ bloquantes fermées | ✅ | OQ-7/51/52 tranchées ; OQ-53 (rétention) **non bloquante** pour l'écran |

**Verdict readiness** : `READY` (OQ-53 = politique de rétention, hors écran).

---

## §17 Critères de succès (pour déclarer « fait »)

| # | Critère | Mesure |
|---|---|---|
| S1 | Données réelles | versions et diffs viennent du store local ; aucun diff codé en dur |
| S2 | 6 états prouvés | §4 — 1 story + 1 test par état |
| S3 | 404/feature-disabled | §4 — pattern global, jamais un 404 brut |
| S4 | Offline vérifié | lister + comparer + revenir en local |
| S5 | Retour arrière | tuer/relancer → historique intact |
| S6 | Isolation utilisateur | un autre utilisateur ne lit pas l'historique (RLS) |
| S7 | Tokens-only | 0 valeur brute |
| S8 | A11y AA | diff distingué par texte, dialogue accessible, 44 px |
| S9 | Responsive | 3 paliers conformes à §15 |
| S10 | Gate vert | typecheck + lint + tests |
| S11 | Aucune régression | suites existantes vertes |
| S12 | **Réversibilité prouvée** | restaurer ne détruit aucune version ; la version approuvée reste accessible (§12.2) |
| S13 | **Champ verrouillé signalé** | un champ verrouillé modifié est **signalé**, jamais masqué (test sur `lockedFields`) |

---

## §18 Critères de QA (9 classes — `docs/testing/matrix.md` §1)

| Classe | Question | Preuve attendue |
|---|---|---|
| Unitaire (domaine) | `diffBrandDna` / `lockedFields` corrects ? | ✅ **déjà livré** — `packages/domain/test/brand-dna.test.ts` (dont « diff reports a changed LOCKED field ») |
| Intégration | l'historique se relit-il après coupure ? | test PowerSync |
| Contrat | aucun événement émis (AD-9) | test d'absence |
| E2E | « comparer → revenir → vérifier » | Playwright |
| Failure | restauration échouée → version courante intacte | test failure |
| Permission | n/a | — |
| Offline | lister/comparer/revenir locaux | test offline |
| Recovery | relance froide → historique intact | test recovery |
| Plateforme | n/a (web) | — |

---

## §19 Couverture de tests exigée (seuils + DoD)

| Périmètre | Seuil |
|---|---|
| `packages/domain` (diff/verrous) | **≥ 80 %** — ✅ tests existants |
| `design.versions` | ≥ 1 test par classe applicable (§18) |
| Région « liste des versions » | **6 tests d'état S6** + états §6.1 applicables |
| Écran `design-versions` | ≥ 1 story (`Defaut`+`vide`+`chargement`+`erreur`) + ≥ 1 test `play` |
| Réversibilité | ≥ 1 test : restaurer → version approuvée toujours accessible |

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
| OQ-54 | L'écran gère-t-il aussi les versions de **Brand DNA** (pas seulement des livrables) ? | **DÉRIVÉE** : oui — le sélecteur de type (§2) inclut « Brand DNA » ; `diffBrandDna` est déjà testé |
| OQ-55 | Une restauration doit-elle re-valider la composition (validateur) ? | **DÉRIVÉE** : oui — restaurer change le layout ; le validateur signale les violations **du layout restauré** (fait, pas décision) |
