// Registers the Node ESM resolve hook so @aurora/data's + @aurora/productivity's
// extensionless source imports resolve under `--experimental-strip-types`
// (zero-dep, cross-platform). The hook file is plain .mjs — loadable via
// `--import` without type-stripping.

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hookPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../packages/data/test/data-resolve-hook.mjs',
);
register(pathToFileURL(hookPath));
