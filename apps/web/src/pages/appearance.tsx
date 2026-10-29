import * as React from 'react';
import { Check, Image as ImageIcon, Moon, RotateCcw, Sun, TriangleAlert, Upload, X } from 'lucide-react';
import { Badge, Button, Card } from '@/components/ui';
import { PageHeader, Section, Rule } from '@/components/design/page';
import { useTheme } from '@/shell/theme';
import { THEME_PRESETS, DEFAULT_PRESET_ID, findPreset, type ThemePreset } from '@/theme/presets';
import { GRADIENT_NAMES } from '@/theme/gradients';
import { contrastRatio, parseColor, toOklchString } from '@/theme/color';
import { cn } from '@/lib/cn';

/**
 * Apparence — l'écran de personnalisation.
 *
 * Il est écrit pour un public NON technique : chaque choix montre son résultat
 * avant d'être appliqué, aucun ne demande de connaître un nom de variable.
 * Pour autant, tout ce qui s'affiche est réellement branché — pas de maquette.
 */

const DEFAULT_PRESET_LABEL = 'Encre & Lumière';

export function AppearancePage() {
  const theme = useTheme();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const activePreset = findPreset(theme.presetId);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      await theme.setBackgroundFile(file);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Image illisible.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        overline="Personnalisation"
        title="Apparence"
        description="Le design system fournit le squelette ; l'apparence appartient à chaque équipe. Un thème change les couleurs — jamais la structure, l'espacement ou la typographie."
      >
        <Badge variant="outline">{THEME_PRESETS.length + 1} thèmes</Badge>
        <Badge variant="outline">{GRADIENT_NAMES.length} dégradés</Badge>
        <Badge variant="success">Fondu 0,8 s</Badge>
      </PageHeader>

      {/* ------------------------------------------------------------------ */}
      <Section title="Mode" note="Le choix explicite est conservé et l'emporte sur la préférence du système.">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={theme.mode === 'light' ? 'default' : 'outline'}
            onClick={() => theme.setMode('light')}
            aria-pressed={theme.mode === 'light'}
          >
            <Sun /> Clair
          </Button>
          <Button
            variant={theme.mode === 'dark' ? 'default' : 'outline'}
            onClick={() => theme.setMode('dark')}
            aria-pressed={theme.mode === 'dark'}
          >
            <Moon /> Sombre
          </Button>
        </div>
      </Section>

      {/* ------------------------------------------------------------------ */}
      <Section
        title="Thèmes"
        note="Dix presets tweakcn — recopiés tels quels, sans retouche — plus le thème maison. Chaque vignette est peinte avec SA palette : ce que vous voyez est ce que vous obtenez."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <PresetCard
            name={DEFAULT_PRESET_LABEL}
            family="maison"
            active={theme.presetId === DEFAULT_PRESET_ID}
            onSelect={() => theme.setPresetId(DEFAULT_PRESET_ID)}
            preview={<HomePreview mode={theme.mode} />}
            contrast={homeContrast(theme.mode)}
          />

          {THEME_PRESETS.map((preset) => (
            <PresetCard
              key={preset.id}
              name={preset.name}
              family={preset.family}
              active={theme.presetId === preset.id}
              onSelect={() => theme.setPresetId(preset.id)}
              preview={<PresetPreview preset={preset} mode={theme.mode} />}
              contrast={presetContrast(preset, theme.mode)}
            />
          ))}
        </div>

        <p className="mt-3 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          Le badge mesure le contraste <span className="font-mono">--primary</span> /{' '}
          <span className="font-mono">--primary-foreground</span>. Plusieurs presets tweakcn
          descendent sous 4,5:1 (jusqu'à 2,3:1) : leurs couleurs sont conservées telles quelles,
          mais l'information est affichée plutôt que masquée.
        </p>

        {activePreset ? (
          <p className="mt-2 text-xs text-muted-foreground">
            « {activePreset.name} » : rayon {activePreset.radius}, source tweakcn via le paquet
            <code className="ml-1 font-mono">uno-tweakcn</code>.
          </p>
        ) : null}
      </Section>

      {/* ------------------------------------------------------------------ */}
      <Section
        title="Dégradés de fond"
        note="Douze dégradés webgradients, copiés sans modification. Ils servent de fond d'application ; les cartes passent alors en verre teinté."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => theme.setGradient(null)}
            aria-pressed={theme.backdrop.type === 'none'}
            className={cn(
              'group relative h-24 overflow-hidden rounded-lg border bg-card text-left',
              'transition-[border-color,box-shadow] duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
              theme.backdrop.type === 'none' ? 'border-ring ring-2 ring-ring/30' : 'border-border hover:border-ring/40',
            )}
          >
            <span className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">
              Aucun fond
            </span>
          </button>

          {GRADIENT_NAMES.map((name) => {
            const active = theme.backdrop.type === 'gradient' && theme.backdrop.name === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => theme.setGradient(name)}
                aria-pressed={active}
                className={cn(
                  `bg-webgradient-${name}`,
                  'group relative h-24 overflow-hidden rounded-lg border text-left',
                  'transition-[border-color,box-shadow] duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
                  active ? 'border-ring ring-2 ring-ring/40' : 'border-border/60 hover:border-ring/40',
                )}
              >
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/35 px-2 py-1 backdrop-blur-sm">
                  <span className="truncate font-mono text-[10px] text-white/90">{name}</span>
                  {active ? <Check className="size-3 text-white" strokeWidth={3} /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ------------------------------------------------------------------ */}
      <Section
        title="Accent dynamique"
        note="Déposez une image : trois teintes en sont extraites (dominante, seconde teinte, ombre) et deviennent --primary, --ring, --accent et --tint. La couleur du texte des boutons est calculée pour tenir 4,5:1."
      >
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
              <Upload /> {busy ? 'Analyse…' : 'Choisir une image'}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => void onFile(event.target.files?.[0])}
            />

            {theme.palette ? (
              <Button variant="ghost" onClick={theme.clearAccent}>
                <RotateCcw /> Retirer l'accent
              </Button>
            ) : null}

            {theme.backdrop.type === 'image' ? (
              <Button variant="ghost" onClick={theme.clearBackdrop}>
                <X /> Retirer le fond
              </Button>
            ) : null}
          </div>

          {error ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-destructive" role="alert">
              <TriangleAlert className="size-4" /> {error}
            </p>
          ) : null}

          {theme.backdrop.type === 'image' ? (
            <div className="mt-4 flex flex-wrap items-start gap-4">
              <img
                src={theme.backdrop.dataUrl}
                alt={`Image de fond sélectionnée${theme.paletteSource ? ` : ${theme.paletteSource}` : ''}`}
                className="h-24 w-40 rounded-md border border-border object-cover"
              />
              {theme.palette ? (
                <dl className="grid grid-cols-3 gap-3 text-xs">
                  <Swatch label="--primary" color={toOklchString(theme.palette.accent)} />
                  <Swatch label="--accent" color={toOklchString(theme.palette.secondary)} />
                  <Swatch label="--tint" color={toOklchString(theme.palette.tint)} />
                </dl>
              ) : null}
            </div>
          ) : null}

          {theme.palette ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-muted-foreground">
                Texte sur l'accent :{' '}
                <span className="font-mono text-foreground">{theme.palette.onAccent}</span> — ratio{' '}
                <span className="font-mono tabular-nums text-foreground">
                  {theme.palette.accentContrast.toFixed(2)}:1
                </span>{' '}
                {theme.palette.accentContrast >= 4.5 ? (
                  <Badge variant="success">AA</Badge>
                ) : (
                  <Badge variant="warning">sous 4,5:1 — aucun des deux extrêmes ne passe</Badge>
                )}
              </p>
              {theme.backdropNotPersisted ? (
                <p className="flex items-center gap-2 text-xs text-warning">
                  <TriangleAlert className="size-3.5" />
                  Image trop lourde pour le stockage local : le fond ne survivra pas au
                  rechargement. La palette, elle, est conservée.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <ImageIcon className="size-3.5" /> Aucune image : l'accent reste celui du thème.
            </p>
          )}
        </Card>

        <div className="mt-3">
          <Rule>
            L'extraction tourne sur un canvas <span className="font-mono">48×48</span> : 2 304
            pixels suffisent à la distribution, et l'opération reste instantanée même sur une photo
            de téléphone. Aucune bibliothèque n'est chargée pour cela.
          </Rule>
        </div>
      </Section>

      {/* ------------------------------------------------------------------ */}
      <Section title="Réinitialiser" note="Ramène l'apparence par défaut sans toucher au mode clair/sombre.">
        <Button
          variant="outline"
          onClick={() => {
            theme.setPresetId(DEFAULT_PRESET_ID);
            theme.clearAccent();
            theme.clearBackdrop();
          }}
        >
          <RotateCcw /> Apparence par défaut
        </Button>
      </Section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Vignettes                                                                   */
/* -------------------------------------------------------------------------- */

function PresetCard({
  name,
  family,
  active,
  onSelect,
  preview,
  contrast,
}: {
  name: string;
  family: string;
  active: boolean;
  onSelect: () => void;
  preview: React.ReactNode;
  /** Ratio mesuré entre --primary et --primary-foreground, pour ce mode. */
  contrast: number;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        'overflow-hidden rounded-lg border text-left transition-[border-color,box-shadow] duration-150',
        'focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
        active ? 'border-ring ring-2 ring-ring/30' : 'border-border hover:border-ring/40',
      )}
    >
      <span className="block h-20 w-full">{preview}</span>
      <span className="flex items-center justify-between gap-2 border-t border-border bg-card px-3 py-2">
        <span className="truncate text-xs font-medium">{name}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{family}</span>
          <span
            title={`Contraste texte/fond du bouton : ${contrast.toFixed(2)}:1`}
            className={cn(
              'rounded px-1 py-0.5 font-mono text-[10px] tabular-nums',
              contrast >= 4.5 ? 'bg-success/12 text-success' : 'bg-warning/15 text-warning-foreground',
            )}
          >
            {contrast >= 4.5 ? 'AA' : `${contrast.toFixed(1)}:1`}
          </span>
        </span>
      </span>
    </button>
  );
}

/** Vignette peinte avec les tokens RÉELS du preset, pas avec une image. */
function PresetPreview({ preset, mode }: { preset: ThemePreset; mode: 'light' | 'dark' }) {
  const c = preset[mode];
  return (
    <span
      className="flex h-full w-full items-center gap-1.5 px-3"
      style={{ backgroundColor: c.background }}
    >
      <span
        className="grid size-6 shrink-0 place-items-center text-[10px] font-semibold"
        style={{
          backgroundColor: c.primary,
          color: c['primary-foreground'],
          borderRadius: '50%',
        }}
      >
        A
      </span>
      <span className="flex flex-1 flex-col gap-1">
        <span
          className="block h-1.5 w-full rounded-full"
          style={{ backgroundColor: c.foreground, opacity: 0.85 }}
        />
        <span
          className="block h-1.5 w-2/3 rounded-full"
          style={{ backgroundColor: c.muted }}
        />
      </span>
      <span
        className="size-4 shrink-0 rounded"
        style={{ backgroundColor: c.accent, border: `1px solid ${c.border}` }}
      />
    </span>
  );
}

/** Le thème maison n'est pas une donnée : on le peint avec les tokens courants. */
function HomePreview({ mode }: { mode: 'light' | 'dark' }) {
  const t = mode === 'dark' ? DARK_PREVIEW : LIGHT_PREVIEW;
  return (
    <span className="flex h-full w-full items-center gap-1.5 px-3" style={{ backgroundColor: t.background }}>
      <span
        className="grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold"
        style={{ backgroundColor: t.primary, color: t.primaryForeground }}
      >
        A
      </span>
      <span className="flex flex-1 flex-col gap-1">
        <span className="block h-1.5 w-full rounded-full" style={{ backgroundColor: t.foreground, opacity: 0.85 }} />
        <span className="block h-1.5 w-2/3 rounded-full" style={{ backgroundColor: t.muted }} />
      </span>
      <span className="size-4 shrink-0 rounded" style={{ backgroundColor: t.accent, border: `1px solid ${t.border}` }} />
    </span>
  );
}

// Miroir exact des tokens de globals.css — uniquement pour peindre la vignette.
const LIGHT_PREVIEW = {
  background: 'oklch(0.985 0.003 95)',
  foreground: 'oklch(0.2 0.015 265)',
  primary: 'oklch(0.48 0.2 295)',
  primaryForeground: 'oklch(0.99 0 0)',
  muted: 'oklch(0.955 0.005 95)',
  accent: 'oklch(0.94 0.022 295)',
  border: 'oklch(0.9 0.006 95)',
};

const DARK_PREVIEW = {
  background: 'oklch(0.17 0.012 265)',
  foreground: 'oklch(0.96 0.004 95)',
  primary: 'oklch(0.7 0.17 295)',
  primaryForeground: 'oklch(0.17 0.03 295)',
  muted: 'oklch(0.265 0.014 265)',
  accent: 'oklch(0.3 0.05 295)',
  border: 'oklch(0.3 0.014 265)',
};

function presetContrast(preset: ThemePreset, mode: 'light' | 'dark'): number {
  const c = preset[mode];
  return contrastRatio(parseColor(c.primary), parseColor(c['primary-foreground']));
}

function homeContrast(mode: 'light' | 'dark'): number {
  const t = mode === 'dark' ? DARK_PREVIEW : LIGHT_PREVIEW;
  return contrastRatio(parseColor(t.primary), parseColor(t.primaryForeground));
}

function Swatch({ label, color }: { label: string; color: string }) {
  return (
    <div>
      <dt className="mb-1 font-mono text-[10px] text-muted-foreground">{label}</dt>
      <dd
        className="h-10 w-16 rounded-md border border-border"
        style={{ backgroundColor: color }}
        aria-hidden
      />
    </div>
  );
}
