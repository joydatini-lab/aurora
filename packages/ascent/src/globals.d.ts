/**
 * globals.d.ts — the ONE global this package needs, declared explicitly.
 *
 * `structuredClone` (Node ≥ 17, every evergreen browser) is not part of any
 * `lib.es20xx` — TypeScript only declares it in `lib.dom.d.ts` and
 * `@types/node`. Adding either would be wrong here:
 *   - `lib.dom` would let DOM code pass typecheck, which directly contradicts
 *     this package's contract ("no DOM (AD-12/F-09)" in package.json);
 *   - `@types/node` would pull `process`/`Buffer` into a package that must
 *     stay runtime-agnostic (it runs in the Edge Function and in node:test).
 *
 * So we declare exactly the signature we use. It is a real global at runtime on
 * both targets; this file only teaches the compiler about it.
 *
 * Consequence (verified 2026-10-28): 13 typecheck errors in `src/adapter.ts`
 * (6 × TS2304 "Cannot find name 'structuredClone'" + 7 × TS7006 cascading
 * implicit-`any`, because `const next = structuredClone(path)` degraded to
 * `any`) collapse to zero.
 */
declare function structuredClone<T>(value: T): T;
