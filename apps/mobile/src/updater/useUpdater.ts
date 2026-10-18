/**
 * useUpdater (S8 M-85, plan 2026-10-17 L661–667) — le hook React du
 * self-updater APK.
 *
 * États (le plan L662) :
 *   idle → checking → (available | up-to-date | error)
 *                ↘ downloading (progression) → readyToInstall
 *
 * - Sur web/iOS, `Capacitor.getPlatform() !== 'android'` → le hook reste
 *   `idle` pour toujours (le plan L723–724 : ne fait rien, ne génère
 *   AUCUNE erreur — jamais de `checking`/`error`).
 * - `checkForUpdateNow` (le M-83, qui assemble le fetch + le cache 6h du
 *   module pur M-84 déjà verrouillé au TDD) ne plante JAMAIS : tout
 *   échec réseau devient `status:'error'` + un message lisible (le plan
 *   L658 « try/catch global ») ; le hook le catch défensivement.
 * - L'intégration au démarrage (le plan L666 : « après PowerSync/Supabase,
 *   sans la bloquer ») se fait dans `main.tsx` — le hook est monté dans
 *   `AuroraApp`, il ne bloque JAMAIS le render (un setState asynchrone
 *   post-mount).
 * - `waitingPermission` : le hook interroge `canInstall()` quand une
 *   update est `available` (le plan L722 : si `false`, la redirection
 *   « sources inconnues » s'affiche avant l'install — la reprise au
 *   retour de la page réglages = un re-check au prochain boot).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';

import {
  checkForUpdateNow,
  startDownload,
  installApk,
  ApkUpdater,
  type UpdateInfo,
} from './apkUpdater';

export type UpdaterStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'readyToInstall'
  | 'error';

export interface UpdaterState {
  /** L'état courant (le plan L662). */
  status: UpdaterStatus;
  /** L'info de la version cible (absente si `status !== 'available' |
   *  'downloading' | 'readyToInstall'`). */
  update: UpdateInfo | null;
  /** La progression du download (`0..100`, le plan L663) — absente hors
   *  `downloading`. */
  downloadProgress: number | null;
  /** `true` si la permission `REQUEST_INSTALL_PACKAGES` est manquante
   *  (le plan L722 : la redirection réglages s'affiche avant l'install,
   *  la reprise au retour). */
  waitingPermission: boolean;
  /** Le message d'erreur (absent si `status !== 'error'`). */
  error?: string;
  /**
   * Le launch du téléchargement (le plan L662 « Mettre à jour ») :
   * `download` → `readyToInstall` → l'utilisateur « Mettre à jour » de
   * nouveau → `install` (l'écran système de confirmation, le plan L721).
   * Sur web/iOS : no-op (le hook reste `idle`).
   */
  download: () => Promise<void>;
  /** Le launch de l'installation (l'écran système, le plan L721).
   *  Sur web/iOS : no-op. */
  install: () => Promise<void>;
  /** Le bouton « Rechercher une mise à jour » (le plan L667, la page
   *  Réglages) + le re-check au boot. */
  checkNow: () => Promise<void>;
  /** La redirection « sources inconnues » (le plan L722) : si
   *  `waitingPermission`, le hook ouvre les réglages Android puis
   *  re-vérifie au retour. */
  openInstallSettings: () => Promise<void>;
  /** Le dismiss (le « Plus tard », le plan L665) : retour à `idle` sans
   *  toucher au cache (le prochain boot re-checke, le TTL 6h
   *  court-circuite l'API). */
  dismiss: () => void;
}

export function useUpdater(): UpdaterState {
  const [status, setStatus] = useState<UpdaterStatus>('idle');
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [waitingPermission, setWaitingPermission] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  // Le fileUri du dernier download terminé (le `install` du plan L662 le
  // passe au bridge M-83 — le module est stateless, c'est le hook qui
  // le porte entre les deux phases download → install).
  const [fileUri, setFileUri] = useState<string | null>(null);

  // Le ref du download (l'unsubscribe `downloadProgress` + le cleanup
  // au unmount, le plan L663).
  const stopDownloadRef = useRef<(() => void) | null>(null);

  // Le flag platform (le plan L657–658 : `Capacitor.getPlatform() ===
  // 'android'` seulement) — sur web/iOS, le hook reste `idle` pour
  // toujours, AUCUN appel au bridge (le plan L723–724 : ne génère
  // AUCUNE erreur).
  const isAndroid = Capacitor.getPlatform() === 'android';

  const checkNow = useCallback(async () => {
    if (!isAndroid) return; // le plan L723–724 : le updater ne fait rien.
    setStatus('checking');
    setError(undefined);
    try {
      const res = await checkForUpdateNow();
      if (res.status === 'available' && res.update) {
        setUpdate(res.update);
        setStatus('available');
        // Le plan L722 : la vérification de la permission se fait AVANT
        // l'install (le hook expose `waitingPermission`, l'UI redirige).
        try {
          const { canInstall } = await ApkUpdater.canInstall();
          setWaitingPermission(!canInstall);
        } catch {
          // Le `canInstall` natif indisponible (un debug build sans le
          // plugin ?) → on laisse `waitingPermission` à `false` (le hook
          // n'expose PAS un état bloquant que l'app ne peut pas lever).
        }
      } else if (res.status === 'error') {
        // Le plan L658 : l'échec réseau est lisible, jamais un crash.
        setStatus('error');
        setError(res.error);
      } else {
        // `up-to-date` → on repasse en `idle` (le plan L719 « le dialogue
        // n'apparaît que si une version plus récente existe »).
        setStatus('idle');
      }
    } catch (e) {
      // Le try/catch global (le plan L658) : le module pur M-84 ne lève
      // jamais (le SSoT verrouillé au TDD) — ce catch est le filet de
      // sécurité ultime (un no-op `await` levé par un bug dans le
      // wrapper M-83 ?).
      setStatus('error');
      setError(e instanceof Error ? e.message : 'update check failed');
    }
  }, [isAndroid]);

  // Le boot : le plan L666 « intégration au démarrage (après
  // PowerSync/Supabase, sans la bloquer) » — le check est asynchrone,
  // le render n'est JAMAIS bloqué.
  useEffect(() => {
    if (!isAndroid) return;
    void checkNow();
  }, [isAndroid, checkNow]);

  const download = useCallback(async () => {
    if (!isAndroid || !update) return;
    setStatus('downloading');
    setDownloadProgress(0);
    try {
      const { fileUriPromise, stopListening } = startDownload(
        update,
        (receivedBytes, totalBytes) => {
          // Le plan L663 : la progression (le composant M-85 l'affiche
          // via l'`IonProgressBar`). Le -1 du totalBytes = inconnu
          // (le download en streaming sans Content-Length) → on reste
          // à 0 (le téléchargement « en cours » sans %).
          if (totalBytes > 0) {
            setDownloadProgress(Math.round((receivedBytes / totalBytes) * 100));
          }
        },
      );
      stopDownloadRef.current = stopListening;
      const fileUri = await fileUriPromise;
      // Le download est terminé → l'APK est prêt (le plan L662
      // `readyToInstall`) — l'`install` de l'UI le déclenche avec le
      // fileUri porté par le state du hook (le bridge M-83 est
      // stateless).
      setFileUri(fileUri);
      setStatus('readyToInstall');
    } catch (e) {
      // Le plan L658 : le download lève (sha256 mismatch, HTTP 500,
      // offline) → l'`error` lisible, l'app ne plante pas.
      setStatus('error');
      setError(e instanceof Error ? e.message : 'download failed');
      stopDownloadRef.current?.();
      stopDownloadRef.current = null;
    }
  }, [isAndroid, update]);

  const install = useCallback(async () => {
    if (!isAndroid || !fileUri) return;
    // Le plan L721 : l'écran système de confirmation (`PackageInstaller`
    // M-82, le résultat est relayé par le `InstallResultReceiver`).
    try {
      const res = await installApk(fileUri);
      if (!res.installed) {
        // L'annulation utilisateur (le plan L722 « reprise au retour »)
        // → on repasse en `readyToInstall` (un re-tentative de l'install
        // sans re-download).
        setStatus('readyToInstall');
        if (res.message) setError(res.message);
      }
      // Le `installed: true` → le système relance l'app après l'update
      // (le process est tué par l'update, le hook disparaît — pas de
      // setState après le death, le JS ne tourne plus).
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'install failed');
    }
  }, [isAndroid, fileUri]);

  const openInstallSettings = useCallback(async () => {
    if (!isAndroid) return;
    try {
      await ApkUpdater.openInstallSettings();
      // Le retour de la page réglages : le plan L722 « reprise au
      // retour » — on re-vérifie la permission (le `canInstall`
      // repart, l'utilisateur a accordé la permission ?).
      const { canInstall } = await ApkUpdater.canInstall();
      setWaitingPermission(!canInstall);
    } catch {
      // Le `openInstallSettings` lève (un vieux device sans le réglage ?)
      // → on laisse `waitingPermission` à son état courant (l'UI montre
      // un message honnête « impossible d'ouvrir les réglages », jamais
      // un crash, le plan L658).
    }
  }, [isAndroid]);

  const dismiss = useCallback(() => {
    // Le plan L665 « Plus tard » : retour à `idle` (le cache n'est PAS
    // touché — le prochain boot re-checke, le TTL 6h court-circuite
    // l'API). Le download en cours est stoppé (le cleanup du ref).
    stopDownloadRef.current?.();
    stopDownloadRef.current = null;
    setStatus('idle');
    setUpdate(null);
    setDownloadProgress(null);
    setFileUri(null);
    setError(undefined);
  }, []);

  // Le cleanup au unmount (le plan L663) — le download en cours est
  // stoppé, l'abonnement `downloadProgress` est retiré.
  useEffect(() => {
    return () => {
      stopDownloadRef.current?.();
      stopDownloadRef.current = null;
    };
  }, []);

  return {
    status,
    update,
    downloadProgress,
    waitingPermission,
    error,
    download,
    install,
    checkNow,
    openInstallSettings,
    dismiss,
  };
}
