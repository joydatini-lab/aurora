/**
 * @aurora/artifact — AD-1/AD-10 boundary.
 * Vendor SDKs (supabase, powersync, cloudflare/R2, ion, react…) are banned here:
 * the module is pure domain logic + use-cases. The actual R2 PUT is performed by
 * an adapter (packages/integrations or apps/server), never by this package — it
 * only builds the command and the event that FOLLOW the upload (F-06).
 *
 * Exports (tranche 3, lot 3.2):
 *   - commands: one-command-per-mutation builders for the 2 tables this module
 *               owns (artifacts, artifact_files). ZERO new tables.
 *               `markUploaded` is the sole producer of `ArtifactGenerated`.
 */
export * from './commands.ts';
