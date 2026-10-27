# Aurora — defects, guards, decision framework (detail)

Extracted from MEMORY.md 2026-10-27 to keep the index small.

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
- **D3 — FIXED 2026-10-27 (`fb608c1`, migration `0032_fix_phantom_columns.sql`)**: the three
  phantom columns (`tasks.tags`, `tasks.recurrence_rule`, `projects.view_mode`) are versioned.
  D2 also fixed (artifacts_kind_check widened 10 -> 13). `KNOWN_DEFECTS` is now EMPTY.
  Lesson that generalises: a phantom column is SILENT because
  `EngineLocalStoreBridge.upsert` is a **Map** keyed by column name — an unknown key is
  accepted, the screen renders, only the upstream PATCH fails (queued write, not a crash).
  A migration alone would create a NEW drift: also update `powersync-schema.ts` AND
  `sqlite-schema.ts` (3 declarations), verified by `client-schema-drift.test.ts`.
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

