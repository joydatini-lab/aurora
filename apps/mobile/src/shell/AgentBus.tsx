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

  // `uiSlice` doit garder la meme identite tant que les actions du store ne
  // changent pas : le remonter a chaque rendu demonterait/remonterait le bus
  // (abonnement global en fuite). Les actions zustand sont stables.
  const { setActiveTab, setTasksView, setProgressPeriod, toggleKnowledgeNode, setFocusActive } = ui;
  const uiSlice = useMemo<UiCommander>(
    () => ({ setActiveTab, setTasksView, setProgressPeriod, toggleKnowledgeNode, setFocusActive }),
    [setActiveTab, setTasksView, setProgressPeriod, toggleKnowledgeNode, setFocusActive],
  );

  const navRef = nav as NavFn;
  useEffect(() => mountAgentCommandBus(navRef, uiSlice), [navRef, uiSlice]);
  return null;
}
