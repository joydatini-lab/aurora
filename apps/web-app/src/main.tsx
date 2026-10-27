/**
 * L3 — point d'entrée de la coquille web (`apps/web-app`).
 *
 * OQ-10 (ratifiée) : `apps/web-app` est LA surface web ; Electron l'enveloppe
 * (`apps/desktop`), ce n'est pas un 3ᵉ front. `apps/mobile` (Ionic) reste
 * inchangée et garde son propre point d'entrée.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuroraThemeProvider } from '@aurora/ui';
import { WebApp } from './app';
import './styles/tw.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root introuvable dans index.html');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    {/* AD-17 : le provider injecte les tokens du thème actif. Le shell ne
        code jamais une couleur — il consomme `var(--aurora-*)` via Tailwind. */}
    <AuroraThemeProvider>
      <WebApp />
    </AuroraThemeProvider>
  </React.StrictMode>,
);
