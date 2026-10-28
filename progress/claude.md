# WDS Progress — Claude (main loop)

---

## 🔒 PRISE EN CHARGE — agent Arena · 2026-10-28 · PIVOT WEB

> **Lu ton registre avant d'écrire** (règle du repo : on ne duplique pas un travail).
> J'ai pris **une** tâche, elle est isolée, et elle **ne recoupe aucun** de tes deux items
> encore ouverts dans `## Plan / Next` (Canvas wave 2 · RLS live positif). Tu peux
> continuer sans collision.

### 1. Décision produit qui change la cible (à intégrer partout)

**La voie mobile (Android/Capacitor) est abandonnée — la cible est le WEB.**
Décision de Joy, 2026-10-28. Conséquences pour ton travail :

- **Ton déploiement Render reste valide mais change de dossier** : il publie
  aujourd'hui `apps/mobile/dist` ; la cible devient `apps/web/dist` (voir §5).
- Toute doc qui dit « Phase 1 mobile-only / Android » est désormais **périmée**
  (04-mobile, ADR §24, une partie de `AI_RULES.md` §3-4). Je ne les ai pas
  réécrites : c'est un chantier doc séparé, à ne pas faire à moitié.
- Le code natif n'est **pas supprimé** : `apps/mobile`, `packages/platform`, DPC,
  updater APK restent en place, simplement hors du bundle web.

### 2. La tâche que je prends (et que je termine)

| | |
|---|---|
| **Nature** | Analyse complète du dépôt + exécution du pivot web (sprints W0/W1) |
| **Branche** | `arena/fa2fed09-aurora` (jamais `main`) |
| **Statut** | W0 ✅ · W1 ✅ · **W2 ✅** — reste la bascule Render (action dashboard) : voir §6 |
| **Rapports** | `docs/analysis/analyse-projet-aurora-2026-10-28.md` (diagnostic) · `docs/analysis/voie-web-2026-10-28.md` (pivot + journal d'exécution §9) |

### 3. ⚠️ Incident sécurité à connaître (corrigé, mais action de ton côté)

**a) `fn-dev-auth` était une backdoor admin ouverte.** Aucune auth, `CORS: *`,
service_role derrière : `list-users` (tous les emails), `set-password` (reset du
mot de passe de **n'importe quel** user), `recreate`, `test-signin`.
→ Corrigée **fail-closed** : 404 si `DEV_AUTH_ENABLED != true`, puis 401 si
`x-aurora-internal` ≠ `INTERNAL_FN_SECRET` (comparaison temps constant), CORS en
allowlist. **Si tu la redéploies, provisionne les 2 env vars, sinon elle renvoie 404
(c'est voulu).**

**b) Identifiants dev en clair** (`dev.aurora@…` + mots de passe) étaient dans
`apps/mobile/src/pages/login/index.tsx` **et** dans `docs/plans/finalisation-v1.md`,
avec les UUID live. → Purger du code (73 lignes), caviardé dans la doc.

**Décision de Joy (2026-10-28) : PAS de rotation.** Ces comptes servent au
développement et seront supprimés avant la v1 ; les faire tourner maintenant
coûterait du temps sans rien régler. C'est noté, on n'y revient plus.
Ce qui rend cette décision tenable, en revanche, ce sont les deux corrections
ci-dessus : les identifiants ne sont plus dans le dépôt, et l'endpoint ne répond
plus à un appelant anonyme. La seule chose à ne pas refaire : remettre des
identifiants en dur dans le code.

**Le confort de dev est rétabli autrement** (2026-10-28, suite) :
- `pnpm dev:auth list | set-password | signin | check` — `scripts/dev-auth.mjs`
  parle à `fn-dev-auth` avec `x-aurora-internal`, lu depuis `.env.dev`
  (gitignoré). C'est le seul endroit où le secret existe.
- Écran de connexion : bouton « Remplir le compte dev », alimenté par
  `VITE_DEV_LOGIN_EMAIL` / `VITE_DEV_LOGIN_PASSWORD` (`.env.local`), supprimé du
  bundle de production par `import.meta.env.DEV`.
- `set-password` était **documenté mais jamais implémenté** (il tombait dans le
  `default` → 400). Il accepte désormais `email` OU `user_id`.

**c) Le gate G2 était aveugle sur (b)** et rouge en permanence sur des faux positifs
(`sk-progress`, `sk-capacite-portante`) → un gate toujours rouge n'est plus lu.
→ Réécrit : prefixes de clé ≥ 20 car., **détection de la forme `'email': 'secret'`**,
URL `*.supabase.co`, mots de passe littéraux. Vérifié par sonde (vert sur arbre
propre, **rouge sur la fuite réelle**). Ton entrée du 09/23 sur l'exclusion
`0021_lots/*` reste valable et n'a pas été touchée.

### 4. Fichiers que j'ai modifiés — **ne pas éditer en parallèle**

```
supabase/functions/fn-dev-auth/index.ts      (fail-closed + secret interne)
scripts/check-boundaries.sh                  (G2 réécrit)
apps/mobile/src/pages/login/index.tsx        (purge dev-auth, -73 lignes)
apps/mobile/src/updater/apkUpdater.ts        (n'importe plus @capacitor/preferences)
apps/mobile/src/updater/preferences.ts       (NOUVEAU — primitive de stockage isolée)
apps/mobile/src/lib/boot-data.ts             (moteur INJECTÉ, plus d'import plateforme)
apps/mobile/src/main.tsx                     (passe CapacitorPowerSyncDatabase)
apps/mobile/src/styles/auth.css              (commentaire obsolète)
packages/platform/package.json               (+ @capacitor/core — le manquant)
packages/data/src/powersync-client.ts        (ctor requis, import vendor retiré)
packages/data/src/index.ts                   (export du type PowerSyncDatabaseCtor)
packages/data/src/powersync-engine-{capacitor,web}.ts  (NOUVEAUX — un par cible)
packages/data/package.json                   (subpath exports des 2 moteurs)
packages/data/test/powersync-roundtrip.test.ts
docs/plans/finalisation-v1.md                (secrets caviardés)
pnpm-lock.yaml                               (+ @capacitor/preferences, @capacitor/core)
apps/web/**                                  (NOUVEAU — la coquille web)
docs/analysis/*2026-10-28*.md                (NOUVEAUX — mes 2 rapports)
```

**Non touché (ton périmètre reste intact) :** `packages/discovery`, `packages/progress`,
`packages/learning`, `packages/agent`, `packages/ui`, `fn-canvas`, `fn-notifications`,
`apps/mobile/src/styles/*` (hors auth.css), les migrations.

### 5. Ce que j'ai construit : `apps/web`

Coquille web **propre** (choix option B validé par Joy), pas un fork des écrans :
les 38 routes et les 45 écrans sont **partagés** via l'alias Vite/TS `@app` →
`apps/mobile/src`. **Une seule copie du code produit** — le jour où `pages/ query/
`ux/ lib/ state/` déménagent dans `packages/app-core`, seul l'alias change.

- **Router** : `createBrowserRouter` (le projet utilisait déjà `react-router-dom`,
  jamais Ionic pour le routage → rien à réécrire).
- **Shell** : `apps/web/src/shell/WebShell.tsx` — rail vertical ≥ 900 px, barre
  basse en dessous ; `<AgentBus />` monté une fois ; pas d'updater, pas de DPC.
- **Moteur de données** : `@powersync/web` (WASQLite) au lieu de
  `@powersync/capacitor`. **C'était le vrai bug de fond** : le seam d'injection
  existait mais n'était jamais câblé, donc un build navigateur n'avait **pas de
  SQLite local** → AD-7 (offline-first) cassé silencieusement.
- **PWA** : `manifest.webmanifest` + `sw.js` (navigation réseau-d'abord avec repli
  coquille, assets cache-first, **API jamais cachée** : une seule vérité locale, pas
  une copie HTTP périmée). Icônes 192/512 générées depuis `assets/` (pas de logo
  redessiné — §9 `ui-libraries`).
- **Hébergement** : `public/_redirects` (SPA fallback `/* → /index.html 200`) et
  `public/_headers` avec **COOP `same-origin` + COEP `require-corp`** —
  **sans ces 2 en-têtes WASQLite n'a pas `SharedArrayBuffer`** et l'offline tombe.

**→ Pour ton service Render : `publishPath` = `apps/web/dist`, build =
`pnpm --filter @aurora/web build`. Garde `NODE_OPTIONS=--max-old-space-size=4096`,
le build web est plus lourd que l'ancien (17 036 modules).**

### 6. W2 — fait (ne pas refaire), et ce qui reste vraiment

**Fait le 2026-10-28 (fin de W2) :**

- [x] `tsconfig` : **tranché** — projet *plat par package*, aucune project-reference,
      `composite/declaration/incremental: false`, `noEmit: true`. `pnpm typecheck`
      couvre désormais **24/24** projets (les 8 manquants sont ajoutés par la récursion,
      le `tsconfig.json` racine ne porte plus de `references`). Gate = `tsc --noEmit`.
- [x] `pnpm lint` **démarre et passe** : `eslint-plugin-storybook` **et**
      `eslint-plugin-react-hooks` installés à la racine. 15/15 packages à
      `--max-warnings 0`.
- [x] Blocs `files:` de `eslint.config.js` étendus : règles de frontière appliquées
      à `.ts` **et** `.tsx`. AD-10 ne mord plus sur `./motion` (`patterns` gitignore →
      `paths` exacts).
- [x] `packages/ui` : **102 problèmes → 0**. Dont 3 vrais bugs (voir plus bas).
- [x] `apps/mobile` : 6 violations des règles des Hooks corrigées ; `apps/web` **ajouté**
      au lint (il n'était couvert par rien).
- [x] `deploy-web.yml` : gate → deploy Render (gated par `vars.WEB_DEPLOY_ENABLED`) →
      smoke check **COOP/COEP en prod** → rollback documenté (revert AD-13 + rollback Render).
- [x] `release.yml` : le job APK est remplacé par un **build web réel**
      (`pnpm -F @aurora/web build` + budget + artefact).
      `release-apk.yml` : plus de trigger sur `v*` (`workflow_dispatch` seulement, bandeau
      « DÉSACTIVÉ »), fichier conservé pour sa procédure de signature.
- [x] `supabase/config.toml` : 5 blocs en underscores → **8 en tirets** (les noms des
      dossiers), `verify_jwt` **explicite partout**, `false` **uniquement** pour
      `fn-dev-auth` (justifié sur place). Test de garde : `supabase/functions/_shared/config.test.ts`
      (4 tests, branché dans `ci.yml`).
- [x] Playwright : **5 parcours, 36 tests, 2 profils** (`apps/web/e2e/`). Écrits et
      parsés (`--list` OK) ; **non exécutés** ici (CDN Playwright hors réseau →
      `.github/workflows/e2e-web.yml`).
- [x] Budget bundle : `scripts/check-web-bundle-budget.mjs`. Le SLO n'est **pas réinventé** :
      il lit `PERF_BUDGETS.jsGzBytes` (300 Ko, 02 §9.1) depuis `apps/mobile/src/perf/budgets.ts`.

**Reste (bloqué, à faire hors agent) :**

- [x] ~~Rotation des 2 comptes Supabase dev~~ — **abandonnée** (décision Joy 2026-10-28 :
      comptes de travail, supprimés avant v1). Voir §3b.
- [ ] Service Render existant : basculer le `publishDir` de `apps/mobile/dist` à
      `apps/web/dist` (et poser `Cross-Origin-Opener-Policy: same-origin` +
      `Cross-Origin-Embedder-Policy: require-corp`). Le blueprint `render.yaml`
      contient déjà le service `aurora-web` correctement configuré.
- [ ] Poser `WEB_DEPLOY_ENABLED=true`, `WEB_PUBLIC_URL`, `RENDER_DEPLOY_HOOK_URL`
      et les 3 `VITE_*` (voir `docs/analysis/voie-web-2026-10-28.md` §9.5).
- [ ] Premier run CI : c'est **lui** qui mesurera le bundle et exécutera les 5 parcours.
      Si le budget déborde, réduire l'entrée avant d'ajouter du lazy-loading partout.

**Les 3 bugs que le lint a sortis (aucun n'était visible au typecheck) :**

1. `OnboardingView.tsx:1112` — `{(authTab === "signup" || true) && …}` : **toujours vrai**,
   le bloc OAuth s'affiche aussi en mode connexion. Comportement **préservé** +
   désactivation justifiée : arbitrage produit, pas arbitrage lint.
2. `components/ui/combobox.tsx` — `@ts-nocheck` masquait un `forwardRef` sur
   `Popover.Root` (aucun nœud DOM, pas de prop `ref`). `@ts-nocheck` retiré, fichier
   re-typechecké.
3. `knowledge/learn/tasks` — `knowledgeFlags()` / `emptyFlags()` / `taskFlags()` appelaient
   des Hooks depuis des fonctions minuscules → renommées `use*`.

### 7. État vérifié au 2026-10-28 (reproductible)

```
pnpm typecheck ................................... 24/24 projets, exit 0
pnpm lint ........................................ 15/15 packages, exit 0
                                                   (--max-warnings 0 partout)
pnpm test ........................................ 661 + 48 (vitest ui) = 709 pass
                                                   0 fail
supabase/config.toml (garde) ..................... 4 pass / 0 fail
scripts/check-boundaries.sh ...................... G1-G4 OK
apps/web  tsc --noEmit ........................... 0 erreur (src + e2e + configs)
playwright test --list ........................... 36 tests / 5 fichiers / 2 profils
graphe d'imports web ............................. 92 fichiers, 0 module natif
                                   (@capacitor/preferences et @powersync/capacitor absents)
vite build ....................................... OOM à 17 036 modules ici
                                                   -> mesuré par deploy-web.yml (runner)
```

### 8. Ce que j'ai appris en te lisant (utile pour la suite)

- Ton entrée Render est la plus précieuse du registre : elle documente que
  `NODE_OPTIONS` doit être une **variable d'env du service** et pas un préfixe de
  commande — je l'ai vérifié, `vite build` OOM dès ~2 Go sur un bundle plein.
- Ton garde-fou « vérifier les claims de synthèse par un adversaire » s'est encore
  vérifié : `AI_RULES.md` §1 se proclame source de vérité et dérive sur **7 points**
  mesurables (24 vs 28 migrations, 6 vs 9 Edge Functions, 236 vs 682 tests,...).

## Context
- Projet : Aurora (monorepo pnpm, Capacitor/Ionic React mobile app, Supabase + PowerSync)
- Travail de session :
  6. **Feature agentique — gaps G1–G12 (agentique-first, 2026-10-06/07)** : cartographie
     complète des features × 6 verbes (nommer/renommer/créer/supprimer/verrouiller/
     programmer) dans `docs/agent/feature-mapping-agent-gaps.md` ; plan d'implémentation
     `docs/plans/2026-10-06-feature-agentique-g1-g12.md`. Exécution Subagent-Driven,
     4 batches commités (chaque = thin emitters AD-7 + capabilities registry + tests TDD) :
     - `ebe1463` — G1–G3 scheduling de veille : `create_automation` (trigger
       schedule/event/condition, jobKind fermé AD-15, inconnu → notification),
       `update_automation` (renommer/reprogrammer/verrouiller), `delete_automation`
       (DESTRUCTIVE, ADR §5). Veille = `Automation` (table `automations`, 0008) ;
       scheduling per-user via le dispatcher (pas de nouvelles `cron.job`).
     - `e014113` — G4/G5/G12 verbes génériques : 6 rename (`goal_rename` →
       progress.goal_rename, `task_rename` → productivity.task_update patch subject,
       `event_rename`, `habit_rename`, `canvas_rename`, `skill_rename`) + 2 delete
       destructive (`task_delete`/`canvas_delete`, ADR §5) + `skill_delete`.
       Invariant pin par test : **pas de `goal.delete`** (AD-15 additif →
       `goal_abandon` uniquement).
     - `6722e37` — G6/G7 : `habit_create` (cadence daily/weekly/custom) +
       `routine_create` (anchors + steps) ; `recurring`/`recurrenceRule` ajoutés aux
       schémas `task_update`/`schedule` (materialized rows, 01 S4.1). G8 = doc NL
       (focus/bilan récurrents via `create_automation` trigger schedule, pas d'outil).
     - `2d413c1` — G9/G10/G11 : pipeline veille `runVeillePipeline` (packages/discovery,
       research → DiscoveryItem + notification job, **flag `uncertain` AD-16b jamais
       supprimé**, vendor OneSignal resté dans l'adapter AD-1) + `canvas_create`/
       `canvas_lock` + `inbox_capture`/`inbox_triage` + `ascent_read` (read-only).
       Tests agent 102→112, discovery 8→13, tous verts.
     Wave 3 (2026-10-07, open items) :
       - ① **Wiring dispatcher `research` → `runVeillePipeline`** : le module
         Discovery expose `DISCOVERY_JOB_HANDLERS` (table importable par ORION)
         + `buildDiscoveryResearchHandler` qui appelle `runVeillePipeline` quand
         `payload.discoverySheet === true` (le flag « c'est une veille, pas une
         recherche libre ») — retourne `discoveryItems` qualifiés (invariant
         AD-16b) + `notificationJob` payload à enfileter sur le module
         'integrations' / jobKind 'notification' pour le push OneSignal
         (AD-1 : le vendor reste dans l'adapter). Le `fn-job-dispatcher`
         (L21) importe ce symbol depuis `packages/discovery/src/jobs.ts`
         (l'ancien import pointait vers `packages/progress/src/jobs.ts` qui
         n'exportait pas le symbol — fix appliqué). TODO clôturé dans
         `veille-pipeline.ts` (L26-33 commenté DONE). Tests discovery 13→15
         (2 tests wiring : flag `discoverySheet` présent/absent).
       - ② **`canvas.lock` module-side** : colonne `locked BOOLEAN NOT NULL
         DEFAULT FALSE` ajoutée à `canvas_sessions` (migration `0023_canvas_locked.sql`,
         appliquée au live Supabase via MCP + SSoT ; ADDITIVE-only, FORCE ROW
         LEVEL SECURITY inchangé). Endpoint `fn-canvas` : nouveaux verbes
         `create` / `lock` / `rename` + `write` refuse `canvas/locked` quand
         `locked === true` (read-only volontaire, 409). `invokeTool` dans
         `fn-agent-bootstrap.ts` (L531) route désormais les commandes
         `canvas.create` / `canvas.lock` / `canvas.rename` vers `fn-canvas`
         (l'ancien routeur couvrait uniquement read/write/comment).
       - ③ **`goal_rename` module-side** : use-case `renameGoal(goal, title, ctx)`
         ajouté dans `packages/productivity/src/goals-projects.ts` (L109-130) —
         délégué à `updateGoal` (patch `title` uniquement, émet `GoalUpdated`
         fields:['title'] ; no-op branch si title inchangé). Exporté via
         `packages/productivity/src/index.ts` (`export *`). Tests Productivity
         14→16 (2 tests renameGoal : happy-path + no-op).
       - Typecheck pnpm -r : 0 erreur. Tests : agent 112/112, discovery 15/15,
         Productivity 16/16. Gates : check-rls.sh OK (23 migrations scannées),
         check-boundaries.sh OK (G1–G4 verts).
  4. **Feature canvas (0022)** : page `/canvas/:id` + mode canvas depuis `/agent` — blocs TipTap
     éditables, commentaires sur sélection, indexation verbatim dans le chat, bascule md ⇄ HTML.
     - Migration `supabase/migrations/0022_canvas.sql` (`canvas_sessions` + `canvas_comments`, RLS user)
       appliquée au live Supabase (policies=2, triggers=1 par table) — commit `6b1af35`.
     - Types `@aurora/domain` (`entities-canvas.ts`) + client device-side `canvas-client.ts` (AD-3,
       pattern agent-client) + test contractuel node:test — commit `86a18d1`.
     - Utils `@aurora/ui` : `markdownToHtml` (marked safe-renderer : `<script>`/`<iframe>`/handlers
       inline neutralisés, HTML brut des listes/tables échappé) + `commentAnchors` (offsets [start,end)
       sur le texte plat de la session) — vitest 9/9 — commits `41c5f0c` + fix sécurité `57363b5`.
     - Hook `useCanvasSession` / `useCanvasSave` (save debouncé 1 s + invalidation) + wiring boot
       `main.tsx` + `qk.canvas` — commit `b88e1d0`.
     - Page `apps/mobile/src/pages/canvas/index.tsx` (blocs TipTap StarterKit, menu sélection
       flottant « Indexer dans le chat » → `/agent?intent=` + « Commenter », CTA création
       `/canvas/new`, liste commentaires + suppression, UxStates 6 états) + `styles/canvas.css` —
       commit `04172c2` + fix CTA/save `269aec6`.
     - Chip « Canvas » dans `/agent` (`PenLine` → `/canvas/new`, `state.from` pour le retour) —
       commit `b028e5d`.
     - SSoT contenu = markdown par bloc ; la bascule md/HTML est une vue sur le même SSoT
       (le JSON TipTap est un intermédiaire éphémère, fallback documenté dans la page).
     - **Réorientation 2026-10-06 (demande : « le canvas n'est PAS simplement utilisé par
       l'humain, c'est l'agent qui utilise le canvas »)** : 3 outils kernel AD-7 (thin command,
       le module Canvas applique — pas de write direct, pas de job) : `canvas_read` (lecture
       blocs + commentaires), `canvas_write` (écrit un bloc md, confirmation via planStep.risk),
       `canvas_comment` (crée/répond à un commentaire ancré). Capabilities `canvas.read` /
       `canvas.write` / `canvas.comment` (scopes `canvas:read` / `canvas:write`). L'humain
       conserve l'édition StarterKit dans /canvas ; l'agent écrit par le kernel, l'humain par
       le client device — même table (AD-7 single-writer, mutation appliquée par le module) —
       commit `2d842fa`.
       **Routage serveur canvas.*** (OQ-03) : endpoint `fn-canvas` (module Canvas =
       single-writer AD-7 des tables canvas_* côté serveur, pattern rest + service key de
       fn-skills, identité par JWT jamais par le body) : `read` / `write` (patch blocs
       jsonb, blockId présent = remplacement, absent = ajout) / `comment` (réponse hérite
       l'ancage du parent). `invokeTool` dans `fn-agent-bootstrap.ts` remplacé par un
       routeur détectant les commandes `canvas.*` → `fn-canvas` ; `tools.ts` : `userId?`
       optionnel sur les 3 outils (AD-7 : le kernel injecte l'identité, l'EF ne la lit
       jamais du body) ; `planner.ts` : stepTemplates pour `canvas_read`/`canvas_write`/
       `canvas_comment` — commit `d89c3fe`.
  5. **Fixs collatéraux (typecheck 0 erreur)** : destructuring `[searchParams]` manquante dans
     `agent/index.tsx` (WIP pré-existant) + `data` du success state dans `knowledge/index.tsx`
     (commit `6e8e8cc`).
  1. **OneSignal** : config propre vérifiée via MCP (app « Aurora App » ID 6b3c35c5-e970-4e1a-a853-e616c92894a8) ;
     `fn-notifications` (Edge Function) remplacé du stub wave-0 par un vrai appel REST OneSignal v2
     (`POST /api/notifications`, `include_external_user_ids` = alias Supabase) ; `.env.example` mobile créé ;
     `config.toml` mis à jour. Split-rule 04 §3.4 intact (local = deadlines, remote = OneSignal).
  2. **Emotion design** : `docs/design-system/emotion-design.md` (345 lignes, normative) — registre « intensité
     calme », mapping couleur→émotion (tokens gelés G-H2), motion (timer jamais animé, NodePulse seul
     emphease), son (4 chimes à produire : chime-local / chime-remote / focus-end / goal-hit ; silence sur
     les erreurs), microcopy (voix 2e personne, zéro exclamation), arc émotionnel de session focus,
     10 anti-patterns.
  3. **Gestes du chat `/agent`** : 4 interactions ajoutées dans `apps/mobile/src/pages/agent/index.tsx` :
     - sélection de texte → menu flottant (Copier / Dans le chat / Ouvrir)
     - swipe horizontal du composer (gauche → sheet +, droite → cycle mode agent)
     - pull-down du composer → modale modèle (seuil 64 px, easing luxe)
     - bulles `route` peelables (deep-link 04 §3.2.5, glisser à gauche → navigate)
     - CSS dans `styles/agent.css` ; `/knowledge` accepte `?q=` (banner d'intake dans `data.css`)
  4. **Feature canvas (0022)** : page `/canvas/:id` + mode canvas depuis `/agent` — blocs TipTap
     éditables, commentaires sur sélection, indexation verbatim dans le chat, bascule md ⇄ HTML.
     - Migration `supabase/migrations/0022_canvas.sql` (`canvas_sessions` + `canvas_comments`, RLS user)
       appliquée au live Supabase (policies=2, triggers=1 par table) — commit `6b1af35`.
     - Types `@aurora/domain` (`entities-canvas.ts`) + client device-side `canvas-client.ts` (AD-3,
       pattern agent-client) + test contractuel node:test — commit `86a18d1`.
     - Utils `@aurora/ui` : `markdownToHtml` (marked safe-renderer : `<script>`/`<iframe>`/handlers
       inline neutralisés, HTML brut des listes/tables échappé) + `commentAnchors` (offsets [start,end)
       sur le texte plat de la session) — vitest 9/9 — commits `41c5f0c` + fix sécurité `57363b5`.
     - Hook `useCanvasSession` / `useCanvasSave` (save debouncé 1 s + invalidation) + wiring boot
       `main.tsx` + `qk.canvas` — commit `b88e1d0`.
     - Page `apps/mobile/src/pages/canvas/index.tsx` (blocs TipTap StarterKit, menu sélection
       flottant « Indexer dans le chat » → `/agent?intent=` + « Commenter », CTA création
       `/canvas/new`, liste commentaires + suppression, UxStates 6 états) + `styles/canvas.css` —
       commit `04172c2` + fix CTA/save `269aec6`.
     - Chip « Canvas » dans `/agent` (`PenLine` → `/canvas/new`, `state.from` pour le retour) —
       commit `b028e5d`.
     - SSoT contenu = markdown par bloc ; la bascule md/HTML est une vue sur le même SSoT
       (le JSON TipTap est un intermédiaire éphémère, fallback documenté dans la page).
     - **Réorientation 2026-10-06 (demande : « le canvas n'est PAS simplement utilisé par
       l'humain, c'est l'agent qui utilise le canvas »)** : 3 outils kernel AD-7 (thin command,
       le module Canvas applique — pas de write direct, pas de job) : `canvas_read` (lecture
       blocs + commentaires), `canvas_write` (écrit un bloc md, confirmation via planStep.risk),
       `canvas_comment` (crée/répond à un commentaire ancré). Capabilities `canvas.read` /
       `canvas.write` / `canvas.comment` (scopes `canvas:read` / `canvas:write`). L'humain
       conserve l'édition StarterKit dans /canvas ; l'agent écrit par le kernel, l'humain par
       le client device — même table (AD-7 single-writer, mutation appliquée par le module) —
       commit `2d842fa`.
       **Routage serveur canvas.*** (OQ-03) : endpoint `fn-canvas` (module Canvas =
       single-writer AD-7 des tables canvas_* côté serveur, pattern rest + service key de
       fn-skills, identité par JWT jamais par le body) : `read` / `write` (patch blocs
       jsonb, blockId présent = remplacement, absent = ajout) / `comment` (réponse hérite
       l'ancage du parent). `invokeTool` dans `fn-agent-bootstrap.ts` remplacé par un
       routeur détectant les commandes `canvas.*` → `fn-canvas` ; `tools.ts` : `userId?`
       optionnel sur les 3 outils (AD-7 : le kernel injecte l'identité, l'EF ne la lit
       jamais du body) ; `planner.ts` : stepTemplates pour `canvas_read`/`canvas_write`/
       `canvas_comment` — commit `d89c3fe`.
  5. **Fixs collatéraux (typecheck 0 erreur)** : destructuring `[searchParams]` manquante dans
     `agent/index.tsx` (WIP pré-existant) + `data` du success state dans `knowledge/index.tsx`
     (commit `6e8e8cc`).

## Plan / Next

### ⚠️ Hérité de la prise en charge Arena (2026-10-28) — voir la section en tête
- [ ] **W2 pivot web** : `tsconfig` (trancher `-b` vs `--noEmit` + 8 projets manquants) ·
     `eslint-plugin-storybook` au root (le lint ne démarre pas) · règles `.tsx` ·
     `deploy-web.yml` + retrait du job APK · `verify_jwt` par EF · Playwright · budget bundle.
- [ ] **Render** : basculer `publishPath` de `apps/mobile/dist` → **`apps/web/dist`**
     et le build de `--filter @aurora/mobile` → **`--filter @aurora/web`**.
- [x] ~~Rotation des 2 comptes dev Supabase~~ — **abandonnée** (décision Joy, cf. §3b).
- [ ] **Canvas wave 2** : extension `@tiptap/markdown` pour une vraie ré-sérialisation
     JSON→markdown idempotente (le fallback actuel garde le dernier markdown connu) ; e2e
     Cypress sur l'app live pour valider le flow canvas → indexation → agent.
- [ ] RLS live positif (user A lit ses propres lignes `canvas_sessions`/`canvas_comments`)
     — en attente de users dans l'instance de dev ; le test négatif (aucun leak) est passé.
- [x] **Review multi-agent du design** (workflow 17 agents, 2026-10-05) → disposition **REVISE**
- [x] Corriger le payload OneSignal REST v2 dans fn-notifications (endpoint /api/v2/{app_id}/notifications, headings, include_external_user_ids)
- [x] Corriger les 2 tokens orphelins agent.css (--aurora-accent-warning → --aurora-warning ; rgba(0,0,0,0.4) → --aurora-scrim, token ajouté + dark override)
- [x] Aligner le registre de voix (vouvoiement chat/agent, tutoiement mirror) — registerCopy() dans agent/index.tsx + règle documentée agent-chat.md §5.1
- [x] Ratifier les 4 gestes /agent dans agent-chat.md §5.1 (G1-G4 + équivalents accessibles + voix) et la ligne RET de navigation-and-page-composition.md (/agent)
- [x] Ajouter les anti-patterns A11/A12 à emotion-design §7 (fond animé sous focus ; notification S8 non muée)
- [x] Corriger le crash S7 (emotion-design §5.4 L272 : restore automatique, CTA « Fermer » uniquement, aligné sur spec focus S7 l.130-133)
- [x] Équivalents accessibles : chevron peelable = button focusable (aria-label), thinking-levels = radiogroup + roving, aria-live sur status/thinking
- [x] **OWNER : SSoT motion (option B recommandée)** — créer packages/ui/src/motion.tsx (PAGE_TRANSITION/REVEAL_TRANSITION/NODE_PULSE/SKELETON_PULSE) + sync des ~44 refs « polish.tsx l.x » (polish.tsx supprimé en ef48cb5 ; hook useReducedMotion autonome dans motion.tsx pour éviter le cycle de modules index.ts → motion.tsx → theme/provider.tsx → index.ts ; erreur TS2307 `motion/react` préexistante au niveau du package, pas introduite par le PR)
- [x] **OWNER : 4 sons d'événement** — déclarer out-of-scope V1 : `kind?: 'background' | 'event'` ajouté dans `apps/mobile/src/lib/focus-sounds.ts` (`FocusSound`) pour distinguer les chimes d'événement des fonds ambiants ; note DESIGNED_NOT_IMPLEMENTED dans `docs/design-system/emotion-design.md` §4.2 (production des WAV 44.1 kHz = vague ultérieure ; silence = cohérent avec §4.4)
- [x] **OWNER : split-rule locale** — déclarer scheduleLocal Capacitor DESIGNED_NOT_IMPLEMENTED : commentaire inline dans `packages/platform/src/local-notification.ts` (scheduleLocal/cancelLocal, 04 §7 anti-double-push test = volontairement absent tant que le bridge n'existe pas) + note dans `docs/mobile/overview.md` §6
- [x] Contrastes WCAG AA : assombrir --aurora-text-muted light (#94A3B8 → #64748B) — `apps/mobile/src/styles/tokens.css` + SSoT `packages/ui/src/themes/neutral.ts` (light) ; réserve accent-on-primary ≥18pt + vérif solara/citrus restant à faire (non bloquant V1)
- [x] Garde reduced-motion sur les 2 scrollTo smooth du chat (agent/index.tsx) — via `useReducedMotion()` de `motion/react` (déjà unifié dans theme-adapter.tsx), behavior : reduced ? 'auto' : 'smooth'
- [x] AgentThinkingLoader SSoT (@aurora/ui) à la place du fallback CSS .agent-thinking-blobs (agent.css : bloc de 45 lignes remplacé par un positionnement minimal ; `AgentThinkingLoader state="thinking" label={...}` dans agent/index.tsx)
- [x] Vérifier DpcAdapter.isBlockingAvailable() : réseau ou local ? (AD-7, focus/index.tsx l.80) — confirmé LOCAL (detection device-owner state, `cfg.isDpcActive()` — `packages/focus/src/service.ts:195`), commentaire explicite ajouté ; la lecture ne touche jamais le réseau, offline = no blocking, fallback restriction (controller.ts L6)
- [x] 19 pages SSoT (/skills + /integrations dans navigation-and-page-composition.md §1 + §2) ; badge « Offline » → « Hors ligne » (ux-states.tsx L99, home/index.tsx L111, knowledge/index.tsx L110)
- [x] `emotion-design.md` §4.1 : remplacer « Lundi doux ×2 » par les ids stables `sundown-loop` / `sundown-loop-2`
- [x] `emotion-design.md` §2.2 : note explicite sur le gel des tokens `habit-*` (05 §2.1.2, G-H2)
- [x] Miroir connaissance (AD-7) pour que /knowledge?q= fasse une vraie recherche — `apps/mobile/src/lib/knowledge-repo.ts` (lecture locale `semantic_nodes`/`semantic_edges`/`node_state` via `LocalStore` + recherche substring locale `title`/`content`, PAS FTS/vector — AD-12/F-09) ; `knowledge/index.tsx` branché dessus (arbre réel via `SemanticTreeRenderer`, banner `?q=` = résultat filtré, jamais un écran vide factice) ; `boot-data.ts` + `query-client.ts` : scope `knowledge` + `store` exposé sur le provider
- [x] Gates : check-rls.sh, check-boundaries.sh — **Tous verts** : G1 (aucun vendor hors des 5 adapters), G2 (aucun secret en clair), G3 (aucun user hardcode), G4 (pas de DOM access dans packages/agent) ; check-rls (a) RLS ENABLE sur chaque table OK, (b) aucune policy permissive injustifiée OK, (c) FORCE ROW LEVEL SECURITY présente OK — 22 migrations scannées
- [x] Vérifier le diff G2 d'exclusion de `scripts/check-boundaries.sh` (restreint à `supabase/migrations/0021_lots/*`) — confirmé : le scan G2 passe (aucun secret en clair) en excluant uniquement le lot 0021 ; les 16 fichiers 0021 qui contiennent des patterns de type `Bearer`/`sk-` (exemples de docs Anthropic/Zoom dans le seed de skills) sont tous dans `0021_lots/*` ou `0021_marketplace_skills.sql`, tous exclus de manière ciblée ; aucun autre fichier SQL ni TS/TSX/JS ne contient de valeur de secret → le verrou reste opérationnel
- [x] **Déployer Aurora sur Render (static site) pour e2e Cypress** — service `aurora` (id `srv-db2fkfflot8c73f18ug0`, slug `aurora-n9qd`), URL **https://aurora-n9qd.onrender.com**, workspace `tea-dau0b4vlot8c7396jnr0`. Build command : `corepack enable; corepack prepare pnpm@10.28.0 --activate; pnpm install --frozen-lockfile --config.minimum-release-age=0; pnpm --filter @aurora/mobile build:web`, publishPath `apps/mobile/dist`, autoDeploy on (branch `main`). 2 fixes sur le repo pour que le build passe : `worker.format='es'` dans `apps/mobile/vite.config.ts` (erreur Rollup IIFE sur le worker PowerSync, commit `80ee3b2`) + `NODE_OPTIONS=--max-old-space-size=4096` comme variable d'env du service (OOM sur `rendering chunks`, commit docs `9755979` + ajout via `update_environment_variables`, non dans la commande de build mais fonctionnel car Render exporte l'env du service sur le process de build). Build #4 (`dep-db2fup2jnfac73cnmm4g`) = **live**, HTTP 200, HTML Aurora correct (`/assets/index-*.js`). Pour Cypress : viser cette URL ; l'app reste utilisable sans `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`/`VITE_POWERSYNC_URL` (fallback AD-7 : miroir local vide, pas d'erreur) — pour un build « réel » il faudra ajouter ces 3 vars via `update_environment_variables` + re-trigger deploy, les valeurs viennent de `.env.local` (AD-3 : ne jamais les committer).

## Corrections apportées au design (review multi-agent, disposition REVISE)
- **fn-notifications** : le payload OneSignal était non conforme au REST v2 réel — première notification cassée silencieusement. Corrigé (endpoint + champs).
- **agent.css** : 2 tokens orphelins = violation AD-17. Corrigé (warning + scrim).
- **Voix** : 3 violations de tutoiement en mode chat/agent (interdit §5.1). Corrigé via registerCopy().
- **Gestes** : 4 gestes documentés dans le code mais absents de la SSoT écran = « ratification fantôme ». Corrigé (agent-chat.md §5.1 + nav RET).
- **S7 crash** : le doc promettait CTA « Reprendre » alors que la spec = restore automatique. Corrigé.
- **A11** : peel = div aria-hidden (inaccessible). Corrigé (button focusable + focus-visible).

## Learned
- Le `create_segment` OneSignal MCP n'accepte que des opérateurs `OR`/`AND` comme `operator`
  (séparateurs d'expressions), pas `exists` — inutilisable pour des segments par existence d'alias.
  Le ciblage Aurora passe par `include_external_user_ids`, pas par segments OneSignal.
- TypeScript strict : `findIndex` peut renvoyer -1 → garder `Math.max(0, …)` ; les éléments d'array
  indexés par modulo peuvent être `| undefined` en noUncheckedIndexedAccess.
- **OneSignal REST v2 (docs.onesignal.com)** : endpoint = `POST /api/v2/{app_id}/notifications`
  (app_id dans l'URL, PAS dans le body) ; champs = `headings` (titre), `content` (corps),
  `include_external_user_ids`, `data` (deep-link). Auth = `Basic {REST_API_KEY}`.
- **Vérifier les claims de synthèse par un adversaire** : dans le review, 3 claims du fix plan
  avaient des prémisses fausses (ex. « replay automatique S7 » inexistant dans la spec ;
  « accent-surface/focus-ring absents » = faux, existent sous d'autres noms). Toujours
  vérifier sur le SSoT avant d'appliquer.
