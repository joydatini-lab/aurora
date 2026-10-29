import * as React from 'react';
import { PageHeader, Section, Rule } from '@/components/design/page';
import { Badge, Button, Progress, Skeleton } from '@/components/ui';

/**
 * Mouvement.
 *
 * Trois durées et UNE courbe. L'animation sert à relier deux états — jamais à
 * occuper l'attention. La courbe `ease-out-quint` démarre vite et se pose
 * lentement : c'est ce qui donne l'impression de « répondre » plutôt que de
 * « s'animer ».
 */

const DURATIONS = [
  { token: '150 ms', name: 'Micro', usage: 'Hover, focus, couleur, opacité' },
  { token: '300 ms', name: 'Transition', usage: 'Ouverture de panneau, progression' },
  { token: '500 ms', name: 'Entrée', usage: 'Apparition d’une vue entière (rare)' },
];

export function MotionPage() {
  const [progress, setProgress] = React.useState(35);
  const [fade, setFade] = React.useState(true);

  // Une seule boucle, nettoyée au démontage : un setInterval oublié continue
  // de tourner après la navigation et fait fuir la mémoire.
  React.useEffect(() => {
    const id = window.setInterval(() => {
      setProgress((p) => (p >= 100 ? 0 : p + 5));
    }, 400);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div>
      <PageHeader
        overline="Fondations"
        title="Mouvement"
        description="Trois durées, une courbe, et une règle : si l'animation ne raconte pas un changement d'état, elle est supprimée."
      >
        <Badge variant="outline">ease-out-quint</Badge>
        <Badge variant="outline">150 / 300 / 500 ms</Badge>
        <Badge variant="success">reduced-motion respecté</Badge>
      </PageHeader>

      <Section
        title="La courbe"
        note="cubic-bezier(0.22, 1, 0.36, 1) — une sortie très rapide puis un long atterrissage. C'est la courbe Material « emphasized decelerate », adoucie."
      >
        <div className="rounded-lg border border-border bg-card p-5">
          <svg viewBox="0 0 240 120" className="h-32 w-full" role="img" aria-label="Courbe d'accélération ease-out-quint">
            <defs>
              <linearGradient id="curve" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--aurora-from)" />
                <stop offset="100%" stopColor="var(--aurora-to)" />
              </linearGradient>
            </defs>
            <path d="M 10 110 L 230 110" stroke="var(--border)" strokeWidth="1" />
            <path d="M 10 10 L 10 110" stroke="var(--border)" strokeWidth="1" />
            <path
              d="M 10 110 C 60 110 86 14 230 10"
              fill="none"
              stroke="url(#curve)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="230" cy="10" r="3" fill="var(--aurora-to)" />
          </svg>
          <div className="mt-2 flex justify-between font-mono text-[11px] text-muted-foreground">
            <span>temps →</span>
            <span>progression →</span>
          </div>
        </div>
      </Section>

      <Section title="Durées">
        <div className="grid gap-3 sm:grid-cols-3">
          {DURATIONS.map((d) => (
            <div key={d.token} className="rounded-lg border border-border bg-card p-4">
              <code className="font-mono text-sm font-medium">{d.token}</code>
              <p className="mt-0.5 text-xs font-medium">{d.name}</p>
              <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{d.usage}</p>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <Rule>
            Au-delà de 300 ms, une interface paraît <em>lente</em> — pas fluide. Les animations
            de 800 ms des bibliothèques de démonstration sont un piège : elles se regardent une
            fois et s'évitent ensuite.
          </Rule>
        </div>
      </Section>

      <Section title="En situation">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Progression
            </p>
            <Progress value={progress} aria-label="Progression de démonstration" />
            <p className="mt-2 font-mono text-[11px] text-muted-foreground tabular-nums">
              {progress} %
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Chargement fantôme
            </p>
            <div className="space-y-2" aria-busy="true">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Apparition
            </p>
            <div
              className="rounded-md bg-accent p-4 text-sm text-accent-foreground transition-opacity"
              style={{
                opacity: fade ? 1 : 0,
                transitionDuration: 'var(--aurora-motion, 300ms)',
                transitionTimingFunction: 'var(--ease-out-quint)',
              }}
            >
              Contenu révélé
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setFade((f) => !f)}
            >
              {fade ? 'Masquer' : 'Révéler'}
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Décalage
            </p>
            <div className="flex gap-2">
              {[0, 60, 120, 180].map((delay) => (
                <span
                  key={delay}
                  className="size-9 animate-pulse rounded-md bg-primary/25"
                  style={{ animationDelay: `${delay}ms`, animationDuration: '1.6s' }}
                />
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
              Un décalage de 60 ms entre éléments crée une cascade lisible. Au-delà de 180 ms
              cumulés, la dernière carte arrive trop tard.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Accessibilité">
        <div className="space-y-3">
          <Rule>
            <strong>prefers-reduced-motion est respecté globalement</strong> — la feuille ramène
            toutes les durées à 0,01 ms. Une animation qui provoque un malaise n'est pas un détail
            esthétique.
          </Rule>
          <Rule>
            <strong>Jamais d'animation sur une propriété de mise en page</strong> (`width`,
            `height`, `top`). Elles forcent un recalcul et saccadent sur mobile. On anime
            `transform` et `opacity`.
          </Rule>
          <Rule>
            <strong>Un chargement doit être annoncé.</strong> Le squelette est <code>aria-hidden</code> ;
            c'est le conteneur qui porte <code>aria-busy</code>. Sinon le lecteur d'écran lit une
            page vide sans prévenir.
          </Rule>
        </div>
      </Section>
    </div>
  );
}
