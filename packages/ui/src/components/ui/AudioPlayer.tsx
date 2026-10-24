/**
 * AudioPlayer — lecteur audio (cat. 2.1 Focus / 2.21 Artifacts).
 *
 * Lecture/pause, progression scrubable, durée, volume/muet.
 * La waveform est optionnelle et **facultative** (ne doit pas être le seul
 * moyen de naviguer dans l'audio).
 *
 * Les données d'audio sont pilotées par le parent : `src` (URL),
 * `duration` (ms), `onTimeUpdate`, `onPlay`, `onPause`, `onEnded`.
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { AppIcon } from "src/components/ui/AppIcon";
import { Button } from "src/components/ui/button";

/* ------------------------------------------------------------------ */

export interface AudioPlayerProps {
  /** URL du média à lire. */
  src: string;
  /** Titre affiché au-dessus du contrôle. */
  title?: string;
  /** Sous-titre (ex. artiste). */
  subtitle?: string;
  /**
   * Durée totale en millisecondes (pour le bar de progression).
   * Si omis, le lecteur lit la durée du média lui-même.
   */
  duration?: number;
  /** Valeur initiale de la position en ms (lecture reprise). */
  startPosition?: number;
  /** Volume initial (0-1). */
  volume?: number;
  /** Muet initial. */
  muted?: boolean;
  /** Callback à chaque mise à jour de la position. */
  onTimeUpdate?: (time: number, duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  /** Vitesse de lecture autorisée (ex. [0.5, 1, 1.5, 2]). */
  playbackRates?: number[];
  /** Affiche le contrôle de volume. */
  showVolume?: boolean;
  /** Affiche le contrôle de vitesse. */
  showPlaybackRate?: boolean;
  /** Affiche la barre de progression scrubable. */
  showSeekbar?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */

function formatTime(ms: number): string {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const ss = s % 60;
  const mm = m % 60;
  if (h > 0) return `${h}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  return `${m}:${String(ss).padStart(2, "0")}`;
}

function AudioPlayer({
  src,
  title,
  subtitle,
  duration,
  startPosition = 0,
  volume: initialVolume = 1,
  muted: initialMuted = false,
  onTimeUpdate,
  onPlay,
  onPause,
  onEnded,
  playbackRates = [0.5, 1, 1.5, 2],
  showVolume = true,
  showPlaybackRate = false,
  showSeekbar = true,
  className,
}: AudioPlayerProps) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(startPosition);
  const [durationMs, setDurationMs] = React.useState(duration ?? 0);
  const [volume, setVolume] = React.useState(initialVolume);
  const [muted, setMuted] = React.useState(initialMuted);
  const [playbackRate, setPlaybackRate] = React.useState(1);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = src;
    audio.volume = volume;
    audio.muted = muted;
    audio.playbackRate = playbackRate;

    const onLoaded = () => {
      if (audio.duration) setDurationMs(audio.duration * 1000);
    };
    const onTime = () => {
      const t = audio.currentTime * 1000;
      setCurrentTime(t);
      onTimeUpdate?.(t, audio.duration ? audio.duration * 1000 : 0);
    };
    const onPlayHandler = () => { setIsPlaying(true); onPlay?.(); };
    const onPauseHandler = () => { setIsPlaying(false); onPause?.(); };
    const onEndedHandler = () => { setIsPlaying(false); onEnded?.(); };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlayHandler);
    audio.addEventListener("pause", onPauseHandler);
    audio.addEventListener("ended", onEndedHandler);

    if (startPosition > 0) audio.currentTime = startPosition / 1000;

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlayHandler);
      audio.removeEventListener("pause", onPauseHandler);
      audio.removeEventListener("ended", onEndedHandler);
    };
  }, [src, volume, muted, playbackRate, startPosition, onTimeUpdate, onPlay, onPause, onEnded]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else void audio.play();
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value / 1000;
    setCurrentTime(value);
  };

  const cycleRate = () => {
    const idx = playbackRates.indexOf(playbackRate);
    const next = playbackRates[(idx + 1) % playbackRates.length] ?? 1;
    setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const pct = durationMs > 0 ? Math.min(100, (currentTime / durationMs) * 100) : 0;

  return (
    <div data-slot="audio-player" className={cn("flex flex-col gap-2", className)}>
      {(title || subtitle) && (
        <div className="flex items-baseline gap-2">
          {title && <span className="text-sm font-medium">{title}</span>}
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Lecture / Pause */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={toggle}
          aria-label={isPlaying ? "Pause" : "Lecture"}
        >
          <AppIcon name={isPlaying ? "timer" : "timer"} size="sm" />
        </Button>

        {/* Barre de progression */}
        {showSeekbar && (
          <div className="flex flex-1 items-center gap-2">
            <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={durationMs || 100_000}
              value={currentTime}
              onChange={(e) => seek(Number(e.target.value))}
              className="h-1 flex-1 appearance-none bg-border accent-primary"
              aria-label="Position de lecture"
              style={{
                background: `linear-gradient(to right, var(--primary) ${pct}%, var(--border) ${pct}%)`,
              }}
            />
            <span className="w-10 text-xs tabular-nums text-muted-foreground">
              {formatTime(durationMs)}
            </span>
          </div>
        )}

        {/* Volume */}
        {showVolume && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const m = !muted;
                setMuted(m);
                if (audioRef.current) audioRef.current.muted = m;
              }}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label={muted ? "Activer le son" : "Couper le son"}
            >
              <AppIcon name="audio" size="sm" />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolume(v);
                setMuted(v === 0);
                if (audioRef.current) {
                  audioRef.current.volume = v;
                  audioRef.current.muted = v === 0;
                }
              }}
              className="h-1 w-16 appearance-none bg-border accent-primary"
              aria-label="Volume"
            />
          </div>
        )}

        {/* Vitesse */}
        {showPlaybackRate && (
          <button
            type="button"
            onClick={cycleRate}
            className="min-w-8 rounded border bg-muted/50 px-1.5 py-0.5 text-xs tabular-nums transition-colors hover:bg-muted"
            aria-label={`Vitesse de lecture : ${playbackRate}x`}
          >
            {playbackRate}x
          </button>
        )}
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}

export { AudioPlayer };
