/**
 * @aurora/identity — AD-1/AD-10 boundary.
 * Vendor SDKs (supabase, powersync, ion, react…) are banned here: the module is
 * pure domain logic + use-cases. The auth session itself is NOT handled here —
 * that is `packages/platform` + `@supabase/supabase-js`; this package owns the
 * `user_context` ROW (theme, preferences), which is domain data.
 *
 * Exports (tranche 3, lot 3.3):
 *   - commands: one-command-per-mutation builders for the single table this
 *               module owns (`user_context`). ZERO new tables.
 *               `setTheme` is the receiver of the agent's `identity.set_theme`.
 */
export * from './commands.ts';
