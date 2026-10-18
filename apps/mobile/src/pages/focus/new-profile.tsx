/**
 * Nouveau profil de focus (S5, M-51, écran 9).
 *
 * Reproduction fidèle du Stitch `focus_nouveau_profil_pr_cision_fraunces`
 * (code.html SSoT — on ne réinvente ni layout, ni couleur, ni icône) :
 *
 * - Titre (input)
 * - MÉTHODE (segmenté Pomodoro / Chronomètre)
 * - Carte durées (Travail / Pause courte / Pause longue / Sessions)
 * - TÂCHE ASSIGNÉE (OPTIONNEL) (sélecteur de tâche simple Q11)
 * - Case « Afficher sur la page Focus »
 * - Footer Annuler + **Créer le profil**
 *
 * Le profil écrit une row miroir `focus_profiles` (0027) dans le store
 * local — AD-7, zéro réseau sur le chemin de lecture ; le rebranchement
 * miroir PowerSync (stream `focus`) + upsync passe au checkpoint lead.
 * L'entité SSoT du profil = `FocusProfile` de `@aurora/domain` (0027) :
 * `name` / `method` (pomodoro / chrono / tours) / `baseMinutes` /
 * `restMinutes` / `rounds` / `taskId?` (FK tâches Q11, 0002).
 *
 * Le composant est un **corps de formulaire** (pas de chrome Ion) : il est
 * monté dans l'IonContent de la page Focus v2 (écran 8), l'en-tête «
 * Nouveau profil de focus » est fourni par l'IonHeader de la page.
 */
import { ChevronLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FocusProfile, FocusProfileStore } from '../../lib/focus-profiles';
import type { Task } from '@aurora/domain';

export interface NewFocusProfileBodyProps {
  profileStore: FocusProfileStore;
  tasks: Task[];
  userId?: string;
  onCreated?: (p: FocusProfile) => void;
  onCancel?: () => void;
  /** l'en-tête est-il fourni par le parent (la page) ? */
  hasHeader?: boolean;
}

export function NewFocusProfileBody({
  profileStore,
  tasks,
  userId = 'self',
  onCreated,
  onCancel,
}: NewFocusProfileBodyProps) {
  const [title, setTitle] = useState('');
  const [method, setMethod] = useState<'pomodoro' | 'chrono'>('pomodoro');
  const [baseMin, setBaseMin] = useState(25);
  const [restMin, setRestMin] = useState(5);
  const [rounds, setRounds] = useState(4);
  const [taskId, setTaskId] = useState<string>('');
  const [taskId, setTaskId] = useState<string>('');
  const [display, setDisplay] = useState(true);

  const nowIso = useMemo(() => new Date().toISOString(), []);

  function submit() {
    const ts = nowIso;
    const profile: FocusProfile = {
      id: `fp-${Math.random().toString(36).slice(2, 10)}`,
      userId,
      name: title.trim() || 'Profil de focus',
      method,
      // baseMinutes = durée de travail (Pomodoro : un pomodoro ; Chrono :
      // base de référence, 1 = open-ended). restMinutes = pause ; rounds =
      // N pomodoros (Pomodoro) ou N tours (Chrono).
      baseMinutes: method === 'pomodoro' ? baseMin : 1,
      restMinutes: method === 'pomodoro' ? restMin : 0,
      rounds: method === 'pomodoro' ? rounds : 1,
      taskId: taskId || undefined,
      createdAt: ts,
      updatedAt: ts,
    };
    profileStore.create(profile);
    onCreated?.(profile);
  }

  return (
    <div className="focus-new-profile" data-purpose="new-profile-form">
      <header className="focus-new-header">
        <button
          type="button"
          className="focus-new-back"
          onClick={onCancel}
          aria-label="Retour"
        >
          <ChevronLeft size={24} strokeWidth={2.5} />
        </button>
        <h1>Nouveau profil de focus</h1>
      </header>

      <div className="focus-new-field">
        <label htmlFor="fp-title">Titre</label>
        <input
          id="fp-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex. Étude profonde"
        />
      </div>

      <div className="focus-new-field">
        <span className="focus-new-label">Méthode</span>
        <div className="focus-new-seg" role="radiogroup" aria-label="Méthode de focus">
          <button
            type="button"
            role="radio"
            aria-checked={method === 'pomodoro'}
            className={method === 'pomodoro' ? 'is-active' : ''}
            onClick={() => setMethod('pomodoro')}
          >
            Pomodoro
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={method === 'chrono'}
            className={method === 'chrono' ? 'is-active' : ''}
            onClick={() => setMethod('chrono')}
          >
            Chronomètre
          </button>
        </div>
      </div>

      {method === 'pomodoro' && (
        <div className="focus-new-durations" data-purpose="durations-config-card">
          <DurationRow label="Travail" min={15} max={45} step={5} valueState={[baseMin, setBaseMin]} />
          <DurationRow label="Pause" min={2} max={15} step={1} valueState={[restMin, setRestMin]} />
          <div className="focus-new-dur-row">
            <span>Nombre de sessions</span>
            <span className="focus-new-dur-value">{rounds}</span>
          </div>
          <div className="focus-new-dur-steps">
            <button type="button" onClick={() => setRounds((s) => Math.max(1, s - 1))} aria-label="Réduire les sessions">−</button>
            <button type="button" onClick={() => setRounds((s) => Math.min(8, s + 1))} aria-label="Augmenter les sessions">+</button>
          </div>
        </div>
      )}

      <div className="focus-new-field" data-purpose="assigned-task-field">
        <span className="focus-new-label">Tâche assignée (optionnel)</span>
        <select
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
          aria-label="Tâche assignée au profil"
        >
          <option value="">— Aucune tâche —</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        <p className="focus-new-hint">Le focus se lancera sur cette tâche.</p>
      </div>

      <label className="focus-new-toggle" data-purpose="toggle-display-card">
        <span>Afficher sur la page Focus</span>
        <input
          type="checkbox"
          checked={display}
          onChange={(e) => setDisplay(e.target.checked)}
          aria-label="Afficher sur la page Focus"
        />
      </label>

      <div className="focus-new-footer">
        <button type="button" className="focus-new-cancel" onClick={onCancel}>
          Annuler
        </button>
        <button
          type="button"
          className="focus-new-create"
          onClick={submit}
          aria-label="Créer le profil"
        >
          Créer le profil
        </button>
      </div>
    </div>
  );
}

/** Ligne de durée (valeur mono + stepper ± min/max). */
function DurationRow(props: {
  label: string;
  min: number;
  max: number;
  step: number;
  valueState: [number, (n: number) => void];
}) {
  const [val, setVal] = props.valueState;
  return (
    <div className="focus-new-dur-row">
      <span>{props.label}</span>
      <span className="focus-new-dur-value">{val} min</span>
      <div className="focus-new-dur-stepper">
        <button
          type="button"
          onClick={() => setVal(Math.max(props.min, val - props.step))}
          aria-label={`Réduire ${props.label}`}
        >
          −
        </button>
        <button
          type="button"
          onClick={() => setVal(Math.min(props.max, val + props.step))}
          aria-label={`Augmenter ${props.label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
