# Aurora — project memory index

Detail, evidence and per-lot narratives live in the daily logs (`.openhands/memory/YYYY-MM-DD.md`).

## Commands / environment
- Toolchain: node 24, pnpm 10.28, TS 5.9. Use `corepack pnpm ...`. Isolated install layout is
  correct — do NOT add `.npmrc` hoisting.
- Gates: `pnpm -r typecheck` · `pnpm -r lint` · `pnpm -r test` · `pnpm -r build` ·
  `sh scripts/check-boundaries.sh` · `sh scripts/check-rls.sh` ·
  `node --experimental-strip-types scripts/check-view-joins.ts` ·
  `node --experimental-strip-types tests/spine/spine.test.ts` ·
  `node scripts/check-ef-imports.mjs` · `node scripts/check-ef-bundles.mjs`.
- **BASELINE = GREEN** (`b2d7040`; re-verified `7221f20`): typecheck 0 · lint 0 · test 0
  (675 node + 48 vitest) · build 0 · boundaries G1–G4 · RLS (28 files) · view-joins (88 .sql) ·
  spine · EF-imports (70 symbols) · EF-bundles (8/8).
- **`pnpm -r <script>` stops at the FIRST failing package** — a green package hides all following
  ones. Never read `pnpm -r` output as "all green"; iterate per package.
- **A green local gate can be FALSE**: `rm -rf packages/*/dist apps/*/dist` first (gitignored
  stale `dist/` makes typecheck pass locally and fail in clean CI — TS6305/TS6059/TS6307).
- Pushing: a tokenless https remote prompts and HANGS. Fix:
  `git remote set-url origin "https://${GITHUB_TOKEN}@github.com/joydatini-lab/aurora.git"`.
  (`gh` is unauthenticated; use curl against api.github.com.)
- The repo is a FORK (`joydatini-lab/aurora` ← `joynagassi-cyber/aurora`): `push` events do NOT
  trigger workflows. `ci-base` runs everywhere; `ci-gate` is `main`-only → needs a PR.
  `sync-health` fails BY DESIGN without CF/R2 secrets.
- Nested `pnpm run` can't find `pnpm`; `corepack enable` FAILS (EACCES). Shim:
  `printf '#!/bin/sh\nexec corepack pnpm "$@"\n' > /tmp/bin/pnpm; chmod +x /tmp/bin/pnpm;
  export PATH=/tmp/bin:$PATH`.
- Editing CRLF files (tsconfig.base.json + 11 tsconfigs) with Python `open(w)` rewrites to LF →
  200-line diff. Edit in binary; check `git diff --stat -w`.
- Long markdown heredocs with code fences can FAIL SILENTLY — use file_editor.

## Architecture facts (load-bearing)
- **`agent_runs` (0008) is the ONLY conversation store** — no conversations/messages tables.
  Server-owned, per-user RLS; device reads via a publishable client (AD-7), never writes. Not a
  PowerSync stream; the device POLLS (3 s while running, terminal stops the poll).
- Device NEVER sees a provider stream (F-09): the kernel runs server-side
  (fn-agent-run → job → kernel → polled `agent_runs`).
- `packages/agent` = server kernel (device sees only AgentRunState). `packages/ui` = pure design
  system (AD-6: must NOT import @aurora/data or @aurora/platform). `packages/ui` vendors
  @assistant-ui/react + ReUI; `cn` resolves via the `cn@0.4.0` npm package.
- Route table is a documented SSoT (`docs/mobile/navigation-and-page-composition.md`) — ratify new
  routes there. `/agent` = chat surface; `/agent/conversations` = run list.
- `packages/ui` = ~272 component files, ~190 export lines. `assistant-ui/elements/` 138 files
  NEVER wired into any app (brick reserve, D-018.2). No responsive system:
  `packages/ui/tailwind.config.ts` has NO `screens`.
- Reference §7.2 forbids new root entities before audit → a logo/poster/document = an existing
  **`Artifact`**. §4.3 responsive CONTRACTS are requirements, not proposals.

## The dispatcher chain is broken in 4 independent ways (2026-10-24)
Only #1 is fixed. **A green gate says NOTHING about the job chain.**
1. **Boot** — FIXED (`c8367fa`): 2 imports of non-existent symbols meant the EF never loaded.
2. **Routing** — OPEN: `PROGRESS_JOB_HANDLERS` is `[]` (`packages/progress/src/jobs.ts:114`)
   while `buildSkillRecomputeHandler` EXISTS (l.47) and is tested
   (`progress/test/progress.test.ts:265`). Never called — the missing piece is a factory
   injecting `RecomputeContext`, like `buildLearningHandlers` does for Learning. The dispatcher
   `skip`s unrouted jobs silently (`fn-job-dispatcher/index.ts:632`).
3. **Payload** — OPEN, subtler: cron `aurora_skill_recompute` inserts `payload='{}'::jsonb`
   (`cron.job`) but the handler needs a non-empty `skillId` (`progress/src/jobs.ts:57-58`).
   Wiring it alone flips pending → failed with `progress/missing_skill_id`. Design defect.
4. **Wake-up** — OPEN, NOT fixable by deploying: cron job 3 runs
   `pg_notify('aurora_job_dispatcher')`, which an HTTP EF cannot `LISTEN` to, and `pg_net` is
   AVAILABLE (0.20.4) but NOT INSTALLED. A perfect deploy would never be invoked.
- Live: 34 `pending` jobs (17 `fsrs-tick` + 17 `skill_recompute`), oldest 2026-10-08, ONE
  `user_id`; `job_logs` = 0 rows. Cron: 4 jobs (fsrs 02:00, skill 03:00, event_dispatch */5,
  keep_alive 00:00).

## EF deploy facts (verified against the CLI source, 2026-10-24)
- The CI `deploy` job is `if: false` (`.github/workflows/release.yml:164`, OQ-03). Last manual
  deploys 2026-09-30..2026-10-07. **That — not workspace imports — is why `fn-canvas`,
  `fn-integrations`, `fn-job-dispatcher` are missing.** `fn-canvas` imports ZERO workspace
  packages and is still absent: never claim the import boundary as cause.
- The modern CLI's import-walk boundary extends to the **nearest git root** and documents that
  monorepo files outside the workdir "can still deploy"
  (`apps/cli/src/shared/functions/deploy.ts:2244`). Bundling is hardening, not a proven fix.
- Deploy entrypoint default = `functions/<slug>/index.ts`
  (`packages/config/src/functions-manifest.ts:30`), overridable via
  `[functions.<slug>] entrypoint = ...` in `supabase/config.toml`, resolved RELATIVE to
  `supabase/` (`deploy.ts:2148`). Paths outside the workdir are refused.
- The CLI only accepts slugs matching `/^[a-zA-Z0-9_-]+$/` AND having an `index.ts`
  (`functions-manifest.ts:85-90`) → a dir without `index.ts` is ignored (`_shared/` is safe).
- **config.toml trap**: keys must match the DIRECTORY name. 5 pre-existing blocks used underscores
  (`fn_job_dispatcher`) vs hyphen dirs (`fn-job-dispatcher`) → never matched, silently dead.
  Fixed in `7221f20`. `scripts/build-ef.mjs` bundles each EF to `dist/index.ts` (workspace pkgs
  inlined; `node:`/`npm:`/`jsr:` external, bare npm → `npm:name@version` because `packages/agent`
  pulls the Vercel `ai` SDK → `@vercel/oidc`, which CJS `require("fs")`).

## Gate integrity (learned the hard way)
- ALWAYS run the RECURSIVE gate before claiming green; same for lint.
- **A `react-hooks/*` error can mean the PLUGIN is missing, not bad code.** ESLint reports
  *"Definition for rule … was not found"* for every `eslint-disable` of an unresolvable rule.
  `eslint --print-config <file>` is authoritative.
- **Vendored != Aurora**: `packages/ui/src/components/{reui,assistant-ui,examples}/**` is
  registry-installed third-party code (treat like node_modules). `components/ui/**` IS Aurora.
- **Phantom empty-state defect**: a page hard-coding `state={{ status: 'empty' }}` with 0 data
  calls. `grep -rn "state={{ status: 'empty' }}" apps/mobile/src/pages/`. `UxStates` does NOT
  render `children` in the `empty` branch (the body vanishes from the DOM).
- `check-view-joins.ts` needs `node --experimental-strip-types` (`pnpm exec tsx` fails). G2
  false-positived on `sk-[A-Za-z0-9]{8,}`; threshold now `{20,}`. `code_files()` scans
  `git ls-files` only.

## Testing gotchas
- jsdom lacks `window.matchMedia`: any test rendering `AgentThinkingLoader` (or a parent) must
  mock it (see `packages/ui/test/chat-panel.test.tsx`).
- `packages/ui` tests use a local `test/render.ts` (React 18 `act` + createRoot), not RTL.

## LibreChat — DISPROVEN (do not resurrect)
- The "LibreChat integration" story (branch `integration/librechat`, `docs/integration/`,
  ADR-INT-001, M1→M5.2, SHA e8f3be08…) was **FALSE**: branch 404, `docs/integration/` absent,
  and all 15 cited commits (`eab561a`, `fe45e04`, …) do not exist. Owner decision: **LibreChat
  abandoned**, LobeHub = design reference only. Refutation:
  `docs/plans/2026-10-23-repriorisation.md`.

## Owner decisions and scope (Phase 0, 2026-10-24)
- **D1 = FULL perimeter A–M** → Design Space Pro (L) is IN v1, not a conditional Phase 1B.
  Plan: `docs/plans/2026-10-24-plan-directeur-v1.md` (6 gated tranches).
- **Web-first → desktop → mobile** (`adr-018`; `adr-extract` §23 "mobile-only" SUPERSEDED).
  Ionic = MOBILE ONLY (web/desktop = React + shadcn/ReUI, no `ion-*`); create `apps/web-app`,
  keep `apps/mobile`. Electron confirmed, Tauri rejected.
- `docs/architecture/scope-register-v1.md` — families A–M with per-line evidence.
- **Owner modules (T3 DONE, `5496393`)**: `OWNER_MODULE_BY_ENTITY` named knowledge/artifact/identity
  as owners and NONE had a package. Created all THREE (`packages/{knowledge,artifact,identity}`),
  0 new tables — the plan listed only 2, but its own gate ("no module absent") was unreachable
  without `identity`. Guard: `packages/data/test/owner-module-coverage.test.ts` (every declared
  owner has a package; any `*_OWNED_TABLES` inventory must equal the routing table).
- **A declared owner with no implementation is invisible to the whole gate**: check-rls reads
  migrations (tables exist → green), the PowerSync wiring test reads sync-config (streams declared
  → green), single-writer.test checks the TABLE rejects a wrong module — never that the declared
  module EXISTS. Read side was wired (relay views + streams); writes were a missing seam.
- **`artifact_files` is NOT routed**: absent from OWNER_MODULE_BY_ENTITY, `sync-config.yaml` AND
  `v_artifact_scope` — a local command aimed at it can't be validated/synced/relayed. Exported as
  `ARTIFACT_UNROUTED_TABLES` (a gap, not a capability). Same shape for `learning`/`progress`/
  `discovery`/`integrations`: declared owners that build NO local command at all.
- **SSoT ↔ DB divergences (pin, don't patch — AD-15 owner decisions)**: artifacts.kind SSoT has
  csv/text/code the live CHECK rejects; notes has no tags/sourceRefIds; semantic_nodes has no
  evidenceRefIds; source_refs column is `source_document_id` (SSoT says `sourceId`);
  artifact_files.filename is NOT NULL but absent from the SSoT type; user_context has only a
  `coaching_prefs` jsonb (no displayName/coachCadence/quietHours columns).
- **Licences (verified at source)**: LobeHub = "LobeHub Community License" (Apache-2.0 **+ cond.
  1b**: a commercial licence is REQUIRED to distribute a derivative) despite `package.json` saying
  `MIT` — the LICENSE file prevails. LibreChat = MIT. => NEVER copy LobeHub code/assets.
- Owner docs (repo ROOT, `07d70a6`): `Aurora-Reference-Produit-Fonctionnelle-v1.1.md` (1622 l, THE
  master reference) + `LOGO.md`/`AFFICHE.md`/`VIDEO.md`/`deep-research-report.md`. They SUPERSEDE
  the LibreChat brief. D-01…D-08 (§13.1): prior modules KEPT; Design Space Pro = 1st creative
  extension; Next.js for the public site only (`apps/marketing`); TanStack per-responsibility.

## Live DB / RLS verification (2026-10-24)
- The gate is STATIC (reads migrations). `scripts/rls-live-check.sh` applies all 28 on
  supabase/postgres (Docker, no credentials) + runs `tests/rls-penetration.sql` with 2 auth users
  AND a negative control (disable RLS on `tasks` → test MUST fail). Verified: 58 tables, 41
  seeded, 0 penetration.
- Found by applying for real: 0019 had 19 column values in DOUBLE quotes (+1 unescaped `'`); 0025
  an unescaped `'` in a COMMENT; `rls-penetration.sql` a frozen 49-table list assuming `id`
  everywhere. All fixed.
- supabase/postgres: use **supabase_admin** (superuser); `postgres` can't create `vector`.
  `cron.job` needs supabase_admin and survives schema drops → test on a FRESH container.
  `auth.users` in the DOCKER image uses `confirmed_at` (no `email_confirmed_at`); the HOSTED
  project has `confirmed_at` AND `email_confirmed_at` (verified live 10-25). Do not port an
  auth-schema assumption between the two — they are different schemas.
- Never propagate a claim a doc makes about another doc: `finalisation-v1.md` G8 misquotes
  AI_RULES.md ("20 migrations" vs the real 28 on disk).
- Security advisors, as of 10-25 (WARN): `rls_auto_enable` still anon-executable (platform
  recipe, not ours); leaked-password protection disabled; `vector` + `pg_net` in `public`
  (`pg_cron` is NOT flagged: its extension lives in `pg_catalog`, objects in `cron` — that is
  the correct pattern to copy); `keep_alive` RLS without policy (INFO).
  CLEARED by 0029/0030: the 2 auto-confirm functions are no longer anon-executable, and
  `function_search_path_mutable` went 3 → 0.
- `auto_confirm_new_user` / `auto_confirm_email_identity` are AURORA code (owner decision 10-07:
  no email confirmation, no paid domain) and were versioned in 0029. `rls_auto_enable` +
  `ensure_rls` are NOT: they are the official Supabase recipe reproduced VERBATIM, sitting beside
  the platform's own event triggers. Versioning them would freeze platform infrastructure —
  the plan's "version the 3" was wrong for that one. Guard test pins the distinction
  (`tests/db/live-only-functions.test.ts`, 4 tests, in CI).

## Job chain — the 16-day stall (root cause, 2026-10-24)
- The stall had **TWO independent causes**, both needed fixing:
  (a) cron `aurora_event_dispatch` ('*/5 * * * *') ran `SELECT pg_notify(...)` — a pure **no-op**.
      An Edge Function is HTTP-triggered and has NO persistent Postgres session, so it **cannot
      LISTEN**. 241+ "succeeded" runs that woke nothing. Same for `trg_job_queue_notify` (0010).
      Fixed by migration **0028**: `pg_net` (0.20.4, available but NOT installed) + a real
      `net.http_post`. Cron is `unschedule`d then re-`schedule`d, not duplicated.
  (b) **`fn-job-dispatcher` was never deployed** (5 live EFs: fn-agent-run, fn-import-course,
      fn-notifications, fn-skills, fn-dev-auth). **PROVEN**: the wake-up gets
      `404 {"code":"NOT_FOUND","message":"Requested function was not found"}` — visible in
      `net._http_response`. The deploy job is `if: false` in `release.yml` (gate **OQ-03** =
      dev/staging/prod env values, `docs/release/README.md`). **This is the ONLY remaining blocker.**
- **`route()` reads `job.payload.kind`, NOT the `kind` column** (`fn-job-dispatcher/index.ts:711`).
  The call site injects it (`{...job.payload, kind: job.kind}`, line 836), so cron jobs with
  `payload={}` DO route. The fallback at line 715 (`module === ""` → match by kind alone) is what
  makes module-less cron jobs work. Know this before touching routing.
- `skill_recompute` had a 3rd defect: the handler **persisted nothing** (computed a SkillState and
  returned it). Fixed with a `saveSkillState` port (AD-7 single-writer).
- `fn-job-dispatcher` had **NO auth guard** — any caller could force a sweep across ALL users.
  Now fail-closed: `x-aurora-internal` header (`fn-agent-bootstrap.ts:409` convention),
  constant-time compare, 401 — including when `INTERNAL_FN_SECRET` is unset.
- **`verify_jwt` trap**: `supabase/config.toml` declared NONE, and the CLI default is **TRUE**. Any
  `supabase functions deploy` would silently flip the platform JWT check ON for functions whose
  callers hold no user JWT — the platform rejects them BEFORE their own guards, so correct code
  looks broken. All 7 deployable EFs now declare it explicitly (`false` ×6, `true` for fn-skills).
  `fn-dev-auth` is excluded on purpose (must never ship) but is **STILL DEPLOYED live** with
  `verify_jwt=false` + `CORS '*'` — a dev backdoor to delete before the tag.
- No `SUPABASE_ACCESS_TOKEN` / `.env.local` in this sandbox, **Docker unavailable** → cannot deploy
  an EF or run `rls-live-check.sh` here. `vault.create_secret(...)` IS permitted via MCP, but
  `alter database ... set app.settings.*` is **REFUSED** (`42501`). So 0028 reads the project URL
  from vault (`SUPABASE_PROJECT_URL`), with the GUC as fallback.
- `deno` is absent → EF tests cannot run locally (only `node --experimental-strip-types`).
- Cron jobs are enqueued by `0014` with `payload = '{}'::jsonb`; `skill_states.freshness` is TEXT
  (`fresh|stale|forgotten`) while the domain type is a 0..1 number — map both ways.
- `skill_states` is EMPTY and `progress_evidences` has 0 rows live, so the deployed fix is a
  verifiable no-op today (safe to enable).
- **The release `deploy` job was a THIRD silent no-op** (fixed `d869c9f`): 4 `echo` + the real
  commands commented out, so flipping `if: false` would have run GREEN and deployed NOTHING.
  Two more defects in that path: `supabase link` was given a URL (`--project-ref` is required, and
  there is NO `--access-token` flag — the token comes from `SUPABASE_ACCESS_TOKEN`), and the CLI
  was never installed (`npx --yes supabase@latest` now). The step now pre-flights
  `INTERNAL_FN_SECRET` and fails loudly, because 0028 is fail-closed and a deploy without it gives
  a permanent 401 that looks like a broken wake-up. `workflow_dispatch` added to release.yml so
  the EF deploy no longer needs a `v*` tag. Guard test (7th in routing-coverage) verified by
  NEGATIVE TEST.
- **The job queue GROWS, it does not stall**: 34 rows on 10-24, 38 on 10-25 (the daily crons
  insert 1 job/user/day, unbounded). Cost of the blockage increases daily.
- `flashcards` has NO `lapses` column, but `getDueCards` does not select it either, so
  `Number(r.lapses ?? 0)` is a correct defensive 0 — NOT a bug (checked after the `learning.
  flashcards` schema guess proved wrong: the table is `public.flashcards`).

## Sandbox facts (this environment)
- FS is EPHEMERAL (`/tmp` and the Playwright cache can vanish mid-session — re-run
  `npx playwright install chromium`; prefer `git checkout -- <file>` over /tmp backups).
- Live render: `corepack pnpm -F @aurora/mobile dev --port 12000 --host 0.0.0.0`, then Playwright.
- Ionic `ion-button` may match 2 elements with an aria-label — click via
  `page.evaluate(() => document.querySelector(...).click())`. For persisted `ui-state` defaults use
  a FRESH `browser.newContext()` (localStorage leaks otherwise).
- `build:web` gz budget is 3/3 green with a FRESH `dist/` (rm -rf first); a stale dist fails.
  `build:web` also needs `NODE_OPTIONS=--max-old-space-size=8192`.
- Dev blank-page bug FIXED (`e57453e`): `process is not defined` from a MODULE-LOAD side effect in
  `packages/discovery/src/jobs.ts`. Lesson: on a Node-global throw in a browser bundle, grep every
  imported package's module-load side effects, not just app code.
- `.agents_tmp/PLAN.md` at the workspace root belongs to a *planning conversation* (another
  conversation shares `/workspace/project`). Leave it alone; don't commit it.
- agent-server: scoped `POST /api/conversations/{cid}/file/upload` rejects paths outside the
  conversation workspace (422) — a CLIENT error, not an Aurora bug. Unscoped
  `POST /api/file/upload` does not.
