/**
 * apkUpdater (S8 M-83, plan 2026-10-17 L649–651) — le pont TypeScript du
 * plugin natif `ApkUpdaterPlugin` (M-82).
 *
 * Le plugin est enregistré par `registerPlugin<ApkUpdaterPlugin>('ApkUpdater')`
 * (le nom exact de l'enregistrement `MainActivity.java`, M-82). Sur web/iOS
 * (ou hors Capacitor), `Capacitor.isNativePlatform()` est `false` et toutes
 * les méthodes du bridge sont des NO-OPS explicites (le plan L723–724 :
 * « sur web/iOS, le updater ne fait rien et ne génère aucune erreur »).
 *
 * Le cache 6 h (`@capacitor/preferences`) est assemblé ICI et injecté dans
 * le module pur `checkForUpdate` (M-84) — le SSoT reste testable hors
 * runtime, le runtime est l'implémentation.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

import {
  GITHUB_OWNER,
  GITHUB_REPO,
  APK_ASSET_NAME,
  UPDATE_CHECK_CACHE_TTL_MS,
  UPDATE_CHECK_CACHE_KEY,
  CURRENT_ANDROID_VERSION_CODE,
} from './config';
import {
  checkForUpdate,
  type CheckForUpdateResult,
  type LatestReleaseResponse,
  type UpdateInfo,
  type ApkAsset,
} from './checkForUpdate';

// Le re-export des types (le hook M-85 les importe depuis ce module).
export type { UpdateInfo, ApkAsset } from './checkForUpdate';

// ————————————————————————————————————————————————————————————————
// L'interface EXACTE du bridge (le plan L650 : « l'interface exacte de la
// mission ») — la signature Java de `ApkUpdaterPlugin` (M-82) doit matcher.
// ————————————————————————————————————————————————————————————————

export interface ApkUpdaterPlugin {
  /** `true` si l'APK courant est installable via `install()` (Android 11+
   *  + permission `REQUEST_INSTALL_PACKAGES` accordée). Le hook `useUpdater`
   *  en déduit l'état `waitingPermission`. */
  canInstall(): Promise<{ canInstall: boolean }>;

  /** Ouvre les réglages Android « Sources inconnues / Installer des
   *  applications inconnues » (le plan L722 : la redirection si non
   *  autorisé). Résout quand la page est ouverte (l'utilisateur décide). */
  openInstallSettings(): Promise<unknown>;

  /**
   * Télécharge l'APK depuis `url` (HTTPS-only côté natif, plan L645)
   * sur un thread séparé, en vérifiant le SHA-256 pendant la lecture
   * (si `sha256` est fourni — sinon le download se fait sans vérif).
   * Émet l'événement `downloadProgress` ({ receivedBytes, totalBytes })
   * sur l'instance (le hook s'y abonne pour la `IonProgressBar`).
   * Retourne le `fileUri` du téléchargement (le `FileProvider` URI).
   * @throws nativement si la sha256 ne match pas (le hook passe en
   *         `status:'error'`, jamais de crash).
   */
  download(opts: { url: string; sha256?: string }): Promise<{ fileUri: string }>;

  /**
   * Lance l'installation du `fileUri` via `PackageInstaller`
   * (le plan L647 : sessions, `setRequireUserAction` API 31+,
   * `setRequestUpdateOwnership` API 34+). Résout avec le résultat
   * transmis par `InstallResultReceiver` (le receiver M-82).
   */
  install(opts: { fileUri: string }): Promise<{ installed: boolean; message?: string }>;

  /** Le `versionCode` de l'APK installé (le `BuildConfig.VERSION_CODE`,
   *  passthrough natif → le hook n'a pas à hardcoded-coder la valeur). */
  currentVersionCode(): Promise<{ versionCode: number }>;

  /** S'abonne à l'événement `downloadProgress` (le retour est la
   *  unsubscribe function, React-style). */
  addEventListener(
    eventName: 'downloadProgress',
    listener: (e: { receivedBytes: number; totalBytes: number }) => void,
  ): () => void;
}

// ————————————————————————————————————————————————————————————————
// L'implémentation du bridge (les no-ops web/iOS + le registerPlugin
// Android) — le pattern Capacitor standard.
// ————————————————————————————————————————————————————————————————

interface DownloadProgressEvent {
  receivedBytes: number;
  totalBytes: number;
}

// Le retour de `registerPlugin` est l'impl Capacitor core (le
// PluginWithReturnValues) — le wrapper `ApkUpdater` ci-dessous expose
// l'interface EXACTE du plan (L650) : les no-ops web/iOS SONT les
// méthodes de l'interface, le JS n'a pas de raison d'appeler
// `currentVersionCode()` / `canInstall()` hors Android (le hook M-85
// court-circuite avant).
interface NativeApkUpdater extends ApkUpdaterPlugin {
  // Le abonnement Capacitor core au downloadProgress (le `notifyEvent`
  // du plugin Java l'émet) — l'impl web no-op ne l'expose pas.
  addListener(
    eventName: 'downloadProgress',
    listener: (evt: DownloadProgressEvent) => void,
  ): { remove: () => Promise<void> };
}

const webFallback: Omit<NativeApkUpdater, 'addListener'> = {
  async canInstall(): Promise<{ canInstall: boolean }> {
    return { canInstall: false };
  },
  async openInstallSettings(): Promise<unknown> {
    return undefined;
  },
  async download(_opts: { url: string; sha256?: string }): Promise<{ fileUri: string }> {
    throw new Error('ApkUpdater.download : indisponible hors Android');
  },
  async install(_opts: { fileUri: string }): Promise<{ installed: boolean; message?: string }> {
    throw new Error('ApkUpdater.install : indisponible hors Android');
  },
  async currentVersionCode(): Promise<{ versionCode: number }> {
    return { versionCode: 0 };
  },
  addEventListener(_eventName: 'downloadProgress', _listener: (e: DownloadProgressEvent) => void) {
    // No-op sur web/iOS (l'abonnement est un no-op, jamais d'erreur).
    return () => undefined;
  },
};

let nativePlugin: NativeApkUpdater | undefined;
if (Capacitor.isNativePlatform()) {
  // Le registerPlugin renvoie l'impl native (le register est lazy — le
  // premier call JS l'exécute) ; l'abonnement downloadProgress vient
  // de l'API core Capacitor (`addListener` du plugin, l'événement
  // `downloadProgress` est émis par le Java M-82 via `notifyEvent`).
  nativePlugin = registerPlugin('ApkUpdater') as NativeApkUpdater;
}

export const ApkUpdater: ApkUpdaterPlugin = {
  canInstall: () => (nativePlugin ? nativePlugin.canInstall() : webFallback.canInstall()),
  openInstallSettings: () =>
    nativePlugin ? nativePlugin.openInstallSettings() : webFallback.openInstallSettings(),
  download: (o) => (nativePlugin ? nativePlugin.download(o) : webFallback.download(o)),
  install: (o) => (nativePlugin ? nativePlugin.install(o) : webFallback.install(o)),
  currentVersionCode: () =>
    nativePlugin ? nativePlugin.currentVersionCode() : webFallback.currentVersionCode(),
  // L'abonnement downloadProgress (le plan L645) : sur Android, l'API
  // core Capacitor (`addListener` de l'impl native, l'événement
  // `downloadProgress` est émis par le Java M-82 via `notifyEvent`) ;
  // sur web/iOS, l'unsubscribe est un no-op (le plan L723–724 : ne
  // fait rien, ne génère AUCUNE erreur).
  addEventListener: (eventName, listener) => {
    if (nativePlugin?.addListener) {
      const sub = nativePlugin.addListener(eventName, listener);
      return () => {
        void sub.remove();
      };
    }
    return webFallback.addEventListener(eventName, listener);
  },
};

// ————————————————————————————————————————————————————————————————
// Le cache 6 h (`@capacitor/preferences`) — l'impl concrète injectée dans
// `checkForUpdate` (le module pur reste testable hors runtime).
// ————————————————————————————————————————————————————————————————

async function readCache(): Promise<UpdateInfo | null> {
  if (!Capacitor.isNativePlatform()) return null;
  const { value } = await Preferences.get({ key: UPDATE_CHECK_CACHE_KEY });
  if (value == null) return null;
  // Le TTL 6 h (le `updatedAt` est écrit côté write) : un cache plus
  // vieux → `null` (le hook re-fetch, pas de re-check caché).
  try {
    const parsed: UpdateInfo & { updatedAt?: number } = JSON.parse(value);
    const updatedAt = parsed.updatedAt;
    if (typeof updatedAt === 'number' && Date.now() - updatedAt > UPDATE_CHECK_CACHE_TTL_MS) {
      return null;
    }
    delete parsed.updatedAt;
    return parsed;
  } catch {
    // Un cache corrompu → on l'écrase au prochain write, pas d'erreur levée.
    return null;
  }
}

async function writeCache(info: UpdateInfo): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await Preferences.set({
    key: UPDATE_CHECK_CACHE_KEY,
    value: JSON.stringify({ ...info, updatedAt: Date.now() }),
  });
}

// ————————————————————————————————————————————————————————————————
// Le fetch GitHub API `releases/latest` (le plan L654–655 : le header
// `Accept: application/vnd.github+json` + l'asset exact, via le config).
// ————————————————————————————————————————————————————————————————

async function fetchLatestRelease(): Promise<LatestReleaseResponse> {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} (releases/latest)`);
  }
  return (await res.json()) as LatestReleaseResponse;
}

// ————————————————————————————————————————————————————————————————
// L'export SSoT du hook `useUpdater` (M-85) : une seule fonction qui
// assemble le fetch + le cache + le versionCode courant et délègue au
// module pur (le TDD M-84 a verrouillé la logique).
// ————————————————————————————————————————————————————————————————

export async function checkForUpdateNow(): Promise<CheckForUpdateResult> {
  // Le versionCode courant (0 sur web/iOS — le hook court-circuite avant
  // d'appeler cette fonction ; ici c'est le fallback défensif).
  let currentVersionCode = CURRENT_ANDROID_VERSION_CODE;
  if (Capacitor.isNativePlatform()) {
    try {
      const { versionCode } = await ApkUpdater.currentVersionCode();
      if (typeof versionCode === 'number' && versionCode > 0) {
        currentVersionCode = versionCode;
      }
    } catch {
      // Le passthrough natif indisponible (debug build sans le plugin ?)
      // → on garde la constante du config (le courant build.gradle).
    }
  }
  return checkForUpdate(
    {
      currentVersionCode,
      fetchLatestRelease,
      cache: { read: readCache, write: writeCache },
    },
    APK_ASSET_NAME,
  );
}

/**
 * Le wrapper TDD-safe du téléchargement (le hook l'appelle après un
 * `checkForUpdateNow` qui a retourné `available`) : le download + le
 * `downloadProgress` abonnement retournent l'unsubscribe (le hook le
 * nettoie au unmount). Sur web/iOS : lève un `Error` lisible (le hook
 * le catch et passe en `error`, jamais de crash).
 */
export function startDownload(
  update: UpdateInfo,
  onProgress: (receivedBytes: number, totalBytes: number) => void,
): { fileUriPromise: Promise<string>; stopListening: () => void } {
  const stopListening = ApkUpdater.addEventListener('downloadProgress', (e) =>
    onProgress(e.receivedBytes, e.totalBytes),
  );
  const fileUriPromise: Promise<string> = ApkUpdater.download({
    url: update.asset.url,
    sha256: update.asset.sha256,
  }).then(({ fileUri }) => fileUri);
  return { fileUriPromise, stopListening };
}

export function installApk(fileUri: string): Promise<{ installed: boolean; message?: string }> {
  return ApkUpdater.install({ fileUri });
}
