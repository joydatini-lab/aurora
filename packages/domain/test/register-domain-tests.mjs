// Registers the Node ESM resolve hook so @aurora/domain's extensionless source
// imports resolve under `--experimental-strip-types` (zero-dep, cross-platform).
// Same pattern as packages/data and packages/ascent.

import { register } from 'node:module';

register(new URL('./domain-resolve-hook.mjs', import.meta.url));
