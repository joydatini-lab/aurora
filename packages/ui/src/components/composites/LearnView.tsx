/**
 * LearnView — vue d'apprentissage (cat. 2.9, 4.9).
 *
 * Étape 2 (muet) : reçoit `LearnViewData` + callbacks. Pas de store, pas d'API.
 *
 * Structure (cat. 2.9) :
 * - `LearnModeCards` : 10 cartes de formats (flashcards, quiz, vidéo, texte,
 *   audio, fiches, résumés, cartes de révision, simulation, tutoriel)
 * - `StudyWorkspace` : espace de travail d'un format donné
 *   - `Flashcard` (verso recto)
 *   - `QuizQuestionCard` (question + choix)
 *   - `StudySessionControls` (prosuivant, marquer, terminé)
 * - `LearningProgressPanel` (progression du cours)
 *
 * Les sous-composants sont exportés individuellement.
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { AppIcon, type IconKey } from "src/components/ui/AppIcon";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Progress } from "src/components/ui/progress";

/* ------------------------------------------------------------------ */
/* Contrats de données                                                */
/* ------------------------------------------------------------------ */

export type StudyMode =
  | "flashcards"
  | "quiz"
  | "video"
  | "text"
  | "audio"
  | "fiche"
  | "resume"
  | "revision"
  | "simulation"
  | "tutorial";

export interface LearnModeMeta {
  key: StudyMode;
  label: string;
  description: string;
  icon: IconKey;
}

export const LEARN_MODES: LearnModeMeta[] = [
  { key: "flashcards", label: "Flashcards", description: "Révision active", icon: "table" },
  { key: "quiz", label: "Quiz", description: "Test de connaissances", icon: "info" },
  { key: "video", label: "Vidéo", description: "Cours vidéo", icon: "chart" },
  { key: "text", label: "Texte", description: "Lecture approfondie", icon: "code" },
  { key: "audio", label: "Audio", description: "Podcast / narration", icon: "audio" },
  { key: "fiche", label: "Fiches", description: "Fiches mémo", icon: "file" },
  { key: "resume", label: "Résumés", description: "Synthèse courte", icon: "summary" },
  { key: "revision", label: "Révision", description: "Rappel espacé", icon: "retry" },
  { key: "simulation", label: "Simulation", description: "Mise en situation", icon: "tool" },
  { key: "tutorial", label: "Tutoriel", description: "Pas à pas guidé", icon: "task" },
];

export interface LearnViewData {
  /** Titre du cours / sujet. */
  title: string;
  /** Mode de study par défaut. */
  defaultMode: StudyMode;
  /** Progression globale (0-100). */
  progress: number;
  /** Temps restant (min) si session courante. */
  remainingMinutes?: number;
  /** Nombre de leçons. */
  totalLessons: number;
  /** Nombre de leçons terminées. */
  completedLessons: number;
}

export interface LearnViewProps {
  data: LearnViewData;
  /** Mode courant. */
  mode: StudyMode;
  onModeChange: (m: StudyMode) => void;
  /** Appelé quand on lance / termine une session. */
  onStartSession?: (mode: StudyMode) => void;
  onEndSession?: () => void;
  /** Conteneur du workspace (fourni par le parent pour le contenu du mode). */
  children?: React.ReactNode;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* LearnModeCards                                                      */
/* ------------------------------------------------------------------ */

export interface LearnModeCardsProps {
  activeMode: StudyMode;
  onSelect: (m: StudyMode) => void;
  /** Modes disponibles (si non fourni, tous). */
  modes?: LearnModeMeta[];
  className?: string;
}

export function LearnModeCards({
  activeMode,
  onSelect,
  modes = LEARN_MODES,
  className,
}: LearnModeCardsProps) {
  return (
    <div
      data-slot="learn-mode-cards"
      className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5", className)}
    >
      {modes.map((m) => (
        <button
          key={m.key}
          type="button"
          onClick={() => onSelect(m.key)}
          aria-pressed={activeMode === m.key}
          className={cn(
            "flex flex-col items-start gap-2 rounded-lg border bg-card p-3 text-left transition-colors",
            activeMode === m.key
              ? "border-primary bg-primary/5"
              : "hover:border-muted-foreground/40"
          )}
        >
          <AppIcon
            name={m.icon}
            size="md"
            tone={activeMode === m.key ? "default" : "muted"}
            aria-hidden
          />
          <div>
            <p className="text-sm font-medium">{m.label}</p>
            <p className="text-[11px] text-muted-foreground">{m.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* LearningProgressPanel                                               */
/* ------------------------------------------------------------------ */

export interface LearningProgressPanelProps {
  data: LearnViewData;
  /** Appelé quand on clique sur "Continuer". */
  onContinue?: () => void;
  className?: string;
}

export function LearningProgressPanel({
  data,
  onContinue,
  className,
}: LearningProgressPanelProps) {
  const pct = data.progress;
  return (
    <div
      data-slot="learning-progress-panel"
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-card p-4",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight">
            {data.title}
          </h3>
          <p className="text-xs text-muted-foreground">
            {data.completedLessons}/{data.totalLessons} leçons ·{" "}
            {data.remainingMinutes !== undefined &&
              `${data.remainingMinutes} min restantes`}
          </p>
        </div>
        {onContinue && (
          <Button size="sm" className="h-7 shrink-0" onClick={onContinue}>
            Continuer
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Progress value={pct} className="h-1.5 flex-1" />
        <span className="text-sm tabular-nums text-muted-foreground">
          {pct}%
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Flashcard                                                           */
/* ------------------------------------------------------------------ */

export interface FlashcardData {
  id: string;
  front: string;
  back: string;
  /** Catégorie (ex. chapitre). */
  category?: string;
  /** Est la carte maîtrisée. */
  isMastered?: boolean;
}

export interface FlashcardProps {
  card: FlashcardData;
  /** Carte affichée au recto ou verso. */
  flipped: boolean;
  onFlip: () => void;
  onMaster?: () => void;
  onAgain?: () => void;
  className?: string;
}

export function Flashcard({
  card,
  flipped,
  onFlip,
  onMaster,
  onAgain,
  className,
}: FlashcardProps) {
  const side = flipped ? card.back : card.front;
  return (
    <div
      data-slot="flashcard"
      className={cn("flex flex-col gap-4", className)}
    >
      <button
        type="button"
        onClick={onFlip}
        aria-label={flipped ? "Voir le recto" : "Voir le verso"}
        className={cn(
          "flex min-h-48 flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border bg-card p-6 text-center transition-colors",
          "hover:border-muted-foreground/40"
        )}
      >
        {card.category && (
          <Badge variant="outline" className="text-[10px]">
            {card.category}
          </Badge>
        )}
        <p className="text-lg font-medium leading-snug">{side}</p>
        <span className="text-xs text-muted-foreground">
          {flipped ? "Verso" : "Recto"} · touchez pour retourner
        </span>
      </button>
      <div className="flex items-center gap-2">
        {onAgain && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onAgain}
          >
            À revoir
          </Button>
        )}
        {onMaster && (
          <Button
            size="sm"
            className="flex-1"
            onClick={onMaster}
          >
            Maîtrisé
          </Button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* QuizQuestionCard                                                    */
/* ------------------------------------------------------------------ */

export interface QuizQuestionData {
  id: string;
  prompt: string;
  options: string[];
  /** Index de la bonne réponse. */
  correctIndex: number;
  /** Index de la réponse choisie (null si non répondu). */
  selected?: number | null;
  /** Appelé quand on répond. */
  explanation?: string;
}

export interface QuizQuestionCardProps {
  question: QuizQuestionData;
  onAnswer: (optionIndex: number) => void;
  /** Déverrouille les réponses (après correction). */
  revealed: boolean;
  className?: string;
}

export function QuizQuestionCard({
  question,
  onAnswer,
  revealed,
  className,
}: QuizQuestionCardProps) {
  const selected = question.selected ?? null;
  return (
    <div
      data-slot="quiz-question-card"
      className={cn("flex flex-col gap-4", className)}
    >
      <p className="text-base font-medium leading-snug">{question.prompt}</p>
      <div className="flex flex-col gap-2">
        {question.options.map((opt, i) => {
          const isCorrect = i === question.correctIndex;
          const isSelected = i === selected;
          return (
            <button
              key={i}
              type="button"
              disabled={revealed}
              onClick={() => onAnswer(i)}
              aria-pressed={isSelected}
              className={cn(
                "flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
                "disabled:cursor-default",
                revealed && isCorrect && "border-success bg-success/10 text-foreground",
                revealed && isSelected && !isCorrect && "border-destructive bg-destructive/10 text-foreground",
                !revealed && isSelected && "border-primary bg-primary/5",
                !revealed && !isSelected && "border-border hover:bg-muted"
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border text-xs",
                  revealed && isCorrect
                    ? "border-success bg-success text-white"
                    : revealed && isSelected && !isCorrect
                      ? "border-destructive bg-destructive text-white"
                      : isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border"
                )}
              >
                {revealed && isCorrect ? "✓" : String.fromCharCode(65 + i)}
              </span>
              <span className="min-w-0 flex-1">{opt}</span>
            </button>
          );
        })}
      </div>
      {revealed && question.explanation && (
        <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Explication : </span>
          {question.explanation}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* StudySessionControls                                                */
/* ------------------------------------------------------------------ */

export interface StudySessionControlsProps {
  onPrevious?: () => void;
  onNext: () => void;
  onEnd?: () => void;
  onMarkDone?: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
  isLast: boolean;
  className?: string;
}

export function StudySessionControls({
  onPrevious,
  onNext,
  onEnd,
  onMarkDone,
  hasNext,
  hasPrevious,
  isLast,
  className,
}: StudySessionControlsProps) {
  return (
    <div
      data-slot="study-session-controls"
      className={cn("flex items-center gap-2", className)}
    >
      <Button
        variant="outline"
        size="sm"
        disabled={!hasPrevious}
        onClick={onPrevious}
      >
        Précédent
      </Button>
      <div className="flex-1" />
      {onMarkDone && !isLast && (
        <Button variant="ghost" size="sm" onClick={onMarkDone}>
          Marquer fait
        </Button>
      )}
      <Button
        variant={isLast ? "default" : "outline"}
        size="sm"
        onClick={onNext}
        disabled={!hasNext && !isLast}
      >
        {isLast ? (onEnd ? "Terminer" : "Suivant") : "Suivant"}
      </Button>
      {isLast && onEnd && (
        <Button size="sm" onClick={onEnd}>
          Terminer la session
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                */
/* ------------------------------------------------------------------ */

export function LearnView({
  data,
  mode,
  onModeChange,
  onStartSession,
  onEndSession,
  children,
  className,
}: LearnViewProps) {
  return (
    <div
      data-slot="learn-view"
      className={cn("flex flex-col gap-5", className)}
    >
      <LearningProgressPanel
        data={data}
        onContinue={() => onStartSession?.(mode)}
      />

      <LearnModeCards activeMode={mode} onSelect={onModeChange} />

      {/* Workspace : le parent fournit le contenu du mode (Flashcard, Quiz, etc.) */}
      {children && (
        <div
          data-slot="study-workspace"
          className="flex flex-col gap-4 rounded-lg border bg-card p-4"
        >
          {children}
        </div>
      )}

      <StudySessionControls
        onNext={() => {}}
        onEnd={onEndSession}
        hasNext
        hasPrevious={data.progress > 0}
        isLast={data.completedLessons >= data.totalLessons}
      />
    </div>
  );
}
