/**
 * @aurora/knowledge — AD-1/AD-10 boundary.
 * Vendor SDKs (supabase, powersync, ion, react…) are banned here: the module is
 * pure domain logic + use-cases. UI rendering is owned by @aurora/ui + the
 * apps/mobile feature slices.
 *
 * Exports (tranche 3, lot 3.1):
 *   - commands: one-command-per-mutation builders for the 7 tables this module
 *               owns (notes, resources, semantic_nodes, semantic_edges,
 *               semantic_bridges, node_state, source_refs). ZERO new tables.
 *   - events:   the AD-9 relationship (Knowledge CONSUMES 2 events, produces 0)
 */
export * from './commands.ts';
export * from './events.ts';
