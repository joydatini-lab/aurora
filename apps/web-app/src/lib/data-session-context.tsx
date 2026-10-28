/**
 * L5 — le provider de session de données de la coquille web.
 *
 * POURQUOI UN PROVIDER, ET PAS UN `useEffect` PAR ÉCRAN
 * Le moteur PowerSync est un singleton par utilisateur : l'initialiser deux
 * fois (deux écrans qui montent) ouvrirait deux bases WASQLite et deux boucles
 * de synchro sur les mêmes streams. Le provider garantit UNE session, montée
 * une fois, libérée au démontage (`dispose`).
 *
 * ÉTATS PUBLIÉS (honnêtes, pas de faux « prêt »)
 *   'booting'    → le miroir local s'initialise
 *   'ready'      → le miroir local répond (session Supabase ou non)
 *   'error'      → l'init a échoué (le message est montré, jamais avalé)
 *
 * `sessionState()` de la session distingue EN PLUS `no-session` : le miroir
 * local fonctionne, la SYNCHRO non. C'est l'état dégradé hors-ligne d'AD-7 —
 * l'écran de capture reste utilisable, et le dit.
 */
import * as React from 'react';
import {
  createWebDataSession,
  readWebDataEnv,
  type WebDataSession,
  type WebSessionState,
} from './data-session';

export type BootState = 'booting' | 'ready' | 'error';

export interface DataSessionValue {
  session: WebDataSession | null;
  boot: BootState;
  /** l'état de session Supabase, lisible par l'UI (dégradé vs synchronisé). */
  authState: WebSessionState;
  error: string | null;
}

const DataSessionContext = React.createContext<DataSessionValue>({
  session: null,
  boot: 'booting',
  authState: 'idle',
  error: null,
});

export function useDataSession(): DataSessionValue {
  return React.useContext(DataSessionContext);
}

export function DataSessionProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [value, setValue] = React.useState<DataSessionValue>({
    session: null,
    boot: 'booting',
    authState: 'idle',
    error: null,
  });
  // La session n'est prête qu'après l'`await` de la fabrique : le cleanup du
  // montage doit pouvoir la retrouver même s'il s'exécute avant. Une ref, pas
  // un état — la relire ne doit pas redéclencher de rendu.
  const disposeRef = React.useRef<((clear?: boolean) => Promise<void>) | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    // La session est construite DANS l'effet : `createWebDataSession` touche
    // `import.meta.env` et charge `@aurora/data` en DYNAMIQUE (le moteur
    // PowerSync ne doit pas entrer dans le bundle principal — cf. le commentaire
    // de `data-session.ts`). Rien de tout cela n'existe au rendu sans DOM.
    void (async () => {
      let session: WebDataSession | null = null;
      try {
        session = await createWebDataSession(readWebDataEnv());
      } catch (err) {
        if (!cancelled) {
          setValue({
            session: null,
            boot: 'error',
            authState: 'error',
            error: err instanceof Error ? err.message : String(err),
          });
        }
        return;
      }
      if (cancelled) {
        void session.dispose(false);
        return;
      }
      disposeRef.current = (clear?: boolean) => session!.dispose(clear);

      const boot = session;
      try {
        await boot.connect();
        if (!cancelled) {
          setValue({
            session: boot,
            boot: 'ready',
            authState: boot.sessionState(),
            error: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setValue({
            session: boot,
            boot: 'error',
            authState: 'error',
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      // AD-7 : au démontage on relâche les watches sans vider la base — l'état
      // hors-ligne doit survivre à un rechargement (critère L5 #1). La session
      // peut ne pas exister encore (init en vol) : le garde `cancelled` ci-dessus
      // s'en charge.
      void disposeRef.current?.(false);
    };
  }, []);

  return (
    <DataSessionContext.Provider value={value}>
      {children}
    </DataSessionContext.Provider>
  );
}
