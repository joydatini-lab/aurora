import * as React from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'aurora.theme';

/**
 * Lit le thème initial : préférence enregistrée, sinon préférence système,
 * sinon clair.
 *
 * L'écriture d'une préférence système à la place de l'utilisateur est une
 * erreur fréquente : si l'OS est sombre et que la personne choisit « clair »,
 * ce choix doit survivre au rechargement.
 */
function initialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Stockage indisponible (mode privé strict, iframe sandboxée) : on
    // continue avec la préférence système. Un thème n'est pas un état critique.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(initialTheme);

  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
    // La barre d'état du navigateur suit le thème : sans ça, un PWA installé
    // garde une barre claire au-dessus d'une interface sombre.
    root.style.colorScheme = theme;
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* non bloquant */
    }
  }, [theme]);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: setThemeState,
      toggle: () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit être utilisé sous <ThemeProvider>');
  return ctx;
}
