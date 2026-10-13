/**
 * HabitEditorSheet — éditeur d'habitude dans un Drawer (cat. 4.6).
 *
 * Étape 2 (muet) : reçoit `HabitItem` (optionnel si création) + callbacks.
 * Pas de store, pas d'API.
 *
 * Champs (cat. 4.6) :
 * - Titre (obligatoire)
 * - Icone (grille `IconKey`)
 * - Couleur (palette)
 * - Fréquence (daily / weekly / custom)
 * - Objectif (ex. "7/jour", "100/jour")
 * - Rappels (horaires)
 * - Notifications
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { AppIcon, type IconKey } from "src/components/ui/AppIcon";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "src/components/ui/drawer";
import { Switch } from "src/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";
import {
  HabitItem,
  HabitFrequency,
} from "src/components/composites/HabitsView";

const AVAILABLE_ICONS: IconKey[] = [
  "task", "calendar", "timer", "habit", "success", "chart", "code", "tool",
];

const COLOR_PALETTE = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f59e0b", "#10b981", "#3b82f6", "#6b7280",
];

export interface HabitEditorValues {
  title: string;
  icon?: IconKey;
  color?: string;
  frequency: HabitFrequency;
  target?: string;
  reminders: string[];
  notificationsEnabled: boolean;
}

export interface HabitEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Habitude à éditer (null si création). */
  habit?: HabitItem | null;
  /** Valeurs initiales (si création ou pré-remplissage). */
  defaultValue?: Partial<HabitEditorValues>;
  /** Appelé à la validation. */
  onSubmit: (values: HabitEditorValues) => void;
  /** Appelé pour supprimer l'habitude (si édition). */
  onDelete?: (habitId: string) => void;
  /** Titre du drawer. */
  title?: string;
  className?: string;
}

export function HabitEditorSheet({
  open,
  onOpenChange,
  habit,
  defaultValue,
  onSubmit,
  onDelete,
  title,
  className,
}: HabitEditorSheetProps) {
  const isEdit = !!habit;

  const [form, setForm] = React.useState<HabitEditorValues>(() => ({
    title: habit?.title ?? defaultValue?.title ?? "",
    icon: habit?.icon ?? defaultValue?.icon,
    color: habit?.color ?? defaultValue?.color,
    frequency: habit?.frequency ?? defaultValue?.frequency ?? "daily",
    target: habit?.targetLabel ?? defaultValue?.target ?? "",
    reminders: defaultValue?.reminders ?? [],
    notificationsEnabled: defaultValue?.notificationsEnabled ?? true,
  }));

  const set = <K extends keyof HabitEditorValues>(
    key: K,
    value: HabitEditorValues[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    onSubmit(form);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className={cn("rounded-t-xl", className)}>
        <DrawerHeader>
          <DrawerTitle>{title ?? (isEdit ? "Modifier l'habitude" : "Nouvelle habitude")}</DrawerTitle>
          <DrawerDescription>
            {isEdit ? "Mettre à jour les paramètres de l'habitude." : "Créer une nouvelle habitude quotidienne."}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-4 px-4 pb-4">
          {/* Titre */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Titre *
            </label>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Méditer 10 min"
            />
          </div>

          {/* Icon */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Icone
            </label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  aria-label={icon}
                  aria-pressed={form.icon === icon}
                  onClick={() => set("icon", icon)}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-md border transition-colors",
                    form.icon === icon
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  <AppIcon name={icon} size="sm" aria-hidden />
                </button>
              ))}
            </div>
          </div>

          {/* Couleur */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Couleur
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Couleur ${c}`}
                  aria-pressed={form.color === c}
                  onClick={() => set("color", c)}
                  className={cn(
                    "size-7 rounded-full border-2 transition-transform",
                    form.color === c
                      ? "scale-110 border-foreground"
                      : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Fréquence */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Fréquence
            </label>
            <Select
              value={form.frequency}
              onValueChange={(v) => set("frequency", v as HabitFrequency)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Quotidienne</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                <SelectItem value="custom">Personnalisée</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Objectif */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Objectif
            </label>
            <Input
              value={form.target}
              onChange={(e) => set("target", e.target.value)}
              placeholder="7/jour, 100/jour…"
            />
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Notifications</p>
              <p className="text-xs text-muted-foreground">
                Rappels aux horaires définis
              </p>
            </div>
            <Switch
              checked={form.notificationsEnabled}
              onCheckedChange={(v) => set("notificationsEnabled", v)}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button onClick={handleSubmit} disabled={!form.title.trim()}>
              {isEdit ? "Enregistrer" : "Créer l'habitude"}
            </Button>
            {isEdit && habit && onDelete && (
              <Button
                variant="destructive"
                onClick={() => {
                  onDelete(habit.id);
                  onOpenChange(false);
                }}
              >
                Supprimer l'habitude
              </Button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
