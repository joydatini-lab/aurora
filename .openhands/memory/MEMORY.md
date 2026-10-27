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
