import { PageHeader, Section, Rule, Specimen } from '@/components/design/page';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/cn';

/**
 * Typographie.
 *
 * Une seule famille, six tailles utilisées, et une règle : la hiérarchie se
 * construit par le CONTRASTE et l'ESPACE, pas en empilant des corps de 13 px.
 * Le design space lui-même n'utilise que ces paliers — s'il en fallait un
 * septième, c'est la page qui serait mal découpée.
 */

const SCALE = [
  { token: 'display-1', size: '3.25rem / 52px', lh: '1.05', ls: '-0.035em', usage: 'Titre de couverture' },
  { token: 'display-2', size: '2.5rem / 40px', lh: '1.1', ls: '-0.03em', usage: 'Titre d’écran' },
  { token: 'display-3', size: '1.875rem / 30px', lh: '1.15', ls: '-0.025em', usage: 'Titre de section forte' },
  { token: 'text-lg', size: '1.125rem / 18px', lh: '1.55', ls: '0', usage: 'Chapô, intro' },
  { token: 'text-base', size: '1rem / 16px', lh: '1.6', ls: '0', usage: 'Corps de texte' },
  { token: 'text-sm', size: '0.875rem / 14px', lh: '1.55', ls: '0', usage: 'Interface, labels' },
  { token: 'text-xs', size: '0.75rem / 12px', lh: '1.5', ls: '0.01em', usage: 'Légendes, méta' },
];

export function TypographyPage() {
  return (
    <div>
      <PageHeader
        overline="Fondations"
        title="Typographie"
        description="Une famille système, une échelle resserrée, et une hiérarchie portée par le contraste plutôt que par le nombre de tailles."
      >
        <Badge variant="outline">1 famille</Badge>
        <Badge variant="outline">Ratio 1.25</Badge>
        <Badge variant="outline">Tracking négatif ≥ 30 px</Badge>
      </PageHeader>

      <Section
        title="Pourquoi la police système"
        note="Aucun chargement, aucun FOUT, un rendu natif sur chaque plateforme. Une police de marque coûte 40 à 120 ko et une décision de licence ; elle se justifiera quand l'identité sera le sujet — pas avant."
      >
        <div className="space-y-3">
          <Rule>
            <strong>Une seule famille.</strong> Les interfaces qui mélangent une grotesque pour les
            titres et une humaniste pour le texte finissent par produire deux systèmes visuels.
          </Rule>
          <Rule>
            <strong>Pas de graisse en dessous de 400 pour du texte.</strong> Sur écran, un 300
            « élégant » devient illisible dès qu'on baisse la luminosité.
          </Rule>
        </div>
      </Section>

      <Section title="Échelle">
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {SCALE.map((s) => (
            <div key={s.token} className="grid gap-1 px-4 py-4 sm:grid-cols-[160px_1fr]">
              <div>
                <code className="font-mono text-xs font-medium">{s.token}</code>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{s.size}</p>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <span
                  className={cn(
                    s.token === 'display-1' && 'text-display-1 font-semibold',
                    s.token === 'display-2' && 'text-display-2 font-semibold',
                    s.token === 'display-3' && 'text-display-3 font-semibold',
                    s.token === 'text-lg' && 'text-lg',
                    s.token === 'text-base' && 'text-base',
                    s.token === 'text-sm' && 'text-sm',
                    s.token === 'text-xs' && 'text-xs',
                  )}
                >
                  Encre et lumière
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  lh {s.lh} · ls {s.ls}
                </span>
              </div>
              <p className="text-xs text-muted-foreground sm:col-start-2">{s.usage}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Corps de lecture"
        note="La largeur de ligne compte autant que le corps : au-delà de ~75 caractères, l'œil perd le début de la ligne suivante. D'où `max-w-prose` sur tout paragraphe long."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Bon — 65 caractères
            </p>
            <p className="max-w-prose text-base leading-relaxed text-pretty">
              Un design system n'est pas une bibliothèque de composants. C'est un ensemble de
              décisions écrites, chacune avec sa raison, pour qu'un écran ajouté dans six mois
              n'ait pas à réinventer la même règle.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Mauvais — pleine largeur
            </p>
            <p className="text-base leading-relaxed text-pretty">
              Un design system n'est pas une bibliothèque de composants. C'est un ensemble de
              décisions écrites, chacune avec sa raison, pour qu'un écran ajouté dans six mois
              n'ait pas à réinventer la même règle, ni à négocier le même espacement avec le
              designer, ni à redécouvrir que le focus doit rester visible au clavier.
            </p>
          </div>
        </div>
      </Section>

      <Section
        title="Chiffres et code"
        note="`tabular-nums` aligne les colonnes de chiffres ; sans lui, un tableau de montants danse. Le monospace est réservé aux valeurs techniques."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="space-y-1 text-sm">
              {[
                ['Rendu', '1 248 ms'],
                ['Rattachés', '19 ms'],
                ['Unités', '1 019'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium tabular-nums">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <Specimen title="Valeur technique" code="font-mono text-xs">
            <code className="w-full overflow-x-auto rounded bg-muted px-2 py-1 font-mono text-xs">
              bg-primary · text-primary-foreground
            </code>
          </Specimen>
        </div>
      </Section>

      <Section title="Composition réelle">
        <article className="rounded-xl border border-border bg-card p-6 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Recherche
          </p>
          <h3 className="mt-2 text-display-3 font-semibold text-balance">
            Trois pistes pour la semaine
          </h3>
          <p className="mt-3 max-w-prose text-base leading-relaxed text-muted-foreground text-pretty">
            La hiérarchie ci-dessus utilise deux tailles seulement — display-3 puis base. Tout le
            reste est porté par la couleur, la casse et l'espace vertical.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Dernière synchronisation <span className="tabular-nums">il y a 4 min</span>
          </p>
        </article>
      </Section>
    </div>
  );
}
