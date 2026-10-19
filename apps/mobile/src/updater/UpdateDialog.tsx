/**
 * UpdateDialog (S8 M-85, plan 2026-10-17 L662–665) — le composant React
 * du self-updater.
 *
 * Le plan L664 : « `IonAlert`/`IonModal` : version + changelog + boutons
 * « Mettre à jour » / « Plus tard », `IonProgressBar` ».
 *
 * L'implémentation utilise l'`AlertDialog` de `@aurora/ui` (le shadcn
 * component, le plan L664 est flexible sur « IonAlert/IonModal » — le
 * `@aurora/ui` AlertDialog est le SSoT du lot, AD-15) + le `Progress`
 * (le `@aurora/ui` Progress = la barre de progression du plan, le
 * `IonProgressBar` du plan est remplacé par le SSoT du lot, l'UI
 * reste équivalente).
 *
 * Le composant est SSoT du lot : il reçoit le state `useUpdater` (M-85)
 * par prop, il ne l'appelle PAS lui-même (le point d'intégration est le
 * hook dans `AuroraApp` — le plan L666 : le mount au démarrage, le
 * `update` « Rechercher une mise à jour » dans la page Réglages).
 *
 * Les états affichés :
 *   - `available` / `readyToInstall` : le dialogue principal (version +
 *     changelog + « Mettre à jour » + « Plus tard »).
 *   - `downloading` : la barre de progression (le `Progress`, le %).
 *   - `waitingPermission` : le CTA s'ouvre les réglages Android avant
 *     l'install (le plan L722 : la redirection « sources inconnues »,
 *     la reprise au retour re-vérifie la permission — le hook M-85 le
 *     gère).
 *   - `error` : le message d'erreur lisible (le plan L658 : jamais un
 *     crash, un dialogue honnête + le dismiss).
 */
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Progress, Button } from '@aurora/ui';

import type { UpdaterState } from './useUpdater';

export interface UpdateDialogProps {
  /** Le state `useUpdater` (M-85) — le composant le lit, il ne
   *  l'appelle pas lui-même (le hook est monté dans l'app shell, le
   *  plan L666 : l'intégration au démarrage, sans bloquer le
   *  PowerSync/Supabase boot). */
  updater: UpdaterState;
}

/**
 * Le dialogue de mise à jour (le plan L664). Le composant rend `null` si
 * le state est `idle` / `checking` (le plan L719 : le dialogue
 * n'apparaît QUE si une version plus récente existe — l'`idle` post
 * up-to-date ne montre rien).
 */
export function UpdateDialog({ updater }: UpdateDialogProps) {
  const {
    status,
    update,
    downloadProgress,
    waitingPermission,
    error,
    download,
    install,
    openInstallSettings,
    dismiss,
  } = updater;

  // Le plan L719 : le dialogue s'ouvre si le state est « available »,
  // « downloading », « readyToInstall » ou « error » (l'erreur a un
  // dialogue honnête, pas un silence) — « idle » / « checking » ne
  // montrent rien.
  const shouldShow =
    status === 'available' ||
    status === 'downloading' ||
    status === 'readyToInstall' ||
    status === 'error';
  if (!shouldShow) return null;

  // Le titre par état (le plan L664 : la version s'affiche).
  const title =
    status === 'error'
      ? 'Mise à jour indisponible'
      : status === 'downloading'
        ? 'Téléchargement en cours…'
        : `Nouvelle version ${update?.versionName ?? ''}`;

  // Le contenu par état (le changelog du release, le plan L664).
  const description =
    status === 'error' ? (
      // Le plan L658 : le message d'erreur lisible (jamais un crash).
      <span data-updater="error-message">{error}</span>
    ) : update?.changelog ? (
      <p data-updater="changelog">{update.changelog}</p>
    ) : (
      <span data-updater="no-changelog">Aucune note de version fournie.</span>
    );

  // Le footer par état (les boutons du plan L664 : « Mettre à jour » /
  // « Plus tard »).
  let footer: React.ReactNode;
  if (status === 'downloading') {
    // Le plan L663 : la progression (le `Progress` SSoT du lot, le % du
    // `downloadProgress` du hook M-85). Le -1 du totalBytes (le
    // streaming sans Content-Length) → le hook lève `null`, on reste
    // à 0 (le téléchargement « en cours » sans %).
    footer = (
      <div data-updater="progress" className="updater-progress">
        <Progress
          value={downloadProgress ?? 0}
          aria-label="Progression du téléchargement"
        />
        <div style={{ marginTop: 8 }}>
          <Button size="sm" variant="ghost" onClick={() => dismiss()}>
            Annuler
          </Button>
        </div>
      </div>
    );
  } else if (status === 'readyToInstall') {
    // Le plan L721 : le « Mettre à jour » déclenche l'écran système de
    // confirmation (`install` du hook M-85) ; le plan L722 : si
    // `waitingPermission`, le CTA ouvre les réglages Android AVANT
    // l'install (la redirection « sources inconnues », la reprise au
    // retour re-vérifie la permission — le hook M-85 le gère).
    footer = (
      <div data-updater="actions" className="updater-actions">
        {waitingPermission ? (
          <Button
            size="sm"
            onClick={() => {
              void openInstallSettings();
            }}
          >
            Autoriser l'installation
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => {
              void install();
            }}
          >
            Mettre à jour
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => dismiss()}>
          Plus tard
        </Button>
      </div>
    );
  } else if (status === 'available') {
    // Le plan L664 : le « Mettre à jour » lance le download (le hook
    // M-85 le passe à `downloading`) ; le « Plus tard » (le plan L665)
    // le dismiss.
    footer = (
      <div data-updater="actions" className="updater-actions">
        <Button
          size="sm"
          onClick={() => {
            void download();
          }}
        >
          Mettre à jour
        </Button>
        <Button size="sm" variant="ghost" onClick={() => dismiss()}>
          Plus tard
        </Button>
      </div>
    );
  } else {
    // Le `error` : le dismiss (le plan L658 : le message lisible,
    // jamais un crash, l'utilisateur peut fermer et essayer plus
    // tard — le prochain boot re-checke, le TTL 6h court-circuite
    // l'API).
    footer = (
      <div data-updater="actions" className="updater-actions">
        <Button size="sm" variant="ghost" onClick={() => dismiss()}>
          Fermer
        </Button>
      </div>
    );
  }

  // Le controlled AlertDialog (le shadcn/Radix `open` +
  // `onOpenChange` — le state local n'est PAS nécessaire, le hook
  // M-85 pilote l'état, le composant le rend).
  return (
    <AlertDialog open={shouldShow} onOpenChange={() => undefined} data-updater="dialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>{footer}</AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
