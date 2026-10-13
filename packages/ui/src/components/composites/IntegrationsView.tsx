/**
 * IntegrationsView — page d'intégrations / connecteurs (cat. 2.17, 4.17).
 *
 * Étape 2 (muet) : reçoit `IntegrationsViewData` + callbacks. Pas de store, pas d'API.
 *
 * Structure (cat. 2.17) :
 * - `IntegrationDirectory` (liste des intégrations disponibles)
 * - `ConnectorRow` (une intégration : nom, icône, statut connect/disconnect, actions)
 * - `ConnectorConnectDialog` (dialogue de connexion : OAuth ou clé API)
 * - `ConnectorSettingsSheet` (paramètres de l'intégration connectée)
 * - `SyncHistoryList` (historique de synchronisation)
 * - `DisconnectConfirmationDialog` (confirmation de déconnexion)
 * - `WebhookSecretField` (champ de secret webhook avec masquage)
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { AppIcon, type IconKey } from "src/components/ui/AppIcon";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "src/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "src/components/ui/dialog";
import { Input } from "src/components/ui/input";
import { Switch } from "src/components/ui/switch";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "src/components/ui/drawer";

/* ------------------------------------------------------------------ */
/* Contrats de données                                                */
/* ------------------------------------------------------------------ */

export type ConnectorAuthMethod = "oauth" | "api-key" | "service-account";
export type ConnectorState = "disconnected" | "connecting" | "connected" | "error";

export const AUTH_METHOD_LABELS: Record<ConnectorAuthMethod, string> = {
  oauth: "OAuth",
  "api-key": "Clé API",
  "service-account": "Compte de service",
};

export interface ConnectorData {
  id: string;
  name: string;
  description?: string;
  icon: IconKey;
  /** Méthode d'authentification. */
  authMethod: ConnectorAuthMethod;
  /** État courant. */
  state: ConnectorState;
  /** Dernière synchro (ISO). */
  lastSyncAt?: string;
  /** Nombre d'objets synchronisés. */
  syncedCount?: number;
  /** Erreur (si state = error). */
  errorMessage?: string;
  /** Options de scopes (si oauth). */
  availableScopes?: string[];
  /** Scopes accordés. */
  grantedScopes?: string[];
  /** Est une intégration premium / payante. */
  isPremium?: boolean;
  /** URL de la doc. */
  docsUrl?: string;
}

export interface SyncHistoryItem {
  id: string;
  timestamp: string;
  status: "success" | "failed" | "partial";
  summary: string;
  errorDetail?: string;
}

export interface IntegrationsViewData {
  title: string;
  description?: string;
  connectors: ConnectorData[];
  /** Connecteur sélectionné (settings sheet). */
  selectedConnectorId?: string | null;
  /** Historique de sync (global ou par connecteur). */
  syncHistory: SyncHistoryItem[];
  /** Est le module d'intégration actif (tous / un seul). */
  filter?: "all" | "connected" | "available";
}

export interface IntegrationsViewProps {
  data: IntegrationsViewData;
  onConnect: (connectorId: string, credentials: {
    apiKey?: string;
    serviceAccountJson?: string;
    scopes?: string[];
  }) => void;
  onDisconnect: (connectorId: string) => void;
  onOpenSettings: (connectorId: string) => void;
  onSyncNow: (connectorId: string) => void;
  onRetry: (connectorId: string) => void;
  /** Appelé quand on change le filtre. */
  onFilterChange?: (f: IntegrationsViewData["filter"]) => void;
  /** Appelé quand on copie un webhook secret. */
  onCopySecret?: (secretId: string, value: string) => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* WebhookSecretField                                                 */
/* ------------------------------------------------------------------ */

export interface WebhookSecretFieldProps {
  label: string;
  value: string;
  /** Copier dans le presse-papiers. */
  onCopy?: (value: string) => void;
  /** Révéler / masquer le secret. */
  revealable?: boolean;
  /** Appelé quand on révise / régénère. */
  onRegenerate?: () => void;
  className?: string;
}

export function WebhookSecretField({
  label,
  value,
  onCopy,
  revealable = true,
  onRegenerate,
  className,
}: WebhookSecretFieldProps) {
  const [revealed, setRevealed] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    onCopy?.(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const masked = value.length > 8 ? `${value.slice(0, 4)}…${value.slice(-4)}` : "••••";

  return (
    <div
      data-slot="webhook-secret-field"
      className={cn("flex flex-col gap-1.5", className)}
    >
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-1.5">
        <code className="min-w-0 flex-1 overflow-x-auto rounded-md border bg-muted/30 px-3 py-2 font-mono text-xs tabular-nums">
          {revealed ? value : masked}
        </code>
        {revealable && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setRevealed((r) => !r)}
          >
            {revealed ? "Masquer" : "Révéler"}
          </Button>
        )}
        {onCopy && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={handleCopy}
          >
            {copied ? "Copié" : "Copier"}
          </Button>
        )}
        {onRegenerate && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onRegenerate}
          >
            Régénérer
          </Button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ConnectorRow                                                       */
/* ------------------------------------------------------------------ */

export interface ConnectorRowProps {
  connector: ConnectorData;
  onConnect: () => void;
  onDisconnect?: () => void;
  onOpenSettings?: () => void;
  onSyncNow?: () => void;
  onRetry?: () => void;
  className?: string;
}

const STATE_CONFIG: Record<
  ConnectorState,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; dotClass: string }
> = {
  disconnected: { label: "Non connecté", variant: "outline", dotClass: "bg-muted-foreground/40" },
  connecting: { label: "Connexion…", variant: "secondary", dotClass: "bg-warning" },
  connected: { label: "Connecté", variant: "secondary", dotClass: "bg-success" },
  error: { label: "Erreur", variant: "destructive", dotClass: "bg-destructive" },
};

export function ConnectorRow({
  connector,
  onConnect,
  onDisconnect,
  onOpenSettings,
  onSyncNow,
  onRetry,
  className,
}: ConnectorRowProps) {
  const cfg = STATE_CONFIG[connector.state];
  const isConnected = connector.state === "connected";

  return (
    <div
      data-slot="connector-row"
      data-connector-id={connector.id}
      data-state={connector.state}
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-card p-3.5",
        connector.state === "error" && "border-destructive/30 bg-destructive/5",
        className
      )}
    >
      {/* Icone + nom */}
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-background"
        style={{ backgroundColor: undefined }}
      >
        <AppIcon name={connector.icon} size="md" aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{connector.name}</p>
          {connector.isPremium && (
            <Badge variant="secondary" className="text-[10px]">
              Pro
            </Badge>
          )}
          <span
            className={cn("ml-auto flex items-center gap-1.5 text-xs", connector.state === "error" ? "text-destructive" : "text-muted-foreground")}
          >
            <span className={cn("size-2 rounded-full", cfg.dotClass)} aria-hidden />
            {cfg.label}
          </span>
        </div>

        {connector.description && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {connector.description}
          </p>
        )}

        {isConnected && connector.lastSyncAt && (
          <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
            Dernière synchro : {new Date(connector.lastSyncAt).toLocaleDateString("fr-FR", {
              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
            })}
            {connector.syncedCount !== undefined &&
              ` · ${connector.syncedCount} objet${connector.syncedCount > 1 ? "s" : ""}`}
          </p>
        )}

        {connector.state === "error" && connector.errorMessage && (
          <p className="mt-1 text-xs text-destructive">{connector.errorMessage}</p>
        )}

        {/* Actions */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {connector.state === "disconnected" && (
            <Button size="sm" className="h-7 text-xs" onClick={onConnect}>
              Connecter
            </Button>
          )}
          {connector.state === "connecting" && (
            <Button size="sm" variant="outline" className="h-7 text-xs" disabled>
              Connexion en cours…
            </Button>
          )}
          {isConnected && onOpenSettings && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onOpenSettings}>
              Paramètres
            </Button>
          )}
          {isConnected && onSyncNow && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onSyncNow}>
              Synchroniser
            </Button>
          )}
          {connector.state === "error" && onRetry && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onRetry}>
              <AppIcon name="retry" size="xs" aria-hidden />
              Réessayer
            </Button>
          )}
          {isConnected && onDisconnect && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={onDisconnect}
            >
              Déconnecter
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ConnectorConnectDialog                                             */
/* ------------------------------------------------------------------ */

export interface ConnectorConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connector: ConnectorData;
  onConnect: (credentials: { apiKey?: string; serviceAccountJson?: string; scopes?: string[] }) => void;
  className?: string;
}

export function ConnectorConnectDialog({
  open,
  onOpenChange,
  connector,
  onConnect,
  className,
}: ConnectorConnectDialogProps) {
  const [apiKey, setApiKey] = React.useState("");
  const [serviceAccountJson, setServiceAccountJson] = React.useState("");
  const [selectedScopes, setSelectedScopes] = React.useState<string[]>([]);

  const isOAuth = connector.authMethod === "oauth";
  const isApiKey = connector.authMethod === "api-key";
  const isServiceAccount = connector.authMethod === "service-account";

  const canSubmit = isOAuth || (isApiKey && apiKey.trim().length > 0) || (isServiceAccount && serviceAccountJson.trim().length > 0);

  const handleSubmit = () => {
    onConnect({
      apiKey: isApiKey ? apiKey.trim() : undefined,
      serviceAccountJson: isServiceAccount ? serviceAccountJson : undefined,
      scopes: isOAuth ? selectedScopes : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-md", className)}>
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2">
              <AppIcon name={connector.icon} size="md" aria-hidden />
              Connecter {connector.name}
            </span>
          </DialogTitle>
          <DialogDescription>
            {connector.description ?? `Connectez votre compte ${connector.name}.`}
            {connector.docsUrl && (
              <>
                {" "}
                <a
                  href={connector.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Documentation
                </a>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {isOAuth && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                Scopes demandés
              </p>
              {(connector.availableScopes ?? []).map((scope) => {
                const checked = selectedScopes.includes(scope);
                return (
                  <button
                    key={scope}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() =>
                      setSelectedScopes((s) =>
                        checked ? s.filter((x) => x !== scope) : [...s, scope]
                      )
                    }
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors",
                      checked ? "border-primary bg-primary/5" : "hover:bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded border",
                        checked ? "border-primary bg-primary text-primary-foreground" : "border-border"
                      )}
                    >
                      {checked && "✓"}
                    </span>
                    {scope}
                  </button>
                );
              })}
            </div>
          )}

          {isApiKey && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Clé API
              </label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk_live_…"
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">
                Trouvez votre clé dans les paramètres de compte de {connector.name}.
              </p>
            </div>
          )}

          {isServiceAccount && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Fichier de compte de service (JSON)
              </label>
              <textarea
                value={serviceAccountJson}
                onChange={(e) => setServiceAccountJson(e.target.value)}
                placeholder="{ &quot;type&quot;: &quot;service_account&quot;, … }"
                rows={4}
                className="w-full resize-none rounded-md border bg-background p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-[11px] text-muted-foreground">
                Collez le contenu du JSON du service account.
              </p>
            </div>
          )}

          {isOAuth && connector.grantedScopes && connector.grantedScopes.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-muted-foreground">
                Scopes déjà accordés
              </p>
              <div className="flex flex-wrap gap-1">
                {connector.grantedScopes.map((s) => (
                  <Badge key={s} variant="outline" className="text-[10px]">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button size="sm" disabled={!canSubmit} onClick={handleSubmit}>
            Connecter
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* ConnectorSettingsSheet                                             */
/* ------------------------------------------------------------------ */

export interface ConnectorSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connector: ConnectorData;
  onSyncNow?: () => void;
  onDisconnect?: () => void;
  /** Auto-sync activable. */
  autoSyncEnabled?: boolean;
  onAutoSyncChange?: (enabled: boolean) => void;
  /** Secret webhook (si l'intégration expose un webhook). */
  webhookSecret?: string;
  onCopyWebhook?: (value: string) => void;
  className?: string;
}

export function ConnectorSettingsSheet({
  open,
  onOpenChange,
  connector,
  onSyncNow,
  onDisconnect,
  autoSyncEnabled,
  onAutoSyncChange,
  webhookSecret,
  onCopyWebhook,
  className,
}: ConnectorSettingsSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className={cn("rounded-t-xl", className)}>
        <DrawerHeader>
          <DrawerTitle>
            <span className="flex items-center gap-2">
              <AppIcon name={connector.icon} size="sm" aria-hidden />
              {connector.name}
            </span>
          </DrawerTitle>
          <DrawerDescription>
            Paramètres de l'intégration {connector.name}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-4 px-4 pb-4">
          {/* État */}
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">
                État :{" "}
                <span
                  className={cn(
                    connector.state === "connected"
                      ? "text-success"
                      : connector.state === "error"
                        ? "text-destructive"
                        : "text-muted-foreground"
                  )}
                >
                  {STATE_CONFIG[connector.state].label}
                </span>
              </p>
              {connector.lastSyncAt && (
                <p className="text-xs text-muted-foreground">
                  Dernière synchro :{" "}
                  {new Date(connector.lastSyncAt).toLocaleDateString("fr-FR", {
                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              )}
            </div>
            {onSyncNow && (
              <Button size="sm" className="h-7 text-xs" onClick={onSyncNow}>
                Synchroniser maintenant
              </Button>
            )}
          </div>

          {/* Auto-sync */}
          {onAutoSyncChange !== undefined && (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Synchronisation automatique</p>
                <p className="text-xs text-muted-foreground">
                  Synchronise périodiquement les données
                </p>
              </div>
              <Switch
                checked={autoSyncEnabled ?? false}
                onCheckedChange={onAutoSyncChange}
              />
            </div>
          )}

          {/* Webhook secret */}
          {webhookSecret && (
            <WebhookSecretField
              label="Secret du webhook"
              value={webhookSecret}
              onCopy={onCopyWebhook}
            />
          )}

          {/* Déconnexion */}
          {onDisconnect && (
            <div className="border-t pt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Déconnexion
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={onDisconnect}
              >
                Déconnecter {connector.name}
              </Button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* ------------------------------------------------------------------ */
/* SyncHistoryList                                                    */
/* ------------------------------------------------------------------ */

export interface SyncHistoryListProps {
  items: SyncHistoryItem[];
  onRetry?: (syncId: string) => void;
  className?: string;
}

export function SyncHistoryList({
  items,
  onRetry,
  className,
}: SyncHistoryListProps) {
  if (items.length === 0) {
    return (
      <div
        data-slot="sync-history-list"
        className={cn(
          "flex flex-col items-center gap-2 rounded-lg border border-dashed py-6 text-center",
          className
        )}
      >
        <AppIcon name="timer" size="md" tone="muted" aria-hidden />
        <p className="text-xs text-muted-foreground">
          Aucune synchronisation pour le moment
        </p>
      </div>
    );
  }

  return (
    <div
      data-slot="sync-history-list"
      className={cn("flex flex-col gap-1.5", className)}
    >
      {items.map((item) => (
        <div
          key={item.id}
          data-sync-id={item.id}
          data-status={item.status}
          className={cn(
            "flex items-start gap-2.5 rounded-md border bg-card px-3 py-2",
            item.status === "failed" && "border-destructive/30"
          )}
        >
          <AppIcon
            name={
              item.status === "success" ? "success" : item.status === "failed" ? "error" : "warning"
            }
            size="xs"
            tone={item.status === "success" ? "success" : item.status === "failed" ? "danger" : "warning"}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium">
              {item.summary}
              {item.status === "partial" && (
                <Badge variant="outline" className="ml-2 text-[10px]">
                  partiel
                </Badge>
              )}
            </p>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {new Date(item.timestamp).toLocaleDateString("fr-FR", {
                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
              })}
            </p>
            {item.status === "failed" && item.errorDetail && (
              <p className="mt-1 text-[11px] text-destructive">{item.errorDetail}</p>
            )}
          </div>
          {item.status === "failed" && onRetry && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 shrink-0 px-2 text-[10px]"
              onClick={() => onRetry(item.id)}
            >
              Réessayer
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DisconnectConfirmationDialog                                       */
/* ------------------------------------------------------------------ */

export interface DisconnectConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectorName: string;
  onConfirm: () => void;
  /** Est une intégration qui stocke des données (prévenir de la perte). */
  willLoseData?: boolean;
  className?: string;
}

export function DisconnectConfirmationDialog({
  open,
  onOpenChange,
  connectorName,
  onConfirm,
  willLoseData,
  className,
}: DisconnectConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn("max-w-sm", className)}>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Déconnecter {connectorName} ?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {willLoseData
              ? "Les données locales synchronisées seront supprimées. Cette action est irréversible."
              : "Vous devrez vous reconnecter pour utiliser cette intégration à nouveau."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Déconnecter
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ------------------------------------------------------------------ */
/* IntegrationDirectory                                               */
/* ------------------------------------------------------------------ */

export interface IntegrationDirectoryProps {
  connectors: ConnectorData[];
  filter?: "all" | "connected" | "available";
  onFilterChange?: (f: "all" | "connected" | "available") => void;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onOpenSettings: (id: string) => void;
  onSyncNow: (id: string) => void;
  onRetry: (id: string) => void;
  className?: string;
}

export function IntegrationDirectory({
  connectors,
  filter = "all",
  onFilterChange,
  onConnect,
  onDisconnect,
  onOpenSettings,
  onSyncNow,
  onRetry,
  className,
}: IntegrationDirectoryProps) {
  const filtered = connectors.filter((c) => {
    if (filter === "connected") return c.state === "connected";
    if (filter === "available") return c.state !== "connected";
    return true;
  });

  const tabs: { key: "all" | "connected" | "available"; label: string }[] = [
    { key: "all", label: "Toutes" },
    { key: "connected", label: "Connectées" },
    { key: "available", label: "Disponibles" },
  ];

  return (
    <div
      data-slot="integration-directory"
      className={cn("flex flex-col gap-4", className)}
    >
      {/* Filtre */}
      {onFilterChange && (
        <div
          className="flex items-center gap-1 rounded-md border p-0.5"
          role="tablist"
          aria-label="Filtrer les intégrations"
        >
          {tabs.map((t) => (
            <Button
              key={t.key}
              variant={filter === t.key ? "secondary" : "ghost"}
              size="sm"
              className={cn("h-7 flex-1 text-xs", filter !== t.key && "text-muted-foreground")}
              onClick={() => onFilterChange(t.key)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      )}

      {/* Liste */}
      <div className="flex flex-col gap-2.5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center">
            <AppIcon name="tool" size="lg" tone="muted" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Aucune intégration dans cette catégorie
            </p>
          </div>
        ) : (
          filtered.map((c) => (
            <ConnectorRow
              key={c.id}
              connector={c}
              onConnect={() => onConnect(c.id)}
              onDisconnect={() => onDisconnect(c.id)}
              onOpenSettings={() => onOpenSettings(c.id)}
              onSyncNow={() => onSyncNow(c.id)}
              onRetry={() => onRetry(c.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                */
/* ------------------------------------------------------------------ */

export function IntegrationsView({
  data,
  onConnect,
  onDisconnect,
  onOpenSettings,
  onSyncNow,
  onRetry,
  onFilterChange,
  onCopySecret,
  className,
}: IntegrationsViewProps) {
  const [connectDialogId, setConnectDialogId] = React.useState<string | null>(null);
  const [disconnectId, setDisconnectId] = React.useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const connectTarget = data.connectors.find((c) => c.id === connectDialogId) ?? null;
  const settingsTarget = data.connectors.find((c) => c.id === data.selectedConnectorId) ?? null;
  const disconnectTarget = data.connectors.find((c) => c.id === disconnectId) ?? null;

  return (
    <div
      data-slot="integrations-view"
      className={cn("flex flex-col gap-4", className)}
    >
      {/* En-tête */}
      <div className="flex items-start justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2">
          <AppIcon name="tool" size="lg" aria-hidden />
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {data.title}
            </h1>
            {data.description && (
              <p className="text-sm text-muted-foreground">{data.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Catalogue */}
      <IntegrationDirectory
        connectors={data.connectors}
        filter={data.filter}
        onFilterChange={onFilterChange}
        onConnect={(id) => setConnectDialogId(id)}
        onDisconnect={(id) => setDisconnectId(id)}
        onOpenSettings={(id) => {
          onOpenSettings(id);
          setSettingsOpen(true);
        }}
        onSyncNow={onSyncNow}
        onRetry={onRetry}
      />

      {/* Historique de sync */}
      {data.syncHistory.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <h3 className="text-sm font-semibold">Historique de synchronisation</h3>
          <SyncHistoryList
            items={data.syncHistory}
            onRetry={(syncId) => {
              const item = data.syncHistory.find((h) => h.id === syncId);
              if (item) onRetry(item.id);
            }}
          />
        </div>
      )}

      {/* Dialogues */}
      {connectTarget && (
        <ConnectorConnectDialog
          open={connectDialogId !== null}
          onOpenChange={(open) => !open && setConnectDialogId(null)}
          connector={connectTarget}
          onConnect={(creds) => onConnect(connectTarget.id, creds)}
        />
      )}

      {settingsTarget && (
        <ConnectorSettingsSheet
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          connector={settingsTarget}
          onSyncNow={() => onSyncNow(settingsTarget.id)}
          onDisconnect={() => {
            setSettingsOpen(false);
            setDisconnectId(settingsTarget.id);
          }}
          onCopyWebhook={(value) => onCopySecret?.(settingsTarget.id, value)}
        />
      )}

      {disconnectTarget && (
        <DisconnectConfirmationDialog
          open={disconnectId !== null}
          onOpenChange={(open) => !open && setDisconnectId(null)}
          connectorName={disconnectTarget.name}
          willLoseData
          onConfirm={() => {
            onDisconnect(disconnectTarget.id);
            setDisconnectId(null);
          }}
        />
      )}
    </div>
  );
}
