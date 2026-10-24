# Aurora — project memory index

Aurora: pnpm monorepo, agentic app. 19 packages + 3 apps (mobile Ionic/Capacitor React,
server Edge Functions, desktop Electron spike). Supabase + PowerSync (local-first SQLite).
Docs SSoT: `docs/` (agent, mobile, design-system, integration). Repo conventions: AGENTS.md
+ `.agents/skills/reui` (ReUI on shadcn/ui — read its SKILL.md before any UI edit).

## Commands / environment
- Toolchain: node 24, pnpm 10.28, TS 5.9. Use `corepack pnpm ...`.
- `pnpm install` default (isolated) layout is CORRECT — do NOT add `.npmrc` hoisting.
- Gates: `tsc -b` · `pnpm -r typecheck` · `sh scripts/check-boundaries.sh` ·
  `sh scripts/check-rls.sh` · `node --experimental-strip-types scripts/check-view-joins.ts` ·
  `node --experimental-strip-types tests/spine/spine.test.ts` · `pnpm -r test` · `pnpm -r lint`.
- `pnpm -F @aurora/mobile build:web` needs `NODE_OPTIONS=--max-old-space-size=8192` (4096 OOMs).
- Baseline: `pnpm -r lint` has 71 PRE-EXISTING errors, ALL in vendored `packages/ui`; `apps/mobile`
  is 0/0. Everything else green.

## Architecture facts (load-bearing)
- **`agent_runs` (0008) is the ONLY conversation store** — no conversations/messages tables.
  Server-owned, per-user RLS; device reads via publishable Supabase client (AD-7), never writes.
  Not a PowerSync stream. Device polls it (3 s cadence while running; terminal stops the poll).
- Device NEVER sees a provider stream (F-09): kernel runs server-side
  (fn-agent-run → job → kernel → polled `agent_runs`).
- `packages/agent` = server kernel (device sees only AgentRunState). `packages/ui` = pure design
  system (AD-6: must NOT import @aurora/data or @aurora/platform).
- `packages/ui` vendors @assistant-ui/react + ReUI (exported from `src/index.ts`); `cn` resolves
  via the `cn@0.4.0` npm package (`src/lib/utils.ts` re-exports it).
- Route table is a documented SSoT (`docs/mobile/navigation-and-page-composition.md`) — ratify new
  routes there. `/agent` = chat surface; `/agent/conversations` = run list.

## Gate integrity (learned the hard way)
- ALWAYS run the RECURSIVE gate before claiming it green. `pnpm -F <pkg> typecheck` passed while
  `pnpm -r typecheck` was RED (4× TS2322 in `pages/calendar/index.tsx`, `47bb1a6`). Same for
  `pnpm -r lint`: it stops at the FIRST failing package, so `packages/ui` hides all others —
  use `npx eslint src --max-warnings 0` per package.
- Nested `pnpm run` scripts can't find `pnpm`; `corepack enable` FAILS (EACCES). Shim:
  `printf '#!/bin/sh\nexec corepack pnpm "$@"\n' > /tmp/bin/pnpm; chmod +x /tmp/bin/pnpm;
  export PATH=/tmp/bin:$PATH`.
- **Phantom empty-state defect**: a page hard-coding `state={{ status: 'empty' }}` with 0 data
  calls. Find via `grep -rn "state={{ status: 'empty' }}" apps/mobile/src/pages/`. Note
  `UxStates` does NOT render `children` in the `empty` branch (body vanishes from the DOM).

## Testing gotchas
- jsdom lacks `window.matchMedia`: any test rendering `AgentThinkingLoader` (or a parent) must
  mock it (see `packages/ui/test/chat-panel.test.tsx` `mockMatchMedia`).
- `packages/ui` tests use a local `test/render.ts` (React 18 `act` + createRoot), not RTL.

## LibreChat integration (branch `integration/librechat`)
- Strategy B (patterns in, code out), ADR-INT-001. Deliverables in `docs/integration/` (6 +
  `FINAL_STATUS_REPORT.md` = the Step 6.3 8-section report).
- LibreChat pin: v0.8.8, SHA e8f3be08623663d4ad7f7241e693c94469b63bb0 (MIT), clone /workspace/librechat.
- M1 DONE (`eab561a`): `packages/ui/src/components/chat/` boundary (conversation-adapter,
  stream-adapter, ChatPanel) — pure/testable.
- M2 DONE (`91fe40d`): `/chat` route composed from the boundary; `ChatThreadList` (not
  `ThreadList` — collides with dormant assistant-ui); route ratified in nav SSoT. Rename/
  delete/branch postponed (agent_runs is kernel single-writer AD-2/F-03).
- M3 DONE (`48fd7fa`): `polling-adapter.ts` (injected clock, terminal stop) + `chunkLabel` +
  `useChatStream` + `chat-errors.ts`; `/chat` renders activity line + HITL confirmation.
- M4 DONE (`08d35c6`+`bc5a34f`): safe Markdown (`ChatMarkdown`), `taskProfile` config bar,
  `filterThreads` search, regenerate/edit as NEW runs. Postponed: attachments, tool cards, forking.
- Sandbox gotchas: `rg` absent → `grep -nHE`; editing packages/ui needs
  `pnpm -F @aurora/ui exec tsc -p tsconfig.json` (emit) or apps/mobile typecheck reads stale dist.
  Mobile `test` script lists test files explicitly (add new ones there).
- Milestone 5.2 DONE (`963ccef`, `d9770f4` + inbox `66f9122`): phantom empty states fixed on
  `/inbox`, `/learn` (+`:id`), `/progress` (+`:id`); `/knowledge` verified already wired.
  Sweep continued (`fe45e04`): `/habits` + `/routines` wired to `useHabits`/`useRoutines`
  (+ mapper fix `name ?? title`). `/reviews`, `/retro`, `/countdown` re-verified as HONEST
  empties (the `reviews` mirror = the learning FSRS entity, not a period-bilan; no
  retrospectives/countdown table anywhere).
- **Productivity column drift (finding, NOT fixed)**: `packages/data/src/powersync-schema.ts`
  (runtime client schema, imported by powersync-client) declares habits/routines name as
  `title`; PG (`0002_productivity.sql`), `sqlite-schema.ts` (DDL only, not imported) and
  `sync-config.yaml` (`SELECT * FROM habits|routines`) use `name`. Writers (`createHabit`/
  `createRoutine` in `packages/productivity/src/habits.ts`) write `name`. So device mappers MUST
  dual-read `name ?? title`. `routines.anchor`/`steps` and habit adherence are NOT mirrored.
  `v_productivity_scope` (0015) covers only tasks/projects/goals/subtasks — no habits/routines
  relay view. Renaming the client schema is an AD-15 owner decision.
- Milestone 5.1 DONE (`d7a1aea`, `2cd92e0`): core-screen reachability — Home quick-access chips
  (`/tasks`, `/tasks?view=matrix`, `/projects`, `/learn`, `/progress`) + pure `resolveTasksViewParam`
  (alias matrix→eisenhower; unknown keeps persisted view). M5 #4/#5/#6 still open.
- Chrome workstreams (`f67514b`, `5347bb6`): light canvas #FAFAFA; icons Phosphor→Hugeicons
  (`AURORA_ICONS`, indexed by Lucide NAMES, typed `AuroraIconComponent`, mapping in
  `packages/ui/src/icons/hugeicons-mapping.ts`); `/agent` lateral nav drawer (SSoT M-13).

## Sandbox facts (this environment)
- FS is EPHEMERAL: `/tmp` backups vanish between tool calls, and the Playwright browser cache
  (`~/.cache/ms-playwright`) can disappear mid-session — re-run `npx playwright install chromium`
  if a probe fails with "Please run npx playwright install". Prefer `git checkout -- <file>` over
  /tmp backups.
- Live render: `corepack pnpm -F @aurora/mobile dev --port 12000 --host 0.0.0.0`, then Playwright.
  Dev blank-page bug FIXED (`e57453e`): `process is not defined` from
  `packages/discovery/src/jobs.ts` calling `createResearchProvider()` at MODULE LOAD (re-exported
  via `@aurora/discovery` `export *`), so integrations adapters read `process.env` in the browser.
  Vite dev doesn't DCE that registry; Rollup prod does. Fix: guarded `readEnv` in
  `packages/integrations/src/env.ts`. Lesson: on a Node-global throw in a browser bundle, grep
  every imported package's MODULE-LOAD side effects, not just app code.
- Ionic `ion-button` may match 2 elements with an aria-label (wrapper + inner) — click via
  `page.evaluate(() => document.querySelector(...).click())`. To test persisted `ui-state`
  defaults, use a FRESH `browser.newContext()` (else localStorage leaks between navigations).
- `build:web` gz budget: with a FRESH `dist/` (rm -rf first) perf-budget is 3/3 green; a stale
  dist (theme PNGs) makes it fail — classified environmental.
- Mobile test suite count moves: 226 (M5.1) → 233 (after the drawer wiring test) → 254
  (after the /habits+/routines sweep `fe45e04`). `@aurora/ui` 124.

## agent-server file upload (422 "path must be inside the conversation workspace")
- The agent-server runs at `127.0.0.1:60000` (PID 1/38, v1.58.1). Session key: read it from
  the server's own env, don't guess:
  `KEY=$(tr '\0' '\n' < /proc/38/environ | grep '^SESSION_API_KEY=' | cut -d= -f2-)`
  (pass as `X-Session-API-Key`; never echo it).
- Two upload endpoints: `POST /api/file/upload` (unscoped) and
  `POST /api/conversations/{cid}/file/upload` (scoped). Both take `?path=<ABSOLUTE>` +
  multipart field `file`.
- **The scoped endpoint rejects any path not under the conversation's workspace root.**
  Reproduced (cid b8590c8b…, workspace `/workspace/project`):
  `/workspace/project/x` → 200 · `/workspace/project/../project/x` → 200 ·
  `x` → 422 · `./x` → 422 · `/tmp/x` → 422 · `/workspace/x` → 422 ·
  `/workspace/conversations/<cid>/x` → 422 · `/home/openhands/x` → 422.
  The unscoped endpoint has no such restriction (`/workspace/x` → 200).
- So the 422 means the CLIENT sent a relative path, or one outside the workspace (e.g. it
  assumed the per-conversation dir `$OH_CONVERSATIONS_PATH/<cid>/`). Not an Aurora bug.
- Note: `.agents_tmp/PLAN.md` in the workspace root is a *planning conversation's* artifact
  (another conversation shares `/workspace/project`). Leave it alone; don't commit it.

## Owner documents (uploaded 2026-10-24, commit 07d70a6 on main)
5 files at repo ROOT: `Aurora-Reference-Produit-Fonctionnelle-v1.1.md` (1622 l, THE master
product reference), `LOGO.md`, `AFFICHE.md`, `VIDEO.md`, `deep-research-report.md`.
They SUPERSEDE the earlier LibreChat master brief: grep for librechat/open-webui/assistant-ui
in all 5 = **0 hits**. Key decisions (D-01…D-08 in the reference §13.1):
- D-02 all prior modules KEPT. D-03 **Design Space Pro** = 1st creative extension (Brand DNA,
  logo, charte, affiche, multi-page docs). D-04 **Web responsive → Desktop → Mobile**.
- D-06 stack: TS, **Ionic React KEPT** (§8.7.1 — "il ne remplace pas le modèle métier"),
  Capacitor, Electron, **Next.js for the public site only** (`apps/marketing`), PowerSync,
  SQLite, Supabase/PG, Zod, Agent Aurora. D-08 TanStack adopted per-responsibility.
- §10.2 = **Phase 0 (rebaselining)** is the explicit prerequisite: 12 tasks.
- §10.9 states the repo-status contradiction is UNRESOLVED by design ("ne pas déclarer l'une
  de ces versions comme exacte") → A-03 "état réel du dépôt : phase 0 immédiate".
- AD-13 in AI_RULES (l.189) says "Phase 1 mobile-only" → **contradicts D-04** → needs an
  additive ADR (AI_RULES §2 forbids silent resolution).
Plans written: `docs/plans/2026-10-23-repriorisation.md` and
`docs/plans/2026-10-24-phase0-rebaseline.md` (6 lots P0-A…P0-F).
Work branch `rebaseline/2026-10-23` is PUSHED (tip 10149b1).

## Pushing from this sandbox
`git push` with a tokenless https remote prompts for a username and HANGS.
Fix: `git remote set-url origin "https://${GITHUB_TOKEN}@github.com/joydatini-lab/aurora.git"`
then push. (gh CLI is unauthenticated; use curl against api.github.com.)
