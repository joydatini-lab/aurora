# Inventaire des briques UI — `@aurora/ui`

> **Ref:** `.agents_tmp/PLAN.md` §7.1 · Phase 0, lot P0-A · 2026-10-24.
> **Objet:** recenser les composants / composites / design elements réemployables comme
> **briques** pour l'interface premium web-first. **Aucune copie tierce** (LobeHub =
> inspiration de patterns uniquement, jamais de code).
> **Méthode:** lecture de `packages/ui/src/index.ts` (190 exports), des 6 dossiers de
> composants, de `docs/cdd.md` (couverture Storybook) et de `docs/ui-libraries.md` §6.

## 0. Décision de cadrage (owner, 2026-10-24)

`packages/ui` est **conservé** (« garde ce UI »). Le travail de la refonte porte sur la
**composition d'écrans + responsive**, pas sur la réécriture de la librairie.
`assistant-ui/elements/` (~138 fichiers) est promu au rang de **réserve de briques
officielle** — dormante mais conservée, jamais supprimée.

---

## 1. Synthèse chiffrée

| Dossier | Fichiers | Composants | Stories | Couverture | Verdict |
|---|---:|---:|---:|---:|---|
| `components/ui/` | 138 | 73 | 64 | **88 %** | ✅ réemployé — socle |
| `components/reui/` | 112 | 21 | 26 | **124 %** (multi-stories) | ✅ réemployé — data-heavy |
| `components/composites/` | 45 | 34 | 11 fichiers | **68 %** (23/34) ⚠️ | ✅ réemployé — écrans assemblés |
| `components/assistant-ui/` | 172 | 138 (elements) | 1 dir | n/a | ✅ **réserve de briques** |
| `renderers/` (AD-10) | 7 | 5 | — | via ui/ | ✅ conservé (contrat gelé) |
| `components/foundations/` | 1 | 1 (`featured-icon`) | 0 | 0 % | ⚠️ à évaluer |
| `components/examples/` | 22 | — | — | — | ⚠️ exemples shadcn, pas produit |
| `themes/` (AD-17) | — | 10 thèmes + 3 presets | — | — | ✅ conservé (invariant gelé) |
| **Total** | **~497** | **~272** | **~102** | — | — |

**Constat:** les 11 fichiers de stories de `composites/` couvrent **23 des 34**
composites (une story peut en couvrir plusieurs — ex. `Tasks.stories.tsx` couvre
`TaskCard` + `TaskFilterBar` + `EisenhowerMatrix` + `KanbanColumn` + `TodayFocusPanel`).
**11 composites n'ont aucune story** (voir §4.1). C'est la couche qui porte les
**écrans** — exactement là où la refonte premium va travailler. Le lot P0-F
(cartographie) devra prioriser ces 11.

---

## 2. `components/ui/` — 73 primitives shadcn/Radix (socle)

**Verdict: réemployé tel quel.** 88 % de couverture Storybook, conforme `docs/cdd.md`.

**Primitives de base (shadcn/Radix):**
`accordion` `alert` `alert-dialog` `aurora-card` `avatar` `badge` `breadcrumb`
`button` `button-group` `calendar` `card` `carousel-base` `checkbox` `combobox`
`command` `context-menu` `date-range-picker` `dialog` `drawer` `dropdown-menu`
`field` `form` `hover-card` `input` `input-group` `item` `kbd` `label` `menubar`
`number-roll` `pagination` `popover` `premium` `progress` `radio-group` `resizable`
`scroll-area` `select` `separator` `sheet` `sidebar` `skeleton` `slider` `spinner`
`switch` `table` `tabs` `textarea` `toast` `toaster` `tooltip`

**Primitives d'état (répondent à l'exigence AD-13 « 5+2 états »):**
`empty-state` `spinner` `skeleton` `progress` `alert` `toast` `toaster`

**Primitives de shell / navigation:**
`desktop-sidebar` `desktop-command-menu` `sidebar` `sheet` `tabs` `breadcrumb`

**Composants data / viz (au-dessus des renderers AD-10):**
`AgGridTable` `DataTable` `F2ChartAdapter` `CalendarView` `GanttRow` `Timeline`
`StatTile` `KeyValueList` `Timer` `AudioPlayer` `Message` `AgentResponseRenderer`
`AgentThinkingLoader` `AppIcon` `FileDropzone` `diff-viewer` `dot-matrix`
`direction`

**Primitives de mise en page:** `separator` `resizable` `scroll-area` `item`

---

## 3. `components/reui/` — 21 composants data-heavy

**Verdict: réemployé.** Registre `@reui` déjà déclaré dans `components.json`.
Couverture multi-stories. Règles ReUI actives dans `AGENTS.md`.

| Composant | Rôle | Cible d'usage |
|---|---|---|
| `data-grid` | grille de données avancée | web + desktop (tâches, artefacts) |
| `filters` | barre de filtres composable | web + desktop |
| `kanban` | tableau kanban | web (projets, tâches) |
| `event-calendar` | calendrier d'événements | web + desktop |
| `gantt` | diagramme de Gantt | **desktop** (grande surface) |
| `cascader` | sélection hiérarchique | web |
| `tree` | arbre (connaissances) | web |
| `timeline` | frise chronologique | web |
| `stepper` | étapes / assistant | web + mobile |
| `code-block` | bloc de code | web |
| `color-picker` | sélecteur de couleur | **Design Space Pro** |
| `rating` | notation | web + mobile |
| `phone-input` | saisie téléphone | web |
| `autocomplete` | saisie assistée | web |
| `badge` `alert` | états colorés sémantiques | **tous** (AD-17) |
| `icon-stack` `icon-tile` | empilements d'icônes | web |
| `file-type` | icône par type de fichier | web |
| `number-field` | champ numérique | web + Design Space |
| `time-picker` `date-selector` | saisie temporelle | web |
| `signature-pad` | signature manuscrite | **mobile** + documents |
| `emoji-picker` | sélecteur emoji | web |
| `frame` | cadre de composition | **Design Space Pro** |
| `scrollspy` | navigation par ancre | web (documents) |
| `sortable` | liste réordonnable | web + Design Space (calques) |

**Point notable:** `frame`, `color-picker`, `number-field`, `sortable`, `signature-pad`
sont **directement pertinents pour Design Space Pro** (Phase 1B) — à ne pas oublier.

---

## 4. `components/composites/` — 34 vues assemblées

**Verdict: réemployé, MAIS couverture Storybook faible (32 %) → priorité de la refonte.**

| Composite | Écran / rôle | Spec d'écran liée |
|---|---|---|
| `AgentView` | chat agent (3 modes) | `docs/design-system/screens/agent*` |
| `TasksView` `TaskCard` `TaskRow` `TaskInspector` `TaskFilterBar` | productivité | `screens/tasks*` |
| `EisenhowerMatrix` `PriorityFlag` | priorisation | `screens/eisenhower*` |
| `InboxView` | inbox universelle | `screens/inbox*` |
| `LearnView` | apprentissage | `screens/learn*` |
| `KnowledgeView` | connaissances | `screens/knowledge*` |
| `DiscoveryView` | découverte | `screens/discovery*` |
| `ProgressView` | progression | `screens/progress*` |
| `HabitsView` `HabitEditorSheet` | habitudes | `screens/habits*` |
| `ReviewsView`→`ReviewView` `ReviewSummaryCards` | revues | `screens/reviews*` |
| `RetroView` | rétrospective | `screens/retro*` |
| `FocusWorkspace` `TodayFocusPanel` | focus / pomodoro | `screens/focus*` |
| `CountdownCard` `CountdownPageHeader` | compte à rebours | `screens/countdown*` |
| `ArtifactsView` | artefacts / exports | `screens/artifacts*` |
| `CanvasView` | canvas agentique | `screens/canvas*` |
| `SkillsView` | compétences | `screens/skills*` |
| `IntegrationsView` | intégrations | `screens/integrations*` |
| `SettingsView` | paramètres | `screens/settings*` |
| `OnboardingView` | onboarding | `screens/onboarding*` |
| `AscentCard` `AscentFeed` | progression / paliers | `screens/ascent*` |
| `PageHeader` `DateNavigator` `EventCard` `KanbanColumn` | primitives de composition | transverses |
| `SoundPickerSheet` | sélection sonore | focus |

**Stories existantes (11 fichiers):** `Ascent` `Countdown` `Habits` `Inbox`
`Integrations` `Knowledge` `Learn` `Onboarding` `Reviews` `Skills` `Tasks`.
Elles couvrent **23 composites sur 34**.

### 4.1 Les 11 composites sans story (priorité P0-F)

`DateNavigator` · `EventCard` · `FocusWorkspace` · `HabitEditorSheet` ·
`KanbanColumn` · `PageHeader` · `PriorityFlag` · `ReviewSummaryCards` ·
`SoundPickerSheet` · `TaskInspector` · `TaskRow`

**→ C'est le principal écart de qualité identifié**, et il tombe précisément sur la
couche « écrans » que la refonte vise. `PageHeader` et `DateNavigator` sont des
primitives de composition **transverses** : leur absence de story affecte tous les écrans.

---

## 5. `components/assistant-ui/elements/` — 138 briques (réserve)

**Verdict: CONSERVÉ comme réserve de briques** (décision owner 3b). Vendu
(`@assistant-ui/react` 0.15.28) mais **jamais câblé dans une app** : `grep -rn "assistant-ui"
apps/*/src apps/*/test` ne renvoie **aucune** occurrence. Les seules références à
`AssistantRuntimeProvider` vivent dans `packages/ui/src/components/assistant-ui/demo/demo-aui-provider.tsx`
et 2 fichiers `elements/*.aui.tsx` — donc dans la librairie elle-même, jamais dans un écran
produit. Ce n'est donc pas un candidat chat (décision owner 4), c'est une
**bibliothèque de briques** réutilisables une par une.

**Catégories identifiées (138 fichiers):**

| Famille | Exemples | Réemploi hors-chat |
|---|---|---|
| **Agent / plan** | `agent-card` `agent-plan` `agent-status` `agent-handoff` `checkpoint-history` | suivi d'exécution agent |
| **Composition de fil** | `composer` `thread` `day-separator` `follow-up-suggestions` | messagerie |
| **Outils** | `tool-call` `code-diff` `code-runner` `computer-use` `elicitation-form` | cartes d'outil |
| **Artefacts** | `artifact-card` `document-reference` `file` `file-tree` `image-gallery` `image-generation` | **Design Space Pro** |
| **Validation humaine** | `approval-card` `guardrail-notice` `feedback-dialog` | HITL (AD-12) |
| **Contexte / mémoire** | `context-breakdown` `context-display` `conversation-map` `conversation-search` | inspection |
| **Métriques** | `cost-meter` `confidence-marker` `connection-state` `job-progress` | observabilité |
| **États** | `empty-state` `error-state` `loading-state` `draft-restore` | **AD-13 états** |
| **Rendu** | `markdown-text` `chart` `diagram` `geo-map` `map-answer` `flow-graph` | AD-10 |
| **Citations** | `inline-citation` `link-preview` `source-*` | provenance (AD-11) |
| **Recherche / palette** | `command-palette` `launcher-bubble` | commandes globales |
| **Mise en page** | `chat-panel` `canvas-split` `assistant-sidebar` `assistant-modal` | **shell 2 panneaux** |

**Points saillants pour la refonte:**
- `empty-state` / `error-state` / `loading-state` : 3 briques d'état **déjà écrites**,
  réutilisables pour satisfaire l'exigence AD-13 sans réécriture.
- `chat-panel` + `canvas-split` + `assistant-sidebar` : exactement la **topologie
  2 panneaux desktop** que la refonte web-first doit produire (PLAN §7.2).
- `artifact-card` / `file-tree` / `image-gallery` : réutilisables pour Design Space Pro.
- Le suffixe `.aui.tsx` marque les fichiers liés au runtime `@assistant-ui` →
  **à adapter** (ou à dé-`aui`-ifier) avant réemploi hors de ce runtime.

---

## 6. `renderers/` — 5 renderers AD-10 (contrat gelé)

**Verdict: conservé.** AD-10 interdit leur import hors de `packages/ui` (gated en CI).

| Renderer | Rôle |
|---|---|
| `SemanticTreeRenderer` | arbre sémantique (connaissances) |
| `InfographicRenderer` | infographies |
| `DataVisualizationRenderer` | graphiques / viz |
| `MathRenderer` | formules (Scientific Engine) |
| `AnimationController` | `RevealKey` / slots d'animation |

`contracts.ts` porte les types publics ; `index.ts` les réexporte (jamais les moteurs).

---

## 7. Ce qui MANQUE pour la V1 (écarts identifiés)

Issu de `docs/ui-libraries.md` §6, `docs/cdd.md` et du PLAN §7.2 :

| # | Manque | Source | Impact |
|---|---|---|---|
| 1 | **11 composites sur 34 sans story** (§4.1) | §4 ci-dessus | DoD non fermé, refonte à l'aveugle |
| 2 | **Système responsive non spécifié** | `ui-libraries.md` (mention « desktop 2 panneaux » sans formalisation) | bloquant web-first |
| 3 | **Registre de features** (activation/désactivation) | `feature-registry` G-M7, NEEDS_DECISION | nav/palette/capabilities |
| 4 | **Navigation web** (le doc est mobile : 5 tabs) | `docs/mobile/navigation-and-page-composition.md` | à re-décliner |
| 5 | **404 / not-found plein écran** | `ui-libraries.md` §6.1 | seul état qui mandate le logo centré |
| 6 | **`foundations/` quasi vide** (1 fichier) | §1 | à évaluer : garder ou absorber |
| 7 | **`examples/`** (22 fichiers shadcn) | §1 | hors produit — clarifier |

**Exigence transverse à respecter (AD-13 / `ui-libraries.md` §6) :**
chaque région de données asynchrone doit couvrir **6 états** — `loading` `empty`
`success` `error` `offline` `killed` — **plus** les 6 états d'écran sémantiques
(`en-cours` `terminé` `échec` `succès` `erreur` `404`). Une story manquante = DoD non fermé.

---

## 8. Verdict par cible plateforme

| Brique | Web | Desktop (Electron) | Mobile (Ionic) |
|---|---|---|---|
| `ui/` primitives | ✅ | ✅ | ✅ |
| `reui/` (gantt, data-grid) | ✅ | ✅ prioritaire | ⚠️ data-grid seulement |
| `composites/` | ✅ | ✅ | ⚠️ 1 colonne |
| `assistant-ui/elements/` | ✅ réserve | ✅ 2 panneaux | ⚠️ sélection |
| `renderers/` AD-10 | ✅ | ✅ | ✅ |
| `themes/` AD-17 | ✅ | ✅ | ✅ |

**Règle:** les briques marquées ⚠️ ne sont pas écartées — elles sont **sélectionnées**
par la contrainte de surface (petit écran), conformément à la référence produit §4.5
(« Mobile propose une expérience adaptée […] sans reproduire tous les éditeurs riches »).
