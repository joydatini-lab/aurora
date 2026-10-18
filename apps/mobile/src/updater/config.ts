/**
 * M-81 (S8, plan 2026-10-17 L713–716) — Config du self-updater APK.
 *
 * SSoT de l'UPDATER, le module `checkForUpdate.ts` (M-84) et le bridge
 * `apkUpdater.ts` (M-83) le lisent. Les valeurs ne sont JAMAIS des
 * placeholders : elles reflètent le dépôt réel du projet (le `git remote`
 * de la racine, le 2026-10-18).
 */

/**
 * Le GITHUB_OWNER du dépôt Aurora (le `git remote -v` de la racine).
 * Jamais un placeholder — le CI du `release-apk.yml` (M-87) lit la même
 * valeur pour pointer les secrets du dépôt.
 */
export const GITHUB_OWNER = 'joynagassi-cyber';

/**
 * Le GITHUB_REPO (le `git remote -v` de la racine).
 */
export const GITHUB_REPO = 'aurora';

/**
 * Le NOME EXACT de l'asset APK signé que le CI du `release-apk.yml`
 * (M-87) upload dans les GitHub Releases. Le module `checkForUpdate`
 * (M-84) rejette SILENCE tout release qui ne porte PAS ce nom (jamais
 * un fallback sur un autre binaire — le plan exige « l'asset exact
 * `APK_ASSET_NAME` »).
 */
export const APK_ASSET_NAME = 'app-release.apk';

/**
 * Le TTL du cache 6 h (`checkForUpdate` M-84) : après 6 h, le hook
 * re-fetch l'API GitHub ; avant, le cache local (le `@capacitor/preferences`)
 * sert l'info de la dernière vérification.
 */
export const UPDATE_CHECK_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Le `@capacitor/preferences` key du cache (la SSoT du lot) — le module
 * `apkUpdater.ts` (M-83) expose `readCache`/`writeCache` qui lisible cette key.
 */
export const UPDATE_CHECK_CACHE_KEY = 'updater.latest_release_info';

/**
 * Le versionCode ACTUEL de l'APK (le `BuildConfig.VERSION_CODE` Android,
 * le `versionCode` de `apps/mobile/android/app/build.gradle`). Le hook
 * `useUpdater` (M-85) le lit via le bridge `apkUpdater.currentVersionCode`
 * et le passe à `checkForUpdate` — sur web/iOS, le valeur est `0` (le
 * hook court-circuite avant d'appeler la vérification).
 */
export const CURRENT_ANDROID_VERSION_CODE = 1;
