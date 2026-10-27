# Écran — Brand DNA (`brand-dna`)

Module : **Design Space Pro** · Route : `/design/:projectId/brand-dna` · Statut : **neuf** ·
SSoT écran : `Aurora-Reference-Produit-Fonctionnelle-v1.1.md` §6.2 (spécification du Brand DNA),
§6.3 (parcours), §6.8 (versions) · SSoT types : `packages/domain/src/entities-design.ts` (AD-15) ·
SSoT arbitrages : `docs/frontend/design-space-oq-rulings.md` OQ-7 · Gabarit : **Formulaire + panneaux**
(`web-shell-and-responsive.md` §4.1) · Cadre : `docs/frontend/spec-template-v1.md` §15–§19.

---

## §1 Psychologie du designer

| Dimension | Valeur |
|---|---|
| Objectif utilisateur | Constituer et **corriger** la représentation structurée de son identité de marque — la source qui alimentera logo, charte, affiche et documents. |
| Contexte (appareil/moment/réseau) | Web/desktop, session longue, grand écran ; travail de fond, pas un geste rapide. Réseau utile mais non bloquant : l'édition est locale, la génération d'une proposition peut être `online-required`. |
| Fréquence | Faible mais intense — à la création de la marque, puis à chaque évolution. |
| État émotionnel cible | **Lucide, pas dupé.** L'utilisateur doit voir d'un coup d'œil ce qu'il a fourni, ce qu'Aurora a proposé, ce qu'il a accepté, et ce qui manque. |
| Erreur la plus probable | **Prendre une proposition générée pour un fait établi** — c'est le risque que §6.2 nomme explicitement. Un chiffre de marché inventé, affiché comme un constat, est l'erreur à empêcher. |
| Ce que l'écran RÉSOUT | La question « qu'est-ce qui est vrai dans ma marque, et qui l'a dit ? » — chaque champ porte son **statut épistémique** et sa **source**. |
| Invariant | **AD-15 / §6.2** : les 6 blocs sont typés dans `packages/domain` ; l'écran **ne redéclare aucun type**. Un champ `generated`/`accepted` sans source sur une assertion de marché est **refusé** (garde `validateBrandDna`). |

---

## §2 Zones de l'écran

| Zone | Contenu | SSoT |
|---|---|---|
| TopBar | Titre « Brand DNA » + `Badge` de version (`v3`) + sélecteur de version | §6.8 ; `BrandDna.version` |
| Bandeau de validation | Violations typées, chacune cliquable → scroll vers le champ | §6.2 ; `BrandDnaViolation` |
| Panneau gauche (sommaire) | Les **6 blocs** §6.2 : Stratégie · Personnalité · Identité visuelle · Règles d'usage · Identité numérique · Provenance | §6.2 |
| Corps (formulaire) | Le bloc sélectionné : une ligne par champ, avec son statut et sa source | §6.2 |
| Panneau droit (provenance) | Auteur, date, version dérivée, résumé des changements | §6.2 « Provenance et version » |
| Barre d'action | « Proposer » (générer) · « Enregistrer la version » · « Verrouiller » | §6.3.4–6.3.7 |

---

## §3 Éléments de l'écran (table 100 % de la zone)

| Élément | Composant DS | Lib (`ui-libraries.md` §1) | Tokens (AD-17) | Variante responsive | Source SSoT |
|---|---|---|---|---|---|
| TopBar « Brand DNA » | TopBar | shadcn (pattern header) | `text.xl`, `color.neutral.900/100`, `spacing.xl` | même ; nav repliée < `lg` | §6.2 |
| `Badge` version | Badge (tonal, jamais plein) | shadcn Badge | `color.info`, `color.info-surface`, `font.mono` | même | §6.8 |
| Sommaire 6 blocs | Liste de navigation (sections) | shadcn Separator + boutons | `text.sm` 600 `text-muted`, `border-strong` | **replié** < `lg` (panneau latéral) | §6.2 |
| Ligne de champ | `ListItem` + `TextField` inline | shadcn Input / Textarea | `row.min-height=56`, `border` (focus 2px `accent-primary`) | 1 colonne < `lg` | §6.2 |
| **Pastille de statut** (4 états) | Badge tonal | shadcn Badge | `provided`→`success` · `generated`→`info` · `accepted`→`accent-primary` · `unknown`→`text-muted` | toujours visible (jamais masquée par troncature) | §6.2 |
| **Indicateur de source** | Chip + lien | shadcn Badge + Button ghost | `color.warning` si source manquante sur assertion de marché | sous le champ | §6.2 |
| Bouton « Verrouiller » | IconButton (cadenas) | shadcn Button ghost | `icon.size=20`, `touch.target=44` | même | §6.7 ; `BrandDnaField.locked` |
| Bandeau de violations | Callout `warning`/`danger` **avec action** | shadcn Alert + Button | `color.warning`/`danger` + `-surface` | bandeau sous TopBar | §6.2 ; `BrandDnaViolation` |
| Panneau provenance | `KeyValueList` | shadcn Card | `text.muted` (clés), `text-primary` (valeurs) | **repliable**, sous le corps < `lg` | §6.2 |
| Bouton « Proposer » | Button secondary | shadcn Button | `color.brand.primary` | sticky bas < `lg` | §6.3.4 |
| Bouton « Enregistrer la version » | Button **primary** (**seul** CTA, AD-14) | shadcn Button | `color.brand.primary`, `touch.target=48` | sticky bas | §6.8 |
| État `loading` | Skeleton (forme du formulaire) | shadcn Skeleton | `color.skeleton`, pulse | même | §4a |
| État `empty` | EmptyState actionnable | shadcn Card + Button | `bg.subtle`, `text.secondary` | centré | §4b |

> **AD-14** : « Enregistrer la version » est la **seule** action primaire. « Proposer »
> est `secondary` : une génération n'est pas une décision (voir §17, S2).

---

## §4 États de l'écran (6 états S6 + états §6.1)

| État | Déclencheur | Rendu | CTA |
|---|---|---|---|
| `loading` | chargement du DNA local | Skeleton du formulaire (6 lignes par bloc) | aucun |
| `empty` | marque sans Brand DNA | EmptyState : « Décrivez votre marque en un brief, Aurora proposera une première version. » | « Commencer par le brief » (→ `design-brief`) |
| `success` | DNA chargé | formulaire + statuts + provenance | « Enregistrer la version » |
| `error` | lecture locale impossible | Callout danger + « Réessayer » | Réessayer |
| `offline` | réseau coupé | formulaire **pleinement éditable** (édition locale, AD-7) ; « Proposer » **désactivé honnêtement** avec libellé « Nécessite une connexion » | Enregistrer reste actif |
| `killed` | app tuée puis relancée | Skeleton + re-sync ; brouillon non enregistré **signalé** | Reprendre |
| `404` | projet inexistant ou non autorisé | pattern 404 global (**jamais** un 404 brut) | Retour |
| `en-cours` | génération de propositions | progression par bloc, résultats **marqués `generated`** | Annuler |
| `échec` | génération échouée | Callout danger + motif + « Réessayer » ; **aucun** champ modifié | Réessayer |
| `terminé` | version enregistrée | Toast 3 s + `Badge` de version incrémenté | — |

> **Point dur** : en `offline`, « Proposer » est désactivé mais **l'édition et
> l'enregistrement restent actifs**. Un formulaire de marque est une saisie
> locale ; prétendre le contraire serait malhonnête.

---

## §5 Micro-interactions (GPU-only, 150–250 ms, smooth)

| Interaction | Effet | Durée |
|---|---|---|
| Changement de bloc (sommaire) | fondu + translation 8 px | 180 ms |
| Validation d'un champ | pastille de statut : `generated` → `accepted` | 200 ms |
| Violation détectée | pulse du bandeau + scroll vers le champ | 250 ms |
| Verrouillage d'un champ | cadenas + fond `surface-raised` | 150 ms |
| Enregistrement de version | Toast + incrément du badge | 200 ms |

`reduced-motion` : transitions remplacées par un changement d'état instantané.

---

## §6 Modals / BottomSheets

| Modal | Déclencheur | Contenu |
|---|---|---|
| Sélecteur de version | tap `Badge` de version | liste des versions + « Comparer à la version courante » |
| Impact d'un changement | changement d'un bloc visuel (logo/palette/typo) | liste des productions **affectées**, avec « Réviser » / « Ignorer » — **jamais** de réécriture silencieuse (§6.8) |
| Confirmation d'écrasement | « Proposer » sur un champ `locked` | « Ce champ est verrouillé. Le déverrouiller ? » |

---

## §7 Formulaires

Chaque champ = `BrandDnaField<T>` : valeur + statut + sources + verrou.
**Règles de saisie** :
- saisir une valeur la passe à `provided` **si** l'utilisateur l'a tapée lui-même ;
- accepter une proposition la passe à `accepted` ;
- **aucune** action ne peut produire `generated` + contenu sur une assertion de
  marché **sans** source (garde `validateBrandDna`).
Validation au `blur`, pas à la frappe.

---

## §8 Pagination / Tri / Filtres

Pas de pagination (formulaire). **Filtre** utile : « Afficher seulement les champs
non renseignés » et « Afficher seulement les assertions sans source » — ce dernier
est le raccourci vers le travail restant.

---

## §9 Transitions entre écrans

- entrée depuis `design-brief` (le brief alimente la première proposition) ;
- sortie vers `logo-studio` (l'identité visuelle produite devient un `Artifact`) ;
- sortie vers `design-versions` (comparaison) ;
- retour arrière : conserve le bloc ouvert et la position de défilement.

---

## §10 Thèmes (10 + 3 presets, par couche — AD-17)

Aucune valeur brute : toutes les couleurs viennent des tokens. Les 4 pastilles de
statut utilisent les couleurs **sémantiques** (`success`, `info`, `accent-primary`,
`text-muted`) — elles ne changent pas de sens d'un thème à l'autre.

---

## §11 Accessibilité (WCAG AA)

- les 4 statuts ne sont **pas** différenciés par la seule couleur : chaque pastille
  porte un **libellé** (« Fourni », « Proposé », « Accepté », « Inconnu ») ;
- le bandeau de violations est une `aria-live="polite"` ;
- cibles ≥ 44 px, focus visible, `reduced-motion` respecté ;
- la navigation entre les 6 blocs est utilisable au clavier.

---

## §12 Offline (classe = `hybrid`)

| Capacité | Offline |
|---|---|
| Lire le Brand DNA | ✅ local (AD-7) |
| Éditer et enregistrer une version | ✅ local, file d'attente de synchronisation |
| **Générer** des propositions | ❌ `online-required` — bouton désactivé **avec motif** |
| Comparer deux versions | ✅ local |

---

## §13 Occurrences du logo (S9)

Le logo de la marque **n'est pas** un asset Aurora : la page utilise le logo
Aurora dans la TopBar selon la matrice S9 ; les logos **de l'utilisateur** sont des
`Artifact` référencés par `visualIdentity.logoArtifactIds`, rendus dans le bloc
« Identité visuelle ».

---

## §14 Questions ouvertes (OQ)

| # | Question | Verdict |
|---|---|---|
| OQ-7 | Brand DNA = entité dédiée ? | **TRANCHÉE** : type `packages/domain` rattaché au `Project` (`design-space-oq-rulings.md`) |
| OQ-13 | Nombre de blocs du formulaire : 6 en une page, ou 6 sous-routes ? | **DÉRIVÉE** : 6 blocs en **une** page à sommaire — §6.3 décrit un parcours continu, pas 6 étapes séparées ; et §6.2 les présente comme **une** représentation |
| OQ-14 | La génération produit-elle **tous** les blocs, ou bloc par bloc ? | **DÉFAUT-RÉVERSIBLE** : bloc par bloc (le plus petit choix). Défaire = générer tous les blocs en un appel. §6.3.5 dit « fournir plusieurs options différenciées », ce qui favorise le grain fin |

---

## §15 Responsive (cadre v1)

| Breakpoint | Layout | Navigation | Notes |
|---|---|---|---|
| base → `md` (< 768 px) | 1 colonne (bloc courant) | sommaire **replié** dans un `Sheet` | formulaire pleine largeur ; provenance en accordéon |
| `md` → `lg` (768–1023 px) | 1 colonne + sommaire en rail d'icônes | rail latéral | — |
| **`lg+` (≥ 1024 px)** | **3 zones** : sommaire (240 px) · formulaire (flex) · provenance (320 px) | panneau latéral | gabarit **Formulaire + panneaux** |

---

## §16 Critères de readiness (avant de coder)

| # | Critère | État |
|---|---|---|
| R1 | Owner identifié | ✅ Design Space Pro (famille **Artifacts**) |
| R2 | Ligne de catalogue | ⏳ à ajouter : `design.brand-dna` (ce lot) |
| R3 | Types SSoT déclarés | ✅ `entities-design.ts` (`BrandDna`, `BrandDnaField`, `AssertionStatus`) |
| R4 | Spec complète §1–§14 | ✅ ce document |
| R5 | 6 états S6 | ✅ §4 |
| R6 | États §6.1 | ✅ §4 (`en-cours`, `échec`, `terminé`, `404`) |
| R7 | Classe offline | ✅ `hybrid` (§12) |
| R8 | Événements | **aucun** émis par l'écran (le DNA est un contrat, pas un livrable ; AD-9 fermé à 9) |
| R9 | Permissions | aucune |
| R10 | Entrée de nav | ✅ section **C. Créer** (§4.2 de la référence) |
| R11 | Tokens | ✅ §3 (aucune valeur brute) |
| R12 | Contrat de données | ✅ lecture locale AD-7 ; aucune écriture de table d'autrui (AD-6) |
| R13 | OQ bloquantes | ✅ OQ-7/13/14 tranchées (§14) |

**Verdict readiness** : `READY` (après l'ajout de la ligne catalogue R2).

---

## §17 Critères de succès (pour déclarer « fait »)

| # | Critère | Mesure |
|---|---|---|
| S1 | Données réelles | le DNA vient du store local ; aucun tableau codé en dur |
| S2 | **4 statuts prouvés** | chaque statut atteignable, et **`generated` sans source sur une assertion de marché est refusé** (test de non-vacuité) |
| S3 | `404`/`feature-disabled` par le pattern global | testé |
| S4 | Offline vérifié | édition OK, « Proposer » désactivé avec motif |
| S5 | Retour arrière | tuer/relancer → version intacte |
| S6 | Isolation utilisateur | un autre utilisateur ne lit pas le DNA (RLS) |
| S7 | Tokens-only | 0 valeur brute |
| S8 | A11y AA | 4 statuts avec libellé, `aria-live`, 44 px |
| S9 | Responsive | 3 paliers conformes à §15 |
| S10 | Gate vert | typecheck + lint + tests |
| S11 | Aucune régression | suites existantes vertes |

---

## §18 Critères de QA (9 classes — `docs/testing/matrix.md` §1)

| Classe | Question | Preuve attendue |
|---|---|---|
| Unitaire (domaine) | `validateBrandDna` correct ? | ✅ **déjà livré** — 16 tests, `packages/domain/test/brand-dna.test.ts` |
| Intégration | le DNA se relit-il après coupure ? | test PowerSync |
| Contrat | aucun événement émis (AD-9) | test d'absence |
| E2E | brief → DNA → version | Playwright |
| Failure | génération échouée → aucun champ modifié | test |
| Permission | n/a | — |
| Offline | édition locale + « Proposer » honnête | test |
| Recovery | brouillon non enregistré signalé après `killed` | test |
| Plateforme | n/a (web) | — |

---

## §19 Couverture de tests exigée

| Périmètre | Seuil |
|---|---|
| `packages/domain` (Brand DNA) | **≥ 80 %** — ✅ 16 tests déjà verts |
| Cet écran | ≥ 1 test par classe applicable (§18) |
| 6 états S6 | 6 tests |
| Story | ≥ 1 story `Defaut`+`vide`+`chargement`+`erreur` + ≥ 1 test `play` |

```
[ ] R1–R13 vrais
[ ] S1–S11 vrais
[ ] 6 états S6 testés
[ ] ≥ 1 story + ≥ 1 test play
[ ] classe offline testée
[ ] responsive 3 paliers testé
[ ] a11y AA vérifiée
[ ] gate du lot vert
```

---

## §20 Nouvelles questions ouvertes

| # | Question | Verdict |
|---|---|---|
| OQ-15 | Le Brand DNA doit-il être **versionné** séparément des livrables ? | **RÉSOLUE** : oui — `BrandDna.version` est monotone et chaque version référence celle dont elle dérive (`basedOnVersion`) ; §6.8 l'exige. Les livrables référencent la version utilisée |
| OQ-16 | Où vit le **stockage** du DNA (pas de table neuve — OQ-7) ? | **DÉRIVÉE** : dans `canvas_sessions.blocks` sous forme markdown sérialisé (AD-16b), rattaché à l'`Artifact` de marque — **aucune table neuve** (`design-space-integration.md` §5). Détail de sérialisation au lot L5 |
