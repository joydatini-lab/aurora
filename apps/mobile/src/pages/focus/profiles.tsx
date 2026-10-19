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
 * L'entité SSoT du profil = `FocusProfile` de `@aurora/domain` (0027 :
 * `focus_profiles` Supabase + RLS + PowerSync stream `focus`) ; les tâches
 * simples restent la `Task` miroir `productivity.tasks` (Q11, 0002). Le
 * rebranchement miroir + upsync passe au checkpoint lead (le subagent ne
 * déploie JAMAIS le relay PROD).
 */
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { AURORA_ICONS } from '@aurora/ui';
const Plus = AURORA_ICONS.Plus;
const CirclePlay = AURORA_ICONS.CirclePlay;
const Play = AURORA_ICONS.Play;
const Square = AURORA_ICONS.Square;
const Check = AURORA_ICONS.Check;

import { useMemo, useState, useCallback } from 'react';
import { useUiStateStore } from '../../state/ui-state';
import { useMobileData } from '../../query/context';
import { useOnlineStatus } from '../../hooks/use-online';
import { createAppFocusService } from '../../lib/focus-service';
import {
  createFocusProfileStore,
  launchProfile,
  type FocusProfile as FocusProfileDomain,
} from '../../lib/focus-profiles';
import { createMinimalTask, readProductivity, type MinimalTaskInput } from '../../lib/productivity-repo';
import { NewFocusProfileBody } from './new-profile';
import { FocusTimerV2 } from './timer';
import type { FocusControllerService, FocusSessionOptions } from '@aurora/focus';
import type { FocusSession, Task } from '@aurora/domain';

/** Description de durée d'un profil (carte, écran 8). */
function profileDescription(p: FocusProfileDomain): string {
  if (p.method === 'chrono') return 'Chronomètre · base ' + p.baseMinutes + ' min';
  if (p.method === 'tours') return p.rounds + ' tours';
  return `${p.baseMinutes} min · pause ${p.restMinutes} min · ${p.rounds} sessions`;
}

/** Le profil assigné à une tâche (par `focus_profiles.task_id`). */
function profileForTask(
  task: Task,
  profiles: FocusProfileDomain[],
): FocusProfileDomain | undefined {
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
  // M-74 (S7 finitions) — le 5ᵉ état UX : l'indicateur hors-ligne (le
  // badge « Hors ligne » du plan §16, AD-7 local-first : les données du
  // miroir PowerSync restent lisables en offline, l'état est honnête).
  const online = useOnlineStatus();

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
  // `pomodoro` → anneau ; `chrono`/`tours` → chrono + laps.
  const [activeMethod, setActiveMethod] = useState<'pomodoro' | 'timer'>('pomodoro');
  const [activeWorkSec, setActiveWorkSec] = useState(0);
  const [activeSessions, setActiveSessions] = useState(4);
  // L'écran « Nouveau profil » (M-51, écran 9).
  const [newProfileOpen, setNewProfileOpen] = useState(false);

  /** Lancer un profil (M-51) : mappe en options + `startSession`. */
  async function launch(profile: FocusProfileDomain, taskId?: string) {
    if (!service) return;
    const opts: FocusSessionOptions = launchProfile(profile);
    if (taskId) opts.taskIds = [taskId];
    const s = await service.startSession(opts);
    setActiveTaskId(taskId ?? profile.taskId ?? null);
    // Le profil 0027 porte `method` (pomodoro/chrono/tours) ; le timer v2
    // s'adapte en sous-mode `pomodoro` (anneau) ou `timer` (chrono + laps).
    const subMode = profile.method === 'pomodoro' ? 'pomodoro' : 'timer';
    setActiveMethod(subMode);
    // base de travail du profil (la durée de base de la session).
    setActiveWorkSec(profile.baseMinutes * 60);
    // N = les pomodoros (Pomodoro) ou les tours (Chrono/Tours), défaut 4.
    setActiveSessions(profile.rounds || 4);
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
            data-offline={!online}
            className="focus-v2"
          >
            {/* M-74 (S7 finitions) — le 5ᵉ état UX : l'indicateur hors-ligne
                (le badge « Hors ligne » du plan §16, AD-7 local-first :
                les données du miroir PowerSync restent lisables en offline,
                l'état est honnête — jamais une fausse sync). */}
            {!online && (
              <div
                data-ux="offline"
                className="focus-v2-offline"
                role="status"
                aria-label="Hors ligne"
              >
                <span className="aurora-badge">Hors ligne</span>
                <span className="focus-v2-offline-hint">
                  Les profils et tâches restent lisables — le prochain sync se fera dès le retour en ligne.
                </span>
              </div>
            )}
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
                    <h3>{p.name}</h3>
                    <span className="focus-v2-pill">
                      {p.method === 'pomodoro'
                        ? 'Pomodoro'
                        : p.method === 'tours'
                          ? 'Tours'
                          : 'Chronomètre'}
                    </span>
                  </div>
                  <p className="focus-v2-desc">{profileDescription(p)}</p>
                  <button
                    type="button"
                    className="focus-v2-launch"
                    disabled={!service}
                    onClick={() => void launch(p, p.taskId)}
                    aria-label={`Lancer le profil ${p.name}`}
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
                            ? `Profil : ${assigned.name}`
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
