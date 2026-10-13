# PowerSync Desktop Spike — Plan d'implémentation (réécrit, sans doublon)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prouver que le moteur PowerSync existant du repo fonctionne dans un shell Electron empaqueté, réutilisant **à 100 %** ce qui est déjà là — sans recréer de package, de test, de moteur parallèle.

**Contexte vérifié (à ne pas re-découvrir) :**
- PowerSync est déjà opérationnel dans ce repo : service cloud `Development` (instance `6ab1612e8453e7cf8338ef9a`), relay branché sur Supabase `opagfyspdbhxthlxvlrk`, 10 flux auto_subscribe (`identity`, `productivity`, …, `ascent`), RLS per-user. **Le spike ne crée aucune table de test.**
- `packages/data` est le moteur réutilisé : `PowerSyncClientEngine` (`powersync-client.ts`, wrapper de `@powersync/capacitor`) + `AuroraPowerSyncSchema` + `SupabaseBackendConnectorImpl` + `LocalStore` bridge. C'est LE chemin production, pas un spike parallèle.
- `apps/mobile` consomme déjà `packages/data` avec Capacitor 7 + `VITE_POWERSYNC_URL`.
- `apps/desktop` **n'existe pas** — c'est la seule chose nouvelle que ce plan crée.
- Le doc de référence (§32.5) dit « deux voies : WASQLite web (à vérifier) ou `@powersync/node` dans le main process ». Le spike teste les deux et retient la voie qui marche.

---

## Task 0 : Prérequis (arrêt si non satisfait)

- [ ] `VITE_POWERSYNC_URL` présente dans `.env.local` (déjà lu : la URL relay n'est PAS dans `.env.local` actuellement, seulement `SUPABASE_URL`/keys — **vérifier** ; si absente, la récupérer du dashboard PowerSync `service.yaml` : « Development » EU, ou `powersync get service-config`).
- [ ] Une session Supabase user testable (1 user de l'instance, login fonctionnel) pour le check RLS.
- [ ] Node ≥ 20 sur la machine (le spike Electron, voie B, le demande).

Ce task ne crée aucun fichier. C'est un checkpoint.

---

## Task 1 : Shell Electron minimal (le seul code nouveau du plan)

Créé sous `apps/desktop/` — **pas** un spike isolé dans `spikes/`, pas un package séparé.

**Files:**
- Create: `apps/desktop/package.json`, `main.cjs`, `preload.cjs`, `index.html`, `renderer.jsx`
- Create: `apps/desktop/electron-builder.yml` (packaging)

**Réutilisation obligatoire (zéro réécriture) :**
- `renderer.jsx` importe `PowerSyncClientEngine` + `LocalStore` depuis `@aurora/data` (workspace dep) — le même code que `apps/mobile`.
- Auth Supabase : le `createClient` + login déjà dans `packages/data` (le `SupabaseBackendConnectorImpl`), pas un `createClient` ad hoc.

**Sécurité Electron non négociable (§17.1 du doc, vérifiée au step 4) :**
```js
new BrowserWindow({ webPreferences: {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  preload: path.join(__dirname, 'preload.cjs')
}})
```

**Voie A (tester en premier, la plus simple) — `@powersync/web`/WASQLite dans le renderer :**
`renderer.jsx` instancie le moteur avec `@powersync/web` à la place de `@powersync/capacitor`. Réalité vérifiée dans le code : `PowerSyncClientEngine` (line 38 de `powersync-client.ts`) a un `import { PowerSyncDatabase } from '@powersync/capacitor'` **dur** — il faut une ligne d'injection de constructeur (`createPowerSyncClientEngine(options, dbFactory?)`, le `dbFactory` par défaut restant `@powersync/capacitor` pour ne pas toucher `apps/mobile`). C'est le seul changement dans `packages/data` de tout le plan : 1 paramètre optionnel + 1 type, pas un 2e moteur, pas de refactor.

**Voie B (si A échoue en build packagé) — `@powersync/node` dans `main.cjs` :** le main process instancie le moteur Node, le renderer n'y accède que via `ipcRenderer.invoke('data:query', ...)` / `('data:write', ...)` validées dans le main (jamais de SQL arbitraire envoyé par le renderer). `preload.cjs` ne fait que `contextBridge`er cette petite API typée.

**Check de réussite (les 4, identiques aux §22/§32.7 du doc) :**
1. La base locale survit à kill + relaunch de l'**app empaquetée** (`electron-builder`, pas `npm start`).
2. Les écritures offline partent au retour réseau (checker `SyncStatus`).
3. Une ligne écrite ici apparaît dans `apps/mobile` (ou inversement) — même relay, même flux.
4. Aucun `require('fs')`/`child_process` dans le bundle renderer (grep du build).

**Commit:** `feat(desktop): shell Electron minimal + PowerSync (voie A/B, retenu au test)`

---

## Task 2 : Verdict + wiring du point d'injection (si la voie retenue l'exige)

- [ ] Noter dans `apps/desktop/README.md` : voie retenue (A/B), ce qui a échoué sur l'autre, les limits rencontrées.
- [ ] Si `createPowerSyncClientEngine` a dû être forké pour `@powersync/web` ou `@powersync/node` : vérifier que `apps/mobile` n'est PAS cassé (son chemin Capacitor reste intact) — c'est le test « pas de régression mobile » du §32.7.
- [ ] Optionnel, seulement si les 2 voies passent : extraire le code partagé dans `packages/platform` (contrat `PlatformServices` §32.3 du doc) — **ne pas le faire si une seule voie suffit** (YAGNI).

**Commit:** `docs(desktop): verdict PowerSync voie retenue + point d'injection engine`

---

## Out of scope (intentionnel, pas à faire dans ce plan)

- Aucune table de test (`spike_items`), aucune migration Supabase, aucune sync stream créée — tout existe déjà (10 flux).
- `assistant-ui` (déjà dep de `packages/ui` mais jamais branché) — plan séparé.
- `TaskEngine`/`TaskSpec`/`PolicyGate` — `packages/agent` est l'Agent Kernel Aurora, un périmètre différent du doc ; à trancher séparément.
- Le choix Vercel AI SDK vs TanStack AI (§25–28 du doc) — dépend du scénario de clé (BYOK vs Edge Function), à trancher séparément.

**Risque principal du plan (à signaler au checkpoint Task 1 si c'est le cas) :** si `createPowerSyncClientEngine` est trop collé à `@powersync/capacitor` pour être paramétrable sans régresser `apps/mobile`, c'est là que le plan s'arrête et qu'on décide si le point d'injection vaut le coup — pas une surprise tardive.
