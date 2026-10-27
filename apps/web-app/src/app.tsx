/**
 * L3 — l'application : le routeur + la composition coquille ↔ sections.
 *
 * UNE SEULE SOURCE DE ROUTES (`lib/navigation.ts`) alimente à la fois la
 * navigation ET le routeur. C'est délibéré : si une entrée de navigation
 * pouvait pointer vers une route absente, on obtiendrait exactement le défaut
 * que le dépôt a déjà payé — un lien qui mène à une page vide. Le test
 * `shell-routes.test.ts` vérifie que les deux ensembles coïncident.
 */
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { AppShell } from './shell/AppShell';
import { NAV_SECTIONS } from './lib/navigation';
import { ShellState } from './routes/ShellState';

/** La coquille, alimentée par le routeur (la route courante + la navigation). */
function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <AppShell
      pathname={location.pathname}
      onNavigate={(path) => navigate(path)}
    >
      <Routes>
        {NAV_SECTIONS.map((section) => (
          <Route
            key={section.id}
            path={`${section.path}/*`}
            element={<ShellState section={section} />}
          />
        ))}
        {/* Un chemin inconnu ne doit pas rendre un écran blanc : il ramène à
            l'accueil, qui est la seule section toujours atteignable. */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </AppShell>
  );
}

export function WebApp() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
