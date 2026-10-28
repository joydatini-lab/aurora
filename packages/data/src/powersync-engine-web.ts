/**
 * powersync-engine-web.ts — the WEB (browser) PowerSync database constructor.
 *
 * `@powersync/web` is WASQLite (SQLite compiled to WASM, persisted in OPFS /
 * IndexedDB). It is the ONLY engine that gives the web shell a real local
 * database, hence real offline-first (AD-7).
 *
 * ⚠️ Deployment requirement: WASQLite needs `SharedArrayBuffer`, which the
 * browser only exposes on a **cross-origin isolated** page. The host MUST send:
 *   Cross-Origin-Opener-Policy:   same-origin
 *   Cross-Origin-Embedder-Policy: require-corp
 * (see `apps/web/public/_headers`). Without them PowerSync degrades and the
 * local mirror is not durable across reloads.
 *
 * `@powersync/web` was already a declared dependency of `@aurora/data` (never
 * imported before this file) — the package anticipated this target.
 */
export { PowerSyncDatabase as WebPowerSyncDatabase } from '@powersync/web';
