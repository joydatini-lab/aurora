/**
 * SettingsView — page de paramètres (cat. 2.18, 4.18).
 *
 * Étape 2 (muet) : reçoit `SettingsViewData` + callbacks. Pas de store, pas d'API.
 *
 * Structure (cat. 2.18) :
 * - `SettingsLayout` (section + contenu)
 * - `ThemeSwatchPicker` (choix du thème de couleur)
 * - `AppearancePreview` (aperçu light/dark)
 * - `ModuleSwitchList` (activer/désactiver des modules)
 * - `SelectControl` (contrôle de sélection générique avec label)
 * - `NotificationPreferences` (préférences de notification)
 * - `PrivacySettingsPanel` (réglages de confidentialité / RGPD)
 * - `KeyboardShortcutsTable` (liste des raccourcis clavier)
 * - `AccountSecurityPanel` (sécurité du compte : 2FA, sessions)
 * - `SaveStatus` (indicateur d'enregistrement)
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { AppIcon, type IconKey } from "src/components/ui/AppIcon";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Switch } from "src/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";

/* ------------------------------------------------------------------ */
/* Contrats de données                                                */
/* ------------------------------------------------------------------ */

export type ThemeMode = "light" | "dark" | "system";

export interface ThemeSwatch {
  id: string;
  name: string;
  /** Couleur hex de l'échantillon. */
  color: string;
}

export interface ModuleToggle {
  id: string;
  label: string;
  description?: string;
  /** Est actif. */
  enabled: boolean;
  /** Est un module premium / bloqué. */
  isPremium?: boolean;
  /** Icône. */
  icon?: IconKey;
}

export interface NotificationPref {
  id: string;
  label: string;
  /** Canaux disponibles. */
  channels: { id: "push" | "email" | "in-app"; label: string; enabled: boolean }[];
}

export interface PrivacySetting {
  id: string;
  label: string;
  description?: string;
  value: string;
  /** Appelé quand on change. */
  options?: string[];
  /** Est un réglage boolean. */
  isBoolean?: boolean;
  booleanValue?: boolean;
}

export interface KeyboardShortcut {
  id: string;
  label: string;
  /** Combinaison (ex. "⌘K"). */
  keys: string;
  /** Est modifiable par l'utilisateur. */
  isCustomizable?: boolean;
  /** Appelé quand on change le raccourci. */
  onChange?: (keys: string) => void;
}

export interface SessionInfo {
  id: string;
  device: string;
  location?: string;
  lastActiveAt: string;
  /** Est la session courante. */
  isCurrent?: boolean;
}

export interface AccountSecurityData {
  twoFactorEnabled: boolean;
  twoFactorMethod: "app" | "sms" | "email";
  sessions: SessionInfo[];
  passwordLastChangedAt?: string;
}

export interface SettingsViewData {
  title: string;
  /** Thème courant. */
  themeMode: ThemeMode;
  /** Couleur de marque courante. */
  activeSwatchId: string;
  /** Liste de swatches. */
  swatches: ThemeSwatch[];
  /** Modules. */
  modules: ModuleToggle[];
  /** Notifications. */
  notificationPrefs: NotificationPref[];
  /** Confidentialité. */
  privacySettings: PrivacySetting[];
  /** Raccourcis clavier. */
  shortcuts: KeyboardShortcut[];
  /** Sécurité du compte. */
  accountSecurity: AccountSecurityData;
  /** Nom du compte. */
  accountName: string;
  /** Email du compte. */
  accountEmail: string;
  /** Statut de sauvegarde. */
  saveState: "idle" | "saving" | "saved" | "error";
}

export interface SettingsViewProps {
  data: SettingsViewData;
  onThemeModeChange: (m: ThemeMode) => void;
  onSwatchChange: (id: string) => void;
  onModuleToggle: (moduleId: string, enabled: boolean) => void;
  onNotificationChannelChange: (prefId: string, channelId: string, enabled: boolean) => void;
  onPrivacyChange: (settingId: string, value: string | boolean) => void;
  onShortcutChange: (id: string, keys: string) => void;
  onTwoFactorToggle: (enabled: boolean) => void;
  onRevokeSession: (sessionId: string) => void;
  onSave?: () => void;
  /** Appelé quand on change le mot de passe. */
  onPasswordChange?: () => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* SaveStatus                                                          */
/* ------------------------------------------------------------------ */

export function SaveStatus({
  state,
  className,
}: {
  state: SettingsViewData["saveState"];
  className?: string;
}) {
  if (state === "idle") return null;
  const cfg = {
    saving: { label: "Enregistrement…", icon: "timer" as IconKey, tone: "muted" as const },
    saved: { label: "Enregistré", icon: "success" as IconKey, tone: "success" as const },
    error: { label: "Erreur d'enregistrement", icon: "error" as IconKey, tone: "danger" as const },
  }[state];
  return (
    <div
      data-slot="save-status"
      data-state={state}
      className={cn("flex items-center gap-1.5 text-xs", className)}
      role="status"
    >
      <AppIcon name={cfg.icon} size="xs" tone={cfg.tone} aria-hidden />
      {cfg.label}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ThemeSwatchPicker                                                   */
/* ------------------------------------------------------------------ */

export interface ThemeSwatchPickerProps {
  swatches: ThemeSwatch[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function ThemeSwatchPicker({
  swatches,
  activeId,
  onChange,
  className,
}: ThemeSwatchPickerProps) {
  return (
    <div
      data-slot="theme-swatch-picker"
      className={cn("flex flex-wrap items-center gap-2", className)}
      role="radiogroup"
      aria-label="Couleur de marque"
    >
      {swatches.map((s) => (
        <button
          key={s.id}
          type="button"
          role="radio"
          aria-checked={activeId === s.id}
          aria-label={s.name}
          onClick={() => onChange(s.id)}
          className={cn(
            "flex size-9 items-center justify-center rounded-full border-2 transition-transform",
            activeId === s.id
              ? "scale-110 border-foreground"
              : "border-transparent hover:scale-105"
          )}
          style={{ backgroundColor: s.color }}
        >
          {activeId === s.id && (
            <AppIcon name="success" size="sm" className="text-white" aria-hidden />
          )}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AppearancePreview                                                   */
/* ------------------------------------------------------------------ */

export interface AppearancePreviewProps {
  mode: ThemeMode;
  swatchColor: string;
  className?: string;
}

export function AppearancePreview({
  mode,
  swatchColor,
  className,
}: AppearancePreviewProps) {
  const bg = mode === "dark" ? "#0f172a" : mode === "light" ? "#ffffff" : "linear-gradient(90deg,#ffffff 50%,#0f172a 50%)";
  const fg = mode === "dark" ? "#f1f5f9" : "#0f172a";
  return (
    <div
      data-slot="appearance-preview"
      className={cn(
        "relative h-20 w-full overflow-hidden rounded-md border",
        className
      )}
      style={{ background: bg }}
      aria-label={`Aperçu du thème ${mode}`}
    >
      <div className="flex flex-col gap-2 p-3">
        <div
          className="flex h-8 items-center justify-center rounded"
          style={{ backgroundColor: swatchColor, color: "#fff" }}
        >
          <span className="text-xs font-medium">Bouton</span>
        </div>
        <div className="flex h-4 w-3/4 rounded" style={{ backgroundColor: fg + "18" }} />
        <div className="flex h-2 w-1/2 rounded" style={{ backgroundColor: fg + "0a" }} />
      </div>
      {mode === "system" && (
        <span className="absolute bottom-1.5 right-2 text-[10px] text-muted-foreground">
          Suivre le système
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ModuleSwitchList                                                    */
/* ------------------------------------------------------------------ */

export interface ModuleSwitchListProps {
  modules: ModuleToggle[];
  onToggle: (moduleId: string, enabled: boolean) => void;
  className?: string;
}

export function ModuleSwitchList({
  modules,
  onToggle,
  className,
}: ModuleSwitchListProps) {
  return (
    <div
      data-slot="module-switch-list"
      className={cn("flex flex-col gap-1", className)}
    >
      {modules.map((m) => (
        <div
          key={m.id}
          className="flex items-center gap-3 rounded-md border p-3"
        >
          {m.icon && (
            <AppIcon name={m.icon} size="md" tone="muted" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{m.label}</p>
              {m.isPremium && (
                <Badge variant="secondary" className="text-[10px]">
                  Pro
                </Badge>
              )}
            </div>
            {m.description && (
              <p className="text-xs text-muted-foreground">{m.description}</p>
            )}
          </div>
          <Switch
            checked={m.enabled}
            onCheckedChange={(v) => onToggle(m.id, v)}
            aria-label={`${m.label} activé`}
          />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SelectControl                                                       */
/* ------------------------------------------------------------------ */

export interface SelectControlProps {
  label: string;
  description?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  className?: string;
}

export function SelectControl({
  label,
  description,
  value,
  options,
  onChange,
  className,
}: SelectControlProps) {
  return (
    <div
      data-slot="select-control"
      className={cn("flex flex-col gap-1.5", className)}
    >
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && (
        <p className="text-[11px] text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* NotificationPreferences                                             */
/* ------------------------------------------------------------------ */

export interface NotificationPreferencesProps {
  prefs: NotificationPref[];
  onChannelChange: (prefId: string, channelId: string, enabled: boolean) => void;
  className?: string;
}

export function NotificationPreferences({
  prefs,
  onChannelChange,
  className,
}: NotificationPreferencesProps) {
  return (
    <div
      data-slot="notification-preferences"
      className={cn("flex flex-col gap-2.5", className)}
    >
      {prefs.map((p) => (
        <div key={p.id} className="rounded-md border p-3">
          <p className="mb-2 text-sm font-medium">{p.label}</p>
          <div className="flex flex-wrap gap-3">
            {p.channels.map((c) => (
              <div key={c.id} className="flex items-center gap-1.5">
                <Switch
                  checked={c.enabled}
                  onCheckedChange={(v) => onChannelChange(p.id, c.id, v)}
                  className="scale-90"
                />
                <span className="text-xs text-muted-foreground">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PrivacySettingsPanel                                                */
/* ------------------------------------------------------------------ */

export interface PrivacySettingsPanelProps {
  settings: PrivacySetting[];
  onChange: (id: string, value: string | boolean) => void;
  /** Bouton d'export / suppression des données (RGPD). */
  onExportData?: () => void;
  onDeleteAccount?: () => void;
  className?: string;
}

export function PrivacySettingsPanel({
  settings,
  onChange,
  onExportData,
  onDeleteAccount,
  className,
}: PrivacySettingsPanelProps) {
  return (
    <div
      data-slot="privacy-settings-panel"
      className={cn("flex flex-col gap-3", className)}
    >
      {settings.map((s) => (
        <div key={s.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{s.label}</p>
            {s.description && (
              <p className="text-xs text-muted-foreground">{s.description}</p>
            )}
          </div>
          {s.isBoolean ? (
            <Switch
              checked={s.booleanValue ?? false}
              onCheckedChange={(v) => onChange(s.id, v)}
              aria-label={s.label}
            />
          ) : s.options && s.options.length > 0 ? (
            <Select
              value={s.value}
              onValueChange={(v) => onChange(s.id, v)}
            >
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {s.options.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-xs text-muted-foreground">{s.value}</span>
          )}
        </div>
      ))}

      {(onExportData || onDeleteAccount) && (
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          {onExportData && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onExportData}>
              <AppIcon name="open" size="xs" aria-hidden />
              Exporter mes données
            </Button>
          )}
          {onDeleteAccount && (
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
              onClick={onDeleteAccount}
            >
              Supprimer mon compte
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* KeyboardShortcutsTable                                             */
/* ------------------------------------------------------------------ */

export interface KeyboardShortcutsTableProps {
  shortcuts: KeyboardShortcut[];
  onChange?: (id: string, keys: string) => void;
  className?: string;
}

export function KeyboardShortcutsTable({
  shortcuts,
  onChange,
  className,
}: KeyboardShortcutsTableProps) {
  return (
    <div
      data-slot="keyboard-shortcuts-table"
      className={cn("overflow-hidden rounded-lg border bg-card", className)}
    >
      <table className="w-full text-sm">
        <tbody>
          {shortcuts.map((s) => (
            <tr key={s.id} className="border-b border-border/40 last:border-0">
              <td className="px-3 py-2.5">{s.label}</td>
              <td className="px-3 py-2.5 text-right">
                {onChange && s.isCustomizable ? (
                  <div className="flex items-center justify-end gap-1.5">
                    <kbd className="rounded-md border bg-muted px-2 py-0.5 font-mono text-xs">
                      {s.keys}
                    </kbd>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-[10px]"
                      onClick={() => {
                        const newKeys = window.prompt(
                          "Nouveau raccourci (ex. ⌘K)",
                          s.keys
                        );
                        if (newKeys !== null && newKeys.trim()) {
                          onChange(s.id, newKeys.trim());
                        }
                      }}
                    >
                      Modifier
                    </Button>
                  </div>
                ) : (
                  <kbd className="rounded-md border bg-muted px-2 py-0.5 font-mono text-xs">
                    {s.keys}
                  </kbd>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AccountSecurityPanel                                                */
/* ------------------------------------------------------------------ */

export interface AccountSecurityPanelProps {
  data: AccountSecurityData;
  onTwoFactorToggle: (enabled: boolean) => void;
  onRevokeSession: (sessionId: string) => void;
  onPasswordChange?: () => void;
  className?: string;
}

export function AccountSecurityPanel({
  data,
  onTwoFactorToggle,
  onRevokeSession,
  onPasswordChange,
  className,
}: AccountSecurityPanelProps) {
  return (
    <div
      data-slot="account-security-panel"
      className={cn("flex flex-col gap-3", className)}
    >
      {/* 2FA */}
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <p className="text-sm font-medium">Authentification à deux facteurs</p>
          <p className="text-xs text-muted-foreground">
            {data.twoFactorEnabled
              ? `Activée via ${data.twoFactorMethod}`
              : "Désactivée — protégez votre compte"}
          </p>
        </div>
        <Switch
          checked={data.twoFactorEnabled}
          onCheckedChange={onTwoFactorToggle}
          aria-label="Authentification à deux facteurs"
        />
      </div>

      {/* Mot de passe */}
      {onPasswordChange && (
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">Mot de passe</p>
            {data.passwordLastChangedAt && (
              <p className="text-xs text-muted-foreground">
                Modifié le{" "}
                {new Date(data.passwordLastChangedAt).toLocaleDateString("fr-FR")}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onPasswordChange}>
            Modifier
          </Button>
        </div>
      )}

      {/* Sessions */}
      <div className="flex flex-col gap-2 rounded-md border p-3">
        <p className="text-sm font-medium">Sessions actives</p>
        {data.sessions.map((s) => (
          <div key={s.id} className="flex items-center gap-2 text-xs">
            <AppIcon
              name={s.isCurrent ? "success" : "tool"}
              size="xs"
              tone={s.isCurrent ? "success" : "muted"}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{s.device}</p>
              <p className="text-muted-foreground">
                {s.location ? `${s.location} · ` : ""}
                {new Date(s.lastActiveAt).toLocaleDateString("fr-FR", {
                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                })}
                {s.isCurrent && " · En cours"}
              </p>
            </div>
            {!s.isCurrent && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-destructive"
                onClick={() => onRevokeSession(s.id)}
              >
                Révoquer
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                */
/* ------------------------------------------------------------------ */

export function SettingsView({
  data,
  onThemeModeChange,
  onSwatchChange,
  onModuleToggle,
  onNotificationChannelChange,
  onPrivacyChange,
  onShortcutChange,
  onTwoFactorToggle,
  onRevokeSession,
  onSave,
  onPasswordChange,
  className,
}: SettingsViewProps) {
  const [activeSection, setActiveSection] = React.useState<
    "appearance" | "modules" | "notifications" | "privacy" | "shortcuts" | "security"
  >("appearance");

  const sections = [
    { key: "appearance" as const, label: "Apparence", icon: "image" as IconKey },
    { key: "modules" as const, label: "Modules", icon: "tool" as IconKey },
    { key: "notifications" as const, label: "Notifications", icon: "warning" as IconKey },
    { key: "privacy" as const, label: "Confidentialité", icon: "permission" as IconKey },
    { key: "shortcuts" as const, label: "Raccourcis", icon: "terminal" as IconKey },
    { key: "security" as const, label: "Sécurité", icon: "approval" as IconKey },
  ];

  const activeSwatch = data.swatches.find((s) => s.id === data.activeSwatchId);

  return (
    <div
      data-slot="settings-view"
      className={cn("flex min-h-0 flex-col gap-4", className)}
    >
      {/* En-tête */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2">
          <AppIcon name="tool" size="lg" aria-hidden />
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {data.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {data.accountName} · {data.accountEmail}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SaveStatus state={data.saveState} />
          {onSave && (
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={onSave}
              disabled={data.saveState === "saving" || data.saveState === "saved"}
            >
              Enregistrer
            </Button>
          )}
        </div>
      </div>

      {/* Corps : sidebar + contenu */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Sidebar */}
        <nav
          className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5 lg:overflow-visible"
          aria-label="Sections de paramètres"
        >
          {sections.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-current={activeSection === s.key ? "page" : undefined}
              onClick={() => setActiveSection(s.key)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors lg:w-full",
                activeSection === s.key
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <AppIcon name={s.icon} size="sm" aria-hidden />
              {s.label}
            </button>
          ))}
        </nav>

        {/* Contenu */}
        <div className="min-w-0 flex-1">
          {activeSection === "appearance" && (
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold">Mode</h2>
              <SelectControl
                label="Thème"
                value={data.themeMode}
                options={[
                  { value: "light", label: "Clair" },
                  { value: "dark", label: "Sombre" },
                  { value: "system", label: "Système" },
                ]}
                onChange={(v) => onThemeModeChange(v as ThemeMode)}
              />
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">Couleur de marque</h3>
                <ThemeSwatchPicker
                  swatches={data.swatches}
                  activeId={data.activeSwatchId}
                  onChange={onSwatchChange}
                />
                <AppearancePreview
                  mode={data.themeMode}
                  swatchColor={activeSwatch?.color ?? "#6366f1"}
                />
              </div>
            </div>
          )}

          {activeSection === "modules" && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold">Modules</h2>
              <ModuleSwitchList
                modules={data.modules}
                onToggle={onModuleToggle}
              />
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold">Notifications</h2>
              <NotificationPreferences
                prefs={data.notificationPrefs}
                onChannelChange={onNotificationChannelChange}
              />
            </div>
          )}

          {activeSection === "privacy" && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold">Confidentialité</h2>
              <PrivacySettingsPanel
                settings={data.privacySettings}
                onChange={onPrivacyChange}
                onExportData={undefined}
                onDeleteAccount={undefined}
              />
            </div>
          )}

          {activeSection === "shortcuts" && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold">Raccourcis clavier</h2>
              <KeyboardShortcutsTable
                shortcuts={data.shortcuts}
                onChange={onShortcutChange}
              />
            </div>
          )}

          {activeSection === "security" && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold">Sécurité du compte</h2>
              <AccountSecurityPanel
                data={data.accountSecurity}
                onTwoFactorToggle={onTwoFactorToggle}
                onRevokeSession={onRevokeSession}
                onPasswordChange={onPasswordChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
