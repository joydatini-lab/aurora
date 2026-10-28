# Écran — Accueil du studio Design Space (`design-space`)

Module : **Design Space Pro** · Route : `/design` · Statut : **neuf** ·
SSoT écran : `Aurora-Reference-Produit-Fonctionnelle-v1.1.md` §10.4 (Phase 1B, étape 1 « projet Design Space, brief et source de référence »),
§4.2 section **C. Créer**, §6.1 (mission) · SSoT périmètre : `docs/frontend/design-space-scope.md` §3 (écran 1) ·
SSoT arbitrages : `docs/frontend/design-space-oq-rulings.md` OQ-6, OQ-10 · SSoT intégration : `docs/architecture/design-space-integration.md` §3 (producteur d'`Artifact`) ·
Gabarit : **Tableau de bord** (`web-shell-and-responsive.md` §2.3) · Cadre : `docs/frontend/spec-template-v1.md` §15–§19.

---

## §1 Psychologie du designer

| Dimension | Valeur |
|---|---|
| Objectif utilisateur | Retrouver un **projet de marque** et reprendre le travail là où il s'est arrêté, ou en **créer** un nouveau à partir d'un brief. |
| Contexte (appareil/moment/réseau) | Web/desktop, grand écran ; début de session créative. La liste des projets est une **lecture locale** (AD-7) ; la génération d'une proposition est `online-required`. |
| Fréquence | Faible mais structurante — à chaque fois qu'une marque démarre ou qu'un livrable doit être repris. |
| État émotionnel cible | **Cadré, pas intimidé.** Un créatif doit voir ses marques, leurs derniers livrables et l'action « créer » sans arborescence technique. |
| Erreur la plus probable | Chercher un livrable (logo, affiche, charte) dans une **liste de fichiers** alors que la page est une liste de **projets de marque** ; ou croire qu'un « nouveau projet » crée une entité neuve (c'est un `Project` réutilisé, OQ-7). |
| Ce que l'écran RÉSOUT | La question « sur quelle marque je travaille maintenant, et par quoi je commence ? » — projets récents d'abord, création en un geste. |
| Invariant | **§7.2 / AD-6** : l'écran ne crée **aucune** racine de données neuve. Un projet de marque = un `Project` existant ; les livrables = des `Artifact`. L'écran **lit** et **navigue** ; il n'écrit aucune table d'autrui. |

---

## §2 Zones de l'écran

| Zone | Contenu | SSoT |
|---|---|---|
| TopBar | Titre « Design Space » + recherche + `IconButton` compte | §4.2 C ; `web-shell-and-responsive.md` §3.1 |
| CTA primaire | « Créer un projet de marque » — **seule** action primaire (AD-14 appliqué par analogie) | §10.4.1 ; `design-brief` |
| Bloc « Reprendre » | Derniers projets ouverts (marque + dernier livrable + date) | §6.1 ; `Project.updatedAt` |
| Bloc « Projets de marque » | Liste/grid des `Project` de type marque | `design-space-scope.md` §4 (réemploi `Project`) |
| Bloc « Récents » | Derniers `Artifact` produits par le studio (logo, affiche, charte, document) | `entities-artifact.ts:10` |
| État vide global | EmptyState + CTA « Créer un projet de marque » | §6.3.1 |
| Panneau latéral (shell) | Section **C. Créer** active dans la navigation | §4.2 ; `navigation-mapping.md` §1 |

---

## §3 Éléments de l'écran (table 100 % de la zone)

| Élément | Composant DS | Lib (`ui-libraries.md` §1) | Tokens (AD-17) | Variante responsive | Source SSoT |
|---|---|---|---|---|---|
| Titre « Design Space » | TopBar | shadcn (pattern header) | `text.xl`, `color.neutral.900/100`, `spacing.xl` | même ; nav repliée < `lg` | §4.2 C |
| CTA « Créer un projet de marque » | Button **primary** | shadcn Button | `color.brand.primary`, `touch.target=48` | sticky bas < `md` | §10.4.1 |
| Bloc « Reprendre » | Card elevated + `ListItem` | shadcn Card + List | `surface`, `shadow.2`, `space.4`, `radius.md` | colonne gauche ≥ `lg` | §6.1 |
| Carte projet de marque | Card (nom + dernier livrable + date) | shadcn Card | `text-primary` `sm`, `text-muted` `xs`, `space.4` | grid 1→2→3 colonnes | `Project` (`entities-productivity.ts`) |
| Badge « type de marque » | Badge tonal | shadcn Badge | `color.info`, `color.info-surface` | même | §6.2 |
| Liste des récents | `ListItem` + vignette | shadcn List | `row.min-height=56`, `text.sm` | 1 colonne < `lg` | `Artifact.kind` (`entities-artifact.ts:14`) |
| État vide | EmptyState actionnable | shadcn Card + Button | `bg.subtle`, `text.secondary` | centré | §6.3.1 |
| État `loading` | Skeleton (forme des cartes) | shadcn Skeleton | `color.skeleton`, pulse | même | §4 |

> **AD-14 (par analogie)** : « Créer un projet de marque » est la **seule** action
> primaire de l'écran. Les cartes sont des navigations, pas des actions.

---

## §4 États de l'écran (6 états S6 + états §6.1)

| État | Déclencheur | Rendu | CTA |
|---|---|---|---|
| `loading` | lecture locale des projets | Skeleton des cartes | aucun |
| `empty` | aucune marque | EmptyState : « Vous n'avez pas encore de projet de marque. » | « Créer un projet de marque » |
| `success` | projets chargés | blocs Reprendre + Projets + Récents | CTA création |
| `error` | lecture locale impossible | Callout danger + « Réessayer » | Réessayer |
| `offline` | réseau coupé | liste **locale** pleinement lisible ; badges « Hors-ligne » | CTA création **désactivé** avec motif « Nécessite une connexion » |
| `killed` | app tuée puis relancée | Skeleton + re-sync | Reprendre |
| `404` | projet inexistant ou non autorisé | pattern 404 global (**jamais** un 404 brut) | Retour à l'accueil |
| `en-cours` | recherche de références en cours | progression par projet, résultats **marqués `generated`** | Annuler |
| `échec` | recherche/génération échouée | Callout danger + motif + « Réessayer » | Réessayer |
| `terminé` | projet créé | Toast 3 s + navigation vers `design-brief` | — |

> **Point dur** : en `offline`, la **lecture** des marques et des livrables reste
> complète (miroir local, AD-7) ; seule la **création** (qui exige le serveur) est
> désactivée, avec un motif visible — jamais un spinner infini.

---

## §5 Micro-interactions (GPU-only, 150–250 ms, smooth)

| Interaction | Effet | Durée |
|---|---|---|
| Entrée des cartes | fade + translateY 8→0 | 200 ms |
| Hover carte projet | `transition-colors` (bordure) | 150 ms |
| Ouverture d'un projet | transition page (fade) | 200 ms |
| Création de projet | Toast + navigation | 200 ms |

`reduced-motion` : transitions remplacées par un changement d'état instantané.

---

## §6 Modals / BottomSheets

| Modal | Déclencheur | Contenu |
|---|---|---|
| Création de projet | CTA primaire | formulaire minimal (nom, secteur, source de référence) → `Project` + redirection `design-brief` |
| Sélection de source de référence | « Ajouter une source » | sélection de ressources Knowledge (`SourceRef`, AD-11) |

---

## §7 Formulaires

Formulaire de création : `nom` (requis), `secteur` (optionnel), `source de
référence` (optionnel, liste Knowledge). Validation au `blur`. Aucune donnée
d'entreprise n'est **inventée** : les champs non fournis restent `unknown` (voir
`brand-dna.md` §7, statut épistémique).

---

## §8 Pagination / Tri / Filtres

- **Tri par défaut** : `Project.updatedAt` desc (reprendre le plus récent).
- **Filtres** : par nom, par état de la marque (a un Brand DNA / non), par date.
- **Pagination** : scroll natif < 20 projets ; pagination shadcn 20–100 (S8) ;
  au-delà, virtualisation. Aucun AG Grid (page non dense).

---

## §9 Transitions entre écrans

- entrée depuis la navigation **C. Créer** ;
- sortie vers `design-brief` (nouveau projet) ;
- sortie vers `brand-dna`, `logo-studio`, `affiche-studio`, `document-studio`,
  `charte`, `design-assets`, `design-versions` (reprise d'un projet) ;
- retour arrière : conserve le filtre et la position de défilement (C5).

---

## §10 Thèmes (10 + 3 presets, par couche — AD-17)

Aucune valeur brute : toutes les couleurs viennent des tokens (`packages/ui`,
AD-17). Les cartes utilisent `surface`/`text-primary`/`text-muted` ; les badges de
type utilisent les couleurs **sémantiques** (`info`), qui ne changent pas de sens
d'un thème à l'autre (`overview.md` §3, règle bloquante §5.1).

---

## §11 Accessibilité (WCAG AA)

- chaque carte projet est un élément focusable avec `aria-label` explicite
  (nom + dernier livrable) ;
- le CTA primaire est atteignable au clavier, focus visible ;
- cibles ≥ 44 px, contraste AA (4.5:1 texte, 3:1 UI) ;
- `reduced-motion` respecté.

---

## §12 Offline (classe = `hybrid`)

| Capacité | Offline |
|---|---|
| Lire les projets de marque et les livrables | ✅ local (AD-7) |
| Reprendre un projet (ouvrir un studio) | ✅ local |
| **Créer** un projet / rechercher des références | ❌ `online-required` — action désactivée **avec motif** |
| Comparer / revenir à une version | ✅ local |

---

## §13 Occurrences du logo (S9)

La page utilise le logo **Aurora** dans la TopBar selon la matrice S9 (coloré,
sans fond, état in-app par défaut). Les logos **de l'utilisateur** sont des
`Artifact` référencés par le Brand DNA (`visualIdentity.logoArtifactIds`) et
affichés uniquement comme vignettes de livrable — jamais redessinés, jamais
recréés dans `src/` (S9 interdit l'occurrence ad hoc).

---

## §14 Questions ouvertes (OQ)

| # | Question | Verdict |
|---|---|---|
| OQ-6 | Les 13 écrans Design Space sont-ils ratifiés ? | **TRANCHÉE** : oui, total 57 écrans (`design-space-oq-rulings.md` OQ-6) |
| OQ-10 | Coquille web de cet écran ? | **TRANCHÉE** : `apps/web-app` (React + ReUI, sans `ion-*`), OQ-10 |
| OQ-17 | La création d'un projet de marque ouvre-t-elle directement le brief, ou revient-elle au tableau ? | **DÉFAUT-RÉVERSIBLE** : ouverture directe du brief (le plus petit chemin vers la valeur, §6.3.1) |
| OQ-18 | « Projets de marque » = tous les `Project`, ou un sous-type explicite ? | **DÉRIVÉE** : le projet de marque est un `Project` (OQ-7) ; le marquage de type est une donnée de projet, pas une entité neuve |

---

## §15 Responsive (cadre v1 — `docs/frontend/spec-template-v1.md`)

Gabarit : **Tableau de bord** (`web-shell-and-responsive.md` §2.3).

| Breakpoint | Layout | Navigation | Notes |
|---|---|---|---|
| base → `md` (< 768 px) | 1 colonne (blocs empilés) | tab bar basse (5 onglets) | cible mobile (Phase 4) — création possible, édition renvoyée au web (§4.5) |
| `md` → `lg` (768–1023 px) | 1 colonne + rail d'icônes | barre latérale | tablette |
| **`lg+` (≥ 1024 px)** | **2 panneaux** (nav + contenu) ; `xl` ajoute l'inspecteur « récents » | panneau latéral | cible web/desktop (Phase 1–2) |

**Règle** : le CTA « Créer un projet de marque » (§2) reste **visible et unique**
aux 3 paliers.

> **OQ-4** : le seuil de bascule overlay→panneau (`lg` proposé) n'est pas ratifié globalement.

---

## §16 Critères de readiness (avant de coder)

| # | Critère | État | Preuve |
|---|---|---|---|
| R1 | Owner identifié | ✅ | Design Space Pro (famille **Artifacts**, `master-feature-catalog.md`) |
| R2 | Ligne de catalogue | ⏳ à ajouter : `design.space` (ce lot) |
| R3 | Types SSoT déclarés | ✅ | `Project` (`entities-productivity.ts`), `Artifact` (`entities-artifact.ts:10`) — **aucun type neuf** |
| R4 | Spec §1–§14 complète | ✅ | ce document |
| R5 | 6 états S6 couverts | ✅ | §4 |
| R6 | États §6.1 couverts | ✅ | §4 (`en-cours`, `échec`, `terminé`, `404`) |
| R7 | Classe offline déclarée | ✅ | `hybrid` (§12) |
| R8 | Événements | **aucun** émis par l'écran (lecture/navigation ; AD-9 fermé à 9) |
| R9 | Permissions | aucune |
| R10 | Entrée de nav déclarée | ✅ | section **C. Créer** (§4.2) ; `navigation-mapping.md` §1 |
| R11 | Tokens identifiés | ✅ | §3 (aucune valeur brute) |
| R12 | Contrat de données | ✅ | lecture locale AD-7 ; aucune écriture de table d'autrui (AD-6) |
| R13 | OQ bloquantes fermées | ✅ | OQ-6/10/17/18 tranchées (§14) |

**Verdict readiness** : `READY` (après l'ajout de la ligne catalogue R2).

---

## §17 Critères de succès (pour déclarer « fait »)

| # | Critère | Mesure |
|---|---|---|
| S1 | Données réelles | les projets viennent du store local ; aucun tableau codé en dur |
| S2 | 6 états prouvés | §4 — 1 story + 1 test par état |
| S3 | 404/feature-disabled | §4 — pattern global, jamais un 404 brut |
| S4 | Offline vérifié | lecture OK, création désactivée avec motif |
| S5 | Retour arrière | relance froide → liste du miroir affichée |
| S6 | Isolation utilisateur | un autre utilisateur ne lit pas les projets (RLS) |
| S7 | Tokens-only | 0 valeur brute |
| S8 | A11y AA | cartes focusables, `aria-label`, 44 px |
| S9 | Responsive | 3 paliers conformes à §15 |
| S10 | Gate vert | typecheck + lint + tests |
| S11 | Aucune régression | suites existantes vertes |

---

## §18 Critères de QA (9 classes — `docs/testing/matrix.md` §1)

| Classe | Question | Preuve attendue |
|---|---|---|
| Unitaire (domaine) | tri/filtre de projets corrects ? | Vitest ≥ 80 % sur `packages/domain` |
| Intégration | la liste se relit-elle après coupure ? | test PowerSync (vue sans JOIN, re-sync) |
| Contrat | aucun événement émis (AD-9) | test d'absence |
| E2E | « créer un projet → ouvrir le brief » | Playwright web |
| Failure | création échouée → état `error` + retry | test failure |
| Permission | n/a | — |
| Offline | lecture locale + création honnête | test offline |
| Recovery | relance froide → état intact | test recovery |
| Plateforme | n/a (web) | — |

---

## §19 Couverture de tests exigée (seuils + DoD)

| Périmètre | Seuil |
|---|---|
| `packages/domain` | **≥ 80 %** lignes |
| `design.space` | ≥ 1 test par classe applicable (§18) |
| Région « projets de marque » | **6 tests d'état S6** + états §6.1 applicables |
| Écran `design-space` | ≥ 1 story (`Defaut`+`vide`+`chargement`+`erreur`) + ≥ 1 test `play` |

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
| OQ-19 | La recherche globale (§4.6) doit-elle retrouver les projets de marque et leurs livrables ? | **DÉRIVÉE** : oui — §4.6 liste explicitement « projets, … productions » et impose le respect des permissions |
| OQ-20 | Un projet de marque peut-il être créé depuis `/projects` (module Productivity) plutôt que depuis le studio ? | **À TRANCHER** au lot L9 (D1) — la référence §10.4.1 place la création dans Design Space, mais `Project` est partagé (OQ-7) |
