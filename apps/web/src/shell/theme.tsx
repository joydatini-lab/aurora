import * as React from 'react';
import { applyAccent, applyBackdrop, applyPreset, type Backdrop } from '@/theme/apply';
import { downscaleImage, loadImage, paletteFromImage, type Palette } from '@/theme/extract';
import { DEFAULT_PRESET_ID, findPreset } from '@/theme/presets';
import type { GradientName } from '@/theme/gradients';

/**
 * Le provider de thème de l'application — un seul, étendu.
 *
 * Il porte désormais trois axes indépendants, parce qu'ils se combinent :
 *   1. le MODE (clair / sombre) ;
 *   2. le PRESET (palette complète, source tweakcn) ;
 *   3. l'ACCENT DYNAMIQUE (extrait de l'image de fond) et le FOND lui-même.
 *
 * Les trois écrivent des variables CSS sur `<html>` ; aucun composant n'a à
 * savoir lequel a parlé en dernier. C'est ce qui permet d'ajouter un thème
 * sans toucher une ligne d'interface.
 */

type Mode = 'light' | 'dark';

interface ThemeContextValue {
  mode: Mode;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;

  presetId: string;
  setPresetId: (id: string) => void;

  palette: Palette | null;
  /** Nom du fichier d'origine, pour l'afficher dans l'interface. */
  paletteSource: string | null;
  clearAccent: () => void;

  backdrop: Backdrop;
  setGradient: (name: GradientName | null) => void;
  setBackgroundFile: (file: File) => Promise<void>;
  clearBackdrop: () => void;

  /** Vrai quand l'image de fond n'a pas pu être conservée (quota du stockage). */
  backdropNotPersisted: boolean;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

const KEY_MODE = 'aurora.theme';
const KEY_PRESET = 'aurora.preset';
const KEY_PALETTE = 'aurora.palette';
const KEY_BACKDROP = 'aurora.backdrop';

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Quota dépassé (image trop lourde) ou stockage bloqué : la session reste
    // fonctionnelle, seule la persistance est perdue. On le signale à l'écran.
    return false;
  }
}

/**
 * Préférence enregistrée > préférence système > clair.
 *
 * Écrire la préférence système à la place de l'utilisateur est l'erreur
 * classique : un OS sombre écraserait un choix explicite « clair ».
 */
function initialMode(): Mode {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(KEY_MODE);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function initialBackdrop(): Backdrop {
  if (typeof window === 'undefined') return { type: 'none' };
  const stored = readJson<Backdrop>(KEY_BACKDROP);
  if (!stored || typeof stored !== 'object') return { type: 'none' };
  if (stored.type === 'gradient' && typeof stored.name === 'string') return stored;
  if (stored.type === 'image' && typeof stored.dataUrl === 'string') return stored;
  return { type: 'none' };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = React.useState<Mode>(initialMode);
  const [presetId, setPresetIdState] = React.useState<string>(
    () => (typeof window === 'undefined' ? DEFAULT_PRESET_ID : window.localStorage.getItem(KEY_PRESET) ?? DEFAULT_PRESET_ID),
  );
  const [palette, setPalette] = React.useState<Palette | null>(() =>
    typeof window === 'undefined' ? null : readJson<Palette>(KEY_PALETTE),
  );
  const [paletteSource, setPaletteSource] = React.useState<string | null>(null);
  const [backdrop, setBackdropState] = React.useState<Backdrop>(initialBackdrop);
  const [backdropNotPersisted, setBackdropNotPersisted] = React.useState(false);

  // Effet unique d'application : les trois axes sont réécrits ensemble à
  // chaque changement, ce qui évite les ordres d'écriture divergents.
  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', mode === 'dark');
    root.classList.toggle('light', mode === 'light');
    root.style.colorScheme = mode;

    applyPreset(presetId === DEFAULT_PRESET_ID ? null : (findPreset(presetId) ?? null), mode);
    applyAccent(palette);
    applyBackdrop(backdrop);

    try {
      window.localStorage.setItem(KEY_MODE, mode);
    } catch {
      /* non bloquant */
    }
    window.localStorage.setItem(KEY_PRESET, presetId);
  }, [mode, presetId, palette, backdrop]);

  const setMode = React.useCallback((next: Mode) => setModeState(next), []);
  const toggleMode = React.useCallback(
    () => setModeState((m) => (m === 'dark' ? 'light' : 'dark')),
    [],
  );
  const setPresetId = React.useCallback((id: string) => setPresetIdState(id), []);

  const clearAccent = React.useCallback(() => {
    setPalette(null);
    setPaletteSource(null);
    try {
      window.localStorage.removeItem(KEY_PALETTE);
    } catch {
      /* non bloquant */
    }
  }, []);

  const setGradient = React.useCallback((name: GradientName | null) => {
    setBackdropState(name ? { type: 'gradient', name } : { type: 'none' });
    setBackdropNotPersisted(false);
  }, []);

  const clearBackdrop = React.useCallback(() => {
    setBackdropState({ type: 'none' });
    setBackdropNotPersisted(false);
  }, []);

  const setBackgroundFile = React.useCallback(async (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await loadImage(objectUrl);
      // La palette est calculée sur l'image ORIGINALE (plus de détail), la
      // version persistée est réduite (quota).
      const extracted = paletteFromImage(image);
      const dataUrl = downscaleImage(image);

      setPalette(extracted);
      setPaletteSource(file.name);
      writeJson(KEY_PALETTE, extracted);

      const next: Backdrop = { type: 'image', dataUrl, source: file.name };
      setBackdropState(next);
      setBackdropNotPersisted(!writeJson(KEY_BACKDROP, next));
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }, []);

  // Les dégradés ne sont pas persistés comme image : ils n'ont pas de données.
  React.useEffect(() => {
    if (backdrop.type === 'gradient' || backdrop.type === 'none') {
      writeJson(KEY_BACKDROP, backdrop);
    }
  }, [backdrop]);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      mode,
      setMode,
      toggleMode,
      presetId,
      setPresetId,
      palette,
      paletteSource,
      clearAccent,
      backdrop,
      setGradient,
      setBackgroundFile,
      clearBackdrop,
      backdropNotPersisted,
    }),
    [
      mode,
      setMode,
      toggleMode,
      presetId,
      setPresetId,
      palette,
      paletteSource,
      clearAccent,
      backdrop,
      setGradient,
      setBackgroundFile,
      clearBackdrop,
      backdropNotPersisted,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit être utilisé sous <ThemeProvider>');
  return ctx;
}
