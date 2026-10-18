/**
 * Focus v2 — Page « Profils et Tâches » (S5, M-52, écran 8).
 *
 * Reproduction fidèle du Stitch `focus_profils_et_t_ches_pr_cision_fraunces`
 * (code.html SSoT — on ne réinvente ni layout, ni couleur, ni icône) :
 *
 * - **MES PROFILS** : cartes de profil (titre + pastille méthode +
 *   description des durées + bouton **Lancer** pleine largeur). Chaque
 *   `Lancer` mappe le profil en `FocusSessionOptions` (`launchProfile`)
 *   et démarre la session via `FocusControllerService.startSession`
 *   (M-51). La tâche assignée du profil est portée par la session.
 * - **TÂCHES** : liste de tâches simples (« + Ajouter », Q11 = titre +
 *   état). Chaque tâche a un bouton ▶ qui lance le focus **sur cette
 *   tâche** avec le profil assigné (le ▶ = `launchProfile(profil, task)`).
 *   Une tâche sans profil a une pastille **Choisir** qui ouvre
 *   l'assignation tâche→profil (`linkTaskToProfile`).
 * - **La tâche en cours** : quand une session est active, la tâche liée
 *   s'affiche dans le minuteur (M-53).
 *
 * Sessions **locales** (AD-7, offline) : la mécanique de session/timer
 * EXISTE (`packages/focus`), on ne la modifie pas, on se rebranche dessus.
 * Les tâches simples restent la `Task` miroir `productivity.tasks` (Q11) ;
 * l'assignation tâche↔profil vit côté app (`focus_profiles.task_id`) tant
 * que l'entité miroir n'existe pas (blocage PowerSync reporté au checkpoint
 * lead — on ne code PAS de migration).
 */
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import {
  Plus,
  CirclePlay,
  Play,
  Square,
  Check,
} from 'lucide-react';
import { useMemo, useState, useCallback } from 'react';
import { useUiStateStore } from '../../state/ui-state';
import { useMobileData } from '../../query/context';
import { createAppFocusService } from '../../lib/focus-service';
import {
  createFocusProfileStore,
  launchProfile,
  type FocusProfile,
} from '../../lib/focus-profiles';
import { createMinimalTask, readProductivity, type MinimalTaskInput } from '../../lib/productivity-repo';
import { NewFocusProfileBody } from './new-profile';
import { FocusTimerV2 } from './timer';
import type { FocusControllerService, FocusSessionOptions } from '@aurora/focus';
import type { FocusSession, Task } from '@aurora/domain';

/** Description de durée d'un profil (carte, écran 8). */
function profileDescription(p: FocusProfile): string {
  if (p.method === 'timer') return 'Sans limite de durée';
  return `${p.workMin} min · pause ${p.pauseMin} min · ${p.sessions} sessions`;
}

/** Le profil assigné à une tâche (par `focus_profiles.task_id`). */
function profileForTask(
  task: Task,
  profiles: FocusProfile[],
): FocusProfile | undefined {
  return profiles.find((p) => p.taskId === task.id);
}

export interface FocusProfilesPageProps {
  service: FocusControllerService | null;
  /** store local des profils (AD-7, injectable pour tests). */
  profileStore: ReturnType<typeof createFocusProfileStore>;
  /** les tâches simples Q11 (miroir `productivity.tasks`, AD-7). */
  tasks: Task[];
  /** créer une tâche simple (writer app-side, S5 M-52). */
  addTask: (input: MinimalTaskInput) => void;
  /** l'utilisateur courant (RLS scope, défaut `self`). */
  userId?: string;
  onSession?: (s: FocusSession | null) => void;
}

export function FocusProfilesPage({
  service,
  profileStore,
  tasks,
  addTask,
  userId = 'self',
  onSession,
}: FocusProfilesPageProps) {
  const { focusActive, setFocusActive } = useUiStateStore();

  // Profil affiché + tâches (la relecture locale suit le store, AD-7).
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const profiles = useMemo(
    () => profileStore.list(userId).filter((p) => p.displayOnFocusPage),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profileStore, userId, version],
  );

  // Tâche en cours = la tâche liée à la session active (M-53).
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const activeTask = tasks.find((t) => t.id === activeTaskId);
  // Les paramètres du profil en cours (méthode + durées) pour le minuteur
  // v2 (M-53) : l'anneau Pomodoro / le chrono s'adaptent au profil lancé.
  const [activeMethod, setActiveMethod] = useState<'pomodoro' | 'timer'>('pomodoro');
  const [activeWorkSec, setActiveWorkSec] = useState(0);
  const [activeSessions, setActiveSessions] = useState(4);
  // L'écran « Nouveau profil » (M-51, écran 9).
  const [newProfileOpen, setNewProfileOpen] = useState(false);

  /** Lancer un profil (M-51) : mappe en options + `startSession`. */
  async function launch(profile: FocusProfile, taskId?: string) {
    if (!service) return;
    const opts: FocusSessionOptions = launchProfile(profile);
    if (taskId) opts.taskIds = [taskId];
    const s = await service.startSession(opts);
    setActiveTaskId(taskId ?? profile.taskId ?? null);
    setActiveMethod(profile.method);
    setActiveWorkSec(profile.workMin * 60);
    setActiveSessions(profile.sessions || 4);
    setFocusActive(true);
    onSession?.(s);
  }

  /** Arrêter la session en cours (M-53 : Terminer). */
  async function stop() {
    if (!service) return;
    await service.endSession();
    setFocusActive(false);
    setActiveTaskId(null);
    onSession?.(null);
  }
  /** « + Ajouter » — crée une tâche simple Q11 (titre par défaut éditée). */
  function onAddTask(title: string) {
    addTask({ userId, title });
    refresh();
  }

  /** Assignation tâche → profil (« Choisir », S5 M-52). */
  function assignProfile(taskId: string, profileId: string) {
    profileStore.linkTaskToProfile(taskId, profileId);
    refresh();
  }

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            {focusActive && service && (
              <IonButton
                fill="clear"
                onClick={() => void stop()}
                aria-label="Terminer la session"
              >
                <Square size={18} />
              </IonButton>
            )}
          </IonButtons>
          <IonTitle>Focus</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {newProfileOpen ? (
          <NewFocusProfileBody
            profileStore={profileStore}
            tasks={tasks}
            userId={userId}
            onCreated={() => {
              setNewProfileOpen(false);
              refresh();
            }}
            onCancel={() => setNewProfileOpen(false)}
          />
        ) : (
          <div
            data-focus-v2="true"
            data-active={focusActive}
            className="focus-v2"
          >
            {/* ——— MES PROFILS ——— */}
            <section className="focus-v2-section" data-purpose="profiles-section">
            <div className="focus-v2-section-head">
              <h2>Mes Profils</h2>
              <button
                type="button"
                className="focus-v2-add"
                aria-label="Ajouter un profil ou une tâche"
                onClick={() => setNewProfileOpen(true)}
              >
                <Plus size={22} aria-hidden />
              </button>
            </div>
            <div className="focus-v2-profiles">
              {profiles.length === 0 && (
                <p className="focus-v2-empty">
                  Aucun profil de focus pour l'instant.
                </p>
              )}
              {profiles.map((p) => (
                <article
                  key={p.id}
                  className="focus-v2-card focus-v2-profile"
                  data-purpose="profile-card"
                  data-profile-id={p.id}
                >
                  <div className="focus-v2-card-head">
                    <h3>{p.title}</h3>
                    <span className="focus-v2-pill">
                      {p.method === 'pomodoro' ? 'Pomodoro' : 'Chronomètre'}
                    </span>
                  </div>
                  <p className="focus-v2-desc">{profileDescription(p)}</p>
                  <button
                    type="button"
                    className="focus-v2-launch"
                    disabled={!service}
                    onClick={() => void launch(p, p.taskId)}
                    aria-label={`Lancer le profil ${p.title}`}
                  >
                    <Play size={16} aria-hidden /> Lancer
                  </button>
                </article>
              ))}
            </div>
            </section>

            {/* ——— TÂCHES ——— */}
            <section className="focus-v2-section" data-purpose="tasks-section">
              <div className="focus-v2-section-head">
                <h2>Tâches</h2>
                <TaskAddForm onAdd={onAddTask} />
              </div>
              <div className="focus-v2-tasklist">
                {tasks.length === 0 && (
                  <p className="focus-v2-empty">
                    Aucune tâche simple. Ajoute-en une pour la lier à un profil.
                  </p>
                )}
                {tasks.map((t) => {
                  const assigned = profileForTask(t, profiles);
                  return (
                    <div
                      key={t.id}
                      className="focus-v2-task"
                      data-purpose="task-item"
                      data-task-id={t.id}
                      data-has-profile={!!assigned}
                    >
                      <div className="focus-v2-task-text">
                        <h4>{t.title}</h4>
                        <p>
                          {assigned
                            ? `Profil : ${assigned.title}`
                            : 'Aucun profil · à choisir'}
                        </p>
                      </div>
                      {assigned ? (
                        <button
                          type="button"
                          className="focus-v2-play"
                          disabled={!service}
                          onClick={() => void launch(assigned, t.id)}
                          aria-label={`Lancer la tâche : ${t.title}`}
                        >
                          <CirclePlay size={24} aria-hidden />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="focus-v2-choose"
                          onClick={() => assignProfile(t.id, profiles[0]?.id ?? '')}
                          aria-label={`Choisir un profil pour ${t.title}`}
                        >
                          <Check size={16} aria-hidden /> Choisir
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ——— SESSION EN COURS (le minuteur v2, M-53, écrans 10 & 11) ——— */}
            {focusActive && service && (
              <FocusTimerV2
                service={service}
                mode={activeMethod}
                taskTitle={activeTask?.title}
                workSec={activeWorkSec}
                sessions={activeSessions}
                onEnd={() => void stop()}
              />
            )}
          </div>
        )}
      </IonContent>
    </>
  );
}

/** Formulaire « + Ajouter » (tâche simple Q11 : titre uniquement). */
function TaskAddForm({ onAdd }: { onAdd: (title: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  if (!open) {
    return (
      <button
        type="button"
        className="focus-v2-choose"
        onClick={() => setOpen(true)}
        aria-label="Ajouter une nouvelle tâche"
      >
        <Plus size={16} aria-hidden /> Ajouter
      </button>
    );
  }
  return (
    <form
      className="focus-v2-taskform"
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) onAdd(title.trim());
        setTitle('');
        setOpen(false);
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre de la tâche"
        aria-label="Titre de la nouvelle tâche"
      />
      <button type="submit" className="focus-v2-choose">
        <Check size={16} aria-hidden /> Ajouter
      </button>
    </form>
  );
}

/**
 * Wrapper de route (router.tsx /focus) : construit le service app-layer +
 * le store de profils + la liste des tâches simples Q11 depuis le store
 * local (AD-7), puis injecte le tout. Une seule instance de service par
 * store (`useMemo`) — elle porte l'état du timer, la récréer perdrait la
 * session en cours.
 */
export function FocusProfilesRoute() {
  const { store } = useMobileData();
  const service = useMemo(
    () => (store ? createAppFocusService(store) : null),
    [store],
  );
  const profileStore = useMemo(
    () => (store ? createFocusProfileStore(store) : null),
    [store],
  );
  const tasks = useMemo(
    () => (store ? readProductivity(store).tasks : []),
    [store],
  );
  const addTask = useCallback(
    (input: MinimalTaskInput) => {
      if (store) createMinimalTask(store, input);
    },
    [store],
  );
  if (!profileStore) {
    return (
      <IonContent>
        <div data-focus-v2="true">
          <p className="focus-v2-empty">
            Le module Focus n'est pas encore disponible sur cet appareil.
          </p>
        </div>
      </IonContent>
    );
  }
  return (
    <FocusProfilesPage
      service={service}
      profileStore={profileStore}
      tasks={tasks}
      addTask={addTask}
    />
  );
}
