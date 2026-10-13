# Aurora — Desktop shell (spike Phase 0)

Shell Electron minimal qui réutilise le moteur PowerSync de `@aurora/data`
(le même chemin que `apps/mobile`, `boot-data.ts`), sans réécrire de moteur.

## Voie retenue (A)

- **`@powersync/web`** (WASQLite) instancié DANS LE RENDERER via le point
  d'injection du constructeur DB ajouté dans
  `packages/data/src/powersync-client.ts` :
  `createPowerSyncClientEngine(options, dbFactory?)` — le `dbFactory`
  par défaut reste `@powersync/capacitor` (`apps/mobile` non touché,
  zéro régression mobile vérifiée par le typecheck de `apps/mobile`).
- Le renderer importe uniquement `@aurora/data` + `@powersync/web` ;
  zéro `require('fs')` / `child_process` dans le bundle (vérifiable
  après `pnpm build` : `grep -r "require(" dist/` doit ne rien
  renvoyer de Node-OS).

## Voie B (non activée, à tester si A échoue au build empaqueté)

`@powersync/node` dans `main.cjs` (main process), exposé au renderer via
une IPC étroite `data:query` / `data:write` dans `preload.cjs`
(`contextBridge`, jamais de SQL arbitraire). Le `preload.cjs` actuel
est volontairement vide (sauf une bannière) pour prouver la règle :
le renderer n'a QUE ce que le preload expose.

## Checks (plan §32.7)

1. La base locale survit à kill + relaunch du **build empaqueté**
   (`pnpm dist` → `release/`), pas juste du dev server.
2. Les écritures offline partent au retour réseau
   (`engine.registerStatusListener` → `connected`).
3. Une ligne `user_context` écrite ici reparaît côté `apps/mobile`
   (même relay PowerSync Cloud, même flux `identity`, priorité 1).
4. Grep du bundle renderer : zéro API Node-OS.

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
