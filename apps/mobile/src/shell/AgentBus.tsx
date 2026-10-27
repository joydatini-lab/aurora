/**
 * Agent Command Bus — mount point (02 §4, kernel S15).
 *
 * Mounted ONCE at the router root (`<Shell />` → under `<RouterProvider>`,
 * so `useNavigate` works). Subscribes the shell executor (router +
 * ui-state store) to the global effect channel (`lib/agent-bus`): any
 * producer — the agent page, deep links, automations — dispatches an
 * `AgentUiEffect` through the same single door (mission §17/§62).
 */
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUiStateStore } from '../state/ui-state';
import { mountAgentCommandBus, type NavFn, type UiCommander } from '../lib/agent-bus';

export function AgentBus() {
  const nav = useNavigate();
  const ui = useUiStateStore();

  // Les actions du store sont stables ; on stabilise la slice elle-meme
  // pour que l'effet de montage ne soit pas invalide a chaque render.
  const uiSlice: UiCommander = useMemo(
    () => ({
      setActiveTab: ui.setActiveTab,
      setTasksView: ui.setTasksView,
      setProgressPeriod: ui.setProgressPeriod,
      toggleKnowledgeNode: ui.toggleKnowledgeNode,
      setFocusActive: ui.setFocusActive,
    }),
    [
      ui.setActiveTab,
      ui.setTasksView,
      ui.setProgressPeriod,
      ui.toggleKnowledgeNode,
      ui.setFocusActive,
    ],
  );

  const navRef = nav as NavFn;
  useEffect(() => mountAgentCommandBus(navRef, uiSlice), [navRef, uiSlice]);
  return null;
}
