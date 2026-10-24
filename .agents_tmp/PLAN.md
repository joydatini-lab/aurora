# 1. OBJECTIVE

> **STATUT : décisions owner reçues (2026-10-24).** Les 5 questions ouvertes de
> la v1 sont tranchées (§3, « Décisions actées »). Reste à lire les fichiers que
> le owner doit désigner dans le dépôt (§6) avant de figer le périmètre
> d'exécution. **Aucun code dans ce plan** (AD-13).

Objectif en deux phrases :
1. **Passer Aurora de l'idéation à la planification** — réécrire le document
   d'implémentation de **chaque feature**, y poser des **critères de readiness**,
   des **critères de succès**, des **critères de QA** et une **couverture de
   tests complète**.
2. **Acter la nouvelle direction plateforme + interface** — trois cibles (web,
   desktop, mobile) **en commençant par le web**, avec une **interface premium
   responsive reconstruite de zéro** à partir de la librairie de
   composants/composites UI, **Ionic React conservé** comme shell, **LobeHub
   comme app de référence** (inspiration de patterns/interface, **jamais de code
   tiers copié**).

Problème opérationnel : la vision gelée (Phase 1 **mobile-only**, desktop =
parking lot Phase 2, ADR §23) ne correspond plus à la direction owner. Le
candidat d'intégration **LibreChat est abandonné** ; **LobeHub** le remplace en
tant que **référence de conception**, pas en tant que source de code. Il faut
donc **re-baseliner**, **amender formellement** la décision plateforme (ADR), puis
**réécrire les specs par feature** — avant tout code.

# 2. CONTEXT SUMMARY

> **NOTE INTAKE (2026-10-24).** Les documents complémentaires annoncés par le
> owner **ne sont pas sur le disque** (rien de nouveau dans `/workspace/project`,
> `/workspace`, `/tmp`, pièces jointes). Le owner indique que **les fichiers à
> lire sont DANS le dépôt** et doit en donner les chemins (§6). Le dépôt est bien
> présent : `/workspace/project`, `origin = https://github.com/joydatini-lab/aurora.git`.
> ⚠️ **HEAD = `rebaseline/2026-10-23` (`bc71a36`), PAS `main` (`e066292`)** — le
> checkout `main` est une action de l'agent de code (l'agent de planification n'a
> pas d'outil git).

État réel du dépôt (vérifié par lecture, pas supposé) :

- **Monorepo pnpm** : 19 packages + 3 apps (`mobile`, `desktop`, `server`).
- **Spine figé** : ADR v1.7 + `ARCHITECTURE-SPINE.md` (AD-1…AD-17). AD-13 =
  **Phase 1 mobile-only (Android, Ionic React + Capacitor)** ; le desktop et le
  web-first sont aujourd'hui classés **parking lot Phase 2** (ADR §23).
- **Chat — décision prise** : le candidat **LibreChat est ABANDONNÉ** ; le fork
  `open-webui` n'est pas retenu ; **LobeHub devient l'app de référence** dont on
  peut **s'inspirer** (code + interface) pour concevoir la nôtre. ⚠️ **Nuance
  juridique à acter** : LobeChat/LobeHub est sous **LobeHub Community License**
  (Apache 2.0 + clause de commercialisation) — l'auto-hébergement et l'usage
  commercial « tel quel » sont libres, mais **distribuer un produit dérivé
  modifié exige une licence commerciale**. « S'inspirer » = patterns/idées, pas
  copier-coller de code, sinon on retombe dans l'interdit owner + le risque
  licence. Candidats internes restants : (A) chat maison `/agent`
  (`apps/mobile/src/pages/agent/index.tsx`, ~1722 lignes) ; (B)
  `@assistant-ui/react` vendu mais jamais câblé (`packages/ui/src/components/
  assistant-ui/`, ~172 fichiers).
- **UI existante (socle de la refonte — « garde ce UI »)** : `packages/ui` = ~40
  primitives shadcn/Radix (`components/ui/`) + `components/reui/` (data-grid,
  filters, kanban, event-calendar, gantt, cascader, tree, timeline, stepper, …) +
  `components/composites/` (vues assemblées : `AgentView`, `TasksView`,
  `LearnView`, `HabitsView`, `KnowledgeView`, `ProgressView`, `SettingsView`, …)
  + 5 renderers AD-10 + thèmes JSON (AD-17, 10 thèmes + 3 presets). `components.json`
  déclare déjà le registre `@reui`. Règles ReUI actives dans `AGENTS.md`.
- **App mobile** : shell Ionic + Capacitor (**Ionic conservé — décision owner**),
  ~26 répertoires de pages ; cible aujourd'hui Android ; build web statique
  existant (`vite build`, Render). **26 pages** listées (agent, tasks, projects,
  learn, knowledge, discovery, focus, calendar, inbox, artifacts, ascent, progress,
  goals, habits, routines, reviews, retro, countdown, skills, integrations,
  settings, onboarding, login, canvas, not-found, home).
- **Desktop** : `apps/desktop` = **spike Electron Phase 0** (`main.cjs` /
  `preload.cjs` / `renderer.jsx` / `vite.config.ts` / `electron-builder.yml`),
  PowerSync voie A (`@powersync/web` WASQLite) validée au build, sécurité OK
  (contextIsolation/sandbox/navigation bloquée), **pas de vraie UI**. → base à
  réutiliser pour la cible desktop.
- **Backend / données** : Supabase (28 migrations, 9 EF), RLS + FORCE RLS,
  PowerSync local-first, Agent Kernel serveur (le device ne voit que
  `AgentRunState`, F-09/AD-3). **À préserver** (owner : le backend vient après).
- **Specs & docs UI** : **44 specs d'écran** (`docs/design-system/screens/`) +
  `docs/design-system/impl-plan.md` (plan UI premium SSoT-driven, lots) +
  `docs/design-system/overview.md` + `docs/ui-libraries.md` (mapping
  composant → librairie premium) + `docs/cdd.md` (Component-Driven Development,
  Storybook-first) + `docs/testing/matrix.md`.
- **Contraintes** : FS sandbox éphémère (travail perdu si non poussé — cf.
  `docs/plans/2026-10-23-repriorisation.md`) ; doc-lag connu (24 vs 28 migrations,
  tag `v0.1.0` absent) ; règle `AI_RULES` §2 : contredire un doc figé = **doc-lag
  à signaler**, jamais une résolution silencieuse ; toute évolution structurante =
  **ADR additif ou PR dédié**.

Tension centrale à traiter : la direction **web-first → desktop → mobile** (avec
web responsive comme préalable au mobile) contredit **AD-13 (mobile-only)** et le
parking lot **ADR §23** → cela **exige un ADR / amendement de spine**, pas une
décision implicite. De même, **Ionic conservé** pour une cible web-first doit être
explicité (Ionic sert-il de shell sur les 3 cibles, ou seulement mobile ?).

# 3. APPROACH OVERVIEW

## 3.1 Décisions actées (owner, 2026-10-24) — remplacent les questions ouvertes v1

| # | Question v1 | **Décision owner** | Conséquence |
|---|---|---|---|
| 1 | Ionic conservé ou shell web pur ? | **Ionic React est conservé** | On garde `@ionic/react` + Capacitor. À expliciter : Ionic = shell sur les 3 cibles, ou mobile seulement ? |
| 2 | Trois cibles ou mobile d'abord ? | **3 versions : web, desktop, mobile — on commence par le web, puis on découle sur le reste** | Nouvel ordre : **web → desktop → mobile**. Contredit AD-13 → ADR additif. |
| 3 | « Partir de zéro » porte-t-il sur les composants UI ? | **Oui — on garde la librairie UI/composites existante** (« garde ce UI »), on reconstruit les **écrans/interface** premium par-dessus | `packages/ui` est **préservé** ; le travail = composition d'écrans + responsive, pas réécrire la librairie. |
| 3b | Composants dormants / détachés ? | **On GARDE `assistant-ui` et les éléments UI déjà détachés et pris en compte** ; on **cherche** en plus des composants UI, composites UI et design elements utilisables **comme briques** pour construire l'interface léchée | `assistant-ui/elements/` (~150 fichiers) devient une **réserve de briques** officielle ; tâche dédiée d'inventaire + évaluation de réemploi (§7). |
| 4 | Quel candidat chat ? | **LibreChat ABANDONNÉ.** **LobeHub = app de référence** — on peut s'inspirer de son **code et de son interface** pour concevoir la nôtre | Décision + refus des autres = **ADR additif**. « S'inspirer » ≠ copier (voir nuance licence §2). |
| 5 | Backend touché ? | **Non — on investit d'abord dans le design de l'interface responsive ; si l'interface est réussie, on détaillera ensuite le backend** | Séquence : **UI responsive d'abord**, backend ensuite. Le backend actuel n'est pas refondu dans cette phase. |

## 3.2 Approche retenue

**Re-planifier avant de coder**, en cinq mouvements :

1. **Intake des fichiers désignés par le owner** (§6) — lire les documents du
   dépôt qui complètent la vision avant de figer le périmètre.
2. **Re-baseline** — figer une base vérifiée (install, gate complet, état live,
   branche de travail **poussée**) pour ne plus rien perdre.
3. **Acter la nouvelle direction** — ADR additif « plateforme web-first → desktop
   → mobile » + « LobeHub référence, LibreChat abandonné » + « librairie UI
   conservée, écrans reconstruits », avec mise à jour des pointeurs spine /
   `AI_RULES` (doc-lag à signaler, pas de résolution silencieuse).
4. **Réécrire les specs d'implémentation par feature** — un document par feature
   portant : objectif, contrats, **critères de readiness**, **critères de
   succès**, **critères de QA**, et **couverture de tests** exigée.
5. **Construire l'interface premium web-first** — à partir des composants +
   composites `packages/ui` (règles ReUI/shadcn), **sans copier le code d'un chat
   tiers** ; cible **web desktop** d'abord, puis **responsive**, puis **desktop**
   (Electron) et **mobile** (Ionic/Capacitor).

Alternatives écartées : réemploi de LibreChat/open-webui (abandonné / copie de
code) ; réécriture de la librairie `packages/ui` (le owner la conserve).

# 4. IMPLEMENTATION STEPS

> Étapes **indicatives** — l'ordre et le périmètre exacts seront figés après
> lecture des fichiers désignés par le owner (§6). Aucun code ici (AD-13).

1. **Checkout `main` + intake des fichiers owner** — *goal* : partir de la bonne
   base et absorber la vision complète ; *method* : (agent de code) `git checkout
   main` ; lire les fichiers désignés ; extraire les décisions ; mettre à jour ce
   plan ; *référence* : `docs/plans/2026-10-23-repriorisation.md`.
2. **Re-baseline vérifiée** — *goal* : base fiable et non volatile ; *method* :
   `pnpm install`, gate complet (`AI_RULES` §9), consignation dans
   `docs/ci/gate.md`, branche de travail **poussée** ; *référence* : `AI_RULES.md`
   §9, `docs/plans/2026-10-23-repriorisation.md`.
3. **ADR additif « direction produit & plateforme »** — *goal* : formaliser (a)
   web-first → desktop → mobile, (b) LibreChat abandonné / LobeHub référence,
   (c) librairie `packages/ui` conservée + écrans reconstruits, (d) Ionic
   conservé ; *method* : ADR additif + mise à jour des pointeurs spine /
   `AI_RULES` / `project-context` (signaler le doc-lag, pas de résolution
   silencieuse) ; *référence* : AD-13, ADR §23, `AI_RULES.md` §2.
4. **Inventaire des briques UI** — *goal* : recenser composants/composites/
   design elements réemployables (assistant-ui conservé) ; *method* : lire
   `packages/ui/src/index.ts` + les 4 dossiers de composants, produire
   `docs/frontend/ui-brick-inventory.md` (§7.1) ; *référence* : `docs/ui-libraries.md`,
   `docs/cdd.md`, `packages/ui/components.json`.
5. **Socle d'interface web-first + système responsive** — *goal* : définir le
   shell web premium, la grille responsive (breakpoints, 2 panneaux desktop vs
   1 colonne mobile) et le plan de composition des écrans ; *method* : partir des
   44 specs d'écran + de l'inventaire §7.1, décider du rôle d'Ionic en web, et
   formaliser le responsive ; *référence* : `docs/design-system/impl-plan.md`,
   `docs/mobile/navigation-and-page-composition.md` (à re-décliner web).
6. **Réécriture des specs d'implémentation par feature** — *goal* : un doc par
   feature avec readiness / succès / QA / tests ; *method* : partir des 44 specs
   d'écran (format existant : Psychologie / Zones / Éléments / États) et **ajouter
   les sections manquantes** (readiness, succès, QA, couverture de tests) ;
   *référence* : `docs/design-system/screens/*`, `docs/features/master-feature-catalog.md`.
7. **Plan de couverture de tests** — *goal* : couverture complète et critères QA
   ; *method* : étendre `docs/testing/matrix.md` (9 classes déjà définies) avec
   seuils et DoD par feature ; *référence* : `docs/testing/matrix.md`.
8. **Exécution par lots** — *goal* : construire l'interface premium **web
   desktop → responsive → desktop (Electron) → mobile (Ionic)** ; *method* : 1 lot
   = 1 commit = 1 rollback (AD-13), gate vert à chaque lot ; *référence* :
   `docs/design-system/impl-plan.md`.

# 5. TESTING AND VALIDATION

État de succès visé (à affiner avec les critères owner) :

- **Re-baseline** : gate complet vert et **consigné** (typecheck, lint, tests,
  `check-boundaries.sh`, `check-rls.sh`, `check-view-joins`, spine) ; travail
  **poussé** (plus aucune perte au reset).
- **Spécifications** : chaque feature dispose d'un doc d'implémentation avec
  critères de readiness, de succès et de QA explicites et **vérifiables**.
- **Couverture de tests** : objectif de couverture **complet** défini et mesuré
  (unitaire + contrat + E2E + device), avec seuils écrits dans
  `docs/testing/matrix.md` ; zéro feature sans test associé.
- **Interface** : rendu web desktop premium conforme au design system
  (tokens-only, règles ReUI/shadcn, états vides/chargement/erreur par région de
  données), **responsive validé** avant le passage mobile ; **aucun code de chat
  tiers copié** ; LobeHub utilisé comme référence de conception uniquement.
- **Plateforme** : ordre web → desktop → mobile formalisé par ADR ; **desktop =
  Electron** (spike existant, à confirmer) ; **mobile = Ionic/Capacitor
  conservé** et non régressé.

# 6. FICHIERS À LIRE (demande owner en cours)

Le owner indique que **les fichiers à lire sont dans le dépôt** mais ne les a pas
encore nommés. **En attente des chemins.** Candidats probables (dépôt), à
confirmer :

- **Vision / produit** : `_bmad-output/wds/A-Product-Brief/product-brief.md`,
  `_bmad-output/architecture/architecture-aurora-2026-09-21/ARCHITECTURE-SPINE.md`,
  `…/adr-extract.md`, `…/SPEC.md`, `_bmad-output/project-context.md`,
  `docs/features/master-feature-catalog.md`.
- **Planification / repriorisation** : `docs/plans/2026-10-23-repriorisation.md`,
  `docs/plans/finalisation-v1.md`, `docs/architecture/implementation-readiness.md`.
- **UI / design system** : `docs/design-system/impl-plan.md`,
  `docs/design-system/overview.md`, `docs/ui-libraries.md`, `docs/cdd.md`,
  `docs/design-system/screens/*` (44 specs), `_bmad-output/ux-designs/*`.
- **PRD de référence** : `pack/PRD_1_Productivite.md`, `pack/PRD_3_Assistant_IA.md`,
  `pack/PRD_4_Gestion_de_projet.md` (+ `pack/images/`).

Décisions encore ouvertes (non bloquantes, à confirmer) :
1. **Ionic** : shell sur les 3 cibles, ou uniquement mobile (web = React Router +
   shadcn/ReUI pur) ?
2. **Desktop** : Electron (spike existant) confirmé vs Tauri vs PWA ?
3. **Périmètre** : les 44 écrans + tous les modules, ou un sous-ensemble
   prioritaire d'abord ?
4. **Seuil** visé pour « couverture de tests complète » (unitaires, E2E, device) ?
5. **LobeHub** : simple inspiration de patterns, ou étude de code ciblée
   (composants, structure) — en tenant compte de la clause de licence ?

# 7. RECHERCHE DE BRIQUES UI (demande owner)

But : **recenser** les composants UI, composites UI et design elements déjà
présents (ou récupérables) pour servir de **briques** à l'interface premium
web-first. `assistant-ui` et les éléments déjà détachés sont **conservés** et
font partie de la réserve.

## 7.1 Inventaire à produire (dans le dépôt, aucune copie tierce)

| Source | Contenu | Statut |
|---|---|---|
| `packages/ui/src/components/ui/` | ~40 primitives shadcn/Radix | **Conservé** |
| `packages/ui/src/components/reui/` | data-grid, filters, kanban, event-calendar, gantt, cascader, tree, timeline, stepper, code-block, color-picker, rating, phone-input, … | **Conservé** |
| `packages/ui/src/components/composites/` | ~30 vues assemblées (AgentView, TasksView, LearnView, HabitsView, KnowledgeView, ProgressView, SettingsView, TaskInspector, TodayFocusPanel, …) | **Conservé** |
| `packages/ui/src/components/assistant-ui/elements/` | ~150 éléments chat/agent (composer, thread, tool-call, reasoning, sources, artifact-card, approval-card, model-selector, …) | **Conservé — réserve de briques** |
| `packages/ui/src/components/foundations/`, `examples/` | fondations (featured-icon) + exemples shadcn | À évaluer |
| `packages/ui/src/renderers/` | 5 renderers AD-10 | **Conservé** |
| `docs/ui-libraries.md` | mapping composant → librairie premium (shadcn, Aceternity, Magic UI, AG Grid, FullCalendar, …) | **Référence d'achat/ajout** |
| LobeHub (externe) | patterns/interface de référence | **Inspiration seulement** (licence) |

**Livrable de la tâche** : `docs/frontend/ui-brick-inventory.md` (nouveau) —
une ligne par brique : chemin, rôle, état (compile ? story ? test ?), cible
d'usage (web/desktop/mobile), verdict (réemployé / à adapter / écarté).
Méthode : lecture de `packages/ui/src/index.ts` (ce qui est déjà exporté) +
`docs/cdd.md` (couverture Storybook) ; **ne rien copier** d'une app tierce.

## 7.2 Ce qu'il manque pour la V1 (issu des docs produit lus)

Points relevés dans les docs produit/DS qui doivent entrer dans les specs V1 :

- **5 (+2) états UX obligatoires par région de données** : `loading / empty /
  success / error / offline` + `killed` + états d'écran (`en-cours`, `terminé`,
  `échec`, `404`) — `docs/ui-libraries.md` §6, AD-13. Manquant = DoD non fermé.
- **Registre de features** (activation/désactivation) — `docs/frontend/
  feature-registry.md` (G-M7, NEEDS_DECISION) : une feature désactivée disparaît
  de la nav/palette/capabilities, **les données restent**.
- **Graphe de navigation & composition de pages** — `docs/mobile/
  navigation-and-page-composition.md` : 5 tabs, détails en overlay, RET/PERSIST/
  EMPTY/PERM par page. À **re-décliner pour le web** (breakpoints, layout).
- **Responsive** : à définir formellement (breakpoints, layout desktop à 2
  panneaux vs mobile 1 colonne) — le doc mentionne déjà « desktop 2 panneaux »
  (progress-dashboard) mais aucun système responsive n'est spécifié.
- **Design system** : tokens-only, 10 thèmes + 3 presets (AD-17), Inter/JetBrains
  Mono self-hosted, direction « Technical Calm » — `docs/design-system/overview.md`.
- **Motion** : `PageTransition` / `NodePulse` / `Reveal`, GPU-only, reduced-motion
  — `docs/release/changelog.md` (wave 5) + `docs/design-system/emotion-design.md`.
- **Accessibilité & copy FR** : aria-labels, focus-visible, tap targets ≥ 44 px,
  libellés FR normatifs (`feature-registry` S6 pour le 404).
- **Couverture de tests** : `docs/testing/matrix.md` (classes unitaire/intégration/
  contrat/E2E/failure/permission/offline/recovery/platform) — à transformer en
  **critères de QA par feature**.


