// ESM resolve hook: retry a failed relative specifier with a `.ts` suffix.
// `packages/domain/src/index.ts` re-exports its siblings extensionlessly
// (`./envelopes`, `./entities-*`), which Node's ESM resolver rejects under
// `--experimental-strip-types`. Same pattern as packages/data and packages/ascent
// (zero-dep, cross-platform: URL API, no manual drive-letter mangling).

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL) {
      const candidate = `${specifier}.ts`;
      const absUrl = new URL(candidate, context.parentURL);
      let absPath;
      try {
        absPath = fileURLToPath(absUrl);
      } catch {
        absPath = null;
      }
      if (absPath && existsSync(absPath)) {
        return nextResolve(candidate, context);
      }
    }
    throw err;
  }
}
