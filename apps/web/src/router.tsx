/**
 * router.tsx — WEB route table.
 *
 * La table est IDENTIQUE à celle de l'ancienne coquille mobile (38 routes,
 * 02 S6.1 + famille goals/discovery/etc.) — mêmes composants d'écran, mêmes
 * gates `FeatureGate`. Ce qui change, c'est UNIQUEMENT la racine :
 *   mobile : <Shell />      (Ionic tabs + barre basse + updater APK)
 *   web    : <WebShell />   (chrome maison, pas de natif, pas d'updater)
 *
 * Donc : aucun écran n'est dupliqué. Le jour où `pages/ query/ ux/ lib/ state/`
 * déménagent dans `packages/app-core`, seul l'alias `@app` change ici.
 */
import { createBrowserRouter } from 'react-router-dom';
import { WebShell } from './shell/WebShell';

import { HomePage } from '@app/pages/home';
import { TasksPage, TaskDetailPage } from '@app/pages/tasks';
import { CalendarPage } from '@app/pages/calendar';
import { ProjectsPage } from '@app/pages/projects';
import { GoalsPage, GoalDashboardPage, GoalFeatureDetailPage } from '@app/pages/goals';
import { LearnPage, LearnDetailPage } from '@app/pages/learn';
import { KnowledgePage, KnowledgeNodePage } from '@app/pages/knowledge';
import { DiscoveryPage } from '@app/pages/discovery';
import { RapportDeVeillePage } from '@app/pages/discovery/rapport';
import { VeilleCreatePage } from '@app/pages/discovery/creation';
import { ProgressPage, ProgressDetailPage } from '@app/pages/progress';
import { FocusProfilesRoute } from '@app/pages/focus/profiles';
import { ArtifactPage } from '@app/pages/artifacts';
import { AgentPage } from '@app/pages/agent';
import { AgentConversationsPage } from '@app/pages/agent/conversations';
import { AgentCapacitesPage } from '@app/pages/agent/capacites';
import { AgentBibliothequePage } from '@app/pages/agent/bibliotheque';
import { CanvasPage } from '@app/pages/canvas';
import { SlideAscentPage } from '@app/pages/ascent';
import { SettingsPage } from '@app/pages/settings';
import { NotFoundPage } from '@app/pages/not-found';
import { SkillsPage } from '@app/pages/skills';
import { HabitsPage } from '@app/pages/habits';
import { RoutinesPage } from '@app/pages/routines';
import { ReviewsPage } from '@app/pages/reviews';
import { RetroActionsPage } from '@app/pages/retro';
import { CountdownsPage } from '@app/pages/countdown';
import { IntegrationsPage } from '@app/pages/integrations';
import { LoginPage } from '@app/pages/login';
import { OnboardingPage } from '@app/pages/onboarding';
import { InboxPage } from '@app/pages/inbox';
import { FeatureGate } from '@app/ux/feature-gate';

export type WebRouter = ReturnType<typeof createBrowserRouter>;

export const webRouter: WebRouter = createBrowserRouter([
  {
    element: <WebShell />,
    children: [
      // --- Onglets principaux ---
      { index: true, element: <HomePage />, path: '/' },
      { path: '/home', element: <HomePage /> },
      { path: '/tasks', element: <TasksPage /> },
      { path: '/learn', element: <LearnPage /> },
      { path: '/progress', element: <ProgressPage /> },
      { path: '/agent', element: <AgentPage /> },
      { path: '/agent/conversations', element: <AgentConversationsPage /> },
      { path: '/agent/capacites', element: <AgentCapacitesPage /> },
      { path: '/agent/bibliotheque', element: <AgentBibliothequePage /> },
      { path: '/canvas/:id', element: <FeatureGate feature="canvas"><CanvasPage /></FeatureGate> },

      // --- Détails ---
      { path: '/tasks/:id', element: <TaskDetailPage /> },
      { path: '/learn/:id', element: <LearnDetailPage /> },
      { path: '/progress/:id', element: <ProgressDetailPage /> },
      { path: '/knowledge', element: <FeatureGate feature="knowledge"><KnowledgePage /></FeatureGate> },
      { path: '/knowledge/:nodeId', element: <FeatureGate feature="knowledge"><KnowledgeNodePage /></FeatureGate> },
      { path: '/artifacts/:id', element: <ArtifactPage /> },

      // --- Routes adjacentes ---
      { path: '/inbox', element: <FeatureGate feature="inbox"><InboxPage /></FeatureGate> },
      { path: '/settings', element: <SettingsPage /> },

      // --- Famille goals ---
      { path: '/goals', element: <GoalsPage /> },
      { path: '/goals/:id', element: <GoalDashboardPage /> },
      { path: '/goals/:id/features/:fid', element: <GoalFeatureDetailPage /> },
      { path: '/goals/:id/ascent', element: <SlideAscentPage userId="me" /> },

      // --- Focus + calendrier ---
      { path: '/focus', element: <FeatureGate feature="focus"><FocusProfilesRoute /></FeatureGate> },
      { path: '/calendar', element: <FeatureGate feature="calendar"><CalendarPage /></FeatureGate> },

      // --- Projets / habitudes / routines / revues / rétro / countdown ---
      { path: '/projects', element: <ProjectsPage /> },
      { path: '/habits', element: <HabitsPage /> },
      { path: '/routines', element: <RoutinesPage /> },
      { path: '/reviews', element: <ReviewsPage /> },
      { path: '/retro', element: <RetroActionsPage /> },
      { path: '/countdown', element: <CountdownsPage /> },

      // --- Discovery (le path `nouveau` AVANT `:id`, sinon il matche le param) ---
      { path: '/discovery', element: <FeatureGate feature="discovery"><DiscoveryPage /></FeatureGate> },
      { path: '/discovery/nouveau', element: <FeatureGate feature="discovery"><VeilleCreatePage /></FeatureGate> },
      { path: '/discovery/:id', element: <FeatureGate feature="discovery"><RapportDeVeillePage /></FeatureGate> },

      { path: '/skills', element: <FeatureGate feature="skills"><SkillsPage /></FeatureGate> },
      { path: '/integrations', element: <FeatureGate feature="integrations"><IntegrationsPage /></FeatureGate> },

      { path: '/login', element: <LoginPage /> },
      { path: '/onboarding', element: <OnboardingPage /> },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
