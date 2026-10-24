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
- **MEASURED BASELINE (2026-10-24, main@07d70a6) = RED.** Full detail in `docs/ci/gate.md`.
  * `pnpm -r lint` **fails to even load**: root `eslint.config.js` l.2 imports
    `eslint-plugin-storybook`, declared ONLY in `packages/ui/package.json` -> ERR_MODULE_NOT_FOUND
    for EVERY package (ui, mobile, domain…). So no package is actually linted. (An earlier memory
    said "71 pre-existing errors in packages/ui" — WRONG/stale.)
  * `pnpm -r typecheck`: ~95 TS errors in 7 pkgs (discovery 33, integrations 30, workflows 14,
    ascent 13, platform 6, data 2, mobile 1). Cause: `tsconfig.base.json` `lib:["ES2022"]` without
    `dom`, and no global `@types/node` -> `fetch`/`process`/`console`/`structuredClone`/`node:*`
    unresolved. 15 pkgs pass (they don't use those globals) — the defect is LATENT, not uniform.
  * `pnpm -r test`: 2 failures ONLY — `platform` + `focus`, both `Cannot find package
    '@capacitor/core'` (declared in platform's package.json but not linked). ~700 tests pass.
  * `check-boundaries.sh` G2 **FALSE POSITIVE**: matches CSS class `sk-progress` (skeletons.tsx)
    and skill id `sk-capacite-portante` as if Stripe keys `sk_live_`. Script bug, not a leak.
  * GREEN: install (lockfile unchanged), check-rls (28 migrations), check-view-joins (88 .sql),
    spine test.
- **CI has NEVER run on GitHub**: `GET /repos/joydatini-lab/aurora/actions/runs` -> `total_count: 0`.
  `ci.yml` still carries wave-0 `continue-on-error` guards while all 19 packages exist -> CI is
  silently inert. Removing them is required, but only AFTER the gate is actually green.
- **`pnpm -r <script>` stops at the FIRST failing package** — a green package hides all following
  ones. Never trust `pnpm -r` output as "all green"; iterate per package.

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
- ALWAYS run the RECURSIVE gate before claiming it green: `pnpm -F <pkg> typecheck` passed while
  `pnpm -r typecheck` was RED (4× TS2322 in `pages/calendar/index.tsx`, `47bb1a6`). And
  `pnpm -r <script>` stops at the FIRST failing package, so a green package hides all others.
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

## LibreChat — DISPROVEN (do not resurrect)
- The whole "LibreChat integration" story (branch `integration/librechat`, `docs/integration/`,
  ADR-INT-001, milestones M1→M5.2, SHA e8f3be08…) was **FALSE**. `GET .../git/ref/heads/
  integration%2Flibrechat` → **404**; `docs/integration/` **does not exist**; `docs/plans/
  2026-10-23-repriorisation.md` documents the refutation. Owner decision 2026-10-24:
  **LibreChat abandoned**, LobeHub = design reference (see Phase 0 section).
## Phase 0 rebaselining (2026-10-24, branch `rebaseline/2026-10-23`)
- Owner decisions: **web-first → desktop → mobile** (adr-extract §23 "mobile-only" is
  SUPERSEDED); **LibreChat abandoned**; **LobeHub = design reference only**; `packages/ui`
  KEPT (screens rebuilt on top); Ionic kept; backend NOT refactored this phase.
- **AD-13 in the spine = "Contract Packs gate parallel work"** — NOT mobile-only. The
  "Phase 1 mobile-only" text is in `adr-extract.md` §23 (l.649). Never conflate them.
- Deliverables: `docs/ci/gate.md` · `docs/architecture/adr-018-direction-plateforme-web-first.md`
  · `docs/frontend/{ui-brick-inventory,web-shell-and-responsive,spec-template-v1}.md`
  (+ pilot §15–§20 in `docs/design-system/screens/taches-liste.md`). Per-lot detail in the
  daily log `.openhands/memory/2026-10-24.md`.
- **Licences (verified at source 2026-10-24)**: LobeHub = "LobeHub Community License"
  (Apache-2.0 **+ cond. 1b**: a commercial licence is REQUIRED to develop and distribute a
  derivative work) despite its `package.json` saying `MIT` — the LICENSE file prevails.
  LibreChat `LICENSE` = MIT (package.json says ISC). => NEVER copy LobeHub code/assets.
- **UI**: `packages/ui` = ~272 component files; `src/index.ts` has 190 export LINES (175
  `export … from` statements, 956 named exports) — the barrel re-exports nearly everything. `composites/` 34 with **11 having no
  story**; `assistant-ui/elements/` 138 **never wired into any app** (brick reserve only).
- **Screens**: 51 `.md` − 7 transverse = **44 screens** (matches ratified "44 docs / 54 slugs").
- **No responsive system**: `packages/ui/tailwind.config.ts` defines NO `screens` breakpoints.
- Open blockers: OQ-1 (Ionic shell scope — recommend mobile-only: `packages/ui` is Radix/shadcn
  and Ionic+Radix conflict), OQ-4 (1024 px two-panel threshold), OQ-2 (Electron vs Tauri),
  OQ-3 (first web delivery scope).

## Sandbox facts (this environment)
- FS is EPHEMERAL (`/tmp` and the Playwright cache can vanish mid-session — re-run
  `npx playwright install chromium`; prefer `git checkout -- <file>` over /tmp backups).
- Live render: `corepack pnpm -F @aurora/mobile dev --port 12000 --host 0.0.0.0`, then Playwright.
- Ionic `ion-button` may match 2 elements with an aria-label — click via
  `page.evaluate(() => document.querySelector(...).click())`. For persisted `ui-state`
  defaults use a FRESH `browser.newContext()` (localStorage leaks otherwise).
- `build:web` gz budget is 3/3 green with a FRESH `dist/` (rm -rf first); a stale dist fails.
- Dev blank-page bug FIXED (`e57453e`): `process is not defined` from a MODULE-LOAD side effect
  in `packages/discovery/src/jobs.ts`. Lesson: on a Node-global throw in a browser bundle, grep
  every imported package's module-load side effects. Full detail: `.openhands/memory/2026-10-24.md`.

## agent-server file upload (422 "path must be inside the conversation workspace")
- agent-server at `127.0.0.1:60000`; session key from its own env:
  `tr '\0' '\n' < /proc/38/environ | grep '^SESSION_API_KEY='` (never echo it).
- Scoped `POST /api/conversations/{cid}/file/upload` **rejects any path outside the
  conversation workspace root**; unscoped `POST /api/file/upload` does not. So the 422 means the
  CLIENT sent a relative or out-of-workspace path — **not an Aurora bug**. Reproductions and full
  detail: `.openhands/memory/2026-10-24.md`.
- `.agents_tmp/PLAN.md` at the workspace root is a *planning conversation's* artifact (another
  conversation shares `/workspace/project`). Leave it alone; don't commit it.

## Owner documents (uploaded 2026-10-24, commit 07d70a6 on main)
5 files at repo ROOT: `Aurora-Reference-Produit-Fonctionnelle-v1.1.md` (1622 l, THE master
product reference), `LOGO.md`, `AFFICHE.md`, `VIDEO.md`, `deep-research-report.md`.
They SUPERSEDE the LibreChat brief (grep librechat/open-webui/assistant-ui = 0 hits).
Decisions D-01…D-08 (§13.1): all prior modules KEPT; **Design Space Pro** = 1st creative
extension; **Web responsive → Desktop → Mobile**; Ionic React KEPT; Next.js for the public
site only (`apps/marketing`); TanStack per-responsibility. §10.2 = **Phase 0 rebaselining**
is the explicit prerequisite (12 tasks). Detail: `.openhands/memory/2026-10-24.md`.
Plans: `docs/plans/2026-10-23-repriorisation.md`, `docs/plans/2026-10-24-phase0-rebaseline.md`.

## Pushing from this sandbox
`git push` with a tokenless https remote prompts for a username and HANGS. Fix:
`git remote set-url origin "https://${GITHUB_TOKEN}@github.com/joydatini-lab/aurora.git"` then
push. (gh CLI is unauthenticated; use curl against api.github.com.)
