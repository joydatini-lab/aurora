/**
 * Composites — Integrations + Settings stories (cat. 2.17, 2.18).
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import {
  IntegrationsView,
  type ConnectorData,
  type SyncHistoryItem,
  type IntegrationsViewData,
  SettingsView,
  type SettingsViewData,
} from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/Composites/Integrations+Settings",
  tags: ["autodocs"],
};
export default meta;

/* ------------------------------------------------------------------ */
/* Integrations                                                        */
/* ------------------------------------------------------------------ */

const connectors: ConnectorData[] = [
  {
    id: "supabase",
    name: "Supabase",
    description: "Postgres, auth, realtime, storage",
    icon: "table",
    authMethod: "api-key",
    state: "connected",
    lastSyncAt: "2026-10-13T08:15:00Z",
    syncedCount: 1240,
    docsUrl: "https://supabase.com/docs",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Repos, PRs, issues, webhooks",
    icon: "code",
    authMethod: "oauth",
    state: "connected",
    lastSyncAt: "2026-10-13T07:40:00Z",
    syncedCount: 87,
    availableScopes: ["repo", "read:org", "notifications"],
    grantedScopes: ["repo", "read:org"],
  },
  {
    id: "slack",
    name: "Slack",
    description: "Notifications et intégrations teams",
    icon: "open",
    authMethod: "oauth",
    state: "disconnected",
    availableScopes: ["chat:write", "reactions:write"],
  },
  {
    id: "notion",
    name: "Notion",
    description: "Synchronisation de pages et bases",
    icon: "file-doc",
    authMethod: "oauth",
    state: "error",
    errorMessage: "Token expiré — reconnexion requise",
  },
  {
    id: "linear",
    name: "Linear",
    description: "Suivi de features et bugs",
    icon: "task",
    authMethod: "api-key",
    state: "disconnected",
    isPremium: true,
  },
];

const syncHistory: SyncHistoryItem[] = [
  { id: "sh1", timestamp: "2026-10-13T08:15:00Z", status: "success", summary: "Supabase : 1240 objets synchronisés" },
  { id: "sh2", timestamp: "2026-10-13T07:40:00Z", status: "success", summary: "GitHub : 87 objets synchronisés" },
  { id: "sh3", timestamp: "2026-10-12T22:00:00Z", status: "failed", summary: "Notion : token expiré", errorDetail: "HTTP 401 Unauthorized" },
  { id: "sh4", timestamp: "2026-10-12T18:00:00Z", status: "partial", summary: "Supabase : 3 tableaux ignorés (RLS)" },
];

export const Integrations: Story = {
  render: () => {
    const [state, setState] = React.useState<IntegrationsViewData>({
      title: "Intégrations",
      description: "Connecteurs externes et synchronisations",
      connectors,
      syncHistory,
      filter: "all",
      selectedConnectorId: null,
    });

    const update = (next: IntegrationsViewData) => setState(next);

    return (
      <div className="mx-auto max-w-2xl">
        <IntegrationsView
          data={state}
          onConnect={(id) =>
            update({
              ...state,
              connectors: state.connectors.map((c) =>
                c.id === id ? { ...c, state: "connected", lastSyncAt: new Date().toISOString() } : c
              ),
            })
          }
          onDisconnect={(id) =>
            update({
              ...state,
              connectors: state.connectors.map((c) =>
                c.id === id ? { ...c, state: "disconnected", lastSyncAt: undefined, syncedCount: undefined } : c
              ),
            })
          }
          onOpenSettings={(id) => update({ ...state, selectedConnectorId: id })}
          onSyncNow={(id) => {
            update({
              ...state,
              connectors: state.connectors.map((c) =>
                c.id === id ? { ...c, lastSyncAt: new Date().toISOString() } : c
              ),
            });
            update({
              ...state,
              syncHistory: [
                { id: `sh-${Date.now()}`, timestamp: new Date().toISOString(), status: "success", summary: `${state.connectors.find((c) => c.id === id)?.name ?? id} : synchro manuelle` },
                ...state.syncHistory,
              ],
            });
          }}
          onRetry={(id) => {
            update({
              ...state,
              connectors: state.connectors.map((c) =>
                c.id === id ? { ...c, state: "connecting", errorMessage: undefined } : c
              ),
            });
            setTimeout(() => {
              setState((s) => ({
                ...s,
                connectors: s.connectors.map((c) =>
                  c.id === id ? { ...c, state: "connected" } : c
                ),
              }));
            }, 1500);
          }}
          onFilterChange={(f) => update({ ...state, filter: f })}
        />
      </div>
    );
  },
};

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export const Parametres: Story = {
  render: () => {
    const [data, setData] = React.useState<SettingsViewData>({
      title: "Paramètres",
      themeMode: "system",
      activeSwatchId: "violet",
      swatches: [
        { id: "violet", name: "Violet", color: "#8b5cf6" },
        { id: "indigo", name: "Indigo", color: "#6366f1" },
        { id: "emerald", name: "Émeraude", color: "#10b981" },
        { id: "rose", name: "Rose", color: "#f43f5e" },
        { id: "slate", name: "Ardoise", color: "#64748b" },
      ],
      modules: [
        { id: "focus", label: "Focus / Pomodoro", icon: "timer", enabled: true },
        { id: "tasks", label: "Tâches & Kanban", icon: "task", enabled: true },
        { id: "calendar", label: "Calendrier", icon: "calendar", enabled: true },
        { id: "habits", label: "Habitudes", icon: "habit", enabled: true },
        { id: "agent", label: "Agent IA", icon: "insight", enabled: true, isPremium: true },
        { id: "knowledge", label: "Connaissances", icon: "chart", enabled: false },
      ],
      notificationPrefs: [
        {
          id: "np1",
          label: "Rappels de tâches",
          channels: [
            { id: "push", label: "Push", enabled: true },
            { id: "email", label: "Email", enabled: false },
            { id: "in-app", label: "In-app", enabled: true },
          ],
        },
        {
          id: "np2",
          label: "Synthèse hebdomadaire",
          channels: [
            { id: "push", label: "Push", enabled: false },
            { id: "email", label: "Email", enabled: true },
            { id: "in-app", label: "In-app", enabled: true },
          ],
        },
      ],
      privacySettings: [
        {
          id: "ps1",
          label: "Partager les données de performance",
          description: "Anonymisées, utilisées pour améliorer le produit",
          isBoolean: true,
          booleanValue: false,
          value: "false",
        },
        {
          id: "ps2",
          label: "Rétention des journaux",
          options: ["30 jours", "90 jours", "1 an", "Illimité"],
          value: "90 jours",
        },
        {
          id: "ps3",
          label: "Reconnaissance faciale",
          isBoolean: true,
          booleanValue: false,
          value: "false",
        },
      ],
      shortcuts: [
        { id: "sc1", label: "Command palette", keys: "⌘ K" },
        { id: "sc2", label: "Créer une capture", keys: "⌘ N" },
        { id: "sc3", label: "Focus mode", keys: "⌘ F", isCustomizable: true },
        { id: "sc4", label: "Basculer le thème", keys: "⌘ D", isCustomizable: true },
      ],
      accountSecurity: {
        twoFactorEnabled: true,
        twoFactorMethod: "app",
        sessions: [
          { id: "sess1", device: "iPhone 15 (iOS)", location: "Paris, FR", lastActiveAt: "2026-10-13T08:00:00Z", isCurrent: true },
          { id: "sess2", device: "Chrome (macOS)", location: "Paris, FR", lastActiveAt: "2026-10-12T22:10:00Z" },
          { id: "sess3", device: "Safari (macOS)", location: "Lyon, FR", lastActiveAt: "2026-10-10T15:00:00Z" },
        ],
        passwordLastChangedAt: "2026-06-15",
      },
      accountName: "Joy Dupont",
      accountEmail: "joy@aurora.app",
      saveState: "idle",
    });

    return (
      <div className="mx-auto max-w-2xl">
        <SettingsView
          data={data}
          onThemeModeChange={(m) => setData((d) => ({ ...d, themeMode: m }))}
          onSwatchChange={(id) => setData((d) => ({ ...d, activeSwatchId: id }))}
          onModuleToggle={(id, enabled) =>
            setData((d) => ({
              ...d,
              modules: d.modules.map((m) => (m.id === id ? { ...m, enabled } : m)),
            }))
          }
          onNotificationChannelChange={(prefId, channelId, enabled) =>
            setData((d) => ({
              ...d,
              notificationPrefs: d.notificationPrefs.map((p) =>
                p.id === prefId
                  ? { ...p, channels: p.channels.map((c) => (c.id === channelId ? { ...c, enabled } : c)) }
                  : p
              ),
            }))
          }
          onPrivacyChange={(id, value) =>
            setData((d) => ({
              ...d,
              privacySettings: d.privacySettings.map((s) =>
                s.id === id ? { ...s, value: String(value), booleanValue: typeof value === "boolean" ? value : undefined } : s
              ),
            }))
          }
          onShortcutChange={(id, keys) =>
            setData((d) => ({
              ...d,
              shortcuts: d.shortcuts.map((s) => (s.id === id ? { ...s, keys } : s)),
            }))
          }
          onTwoFactorToggle={(enabled) =>
            setData((d) => ({ ...d, accountSecurity: { ...d.accountSecurity, twoFactorEnabled: enabled } }))
          }
          onRevokeSession={(id) =>
            setData((d) => ({
              ...d,
              accountSecurity: {
                ...d.accountSecurity,
                sessions: d.accountSecurity.sessions.filter((s) => s.id !== id),
              },
            }))
          }
          onSave={() => {
            setData((d) => ({ ...d, saveState: "saving" }));
            setTimeout(() => setData((d) => ({ ...d, saveState: "saved" })), 800);
          }}
          onPasswordChange={() => console.log("password-change")}
        />
      </div>
    );
  },
};
