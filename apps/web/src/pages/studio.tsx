import * as React from 'react';
import { ArrowRight, Check, Download, FileJson, Sparkles, TriangleAlert, Wand2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from '@/components/ui';
import { PageHeader, Section, Rule } from '@/components/design/page';
import { cn } from '@/lib/cn';
import { selectProvider } from '@/design/ai/provider';
import { buildLogo, toDataUrl, toSvg, type LogoArtifact } from '@/design/logo';
import {
  buildPoster,
  POSTER_FORMATS,
  renderOrder,
  resolvedLines,
  type PosterFormat,
} from '@/design/layout';
import { posterToSvg } from '@/design/render';
import { refine } from '@/design/pipeline';
import { validateLayout } from '@/design/validate';
import type { BrandDNA, Brief, Layout, ValidationReport } from '@/design/types';

/**
 * Studio — le premier écran de Design Space Pro.
 *
 * Il suit l'ordre de la Phase 1B du document : brief → Brand DNA → actif
 * (logo + affiche) → validation. Chaque étape reste visible et modifiable :
 * une direction proposée n'est jamais présentée comme déjà acceptée.
 */

const TONES = ['sobre', 'fiable', 'audacieux', 'chaleureux', 'minimal', 'premium', 'jeune'];

const PREFILL: Brief = {
  name: 'Maison Kora',
  sector: 'Conseil en transition écologique',
  offer: 'Accompagner les PME vers un modèle bas carbone.',
  audience: 'Dirigeants de PME industrielles',
  tone: ['sobre', 'fiable'],
  constraints: [],
  deliverables: ['charte', 'affiche'],
};

export function StudioPage() {
  const provider = React.useMemo(() => selectProvider(), []);
  const [brief, setBrief] = React.useState<Brief>(PREFILL);
  const [directions, setDirections] = React.useState<BrandDNA[] | null>(null);
  const [accepted, setAccepted] = React.useState<BrandDNA | null>(null);
  const [format, setFormat] = React.useState<PosterFormat>(POSTER_FORMATS[0]!);
  const [applyFixes, setApplyFixes] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function propose() {
    setBusy(true);
    setError(null);
    try {
      const result = await provider.proposeDirections(brief);
      setDirections(result);
      setAccepted(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Proposition impossible.');
    } finally {
      setBusy(false);
    }
  }

  const work = React.useMemo(() => {
    if (!accepted) return null;
    const initial = buildPoster(accepted, format);
    const outcome = applyFixes ? refine(initial, accepted) : null;
    const layout = outcome ? outcome.layout : initial;
    const report = outcome ? outcome.report : validateLayout(initial, accepted);
    return { initial, layout, report, outcome };
  }, [accepted, format, applyFixes]);

  const logo = React.useMemo(() => (accepted ? buildLogo(accepted) : null), [accepted]);

  const canPropose = brief.name.trim().length > 1 && brief.sector.trim().length > 1;

  return (
    <div>
      <PageHeader
        overline="Design Space Pro"
        title="Studio"
        description="D'un brief à une identité éditable : le moteur propose, vous acceptez, le validateur vérifie. Aucune étape ne prétend à une qualité qu'elle n'a pas mesurée."
      >
        <Badge variant="outline">{provider.label}</Badge>
        <Badge variant="warning">Aucun modèle distant branché</Badge>
        <Badge variant="success">Validateur déterministe</Badge>
      </PageHeader>

      {/* ---------------------------------------------------------------- */}
      <Section title="1 · Brief" note="Tout ce qui n'est pas fourni ici sera marqué « proposé » ou « inconnu » — jamais présenté comme un fait.">
        <Card className="p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="brief-name">Nom de la marque</Label>
              <Input
                id="brief-name"
                value={brief.name}
                onChange={(e) => setBrief({ ...brief, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brief-sector">Secteur</Label>
              <Input
                id="brief-sector"
                value={brief.sector}
                onChange={(e) => setBrief({ ...brief, sector: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="brief-offer">Offre</Label>
              <Textarea
                id="brief-offer"
                rows={2}
                value={brief.offer}
                onChange={(e) => setBrief({ ...brief, offer: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="brief-audience">Public</Label>
              <Input
                id="brief-audience"
                value={brief.audience}
                onChange={(e) => setBrief({ ...brief, audience: e.target.value })}
              />
            </div>
          </div>

          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-medium">Personnalité</legend>
            <div className="flex flex-wrap gap-2">
              {TONES.map((tone) => {
                const active = brief.tone.includes(tone);
                return (
                  <button
                    key={tone}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setBrief({
                        ...brief,
                        tone: active ? brief.tone.filter((t) => t !== tone) : [...brief.tone, tone],
                      })
                    }
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs transition-colors duration-150',
                      'focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card hover:bg-muted',
                    )}
                  >
                    {tone}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button onClick={() => void propose()} disabled={!canPropose || busy}>
              <Sparkles /> {busy ? 'Proposition…' : 'Proposer 3 directions'}
            </Button>
            {error ? (
              <span className="flex items-center gap-2 text-sm text-destructive" role="alert">
                <TriangleAlert className="size-4" /> {error}
              </span>
            ) : null}
          </div>
        </Card>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {directions ? (
        <Section
          title="2 · Directions"
          note="Trois propositions différenciées, avec leur compromis. En accepter une ne détruit pas les autres : elles restent comparables."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {directions.map((dna) => (
              <DirectionCard
                key={dna.id}
                dna={dna}
                active={accepted?.id === dna.id}
                onAccept={() => setAccepted(dna)}
              />
            ))}
          </div>

          <div className="mt-3">
            <Rule>
              Le fournisseur de propositions est <strong>{provider.label}</strong>. Il est
              déterministe : le même brief produit les mêmes directions, ce qui rend la
              comparaison et la revue possibles. Un modèle distant prendrait sa place sans
              qu'aucun de ces écrans change — l'interface ne connaît que le contrat.
            </Rule>
          </div>
        </Section>
      ) : null}

      {/* ---------------------------------------------------------------- */}
      {accepted && work && logo ? (
        <>
          <Section
            title="3 · Affiche"
            note="Chaque bloc est un calque : géométrie, style, ordre de rendu et verrous. L'aperçu lit le JSON, il ne le réinvente pas."
          >
            <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_1fr]">
              <div>
                <PosterPreview layout={work.layout} format={format} logo={logo} />
                <div className="mt-3 flex flex-wrap gap-2">
                  {POSTER_FORMATS.map((f) => (
                    <Button
                      key={f.id}
                      size="sm"
                      variant={format.id === f.id ? 'default' : 'outline'}
                      onClick={() => setFormat(f)}
                      aria-pressed={format.id === f.id}
                    >
                      {f.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle>Rapport de validation</CardTitle>
                      <CardDescription>
                        {work.outcome
                          ? `Raffinement : ${work.outcome.rounds} ronde(s), arrêt « ${work.outcome.stoppedBy} ».`
                          : 'Sans correction automatique : état brut du générateur.'}
                      </CardDescription>
                    </div>
                    <ScoreBadge report={work.report} />
                  </CardHeader>
                  <CardContent className="mt-4">
                    <Indicators report={work.report} />
                  </CardContent>
                </Card>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={applyFixes ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setApplyFixes((v) => !v)}
                    aria-pressed={applyFixes}
                  >
                    <Wand2 /> Correction automatique
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => download(`${logo.id}.svg`, toSvg(logo), 'image/svg+xml')}
                  >
                    <Download /> Logo SVG
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      download(
                        `affiche-${format.id}.svg`,
                        posterToSvg(work.layout, accepted, { width: 1240 }),
                        'image/svg+xml',
                      )
                    }
                  >
                    <Download /> Affiche SVG
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      download(
                        `affiche-${format.id}.json`,
                        JSON.stringify(work.layout, null, 2),
                        'application/json',
                      )
                    }
                  >
                    <FileJson /> Layout JSON
                  </Button>
                </div>
              </div>
            </div>
          </Section>

          <Section
            title="Violations"
            note="Codes typés du corpus. Une erreur bloque la publication ; un avertissement se corrige ou s'assume."
          >
            <ViolationList report={work.report} />
          </Section>

          <Section
            title="4 · Identité"
            note="Logo vectoriel en calques, et la stratégie déduite avec sa provenance."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Logo</CardTitle>
                  <Badge variant="outline">{logo.layers.length} calques</Badge>
                </CardHeader>
                <CardContent className="mt-4">
                  <div className="grid place-items-center rounded-lg border border-border bg-muted/30 p-6">
                    <img src={toDataUrl(logo)} alt={`Logo ${logo.name}`} className="size-24" />
                  </div>
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {logo.layers.map((layer) => (
                      <li key={layer.id} className="flex gap-2">
                        <span className="font-mono text-foreground">{layer.o}.</span>
                        <span>{layer.description}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <StrategyCard dna={accepted} />
            </div>
          </Section>
        </>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Directions                                                                  */
/* -------------------------------------------------------------------------- */

function DirectionCard({
  dna,
  active,
  onAccept,
}: {
  dna: BrandDNA;
  active: boolean;
  onAccept: () => void;
}) {
  return (
    <Card className={cn('flex flex-col', active && 'border-ring ring-2 ring-ring/25')}>
      <CardHeader>
        <div>
          <CardTitle>{dna.directionName}</CardTitle>
          <CardDescription className="mt-1">
            {dna.palette.template} · {dna.strategy.styleCategory.value ?? 'style à préciser'}
          </CardDescription>
        </div>
        {active ? <Check className="size-4 text-primary" /> : null}
      </CardHeader>

      <CardContent className="mt-4 flex flex-1 flex-col">
        <div className="flex overflow-hidden rounded-md border border-border">
          {dna.palette.colors.map((color) => (
            <span key={color} className="h-10 flex-1" style={{ backgroundColor: color }} title={color} />
          ))}
        </div>

        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{dna.rationale}</p>

        <Button
          className="mt-4"
          variant={active ? 'secondary' : 'default'}
          onClick={onAccept}
          aria-pressed={active}
        >
          {active ? (
            <>
              <Check /> Direction retenue
            </>
          ) : (
            <>
              Retenir cette direction <ArrowRight />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Aperçu                                                                      */
/* -------------------------------------------------------------------------- */

function PosterPreview({
  layout,
  format,
  logo,
}: {
  layout: Layout;
  format: PosterFormat;
  logo: LogoArtifact;
}) {
  return (
    <div
      className="poster-frame relative w-full overflow-hidden rounded-lg border border-border shadow-sm"
      style={{
        aspectRatio: `1 / ${format.ratio}`,
        backgroundColor: layout.canvas.bg,
      }}
      role="img"
      aria-label="Aperçu de l’affiche générée"
    >
      {renderOrder(layout).map((layer) => {
        const { a_geo: g, a_sty: s } = layer;
        const common: React.CSSProperties = {
          position: 'absolute',
          left: `${g.x * 100}%`,
          top: `${g.y * 100}%`,
          width: `${g.w * 100}%`,
          height: `${g.h * 100}%`,
          opacity: s.opacity,
          zIndex: layer.o,
          borderRadius: s.radius ? `${s.radius * 100}cqw` : undefined,
          backgroundColor: s.fill,
        };

        if (layer.a_sem.type === 'text') {
          // Les césures viennent du MODÈLE, pas du navigateur : l'aperçu doit
          // couper exactement comme l'export SVG, sinon il ment sur le résultat.
          const lines = resolvedLines(layer, layout.canvas.ratio);
          return (
            <div
              key={layer.id}
              style={{
                ...common,
                backgroundColor: 'transparent',
                color: s.fill,
                fontFamily: s.fontFamily,
                fontWeight: s.fontWeight,
                // `fs` est une fraction de la HAUTEUR du canevas ; `cqw` est un
                // pour cent de la largeur du cadre → on multiplie par le ratio.
                fontSize: `${((s.fontSize ?? 0.05) * format.ratio * 100).toFixed(3)}cqw`,
                lineHeight: s.lineHeight,
                textAlign: s.align,
                whiteSpace: 'pre',
              }}
            >
              {lines.map((line, index) => (
                <span key={`${layer.id}-${index}`} style={{ display: 'block' }}>
                  {line}
                </span>
              ))}
            </div>
          );
        }

        if (layer.a_sem.type === 'asset') {
          // On affiche le logo RÉELLEMENT généré : une silhouette d'attente
          // donnerait une idée fausse de ce qui sera exporté.
          return (
            <img
              key={layer.id}
              src={toDataUrl(logo)}
              alt=""
              aria-hidden
              style={{ ...common, backgroundColor: 'transparent', objectFit: 'contain' }}
            />
          );
        }

        return <div key={layer.id} style={common} />;
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Rapport                                                                     */
/* -------------------------------------------------------------------------- */

function ScoreBadge({ report }: { report: ValidationReport }) {
  const errors = report.violations.filter((v) => v.severity === 'error').length;
  const variant = errors > 0 ? 'destructive' : report.score >= 8 ? 'success' : 'warning';
  return (
    <Badge variant={variant} className="text-xs">
      {report.score.toFixed(1)}/10 · {errors} erreur(s)
    </Badge>
  );
}

const INDICATOR_LABELS: Array<[keyof ValidationReport['indicators'], string]> = [
  ['val', 'Validité'],
  ['ove', 'Chevauchement'],
  ['ali', 'Alignement'],
  ['undl', 'Sous-couches'],
  ['unds', 'Sous-couche stricte'],
  ['uti', 'Utilisation'],
  ['occ', 'Occlusion'],
  ['rea', 'Lisibilité'],
];

function Indicators({ report }: { report: ValidationReport }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {INDICATOR_LABELS.map(([key, label]) => {
        const value = report.indicators[key];
        return (
          <li key={key}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="font-mono text-[11px] tabular-nums">{value.toFixed(2)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-300 ease-out-quint',
                  value >= 0.8 ? 'bg-success' : value >= 0.5 ? 'bg-warning' : 'bg-destructive',
                )}
                style={{ width: `${Math.round(value * 100)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ViolationList({ report }: { report: ValidationReport }) {
  if (report.violations.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/8 px-4 py-3 text-sm">
        <Check className="size-4 text-success" />
        Aucune violation. Les neuf règles du validateur sont passées sur cette composition.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {report.violations.map((violation, index) => (
        <li
          key={`${violation.code}-${index}`}
          className={cn(
            'flex flex-wrap items-start gap-3 rounded-lg border px-4 py-3 text-sm',
            violation.severity === 'error'
              ? 'border-destructive/30 bg-destructive/8'
              : 'border-warning/35 bg-warning/10',
          )}
        >
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
            {violation.code}
          </code>
          <span className="flex-1 text-pretty">{violation.message}</span>
          {violation.measured !== undefined ? (
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              mesuré {violation.measured}
              {violation.threshold !== undefined ? ` / seuil ${violation.threshold}` : ''}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function StrategyCard({ dna }: { dna: BrandDNA }) {
  const rows: Array<[string, { value: unknown; provenance: string; source?: string }]> = [
    ['Promesse', dna.strategy.promise],
    ['Positionnement', dna.strategy.positioning],
    ['Public', dna.strategy.audience],
    ['Personnalité', dna.strategy.personality],
    ['Vocabulaire', dna.strategy.vocabulary],
    ['Catégorie de style', dna.strategy.styleCategory],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand DNA</CardTitle>
        <Badge variant="outline">v{dna.version}</Badge>
      </CardHeader>
      <CardContent className="mt-4">
        <dl className="space-y-3">
          {rows.map(([label, field]) => (
            <div key={label}>
              <dt className="flex items-center gap-2 text-xs font-medium">
                {label}
                <ProvenanceBadge provenance={field.provenance} />
              </dt>
              <dd className="mt-0.5 text-sm text-muted-foreground">
                {field.value === null
                  ? 'Non fourni — à compléter dans le brief.'
                  : Array.isArray(field.value)
                    ? field.value.join(', ')
                    : String(field.value)}
              </dd>
              {field.source ? (
                <dd className="mt-0.5 font-mono text-[10px] text-muted-foreground">{field.source}</dd>
              ) : null}
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function ProvenanceBadge({ provenance }: { provenance: string }) {
  const map: Record<string, { label: string; variant: 'success' | 'warning' | 'outline' | 'info' }> = {
    fourni: { label: 'fourni', variant: 'success' },
    propose: { label: 'proposé', variant: 'warning' },
    accepte: { label: 'accepté', variant: 'info' },
    inconnu: { label: 'inconnu', variant: 'outline' },
  };
  const entry = map[provenance] ?? map.inconnu!;
  return (
    <Badge variant={entry.variant} className="px-1.5 py-0 text-[10px]">
      {entry.label}
    </Badge>
  );
}

/* -------------------------------------------------------------------------- */
/* Utilitaires                                                                 */
/* -------------------------------------------------------------------------- */

function download(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  // Sans révocation, le blob reste en mémoire pour toute la session.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

