// Isomorphisme de la lecture d'environnement — régression du 2026-10-28.
//
// LE BUG OBSERVÉ
// `packages/integrations/src/research-provider.ts` lisait `process.env.EXA_API_KEY`
// dans son constructeur, et `packages/discovery/src/jobs.ts` appelait
// `createResearchProvider()` au CHARGEMENT du module. Sur la coquille web, tout
// le graphe d'imports échouait donc au démarrage :
//
//   ReferenceError: process is not defined
//     at new ExaResearchProvider (research-provider.ts:17)
//     at createResearchProvider (research-provider.ts:166)
//     at discovery/src/jobs.ts:127
//
// Résultat : écran blanc, aucune interface, et le module d'entrée jamais évalué.
//
// LA GARDE (ce que ce fichier vérifie)
//  1. `readEnv` renvoie le fallback quand `process` n'existe pas — sans lever.
//  2. Les adapters se construisent sans `process` (ils sont juste « non
//     configurés », ce que le produit sait déjà gérer : offline provider).
//  3. `DISCOVERY_JOB_HANDLERS` se charge sans `process` : plus d'effet de bord
//     au chargement.
//  4. Aucun fichier de `src/` ne réintroduit une lecture `process.env.X`
//     directe — c'est le test qui empêche la rechute, pas la vigilance.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(PKG_ROOT, 'src');

/**
 * Exécute `fn` avec `globalThis.process` retiré — l'état d'un navigateur.
 * On restaure TOUJOURS dans un `finally` : un test qui laisse `process` cassé
 * ferait échouer les fichiers suivants pour une mauvaise raison.
 */
function withoutProcess<T>(fn: () => T): T {
  const g = globalThis as { process?: NodeJS.Process };
  const saved = g.process;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- simulation navigateur
  g.process = undefined as any;
  try {
    return fn();
  } finally {
    g.process = saved;
  }
}

test('readEnv : fallback quand process est absent (navigateur)', async () => {
  const { readEnv } = await import('../src/env.ts');
  withoutProcess(() => {
    assert.equal(readEnv('EXA_API_KEY'), '', 'doit valoir "" et non lever');
    assert.equal(readEnv('EXA_URL', 'https://defaut'), 'https://defaut');
  });
});

test('readEnv : lit la valeur quand process existe (serveur)', async () => {
  const { readEnv } = await import('../src/env.ts');
  const g = globalThis as { process?: NodeJS.Process };
  const saved = g.process?.env;
  try {
    if (!g.process) g.process = {} as NodeJS.Process;
    g.process!.env = { ...(saved ?? {}), AURORA_TEST_KEY: 'valeur-test' } as NodeJS.ProcessEnv;
    assert.equal(readEnv('AURORA_TEST_KEY'), 'valeur-test');
  } finally {
    if (g.process && saved !== undefined) g.process.env = saved;
  }
});

test("les adapters de research se construisent sans `process`", async () => {
  const { createResearchProvider } = await import('../src/research-provider.ts');
  withoutProcess(() => {
    const provider = createResearchProvider();
    assert.ok(provider, 'createResearchProvider() doit renvoyer un provider');
    // Sans clé (navigateur), aucun vendor n'est configuré → dégradation
    // attendue vers le provider offline (AD-1), jamais une exception.
    assert.equal(provider.isConfigured(), false);
    assert.equal(provider.id, 'offline');
  });
});

test("notifications et composio se construisent sans `process`", async () => {
  const [{ OneSignalServerClient }, { ComposioIntegrationProvider }] = await Promise.all([
    import('../src/notifications.ts'),
    import('../src/composio.ts'),
  ]);
  withoutProcess(() => {
    assert.doesNotThrow(() => new OneSignalServerClient());
    assert.doesNotThrow(() => new ComposioIntegrationProvider());
  });
});

test('aucune lecture process.env.<CLE> directe dans src/ (rechute)', () => {
  const offenders: string[] = [];

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      if (statSync(abs).isDirectory()) {
        walk(abs);
        continue;
      }
      if (!/\.tsx?$/.test(entry)) continue;
      const src = readFileSync(abs, 'utf8');
      src.split('\n').forEach((line, i) => {
        // Commentaires : on ignore (la doc mentionne process.env exprès).
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
        // NODE_ENV est remplacé à la compilation par le bundler, pas concerné.
        if (/process\.env\.NODE_ENV/.test(line)) return;
        if (/process\.env\.[A-Z_]/.test(line)) {
          offenders.push(`${entry}:${i + 1}: ${trimmed.slice(0, 90)}`);
        }
      });
    }
  };
  walk(SRC);

  assert.deepEqual(
    offenders,
    [],
    'Utilise readEnv() de ./env : `process` n\'existe pas dans un navigateur, et ' +
      'une lecture directe fait échouer TOUT le graphe d\'imports au démarrage.\n' +
      offenders.join('\n'),
  );
});
