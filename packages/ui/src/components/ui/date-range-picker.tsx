// date-range-picker.tsx — sélecteur de plage de dates (Untitled UI v8
// `date-range-picker`, option B : ré-adaptation React-Aria → Radix +
// react-day-picker v10)
//
// L'original (packages/ui/src/components/application/date-picker/
// date-range-picker.tsx) s'appuie sur `react-aria-components`
// (`AriaDateRangePicker`, `AriaPopover`, `AriaDialog`) +
// `@internationalized/date` + `@untitledui/icons` (chevrons) — la
// batterie DS d'Aurora est 100 % Radix/shadcn, jamais React-Aria
// (`components.json` `iconLibrary: lucide`, 05 §4.5.2 Phase 2 desktop).
//
// Le port fait ici, dans le même ordre que `desktop-sidebar.tsx` /
// `desktop-command-menu.tsx` (même pattern : les primitives React-Aria
// remplacées par leurs équivalents Radix, les icônes `@untitledui/icons`
// par `lucide-react` de la batterie) :
//   - `AriaDateRangePicker` (le provider de contexte du range) → le
//     composant gère lui-même sa valeur contrôlée (`useState` /
//     `useControlledState`-style maison, sans `@react-stately/utils`) ;
//   - `AriaPopover` + `AriaDialog` → `Popover` (Radix `@radix-ui/react-popover`,
//     déjà dans `packages/ui/src/components/ui/popover.tsx`), pas de `Dialog`
//     (le `Popover.Content` suffit — c'est exactement ce que font les
//     composants shadcn `popover` + `calendar` de la batterie : voir
//     `packages/ui/src/components/ui/calendar.tsx` qui s'utilise déjà dans
//     un `Popover.Content`) ;
//   - `AriaGroup` (le wrapper de trigger) → une `Button` (batterie DS,
//     `button.tsx`) simple, pas besoin du group ;
//   - le `RangeCalendar` interne (les 2 grilles mois + presets) → le
//     `DayPicker` existant de la batterie (`calendar.tsx`) en `mode="range"`,
//     déjà câblé pour `react-day-picker` v10 ;
//   - les presets (`today`/`thisWeek`/`lastMonth`/…) → calculés en
//     `Date` maison (pas `@internationalized/date`, qui n'est qu'une
//     dépendance transitive de la ré-adaptation et ne fait pas partie de
//     l'API publique finale du composant) ;
//   - `@untitledui/icons` (chevrons) → `lucide-react` (`ChevronLeft`/
//     `ChevronRight`), déjà le moteur d'icônes de la batterie.
//
// L'API publique (`value`/`onChange`/`onApply`/`onCancel`) et les presets
// restent identiques au comportement React-Aria original, de sorte que
// le consommateur (le lot de composites desktop `ReviewView`/`ProgressView`/
// `RetroView`) ne change que d'import (`@/components/ui/date-range-picker`),
// pas de props.

import * as React from "react";

import { cn } from "src/lib/utils";
import { Button, type ButtonProps } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Calendar as CalendarIcon } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface DateRangePickerValue {
  from?: Date;
  to?: Date;
}

export interface DateRangePreset {
  label: string;
  value: DateRangePickerValue;
}

export interface DateRangePickerProps {
  /** Valeur contrôlée (`undefined` = non contrôlé). */
  value?: DateRangePickerValue;
  /** Valeur initiale (mode non contrôlé). */
  defaultValue?: DateRangePickerValue;
  /** Callback quand la plage change (avant "Apply", voir `onApply`). */
  onChange?: (range: DateRangePickerValue) => void;
  /** Callback quand le bouton "Apply" est cliqué (la valeur est déjà
      appliquée dans le state interne / le `value` contrôlé). */
  onApply?: (range: DateRangePickerValue) => void;
  /** Callback quand le bouton "Cancel" est cliqué (retour à la valeur
      précédente, sans application). */
  onCancel?: () => void;
  /** Taille du trigger (batterie DS, `Button.size` : `default`/`sm`/`lg`/…). */
  size?: ButtonProps["size"];
  /** Présets affichés dans la colonne latérale (desktop) / sous le
      calendrier (mobile). Par défaut : Auj. / Hier / 7j / 30j / Tout. */
  presets?: DateRangePreset[];
  /** Affiche la colonne de presets sur desktop. */
  showPresets?: boolean;
  /** Libellé accessible du trigger. */
  "aria-label"?: string;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Helpers — presets basiques (aucune dépendance `@internationalized`)  */
/* ------------------------------------------------------------------ */

const startOfDay = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const shiftDays = (d: Date, days: number) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const startOfWeek = (d: Date) => {
  // Semaine ISO : lundi.
  const copy = startOfDay(d);
  const day = copy.getDay(); // 0 (dim) … 6 (sam)
  const diffToMonday = (day + 6) % 7;
  return shiftDays(copy, -diffToMonday);
};

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);
const endOfYear = (d: Date) => new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);

const defaultPresets: DateRangePreset[] = (() => {
  const now = new Date();
  return [
    { label: "Aujourd'hui", value: { from: startOfDay(now), to: startOfDay(now) } },
    { label: "Hier", value: { from: shiftDays(startOfDay(now), -1), to: shiftDays(startOfDay(now), -1) } },
    { label: "7 derniers jours", value: { from: shiftDays(startOfDay(now), -7), to: startOfDay(now) } },
    { label: "30 derniers jours", value: { from: shiftDays(startOfDay(now), -30), to: startOfDay(now) } },
    {
      label: "Semaine en cours",
      value: { from: startOfWeek(now), to: startOfDay(now) },
    },
    {
      label: "Mois en cours",
      value: { from: startOfMonth(now), to: endOfMonth(now) },
    },
    {
      label: "Année en cours",
      value: { from: startOfYear(now), to: endOfYear(now) },
    },
  ];
})();

const rangeKey = (range: DateRangePickerValue | undefined) =>
  range?.from?.toISOString() + "|" + (range?.to?.toISOString() ?? "");

const formatShort = (d: Date | undefined, locale = "fr-FR") =>
  d
    ? d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })
    : "Choisir une date";

/* ------------------------------------------------------------------ */
/* Composant                                                            */
/* ------------------------------------------------------------------ */

export function DateRangePicker({
  value,
  defaultValue,
  onChange,
  onApply,
  onCancel,
  size = "default",
  presets = defaultPresets,
  showPresets = true,
  "aria-label": ariaLabel,
  className,
}: DateRangePickerProps) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState<DateRangePickerValue>(
    defaultValue ?? { from: undefined, to: undefined },
  );
  const current = isControlled ? value : internal;

  const [open, setOpen] = React.useState(false);
  // La valeur "brouillon" affichée dans le calendrier tant que l'utilisateur
  // n'a pas cliqué sur Apply/Cancel (idempotent si non contrôlé : on
  // synchronise immédiatement ; si contrôlé : on fige jusqu'à Apply).
  const [draft, setDraft] = React.useState<DateRangePickerValue>(current ?? { from: undefined, to: undefined });

  const commit = React.useCallback(
    (next: DateRangePickerValue) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  const handleSelect = (range: { from?: Date; to?: Date } | undefined) => {
    const next = range ? { from: range.from, to: range.to } : { from: undefined, to: undefined };
    setDraft(next);
    if (!isControlled) commit(next);
  };

  const handleApply = () => {
    commit(draft);
    onApply?.(draft);
    setOpen(false);
  };

  const handleCancel = () => {
    setDraft(current ?? { from: undefined, to: undefined });
    onCancel?.();
    setOpen(false);
  };

  const activePresetKey = rangeKey(current);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className={cn("justify-start font-normal", className)}
          aria-label={ariaLabel ?? "Période de dates"}
        >
          <CalendarIcon className="size-4" aria-hidden />
          {current?.from && current?.to
            ? `${formatShort(current.from)} – ${formatShort(current.to)}`
            : "Choisir une période"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          {showPresets && (
            <div className="hidden w-40 flex-col gap-0.5 border-r border-secondary p-3 lg:flex">
              {presets.map((preset) => {
                const isActive = rangeKey(preset.value) === activePresetKey;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      handleSelect(preset.value);
                      commit(preset.value);
                      setDraft(preset.value);
                    }}
                    className={cn(
                      "rounded-md px-3 py-2 text-left text-sm font-medium transition duration-100 ease-linear",
                      isActive
                        ? "bg-secondary text-secondary_hover hover:bg-secondary_hover"
                        : "text-secondary hover:bg-primary_hover hover:text-secondary_hover",
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex flex-col gap-3">
            <Calendar
              mode="range"
              selected={
                draft?.from && draft?.to
                  ? { from: draft.from, to: draft.to }
                  : draft?.from
                    ? { from: draft.from, to: undefined }
                    : undefined
              }
              onSelect={handleSelect}
            />
            <div className="flex items-center justify-between border-t border-secondary p-3">
              <Button variant="secondary" size="sm" onClick={handleCancel}>
                Annuler
              </Button>
              <Button variant="default" size="sm" onClick={handleApply}>
                Appliquer
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default DateRangePicker;
