/**
 * Focus timer v2 — Écrans de minuteurs en cours (S5, M-53, écrans 10 & 11).
 *
 * Reproduction fidèle du Stitch (code.html SSoT — on ne réinvente ni layout,
 * ni couleur, ni icône) :
 *
 * - **Pomodoro en cours** (`focus_pomodoro_en_cours`) : anneau SVG
 *   (268px, r=118, stroke-width=12, fond `--aurora-bg-subtle`, arc
 *   `--aurora-accent-primary`) + temps restant (mono 52px) +
 *   « Session n sur N » + la tâche en cours + Pause / Terminer +
 *   carte statistiques.
 * - **Chronomètre en cours** (`focus_chronom_tre_en_cours`) : compteur
 *   digital HH:MM:SS (mono 54px) + « Temps écoulé » + tâche +
 *   Tour / Pause / Terminer + carte TOURS (liste des laps).
 *
 * Rebranchement AD-7 : le timer EXISTE (`FocusControllerService.timer()`,
 * machine à états `packages/focus`), on ne le modifie pas. Le chrono
 * (mode `timer`) s'écoule via le timer live ; les laps (tours) sont un
 * état app-local (Q8 validé — pas de persistance miroir, blocage PowerSync
 * au checkpoint lead si le miroir des tours est un jour requis).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FocusControllerService } from '@aurora/focus';
import {
  formatElapsed,
  formatRemaining,
  pad2,
} from './timer-format';

export interface FocusTimerV2Props {
  /** le service focus (porte le timer live, AD-7). */
  service: FocusControllerService;
  /** le mode de la session en cours (Pomodoro / Chronomètre). */
  mode: 'pomodoro' | 'timer';
  /** la tâche liée (affichée dans le minuteur, M-53). */
  taskTitle?: string;
  /** durées du profil (Pomodoro : travail, pour l'anneau ; chrono : bornes). */
  workSec?: number;
  sessions?: number;
  /** arrêter la session (Terminer, S5 M-53). */
  onEnd: () => void;
}

/**
 * L'écran de minuteur v2 (Pomodoro = anneau, Chronomètre = digital + laps).
 * Le temps s'écoule via `service.timer()` (AD-7 SSoT) + un tick local qui
 * force le re-rendu chaque seconde (le timer est un objet, pas un state
 * réactif — le re-render pousse la lecture la plus fraîche).
 */
export function FocusTimerV2({
  service,
  mode,
  taskTitle,
  workSec = 0,
  sessions = 4,
  onEnd,
}: FocusTimerV2Props) {
  // Force le re-rendu chaque seconde pour lire le timer live (AD-7).
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const isPomodoro = mode === 'pomodoro';
  const timer = service.timer();

  // Chrono : les laps (tours) sont un état app-local (Q8, S5 M-53).
  const [laps, setLaps] = useState<number[]>([]);
  const [paused, setPaused] = useState(false);
  const lapBaseRef = useRef<number>(0);

  const activeSec = timer?.activeSec ?? 0;

  function takeLap() {
    const total = activeSec;
    setLaps((prev) => [total, ...prev].slice(0, 10));
    lapBaseRef.current = total;
  }

  const handleEnd = useCallback(() => {
    onEnd();
  }, [onEnd]);

  const controls = (
    <div
      className={`focus-timer-controls ${mode === 'timer' ? 'triple' : ''}`}
      data-purpose="timer-controls"
    >
      {mode === 'timer' && (
        <button type="button" onClick={takeLap} aria-label="Prendre un tour">
          Tour
        </button>
      )}
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? 'Reprendre' : 'Mettre en pause'}
        data-paused={paused}
      >
        {paused ? 'Reprendre' : 'Pause'}
      </button>
      <button
        type="button"
        className="is-filled"
        onClick={handleEnd}
        aria-label="Terminer la session"
      >
        Terminer
      </button>
    </div>
  );

  // ——— Pomodoro (écran 10) : anneau + restant + session n/N ———
  if (isPomodoro) {
    const remainingSec =
      timer && timer.plannedSec > 0
        ? Math.max(0, timer.plannedSec - timer.activeSec)
        : workSec;
    const progress =
      workSec > 0 ? Math.min(1, Math.max(0, 1 - remainingSec / workSec)) : 0;
    const R = 118;
    const CIRC = 2 * Math.PI * R;
    const dashoffset = CIRC * (1 - progress);
    // « Session n sur N » : le cycle courant est borné au nombre de sessions.
    const cycle = Math.min(
      Math.floor(activeSec / Math.max(1, workSec)) + 1,
      sessions,
    );
    return (
      <section className="focus-timer-v2" data-purpose="pomodoro-timer">
        <div
          className="focus-submode-tabs"
          role="tablist"
          aria-label="Mode de concentration"
        >
          <button type="button" role="tab" aria-selected="true">
            Pomodoro
          </button>
          <button type="button" role="tab" aria-selected="false">
            Chronomètre
          </button>
        </div>

        {/* Anneau Pomodoro (SVG circle, r=118, stroke-width=12). */}
        <div
          className="focus-pomo-ring"
          data-role="pomo-ring"
          data-progress={progress.toFixed(3)}
        >
          <svg width={268} height={268} viewBox="0 0 268 268" aria-hidden="true">
            <circle
              className="ring-track"
              cx={134}
              cy={134}
              r={R}
              fill="none"
              strokeWidth={12}
            />
            <circle
              className="ring-progress"
              cx={134}
              cy={134}
              r={R}
              fill="none"
              strokeWidth={12}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={dashoffset}
            />
          </svg>
          <div className="focus-pomo-center">
            <span className="focus-pomo-time" data-role="pomo-time">
              {formatRemaining(remainingSec)}
            </span>
            <span className="focus-pomo-session" data-role="pomo-session">
              Session {cycle} sur {sessions}
            </span>
          </div>
        </div>

        {taskTitle && (
          <h2 className="focus-task-title" data-role="task">
            {taskTitle}
          </h2>
        )}

        {controls}

        {/* Statistiques de session (carte, écran 10). */}
        <div className="focus-pomo-stats" data-purpose="session-stats">
          <div className="focus-v2-section-head">
            <h2>Statistiques</h2>
          </div>
          <div className="stat-row">
            <span>Aujourd'hui</span>
            <span className="stat-value">{sessions} sessions</span>
          </div>
        </div>
      </section>
    );
  }

  // ——— Chronomètre (écran 11) : digital + laps ———
  const h = Math.floor(activeSec / 3600);
  const m = Math.floor((activeSec % 3600) / 60);
  const s = activeSec % 60;
  return (
    <section className="focus-timer-v2" data-purpose="chronometer-timer">
      <div
        className="focus-submode-tabs"
        role="tablist"
        aria-label="Mode de concentration"
      >
        <button type="button" role="tab" aria-selected="false">
          Pomodoro
        </button>
        <button type="button" role="tab" aria-selected="true">
          Chronomètre
        </button>
      </div>

      {/* Compteur digital HH:MM:SS (mono 54px). */}
      <div
        className="focus-chrono-display"
        data-role="chrono-display"
        role="timer"
        aria-label={`Temps écoulé : ${formatElapsed(activeSec)}`}
      >
        <span data-role="chrono-h">{pad2(h)}</span>
        <span className="sep">:</span>
        <span data-role="chrono-m">{pad2(m)}</span>
        <span className="sep">:</span>
        <span data-role="chrono-s">{pad2(s)}</span>
      </div>
      <p className="focus-chrono-sub">Temps écoulé</p>

      {taskTitle && (
        <h2 className="focus-task-title" data-role="task">
          {taskTitle}
        </h2>
      )}

      {controls}

      {/* TOURS (laps card, écran 11). */}
      <div className="focus-chrono-laps" data-purpose="laps-summary">
        <div className="focus-v2-section-head">
          <h2>Tours</h2>
        </div>
        {laps.length === 0 ? (
          <p className="focus-v2-empty">Aucun tour pris pour l'instant.</p>
        ) : (
          laps.map((lapSec, i) => (
            <div key={i} className="focus-chrono-lap" data-lap-index={i}>
              <span className="lap-label">{`Tour ${laps.length - i}`}</span>
              <span className="lap-value">{formatElapsed(lapSec)}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
