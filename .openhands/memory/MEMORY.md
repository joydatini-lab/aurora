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

## The decision framework (the owner's mandate: "stop asking me")
- Precedent to extend: `docs/ui-libraries.md` **§8 "Agent Decision Framework (autonomous, no
  user input)"** — it existed for components, not for design OQs.
- Three SSoT artefacts: `docs/frontend/derivation-protocol.md` (precedence P0–P7 + 5 verdicts;
  `ESCALADE` requires irreversible **AND** no evidence) · `docs/frontend/design-space-oq-rulings.md`
  (OQ-6…OQ-12 ruled, 0 escalations) · `docs/frontend/implementation-index.md` (**the single view**:
  facts, ratified decisions, lot queue L0–L9, 7 traps G1–G7). Five planning docs coexisted, two
  contradicted each other.
- Screen-spec convention: `docs/design-system/screens/*.md` = 14 sections + §15–§19
  (`docs/frontend/spec-template-v1.md`). **44 screens, ONE** (`taches-liste`) had §15–§19. New
  pilot: `brand-dna.md`. 374 OQs consolidated in `screens/_open-questions.md`.

## Verified defects (NOT fixed — owner calls, AD-15)
- **D3 (grave, silent)**: `createTask` patches `tasks.tags` + `tasks.recurrence_rule`;
  `createProject`/`updateProject` patch `projects.view_mode`. **No such columns** — not in the
  live DB, `powersync-schema.ts`, or the generated SQLite DDL. Silent because
  `EngineLocalStoreBridge.upsert` is a **Map** keyed by column name: an unknown key is accepted,
  the screen renders, only the upstream PATCH fails (queued-write failure, not a crash).
- **D1**: `Project.title` vs `projects.name` is a **DELIBERATE rename** translated by the writer
  (`goals-projects.ts:184`). Same for `Task.title`→`tasks.subject` (`tasks.ts:81`),
  `Project.deadline`→`end_date`, `Task.timeSpentSec`→`actual_minutes`. NOT bugs.
- **D2**: `Artifact.kind` (domain, 13 values incl. csv/text/code) vs the SQL CHECK (10 values) —
  writing one is rejected by Postgres at runtime.

## Guards to know
- `tests/db/domain-schema-drift.test.ts` (wired into `ci.yml`): **calls the real writers** and
  checks every patch key against the migrations. It fills the hole between
  `client-schema-drift.test.ts` (client↔migrations, SQL both sides) and `owner-module-coverage`
  (reads table names, never columns) — **nothing** compared `packages/domain` to the migrations.
  Its `KNOWN_DEFECTS` list is **tripwired**: fixing a defect makes the test FAIL, forcing the
  entry's removal, so the list cannot outlive the problem.
- **Lesson: a non-vacuity test caught a first regex version that extracted nothing from
  `createArtifact`. Calling the code beats parsing its source.**
- **Phantom empty-state defect**: a page hard-coding `state={{ status: 'empty' }}` with 0 data
  calls. `grep -rn "state={{ status: 'empty' }}" apps/mobile/src/pages/`. `UxStates` does NOT
  render `children` in the `empty` branch (the body vanishes from the DOM).
- **Vendored != Aurora**: `packages/ui/src/components/{reui,assistant-ui,examples}/**` is
  registry-installed third-party code (treat like node_modules). `components/ui/**` IS Aurora.
- **A `react-hooks/*` error can mean the PLUGIN is missing**, not bad code. `eslint
  --print-config <file>` is authoritative.
- `check-view-joins.ts` needs `node --experimental-strip-types` (`pnpm exec tsx` fails). G2
  false-positived on `sk-[A-Za-z0-9]{8,}`; threshold now `{20,}`. `code_files()` scans
  `git ls-files` only.
- jsdom lacks `window.matchMedia`: any test rendering `AgentThinkingLoader` must mock it.
  `packages/ui` tests use a local `test/render.ts` (React 18 `act` + createRoot), not RTL.

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
- The static gate reads migrations; `scripts/rls-live-check.sh` applies all migrations on
  supabase/postgres (Docker) + runs `tests/rls-penetration.sql` with 2 auth users AND a negative
  control (disable RLS → the test MUST fail). Found real defects by applying for real.
- Use **supabase_admin** (superuser); `postgres` can't create `vector`. `cron.job` needs
  supabase_admin and survives schema drops → test on a FRESH container.
- **The docker `auth.users` differs from the hosted one** (`confirmed_at` vs also
  `email_confirmed_at`). Do not port an auth-schema assumption between the two.
- Never propagate a claim one doc makes about another. `shttp_*` (Supabase MCP) gives the LIVE
  truth — query it before asserting any schema status (traps G1/G6).
- Supabase advisors (WARN): `rls_auto_enable` anon-executable (platform recipe, not ours);
  leaked-password protection off; `vector` + `pg_net` in `public`. CLEARED by 0029/0030: the 2
  auto-confirm functions are no longer anon-executable, `function_search_path_mutable` 3 → 0.

## Sandbox facts
- **Docker unavailable** → cannot deploy an EF or run `rls-live-check.sh` here. No
  `SUPABASE_ACCESS_TOKEN`/`.env.local`. `deno` absent → EF tests cannot run locally.
- `vault.create_secret(...)` IS permitted via MCP; `alter database ... set app.settings.*` is
  REFUSED (`42501`).
- **verify_jwt trap**: the CLI default is TRUE; `supabase functions deploy` silently flips the
  platform JWT check ON for callers holding no user JWT. Declare it explicitly per function.
  `fn-dev-auth` is a dev backdoor still deployed (`verify_jwt=false`, `CORS '*'`) — delete before
  the tag.
- `.agents_tmp/PLAN.md` at the workspace root belongs to a *planning conversation* sharing
  `/workspace/project`. Leave it alone; don't commit it.
- agent-server: scoped `POST /api/conversations/{cid}/file/upload` rejects paths outside the
  conversation workspace (422) — a CLIENT error, not an Aurora bug.
