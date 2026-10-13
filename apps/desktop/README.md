# Aurora — Desktop shell (spike Phase 0)

Shell Electron minimal qui réutilise le moteur PowerSync de `@aurora/data`
(le même chemin que `apps/mobile`, `boot-data.ts`), sans réécrire de moteur.

## Voie retenue (A)

- **`@powersync/web`** (WASQLite) instancié DANS LE RENDERER via le point
  d'injection du constructeur DB ajouté dans
  `packages/data/src/powersync-client.ts` :
  `createPowerSyncClientEngine(options, dbFactory?)` — le `dbFactory`
  par défaut reste `@powersync/capacitor` (`apps/mobile` non touché,
  zéro régression mobile : le typecheck mobile échoue **avant** comme
  **après** notre injection point — le défaut Capacitor est intact).
- Le renderer importe uniquement `@aurora/data` + `@powersync/web` ;
  zéro `require('fs')` / `child_process` dans le bundle (voir le check
  #4 ci-dessous pour la preuve réelle post-build).

## Voie B (non activée, à tester si A échoue au build empaqueté)

`@powersync/node` dans `main.cjs` (main process), exposé au renderer via
une IPC étroite `data:query` / `data:write` dans `preload.cjs`
(`contextBridge`, jamais de SQL arbitraire). Le `preload.cjs` actuel
est volontairement vide (sauf une bannière) pour prouver la règle :
le renderer n'a QUE ce que le preload expose.

## Checks (plan §32.7) — statut au 2026-10-13

| # | Check | Statut |
|---|-------|--------|
| 1 | La base locale survit à kill + relaunch du **build empaqueté** (`pnpm dist` → `release/`), pas juste du dev server | **À vérifier** sur un poste propre (nécessite `electron-builder` exécuté + double lancement du binaire, hors scope de cet environnement) |
| 2 | Les écritures offline partent au retour réseau (`engine.registerStatusListener` → `connected`) | **À vérifier** (nécessite un vrai lancement + coupure réseau, hors scope ici) |
| 3 | Une ligne `user_context` écrite ici reparaît côté `apps/mobile` (même relay PowerSync Cloud, même flux `identity`, priorité 1) | **À vérifier** (nécessite une session Supabase connectée + le mobile en regard) |
| 4 | Grep du bundle renderer : zéro API Node-OS | **PASS** |

**Preuve du check #4 :** `grep -rlE "require\(['\"](fs|path|os|child_process|crypto)['\"]\)" apps/desktop/dist/assets/` renvoie **zéro fichier**
(testé après `vite build` réussie). Tous les tokens `require(`/`process.`
présents dans `dist/assets/index-*.js` sont de la doc inline (JSDoc de
`supabase-js`, ex. `error.hint`) ou du vocabulaire UI littéral ("WebSockets
are required for this script."), **pas** une vraie API Node — le bundle
renderer n'expose aucun chemin Node-OS, comme exigé par la voie A.

**Build renderer : PASS** — `node node_modules/vite/bin/vite.js build`
(dans `apps/desktop`) produit `dist/` avec succès : chunks ESM +
`worker-<hash>.js` (PowerSync sync worker auto-suffisant, `worker.format =
'es'`) + `.wasm` WASQLite.

**Note Windows (à connaître pour quiconque relance le build ici) :** sur
cette machine, le binaire esbuild natif (`esbuild.exe` de
`node_modules/.pnpm/esbuild@0.21.5`) échoue à supprimer son propre
temp-file dans `%TEMP%` ("Accès refusé", verrou antivirus/indexer), ce qui
faisait planter `vite build` en phase "rendering chunks" à chaque essai.
Le fix, déjà engagé dans `apps/desktop/vite.config.ts` : `build.target =
'esnext'` + `build.minify = false`, ce qui fait rendre `null` par le plugin
interne `vite:esbuild-transpile` (voir `resolveEsbuildTranspileOptions` de
Vite : `!target || target === 'esnext'` ET `!minify` → pas de transpile
post-rollup du tout). Aucun appel au binaire esbuild natif, le build passe.
C'est le même `@powersync/web`/worker setup qu'`apps/mobile` — seule la
machine est en cause, pas le code.

## Config

- `.env.local` (git-ignored) : `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_POWERSYNC_URL` — les mêmes
  valeurs que `apps/mobile/.env.local` (copié, jamais dupliqué).
- La session Supabase est lue via `supabase.auth.getSession()` (le
  `createAuroraSupabaseClient` de `@aurora/data`, AD-3 : publishable
  key uniquement, RLS fait l'office). Pour tester le check #3, faire
  d'abord un login dans `apps/mobile` (même compte) puis relancer ce
  shell.

## Sécurité (non négociable, doc §17.1 / §32.6)

`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`,
navigation bloquée à l'origin locale (voir `main.cjs`).
