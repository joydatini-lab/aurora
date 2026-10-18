/**
 * checkForUpdate (S8 M-84, plan 2026-10-17 L653–659).
 *
 * SSoT PUR de la vérification de version du self-updater APK : le module ne
 * dépend d'AUCUN runtime Android / Capacitor (les tests pnpm-test l'importent
 * sous `node --experimental-strip-types`). Le cache 6 h et l'appel GitHub
 * reçoivent leurs implémentations par INJECTION — c'est le module
 * `apkUpdater.ts` (côté app) qui assemble les callbacks concrets.
 *
 * Règles de sortie (plan L718–725) :
 *   - comparaison NUMÉRIQUE de versionCode (jamais de string-compare :
 *     `1.10` vs `1.9` — la chaîne trierait `1.9` « plus récente ») ;
 *   - le cache 6 h évite de rappeler l'API GitHub à chaque boot ;
 *   - sur web/iOS le hook n'appelle JAMAIS ce module (le `useUpdater`
 *     court-circuite sur `Capacitor.getPlatform() === 'android'`) ;
 *   - try/catch global : AUCUN throw (l'app ne plante jamais sur un
 *     échec de vérification — dégradé silencieux `status:'idle'`).
 */

// ————————————————————————————————————————————————————————————————
// Types publics
// ————————————————————————————————————————————————————————————————

export interface ApkAsset {
  /** Le SHA-256 de l'asset (le plugin natif re-vérifie pendant le download). */
  sha256?: string;
  /** L'URL de téléchargement (asset GitHub exact `APK_ASSET_NAME`). */
  url: string;
  /** Le size (affichage + sanity check du téléchargement). */
  size?: number;
}

export interface UpdateInfo {
  /** La version ciblée (le `tag_name` du release, ex. `v2.1.0`). */
  versionName: string;
  /** Le versionCode NUMÉRIQUE (la comparaison SSoT, jamais un string). */
  versionCode: number;
  /** Le changelog du release (`body` GitHub, Markdown). */
  changelog?: string;
  /** L'asset APK exact + son sha256 (le plugin vérifie pendant la lecture). */
  asset: ApkAsset;
}

export type UpdateCheckStatus =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'available'
  | 'error';

export interface CheckForUpdateResult {
  status: UpdateCheckStatus;
  /** `true` si une version plus récente existe (le versionCode cuit). */
  available: boolean;
  /** L'info de la version cible (absente si `!available`). */
  update?: UpdateInfo;
  /** Le message d'erreur (absent si `status !== 'error'`). */
  error?: string;
}

export interface CheckForUpdateOptions {
  /** Le versionCode ACTUEL de l'APK installé (le `BuildConfig.VERSION_CODE`). */
  currentVersionCode: number;
  /** Le fetch GitHub API — injecté pour rester pur + testable hors réseau. */
  fetchLatestRelease: () => Promise<LatestReleaseResponse>;
  /** Le cache 6 h — `read` (retourne `null` si absent/expiré), `write`. */
  cache: {
    read(): Promise<UpdateInfo | null>;
    write(info: UpdateInfo): Promise<void>;
  };
}

// ————————————————————————————————————————————————————————————————
// Type de la réponse GitHub (le sous-ensemble consommé)
// ————————————————————————————————————————————————————————————————

export interface LatestReleaseResponse {
  tag_name: string;
  name?: string;
  body?: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size?: number;
    digest?: string;
  }>;
}

// ————————————————————————————————————————————————————————————————
// L'extraction de l'asset APK exact (`APK_ASSET_NAME`) + sa digest
// ————————————————————————————————————————————————————————————————

/**
 * Lève une erreur explicite si l'asset `apkAssetName` n'est PAS dans les
 * assets du release (le plan exige « asset exact », jamais un fallback
 * silencieux sur un autre binaire).
 */
function extractApkAsset(
  release: LatestReleaseResponse,
  apkAssetName: string,
): ApkAsset {
  const asset = release.assets.find((a) => a.name === apkAssetName);
  if (!asset) {
    throw new Error(
      `Release v${release.tag_name} : l'asset « ${apkAssetName} » est absent (le build CI n'a pas produit l'APK signé ?)`,
    );
  }
  return {
    url: asset.browser_download_url,
    sha256: asset.digest,
    size: asset.size,
  };
}

// ————————————————————————————————————————————————————————————————
// La comparaison NUMÉRIQUE de versionCode (la règle SSoT du plan L655)
// ————————————————————————————————————————————————————————————————

/**
 * `true` si `candidate` est strictement supérieur à `current`.
 * La comparaison est NUMÉRIQUE (un `number`), jamais string-compare :
 * `1.10` vs `1.9` serait tris mal si on convertissait en string (le
 * versionCode est un INT incrémental, pas un `x.y.z`).
 */
export function isNewerVersionCode(candidate: number, current: number): boolean {
  return typeof candidate === 'number'
    && Number.isFinite(candidate)
    && candidate > current;
}

/**
 * Le versionCode de la version cible depuis le release.
 *
 * Règle : le `versionCode` de l'APK est un INT incrémental (build.gradle).
 * GitHub API ne l'expose PAS en tant que champ — il est porteur dans le
 * `tag_name` (ex. `v1.2.3` → le versionCode `123`, ou un entier dédié).
 * Le SSoT retenu : si le `tag_name` est un INT pur, on le parse ; sinon,
 * on tente le champ optionnel `versionCode` (le lead du CI peut le porter
 * via une annotation custom) ; à défaut → `null` (l'appère ne peut PAS
 * comparer → pas de mise à jour proposée).
 */
export function extractVersionCodeFromTag(
  tag: string,
  hint?: number,
): number | null {
  // Un hint explicite (le lead l'injecte via l'optionnel du release) prime.
  if (typeof hint === 'number' && Number.isFinite(hint)) return hint;
  // Un tag INT pur (ex. `123` ou `v123`) → le versionCode direct.
  const m = tag.match(/^v?(\d+)$/);
  return m ? Number(m[1]) : null;
}

// ————————————————————————————————————————————————————————————————
// Le orchestrateur principal (impur : fetch + cache injectés)
// ————————————————————————————————————————————————————————————————

/**
 * Vérifie si une version plus récente existe (le plan L653–658).
 *
 * Workflow :
 *   1. Lecture du cache 6 h → `available` si le cache porte une version
 *      strictement supérieure au current ;
 *   2. Sinon, fetch du release GitHub (`releases/latest`) + vérification
 *      de l'asset exact + comparaison numérique ;
 *   3. Cache de la réponse (si `available`) — le re-check suivant dans
 *      les 6 h ne re-fétche PAS l'API.
 *
 * AUCUN throw : tout échec (réseau, asset absent, version non-parsable)
 * se traduit en `status:'error'` + un `error` descriptif (le hook
 * React affiche le toast, l'app ne plante pas — plan L658).
 */
export async function checkForUpdate(
  opts: CheckForUpdateOptions,
  apkAssetName: string,
): Promise<CheckForUpdateResult> {
  // Phase 1 : le cache (pas de fetch si le cache est valide).
  try {
    const cached = await opts.cache.read();
    if (cached && isNewerVersionCode(cached.versionCode, opts.currentVersionCode)) {
      return { status: 'available', available: true, update: cached };
    }
  } catch {
    // Cache corrompu → on re-fetch silencieusement (pas d'erreur levée).
  }

  // Phase 2 : le fetch du release.
  let release: LatestReleaseResponse;
  try {
    release = await opts.fetchLatestRelease();
  } catch (error) {
    return {
      status: 'error',
      available: false,
      error: error instanceof Error ? error.message : 'fetch GitHub API failed',
    };
  }

  // Phase 3 : l'asset APK exact (jamais un fallback silencieux).
  let asset: ApkAsset;
  try {
    asset = extractApkAsset(release, apkAssetName);
  } catch (error) {
    return {
      status: 'error',
      available: false,
      error: error instanceof Error ? error.message : 'APK asset missing',
    };
  }

  // Phase 4 : la comparaison NUMÉRIQUE de versionCode.
  const candidateVersionCode = extractVersionCodeFromTag(release.tag_name);
  if (candidateVersionCode === null) {
    return {
      status: 'error',
      available: false,
      error: `Le tag « ${release.tag_name} » ne porte pas un versionCode parsable (le CI doit tagguer en v<INT> ou porter le champ optionnel)`,
    };
  }

  const isAvailable = isNewerVersionCode(candidateVersionCode, opts.currentVersionCode);
  if (!isAvailable) {
    return { status: 'up-to-date', available: false };
  }

  const info: UpdateInfo = {
    versionName: release.tag_name,
    versionCode: candidateVersionCode,
    changelog: release.body,
    asset,
  };

  // Phase 5 : on met le cache à jour (6 h de TTL).
  try {
    await opts.cache.write(info);
  } catch {
    // L'échec du cache est non-bloquant (le résultat est correct,
    // le prochain boot re-fetch).
  }

  return { status: 'available', available: true, update: info };
}
