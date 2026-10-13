/**
 * SoundPickerSheet — catalogue de sons internes (cat. 2.1, 1.4).
 *
 * Étape 2 (muet) : reçoit la liste des sons + `onApply` / `onClose`.
 * Pas d'appel API ici : le parent gère le chargement et la prélecture.
 *
 * Règles UX (cat. 2.1) :
 * - Un seul son principal actif à la fois
 * - Préécoute stoppée à la fermeture si non appliquée
 * - Catégories, recherche, favori, durée/boucle, bouton Appliquer
 */
import * as React from "react";
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
import { Badge } from "src/components/ui/badge";

export interface SoundItem {
  id: string;
  name: string;
  category: string;
  /** Durée en secondes. */
  duration?: number;
  /** Indique un son en boucle. */
  loops?: boolean;
  /** Marqué favori par l'utilisateur. */
  favorite?: boolean;
  /** URL du média (prélecture). */
  url?: string;
}

export interface SoundPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sons disponibles (chargeés par le parent). */
  sounds: SoundItem[];
  /** Son actuellement actif. */
  activeSoundId?: string;
  /** Appelé quand l'utilisateur sélectionne et applique un son. */
  onApply: (soundId: string) => void;
  /** Appelé quand un son est préécouté (le parent gère la lecture). */
  onPreview?: (sound: SoundItem) => void;
  /** Appelé pour ajouter/retrier un favori. */
  onToggleFavorite?: (soundId: string) => void;
  /** Catégories dérivées (si non fourni, dérivé de `sounds`). */
  categories?: string[];
  className?: string;
}

function SoundPickerSheet({
  open,
  onOpenChange,
  sounds,
  activeSoundId,
  onApply,
  onPreview,
  onToggleFavorite,
  categories,
  className,
}: SoundPickerSheetProps) {
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<string | null>(null);

  const cats =
    categories ??
    Array.from(new Set(sounds.map((s) => s.category))).sort();

  const filtered = sounds.filter((s) => {
    if (category && s.category !== category) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className={cn("rounded-t-xl", className)}>
        <DrawerHeader>
          <DrawerTitle>Choisir un son</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-3 px-4 pb-4">
          {/* Recherche */}
          <div className="relative">
            <AppIcon
              name="open"
              size="xs"
              tone="muted"
              className="absolute left-2.5 top-1/2 -translate-y-1/2"
              aria-hidden
            />
            <Input
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-7 text-sm"
            />
          </div>

          {/* Catégories */}
          {cats.length > 1 && (
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setCategory(null)}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs transition-colors",
                  !category
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                Tous
              </button>
              {cats.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs transition-colors",
                    category === c
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Liste des sons */}
          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Aucun son trouvé
              </p>
            )}
            {filtered.map((s) => {
              const isActive = s.id === activeSoundId;
              return (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2 transition-colors",
                    isActive
                      ? "border-primary bg-primary/5"
                      : "bg-card hover:bg-muted/30"
                  )}
                >
                  <AppIcon name="audio" size="sm" tone="muted" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{s.name}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {s.category}
                      {s.duration !== undefined && ` · ${s.duration}s`}
                      {s.loops && (
                        <Badge variant="outline" className="text-[10px]">
                          boucle
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Favori */}
                  {onToggleFavorite && (
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(s.id)}
                      aria-label={s.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                      className={cn(
                        "shrink-0 transition-colors",
                        s.favorite ? "text-amber-500" : "text-muted-foreground/40 hover:text-foreground"
                      )}
                    >
                      <AppIcon name="insight" size="sm" aria-hidden />
                    </button>
                  )}

                  {/* Préécouter */}
                  {onPreview && s.url && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="size-7"
                      onClick={() => onPreview(s)}
                      aria-label={`Préécouter ${s.name}`}
                    >
                      <AppIcon name="audio" size="xs" aria-hidden />
                    </Button>
                  )}

                  {/* Appliquer */}
                  <Button
                    variant={isActive ? "secondary" : "default"}
                    size="sm"
                    className="h-7 px-2 text-xs shrink-0"
                    onClick={() => onApply(s.id)}
                    disabled={isActive}
                  >
                    {isActive ? "Actif" : "Appliquer"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export { SoundPickerSheet };
