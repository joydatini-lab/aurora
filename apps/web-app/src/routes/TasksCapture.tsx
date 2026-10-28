/**
 * L5 — l'écran de CAPTURE de « S'organiser » (`/tasks`), la 1ʳᵉ étape du
 * parcours vertical (plan §5).
 *
 * CE QUE CET ÉCRAN PROUVE, ET CE QU'IL NE PRÉTEND PAS
 * Il écrit une VRAIE tâche par le VRAI chemin (module → commande kernel →
 * `apply('productivity', …)` → miroir local → file d'upsync). Il ne simule
 * rien : s'il n'y a pas de session Supabase, il le DIT (`no-session`) et
 * reste utilisable en local — la synchro est le seul maillon manquant, et
 * c'est un état dégradé honnête d'AD-7, pas un faux succès.
 *
 * LES 5 ÉTATS UX (§M4, plan §5 critère 4)
 *   chargement · vide · erreur · hors-ligne · partiel
 * Ils ne sont PAS délégués à `UxStates` : ce composant vit dans
 * `apps/mobile/src` (une app ne peut pas importer une autre app, AD-1) et il
 * ne rend pas ses `children` dans la branche `empty` — un piège déjà payé par
 * le dépôt. On reproduit donc les 5 états ici, explicitement, en réutilisant
 * les primitives de `@aurora/ui`.
 */
import * as React from 'react';
import { Button, Card, Input, Skeleton } from '@aurora/ui';
import type { Task } from '@aurora/domain';
import { useDataSession } from '../lib/data-session-context';
import {
  buildCaptureCommand,
  resolveCaptureUxState,
  toTaskList,
  type CaptureContext,
} from '../lib/capture';

function CaptureScreen(): React.ReactElement {
  const { session, boot, authState, error: bootError } = useDataSession();

  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [draft, setDraft] = React.useState('');
  const [writeError, setWriteError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Le contexte de commande : l'id du client est stable pour la vie de
  // l'onglet (les éléments OR-Set s'en servent comme origine, 03 S5.3).
  const clientId = React.useMemo(() => `web-${Math.random().toString(36).slice(2, 10)}`, []);

  // Lecture locale (03 S3.1) : `watch` est local-only, jamais de réseau.
  React.useEffect(() => {
    if (!session || boot !== 'ready') return;
    const unsubscribe = session.tasks.watch(
      { entity: 'tasks', where: {} },
      // `session.tasks` mappe déjà le miroir vers l'entité (`mapTaskRow`,
      // branché dans `createWebDataSession`) : plus de cast, plus de titre vide.
      (rows) => setTasks(toTaskList(rows)),
    );
    return unsubscribe;
  }, [session, boot]);

  const userId = session?.userId() ?? null;
  // AD-7 : `apply()` exige un `userId` (la commande est RLS-scopée). Sans
  // session il n'y a donc PAS d'écriture possible — on désactive la capture
  // plutôt que de laisser saisir puis échouer. Le miroir local reste lisible
  // (les lignes déjà synchronisées s'affichent).
  const canWrite = userId !== null;

  /** L'état UX dominant, dans l'ordre de précédence du dépôt (AD-13). */
  const ux = React.useMemo(
    () =>
      resolveCaptureUxState({
        booting: boot === 'booting',
        failed: boot === 'error' || writeError !== null,
        // « hors-ligne » = le miroir répond mais la synchro est absente :
        // c'est exactement `no-session` (AD-7 dégradé). On ne ment pas en
        // affichant « synchronisé ».
        noSession: authState === 'no-session',
        taskCount: tasks.length,
      }),
    [boot, writeError, authState, tasks.length],
  );

  async function onCapture(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setWriteError(null);
    if (!session || !userId) {
      setWriteError(
        'Aucune session : la capture locale exige un utilisateur identifié.',
      );
      return;
    }
    const text = draft.trim();
    if (text.length === 0) return;

    setSaving(true);
    try {
      const ctx: CaptureContext = { userId, clientId, now: Date.now() };
      // L'id est généré ici : c'est l'écran qui « pin » l'identité de la ligne
      // (le kernel exige un `id` stable, commands.ts).
      const id = crypto.randomUUID();
      const command = buildCaptureCommand(text, ctx, id);
      const result = await session.commands.apply('productivity', command);
      if (!result.ok) {
        setWriteError(`${result.error.code}: ${result.error.message}`);
        return;
      }
      setDraft('');
    } catch (err) {
      setWriteError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-reading flex-col gap-6 py-10" data-testid="capture-screen">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">S'organiser</h1>
        <p className="text-sm text-muted-foreground">
          Capture rapide — la tâche est écrite dans le miroir local, puis synchronisée.
        </p>
      </header>

      <form onSubmit={onCapture} className="flex items-center gap-2" data-testid="capture-form">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            canWrite ? 'Quoi de neuf ? (une tâche)' : 'Connectez-vous pour capturer une tâche'
          }
          aria-label="Nouvelle tâche"
          data-testid="capture-input"
          disabled={saving || !canWrite}
        />
        <Button
          type="submit"
          disabled={saving || !canWrite || draft.trim().length === 0}
          data-testid="capture-submit"
        >
          {saving ? '…' : 'Ajouter'}
        </Button>
      </form>

      {/* La bande d'état : elle dit la vérité sur la synchro, sans bloquer
          l'usage local. */}
      <p className="text-xs text-muted-foreground" data-testid="sync-banner">
        {authState === 'signed-in'
          ? 'Synchronisé — les écritures partent vers le serveur.'
          : import.meta.env.DEV && authState === 'dev-local'
            ? 'Session locale de développement — écriture locale, aucune synchronisation.'
            : authState === 'no-session'
            ? 'Hors ligne — lecture locale seulement (connexion requise pour capturer et synchroniser).'
            : authState === 'error'
              ? 'Session en erreur — état local conservé.'
              : 'Initialisation…'}
      </p>

      {ux === 'loading' && (
        <div data-ux="loading" role="status" aria-label="Chargement des tâches">
          <div className="aurora-skeleton-stack flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      )}

      {ux === 'error' && (
        <Card data-ux="error" className="border-destructive p-4">
          <p className="text-sm font-medium text-destructive">Impossible de continuer</p>
          <p className="mt-1 text-xs text-muted-foreground" data-testid="error-message">
            {writeError ?? bootError ?? 'Erreur inconnue'}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              setWriteError(null);
              // La relecture est locale et idempotente (AD-7) : on relance le
              // watch plutôt que de recharger la page.
              if (session) {
                setTasks(toTaskList([]));
                session.tasks.list({ entity: 'tasks', where: {} }).then((rows) => {
                  setTasks(toTaskList(rows as Task[]));
                });
              }
            }}
          >
            Réessayer
          </Button>
        </Card>
      )}

      {ux === 'empty' && (
        <Card data-ux="empty" className="p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Aucune tâche pour l'instant — la première que vous captez apparaîtra ici.
          </p>
        </Card>
      )}

      {(ux === 'partial' || ux === 'offline') && (
        <ul className="flex flex-col gap-2" data-testid="task-list" data-count={tasks.length}>
          {tasks.map((task) => (
            <li key={task.id}>
              <Card className="flex items-center justify-between gap-3 p-3" data-testid="task-row">
                <span className="text-sm" data-testid="task-title">
                  {task.title}
                </span>
                <span className="text-xs text-muted-foreground">{task.status}</span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CaptureScreen;
