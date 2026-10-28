# Écran — Brief de marque (`design-brief`)

Module : **Design Space Pro** · Route : `/design/:projectId/brief` · Statut : **neuf** ·
SSoT écran : `Aurora-Reference-Produit-Fonctionnelle-v1.1.md` §6.3 (parcours de création, étapes 1–3),
§12.2 (« Le brief est modifiable et versionné »), §6.2 (provenance) · SSoT périmètre : `docs/frontend/design-space-scope.md` §3 (écran 2) ·
SSoT arbitrages : `docs/frontend/design-space-oq-rulings.md` OQ-6, OQ-7 · SSoT intégration : `docs/architecture/design-space-integration.md` §3 ·
Gabarit : **Formulaire** (`web-shell-and-responsive.md` §2.3) · Cadre : `docs/frontend/spec-template-v1.md` §15–§19.

---

## §1 Psychologie du designer

| Dimension | Valeur |
|---|---|
| Objectif utilisateur | Décrire sa marque en un brief clair, **modifiable** et **versionné**, et voir quelles informations manquent encore. |
| Contexte (appareil/moment/réseau) | Web/desktop, session de travail longue. L'édition est **locale** (AD-7) ; la recherche de références (étape 3 de §6.3) est `online-required`. |
| Fréquence | Une fois à la création de la marque, puis à chaque évolution du positionnement. |
| État émotionnel cible | **Guidé, sans culpabilité.** Un champ vide est une **inconnue déclarée**, pas un échec ; l'écran demande « uniquement les précisions qui influencent réellement les choix suivants » (§6.3.2). |
| Erreur la plus probable | Remplir une assertion de marché (audience, positionnement) **sans source**, puis la voir traitée comme un fait établi — c'est l'erreur que §6.2 interdit explicitement. |
| Ce que l'écran RÉSOUT | La question « que sait-on de cette marque, et qu'est-ce qui reste à préciser ? » — avec, pour chaque champ, son statut épistémique et sa provenance. |
| Invariant | **AD-15 / §6.2** : le brief produit un contrat typé dans `packages/domain` (`BrandDnaField`, `AssertionStatus`) ; l'écran **ne redéclare aucun type**. Une assertion de marché `generated`/`accepted` sans source est **refusée** (garde `validateBrandDna`). |

---

## §2 Zones de l'écran

| Zone | Contenu | SSoT |
|---|---|---|
| TopBar | Titre « Brief » + `Badge` de version + sélecteur de version | §6.8 ; `BrandDna.version` |
| Panneau gauche (sommaire) | Étapes du brief : nom/secteur · offre · audience · contexte · contraintes · références · livrables attendus | §6.3.1 |
| Corps (formulaire) | Une ligne par champ : valeur + **pastille de statut** + **indicateur de source** | §6.2 |
| Bandeau « inconnues » | Champs `unknown` **qui bloquent** une décision suivante | §6.3.2 |
| Panneau droit (provenance) | Auteur, date, version dérivée, résumé des changements | §6.2 « Provenance et version » |
| Barre d'action | « Enregistrer la version » (**seul** CTA) · « Rechercher des références » (secondary) | §6.3.3 |

---

## §3 Éléments de l'écran (table 100 % de la zone)

| Élément | Composant DS | Lib (`ui-libraries.md` §1) | Tokens (AD-17) | Variante responsive | Source SSoT |
|---|---|---|---|---|---|
| TopBar « Brief » | TopBar | shadcn (pattern header) | `text.xl`, `color.neutral.900/100`, `spacing.xl` | même ; nav repliée < `lg` | §6.3 |
| `Badge` version | Badge (tonal) | shadcn Badge | `color.info`, `color.info-surface`, `font.mono` | même | §6.8 |
| Sommaire étapes | Liste de navigation | shadcn Separator + boutons | `text.sm` 600 `text-muted`, `border-strong` | replié < `lg` | §6.3.1 |
| Ligne de champ | `ListItem` + `Textarea` inline | shadcn Input / Textarea | `row.min-height=56`, `border` (focus 2px `accent-primary`) | 1 colonne < `lg` | §6.2 |
| **Pastille de statut** (4 états) | Badge tonal | shadcn Badge | `provided`→`success` · `generated`→`info` · `accepted`→`accent-primary` · `unknown`→`text-muted` | toujours visible | §6.2 |
| **Indicateur de source** | Chip + lien | shadcn Badge + Button ghost | `color.warning` si source manquante sur assertion de marché | sous le champ | §6.2 ; AD-11 |
| Bandeau « inconnues » | Callout `warning` **avec action** | shadcn Alert + Button | `color.warning` + `-surface` | bandeau sous TopBar | §6.3.2 |
| Bouton « Enregistrer la version » | Button **primary** (**seul** CTA) | shadcn Button | `color.brand.primary`, `touch.target=48` | sticky bas | §6.8 |
| Bouton « Rechercher des références » | Button secondary | shadcn Button | `color.brand.primary` | sticky bas < `lg` | §6.3.3 |
| Panneau provenance | `KeyValueList` | shadcn Card | `text.muted` (clés), `text-primary` (valeurs) | repliable < `lg` | §6.2 |
| État `loading` | Skeleton (forme du formulaire) | shadcn Skeleton | `color.skeleton`, pulse | même | §4 |
| État `empty` | EmptyState actionnable | shadcn Card + Button | `bg.subtle`, `text.secondary` | centré | §4 |

---

## §4 États de l'écran (6 états S6 + états §6.1)

| État | Déclencheur | Rendu | CTA |
|---|---|---|---|
| `loading` | chargement du brief local | Skeleton du formulaire | aucun |
| `empty` | marque sans brief | EmptyState : « Décrivez votre marque pour démarrer. » | « Commencer le brief » |
| `success` | brief chargé | formulaire + statuts + provenance | « Enregistrer la version » |
| `error` | lecture locale impossible | Callout danger + « Réessayer » | Réessayer |
| `offline` | réseau coupé | formulaire **pleinement éditable** (édition locale, AD-7) ; « Rechercher des références » **désactivé** avec libellé « Nécessite une connexion » | Enregistrer reste actif |
| `killed` | app tuée puis relancée | Skeleton + re-sync ; brouillon non enregistré **signalé** | Reprendre |
| `404` | projet inexistant ou non autorisé | pattern 404 global (**jamais** un 404 brut) | Retour |
| `en-cours` | recherche de références en cours | progression, résultats **marqués `generated`** avec leurs sources | Annuler |
| `échec` | recherche échouée | Callout danger + motif + « Réessayer » ; **aucun** champ modifié | Réessayer |
| `terminé` | version enregistrée | Toast 3 s + `Badge` de version incrémenté | — |

> **Point dur** : en `offline`, la recherche de références est désactivée mais
> **l'édition et l'enregistrement restent actifs**. Un brief est une saisie
> locale ; prétendre le contraire serait malhonnête.

---

## §5 Micro-interactions (GPU-only, 150–250 ms, smooth)

| Interaction | Effet | Durée |
|---|---|---|
| Changement d'étape (sommaire) | fondu + translation 8 px | 180 ms |
| Validation d'un champ | pastille de statut : `generated` → `accepted` | 200 ms |
| Inconnue bloquante détectée | pulse du bandeau + scroll vers le champ | 250 ms |
| Enregistrement de version | Toast + incrément du badge | 200 ms |

`reduced-motion` : transitions remplacées par un changement d'état instantané.

---

## §6 Modals / BottomSheets

| Modal | Déclencheur | Contenu |
|---|---|---|
| Sélecteur de version | tap `Badge` de version | liste des versions + « Comparer à la version courante » (→ `design-versions`) |
| Ajout de source | « Rechercher des références » | résultats Discovery/Knowledge avec leurs `SourceRef` (AD-11) ; l'utilisateur **choisit** les sources à rattacher |
| Confirmation d'écrasement | « Enregistrer » sur un champ `locked` | « Ce champ est verrouillé. Le déverrouiller ? » |

---

## §7 Formulaires

Chaque champ = `BrandDnaField<T>` : valeur + statut + sources + verrou.
**Règles de saisie** (§6.2) :
- saisir une valeur la passe à `provided` **si** l'utilisateur l'a tapée lui-même ;
- accepter une proposition la passe à `accepted` ;
- **aucune** action ne peut produire `generated` + contenu sur une assertion de
  marché **sans** source (garde `validateBrandDna`, `entities-design.ts`).
Validation au `blur`, pas à la frappe. Les champs non obligatoires restent
légitimement `unknown`.

---

## §8 Pagination / Tri / Filtres

Pas de pagination (formulaire). **Filtres** utiles : « Afficher seulement les
champs non renseignés » et « Afficher seulement les assertions sans source » —
le raccourci vers le travail restant.

---

## §9 Transitions entre écrans

- entrée depuis `design-space` (création de projet) ;
- sortie vers `brand-dna` (le brief alimente la première proposition de DNA) ;
- sortie vers `design-versions` (comparaison) ;
- retour arrière : conserve l'étape ouverte et la position de défilement (C5).

---

## §10 Thèmes (10 + 3 presets, par couche — AD-17)

Aucune valeur brute : toutes les couleurs viennent des tokens. Les 4 pastilles de
statut utilisent les couleurs **sémantiques** (`success`, `info`, `accent-primary`,
`text-muted`) — elles ne changent pas de sens d'un thème à l'autre.

---

## §11 Accessibilité (WCAG AA)

- les 4 statuts ne sont **pas** différenciés par la seule couleur : chaque pastille
  porte un **libellé** (« Fourni », « Proposé », « Accepté », « Inconnu ») ;
- le bandeau d'inconnues est une `aria-live="polite"` ;
- cibles ≥ 44 px, focus visible, `reduced-motion` respecté ;
- la navigation entre les étapes du brief est utilisable au clavier.

---

## §12 Offline (classe = `hybrid`)

| Capacité | Offline |
|---|---|
| Lire le brief | ✅ local (AD-7) |
| Éditer et enregistrer une version | ✅ local, file d'attente de synchronisation |
| **Rechercher des références** | ❌ `online-required` — bouton désactivé **avec motif** |
| Comparer deux versions | ✅ local |

---

## §13 Occurrences du logo (S9)

La page utilise le logo **Aurora** dans la TopBar selon la matrice S9. Les logos
**de l'utilisateur** ne sont pas des assets Aurora ; ils sont des `Artifact`
référencés par le Brand DNA et n'apparaissent pas sur cet écran (le brief décrit
la marque, il ne l'affiche pas).

---

## §14 Questions ouvertes (OQ)

| # | Question | Verdict |
|---|---|---|
| OQ-6 | Écran ratifié ? | **TRANCHÉE** : oui (`design-space-oq-rulings.md` OQ-6) |
| OQ-7 | Le brief est-il rattaché au `Project` ou à une entité neuve ? | **TRANCHÉE** : au `Project` (OQ-7) — pas d'entité neuve |
| OQ-21 | Le brief est-il un objet distinct du Brand DNA, ou son premier bloc ? | **DÉRIVÉE** : le brief **alimente** le Brand DNA (§6.3.4) ; il en est la matière première, versionnée avec lui (§12.2 « modifiable et versionné ») |
| OQ-22 | Nombre de champs du brief : le minimum (§6.3.1) ou extensible ? | **DÉFAUT-RÉVERSIBLE** : le minimum de §6.3.1 ; étendre coûte une version additive |

---

## §15 Responsive (cadre v1 — `docs/frontend/spec-template-v1.md`)

Gabarit : **Formulaire** (`web-shell-and-responsive.md` §2.3).

| Breakpoint | Layout | Navigation | Notes |
|---|---|---|---|
| base → `md` (< 768 px) | 1 colonne (étape courante) | sommaire **replié** dans un `Sheet` | formulaire pleine largeur ; provenance en accordéon |
| `md` → `lg` (768–1023 px) | 1 colonne + sommaire en rail d'icônes | rail latéral | — |
| **`lg+` (≥ 1024 px)** | **3 zones** : sommaire (240 px) · formulaire (flex) · provenance (320 px) | panneau latéral | gabarit **Formulaire + panneaux** |

**Règle** : « Enregistrer la version » (seul CTA primaire, §3) reste **visible**
aux 3 paliers.

> **OQ-4** : le seuil de bascule overlay→panneau (`lg` proposé) n'est pas ratifié globalement.

---

## §16 Critères de readiness (avant de coder)

| # | Critère | État | Preuve |
|---|---|---|---|
| R1 | Owner identifié | ✅ | Design Space Pro (famille **Artifacts**) |
| R2 | Ligne de catalogue | ⏳ à ajouter : `design.brief` (ce lot) |
| R3 | Types SSoT déclarés | ✅ | `BrandDna`, `BrandDnaField`, `AssertionStatus`, `validateBrandDna` (`entities-design.ts`) |
| R4 | Spec §1–§14 complète | ✅ | ce document |
| R5 | 6 états S6 couverts | ✅ | §4 |
| R6 | États §6.1 couverts | ✅ | §4 (`en-cours`, `échec`, `terminé`, `404`) |
| R7 | Classe offline déclarée | ✅ | `hybrid` (§12) |
| R8 | Événements | **aucun** émis par l'écran (AD-9 fermé à 9) |
| R9 | Permissions | aucune |
| R10 | Entrée de nav déclarée | ✅ | section **C. Créer** ; depuis `design-space` |
| R11 | Tokens identifiés | ✅ | §3 (aucune valeur brute) |
| R12 | Contrat de données | ✅ | lecture locale AD-7 ; aucune écriture de table d'autrui (AD-6) |
| R13 | OQ bloquantes fermées | ✅ | OQ-6/7/21/22 tranchées (§14) |

**Verdict readiness** : `READY` (après l'ajout de la ligne catalogue R2).

---

## §17 Critères de succès (pour déclarer « fait »)

| # | Critère | Mesure |
|---|---|---|
| S1 | Données réelles | le brief vient du store local ; aucun tableau codé en dur |
| S2 | 4 statuts prouvés | chaque statut atteignable ; **`generated` sans source sur une assertion de marché est refusé** (test de non-vacuité) |
| S3 | 404/feature-disabled | §4 — pattern global, jamais un 404 brut |
| S4 | Offline vérifié | édition OK, recherche désactivée avec motif |
| S5 | Retour arrière | tuer/relancer → version intacte |
| S6 | Isolation utilisateur | un autre utilisateur ne lit pas le brief (RLS) |
| S7 | Tokens-only | 0 valeur brute |
| S8 | A11y AA | 4 statuts avec libellé, `aria-live`, 44 px |
| S9 | Responsive | 3 paliers conformes à §15 |
| S10 | Gate vert | typecheck + lint + tests |
| S11 | Aucune régression | suites existantes vertes |

---

## §18 Critères de QA (9 classes — `docs/testing/matrix.md` §1)

| Classe | Question | Preuve attendue |
|---|---|---|
| Unitaire (domaine) | `validateBrandDna` / `diffBrandDna` corrects ? | ✅ **déjà livré** — 16 tests, `packages/domain/test/brand-dna.test.ts` |
| Intégration | le brief se relit-il après coupure ? | test PowerSync |
| Contrat | aucun événement émis (AD-9) | test d'absence |
| E2E | « brief → DNA → version » | Playwright |
| Failure | recherche échouée → aucun champ modifié | test |
| Permission | n/a | — |
| Offline | édition locale + recherche honnête | test |
| Recovery | brouillon non enregistré signalé après `killed` | test |
| Plateforme | n/a (web) | — |

---

## §19 Couverture de tests exigée (seuils + DoD)

| Périmètre | Seuil |
|---|---|
| `packages/domain` (Brand DNA) | **≥ 80 %** — ✅ 16 tests déjà verts |
| `design.brief` | ≥ 1 test par classe applicable (§18) |
| Région « formulaire brief » | **6 tests d'état S6** + états §6.1 applicables |
| Écran `design-brief` | ≥ 1 story (`Defaut`+`vide`+`chargement`+`erreur`) + ≥ 1 test `play` |

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
| OQ-23 | Le brief doit-il avoir **sa** version, ou partager celle du Brand DNA ? | **DÉRIVÉE** : partagée — §12.2 dit « Le brief est modifiable **et** versionné », et §6.2 rattache provenance et version au Brand DNA ; deux compteurs de version créeraient un 2ᵉ SSoT (AD-15) |
| OQ-24 | Les références de marché (étape 3) sont-elles stockées dans le brief ou dans Discovery ? | **DÉRIVÉE** : dans Discovery/Knowledge (propriétaire AD-6) ; le brief les **cite** par `SourceRef` (AD-11) |
