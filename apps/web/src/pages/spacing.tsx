import { PageHeader, Section, Rule, Demo } from '@/components/design/page';
import { Badge } from '@/components/ui';

/**
 * Espacement & formes.
 *
 * Une seule unité de base : 4 px. Tout espace est un multiple — 4, 8, 12, 16,
 * 24, 32, 48, 64. Les valeurs bâtardes (5, 7, 13, 18 px) sont ce qui fait
 * qu'une interface « ne s'aligne pas » sans qu'on sache pourquoi.
 */

const SPACING = [
  { token: '1', px: '4 px', rem: '0.25 rem', usage: 'Écart icône/texte' },
  { token: '2', px: '8 px', rem: '0.5 rem', usage: 'Gap interne serré' },
  { token: '3', px: '12 px', rem: '0.75 rem', usage: 'Padding de bouton compact' },
  { token: '4', px: '16 px', rem: '1 rem', usage: 'Padding de carte (base)' },
  { token: '5', px: '20 px', rem: '1.25 rem', usage: 'Padding de carte large' },
  { token: '6', px: '24 px', rem: '1.5 rem', usage: 'Entre deux blocs liés' },
  { token: '8', px: '32 px', rem: '2 rem', usage: 'Entre deux sections' },
  { token: '12', px: '48 px', rem: '3 rem', usage: 'Marge de page' },
  { token: '16', px: '64 px', rem: '4 rem', usage: 'Respiration de héros' },
];

const RADII = [
  { token: 'sm', value: '8 px', usage: 'Champs, badges carrés' },
  { token: 'md', value: '10 px', usage: 'Boutons, inputs' },
  { token: 'lg', value: '12 px', usage: 'Cartes, panneaux' },
  { token: 'xl', value: '18 px', usage: 'Héros, modales' },
  { token: 'full', value: '9999 px', usage: 'Badges, avatars' },
];

const SHADOWS = [
  { token: 'shadow-xs', usage: 'Cartes au repos', cls: 'shadow-xs' },
  { token: 'shadow-sm', usage: 'Boutons, champs (élévation minimale)', cls: 'shadow-sm' },
  { token: 'shadow-md', usage: 'Popover, tooltip', cls: 'shadow-md' },
  { token: 'shadow-lg', usage: 'Dialog, tiroir', cls: 'shadow-lg' },
];

export function SpacingPage() {
  return (
    <div>
      <PageHeader
        overline="Fondations"
        title="Espacement & formes"
        description="Une grille de 4 px, cinq rayons, quatre élévations. Les valeurs intermédiaires sont la plupart du temps une décision qui n'a pas été prise."
      >
        <Badge variant="outline">Base 4 px</Badge>
        <Badge variant="outline">Rayon 12 px</Badge>
        <Badge variant="outline">4 ombres</Badge>
      </PageHeader>

      <Section
        title="Échelle d'espacement"
        note="Chaque valeur a un usage nommé. Si un espacement ne rentre dans aucun des cas ci-dessous, c'est le découpage de l'écran qu'il faut revoir."
      >
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <caption className="sr-only">Échelle d'espacement et usage</caption>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-2 font-medium">Token</th>
                <th scope="col" className="px-4 py-2 font-medium">Valeur</th>
                <th scope="col" className="px-4 py-2 font-medium">Visuel</th>
                <th scope="col" className="hidden px-4 py-2 font-medium sm:table-cell">Usage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {SPACING.map((s) => (
                <tr key={s.token}>
                  <td className="px-4 py-2.5 font-mono text-xs">{s.token}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    {s.px}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="block h-2 rounded-full bg-primary/70"
                      style={{ width: `calc(${s.rem} * 4)` }}
                    />
                  </td>
                  <td className="hidden px-4 py-2.5 text-xs text-muted-foreground sm:table-cell">
                    {s.usage}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="Rythme vertical"
        note="Le même espacement partout, ou des sections qui respirent selon leur poids. Ici : 24 px entre deux éléments liés, 64 px entre deux sections."
      >
        <Demo className="flex-col items-stretch">
          <div className="rounded-lg bg-card p-4 shadow-xs">
            <p className="text-sm font-medium">Bloc A</p>
            <p className="mt-1 text-sm text-muted-foreground">Padding 16 px, gap interne 4 px.</p>
          </div>
          <div className="py-2 text-center font-mono text-[11px] text-muted-foreground">
            ↕ 24 px — éléments liés
          </div>
          <div className="rounded-lg bg-card p-4 shadow-xs">
            <p className="text-sm font-medium">Bloc B</p>
            <p className="mt-1 text-sm text-muted-foreground">Même traitement, aucun bricolage.</p>
          </div>
        </Demo>
      </Section>

      <Section title="Rayons">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {RADII.map((r) => (
            <div key={r.token} className="rounded-lg border border-border bg-card p-3">
              <div
                className="mb-3 h-14 bg-primary/15 ring-1 ring-inset ring-primary/30"
                style={{ borderRadius: r.token === 'full' ? '9999px' : r.value }}
              />
              <code className="font-mono text-xs font-medium">{r.token}</code>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{r.value}</p>
              <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{r.usage}</p>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Rule>
            Le rayon de base est de <strong>12 px</strong> et tous les autres en dérivent
            (<code className="font-mono text-xs">calc(var(--radius) - 2px)</code>). Un jour où
            l'identité passe à 6 px, une seule variable change.
          </Rule>
        </div>
      </Section>

      <Section
        title="Élévations"
        note="Quatre niveaux, jamais deux ombres sur le même plan. Une carte qui « flotte » sur une autre carte est un bug de hiérarchie."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SHADOWS.map((s) => (
            <div key={s.token} className="rounded-lg border border-border bg-muted/30 p-5">
              <div className={`mb-4 h-16 rounded-md border border-border bg-card ${s.cls}`} />
              <code className="font-mono text-xs font-medium">{s.token}</code>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{s.usage}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Largeurs de contenu">
        <div className="space-y-3">
          {[
            { label: 'Formulaire', cls: 'max-w-sm', note: '384 px — un champ trop large se lit mal' },
            { label: 'Colonne de lecture', cls: 'max-w-prose', note: '≈65 caractères par ligne' },
            { label: 'Contenu de page', cls: 'max-w-5xl', note: '1024 px — largeur du design space' },
          ].map((w) => (
            <div key={w.label}>
              <div className="mb-1.5 flex flex-wrap items-baseline gap-2">
                <code className="font-mono text-xs font-medium">{w.cls}</code>
                <span className="text-[11px] text-muted-foreground">{w.note}</span>
              </div>
              <div className={`h-8 rounded-md border border-dashed border-primary/40 bg-primary/10 ${w.cls}`} />
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
