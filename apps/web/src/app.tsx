import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@/shell/theme';
import { Shell } from '@/shell/Shell';
import { OverviewPage } from '@/pages/overview';
import { ColorsPage } from '@/pages/colors';
import { TypographyPage } from '@/pages/typography';
import { SpacingPage } from '@/pages/spacing';
import { MotionPage } from '@/pages/motion';
import { ComponentsPage } from '@/pages/components';
import { AppearancePage } from '@/pages/appearance';
import { NotFoundPage } from '@/pages/not-found';

/**
 * Routes du design space.
 *
 * Pas de route racine « produit » : tant que les écrans métier ne sont pas
 * reconstruits, `/` est la vue d'ensemble du système. Inventer un faux tableau
 * de bord pour « faire vivant » recréerait exactement ce qu'on vient de purger.
 */
export const routes = createBrowserRouter(
  [
    {
      path: '/',
      element: <Shell />,
      children: [
        { index: true, element: <OverviewPage /> },
        { path: 'couleurs', element: <ColorsPage /> },
        { path: 'typographie', element: <TypographyPage /> },
        { path: 'espacement', element: <SpacingPage /> },
        { path: 'mouvement', element: <MotionPage /> },
        { path: 'composants', element: <ComponentsPage /> },
        { path: 'apparence', element: <AppearancePage /> },
        // Anciens chemins `/design/*` : conservés en redirection pour que les
        // liens déjà partagés ne tombent pas en 404.
        { path: 'design', element: <Navigate to="/" replace /> },
        { path: 'design/:section', element: <DesignRedirect /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  {
    // Drapeau v7 activé dès maintenant : il supprime l'avertissement de
    // migration et évite un changement de comportement brutal le jour du
    // passage à React Router 7. (`v7_startTransition` se règle sur le
    // provider, pas sur le routeur : ce sont deux contrats distincts.)
    future: { v7_relativeSplatPath: true },
  },
);

/** Redirection de compatibilité pour les anciennes URL de documentation. */
function DesignRedirect() {
  return <Navigate to="/composants" replace />;
}

export function App() {
  return (
    <ThemeProvider>
      {/* Le marqueur `data-aurora-app` est ce que le chien de garde cherche :
          il atteste qu'un arbre applicatif est monté, pas seulement que React
          a été chargé. */}
      <div data-aurora-app>
        <RouterProvider router={routes} future={{ v7_startTransition: true }} />
      </div>
    </ThemeProvider>
  );
}
