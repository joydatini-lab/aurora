# Cartographie & anatomie des cartes — Aurora UI
> Date : 2026-10-11 · Sources : `packages/ui` (code) + `apps/mobile/src/pages` + `docs/` (05 DS, screen specs)
> Objectif : déduire la **carte minimale suffisante** et sa grammaire de personnalisation par feature.

---

## 1. Les 5 archétypes réels (code + docs)

Toutes les cartes du monorepo se résolvent en 5 archétypes. Tout le reste
est une composition de ceux-là.

| # | Archétype | Rôle | Exemples concrets (feature) |
|---|-----------|-----|------------------------------|
| **C1** | **Entité-card** (plate) | Une ligne d'un objet (tâche, habitude, skill, intégration, veille) | `.task-row`, `.habits-card`, `.skill-card`, `.integration-card`, `.veille-program-card`, `.project-card` |
| **C2** | **Objet-card** (posée) | Un objet riche, multi-sections (review, bilan) | `.review-card`, `.retro-card`, `.skill-doc-sheet-card`, `.countdown-card` |
| **C3** | **KPI-tile** | Une valeur + un label (score, temps, compteur) | `.stat-tile` (progress/focus), `StatTile` (DS), `.goal-progress` |
| **C4** | **Nœud-spatial** | État positionnel (graphe de goal, board) | `.goal-feature-node` (dashboard), `NodeCard` (flow), `.tl-dot`/`.ei-card` |
| **C5** | **Premium-card** | Impact visuel (wobble / interactive / shine) | `WobbleCard`, `InteractiveCard`, `ShineEffect`, `BlurredSpotlight` |

---

## 2. L'anatomie (les 8 zones universelles)

Chaque carte — quel que soit l'archétype — est un empilement de ces zones.
C'est la grille pour **concevoir** et pour **personnaliser**.

```
┌─────────────────────────────────────────────┐
│ Z0 CONTAINER  (fond, bordure, radius, ombre) │  ← l'enveloppe
├─────────────────────────────────────────────┤
│ Z1 ICON/MARK   (32px, accent-surface)        │  ← identité visuelle
│ Z2 HEADER      (titre h3/h4 + libellé mono)  │  ← le « c'est quoi »
│ Z3 BADGE/CHIPS (statut, priorité, tags)      │  ← l'état court
│ Z4 BODY        (contenu principal, libre)    │  ← le cœur
│ Z5 METRICS     (progress, %, valeurs mono)   │  ← la mesure
│ Z6 ACTIONS     (boutons, toggle, CTA)        │  ← l'interaction
│ Z7 FOOTER      (meta, timestamps, avatars)    │  ← le contexte
└─────────────────────────────────────────────┘
```

**Règle SSoT (05 §3.3 l.502)** : *une carte sans titre = interdit.*
`Z2` est donc **obligatoire** sur C1/C2/C3 (Z0 seul). `Z4` (body libre)
est la seule zone véritablement optionnelle.

---

## 3. La carte minimale suffisante (C0)

La carte réduite au strict nécessaire pour exister dans le design system :

```
┌─────────────────────────────┐
│ Z0 CONTAINER                │  fond + bordure + radius + ombre
│   Z2 HEADER (obligatoire)   │  titre
└─────────────────────────────┘
```

**C'est le socle.** Toute carte Aurora est `C0` + un sous-ensemble des
zones `Z1/Z3/Z4/Z5/Z6/Z7`. C'est ça, « concevoir la carte minimale » :
on part de `C0` et on ajoute **une seule zone à la fois**, celle que la
feature exige. Jamais une carte qui empile Z1+Z3+Z5+Z6+Z7 sans Z4 (le
body) — c'est de la surcharge.

### Implémentation `C0` (le composant DS de référence)

Le `Card` shadcn de `packages/ui` est déjà proche, mais sa variante
`rounded-xl` + `shadow` (2px) correspond à C5/premium. Pour la carte
minimale **plate**, on standardise :

```tsx
// Le socle minimal Aurora (plate) :
//  - fond        : bg-card  (= --aurora-surface-bg, token lissé)
//  - bordure     : border   (= --aurora-border, 1px)
//  - radius      : md       (4px, token radius.md ≤ 8px, 05 §2.4)
//  - ombre       : none (plate) ou shadow.1 (posée)
//  - padding     : space.4  (16px, 05 §3.3)
//  - titre       : OBLIGATOIRE (Z2)
```

---

## 4. Grammaire de personnalisation par feature

Le principe : **chaque feature = `C0` + une combinaison des zones**, pilotée
par un **variant** (plate / posée / elevated / image) et des **états**.

### 4.1 Le variant (l'enveloppe Z0) — 4 valeurs

| Variant | Fond | Bordure | Ombre | Usage |
|---------|------|---------|-------|-------|
| `flat` | `surface-alt` / `bg-subtle` | `border` | **none** | Listes denses (tâches, projets) |
| `standard` | `surface` | `border` | `shadow.1` | Cartes d'objet (review, retro) |
| `elevated` | `surface` | `border` | `shadow.2` | Accentuation (Home, GoalProject) |
| `image` | `surface-bg` translucide | `border` | `shadow.1` | Thème image (image-themes AD-17) |

Ces 4 valeurs correspondent exactement aux tokens `--aurora-surface*`
et au lissage `--aurora-surface-bg` (tokens.css l.272) : en thème image,
le variant `image` devient translucide **automatiquement**, sans code.

### 4.2 Les états (AD-13, 5 canoniques) — transverses à tout C

Chaque carte **doit** être capable de rendre ces 5 états (le DS l'exige,
05 S3.3) :

| État | Rendu | Règle |
|------|-------|-------|
| `idle` | la carte normale | — |
| `loading` | **skeleton** (pulse sur Z4, jamais la forme complète) | `.sk-card` / `animate-pulse-skeleton` |
| `empty` | message info (icône + texte), **jamais une carte factice** | `.habits-empty-card`, `.countdown-empty-card` |
| `error` | callout `danger` + bouton **retry**, le dataset last-known reste | `.retro-card` + `onRetry` |
| `offline` | last-known + **badge « Hors ligne »** (pas d'erreur fausse) | règle 04 §3.4 split |

> C'est le point le plus sous-spécifié aujourd'hui : les cartes de contenu
> (C1/C2) portent bien `idle/empty`, mais `error/offline` sont gérés à
> l'extérieur (UxStates) plutôt que **dans la carte**. À unifier.

### 4.3 Matrice feature → zones (le résultat de la cartographie)

Chaque feature existe déjà dans le code ; voici **les zones qu'elle
active réellement** — c'est la référence pour concevoir la carte d'une
feature sans surcharge.

| Feature / page | Archétype | Variant | Zones activées (outre C0+Z2) |
|---|---|---|---|
| `/tasks` — TaskRow | C1 | flat | Z6 (check) + Z3 (flag priorité) + Z5 (échéance mono) |
| `/tasks` — Eisenhower | C1 | flat (translucide) | Z4 (titre) dans quadrant |
| `/habits` | C1 | standard | Z1 (icône 32px) + Z5 (adhérence) + Z6 (+) |
| `/routines` | C2 | standard | Z4 (étapes ol) + Z5 (progress) + callout Z3 (perturbée) |
| `/projects` — Liste/Timeline | C1 | image (verre) | Z4 (desc) + Z3 (tags) + Z7 (point tonal) |
| `/projects` — Kanban | C1 | standard | Z3 (statut+jalon) + Z5 (progress) + Z7 (avatars) |
| `/home` — GoalProject | C5 | elevated | Z5 (progress-line) + Z4 (prochain) |
| `/goals/:id` — NodeCard | C4 | standard | Z5 (état spatial) + Z1 (pulse) |
| `/retro` | C2 | standard | Z4 (écarts) + Z3 (chip Manqué) + Z5 (gantt) |
| `/reviews` | C2 | standard | Z4 (bilan 5 sections) + Z3 (chips statuts) |
| `/integrations` | C1 | standard | Z1 (pastille statut) + Z6 (toggle) |
| `/skills` | C1 | standard | Z1 (Sparkles) + Z3 (source) + Z4 (procédure) + Z6 (actions) |
| `/discovery` — Veille | C1 | standard | Z4 (stats) + Z3 (pertinence chip) + Z6 (menu) |
| `/countdown` | C2 | standard | Z5 (numéro) + Z4 (image fond) |
| `/progress` & `/focus` — KPI | C3 | flat (marqueur accent) | Z4 (label+value) |
| `/agent` — Tool-call | C2 | elevated | Z3 (scope badge) + Z6 (Exécuter/Annuler) |
| `/settings` & `/login` | C2 | standard | Z4 (sections) via shadcn Card |

**Lecture** : aucune feature n'active plus de **4 zones** en même temps.
Celui qui en active 5+ (`/skills`, `/discovery`) est un **C2** (objet
riche), pas un C1 — c'est le critère de bascule C1→C2.

---

## 5. Le composant `AuroraCard` à concevoir (synthèse)

La carte minimale paramétrable qui remplace les 40+ classes `.xxx-card`
ad-hoc. Contraintes du DS : tokens `--aurora-*`, radius ≤ 8px, 5 états,
référence `docs/ui-libraries.md` §2 (shadcn) + 05 §3.3.

```tsx
interface AuroraCardProps {
  // C0 + Z2 obligatoires
  title: React.ReactNode;            // Z2 — la règle « pas de titre interdit »
  variant?: "flat" | "standard" | "elevated" | "image";   // Z0
  state?: "idle" | "loading" | "empty" | "error" | "offline";  // 5 états AD-13

  // Zones optionnelles (chaque prop = une zone)
  icon?: React.ReactNode;           // Z1
  badge?: React.ReactNode;          // Z3 (chips/statut)
  actions?: React.ReactNode;        // Z6 (boutons/toggle)
  metrics?: React.ReactNode;        // Z5 (progress/valeurs)
  footer?: React.ReactNode;         // Z7 (meta/avatars/timestamps)

  // Spécifique archétypes
  kpi?: { value: string | number; unit?: string; delta?: React.ReactNode }; // C3
  children?: React.ReactNode;       // Z4 — le body libre

  // États
  emptyMessage?: React.ReactNode;
  errorMessage?: React.ReactNode;
  onRetry?: () => void;
  offline?: boolean;                // badge « Hors ligne »
  className?: string;
}
```

**Design du composant (règles du DS, non négociables)** :
1. `variant` pilote **uniquement** Z0 (fond/bordure/ombre) — jamais le contenu.
2. Les 5 états **sont dans la carte**, pas dans `UxStates` :
   - `loading` → skeleton de `children` (pulse, forme approximative)
   - `empty` → `emptyMessage` + icône, **sans** Z0 décoratif
   - `error` → callout `danger` + `onRetry` (le dataset last-known reste)
   - `offline` → `children` (last-known) + badge `offline`
3. `kpi` (C3) rend Z4 = `label + value mono` et active le marqueur
   `border-top: 3px accent-primary` (`.stat-tile` existant).
4. Jamais plus de 4 zones en plus de `C0+Z2` sur un C1 — le composant
   **devrait** avertir (lint) si 5+ zones optionnelles sont passées.

### Plan de migration (les 40 classes → le composant)

- **Étape 1** : créer `AuroraCard` dans `packages/ui` + sa story
  (les 5 états × les 4 variants, 20 stories) → `packages/ui` storybook.
- **Étape 2** : migrer les C1 pures (TaskRow, integration, habits) —
  le plus de volume, le plus de gain (elles partagent 95 % de structure).
- **Étape 3** : les C2 (review, retro, skill) conservent un `children`
  riche mais adoptent le conteneur + les 5 états.
- **Étape 4** : les C3 (KPI) et C4 (nœuds) — C3 = `kpi` prop ;
  C4 reste un composant dédié (NodeCard, spatial) mais **hérite** du
  socle `C0`.

---

## 6. Décision à prendre (avant d'implémenter)

Le doc pose 3 choix réels, pas techniques :

1. **Une carte, ou une famille ?** → Recommandation : **un seul
   `AuroraCard`** (C1–C3) + `NodeCard` dédié (C4, spatial) +
   `premium.tsx` tel quel (C5, effets). Pas 5 composants.
2. **Les 5 états dans la carte, ou dans `UxStates` ?** → Recommandation :
   **dans la carte** (cohérence AD-13 ; `UxStates` garde le rôle
   « wrapper de page »).
3. **Radius 4px (plate) ou 8px (posée) par défaut ?** → Le DS dit
   `radius.md` = 4px pour le conteneur standard ; le premium fait 8px.
   Recommandation : `flat`/`standard` = 4px, `elevated`/`image` = 8px.

> Dis-moi si tu valides les 3 choix et je crée `AuroraCard` (+ ses 20
> stories) dans `packages/ui`, je le branche dans le Storybook, et je
> migre les C1 (TaskRow → `AuroraCard`) comme preuve.
