/**
 * CountdownPageHeader — en-tête de la page Compte à rebours (cat. 4.4).
 *
 * Étape 2 (muet) : titre + filtre (tous / à venir / expirés) + bouton +
 * (créer un compte à rebours). Pas de store, pas d'API.
 */
import { cn } from "src/lib/utils";
import { PageHeader } from "src/components/composites/PageHeader";
import { Button } from "src/components/ui/button";

export type CountdownTab = "all" | "upcoming" | "expired";

export const COUNTDOWN_TABS: { key: CountdownTab; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "upcoming", label: "À venir" },
  { key: "expired", label: "Expirés" },
];

export interface CountdownPageHeaderProps {
  count?: number;
  activeTab: CountdownTab;
  onTabChange: (tab: CountdownTab) => void;
  onCreate: () => void;
  className?: string;
}

export function CountdownPageHeader({
  count,
  activeTab,
  onTabChange,
  onCreate,
  className,
}: CountdownPageHeaderProps) {
  const activeLabel = COUNTDOWN_TABS.find((t) => t.key === activeTab)?.label;
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <PageHeader
        icon="timer"
        title="Compte à rebours"
        description={
          count !== undefined
            ? `${count} compte à rebours${activeLabel && activeTab !== "all" ? ` · ${activeLabel}` : ""}`
            : undefined
        }
        primaryAction={{ label: "Créer", onClick: onCreate, icon: "calendar" }}
      />
      {/* Segmented tabs */}
      <div
        className="flex items-center gap-1 rounded-md border p-0.5"
        role="tablist"
        aria-label="Filtrer les comptes à rebours"
      >
        {COUNTDOWN_TABS.map((t) => (
          <Button
            key={t.key}
            variant={activeTab === t.key ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "h-7 flex-1 gap-0.5 text-xs",
              activeTab !== t.key && "text-muted-foreground"
            )}
            onClick={() => onTabChange(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

