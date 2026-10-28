/**
 * preferences-web.ts — the WEB implementation of the updater's storage
 * primitive (see `apps/mobile/src/updater/preferences.ts` for the why).
 *
 * On the web the APK self-updater is a permanent no-op (`isNativePlatform()`
 * is false → every call site returns early). This shim exists only so the
 * module graph resolves without dragging `@capacitor/preferences` into the
 * browser bundle. It is deliberately a plain localStorage adapter — if a web
 * caller ever asks for it, it still behaves correctly.
 */
export interface KeyValueStore {
  get(key: string): Promise<{ value: string | null }>;
  set(key: string, value: string): Promise<void>;
}

export const keyValueStore: KeyValueStore = {
  get: async (key) => {
    try {
      return { value: window.localStorage.getItem(key) };
    } catch {
      return { value: null };
    }
  },
  set: async (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* quota / private mode — the updater is a no-op on web anyway */
    }
  },
};
