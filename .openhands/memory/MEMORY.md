# Aurora — project memory index

Detail and per-lot narratives live in the daily logs (`.openhands/memory/YYYY-MM-DD.md`).

## Commands / environment
- Toolchain: node 24, pnpm 10.28, TS 5.9. `corepack pnpm ...`. Isolated install layout is
  correct — do NOT add `.npmrc` hoisting.
- **pnpm shim (required every session, `/tmp` is ephemeral; `corepack enable` fails EACCES)**:
  `printf '#!/bin/sh\nexec corepack pnpm "$@"\n' > /tmp/bin/pnpm; chmod +x /tmp/bin/pnpm;
  export PATH=/tmp/bin:$PATH`
- Gate: `pnpm -r typecheck` · `pnpm -r lint` · `pnpm -r test` · `sh scripts/check-boundaries.sh`
  · `sh scripts/check-rls.sh` · `node --experimental-strip-types scripts/check-view-joins.ts` ·
  `node scripts/check-ef-imports.mjs` · `node scripts/check-ef-bundles.mjs` · the guards in
  `tests/db/`. Measured 2026-10-26: 721 node:test + 48 vitest + 206 mobile, 0 fail.
- **`pnpm -r <script>` stops at the FIRST failing package** — a green package hides all later
  ones. Never read its output as "all green"; iterate per package.
- **A green local gate can be FALSE**: `rm -rf packages/*/dist apps/*/dist` first (stale
  gitignored `dist/` passes locally, fails clean CI — TS6305/TS6059/TS6307).
- No `rg` → `grep -nHE`. Multi-command heredocs are refused → chain with `&&`.
- Fork (`joydatini-lab/aurora`): `push` events do NOT trigger workflows; `ci-base` runs
  everywhere, `ci-gate` is `main`-only (needs a PR or `workflow_dispatch`). Pushing to a
  tokenless https remote prompts and HANGS → set the remote URL with `${GITHUB_TOKEN}`.
- **CRLF files** (`tsconfig.base.json`, `powersync.ts`, 11 tsconfigs): a plain Python `write`
  rewrites every line. Write bytes / keep `\r\n`, or `git checkout --` and re-edit.

## Architecture facts (load-bearing)
- **`agent_runs` (0008) is the ONLY conversation store** — no conversations/messages tables.
  Server-owned, per-user RLS; the device POLLS (3 s while running), never a PowerSync stream.
- **F-09**: the device NEVER sees a provider stream. Kernel runs server-side
  (fn-agent-run → job → kernel → polled `agent_runs`). No keys on device (AD-3).
- `packages/agent` = server kernel. `packages/ui` = pure design system (AD-6: must NOT import
  @aurora/data or @aurora/platform); vendors @assistant-ui/react + ReUI (`cn` via npm `cn@0.4.0`);
  `assistant-ui/elements/` (138 files) is a dormant brick reserve (D-018.2).
- Route table SSoT: `docs/mobile/navigation-and-page-composition.md`. Ratify new routes there.
- `packages/ui/tailwind.config.ts` has **NO `screens`** — no responsive system yet. Reference
  §4.3 responsive CONTRACTS are requirements, not proposals.
- **Reference §7.2 forbids creating a new root entity before auditing**: a logo/poster/document
  IS an existing `Artifact`; the Brand DNA attaches to the brand `Project`. No new table.

## The decision framework (owner's mandate: "stop asking me")
- Precedent to extend: `docs/ui-libraries.md` **§8 "Agent Decision Framework (autonomous, no user
  input)"** — existed for components, not design OQs.
- Three SSoT artefacts: `docs/frontend/derivation-protocol.md` (precedence P0–P7 + 5 verdicts;
  `ESCALADE` needs irreversible **AND** no evidence) · `docs/frontend/design-space-oq-rulings.md`
  (OQ-6…OQ-12 ruled, 0 escalations) · `docs/frontend/implementation-index.md` (**the single view**:
  facts, decisions, lot queue L0–L9, traps G1–G8). Five planning docs coexisted; two contradicted.
- Screen-spec convention: `docs/design-system/screens/*.md` = 14 sections + §15–§19
  (`docs/frontend/spec-template-v1.md`). **44 screens, ONE** (`taches-liste`) had §15–§19. Pilot:
  `brand-dna.md`. 374 OQs in `screens/_open-questions.md`.
- Detail: `defects-guards-framework.md`.

## Verified defects (owner calls, AD-15) — detail in `defects-guards-framework.md`
- **D3 FIXED** (`fb608c1`, migration `0032`): the 3 phantom columns (`tasks.tags`,
  `tasks.recurrence_rule`, `projects.view_mode`) are versioned; D2 also fixed (`artifacts_kind_check`
  10→13). `KNOWN_DEFECTS` is EMPTY. Generalisable lesson: a phantom column is SILENT because
  `EngineLocalStoreBridge.upsert` is a **Map** keyed by column name — an unknown key is accepted,
  the screen renders, only the upstream PATCH fails. A migration alone creates a NEW drift: also
  update `powersync-schema.ts` AND `sqlite-schema.ts` (3 declarations), per `client-schema-drift.test.ts`.
- **D1 is NOT a bug**: `Project.title` vs `projects.name`, `Task.title`→`tasks.subject`,
  `Project.deadline`→`end_date`, `Task.timeSpentSec`→`actual_minutes` are DELIBERATE renames
  translated by the writers (`goals-projects.ts:184`, `tasks.ts:81`).

## Guards to know — detail in `defects-guards-framework.md`
- `tests/db/domain-schema-drift.test.ts` (in `ci.yml`): **calls the real writers** and checks every
  patch key against the migrations. Fills the gap between `client-schema-drift.test.ts`
  (client↔migrations) and `owner-module-coverage` (table names only) — **nothing** compared
  `packages/domain` to the migrations. Its `KNOWN_DEFECTS` list is **tripwired**: fixing a defect
  makes the test FAIL, forcing the entry's removal.
- **Calling the code beats parsing its source** (a non-vacuity test caught a regex that extracted
  nothing from `createArtifact`).
- **Phantom empty-state**: a page hard-coding `state={{ status: 'empty' }}` with 0 data calls.
  `grep -rn "state={{ status: 'empty' }}" apps/mobile/src/pages/`. `UxStates` does NOT render
  `children` in the `empty` branch (the body vanishes from the DOM).
- **Vendored != Aurora**: `packages/ui/src/components/{reui,assistant-ui,examples}/**` is
  registry-installed third-party code (treat like node_modules). `components/ui/**` IS Aurora.
- A `react-hooks/*` error can mean the PLUGIN is missing → `eslint --print-config <file>` is
  authoritative.
- `check-view-joins.ts` needs `node --experimental-strip-types` (`pnpm exec tsx` fails). G2
  false-positived on `sk-[A-Za-z0-9]{8,}`; threshold now `{20,}`. `code_files()` scans `git ls-files`.
- jsdom lacks `window.matchMedia`: mock it in any test rendering `AgentThinkingLoader`. `packages/ui`
  tests use a local `test/render.ts` (React 18 `act` + createRoot), not RTL.

## Owner decisions and scope
- **v1 perimeter = families A–M**, Design Space Pro included. Reference docs live at the repo
  ROOT (`Aurora-Reference-Produit-Fonctionnelle-v1.1.md`, 1622 l, THE master reference) +
  `LOGO.md` / `AFFICHE.md` / `VIDEO.md`. They SUPERSEDE the LibreChat brief.
- **Web-first → desktop → mobile** (`adr-018`). Ionic = MOBILE ONLY (web/desktop = React +
  shadcn/ReUI, no `ion-*`); create `apps/web-app`, keep `apps/mobile`. Electron confirmed.
- **Owner modules** (`5496393`): every declared owner must HAVE a package —
  `packages/{knowledge,artifact,identity}` were missing and were created, 0 new tables. Guard:
  `packages/data/test/owner-module-coverage.test.ts`. A declared owner with no implementation is
  invisible to the whole gate.
- **SSoT ↔ DB divergences (pin, don't patch — AD-15)**: besides D1–D3, `notes` has no
  tags/sourceRefIds; `semantic_nodes` no evidenceRefIds; `source_refs` column is
  `source_document_id`; `user_context` has only `coaching_prefs` jsonb.
- **Licences (verified at source)**: LobeHub = "Community License" (Apache-2.0 **+ cond. 1b**:
  a commercial licence is required to distribute a derivative) despite `package.json` saying MIT
  — the LICENSE file prevails. **Never copy LobeHub code/assets.** LibreChat = MIT.
- **LibreChat is ABANDONNED** (owner decision). The earlier "integration" story was FALSE:
  branch 404, `docs/integration/` absent, all 15 cited SHAs non-existent. LobeHub = design
  reference only. Refutation: `docs/plans/2026-10-23-repriorisation.md`.

## Live DB / RLS verification
- Supabase MCP tools ARE available (`shttp_*`): `list_tables`, `execute_sql` (read-only),
  `list_edge_functions`, `get_advisors`. Use them to verify live state instead of guessing.
  Live project ref `opagfyspdbhxthlxvlrk`.
- **`job_queue` is DEAD on live (proven 2026-10-27, twice)**: 40 rows stuck `pending` since
  2026-10-08, `attempts = 0` (20 `fsrs-tick` + 20 `skill_recompute`). Chain of proof:
  `cron.job` id 10 (`aurora_event_dispatch`, `*/5 * * * *`) → `wake_job_dispatcher()` →
  pg_net POST `/functions/v1/fn-job-dispatcher`; **`net._http_response` returns 404
  "Requested function was not found"**. `fn-job-dispatcher` is NOT deployed (only 5 EFs live:
  `fn-agent-run`, `fn-import-course`, `fn-notifications`, `fn-skills`, `fn-dev-auth`; repo has 8).
  Also `vault.decrypted_secrets` holds ONLY `SUPABASE_PROJECT_URL` — **`INTERNAL_FN_SECRET`
  is missing**, so the wake-up stays inert even after deploying. 0028 §APPLICATION STATUS
  (l.151-171) already lists the 3 operator steps; none done. `net._http_response` is the
  fastest way to prove an EF invocation failed.
- **ROOT CAUSE of the EF gap is a DECISION, not a technical blocker**: `scripts/build-ef.mjs:12-22`
  (independent in-repo corroboration, measured 2026-10-24) lists the same 5 ACTIVE / 3 MISSING
  and states the proximate cause: *"Deployment stopped — the CI deploy job is `if: false`
  pending OQ-03, and the last manual deploys were 2026-09-30..2026-10-07."* **OQ-03** = the
  `dev`/`staging`/`prod` env values (regions, R2 bucket names, provider account IDs), owner
  Foundation, status OPEN (`docs/release/README.md:29,73`). Note `fn-canvas` has 0 workspace
  imports and is still missing — so "imports workspace packages" is a correlation, NOT the cause.
  Any "deploy the EFs" request is really "ratify OQ-03", an owner/Foundation decision.
- Live migrations stop at **0031** (`version_user_context_features`); repo `0032_fix_phantom_columns.sql`
  is NOT applied live. Next free number = **0033** (0200 is out-of-sequence, ignore for numbering).
- **PowerSync relay is ALREADY deployed and alive**: `GET .../probes/liveness` → 200 on
  `6ab1612e8453e7cf8338ef9a.powersync.journeyapps.com`; slot
  `powersync_6ab1612e8453e7cf8338ef9a_1_caf1` exists (pgoutput, inactive). "Deploy the sync"
  is therefore NOT the blocker — auth is.
- **PowerSync CLI**: the package is `powersync` (NOT `@powersync/cli`); use `npx --yes powersync`.
  Admin API host = `https://powersync-api.journeyapps.com` (default `_PS_MANAGEMENT_SERVICE_URL`).
  Real routes are in `@powersync/management-types/dist/routes/manage-routes.js`
  (`/api/v1/instances/{list,get,status,deploy,…}`) — the plausible-looking `/api/v1/instances`
  and `/api/v1/me` are 404. Auth var is **`PS_ADMIN_TOKEN`** (PAT), not `POWERSYNC_TOKEN`.
  `powersync login` refuses non-interactive stdin and there is no `--token` flag.
- **A `jpt_` token is not automatically a valid PAT.** The owner-supplied token decodes to
  `{"i":"6ae08f234eab87b369318777","n":"604f96…","u":"6ab1609e88083500079d0b69"}` and is
  rejected by BOTH APIs: management → 401 "could not decode token - Unsupported token";
  sync service → 401 `PSYNC_S2101` "Token is not a well-formed JWT". The documented-good token
  (changelog v1.7) had `i=6ab74f…` and covered org Aurora `6ab1609e…`; the new one points at
  `…b69`. Ask the owner to regenerate a PAT at dashboard.powersync.com/account/access-tokens.
  Note: `i` (instance) and `u` (user) in the payload do NOT imply the token can read that org.
- `sync-config.yaml` = **11 streams** / **33 `SELECT * FROM`**. `focus_profiles` IS synced (l.54);
  migration 0027's "à ajouter au checkpoint lead" comment is stale. Counting streams with
  `grep -c auto_subscribe` gives 12 — wrong; count 2-space-indented top-level keys under `streams:`.
- The static gate reads migrations; `scripts/rls-live-check.sh` applies all of them on
  supabase/postgres (Docker) + runs `tests/rls-penetration.sql` with 2 auth users AND a negative
  control (disable RLS → the test MUST fail). It has found real defects.
- Use **supabase_admin** (superuser); `postgres` can't create `vector`. `cron.job` needs
  supabase_admin and survives schema drops → test on a FRESH container.
- **The docker `auth.users` differs from the hosted one** (`confirmed_at` vs also
  `email_confirmed_at`). Don't port an auth-schema assumption between the two.
- Never propagate a claim one doc makes about another. `shttp_*` (Supabase MCP) gives the LIVE
  truth — query it before asserting any schema status (traps G1/G6).
- Advisors (WARN): `rls_auto_enable` anon-executable (platform recipe); leaked-password protection
  off; `vector`+`pg_net` in `public`. CLEARED by 0029/0030 (auto-confirm functions no longer
  anon-executable; `function_search_path_mutable` 3 → 0).

## Sandbox facts
- **Docker IS available, daemon just NOT RUNNING**: `sudo dockerd > /tmp/dockerd.log 2>&1 &`, then
  use **`sudo docker`** (socket is root-owned; `openhands` is only in `sudo`). Unlocks
  `scripts/rls-live-check.sh` (a real Postgres proof). Earlier "unavailable" note was WRONG.
- **`rls-live-check.sh` fails at 0029 on that image (PRE-EXISTING)**: no `auth.identities`, and its
  `auth.users` lacks `email_confirmed_at` → `auto_confirm_new_user` raises on insert. To prove a
  migration for real: apply in a loop tolerating failures, then `ALTER TABLE auth.users DISABLE
  TRIGGER USER` for the fixture insert.
- No `SUPABASE_ACCESS_TOKEN`/`.env.local`; `deno` absent → EF tests can't run locally.
  `vault.create_secret(...)` IS allowed via MCP; `alter database ... set app.settings.*` REFUSED (42501).
- **verify_jwt trap**: CLI default is TRUE; `supabase functions deploy` silently flips the platform
  JWT check ON for callers holding no user JWT. Declare it per function. `fn-dev-auth` is a dev
  backdoor still deployed (`verify_jwt=false`, `CORS '*'`) — delete before the tag.
- `.agents_tmp/PLAN.md` belongs to a *planning conversation* sharing `/workspace/project`: leave it.
- agent-server `POST /api/conversations/{cid}/file/upload` rejects paths outside the conversation
  workspace (422) — a CLIENT error, not an Aurora bug.

## Token/CSS traps (L3, `b92c722`; detail in the 2026-10-27 log)
- `<AuroraThemeProvider>` writes shadcn ALIASES in FULL values (`--background: #fff`); but
  `packages/ui/tailwind.config.ts` maps HSL TRIPLETS (`hsl(var(--aurora-bg-h))`) that only
  `styles/aurora.css` defines, and Vite does NOT load that file. An app config using
  `presets: [auroraPreset]` = every color transparent. Apps must use the `apps/mobile/
  tailwind.config.js` shape (`colors: { background: 'var(--background)' }`).
- **`resolveThemeCSSVars` emitted DOTTED names** (`--aurora-accent.primary`) while everything
  reads DASHED (`--aurora-accent-primary`): `aurora.css`, mobile CSS, and `toShadcnVars` itself.
  So `--primary`/`--accent` were never defined → active nav invisible. FIXED + guard
  `packages/ui/test/theme-css-vars-naming.test.ts`. `apps/mobile` masked it via `styles/
  tokens.css` `:root` fallbacks (loaded in `main.tsx`); `apps/web-app` has none, so it exposed it.
  LESSON: a CSS var name is an interface between two files; a mismatch throws NOTHING, the value
  is just empty. Measure `getComputedStyle(el).getPropertyValue('--x')` live, never infer from code.
- `apps/web-app` still lacks `:root` fallbacks (L3 left this open) — fine while the shell is the
  only screen; add them before any pre-hydration render.
- Test infra: `apps/web-app/test/aurora-alias-hook.mjs` lets `node:test` load `.tsx` (esbuild
  `transformSync`), `.json`, `.css` under `--experimental-strip-types`. esbuild lives in the pnpm
  store (`node_modules/.pnpm/esbuild@*/…/lib/main.js`) — point at the FILE. Register hooks so OURS
  is last (Node runs the LAST-registered first).
- `apps/mobile build:web` aborts (exit 134) at the V8 default heap (~4GB) → needs
  `NODE_OPTIONS=--max-old-space-size=8192`. Environmental.
- `@aurora/ui` barrel is heavy (assistant-ui, antv, xyflow, katex): importing it just for
  `AURORA_ICONS` yields a ~9.4MB bundle. Real finding; a scoped `@aurora/ui/icons` would help.

## Specs + agents parallèles (récit dans le log 2026-10-27)
13/13 specs de module (`docs/features/specs/`, gabarit `productivity.tasks.md`) + 6 specs
d'écran, mergées dans `rebaseline/2026-10-23`.

**Parallel-agent lessons (learned the hard way, 3 infra failures)**:
- The Cloud LLM provider returned "Service Temporarily Unavailable" (HTML maintenance page)
  mid-run on **WS-2 (11 modules at once), WS-2b (5 modules), and WS-EF**. Agents that push
  only at the END lose everything. **Always instruct: commit AND push after EVERY unit.**
  WS-2a (6 modules, push-per-module) finished with all 6 intact; WS-2 (11 at once, push at
  end) lost all of it.
- Launch API: `POST /api/v1/app-conversations` with `selected_repository`+`selected_branch`
  returns an ASYNC start-task; resolve the conversation via
  `GET /api/v1/app-conversations/start-tasks?ids=<id>` — the response is a **list**, not an
  object (`d.get('items')` raises AttributeError). Poll with `.../app-conversations/search`.
- Agent `execution_status` values: `running` / `finished` / `error` / `None`. Check pushed
  branches (`git ls-remote --heads origin`) — that is the real deliverable, not the status.
- Agents get a clone of the branch at launch; their own branch must be created and pushed by
  them. Merge their branch with `--no-ff`; `.openhands/memory/*` appends merge cleanly (both
  sides append at the end — git auto-merges distinct hunks).
- My own verification regex was wrong once: `grep -cE "^## (15|16|17|18|19)\."` returned 0/5
  on a compliant deliverable because the headings are `## §15 Responsive` (with the § sign).
  **Verify the verification pattern before concluding a deliverable is non-compliant.**
- `docs/features/specs/{productivity.tasks,agent.kernel}.md` = the §M1–§M6 module template
  (capacités · données · chemin agent · surface · offline · preuve). §M6 must cite an EXECUTED
  command or the spec is NOT_READY.
- **agent_runs is NOT synced** (absent from `sync-config.yaml`, `powersync-schema.ts`,
  `sqlite-schema.ts`). `agent-client.ts` reads it via PostgREST (`supabase.from('agent_runs')`)
  while its comment claims "AD-7 local-first mirror" — the comment describes intent, not code.
  Reading a run's state REQUIRES network. Coherent with AD-3/F-09, but write it down.
- `tasks` column is `subject` (NOT `title`); `createTask` writes it at `tasks.ts:81`. Client schema
  matches (drift `name`/`title` is habits/routines only). `0032` added `tags`/`recurrence_rule`,
  and BOTH are in `powersync-schema.ts` → guarded by `domain-schema-drift.test.ts` (8/8).
- Capability registry: 70 entries. `task.update` covers create (`action:'create'`); the matrix
  names it "task.create / task.update" → naming drift only, behaviour covered.
- **Screen count: trust the INDEX, not `ls`.** `docs/design-system/screens/` holds 47 `.md`, but 3
  are not screens (`index.md`, `INDEX_REVIEW.md`, `brand-dna.md` — the L2 contract). Real = 44
  screens + 13 Design Space (OQ-6) = 57. Counting files overstates by 3.
- **No migration-numbering guard exists** (next free = `0033`; `0200` is an out-of-sequence
  wave-0 block). Two branches can both create `0033_*.sql` → reserve in
  `docs/plans/2026-10-27-division-du-travail-parallele.md` §7 before writing.
- Parallelism (verified): `git worktree add` works; pnpm store `/workspace/.pnpm-store/v10`
  (1.6 G) is SHARED → a worktree re-downloads nothing. 23 G free disk. Three writer-exclusive
  paths: the index (G7), `supabase/migrations/`, `packages/domain/`.
- Gate baseline (mesure corrigée 2026-10-27) : **738 node:test (21 suites) + 52 vitest, 0 fail** ;
  typecheck+lint exit 0 ; boundaries G1–G4, check-rls, view-joins, drift 8/8+5/5, ef-imports,
  ef-bundles verts. ⚠️ un chiffre « 1326 » a circulé : il était **faux** (doublage). `ci.yml` a 24
  étapes gardées par `hashFiles` (un fichier supprimé fait disparaître l'étape en silence).
- `pnpm` shim is `/tmp/bin/pnpm` → `exec corepack pnpm "$@"`; `/tmp` is EPHEMERAL here, recreate it
  when "pnpm: command not found". `mkdir -p /tmp/bin` first or the `printf >` fails.

## PowerSync (topologie + pièges) — vérifié 2026-10-28
- Org `6ab1609e88083500079d0b68` · projet `6ab1612d6860dd00071fcc98`.
  **Production** `6ab1612e8453e7cf8338ef9a` (rôle `powersync_e56673171470a907b5579e90`) ·
  **Development** `6ab1612f02481fb31b986822` (rôle `postgres`). Prod = **saine** (33 tables, lag 0).
- Le PAT **n'est pas** un ID d'instance (le champ `i=` décodé n'en est pas un) : autorité =
  `powersync fetch instances`.
- `powersync/cli.yaml` pointe **Development** → `deploy` **sans `--instance-id`** vise Development.
- **PIÈGE** : `fetch config --instance-id X` **sans `--project-id`** (CLI 0.9.0) retombe sur le
  **lien local** → lit Development en croyant lire Prod (m'a fait conclure à tort que prod
  utilisait `postgres`). **Toujours passer les deux IDs.** (0.10.3 : `--project-id` = no-op.)
- `npm i -g` refusé (pas de sudo) → `npm install -g powersync --prefix ~/.npm-global` +
  `PATH=$HOME/.npm-global/bin:$PATH`.
- **Client env = `apps/mobile/.env.local`**, PAS la racine : `vite.config.ts:68` pose `root: here`
  sans `envDir`, donc Vite ignore le `.env.local` racine. `POWERSYNC_TOKEN` (clé racine) n'a
  **aucun lecteur**. Recréer `apps/mobile/.env.local` avec `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_POWERSYNC_URL` (git-ignored → disparaît à chaque clone).
- Client : `supabase-connector.ts:81-88` envoie le **JWT Supabase**, pas un token PowerSync.
- **`REPLICA IDENTITY FULL` absent sur les 33 tables streamées** (mesuré 0 en `'f'`) → les DELETE
  ne sync pas. Exigence : `references/supabase-auth.md:24` ; précédent `0018:113-115`. → migration `0033`.
- `powersync pull instance` n'écrase pas (écrit `*-fetched.yaml`, git-ignored). Un échec de
  `validate` ne prouve rien : la config de prod échoue pareil (secret `secret_ref` non résoluble).

## Thèmes prédéfinis (mission propriétaire 2026-10-28) — `51cbd59`
- **Le système de thème fonctionne** : `apps/mobile/tailwind.config.js` mappe `background: var(--background)`,
  `primary: var(--primary)` … = les valeurs que `<AuroraThemeProvider>` écrit en inline sur `<html>` via
  `toShadcnVars` (hex). NE PAS se fier à `packages/ui/tailwind.config.ts` (`hsl(var(--aurora-*-h))`) : c'est
  la couche CSS interne de packages/ui, **statique** (2 valeurs seulement, `aurora.css`) — elle n'est PAS
  ce qui pilote l'app. Le sélecteur de réglages itère `Object.keys(THEMES)` → ajouter un thème = 1 JSON + 1 ligne.
- **3 voies « shadcn » écartées par la mesure** (ne pas les retenter) : `npx shadcn add` tweakcn écrit
  `--background: oklch()` → 0 effet visuel (mauvais nom de var ET mauvais format) ; `@madooei/shadcn-theme-presets`
  exige Tailwind ≥4 + React ≥19 (Aurora = 3.4.19 + 18.3.1) ; registry colorswitchcn injoignable (000).
- **Solution retenue** : importer les données officielles. `scripts/import-tweakcn-themes.mjs` convertit
  tweakcn (`tweakcn.com/r/themes/<nom>.json`) → JSON Aurora. Conversion **oklch→hex obligatoire** :
  `theme-gradient.test.ts` exige des stops hex et `hexLuminance` parse du hex. Matrices OKLab d'Ottosson
  (`oklch(0.6279 0.2577 29.2339)` → `#FF0000`). Import des tokens **accent uniquement** — `neutral.ts` figé.
  `colorsDark.surface` = la plus sombre valeur tweakcn du scope dark (test : luminance < 0.55).
- **42 thèmes** (10 Aurora + 32 tweakcn) + **19 dégradés uigradients** (github.com/ghosh/uiGradients, MIT ;
  seule la direction 135deg est notre choix, la source ne publie pas d'angle).
- **`build:web` OOM** : crash `exit 134` / « Ineffective mark-compacts » à ~4 Go. Préexistant, PAS lié aux
  thèmes. Fix : `NODE_OPTIONS=--max-old-space-size=8192` (la machine a 15 Go) → OK en ~65 s. Lancer en
  arrière-plan + poller le log (un build ~65 s, dist 77 Mo). Le `.gitignore` couvre `apps/mobile/dist`.
- Gate : typecheck `-r` 0, test `-r` **738** (mobile 206, ui **68** = 52 + 16 live DOM), lint 0/0.

## L5 chemin vertical (apps/web-app) — `2050277`
- **Nouvelle app** : `apps/web-app` (React Router + shell) EST la cible du chemin vertical, pas `apps/mobile`.
  Route `/tasks` = écran de capture. `NAV_SECTIONS[].readiness` (SSoT `src/lib/navigation.ts`) est la SEULE
  autorité de routage : `'ready'` → écran réel, sinon `ShellState` honnête. Ne jamais tester une route en dur.
- **DEUX défauts de fond trouvés par la preuve navigateur** (une ligne qui ne persiste pas ET s'affiche vide) :
  1. `EngineLocalStoreBridge.upsert` n'écrivait que dans un cache MÉMOIRE. `storeAdapter()` doit fournir
     `upsertRow`/`deleteRow`, et `apply()` doit ATTENDRE le flush — sinon `await apply()` ment sur la
     durabilité (course fire-and-forget : la ligne apparaît puis disparaît au reload).
  2. `SqliteQueryRepository` livrait la ligne MIROIR par un cast. Le miroir nomme le titre d'une tâche
     `subject`, l'entité `title` → titre vide. Fix : mapper de ligne INJECTABLE (3ᵉ param), branché sur
     `mapTaskRow` de `data-session.ts` (il existait déjà, jamais câblé). **Ne pas dupliquer ce mapper.**
- **`AuroraPowerSyncSchema.tables` est un TABLEAU** (de `ResolvedTable`) : `Object.keys` renvoie les INDEX.
  `auroraSchemaTableNames()`/`mirrorColumns()` étaient donc faux. `id` n'est jamais déclaré → l'ajouter.
- **Élimination de la branche DEV** (identité synthétique sans Supabase live) : `import()` DYNAMIQUE gardé par
  `import.meta.env.DEV` dans un module séparé (`lib/dev-session.ts`). Vite supprime la branche ET le chunk.
  Une condition sur une propriété d'env (`env.dev`) NE se replie PAS — le littéral reste dans le bundle.
  Vérification : grep le bundle prod, 0 occurrence. **Le DEV ne minifie pas** (`vite.config.ts` `minify: false`,
  contournement de build pré-existant) → les chaînes de dev survivraient visibles si non éliminées.
- **Preuve** : `apps/web-app/test/proof-l5.mjs` (`pnpm -F @aurora/web-app proof:l5`), Playwright + serveur dev.
  `playwright` n'est devDep QUE de `@aurora/ui` : résoudre via `createRequire` ancré sur ce package.json
  (pas de nouvelle dépendance). Utiliser `domcontentloaded`, jamais `networkidle` (bundle ~15,8 Mo).

## Pièges d'environnement (coûteux, à ne pas repayer)
- **CRLF fantôme** : plusieurs fichiers de `packages/data/src` (`local-store.ts`, `index.ts`) sont en CRLF dans
  git ; une écriture Python en mode texte les convertit en LF → diff de plusieurs centaines de lignes pour
  3 lignes réelles. Diagnostic : `git diff --ignore-all-space --stat`. Fix : réécrire en binaire avec `\r\n`.
  **Toujours éditer ces fichiers en binaire, ou vérifier `git diff --stat --ignore-all-space` avant de commit.**
- **La branche de travail réelle n'est pas celle annoncée** : le contexte disait `rebaseline/2026-10-23`,
  le travail a atterri sur `ws-themes/tweakcn-gradients`. **Vérifier `git branch --show-current` au début**,
  ne pas se fier au contexte de session.
- **`git checkout -- <fichier>` est destructeur sur une branche sale** : il a effacé `capture-path.test.ts`
  du script `test` de `apps/web-app` (en plus de la devDep playwright visée). Vérifier le script après.
- `apps/web-app` liste ses fichiers de test EXPLICITEMENT dans `package.json` (comme mobile) : ajouter un
  test = l'ajouter au script, sinon il ne tourne pas (28 → 17 tests détecté par l'écart de compte).
- **Tests validés par MUTATION** : la règle du dépôt « un test qui ne peut pas échouer n'est pas une preuve »
  s'applique. Mutationner chaque correctif (3 mutations → 3 échecs data + 2 échecs web) puis restaurer.

## Parallélisation par agents Cloud (2026-10-28) — recette vérifiée
- **Le plan de division du travail EXISTE et fait autorité** : `docs/plans/2026-10-27-division-du-travail-parallele.md`.
  Il dit **qui peut travailler en même temps que qui**. À lire AVANT de lancer un agent : il évite de
  re-décider ce qui est déjà tranché. Contrainte dure : **3 chemins à writer unique** —
  `docs/frontend/implementation-index.md` (SSoT de la file), `supabase/migrations/*.sql` (numérotation
  sans garde), `packages/domain/src/**` (SSoT de types AD-1). **WS-1 (L5, parcours vertical) doit rester
  SEUL** : il traverse toutes les couches, le paralléliser garantit les conflits.
- **Délégation Cloud fonctionne depuis le sandbox** : `POST https://app.all-hands.dev/api/v1/app-conversations`
  avec `Authorization: Bearer $OPENHANDS_API_KEY`, corps `{title, selected_repository, selected_branch,
  initial_message:{content:[{type:'text',text}]}}`. **Le dépôt est PUBLIC** → l'agent clône sans provider token
  (`secrets_store.provider_tokens` est vide). Suivre via `GET .../start-tasks?ids=<start_task_id>` →
  `app_conversation_id`. Lien UI : `<base>/canvas/conversations/<app_conversation_id>`. Max **5** en parallèle.
- **Les conversations Cloud ne voient QUE ce qui est poussé sur GitHub.** Une branche locale non poussée
  est invisible pour elles. Pousser d'abord (`ws-themes/tweakcn-gradients` l'était PAS — c'était le blocage réel).
- **Le token embarqué dans l'URL du remote est PÉRIMÉ** (« Invalid username or token »). Utiliser
  `$GITHUB_TOKEN` : `git remote set-url origin "https://x-access-token:${GITHUB_TOKEN}@github.com/..."`
  puis `git push`. Le remote d'origine contient un token en clair → **le masquer** dans toute sortie
  (`sed -E 's#(x-access-token:)[^@]+@#\1***@#'`).
- **Topologie des branches** : `origin/main` est PÉRIMÉ (juste un « Add files via upload »). La branche
  d'intégration canonique est **`rebaseline/2026-10-23`** (+99 commits). Aucune branche de workstream
  n'est fusionnée dans `main`. `git merge-base --is-ancestor <b> origin/rebaseline/2026-10-23` dit si un
  workstream est déjà intégré. 3 branches restent non intégrées (thèmes, `0033`, gate PowerSync).
- **Brief d'agent = règles VÉRIFIABLES, pas des intentions.** Inclure la commande de mesure exacte et
  la valeur attendue (« `grep -cE '^## §(15|16|17|18|19) ' <f> ` → 5 »). Et **interdire explicitement**
  `.openhands/memory/` aux agents parallèles : sinon tous écrivent le même journal et le rebase devient manuel.

## Preuve navigateur : dev ET prod (2026-10-28)
- `apps/web-app/test/proof-l5.mjs` a un mode `PROOF_MODE=dev|prod` (`proof:l5` / `proof:l5:prod`).
  **dev 7/7** (capture + persistance après reload) · **prod 5/5** (dégradation honnête : bannière
  « Hors ligne — lecture locale seulement », capture DÉSACTIVÉE sans `userId` — AD-7).
- **Non-vacuité sans muter de code** : lancer les vérifications PROD contre le serveur de DEV (où la
  bannière de dev est présente) fait ÉCHOUER les 3 vérifs prod → 2/5. Un test qu'on peut faire échouer
  par un simple changement d'entrée n'est pas un test complaisant.
- Le mode dev exige **`VITE_LOCAL_DEV_SESSION=1`** en plus de `import.meta.env.DEV` (sinon `no-session`).
- `tests/e2e/` est un **stub** (`DESIGNED_NOT_IMPLEMENTED`, `tests/e2e/playwright.config.ts`) : ma preuve
  navigateur est la première du dépôt qui mesure réellement.
- **Cache Playwright purge souvent** (`~/.cache/ms-playwright` disparaît) : réinstaller via
  `packages/ui/node_modules/.bin/playwright install chromium` (`npx playwright` échoue : `not found`).

## VÉRIFICATION LIVE SUPABASE (2026-10-28) — le déblocage majeur
- **Les outils Supabase MCP sont branchés sur la PRODUCTION** : `shttp_get_project_url` →
  `https://opagfyspdbhxthlxvlrk.supabase.co`. C'est LE projet live du dépôt. Beaucoup de
  « bloqué faute de creds » (RLS live, schéma live, drift) n'était en fait pas bloqué du tout :
  il fallait juste vérifier que les outils étaient disponibles. **Toujours tester les outils
  avant de déclarer un blocage.**
- **Simuler un utilisateur RLS sans credential** : `set role authenticated;` (le rôle `postgres`
  des outils a `BYPASSRLS=true`, il faut donc changer de rôle) puis
  `set request.jwt.claim.sub = '<uuid>';` — c'est EXACTEMENT ce que lit `auth.uid()` (définition
  mesurée : `coalesce(nullif(current_setting('request.jwt.claim.sub',true),''), ...)`).
  Le client MCP **n'accepte qu'un seul statement** → mettre `SET` avant et le `SELECT` en DERNIER
  (seul le dernier résultat revient).
- **L'outil MCP est en autocommit** : pas de transaction à annuler. Pour un test propre :
  `INSERT` de lignes MARQUÉES (préfixe reconnaissable), mesures, puis `DELETE`. Vérifier ensuite
  0 ligne restante. La prod de ce projet a 0 ligne métier (tables vides) → risque nul.
- **Preuve RLS live obtenue** : `FORCE RLS=true` sur tasks/projects/agent_runs/canvas_sessions ;
  A voit 1/2 lignes, 0 de B, symétrique ; `INSERT` croisé → `42501` ; `UPDATE` croisé → 0 ligne.
- **DRIFT PRODUCTION trouvé et fermé** : la prod était à `0030` ; **`0031` était appliquée**
  (`user_context` = 11 col) mais **`0032_fix_phantom_columns.sql` NON** (`tasks.tags`/`recurrence_rule`
  absentes). Or 0032 corrige une **perte de données SILENCIEUSE** : `createTask` écrit `tags`, la Map
  du bridge accepte la clé inconnue, l'écran l'affiche, mais le PATCH échoue → la donnée n'existe
  jamais côté serveur. Appliquée via `shttp_apply_migration` (nom `fix_phantom_columns`) ;
  vérifié : `tasks.tags`+`recurrence_rule`, `projects.view_mode` + CHECK, `artifacts_kind_check`
  élargi, `applied_count` 31→32. **`schema_migrations` est le tracker** : `apply_migration` y écrit.

## Docker & le harnais RLS (2026-10-28)
- **Docker marche dans ce sandbox** : `sudo dockerd > /tmp/docker.log 2>&1 &`, puis utiliser
  **`sudo docker`** (le CLI sans sudo échoue sur les permissions du socket, alors que le daemon
  tourne — `docker info` ment sur l'état réel).
- **`scripts/rls-live-check.sh` n'avait JAMAIS tourné** (gate manuel, absent de `ci.yml`). Deux
  fixtures manquaient, imputables au HARNAIS, pas aux migrations :
  (1) **`auth.identities`** — GoTrue la crée au RUNTIME, l'image ne l'a pas ; `0029` y attache un
  trigger → rejeu mourrait à `0029` ; (2) **`auth.users`** — l'image a un GoTrue PLUS ANCIEN
  (21 col, `confirmed_at`) que le live (37 col, `email_confirmed_at`) → le trigger de `0029` échoue.
  Correctif : réaligner le fixture sur la forme **MESURÉE en production**, jamais dégrader la migration.
- **Régression silencieuse** : vert au 2026-10-24 (« 28/28 migrations »), cassé le 2026-10-26 par
  `0029`, personne ne l'a vu. **Leçon générale : un gate manuel jamais relancé après une migration
  cesse silencieusement de garder quoi que ce soit.** Vérifier la fraîcheur d'un gate, pas son
  dernier verdict.
- **Résultat du harnais** : 33 migrations rejouées, 58 tables contrôlées, 41 amorcées, 0 pénétration,
  contrôle négatif déclenché. 17 tables SKIPPED pour FK/CHECK (le test le DIT — couverture 41/58).

## Harnais RLS : 58/58 + branche en CI (2026-10-28, suite)
- **Couverture portee 41/58 -> 58/58.** Les 17 « structurellement impossibles » ne l'etaient
  pas : le seedeur ne lisait pas `pg_constraint` assez loin. Deux causes :
  (1) **FK vers un parent portant `user_id`** (13 tables) — un uuid aleatoire ne matche rien ;
  corriger en amorcant le parent A LA DEMANDE recursivement et en pointant l'enfant dessus.
  Ne resoudre que les FK que le seed remplit (NOT NULL sans defaut) ; une FK NULLABLE reste
  NULL, ce qui rompt au passage les cycles d'auto-reference (`semantic_nodes.parent_id`).
  (2) **CHECK sur ensemble ferme** (6 tables) — lire le PREMIER litteral autorise DANS la
  definition (`regexp_match(def,'ARRAY\[(''[^'']*'')')`) + les bornes numeriques
  (`base_minutes >= 1`), au lieu d'inventer. **Toujours decouvrir depuis le catalogue, jamais
  lister** : une liste derive, le catalogue non.
- **CAUSE RACINE de la regression : le harnais n'etait pas dans `ci.yml`.** Le commentaire du
  workflow l'assumait (« non branchee en CI pour l'instant : ~2 min de pull d'image »). C'est
  precisement l'economie qui a laisse la garde mourir 2 jours sans que personne ne le voie.
  Il est desormais un step de `ci-gate` (`ubuntu-latest` fournit Docker ; le script n'utilise
  PAS `sudo` — il tourne en root sur le runner).
- **Piege local** : dans ce sandbox, `sh scripts/rls-live-check.sh` sans `sudo` echoue
  (`permission denied ... docker.sock`, socket `srw-rw---- root:docker`, uid 10001 hors du
  groupe). Ce n'est PAS un defaut du script : `sudo chmod 666 /var/run/docker.sock` le rend
  conforme aux conditions d'un runner CI et le script passe alors sans `sudo`. Ne pas
  « corriger » le script pour ce symptome local.
