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

## 2. Breakpoints normatifs (proposition à ratifier)

Alignés sur les défauts Tailwind pour éviter d'inventer une échelle (principe
« tokens-only », `docs/design-system/overview.md` §2) :

| Nom | Min-width | Cible | Layout |
|---|---|---|---|
| *(base)* | 0 | mobile | 1 colonne, tab bar basse |
| `sm` | 640 px | grand mobile | 1 colonne |
| `md` | 768 px | tablette | 1 colonne + navigation latérale repliable |
| `lg` | 1024 px | **seuil desktop** | **2 panneaux** |
| `xl` | 1280 px | desktop large | 2 panneaux + panneau latéral 3ᵉ optionnel |
| `2xl` | 1536 px | très large | largeur de contenu plafonnée |

**Règle de bascule (OQ-4)** : le passage **1 colonne → 2 panneaux** se fait à
**`lg` (1024 px)**. C'est le seuil où la somme « sidebar (≥ 240 px) + contenu
lisible (≥ 640 px) » tient sans compression.

> ⚠️ **OQ-4 ouverte** : ce seuil est une **proposition**, pas une décision
> ratifiée. Il doit être validé par le owner avant implémentation.

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

**Recommandation : option B.** Raison : `packages/ui` est bâti sur **Radix/shadcn**
(confirmé : `components.json`, `@radix-ui/*` dans les deps). Ionic et Radix sont
deux systèmes de composants concurrents ; les faire cohabiter dans un même shell
produit des conflits de style et d'accessibilité. Séparer les shells laisse
`packages/ui` s'exprimer pleinement en web/desktop, et conserve Ionic là où il
excelle (natif mobile).

> ⚠️ **OQ-1 ouverte** : cette recommandation doit être ratifiée par le owner
> (elle touche `apps/mobile` et l'architecture du routeur).

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

### 4.1 Classification des 51 specs par gabarit de composition

| Gabarit | Écrans | Layout desktop |
|---|---|---|
| **Tableau de bord** | `home`, `progress-dashboard`, `analytics` | contenu centré, 7 slots AD-14 / grille de cartes |
| **Liste + détail** | `taches-*`, `projets-*`, `objectifs-*`, `cours-*`, `fiches-*`, `knowledge-*` | split 2 panneaux |
| **Calendrier** | `calendrier-jour/semaine/mois`, `revues-jour/semaine/mois`, `timeline-gantt` | plein écran, grille temporelle |
| **Éditeur** | `canvas`(absent), `kanban`, `focus-mode`, `exercises-proof` | plein écran |
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

## 5. Tokens de layout à ajouter (proposition)

Aucun token de layout n'existe. Proposition **minimale**, dans la discipline
« tokens-only » (`docs/design-system/overview.md` §2) :

| Token proposé | Valeur | Usage |
|---|---|---|
| `aurora.layout.sidebar` | 240 px (replié : 64 px) | panneau latéral |
| `aurora.layout.content-max` | 1280 px | largeur de contenu plafonnée |
| `aurora.layout.reading-max` | 720 px | texte long (documents, fiches) |
| `aurora.layout.detail-min` | 360 px | panneau de détail |
| `aurora.layout.gutter` | 24 px | marge de page |

**Règle** : ces valeurs deviennent des **tokens sémantiques** consommés par
Tailwind, jamais des valeurs en dur dans un composant (`docs/design-system/overview.md`
§2 : « Any hardcoded value outside a token = blocking finding »).

---

## 6. Plan de lots (web-first)

| Lot | Contenu | Dépend de | Gate |
|---|---|---|---|
| **W0** | breakpoints Tailwind + tokens de layout + tests | — | typecheck, lint, tests |
| **W1** | shell web (barre sup + panneau latéral + zone contenu) | W0, OQ-1 | build + story |
| **W2** | responsive : bascule 1 col ↔ 2 panneaux | W1 | tests viewport |
| **W3** | gabarit « Liste + détail » (le plus fréquent) | W1, W2 | story + test |
| **W4** | gabarit « Tableau de bord » (Home AD-14, Progress) | W1 | story + test |
| **W5** | gabarit « Calendrier » | W1 | story + test |
| **W6** | gabarit « Session guidée » (flashcards, QCM) | W1 | story + test |
| **W7** | `not-found` global + `feature-registry` | W1 | test |
| **W8** | Desktop Electron (Phase 2) | W1–W7 | packaging |
| **W9** | Mobile Ionic (Phase 3) | W8 | APK |

**Règle d'exécution (AD-13)** : 1 lot = 1 commit = 1 rollback ; `main` buildable
à chaque lot ; gate vert **avant** le lot suivant.

---

## 7. Questions ouvertes (bloquantes)

| # | Question | Bloque | Statut |
|---|---|---|---|
| **OQ-1** | Ionic = shell 3 cibles, ou mobile seulement ? | W1 | **recommandation B**, à ratifier |
| **OQ-4** | Seuil de bascule 2 panneaux = `lg` (1024 px) ? | W2 | proposition |
| **OQ-5** | ~~Décompte normatif des écrans~~ | — | ✅ **FERMÉE** : 51 fichiers − 7 transverses = **44 écrans**, conforme à `impl-plan.md` OQ-1 |
| **OQ-6** | Les tokens de layout proposés (§5) sont-ils validés ? | W0 | proposition |
| **OQ-2** | Desktop = Electron confirmé (vs Tauri/PWA) ? | W8 | ADR-018 §6 |
| **OQ-3** | Périmètre de la 1ʳᵉ livraison web (sous-ensemble ?) | plan de lots | ADR-018 §6 |
