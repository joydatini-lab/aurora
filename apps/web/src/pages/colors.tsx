import { PageHeader, Section, Grid, TokenCard, Rule, Demo } from '@/components/design/page';
import { Badge, Button } from '@/components/ui';

/**
 * Couleurs.
 *
 * Deux couches, volontairement distinctes :
 *   1. les PRIMITIVES (une teinte, plusieurs paliers) — la matière première ;
 *   2. les TOKENS SÉMANTIQUES (background, primary, destructive…) — le
 *      vocabulaire que les composants ont le droit d'utiliser.
 *
 * Les composants qui piochent dans la couche 1 créent un thème impossible à
 * faire évoluer : changer « le violet » ne change alors rien, puisque personne
 * ne sait plus où il est utilisé.
 */

const OLKCH = (l: number, c: number, h: number) => `oklch(${l} ${c} ${h})`;

const PALETTES = [
  {
    name: 'Violet',
    role: 'Accent — actions, focus, sélection',
    hue: 295,
    steps: [
      { step: '50', l: 0.97, c: 0.015 },
      { step: '100', l: 0.94, c: 0.03 },
      { step: '300', l: 0.8, c: 0.1 },
      { step: '500', l: 0.55, c: 0.19 },
      { step: '700', l: 0.42, c: 0.19 },
      { step: '900', l: 0.28, c: 0.12 },
    ],
  },
  {
    name: 'Ink',
    role: 'Neutres — texte, bordures, surfaces',
    hue: 265,
    steps: [
      { step: '50', l: 0.985, c: 0.003 },
      { step: '100', l: 0.955, c: 0.005 },
      { step: '300', l: 0.86, c: 0.008 },
      { step: '500', l: 0.6, c: 0.012 },
      { step: '700', l: 0.35, c: 0.015 },
      { step: '900', l: 0.2, c: 0.015 },
    ],
  },
  {
    name: 'Cyan',
    role: 'Marque — dégradés uniquement, jamais sémantique',
    hue: 195,
    steps: [
      { step: '50', l: 0.97, c: 0.02 },
      { step: '100', l: 0.94, c: 0.04 },
      { step: '300', l: 0.8, c: 0.1 },
      { step: '500', l: 0.65, c: 0.13 },
      { step: '700', l: 0.5, c: 0.11 },
      { step: '900', l: 0.3, c: 0.06 },
    ],
  },
];

const SEMANTIC = [
  { name: 'background', label: 'Fond de page', swatch: 'var(--background)' },
  { name: 'foreground', label: 'Texte principal', swatch: 'var(--foreground)' },
  { name: 'card', label: 'Surface élevée', swatch: 'var(--card)' },
  { name: 'muted', label: 'Surface discrète', swatch: 'var(--muted)' },
  { name: 'muted-foreground', label: 'Texte secondaire', swatch: 'var(--muted-foreground)' },
  { name: 'border', label: 'Bordures', swatch: 'var(--border)' },
  { name: 'primary', label: 'Action principale', swatch: 'var(--primary)' },
  { name: 'accent', label: 'Accent doux', swatch: 'var(--accent)' },
  { name: 'ring', label: 'Anneau de focus', swatch: 'var(--ring)' },
];

const STATUS = [
  { name: 'success', label: 'Succès', swatch: 'var(--success)' },
  { name: 'warning', label: 'Alerte', swatch: 'var(--warning)' },
  { name: 'info', label: 'Information', swatch: 'var(--info)' },
  { name: 'destructive', label: 'Destruction', swatch: 'var(--destructive)' },
];

export function ColorsPage() {
  return (
    <div>
      <PageHeader
        overline="Fondations"
        title="Couleurs"
        description="Deux couches : des primitives et des tokens sémantiques. Le système tient parce que les composants ne connaissent QUE la seconde."
      >
        <Badge variant="outline">OKLCH</Badge>
        <Badge variant="success">AA vérifié · thème maison</Badge>
        <Badge variant="outline">2 thèmes</Badge>
      </PageHeader>

      <Section
        title="Pourquoi OKLCH et pas HSL"
        note="En HSL, deux teintes de même luminosité perçue ne le sont pas : un jaune et un bleu à L=50 % n'ont pas le même poids visuel. OKLCH modélise la perception, donc un palier 500 reste un palier 500 quelle que soit la teinte."
      >
        <Demo className="gap-6">
          <div className="flex-1">
            <div className="mb-2 flex gap-1">
              {[0.6, 0.72, 0.84].map((l, i) => (
                <div
                  key={i}
                  className="h-10 flex-1 rounded"
                  style={{ background: `hsl(${40 + i * 160} 80% ${l * 100}%)` }}
                />
              ))}
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">HSL — luminosité inégale</p>
          </div>
          <div className="flex-1">
            <div className="mb-2 flex gap-1">
              {[0.6, 0.72, 0.84].map((l, i) => (
                <div
                  key={i}
                  className="h-10 flex-1 rounded"
                  style={{ background: `oklch(${l} 0.14 ${40 + i * 160})` }}
                />
              ))}
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">OKLCH — palier constant</p>
          </div>
        </Demo>
      </Section>

      <Section
        title="Primitives"
        note="La matière première. Aucun composant ne doit les référencer directement — elles n'existent que pour construire les tokens."
      >
        <div className="space-y-6">
          {PALETTES.map((palette) => (
            <div key={palette.name}>
              <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-sm font-medium">{palette.name}</span>
                <span className="text-xs text-muted-foreground">{palette.role}</span>
              </div>
              <div className="grid grid-cols-6 overflow-hidden rounded-lg border border-border">
                {palette.steps.map((s) => {
                  const value = OLKCH(s.l, s.c, palette.hue);
                  return (
                    <div key={s.step} className="group relative">
                      <div className="h-14" style={{ background: value }} />
                      <div className="border-t border-border bg-card px-2 py-1.5">
                        <p className="font-mono text-[10px] text-muted-foreground">{s.step}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Tokens sémantiques"
        note="Le vocabulaire réel. Chaque nom est une décision : « muted » veut dire « présent mais secondaire », pas « gris n°3 »."
      >
        <Grid cols={3}>
          {SEMANTIC.map((t) => (
            <TokenCard key={t.name} name={t.name} label={t.label} swatch={t.swatch} />
          ))}
        </Grid>
      </Section>

      <Section
        title="Statuts"
        note="Quatre, et aucune autre. Un cinquième statut signifie qu'un des quatre a été mal nommé — pas qu'il faut en ajouter un."
      >
        <Grid cols={4}>
          {STATUS.map((s) => (
            <TokenCard key={s.name} name={s.name} label={s.label} swatch={s.swatch} />
          ))}
        </Grid>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="success">Synchronisé</Badge>
          <Badge variant="warning">Action requise</Badge>
          <Badge variant="info">Nouveau</Badge>
          <Badge variant="destructive">Échec</Badge>
        </div>
      </Section>

      <Section
        title="Règles d'usage"
        note="Ce sont des contraintes, pas des préférences : elles évitent les interfaces qui « bavent »."
      >
        <div className="space-y-3">
          <Rule>
            <strong>Cyan = jamais de sémantique.</strong> Il ne porte aucune information. L'utiliser
            pour un succès rendrait le vert ambigu.
          </Rule>
          <Rule>
            <strong>Pas de couleur en dur.</strong> Un composant qui écrit{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">bg-[#7c3aed]</code>{' '}
            casse le thème sombre. Il doit utiliser{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">bg-primary</code>.
          </Rule>
          <Rule>
            <strong>Le contraste est un gate, pas un avis.</strong> <code>muted-foreground</code>{' '}
            n'est pas une excuse pour descendre sous 4,5:1 : si le texte est important, il est{' '}
            <code>foreground</code>.
          </Rule>
          <Rule>
            <strong>Une seule couleur d'action par zone.</strong> Deux boutons{' '}
            <code>primary</code> côte à côte forcent l'utilisateur à départager deux intentions
            visuellement identiques.
          </Rule>
        </div>
      </Section>

      <Section
        title="Test de contraste sur les surfaces réelles"
        note="Ce contrôle porte sur le thème maison. Les presets importés dans Apparence ont leurs propres paires : leur contraste est mesuré et affiché là-bas, pas supposé ici."
      >
        <Demo className="flex-col items-stretch gap-4">
          <div className="rounded-lg bg-card p-4 shadow-xs">
            <p className="text-sm text-foreground">Texte principal sur une carte</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Texte secondaire, même fond — la hiérarchie passe par la couleur, pas par la taille
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm">Action</Button>
            <Button size="sm" variant="secondary">
              Secondaire
            </Button>
            <Button size="sm" variant="outline">
              Contour
            </Button>
            <Button size="sm" variant="ghost">
              Fantôme
            </Button>
          </div>
        </Demo>
      </Section>
    </div>
  );
}
