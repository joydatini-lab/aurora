/**
 * preferences.ts — the ONE place the updater touches `@capacitor/preferences`.
 *
 * Why this indirection (web pivot 2026-10-28, B1): `apkUpdater.ts` used to
 * import `@capacitor/preferences` at the top level. The import is perfectly
 * guarded at RUNTIME (`Capacitor.isNativePlatform()`), but a bundler resolves
 * it at BUILD time — so the web shell could not build at all:
 *   `Rollup failed to resolve import "@capacitor/preferences"`
 *
 * Splitting the storage primitive into its own module lets each shell provide
 * its own implementation:
 *   - dormant mobile shell → this file (Capacitor Preferences)
 *   - web shell (`apps/web`) → `src/shims/preferences-web.ts` (localStorage),
 *     wired through a Vite alias + a TS path mapping.
 *
 * The updater itself stays byte-for-byte the same logic on both targets.
 */
import { Preferences } from '@capacitor/preferences';

export interface KeyValueStore {
  get(key: string): Promise<{ value: string | null }>;
  set(key: string, value: string): Promise<void>;
}

export const keyValueStore: KeyValueStore = {
  get: (key) => Preferences.get({ key }).then((r) => ({ value: r.value ?? null })),
  set: async (key, value) => {
    await Preferences.set({ key, value });
  },
};
