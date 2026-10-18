/**
 * updater-config-wiring.test.ts — S8 (plan 2026-10-17, M-81/M-84).
 *
 * TDD du self-updater APK : le test ÉCHOUE d'abord (les modules n'existent
 * pas), puis les tâches M-81/M-84 le rendent vert.
 *
 * SSoT testés (pur, zéro React, zéro réseau, zéro Capacitor runtime — le
 * même pattern que `skills-wiring.test.ts` / `sync-config-wiring.test.ts`) :
 *
 * M-81 (config) :
 *   1. `GITHUB_OWNER` / `GITHUB_REPO` / `APK_ASSET_NAME` sont des
 *      constantes NON-VIDES (le plan interdit les placeholders).
 *
 * M-84 (checkForUpdate) :
 *   2. `isNewerVersionCode` fait la comparaison NUMÉRIQUE de versionCode
 *      (jamais un string-compare : `1.10` vs `1.9` — le versionCode est un
 *      INT incrémental, pas un `x.y.z`).
 *   3. `extractVersionCodeFromTag` parse le tag `v<INT>` / `<INT>` en
 *      versionCode ; un tag non-parsable retourne `null` (le module ne
 *      plante pas, il renvoie un résultat `error` lisible).
 *   4. `checkForUpdate` — le chemin cache : un cache portant une version
 *      plus récente retourne `available` SANS appeler `fetchLatestRelease`
 *      (le cache 6 h évite l'API).
 *   5. `checkForUpdate` — le chemin up-to-date : le versionCode cible
 *      `<=` le current → `up-to-date`, aucun write cache.
 *   6. `checkForUpdate` — le chemin available + cache : le versionCode
 *      cible `>` le current → `available` + un `write` cache du nouvel info.
 *   7. `checkForUpdate` — l'asset manquant : le release sans l'asset
 *      `APK_ASSET_NAME` exact → `status:'error'` (jamais un fallback
 *      silencieux sur un autre binaire).
 *   8. `checkForUpdate` — le tag non-parsable : → `status:'error'`.
 *   9. `checkForUpdate` — le fetch levée : → `status:'error'` (le try/catch
 *      global, l'app ne plante JAMAIS sur un échec de vérification).
 *
 * Run: pnpm -F @aurora/mobile exec node --experimental-strip-types
 *        --no-warnings --import ./test/register-resolve-hook.mjs
 *        --test test/updater-config-wiring.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  GITHUB_OWNER,
  GITHUB_REPO,
  APK_ASSET_NAME,
} from '../src/updater/config.ts';
import {
  checkForUpdate,
  extractVersionCodeFromTag,
  isNewerVersionCode,
  type CheckForUpdateOptions,
  type LatestReleaseResponse,
  type UpdateInfo,
} from '../src/updater/checkForUpdate.ts';

// ————————————————————————————————————————————————————————————————
// Fixtures
// ————————————————————————————————————————————————————————————————

function makeRelease(over: Partial<LatestReleaseResponse> = {}): LatestReleaseResponse {
  const tag = over.tag_name ?? 'v2';
  return {
    tag_name: tag,
    name: 'Aurora v2',
    body: 'changelog v2',
    assets: [
      {
        name: APK_ASSET_NAME,
        browser_download_url: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/${tag}/${APK_ASSET_NAME}`,
        size: 123456,
        digest: 'ab'.repeat(32),
      },
    ],
    ...over,
  };
}

/**
 * Le fake cache (le `@capacitor/preferences` côté app est stubable ici) :
 * il porte une `UpdateInfo` + un compteur `read`/`write` pour vérifier
 * que le chemin cache court-circuite le fetch.
 */
function makeFakeCache(initial: UpdateInfo | null = null) {
  const state = { value: initial, reads: 0, writes: 0 };
  return {
    state,
    cache: {
      async read() {
        state.reads += 1;
        return state.value;
      },
      async write(info: UpdateInfo) {
        state.writes += 1;
        state.value = info;
      },
    },
  };
}

function makeOpts(
  over: Partial<CheckForUpdateOptions>,
  currentVersionCode: number,
): CheckForUpdateOptions {
  const cache = makeFakeCache();
  return {
    currentVersionCode,
    fetchLatestRelease: async () => makeRelease(),
    cache: cache.cache,
    ...over,
  };
}

// ————————————————————————————————————————————————————————————————
// M-81 — config : les valeurs SSoT (pas de placeholder)
// ————————————————————————————————————————————————————————————————

test('M-81 : GITHUB_OWNER / GITHUB_REPO / APK_ASSET_NAME sont non-vides (le plan L714 interdit les placeholders)', () => {
  assert.ok(GITHUB_OWNER.length > 0, 'GITHUB_OWNER est renseigné');
  assert.ok(GITHUB_REPO.length > 0, 'GITHUB_REPO est renseigné');
  assert.ok(APK_ASSET_NAME.length > 0, 'APK_ASSET_NAME est renseigné');
  assert.ok(
    !GITHUB_OWNER.includes('TODO') && !GITHUB_REPO.includes('TODO'),
    'pas de placeholder TODO',
  );
  assert.equal(APK_ASSET_NAME, 'app-release.apk', 'le nom d\'asset exact (le CI M-87 l\'upload sous ce nom)');
});

// ————————————————————————————————————————————————————————————————
// M-84 — `isNewerVersionCode` : la comparaison NUMÉRIQUE
// ————————————————————————————————————————————————————————————————

test('M-84 isNewerVersionCode : la comparaison est NUMÉRIQUE (jamais string)', () => {
  // Le versionCode est un INT incrémental (le `versionCode` gradle) —
  // `10` est bien plus récent que `9` (un string-compare retournerait
  // le résultat inverse : '10' < '9' en lexicographique).
  assert.equal(isNewerVersionCode(10, 9), true, '10 > 9 (numérique)');
  assert.equal(isNewerVersionCode(9, 10), false, '9 < 10 (numérique)');
  assert.equal(isNewerVersionCode(10, 10), false, 'égalité → pas plus récent');
});

test('M-84 isNewerVersionCode : un input NaN/infini retourne false (pas de crash)', () => {
  assert.equal(isNewerVersionCode(Number.NaN, 1), false);
  assert.equal(isNewerVersionCode(1, Number.NaN), false);
  assert.equal(isNewerVersionCode(Number.POSITIVE_INFINITY, 1), false);
});

// ————————————————————————————————————————————————————————————————
// M-84 — `extractVersionCodeFromTag` : le parse du tag
// ————————————————————————————————————————————————————————————————

test('M-84 extractVersionCodeFromTag : un tag `v<INT>` / `<INT>` parse le versionCode', () => {
  assert.equal(extractVersionCodeFromTag('v42'), 42);
  assert.equal(extractVersionCodeFromTag('42'), 42);
  assert.equal(extractVersionCodeFromTag('v1'), 1);
});

test('M-84 extractVersionCodeFromTag : un tag non-parsable (semver `x.y.z`) retourne null', () => {
  // Le plan n'exige PAS de parse `x.y.z` en versionCode (celui-ci est
  // un INT incrémental côté gradle, le tag CI le porte tel quel).
  assert.equal(extractVersionCodeFromTag('v2.1.0'), null);
  assert.equal(extractVersionCodeFromTag('whatever'), null);
});

test('M-84 extractVersionCodeFromTag : un hint explicite prime le parse du tag', () => {
  assert.equal(extractVersionCodeFromTag('v2.1.0', 210), 210);
});

// ————————————————————————————————————————————————————————————————
// M-84 — `checkForUpdate` : le chemin cache (le 6 h court-circuite l'API)
// ————————————————————————————————————————————————————————————————

test('M-84 checkForUpdate : un cache portant une version plus récente retourne `available` SANS appeler l\'API', async () => {
  let fetched = 0;
  const cached: UpdateInfo = {
    versionName: 'v9',
    versionCode: 9,
    asset: { url: 'https://example.test/a.apk', sha256: 'ab'.repeat(32) },
  };
  const fakeCache = makeFakeCache(cached);
  const opts: CheckForUpdateOptions = {
    currentVersionCode: 1,
    fetchLatestRelease: async () => {
      fetched += 1;
      throw new Error('le fetch NE DOIT PAS être appelé (le cache court-circuite)');
    },
    cache: fakeCache.cache,
  };
  const res = await checkForUpdate(opts, APK_ASSET_NAME);
  assert.equal(res.status, 'available');
  assert.equal(res.available, true);
  assert.equal(res.update?.versionCode, 9);
  assert.equal(fetched, 0, 'le fetch API n\'est PAS appelé quand le cache est valide');
  assert.equal(fakeCache.state.reads, 1);
});

// ————————————————————————————————————————————————————————————————
// M-84 — `checkForUpdate` : le chemin up-to-date (cible <= current)
// ————————————————————————————————————————————————————————————————

test('M-84 checkForUpdate : le versionCode cible <= current → `up-to-date`, aucun write cache', async () => {
  const fakeCache = makeFakeCache();
  const opts = makeOpts(
    {
      fetchLatestRelease: async () => makeRelease({ tag_name: 'v1' }),
      cache: fakeCache.cache,
    },
    1, // current = 1, cible = 1 → égal, pas plus récent
  );
  const res = await checkForUpdate(opts, APK_ASSET_NAME);
  assert.equal(res.status, 'up-to-date');
  assert.equal(res.available, false);
  assert.equal(fakeCache.state.writes, 0, 'pas de write cache quand on est déjà à jour');
});

// ————————————————————————————————————————————————————————————————
// M-84 — `checkForUpdate` : le chemin available + write cache
// ————————————————————————————————————————————————————————————————

test('M-84 checkForUpdate : le versionCode cible > current → `available` + write cache', async () => {
  const fakeCache = makeFakeCache();
  const opts = makeOpts(
    {
      fetchLatestRelease: async () => makeRelease({ tag_name: 'v5', body: 'changelog v5' }),
      cache: fakeCache.cache,
    },
    1, // current = 1, cible = 5 → plus récent
  );
  const res = await checkForUpdate(opts, APK_ASSET_NAME);
  assert.equal(res.status, 'available');
  assert.equal(res.available, true);
  assert.equal(res.update?.versionCode, 5);
  assert.equal(res.update?.versionName, 'v5');
  assert.equal(res.update?.changelog, 'changelog v5');
  assert.equal(
    res.update?.asset.url,
    'https://github.com/joynagassi-cyber/aurora/releases/download/v5/app-release.apk',
  );
  assert.equal(fakeCache.state.writes, 1, 'le nouvel info est mis en cache (le 6 h suivant)');
});

// ————————————————————————————————————————————————————————————————
// M-84 — `checkForUpdate` : l'asset manquant → `error` (pas de fallback)
// ————————————————————————————————————————————————————————————————

test('M-84 checkForUpdate : un release SANS l\'asset `APK_ASSET_NAME` exact → `status:error`', async () => {
  const opts = makeOpts(
    {
      // Un release qui porte un AUTRE asset (ex. `.aab` ou `.ipa`) — le
      // plan exige l'asset exact, jamais un fallback silencieux.
      fetchLatestRelease: async () =>
        makeRelease({
          assets: [{ name: 'app-release.aab', browser_download_url: 'https://example.test/a.aab' }],
        }),
    },
    1,
  );
  const res = await checkForUpdate(opts, APK_ASSET_NAME);
  assert.equal(res.status, 'error');
  assert.equal(res.available, false);
  assert.ok(
    res.error?.includes(APK_ASSET_NAME),
    `l'erreur mentionne le nom d'asset exact (le CI a produit un mauvais binaire ?)`,
  );
});

// ————————————————————————————————————————————————————————————————
// M-84 — `checkForUpdate` : le tag non-parsable → `error`
// ————————————————————————————————————————————————————————————————

test('M-84 checkForUpdate : un tag non-parsable (`v2.1.0` sans hint) → `status:error`', async () => {
  const opts = makeOpts(
    {
      fetchLatestRelease: async () => makeRelease({ tag_name: 'v2.1.0' }),
    },
    1,
  );
  const res = await checkForUpdate(opts, APK_ASSET_NAME);
  assert.equal(res.status, 'error');
  assert.equal(res.available, false);
  assert.ok(res.error?.includes('v2.1.0'), 'l\'erreur porte le tag fautif');
});

// ————————————————————————————————————————————————————————————————
// M-84 — `checkForUpdate` : le fetch levée → `error` (try/catch global)
// ————————————————————————————————————————————————————————————————

test('M-84 checkForUpdate : un fetch qui lève → `status:error` (l\'app ne plante JAMAIS)', async () => {
  const opts = makeOpts(
    {
      fetchLatestRelease: async () => {
        throw new Error('ECONNREFUSED (offline)');
      },
    },
    1,
  );
  const res = await checkForUpdate(opts, APK_ASSET_NAME);
  assert.equal(res.status, 'error');
  assert.equal(res.available, false);
  assert.ok(res.error?.includes('ECONNREFUSED'), 'le message d\'erreur est lisible');
});
