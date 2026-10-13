/**
 * TaskInspector — panneau latéral d'inspection/édition d'une tâche (cat. 2.4).
 *
 * Étape 2 (muet) : reçoit `data` + `onChange` + `onClose` + `onDelete`.
 * Affiche les champs : titre, description, dates, priorité, projet,
 * assigné, sous-tâches, pièces jointes, notes.
 */
import { cn } from "src/lib/utils";
import { AppIcon } from "src/components/ui/AppIcon";
import { Button } from "src/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "src/components/ui/drawer";
import { Input } from "src/components/ui/input";
import { Textarea } from "src/components/ui/textarea";
import { Label } from "src/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";
import { Progress } from "src/components/ui/progress";
import { Separator } from "src/components/ui/separator";
import { Badge } from "src/components/ui/badge";
import {
  PriorityFlag,
  /* priorityToLevel, */
  type PriorityLevel,
} from "./PriorityFlag";
import type { TaskCardData } from "./TaskCard";

export interface TaskInspectorProps {
  data: TaskCardData;
  /** Open state (control). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Appelé quand un champ simple change. */
  onFieldChange?: (field: keyof TaskCardData, value: unknown) => void;
  /** Appelé quand la priorité change. */
  onPriorityChange?: (level: PriorityLevel) => void;
  /** Appelé pour supprimer (destruction confirmée par le parent). */
  onDelete?: () => void;
  /** Sous-tâches (édition via le parent). */
  subtasks?: { id: string; label: string; done: boolean }[];
  onSubtaskToggle?: (subtaskId: string, done: boolean) => void;
  /** Pièces jointes. */
  attachments?: { id: string; name: string; size?: string }[];
  onAttachmentRemove?: (id: string) => void;
  onAttachmentAdd?: () => void;
  className?: string;
}

function TaskInspector({
  data,
  open,
  onOpenChange,
  onFieldChange,
  onPriorityChange,
  onDelete,
  subtasks,
  onSubtaskToggle,
  attachments,
  onAttachmentRemove,
  onAttachmentAdd,
  className,
}: TaskInspectorProps) {
  void (0) // _level = priorityToLevel(data.priority);
  void (0) // _isDone = data.status === "termine";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className={cn("rounded-t-xl", className)}>
        <DrawerHeader>
          <div className="flex items-start justify-between gap-3">
            <DrawerTitle className="text-base">
              {data.title || "Sans titre"}
            </DrawerTitle>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onDelete}
                aria-label="Supprimer la tâche"
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <AppIcon name="error" size="xs" aria-hidden />
              </Button>
            )}
          </div>
        </DrawerHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
          {/* Statut + priorité */}
          <div className="flex items-center gap-3">
            <Select
              value={data.status ?? "a_faire"}
              onValueChange={(v) => onFieldChange?.("status", v as TaskCardData["status"])}
            >
              <SelectTrigger className="h-8 flex-1 text-sm">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a_faire">À faire</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="en_revue">En revue</SelectItem>
                <SelectItem value="termine">Terminé</SelectItem>
              </SelectContent>
            </Select>
            <PriorityFlag
              priority={data.priority}
              interactive={!!onPriorityChange}
              onChange={onPriorityChange}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Échéance</Label>
              <Input
                type="date"
                value={data.dueDate ?? ""}
                onChange={(e) => onFieldChange?.("dueDate", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            {data.tags && data.tags.length > 0 && (
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Étiquettes</Label>
                <div className="flex flex-wrap gap-1">
                  {data.tags.map((t, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{t}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              value={data.description ?? ""}
              onChange={(e) => onFieldChange?.("description", e.target.value)}
              placeholder="Description…"
              rows={3}
              className="text-sm"
            />
          </div>

          {/* Sous-tâches */}
          {subtasks && subtasks.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  Sous-tâches
                </Label>
                <Progress
                  value={
                    subtasks.filter((s) => s.done).length / subtasks.length * 100
                  }
                  className="h-1.5 flex-1 ml-3"
                />
              </div>
              {subtasks.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSubtaskToggle?.(s.id, !s.done)}
                  className={cn(
                    "flex items-center gap-2 text-sm",
                    s.done && "line-through text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "size-4 rounded border flex items-center justify-center",
                      s.done && "bg-primary border-primary text-primary-foreground"
                    )}
                  >
                    {s.done && <AppIcon name="success" size="xs" aria-hidden />}
                  </span>
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Pièces jointes */}
          {(attachments && attachments.length > 0) || onAttachmentAdd ? (
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">Pièces jointes</Label>
              {attachments?.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 rounded border bg-muted/30 px-2 py-1.5 text-sm"
                >
                  <AppIcon name="file" size="sm" tone="muted" aria-hidden />
                  <span className="flex-1 truncate">{a.name}</span>
                  {a.size && (
                    <span className="text-xs text-muted-foreground">{a.size}</span>
                  )}
                  {onAttachmentRemove && (
                    <button
                      type="button"
                      onClick={() => onAttachmentRemove(a.id)}
                      aria-label={`Supprimer ${a.name}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <AppIcon name="error" size="xs" aria-hidden />
                    </button>
                  )}
                </div>
              ))}
              {onAttachmentAdd && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAttachmentAdd}
                  className="h-7 w-full justify-start gap-1 text-xs"
                >
                  <AppIcon name="file" size="xs" aria-hidden />
                  Ajouter un fichier
                </Button>
              )}
            </div>
          ) : null}

          <Separator />

          {/* Action de suppression */}
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={onDelete}
            >
              <AppIcon name="error" size="xs" aria-hidden />
              Supprimer la tâche
            </Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export { TaskInspector };
