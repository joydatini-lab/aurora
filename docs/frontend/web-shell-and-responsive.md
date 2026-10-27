# Socle d'interface web-first + système responsive

> **Ref** : `.agents_tmp/PLAN.md` §4 étape 5 · ADR-018 (D-018.1 web-first) ·
> AD-14 (invariant Home) · AD-17 (thèmes) · AD-13 (6 états UX).
> **Objet** : définir le shell web premium, la grille responsive, et le plan de
> composition des écrans. **Aucun code ici** (AD-13 : le plan = `.md`).
> **Méthode** : partir des 51 specs d'écran (`docs/design-system/screens/`), de
> `docs/design-system/impl-plan.md`, de `docs/mobile/navigation-and-page-composition.md`
> (à re-décliner) et de l'inventaire `docs/frontend/ui-brick-inventory.md`.

---

## 1. État vérifié du responsive aujourd'hui

| Élément | Constat | Preuve |
|---|---|---|
| Breakpoints Tailwind | **AUCUN défini** — `theme.extend` ne contient pas de clé `screens` | `packages/ui/tailwind.config.ts` |
| Tokens de layout | Absents (pas de token de largeur de colonne / sidebar) | `packages/ui/tailwind.config.ts` |
| Navigation | **mobile-only** : 5 tabs (44–60 px), détails en `IonModal`/`IonSlides` | `docs/mobile/navigation-and-page-composition.md` §1 |
| Shell web | **inexistant** | pas de routeur web distinct |
| Primitive desktop | `desktop-sidebar` + `desktop-command-menu` existent dans `packages/ui` | `packages/ui/src/components/ui/` |

**Verdict** : le responsive **n'est pas spécifié** ; Tailwind retombe sur ses
défauts (`sm:640 md:768 lg:1024 xl:1280 2xl:1536`). La navigation est pensée
mobile-first, ce qui est cohérent avec ADR §23 (ancien) mais **contredit**
D-018.1. C'est le principal écart bloquant pour une livraison web.

---

## 2. Système responsive — **DÉCISION** (OQ-4 tranchée le 2026-10-24)

### 2.1 Principe directeur

> **Le palier de largeur décide du *mode* ; le gabarit de l'écran décide de
> l'*arrangement*. Les deux sont indépendants.**

Un écran ne code pas « si desktop alors… ». Il déclare **son gabarit**, et le
shell applique l'arrangement du gabarit pour le mode courant. C'est ce qui couvre
**tous les cas** sans multiplier les cas particuliers.

### 2.2 Les 5 paliers de largeur (échelle = défauts Tailwind, jamais de valeurs inventées)

| Palier | min-width | **Mode** | Navigation | Panneaux | Gouttière |
|---|---|---|---|---|---|
| *(base)* | 0 | `phone` | tab bar basse (5 onglets) | 1 seul | 16 px |
| `sm` | 640 px | `phone-large` | tab bar | 1 seul | 16 px |
| `md` | 768 px | `tablet` | **rail** (icônes seules, 64 px) | 1 + 1 repliable | 24 px |
| **`lg`** | **1024 px** | **`desktop`** | **barre latérale** (240 px, libellés) | **2 panneaux** | 24 px |
| `xl` | 1280 px | `wide` | barre latérale | **2–3 panneaux** (inspecteur) | 32 px |
| `2xl` | 1536 px | `wide-plus` | barre latérale | 3 panneaux | 32 px |

**Pourquoi ces valeurs suffisent à tous les cas :**

- L'échelle est **celle de Tailwind par défaut** : on n'invente aucun nombre
  (discipline « tokens-only », `docs/design-system/overview.md` §2).
- **`lg` = 1024 px est le seuil structurant** (1 → 2 panneaux). Justification
  arithmétique : `240 (sidebar) + 640 (colonne de lecture lisible) + 2×24 (gouttières)
  = 928 px` → 1024 laisse une marge confortable sans comprimer.
- **`xl` = 1280 px ouvre le 3ᵉ panneau** (inspecteur/validateur) :
  `240 + 360 (liste) + 640 (détail) = 1240 px` → tient dans 1280.
- **`2xl` = 1536 px** : au-delà, on **plafonne la largeur du contenu** (lire sur
  2 m de large est illisible) et on donne la toile aux éditeurs.
- Aucun palier au-delà : au-delà de 1536, la seule variable utile est la largeur
  de la **toile d'édition**, pas la structure.

### 2.3 Les 8 gabarits × 5 modes — matrice **tous les cas**

`1` = une colonne · `2` = deux panneaux · `3` = trois panneaux · `T` = plein
écran (toile) · `O` = overlay plein écran.

| Gabarit | `phone` <768 | `tablet` 768–1023 | **`desktop` 1024–1279** | `wide` 1280–1535 | `wide-plus` ≥1536 | Écrans |
|---|---|---|---|---|---|---|
| **Tableau de bord** | 1 | 1 + rail | 2 (nav + contenu) | 2 + inspecteur | 3 | `home`, `progress-dashboard`, `analytics`, `design-space` |
| **Liste + détail** | 1, détail `O` | 1 + détail `O` | **2** (liste \| détail) | 2 | 3 (+ inspecteur) | `taches-*`, `projets-*`, `objectifs-*`, `cours-*`, `fiches-*`, `knowledge-*`, `logo-variants`, `design-versions`, `design-exports`, `design-assets`, `brand-impact` |
| **Calendrier** | 1 | 1 | **2** (mini-agenda + grille) | 2 | 2 | `calendrier-*`, `revues-*`, `timeline-gantt` |
| **Éditeur** | 1, **toile `T`** | `T` + rail | **`T`** + panneau calques + inspecteur | `T` + 2 panneaux | `T` + 3 panneaux | `logo-studio`, `affiche-studio`, `document-studio`, `charte`, `focus-mode`, `exercises-proof`, `kanban` |
| **Flux** | 1, détail `O` | 1 | **2** (liste \| conversation) | 2 | 3 | `discovery-feed`, `inbox`, `agent-chat` |
| **Session guidée** | 1 centrée | 1 centrée | **1 centrée** (lecture max) | 1 centrée | 1 centrée | `flashcards`, `qcm`, `cours-detail`, `mirror-cognitive` |
| **Formulaire** | 1 | 1 | **1 centrée** + inspecteur | 1 + inspecteur | 2 | `settings`, `onboarding`, `design-brief`, `brand-dna`, `objectifs-detail` |
| **État spécial** | 1 | 1 | hérite du parent | hérite | hérite | `not-found`, `bibliotheque-ressources`, `slide-ascent` |

**Règles issues de la matrice :**

1. **Un écran n'a qu'un gabarit.** Il ne teste jamais la largeur lui-même.
2. **Le détail est un overlay (`O`) sous `lg`, un panneau à `lg`+** — même
   composant, conteneur différent. C'est la règle qui couvre le plus de cas.
3. **L'éditeur est plein écran dès `md`** : il ne tient pas dans une colonne.
4. **La session guidée reste à 1 colonne à tous les paliers** — choix de
   concentration, pas contrainte technique.
5. **La `phone` n'est jamais une version dégradée** : ce qui disparaît doit être
   *déclaré* (§4).

### 2.4 Contrats responsive imposés par la référence (§4.3) — **exigences**

| # | Contrat | Mise en œuvre |
|---|---|---|
| C1 | Navigation compacte quand la largeur diminue | tab bar → rail → sidebar (5 paliers) |
| C2 | Panneaux de contexte et d'inspection **repliables** | état replié persisté (`ui-state`), jamais perdu |
| C3 | Contrôles d'édition utilisables **au clavier et au pointeur** | `focus-visible`, tab order, raccourcis ; pas de geste exclusif |
| C4 | Tableaux transformés en vues adaptées **sans supprimer les actions** | < `md` : table → cartes ; chaque action reste atteignable |
| C5 | **Reprise après rafraîchissement** | l'état de vue (filtres, tri, panneau replié, brouillon) survit au reload |
| C6 | Confirmation visible des **sauvegardes et exports** | toast + état de l'artefact |
| C7 | Travaux longs **hors du cycle bloquant** | job + statut observable ; l'UI reste interactive |

---

## 3. Le shell web (2 panneaux)

### 3.1 Topologie

```
┌──────────────────────────────────────────────────────────────┐
│  Barre supérieure : logo · recherche (⌘K) · thème · compte   │
├────────────┬─────────────────────────────────────────────────┤
│            │                                                 │
│  Panneau   │   Zone de contenu principale                    │
│  latéral   │   ┌──────────────────────────────────────────┐  │
│  (nav)     │   │  PageHeader (titre + actions)            │  │
│            │   ├──────────────────────────────────────────┤  │
│  • Home    │   │                                          │  │
│  • Tasks   │   │  Région de données (6 états AD-13)       │  │
│  • Learn   │   │                                          │  │
│  • Progress│   │                                          │  │
│  • Agent   │   └──────────────────────────────────────────┘  │
│  ─────────│                                                  │
│  • Inbox   │                                                 │
│  • Skills  │                                                 │
│  • Settings│                                                 │
├────────────┴─────────────────────────────────────────────────┤
│  (mobile < lg : tab bar basse 5 onglets, AD-14 inchangé)      │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Rôle d'Ionic (OQ-1 — bloquant)

Ionic impose `ion-*` (web components) et son propre système de navigation.
Deux options :

| Option | Description | Avantages | Coûts |
|---|---|---|---|
| **A** | Ionic = shell sur **les 3 cibles** | 1 codebase, 1 routeur | les `ion-*` sont mobile-first ; le 2-panneaux desktop devient un combat contre Ionic ; les composants `packages/ui` (Radix) cohabitent mal avec les web components |
| **B** | Ionic = **mobile seulement** ; web/desktop = **React Router + shadcn/ReUI pur** | `packages/ui` (Radix) est natif ; responsive propre ; shell desktop idiomatique | 2 shells à maintenir ; routes à dédoublonner |

**✅ DÉCISION OWNER (2026-10-24) : option B retenue — Ionic = MOBILE SEULEMENT.**
Web et desktop = **React pur** (React Router + shadcn/ReUI, **sans `ion-*`**).
Raison : `packages/ui` est bâti sur **Radix/shadcn** (23 paquets `@radix-ui/*`,
`components.json` style `new-york`). Ionic et Radix sont deux systèmes de
composants concurrents ; les faire cohabiter produit des conflits de style,
de focus et d'a11y.

**Conséquence topologique (OQ-10 ratifiée)** : création d'**`apps/web-app`** —
Electron l'enveloppe (même shell, pas un 3ᵉ front) ; `apps/mobile` (Ionic) reste
inchangée.

**Motivation formelle de l'écart à D-06** : la référence §8.7.1/§8.7.3/D-06
retenait Ionic pour l'application métier web ; la référence **exige** un ADR
motivé (§10.2 item 6). C'est fait : `adr-018` **§7**.

### 3.3 Répartition navigation : barre latérale vs tab bar

| Zone | Desktop (`lg+`) | Mobile (`< lg`) |
|---|---|---|
| Navigation primaire | panneau latéral | tab bar basse (5 onglets) |
| Détails d'entité | **panneau de droite** (split) | overlay plein écran |
| Recherche | barre supérieure `⌘K` | `launcher-bubble` |
| Commandes | `desktop-command-menu` | palette plein écran |
| Actions de page | `PageHeader` (droite) | `PageHeader` (compact) |

**Invariant conservé (AD-14)** : la composition de Home reste **fixe** (7 slots :
agenda · next action · priorité · progression critique · revues dues · accès Focus ·
suggestions Coach). Le shell change, **pas** la composition.

### 3.4 Le « 2 panneaux » par écran

`docs/design-system/impl-plan.md` mentionne déjà « desktop 2 panneaux » pour
`progress-dashboard`. Généralisons la règle :

- **Liste + détail** : la liste reste à gauche, le détail s'ouvre à droite
  (au lieu d'un overlay) dès `lg`.
- **Éditeurs riches** (`Design Space Pro`, `canvas`, `kanban`, `gantt`,
  `timeline-gantt`) : plein écran dès `lg` — ils ne tiennent pas dans une colonne.
- **Écrans de lecture** (`home`, `progress-dashboard`, `revues-*`) : contenu
  centré, largeur plafonnée (≈ 1280 px).

---

## 4. Plan de composition des écrans (depuis les 51 specs)

Les 51 specs de `docs/design-system/screens/` suivent un format homogène en 14
sections : *Psychologie · Zones · Éléments · États · Micro-interactions · Modals ·
Formulaires · Pagination · Transitions · Thèmes · A11y · Offline · Logo · OQ*.

**Elles sont déjà conformes à l'exigence AD-13** (`§4 États` couvre 6 états S6 +
états sémantiques §6.1 + 404 + killed). Exemple vérifié : `taches-liste.md` §4(a–d),
`home.md` §4a–4c.

**Ce qui manque pour la V1** (PLAN §7.2) :

| Manque | Où l'ajouter | Étape |
|---|---|---|
| **Responsive par écran** | nouvelle section `§15 Responsive` | **étape 5** (présente) |
| **Critères de readiness** | nouvelle section `§16` | étape 6 |
| **Critères de succès** | nouvelle section `§17` | étape 6 |
| **Critères de QA** | nouvelle section `§18` | étape 6 |
| **Couverture de tests exigée** | nouvelle section `§19` | étape 6 |

**Décision de forme** : on **étend** les specs existantes (on ne les réécrit pas).
Les sections §15–§19 s'ajoutent **après** §14 (OQ), pour ne pas déplacer les
numéros cités par les SSoT (`impl-plan.md` cite `05 §4 l.1316`, etc.).

### 4.1 Classification des 51 specs par gabarit — **référence unique : §2.3**

> La matrice **§2.3** (8 gabarits × 5 modes) est la **source normative**. Ce tableau
> n'est qu'un index de lecture par écran.

| Gabarit | Écrans | Layout desktop |
|---|---|---|
| **Tableau de bord** | `home`, `progress-dashboard`, `analytics` | contenu centré, 7 slots AD-14 / grille de cartes |
| **Liste + détail** | `taches-*`, `projets-*`, `objectifs-*`, `cours-*`, `fiches-*`, `knowledge-*` | split 2 panneaux |
| **Calendrier** | `calendrier-jour/semaine/mois`, `revues-jour/semaine/mois`, `timeline-gantt` | plein écran, grille temporelle |
| **Éditeur** | `kanban`, `focus-mode`, `exercises-proof` (+ 7 écrans Design Space, `design-space-scope.md` §3) | plein écran dès `md` |
| **Flux** | `discovery-feed`, `inbox`, `agent-chat` | 2 panneaux (liste + conversation) |
| **Session guidée** | `flashcards`, `qcm`, `cours-detail`, `focus-mode` | 1 colonne centrée, focus |
| **Formulaire / réglages** | `settings`, `onboarding`, `objectifs-detail` | 1 colonne centrée |
| **État spécial** | `not-found`, `bibliotheque-ressources`, `slide-ascent`, `mirror-cognitive` | selon gabarit parent |
| **Surfaces flottantes** | `_floating-surfaces` (transverse) | panneaux / sheets |
| **Transverses** | `_flows`, `_inventory`, `_report`, `INDEX_REVIEW`, `_open-questions`, `index` | documentation |

**Note — décompte réconcilié** : `ls docs/design-system/screens/*.md` = **51 fichiers**,
dont **7 transverses** (`_floating-surfaces`, `_flows`, `_inventory`, `_open-questions`,
`_report`, `INDEX_REVIEW`, `index`) → **44 écrans réels**.
C'est **exactement** le « 44 docs » ratifié par `impl-plan.md` OQ-1 (N = 54 slugs,
exécution sur 44 docs). **Aucun écart** : les 54 slugs sont portés par les 44 docs
(les variantes partagent le doc de leur paire, ex. `taches-liste` + `taches-detail`).
✅ **OQ-5 fermée** — le décompte normatif est bien **44 docs / 54 slugs**.

---

## 5. Tokens de layout — **DÉCISION** (OQ-6 tranchée)

Aucun token de layout n'existait. Décision : les introduire comme **tokens
sémantiques** consommés par Tailwind — jamais de valeur en dur dans un composant
(`docs/design-system/overview.md` §2 : « Any hardcoded value outside a token =
blocking finding »).

| Token | `phone` | `tablet` | `desktop` | `wide`+ | Usage |
|---|---|---|---|---|---|
| `aurora.layout.rail` | — | 64 px | 240 px | 240 px | navigation latérale |
| `aurora.layout.rail-collapsed` | — | 64 px | 64 px | 64 px | replié (C2) |
| `aurora.layout.panel-min` | — | 320 px | 360 px | 360 px | panneau liste/détail |
| `aurora.layout.inspector` | — | — | 320 px | 360 px | inspecteur/validateur |
| `aurora.layout.reading-max` | 100 % | 720 px | 720 px | 720 px | texte long (fiches, documents) |
| `aurora.layout.content-max` | 100 % | 100 % | 1120 px | 1280 px | contenu plafonné |
| `aurora.layout.gutter` | 16 px | 24 px | 24 px | 32 px | marge de page |
| `aurora.layout.tabbar` | 56 px | 56 px | — | — | tab bar basse |

**Cas particulier — Éditeur** : le gabarit « Éditeur » **ignore** `content-max`
(la toile prend tout l'espace) et n'applique que `gutter` + les panneaux. C'est la
seule exception, et elle est déclarée.

---

## 6. Plan de lots (web-first)

| Lot | Contenu | Dépend de | Gate |
|---|---|---|---|
| **W0** | `apps/web-app` (squelette React + Vite) + breakpoints Tailwind + tokens de layout (§5) | — | typecheck, lint, tests |
| **W1** | shell web : barre supérieure + sidebar **9 entrées** (§3.1) + zone contenu + tab bar mobile | W0 | build + story |
| **W2** | responsive : 5 paliers, 8 gabarits, 7 contrats **C1–C7** (§2) | W1 | tests par viewport |
| **W3** | gabarit « Liste + détail » (~11 écrans, le plus fréquent) | W1, W2 | story + test |
| **W4** | gabarit « Tableau de bord » (Home AD-14, Progress, design-space) | W1 | story + test |
| **W5** | gabarit « Calendrier » | W1 | story + test |
| **W6** | gabarit « Session guidée » (flashcards, QCM) | W1 | story + test |
| **W7** | gabarit **« Éditeur »** (prérequis Design Space Pro) | W1, W2 | story + test |
| **W8** | `not-found` global + `feature-registry` | W1 | test |
| **W9** | Desktop : **Electron enveloppe `web-app`** (pas un 3ᵉ front) | W1–W8 | packaging |
| **W10** | Mobile : Ionic — **régressions seulement**, AD-14 préservé | W9 | APK |

**Règle d'exécution (AD-13)** : 1 lot = 1 commit = 1 rollback ; `main` buildable
à chaque lot ; gate vert **avant** le lot suivant.

**Écart assumé** : le lot « Éditeur » (**W7**) est **remonté** avant les écrans
Design Space (Phase 1B), parce que **7 des 13** écrans proposés
(`docs/frontend/design-space-scope.md` §3) en dépendent.

**Note** : W0–W8 sont bloqués par le **gate rouge** mesuré (`docs/ci/gate.md`).
Corriger le gate est un préalable.

---

## 7. Questions ouvertes — **ratifiées par le owner le 2026-10-24**

| # | Question | **Décision owner** | Impact sur ce document |
|---|---|---|---|
| **OQ-1** | Ionic = shell 3 cibles, ou mobile seulement ? | ✅ **Ionic = MOBILE SEULEMENT.** Web + desktop = **React** (React Router + shadcn/ReUI purs) | §3.2 résolu : **option B retenue**. Le shell web (§3.1) est du **React pur, sans `ion-*`**. Motivation formelle de l'écart à D-06 : `adr-018` §7. |
| **OQ-2** | Desktop : Electron / Tauri / PWA ? | ✅ **Electron confirmé. Tauri écarté.** | Lot W8 = Electron (spike `apps/desktop`). |
| **OQ-3** | Périmètre de la 1ʳᵉ livraison web ? | ✅ **Les 44 écrans + les écrans des features nouvelles** (Design Space Pro, documents, charte…) | §4 : le périmètre **dépasse 44**. Voir `docs/frontend/design-space-scope.md` (~13 écrans proposés). |
| **OQ-4** | Seuil de bascule 2 panneaux / système responsive | ✅ **TRANCHÉE** (§2) — 5 paliers, `lg`=1024 structurant, matrice 8 gabarits × 5 modes |
| **OQ-5** | Décompte normatif des écrans | ✅ **FERMÉE** : 51 fichiers − 7 transverses = **44 écrans** | conforme à `impl-plan.md` OQ-1 |
| **OQ-6** | Tokens de layout | ✅ **TRANCHÉE** (§5) — 8 tokens, valeur par palier |
| **OQ-10** | Créer `apps/web-app` ? | ✅ **RATIFIÉE** — oui ; `apps/mobile` (Ionic) conservée (§3.2) |

### 7.1 Contrats responsive imposés par la référence produit (§4.3)

À intégrer au lot W2 (ce ne sont plus des propositions mais des **exigences**) :

- navigation compacte quand la largeur diminue ;
- panneaux de contexte et d'inspection **repliables** ;
- contrôles d'édition utilisables **au clavier et au pointeur** ;
- tableaux transformés en vues adaptées **sans supprimer les actions** ;
- sauvegarde d'état et **reprise après rafraîchissement** ;
- confirmation visible des **sauvegardes et des exports** ;
- travaux longs **hors du cycle bloquant** de l'interface.

### 7.2 Impact de Design Space Pro sur le shell

Les écrans de Design Space Pro sont des **grandes surfaces de travail**
(référence §4.3). Ils imposent au shell :
- un gabarit **« Éditeur »** (plein écran dès `lg`) ;
- des **panneaux repliables** (calques, inspecteur, validateur) ;
- une **navigation compacte** qui ne mange pas la toile.

→ le lot **W3** (« Liste + détail ») doit être **précédé** d'un lot **« Éditeur »**,
ou les deux menés ensemble. À intégrer au plan de lots.

### 7.3 Référence : structure de navigation web proposée (§4.2)

La référence propose **9 entrées** (non normatives : « le nom final, la barre
latérale, le regroupement éventuel … doivent être testés sur des tâches réelles ») :

**A.** Accueil personnalisé · **B.** Projets / Workspaces · **C. Créer** (→ Design
Space Pro) · **D.** Apprendre · **E.** Découvrir · **F.** S'organiser ·
**G.** Connaissances · **H.** Bibliothèque / Artefacts · **I.** Paramètres.

À confronter au shell §3.1 (le panneau latéral actuel n'a pas d'entrée
« **Créer** » — c'est l'ajout structurel le plus visible de Design Space Pro).
