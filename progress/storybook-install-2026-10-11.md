# Storybook install — @aurora/ui (10.6.1, pnpm monorepo, 2026-10-11)

## What was installed
- `npx create-storybook@latest` → Storybook 10.6.1 in `packages/ui`
  (React + Vite builder, pnpm, features `docs test a11y`).
- Generated: `.storybook/main.ts`, `.storybook/preview.tsx`,
  `src/stories/*` (Button/Header/Page samples + Configure.mdx).
- Scripts in `packages/ui/package.json`: `storybook` (dev, port 6006),
  `build-storybook`.

## Dev server — OK
`pnpm exec storybook dev -p 6007` → "Storybook ready!" (manager + preview, ~3s).

## `build-storybook` — blocked (Windows env issue, not a Storybook misconfig)
Fails deterministically with:
  [commonjs--resolver] remove C:\Users\...\Temp\esbuild-<hash> : Accès refusé.
  file: node_modules/.pnpm/storybook@10.6.1.../dist/preview/runtime.js
- Happens on every retry even after `rm -rf %TEMP%\esbuild-*`.
- File itself is readable (node `fs.openSync(p,'r+')` OK) — the EACCES is on
  the esbuild *temp file* during the commonjs-resolve step of the preview build.
- Suspect: esbuild 0.21.5 binary vs Node v22.20.0 / Windows 11 (sandbox/AV
  interference on %TEMP%). Next steps: run build from a clean terminal outside
  Claude Code's sandbox, check antivirus exclusions for %TEMP%, or bump
  esbuild.
- Impact: only the static build (`storybook-static/`) is blocked; dev server
  and the generated scaffolding are fine.

## Pre-existing issue found (NOT caused by Storybook)
`apps/mobile` `vite build` already fails today (dirty WIP in working tree):
  src/pages/calendar/index.tsx:405:0 Unexpected "}" (esbuild parse error)

## Fix made during install
`packages/ui/vite.config.ts`: `autoprefixer` was listed as a *Vite* plugin
(it's a PostCSS plugin) — crashed Storybook builder-vite with Rollup
"plugin hook options for plugin undefined". Removed from plugins (Tailwind
handles prefixes itself). `tailwindcss` v3 dep kept (apps/mobile still uses it).

## Follow-up (agent-mode instructions from create-storybook)
Optional deeper setup (decorators/providers, MSW mocks, play functions, MCP
addon) — see best-practices doc fetched from /storybookjs/storybook.

## Addons audit + MCP wiring (part 2, same session)
Audited `packages/ui` devDeps — installed Storybook addons (all in `.storybook/main.ts` `addons`):
- `@storybook/addon-docs` 10.6.1 — autodocs
- `@storybook/addon-a11y` 10.6.1 — axe-core, `test: 'todo'` in preview.tsx
- `@storybook/addon-vitest` 10.6.1 + `@vitest/browser` 2.1.9 + `playwright` 1.64.0
  (test runner = vitest/browser via playwright, NOT the old jest-addon)
- `@chromatic-com/storybook` 5.4.0 — visual regression capture
- `@storybook/addon-mcp` 10.6.1 — official MCP server, exposed at `/mcp` on the
  Storybook server (verified: JSON-RPC `initialize` POST → 200 + SSE)
- `eslint-plugin-storybook` 10.6.1

NOTE: `@storybook/mcp-server` does NOT exist on npm (404) — the MCP server
lives inside `@storybook/addon-mcp`, running inside `storybook dev`.

## Port standardised on 6006
- `packages/ui` script `storybook` → `-p 6006` (was already 6006).
- Dev server currently running on 6006 (PID 2720), verified `POST /mcp` → 200.
- MCP client entry in `~/.claude.json`:
  ```json
  "storybook-mcp": { "type": "http", "url": "http://localhost:6006/mcp" }
  ```
  Previously pointed at 6007; aligned to 6006. `/mcp` only exists while
  `storybook dev` is running.

MCP client entry in `~/.claude.json` → `projects["C:/Users/joyda/dyad-apps/aurora-2"].mcpServers`:
```json
"storybook-mcp": { "type": "http", "url": "http://localhost:6006/mcp" }
```
(Previously a fake stdio entry using the non-existent `@storybook/mcp-server`
package — replaced.) `/mcp` only exists while `storybook dev` runs.

## Skill scope decision (2026-10-11)
The CDD/Storybook best-practices skill to be written next is **generic
(React + Storybook), not Aurora-specific**, so it stays portable. Aurora
serves only as the worked example. Port 6006 is the SSoT. Skill written in
English (CDD/Storybook vocabulary is natively English; more portable).

