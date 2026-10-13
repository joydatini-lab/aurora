// renderer.jsx — le spike desktop PowerSync (voies A du doc §32.5).
//
// Réutilisation OBLIGATOIRE (zéro réécriture) :
//   - `createPowerSyncClientEngine` + `EngineLocalStoreBridge` +
//     `SqliteQueryRepository` viennent de @aurora/data (le MÊME moteur
//     que apps/mobile, boot-data.ts).
//   - Le constructor du DB est injecté ici : `PowerSyncDatabase` de
//     `@powersync/web` (WASQLite, le renderer Electron) à la place du
//     `@powersync/capacitor` de mobile — le point d'injection ajouté
//     dans powersync-client.ts (le seul changement du plan dans
//     packages/data).
//
// Un unique écran : login Supabase (publishable key, comme mobile) →
// engine init → upsync d'un `user_context` local → le statut sync + la
// ligne locale prouvent le round-trip (check #2/#3 du plan).
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createPowerSyncClientEngine,
  createAuroraSupabaseClient,
  EngineLocalStoreBridge,
  SqliteQueryRepository,
} from '@aurora/data';
import { PowerSyncDatabase } from '@powersync/web';

// Les valeurs d'env viennent de .env.local (VITE_) — jamais de secret
// durci (AD-3 : seule la publishable key est exposée au device, RLS fait
// l'office). Mêmes variables que apps/mobile/.env.local.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const POWERSYNC_URL = import.meta.env.VITE_POWERSYNC_URL;

// Check #1 (main.cjs `did-finish-load`): expose the boot status to the
// main process so it can be logged without opening devtools manually.
export function setPowerSyncBootStatus(status) {
  if (typeof window !== 'undefined') window.__powersyncBootStatus = status;
}

export function DesktopSpike() {
  const [status, setStatus] = useState({
    auth: 'idle',
    sync: 'idle',
    rows: 0,
    error: '',
  });

  useEffect(() => {
    let unsub = () => {};
    let cancelled = false;
    (async () => {
      try {
        // Même factory que apps/mobile (boot-data.ts) : le client Supabase
        // déjà lié au user connecté (AD-3 : publishable key uniquement).
        const supabase = createAuroraSupabaseClient({
          env: {
            supabaseUrl: SUPABASE_URL,
            supabasePublishableKey: SUPABASE_KEY,
          },
          powersyncUrl: POWERSYNC_URL,
        });
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          setStatus((s) => ({ ...s, auth: 'signed_out', error: "Pas de session Supabase — faire login côté app mobile d'abord" }));
          return;
        }
        setStatus((s) => ({ ...s, auth: 'signed_in' }));
        setPowerSyncBootStatus('auth=signed_in');

        const engine = createPowerSyncClientEngine(
          {
            endpoint: POWERSYNC_URL,
            createClient: () => supabase,
            dbFilename: 'aurora-desktop.db',
          },
          PowerSyncDatabase, // la voie A (WASQLite), pas Capacitor
        );
        await engine.init();
        await engine.addScope('identity');
        setPowerSyncBootStatus('engine=init+addScope(identity)');

        const bridge = new EngineLocalStoreBridge(engine.storeAdapter());
        const ctxRepo = new SqliteQueryRepository(bridge, 'user_context');

        // Upsync local-first (off-line capable, check #2) : une ligne de
        // user_context écrite côté desktop doit reparaître côté mobile au
        // prochain downsync (check #3).
        await engine.execute(
          `INSERT INTO user_context (user_id, display_name, locale, theme)
           VALUES (?, ?, 'fr', 'aurora')
           ON CONFLICT (id) DO UPDATE SET display_name = excluded.display_name`,
          [session.session.user.id, `desktop-spike-${new Date().toISOString()}`],
        );

        unsub = engine.registerStatusListener((s) => {
          setStatus((prev) => ({
            ...prev,
            sync: s.connected ? 'connected' : s.connecting ? 'connecting' : 'disconnected',
          }));
        });

        const rows = await engine.getAll('SELECT * FROM user_context');
        setStatus((s) => ({ ...s, rows: rows.length }));
        setPowerSyncBootStatus(`synced, rows=${rows.length}`);
      } catch (err) {
        if (!cancelled) {
          setStatus((s) => ({ ...s, error: String(err) }));
          setPowerSyncBootStatus(`error=${String(err).slice(0, 200)}`);
        }
      }
    })();
    return () => { cancelled = true; unsub(); };
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui', padding: 24, color: '#111' }}>
      <h1 style={{ fontSize: 20, margin: 0 }}>Aurora — PowerSync desktop (spike)</h1>
      <dl style={{ margin: '16px 0', lineHeight: 1.8 }}>
        <div>Auth : <strong>{status.auth}</strong></div>
        <div>Sync : <strong>{status.sync}</strong></div>
        <div>user_context (local mirror) : <strong>{status.rows} lignes</strong></div>
      </dl>
      {status.error && <p style={{ color: 'crimson' }}>{status.error}</p>}
      <p style={{ color: '#666', fontSize: 13 }}>
        Check du plan : 1) kill/relaunch du build empaqueté · 2) l'écriture
        offline part au retour réseau · 3) cette ligne apparaît côté mobile ·
        4) zéro Node dans ce bundle renderer.
      </p>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<DesktopSpike />);
