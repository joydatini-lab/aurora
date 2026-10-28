/**
 * powersync-engine-capacitor.ts — the NATIVE (Android/Capacitor) PowerSync
 * database constructor.
 *
 * Why this file exists (B2, web pivot 2026-10-28): `powersync-client.ts` used
 * to statically import `PowerSyncDatabase` from `@powersync/capacitor`. That
 * made the Capacitor engine a HARD dependency of every bundler target — a
 * browser build would bundle the native plugin (dead weight) and, worse, there
 * is no usable SQLite behind it on the web, so `local-first` (AD-7) silently
 * breaks.
 *
 * The engine ctor is now an EXPLICIT injection at the boot site (the seam the
 * previous file comments already described). Each platform picks its own:
 *   - mobile shell  → this file (`@powersync/capacitor`)
 *   - web shell     → `powersync-engine-web.ts` (`@powersync/web`)
 *
 * Note: `@aurora/mobile` (the dormant Capacitor shell) imports this module
 * directly, so the Capacitor vendor binding never leaks into `apps/web`.
 * AD-1: the vendor stays confined to `packages/data` — this is still an
 * adapter module, not a consumer import.
 */
export { PowerSyncDatabase as CapacitorPowerSyncDatabase } from '@powersync/capacitor';
