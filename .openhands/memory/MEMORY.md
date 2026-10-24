# Aurora — project memory index

Detail, evidence and per-lot narratives live in the daily logs (`.openhands/memory/YYYY-MM-DD.md`).

## Commands / environment
- Toolchain: node 24, pnpm 10.28, TS 5.9. Use `corepack pnpm ...`. Default (isolated) install
  layout is correct — do NOT add `.npmrc` hoisting.
- Gates: `pnpm -r typecheck` · `pnpm -r lint` · `pnpm -r test` · `pnpm -r build` ·
  `sh scripts/check-boundaries.sh` · `sh scripts/check-rls.sh` ·
  `node --experimental-strip-types scripts/check-view-joins.ts` ·
  `node --experimental-strip-types tests/spine/spine.test.ts`.
- `pnpm -F @aurora/mobile build:web` needs `NODE_OPTIONS=--max-old-space-size=8192` (default OOMs).
- **BASELINE (2026-10-24, `b2d7040`) = GREEN.** typecheck 0 · lint 0 (0 err/0 warn) · test
  **661/661** · build 0 · boundaries G1–G4 OK · RLS OK (28 files) · view-joins OK (88 .sql).
- **`pnpm -r <script>` stops at the FIRST failing package** — a green package hides all following
  ones. Never read `pnpm -r` output as "all green"; iterate per package.
- CI has NEVER run on GitHub (`actions/runs` → `total_count: 0`). Its wave-0 `continue-on-error`
  guards are keyed on `!exists('packages/domain/package.json')`, which now EXISTS, so every gate
  step is already BLOCKING.
- Pushing: a tokenless https remote prompts for a username and HANGS. Fix:
  `git remote set-url origin "https://${GITHUB_TOKEN}@github.com/joydatini-lab/aurora.git"`.
  (`gh` is unauthenticated; use curl against api.github.com.)

## Architecture facts (load-bearing)
- **`agent_runs` (0008) is the ONLY conversation store** — no conversations/messages tables.
  Server-owned, per-user RLS; device reads it via a publishable Supabase client (AD-7), never
  writes. Not a PowerSync stream; the device polls (3 s while running, terminal stops the poll).
- Device NEVER sees a provider stream (F-09): the kernel runs server-side
  (fn-agent-run → job → kernel → polled `agent_runs`).
- `packages/agent` = server kernel (device sees only AgentRunState). `packages/ui` = pure design
  system (AD-6: must NOT import @aurora/data or @aurora/platform).
- `packages/ui` vendors @assistant-ui/react + ReUI (re-exported from `src/index.ts`); `cn` resolves
  via the `cn@0.4.0` npm package (`src/lib/utils.ts` re-exports it).
- Route table is a documented SSoT (`docs/mobile/navigation-and-page-composition.md`) — ratify new
  routes there. `/agent` = chat surface; `/agent/conversations` = run list.

## Gate integrity (learned the hard way)
- ALWAYS run the RECURSIVE gate before claiming it green: `pnpm -F <pkg> typecheck` passed while
  `pnpm -r typecheck` was RED. Same for lint.
- Nested `pnpm run` scripts can't find `pnpm`; `corepack enable` FAILS (EACCES). Shim:
  `printf '#!/bin/sh\nexec corepack pnpm "$@"\n' > /tmp/bin/pnpm; chmod +x /tmp/bin/pnpm;
  export PATH=/tmp/bin:$PATH`.
- **Phantom empty-state defect**: a page hard-coding `state={{ status: 'empty' }}` with 0 data
  calls. Find via `grep -rn "state={{ status: 'empty' }}" apps/mobile/src/pages/`. `UxStates` does
  NOT render `children` in the `empty` branch (the body vanishes from the DOM).

## Testing gotchas
- jsdom lacks `window.matchMedia`: any test rendering `AgentThinkingLoader` (or a parent) must mock
  it (see `packages/ui/test/chat-panel.test.tsx` `mockMatchMedia`).
- `packages/ui` tests use a local `test/render.ts` (React 18 `act` + createRoot), not RTL.

## LibreChat — DISPROVEN (do not resurrect)
- The "LibreChat integration" story (branch `integration/librechat`, `docs/integration/`,
  ADR-INT-001, M1→M5.2, SHA e8f3be08…) was **FALSE**: the branch is a **404** and
  `docs/integration/` does not exist. Owner decision: **LibreChat abandoned**, LobeHub = design
  reference only. Refutation: `docs/plans/2026-10-23-repriorisation.md`.

## Phase 0 rebaselining (branch `rebaseline/2026-10-23`)
- Owner decisions: **web-first → desktop → mobile** (adr-extract §23 "mobile-only" SUPERSEDED);
  **LibreChat abandoned**; **LobeHub = design reference only**; `packages/ui` KEPT; Ionic kept.
- **AD-13 in the spine = "Contract Packs gate parallel work"** — NOT mobile-only. The "Phase 1
  mobile-only" text lives in `adr-extract.md` §23 (l.649). Never conflate them.
- **OWNER RATIFIED**: Ionic = MOBILE ONLY (web+desktop = React + shadcn/ReUI, no `ion-*`) ·
  Electron confirmed, Tauri rejected · scope = the 44 screens PLUS new-feature screens (Design
  Space Pro etc.) · responsive = 5 Tailwind breakpoints × 8 gabarits × 7 contracts C1–C7,
  `lg`=1024px the structural 1→2 panel threshold · create `apps/web-app` (React), keep
  `apps/mobile`. The Ionic choice contradicts reference **D-06**, so the reference itself (§10.2
  item 6) demands a motivating ADR — written in `adr-018` §7.
- **DESIGN SPACE PRO IS ENTIRELY MISSING** though it is a first-version module (D-03, §6, §10.4):
  no package, catalog row, screen, SQL table or route. The biggest vision↔repo gap. Scope:
  `docs/frontend/design-space-scope.md` (→ 44 + ~13 ≈ 57 screens).
- **Licences (verified at source)**: LobeHub = "LobeHub Community License" (Apache-2.0 **+ cond.
  1b**: a commercial licence is REQUIRED to distribute a derivative) despite `package.json` saying
  `MIT` — the LICENSE file prevails. LibreChat = MIT. => NEVER copy LobeHub code/assets.
- `packages/ui` = ~272 component files; `src/index.ts` has 190 export LINES (175 `export … from`,
  956 named exports). `assistant-ui/elements/` 138 files **never wired into any app** (brick
  reserve). **No responsive system**: `packages/ui/tailwind.config.ts` has NO `screens`.
- Reference §7.2 forbids new root entities before audit → a logo/poster/document = an existing
  **`Artifact`**; `Project`/`Goal`/`GoalProject` already exist. §4.3 responsive CONTRACTS are
  requirements, not proposals.
- Deliverables: `docs/ci/gate.md` · `adr-018-direction-plateforme-web-first.md` ·
  `docs/frontend/{ui-brick-inventory,web-shell-and-responsive,spec-template-v1}.md` · plans
  `2026-10-23-repriorisation.md`, `2026-10-24-phase0-rebaseline.md`.

## CI gate: the trap that hid 100+ "errors" (2026-10-24, b2d7040)
- **A `react-hooks/*` error can mean the PLUGIN is missing, not that the code is bad.** ESLint
  reports *"Definition for rule 'react-hooks/x' was not found"* for every
  `eslint-disable-next-line react-hooks/...` directive whose rule is unresolvable. 26 of ~31
  "violations" were this. `eslint --print-config <file>` is the authoritative check: it lists the
  actually-loaded plugins/rules.
- **`packages/ui` was in its own AD-10 ban block** (the engines are *restricted TO* ui), so the
  barrel `src/index.ts` failed for re-exporting `./motion`. Read an AD literally before encoding
  it in lint globs.
- **Vendored != Aurora**: `packages/ui/src/components/{reui,assistant-ui,examples}/**` is
  registry-installed third-party code (ReUI MCP, assistant-ui registry). Treat like `node_modules`
  (ignore block). `components/ui/**` IS Aurora (shadcn base + local) and stays linted.
- **CRLF trap**: editing a CRLF file with Python `open(w)` silently rewrites it to LF, turning a
  1-line fix into a 200-line diff. Check `git diff --stat -w`; restore with
  `b.replace(b'\r\n',b'\n').replace(b'\n',b'\r\n')`.
- `check-view-joins.ts` needs `node --experimental-strip-types`; `pnpm exec tsx` fails (tsx is not
  a workspace dep). `check-boundaries.sh G2` false-positived on `sk-[A-Za-z0-9]{8,}` (skill IDs,
  skeleton CSS); threshold is now `{20,}`. `code_files()` scans only `git ls-files`.
- Root causes + full evidence: `.openhands/memory/2026-10-24.md`.

## Sandbox facts (this environment)
- FS is EPHEMERAL (`/tmp` and the Playwright cache can vanish mid-session — re-run
  `npx playwright install chromium`; prefer `git checkout -- <file>` over /tmp backups).
- Live render: `corepack pnpm -F @aurora/mobile dev --port 12000 --host 0.0.0.0`, then Playwright.
- Ionic `ion-button` may match 2 elements with an aria-label — click via
  `page.evaluate(() => document.querySelector(...).click())`. For persisted `ui-state` defaults use
  a FRESH `browser.newContext()` (localStorage leaks otherwise).
- `build:web` gz budget is 3/3 green with a FRESH `dist/` (rm -rf first); a stale dist fails.
- Dev blank-page bug FIXED (`e57453e`): `process is not defined` from a MODULE-LOAD side effect in
  `packages/discovery/src/jobs.ts`. Lesson: on a Node-global throw in a browser bundle, grep every
  imported package's module-load side effects, not just app code.

## agent-server file upload (422 "path must be inside the conversation workspace")
- Scoped `POST /api/conversations/{cid}/file/upload` rejects any path outside the conversation
  workspace root; unscoped `POST /api/file/upload` does not. A 422 means the CLIENT sent a
  relative/out-of-workspace path — **not an Aurora bug**. Session key from `/proc/<pid>/environ`
  (`SESSION_API_KEY`, never echo). Detail: `.openhands/memory/2026-10-24.md`.
- `.agents_tmp/PLAN.md` at the workspace root belongs to a *planning conversation* (another
  conversation shares `/workspace/project`). Leave it alone; don't commit it.

## Owner documents (uploaded 2026-10-24, commit 07d70a6 on main)
5 files at repo ROOT: `Aurora-Reference-Produit-Fonctionnelle-v1.1.md` (1622 l, THE master product
reference), `LOGO.md`, `AFFICHE.md`, `VIDEO.md`, `deep-research-report.md`. They SUPERSEDE the
LibreChat brief. Decisions D-01…D-08 (§13.1): all prior modules KEPT; **Design Space Pro** = 1st
creative extension; **Web responsive → Desktop → Mobile**; Next.js for the public site only
(`apps/marketing`); TanStack per-responsibility.
