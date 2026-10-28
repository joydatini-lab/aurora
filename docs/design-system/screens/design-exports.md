# Écran — Exports de design (`design-exports`)

Module : **Design Space Pro** · Route : `/design/:projectId/exports` (et `/design/:projectId/exports/:exportId`) · Statut : **neuf** ·
SSoT écran : `Aurora-Reference-Produit-Fonctionnelle-v1.1.md` §6.9 (exports : règles fonctionnelles, source vs distribution, vérification),
§12.2 (« Les exports sont réellement ouverts ou rendus pour vérification ») · SSoT périmètre : `docs/frontend/design-space-scope.md` §3 (écran 11) · SSoT arbitrages : `docs/frontend/design-space-oq-rulings.md` OQ-9, OQ-12 ·
SSoT types : `packages/domain/src/entities-artifact.ts` (`Artifact`, `ArtifactFile`) · Gabarit : **Liste + détail** (`web-shell-and-responsive.md` §2.3) · Cadre : `docs/frontend/spec-template-v1.md` §15–§19.

---

## §1 Psychologie du designer

| Dimension | Valeur |
|---|---|
| Objectif utilisateur | Exporter un livrable dans les formats **réellement supportés**, en distinguant le **fichier source** du **fichier de distribution**, et vérifier l'export. |
| Contexte (appareil/moment/réseau) | Web/desktop. Les exports lourds sont des **jobs serveur** (AD-8) ; la liste est une lecture locale (AD-7). |
| Fréquence | Fin de chaque production — à chaque livrable à livrer. |
| État émotionnel cible | **Confiant sur ce qui est réellement disponible.** Aucun format n'apparaît comme disponible avant le test réel de sa chaîne (§6.9). |
| Erreur la plus probable | **Afficher un format comme disponible** alors que sa chaîne d'export n'a pas été testée (§6.9, règle explicite) ; ou confondre source et distribution. |
| Ce que l'écran RÉSOUT | La question « quel format puis-je vraiment obtenir, et l'export est-il valide ? » — liste des exports, statut de vérification, source ≠ distribution. |
| Invariant | **§6.9 / §12.2 / F-06** : jamais de format affiché comme disponible avant test réel ; distinguer source et distribution ; `ArtifactGenerated` émis **après** l'upload R2 (seul producteur `markUploaded`, `packages/artifact/src/commands.ts:179`). |

---

## §2 Zones de l'écran

| Zone | Contenu | SSoT |
|---|---|---|
| TopBar | Nom du livrable source + version du Brand DNA | §6.8 |
| Panneau gauche (liste) | Exports : format, source/distribution, statut (en file / en cours / vérifié / échec) | §6.9 |
| Détail (panneau droit) | Vérification : ouverture, dimensions, ressources essentielles ; éléments non transférés | §6.9 |
| Bandeau « non supporté » | Formats **non** disponibles, avec motif | §6.9 |
| Barre d'action | « Exporter dans ce format » (**seul** CTA) · « Re-vérifier » (secondary) | §6.9 |

---

## §3 Éléments de l'écran (table 100 % de la zone)

| Élément | Composant DS | Lib (`ui-libraries.md` §1) | Tokens (AD-17) | Variante responsive | Source SSoT |
|---|---|---|---|---|---|
| TopBar livrable | TopBar | shadcn (pattern header) | `text.xl`, `color.neutral.900/100` | même | §6.8 |
| Liste des exports | `ListItem` + Badge statut | shadcn List + Badge | `row.min-height=56`, `text.sm`, `border` | liste < `lg`, détail overlay | §6.9 |
| Badge « source » | Badge tonal | shadcn Badge | `color.info`, `color.info-surface` | même | §6.9 |
| Badge « distribution » | Badge tonal | shadcn Badge | `color.accent-primary` | même | §6.9 |
| Badge statut d'export | Badge success/warning/danger | shadcn Badge | vérifié→`success` · en cours→`info` · échec→`danger` | même | §6.9 |
| **Bandeau « non supporté »** | Callout info | shadcn Alert | `color.info` + `-surface` | bandeau sous TopBar | §6.9 |
| Détail de vérification | `KeyValueList` | shadcn Card | `text.muted` (clés), `text-primary` (valeurs) | repliable | §6.9 |
| Liste « éléments non transférés » | `ListItem` warning | shadcn List + Badge | `color.warning` | même | §6.9 |
| Référence à la version source | Chip + lien | shadcn Badge + Button ghost | `color.info` | sous l'export | §6.9 |
| Bouton « Exporter dans ce format » | Button **primary** (**seul** CTA) | shadcn Button | `color.brand.primary`, `touch.target=48` | sticky bas | §6.9 |
| Bouton « Re-vérifier » | Button secondary | shadcn Button | `color.brand.primary` | sticky bas | §6.9 |
| État `loading` | Skeleton (forme de la liste) | shadcn Skeleton | `color.skeleton`, pulse | même | §4 |

> **AD-14 (par analogie)** : « Exporter dans ce format » est la **seule** action
> primaire. Re-vérifier est `secondary` : c'est un contrôle.

---

## §4 États de l'écran (6 états S6 + états §6.1)

| État | Déclencheur | Rendu | CTA |
|---|---|---|---|
| `loading` | chargement de la liste locale | Skeleton de la liste | aucun |
| `empty` | aucun export | EmptyState : « Aucun export pour l'instant. » | « Exporter dans ce format » |
| `success` | exports listés | liste + détail + statut de vérification | « Exporter » |
| `error` | lecture locale impossible | Callout danger + « Réessayer » | Réessayer |
| `offline` | réseau coupé | **liste locale** lisible ; « Exporter » **désactivé** avec motif « Nécessite une connexion » | Re-vérifier désactivé aussi |
| `killed` | app tuée puis relancée | Skeleton + re-sync ; job d'export **repris** (idempotent, AD-8) | Reprendre |
| `404` | export/livrable inexistant ou non autorisé | pattern 404 global (**jamais** un 404 brut) | Retour |
| `en-cours` | job d'export en cours | statut « en cours » + progression ; **hors du cycle bloquant** (§4.3 C7) | Annuler |
| `échec` | export échoué | Callout danger + motif + `jobId` retryable | Réessayer |
| `terminé` | export vérifié | Toast 3 s + statut « vérifié » | — |

> **Point dur** : un format dont la chaîne d'export n'a pas été testée n'est
> **jamais** présenté comme disponible (§6.9). Il apparaît dans le bandeau
> « non supporté » avec un motif — pas dans la liste des actions possibles.

---

## §5 Micro-interactions (GPU-only, 150–250 ms, smooth)

| Interaction | Effet | Durée |
|---|---|---|
| Lancement d'un export | Toast + entrée « en cours » | 200 ms |
| Progression d'un job | barre déterministe | — |
| Vérification terminée | bascule du badge vers « vérifié » | 200 ms |
| Échec d'un export | badge danger + CTA retry | 150 ms |

`reduced-motion` : transitions remplacées par un changement d'état instantané.

---

## §6 Modals / BottomSheets

| Modal | Déclencheur | Contenu |
|---|---|---|
| Choix de format | « Exporter dans ce format » | formats **supportés** uniquement (avec dimensions/options) ; les non supportés sont listés à part avec motif |
| Détail de vérification | tap sur un export | ouverture testée, dimensions, ressources, éléments non transférés (§6.9) |
| Retry de job | export en échec | motif + `jobId` + « Réessayer » (idempotent, AD-8) |

---

## §7 Formulaires

Formulaire d'export : `format` (parmi les **supportés**), `dimensions` (selon
format), `source ou distribution`. **Règles** (§6.9) :
- conserver le format **éditable natif ou structuré** quand il existe ;
- fournir un rendu final dans les formats **pris en charge** ;
- **distinguer** fichier source et fichier de distribution ;
- ne **jamais** afficher un format comme disponible avant le test réel de sa chaîne.

---

## §8 Pagination / Tri / Filtres

- **Tri** : par date desc, puis par format.
- **Filtres** : « source », « distribution », « en échec », « à vérifier ».
- **Pagination** : scroll natif jusqu'à ~50 exports, puis pagination shadcn (S8).

---

## §9 Transitions entre écrans

- entrée depuis `logo-studio`, `affiche-studio`, `document-studio`, `charte` ;
- sortie vers `artifacts-detail` (aperçu du livrable exporté, `docs/design-system/screens/artifacts-detail.md`) ;
- retour arrière : conserve le filtre et la sélection (C5).

---

## §10 Thèmes (10 + 3 presets, par couche — AD-17)

Les statuts d'export utilisent les tokens **sémantiques** (`success`, `info`,
`danger`, `warning`), **figés** quel que soit le thème (règle bloquante
`overview.md` §5.1). Les panneaux utilisent les tokens `packages/ui`.

---

## §11 Accessibilité (WCAG AA)

- le statut d'export porte un **libellé** (« Vérifié », « En cours », « Échec »), pas seulement une couleur ;
- la liste « éléments non transférés » est lisible par lecteur d'écran ;
- le CTA d'export est atteignable au clavier, focus visible ;
- cibles ≥ 44 px, `reduced-motion` respecté.

---

## §12 Offline (classe = `online-required` pour l'export ; liste = locale)

| Capacité | Offline |
|---|---|
| Lister les exports existants | ✅ local (AD-7) |
| Voir la vérification d'un export passé | ✅ local |
| **Exporter** un nouveau fichier | ❌ `online-required` (job serveur, AD-8) — désactivé avec motif |
| Re-vérifier un export | ❌ `online-required` — désactivé avec motif |

> L'export est le seul écran du studio **franchement `online-required`** : le
> rendu final (PDF/DOCX/…) est un job serveur. La **source** reste locale.

---

## §13 Occurrences du logo (S9)

Le logo **Aurora** apparaît dans la TopBar selon la matrice S9. Les aperçus
d'export montrent le **livrable de l'utilisateur** ; ils ne substituent jamais le
logo Aurora.

---

## §14 Questions ouvertes (OQ)

| # | Question | Verdict |
|---|---|---|
| OQ-9 | La source exportée vit-elle dans `blocks` ? | **TRANCHÉE** : non — dans l'`ArtifactFile` (OQ-9) |
| OQ-12 | Moteur d'export ? | **TRANCHÉE** : pipeline PDF/DOCX **à arbitrer** (§6.9) ; aucun format affiché avant test réel |
| OQ-39 | Formats définitifs ? | **DÉRIVÉE** : à arbitrer au lot L12 ; l'écran ne fige que la **règle** (jamais de format annoncé sans test) |
| OQ-56 | Un export est-il un `Artifact` distinct, ou un fichier de l'artefact source ? | **DÉRIVÉE** : un fichier de l'artefact source (`ArtifactFile`, `entities-artifact.ts:50`) — l'export est une **distribution** du même livrable, pas un livrable neuf (AD-6) |
| OQ-57 | La vérification ouvre-t-elle réellement le fichier, ou en lit-elle les métadonnées ? | **DÉRIVÉE** : §6.9 exige « vérifier l'**ouverture** » → le job de vérification rend le fichier (rendu/ouverture testée), pas seulement ses métadonnées |

---

## §15 Responsive (cadre v1 — `docs/frontend/spec-template-v1.md`)

Gabarit : **Liste + détail** (`web-shell-and-responsive.md` §2.3).

| Breakpoint | Layout | Navigation | Notes |
|---|---|---|---|
| base → `md` (< 768 px) | 1 colonne, détail en **overlay `O`** | tab bar basse | consultation + export ponctuel (Phase 4) |
| `md` → `lg` (768–1023 px) | 1 colonne + détail en overlay | rail latéral | — |
| **`lg+` (≥ 1024 px)** | **2 panneaux** : exports \| détail de vérification ; `xl`+ ajoute l'inspecteur | panneau latéral | cible web/desktop |

**Règle** (§2.3 règle 2) : overlay sous `lg`, panneau à `lg`+.

> **OQ-4** : le seuil de bascule overlay→panneau (`lg` proposé) n'est pas ratifié globalement.

---

## §16 Critères de readiness (avant de coder)

| # | Critère | État | Preuve |
|---|---|---|---|
| R1 | Owner identifié | ✅ | Design Space Pro (famille **Artifacts**) |
| R2 | Ligne de catalogue | ⏳ à ajouter : `design.exports` (lot L12) |
| R3 | Types SSoT déclarés | ✅ | `Artifact`/`ArtifactFile` (`entities-artifact.ts:10`/`:50`) ; `ArtifactGeneratedEvent` (`events.ts:125`) |
| R4 | Spec §1–§14 complète | ✅ | ce document |
| R5 | 6 états S6 couverts | ✅ | §4 |
| R6 | États §6.1 couverts | ✅ | §4 (`en-cours`, `échec`, `terminé`, `404`) |
| R7 | Classe offline déclarée | ✅ | `online-required` pour l'export ; liste locale (§12) |
| R8 | Événements | **`ArtifactGenerated`** (`events.ts:125`, **après** upload R2, F-06) ; `JobCompleted` (`events.ts:146`) |
| R9 | Permissions | aucune (R2 presigned, AD-3) |
| R10 | Entrée de nav déclarée | ✅ | depuis les studios ; pas d'onglet |
| R11 | Tokens identifiés | ✅ | §3 (aucune valeur brute) |
| R12 | Contrat de données | ✅ | source = `ArtifactFile` ; export = job idempotent (AD-8) ; single-writer **Artifact** (AD-7) |
| R13 | OQ bloquantes fermées | ✅ | OQ-9/12/39/56/57 tranchées (§14) |

**Verdict readiness** : `NOT_READY` jusqu'à L12 (dépendance pipeline d'export, planifiée).

---

## §17 Critères de succès (pour déclarer « fait »)

| # | Critère | Mesure |
|---|---|---|
| S1 | Données réelles | la liste vient du store local ; aucun export simulé |
| S2 | 6 états prouvés | §4 — 1 story + 1 test par état |
| S3 | 404/feature-disabled | §4 — pattern global, jamais un 404 brut |
| S4 | Offline vérifié | liste locale ; export désactivé avec motif |
| S5 | Retour arrière | tuer/relancer → job repris (idempotent) |
| S6 | Isolation utilisateur | un autre utilisateur ne lit pas les exports (RLS sur `artifacts`) |
| S7 | Tokens-only | 0 valeur brute |
| S8 | A11y AA | statuts avec libellé, 44 px |
| S9 | Responsive | 3 paliers conformes à §15 |
| S10 | Gate vert | typecheck + lint + tests |
| S11 | Aucune régression | suites existantes vertes |
| S12 | **Honnêteté des formats** | aucun format affiché comme disponible sans test réel de sa chaîne (§6.9) |
| S13 | **Source ≠ distribution** | la distinction est visible et persistée (§6.9) |
| S14 | **Vérification réelle** | l'export est ouvert/rendu, pas seulement décrit (§6.9, §12.2) |

---

## §18 Critères de QA (9 classes — `docs/testing/matrix.md` §1)

| Classe | Question | Preuve attendue |
|---|---|---|
| Unitaire (domaine) | options d'export valides ? | Vitest sur `packages/design-engines` |
| Intégration | la liste se relit-elle après coupure ? | test PowerSync sur `artifacts` |
| Contrat | `ArtifactGenerated` **après** upload R2 (F-06) ? | test AD-9 producer/consumer |
| E2E | « exporter → vérifier → ouvrir » | Playwright |
| Failure | export échoué → `error` + `jobId` retryable (AD-8) | test failure |
| Permission | n/a | — |
| Offline | liste locale ; export désactivé | test offline |
| Recovery | job d'export interrompu → reprise idempotente | test recovery |
| Plateforme | n/a (web) | — |

---

## §19 Couverture de tests exigée (seuils + DoD)

| Périmètre | Seuil |
|---|---|
| `packages/design-engines` (export) | **≥ 80 %** lignes |
| `design.exports` | ≥ 1 test par classe applicable (§18) |
| Région « liste des exports » | **6 tests d'état S6** + états §6.1 applicables |
| Écran `design-exports` | ≥ 1 story (`Defaut`+`vide`+`chargement`+`erreur`) + ≥ 1 test `play` |
| Idempotence | ≥ 1 test : job d'export rejoué sans doublon (AD-8, `idempotency_key`) |
| F-06 | ≥ 1 test : `ArtifactGenerated` **après** upload, jamais avant |

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
| OQ-58 | L'écran remplace-t-il `artifacts-detail` (module Artifact) ou le complète ? | **DÉRIVÉE** : il le **complète** — `artifacts-detail` (`docs/design-system/screens/artifacts-detail.md`) prévisualise un livrable ; `design-exports` **pilote** l'export et sa vérification depuis le studio |
| OQ-59 | Un export doit-il être re-vérifié après chaque changement de moteur ? | **DÉRIVÉE** : oui — §12.4 exige une comparaison avant/après pour toute modification de moteur ; la vérification d'export en fait partie |
