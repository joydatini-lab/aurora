/**
 * 17-page router (02 S6.1, docs/mobile/navigation-and-page-composition.md).
 *
 * Frozen route table (page matrix S2, "Routing" S6 of goal-dashboard-ui.md):
 *
 *  Primary tabs (max 5, 44-60 px bar):
 *   /home · /tasks · /learn · /progress · /agent
 *  Details open OVER the current tab (IonModal/IonSlides — 02 §6.1):
 *   /tasks/:id · /learn/:id · /progress/:id · /knowledge · /knowledge/:nodeId
 *  Additional routes:
 *   /artifacts/:id · /inbox · /settings · /goals · /goals/:id ·
 *   /goals/:id/features/:fid · /focus · /calendar
 *
 * Frozen 17-page inventory (02 S6.1):
 *   1 /home  2 /tasks  3 /tasks/:id  4 /calendar  5 /projects  6 /goals
 *   7 /goals/:id  8 /learn  9 /learn/:id  10 /knowledge  11 /knowledge/:nodeId
 *   12 /discovery  13 /progress  14 /progress/:id  15 /focus  16 /artifacts/:id
 *   17 /agent  (+ /inbox, /settings = tab-adjacent routes, * = fallback)
 *
 * Context-preserving navigation: route params + query (?goalId=X) —
 * see docs/mobile/context-preserving-navigation.md. Native back (Android
 * gesture) works on every route; a route that blocks back saves first
 * (02 §6.3, local-first auto-persist).
 */
import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Shell } from './shell/Shell';
const InboxPage = lazy(() => import('./pages/inbox').then((m) => ({ default: m.InboxPage })));

// 17 pages. Each is a lazy boundary; the tab family renders inside Shell,
// details render over the current tab (S1 / S3 detail-over-tab rule).

const HomePage = lazy(() => import('./pages/home').then((m) => ({ default: m.HomePage })));
const TasksPage = lazy(() => import('./pages/tasks').then((m) => ({ default: m.TasksPage })));
const TaskDetailPage = lazy(() => import('./pages/tasks').then((m) => ({ default: m.TaskDetailPage })));
const CalendarPage = lazy(() => import('./pages/calendar').then((m) => ({ default: m.CalendarPage })));
const ProjectsPage = lazy(() => import('./pages/projects').then((m) => ({ default: m.ProjectsPage })));
const GoalsPage = lazy(() => import('./pages/goals').then((m) => ({ default: m.GoalsPage })));
const GoalDashboardPage = lazy(() => import('./pages/goals').then((m) => ({ default: m.GoalDashboardPage })));
const GoalFeatureDetailPage = lazy(() => import('./pages/goals').then((m) => ({ default: m.GoalFeatureDetailPage })));
const LearnPage = lazy(() => import('./pages/learn').then((m) => ({ default: m.LearnPage })));
const LearnDetailPage = lazy(() => import('./pages/learn').then((m) => ({ default: m.LearnDetailPage })));
const KnowledgePage = lazy(() => import('./pages/knowledge').then((m) => ({ default: m.KnowledgePage })));
const KnowledgeNodePage = lazy(() => import('./pages/knowledge').then((m) => ({ default: m.KnowledgeNodePage })));
const DiscoveryPage = lazy(() => import('./pages/discovery').then((m) => ({ default: m.DiscoveryPage })));
const RapportDeVeillePage = lazy(() => import('./pages/discovery/rapport').then((m) => ({ default: m.RapportDeVeillePage })));
const VeilleCreatePage = lazy(() => import('./pages/discovery/creation').then((m) => ({ default: m.VeilleCreatePage })));
const ProgressPage = lazy(() => import('./pages/progress').then((m) => ({ default: m.ProgressPage })));
const ProgressDetailPage = lazy(() => import('./pages/progress').then((m) => ({ default: m.ProgressDetailPage })));
const FocusProfilesRoute = lazy(() => import('./pages/focus/profiles').then((m) => ({ default: m.FocusProfilesRoute })));
const ArtifactPage = lazy(() => import('./pages/artifacts').then((m) => ({ default: m.ArtifactPage })));
const AgentPage = lazy(() => import('./pages/agent').then((m) => ({ default: m.AgentPage })));
const AgentConversationsPage = lazy(() => import('./pages/agent/conversations').then((m) => ({ default: m.AgentConversationsPage })));
const AgentCapacitesPage = lazy(() => import('./pages/agent/capacites').then((m) => ({ default: m.AgentCapacitesPage })));
const AgentBibliothequePage = lazy(() => import('./pages/agent/bibliotheque').then((m) => ({ default: m.AgentBibliothequePage })));
const CanvasPage = lazy(() => import('./pages/canvas').then((m) => ({ default: m.CanvasPage })));
const SlideAscentPage = lazy(() => import('./pages/ascent').then((m) => ({ default: m.SlideAscentPage })));
const SettingsPage = lazy(() => import('./pages/settings').then((m) => ({ default: m.SettingsPage })));
const NotFoundPage = lazy(() => import('./pages/not-found').then((m) => ({ default: m.NotFoundPage })));
const SkillsPage = lazy(() => import('./pages/skills').then((m) => ({ default: m.SkillsPage })));
const HabitsPage = lazy(() => import('./pages/habits').then((m) => ({ default: m.HabitsPage })));
const RoutinesPage = lazy(() => import('./pages/routines').then((m) => ({ default: m.RoutinesPage })));
const ReviewsPage = lazy(() => import('./pages/reviews').then((m) => ({ default: m.ReviewsPage })));
const RetroActionsPage = lazy(() => import('./pages/retro').then((m) => ({ default: m.RetroActionsPage })));
const CountdownsPage = lazy(() => import('./pages/countdown').then((m) => ({ default: m.CountdownsPage })));
const IntegrationsPage = lazy(() => import('./pages/integrations').then((m) => ({ default: m.IntegrationsPage })));
const LoginPage = lazy(() => import('./pages/login').then((m) => ({ default: m.LoginPage })));
const OnboardingPage = lazy(() => import('./pages/onboarding').then((m) => ({ default: m.OnboardingPage })));
import { FeatureGate } from './ux/feature-gate';

// Explicit annotation (TS2742): the inferred return type of
// `createBrowserRouter` pulls in @remix-run/router's Router type through
// a pnpm transitive path that is not portable from apps/mobile's node_modules
// graph; naming it here keeps the declaration emit self-contained.
export type AppRouter = ReturnType<typeof createBrowserRouter>;
export const appRouter: AppRouter = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      // --- Primary tabs (5, 02 §6.1) ---
      { index: true, element: <HomePage />, path: '/' },
      { path: '/home', element: <HomePage /> },
      { path: '/tasks', element: <TasksPage /> },
      { path: '/learn', element: <LearnPage /> },
      { path: '/progress', element: <ProgressPage /> },
      { path: '/agent', element: <AgentPage /> },
      // PRD-AI-01/06 (10-08) : the Assistant module's secondary views —
      // details that open OVER the agent tab (02 §6.1 : the tab bar stays,
      // /agent/* keeps the agent tab active via ShellTabBar's prefix rule).
      { path: '/agent/conversations', element: <AgentConversationsPage /> },
      { path: '/agent/capacites', element: <AgentCapacitesPage /> },
      // PRD-AI-05 (10-08) : the library (files / media import surface).
      { path: '/agent/bibliotheque', element: <AgentBibliothequePage /> },
      // Canvas (0022): dedicated session-editing surface — blocs TipTap,
      // commentaires, bascule md ⇄ HTML. 'new' = creation mode (Task 6).
      // G-M7: gated (creation mode opens over the module home).
      { path: '/canvas/:id', element: <FeatureGate feature="canvas"><CanvasPage /></FeatureGate> },

      // --- Details over the current tab (IonModal/IonSlides, 02 §6.1) ---
      { path: '/tasks/:id', element: <TaskDetailPage /> },
      { path: '/learn/:id', element: <LearnDetailPage /> },
      { path: '/progress/:id', element: <ProgressDetailPage /> },
      // G-M7 (feature-registry S6): the 8 module routes are gated — a deep
      // link into a disabled module renders the « module désactivé » state
      // (CTA → /settings?section=modules), NEVER the 404 fallback.
      { path: '/knowledge', element: <FeatureGate feature="knowledge"><KnowledgePage /></FeatureGate> },
      { path: '/knowledge/:nodeId', element: <FeatureGate feature="knowledge"><KnowledgeNodePage /></FeatureGate> },
      { path: '/artifacts/:id', element: <ArtifactPage /> },

      // --- Tab-adjacent routes (02 §6.1 page matrix) ---
      { path: '/inbox', element: <FeatureGate feature="inbox"><InboxPage /></FeatureGate> },
      { path: '/settings', element: <SettingsPage /> },

      // --- Goals family (goal-dashboard-ui.md S6) ---
      { path: '/goals', element: <GoalsPage /> },
      { path: '/goals/:id', element: <GoalDashboardPage /> },
      { path: '/goals/:id/features/:fid', element: <GoalFeatureDetailPage /> },

      // --- Ascent (wave 3, W3-E2): the pedagogical path of the active
      //   goal. The current userId arrives at boot with the authenticated
      //   session (05 §4.8); Slide-Ascent renders the local mirror.
      { path: '/goals/:id/ascent', element: <SlideAscentPage userId="me" /> },

      // --- Focus + calendar family views (G-M7 gated) ---
      { path: '/focus', element: <FeatureGate feature="focus"><FocusProfilesRoute /></FeatureGate> },
      { path: '/calendar', element: <FeatureGate feature="calendar"><CalendarPage /></FeatureGate> },

      // --- Projects family view ---
      { path: '/projects', element: <ProjectsPage /> },

      // --- Habits + routines family views (PRD-1 §4.5, 05 §4.3.5–§4.3.6) —
      //     daily check-in + gallery; routines = temporal anchors. Ungated
      //     (core productivity domain entities, like /projects). ---
      { path: '/habits', element: <HabitsPage /> },
      { path: '/routines', element: <RoutinesPage /> },

      // --- Reviews family (05 §4.5.1, WDS 06.1/06.3 — lot C v3 2026-10-08) :
      //     the period review (Jour|Semaine|Mois shared Pager) + the
      //     post-retrospective closure (retro-actions, the « Faite » state).
      //     Ungated local-first mirrors (AD-7, offline-capable). ---
      { path: '/reviews', element: <ReviewsPage /> },
      { path: '/retro', element: <RetroActionsPage /> },

      // --- Countdowns (PRD-CD-01, lot C 2026-10-08) — days-to-a-date.
      //     Ungated like /habits (local-only domain entity, no mirror
      //     wired yet → honest empty state, AD-7). ---
      { path: '/countdown', element: <CountdownsPage /> },

      // --- Discovery feed (G-M7 gated) ---
      { path: '/discovery', element: <FeatureGate feature="discovery"><DiscoveryPage /></FeatureGate> },
      // M-45 (S4) : le FORMULAIRE DE CRÉATION d'une veille (l'écran 15 du
      // plan 2026-10-17, le SSoT Stitch `veille_cr_ation_manuelle_fraunces`
      // — gated sur le feature `discovery`). Le path `nouveau` DOIT être
      // déclaré AVANT `/discovery/:id` (sinon le paramètre `:id` matche
      // « nouveau » et le formulaire n'est jamais servi).
      { path: '/discovery/nouveau', element: <FeatureGate feature="discovery"><VeilleCreatePage /></FeatureGate> },
      // M-44 (S4) : le RAPPORT DE VEILLE d'un programme (l'écran 13 du
      // plan 2026-10-17, le VAULT.md rendu « style édition » + la feuille
      // des sources de l'écran 14 — gated sur le feature `discovery`).
      { path: '/discovery/:id', element: <FeatureGate feature="discovery"><RapportDeVeillePage /></FeatureGate> },

      // --- Skills (ADR S14, ClawHub marketplace + expert skills; G-M7 gated) ---
      { path: '/skills', element: <FeatureGate feature="skills"><SkillsPage /></FeatureGate> },

      // --- Integrations (Composio, Google Workspace default preset; G-M7 gated) ---
      { path: '/integrations', element: <FeatureGate feature="integrations"><IntegrationsPage /></FeatureGate> },

      // --- Supabase Auth entry point (P1-4, 10-07) ---
      { path: '/login', element: <LoginPage /> },
      // --- Onboarding first-run (usage personnel, 10-07 : sign-up →
      //     onboarding → app) — state cosmétique par device (ui-state). ---
      { path: '/onboarding', element: <OnboardingPage /> },

      // --- Flashcards / QCM / exercises: /learn/:id overlays (05 §4.8) ---
      // (already registered under details above; no second registration)

      // --- Fallback: deep link into a disabled feature renders a
      //   "feature disabled" state, NOT a crash / 404 (feature-registry S6).
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export type AppRoute = '/home' | '/tasks' | '/learn' | '/progress' | '/agent'
  | '/agent/conversations' | '/agent/capacites' | '/agent/bibliotheque'
  | '/tasks/:id' | '/learn/:id' | '/progress/:id' | '/knowledge' | '/knowledge/:nodeId'
  | '/artifacts/:id' | '/inbox' | '/settings' | '/goals' | '/goals/:id'
  | '/goals/:id/features/:fid' | '/goals/:id/ascent' | '/focus' | '/calendar' | '/projects' | '/habits' | '/routines' | '/reviews' | '/retro' | '/countdown' | '/discovery' | '/discovery/nouveau' | '/discovery/:id'
  | '/skills' | '/integrations' | '/login' | '/onboarding'
  | '/canvas/:id';
