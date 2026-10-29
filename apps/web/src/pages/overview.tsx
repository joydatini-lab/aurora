import { Link } from 'react-router-dom';
import { ArrowRight, Palette, Type, Ruler, Wand2, Component } from 'lucide-react';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { Rule } from '@/components/design/page';

/**
 * Vue d'ensemble — la page qui explique le système avant de le montrer.
 *
 * Un design system sans énoncé de principes devient une collection de
 * composants : chacun finit par inventer sa propre règle. Les cinq principes
 * ci-dessous sont courts à dessein — s'ils ne tiennent pas en une phrase, ils
 * ne seront pas appliqués.
 */

const PRINCIPLES = [
  {
    title: 'Une action, un accent',
    body: "Le violet porte l'action. Le cyan n'existe que dans les dégradés de marque, jamais sur un bouton.",
  },
  {
    title: 'La retenue est une fonctionnalité',
    body: "Quatre statuts, une ombre douce, six variantes de bouton. Ce qui manque est un choix, pas un oubli.",
  },
  {
    title: 'Le contraste se mesure, il ne se devine pas',
    body: 'Toutes les paires texte/fond visent AA. Le gris « élégant » qui échoue à 4,5:1 est un défaut.',
  },
  {
    title: 'Le mouvement explique, il ne décore pas',
    body: "Trois durées, une courbe. Une animation qui ne dit rien de l'état coûte de l'attention.",
  },
  {
    title: 'Aucune couleur en dur',
    body: 'Un composant consomme des tokens sémantiques. Le thème sombre en découle sans retouche.',
  },
];

const SECTIONS = [
  {
    to: '/couleurs',
    icon: Palette,
    title: 'Couleurs',
    body: 'Palette primitive, tokens sémantiques et règles de contraste.',
  },
  {
    to: '/typographie',
    icon: Type,
    title: 'Typographie',
    body: 'Échelle 1.25, interlignes et tracking des grands corps.',
  },
  {
    to: '/espacement',
    icon: Ruler,
    title: 'Espacement & formes',
    body: 'Grille de 4 px, rayons, élévations et largeurs de lecture.',
  },
  {
    to: '/mouvement',
    icon: Wand2,
    title: 'Mouvement',
    body: 'Trois durées, une courbe, et le respect de reduced-motion.',
  },
  {
    to: '/composants',
    icon: Component,
    title: 'Composants',
    body: 'Galerie complète : boutons, champs, cartes, retours visuels.',
  },
];

export function OverviewPage() {
  return (
    <div>
      {/* Héro */}
      <section className="relative mb-16 overflow-hidden rounded-2xl border border-border bg-card px-6 py-14 shadow-xs sm:px-10">
        <div
          aria-hidden
          className="aurora-grid pointer-events-none absolute inset-0 opacity-[0.35]"
        />
        <div className="relative max-w-2xl">
          <Badge variant="outline" className="mb-5">
            Design system · v0
          </Badge>
          <h1 className="text-display-2 font-semibold text-balance">
            Aurora, <span className="aurora-text">encre et lumière</span>.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground text-pretty">
            Une reconstruction complète :{' '}
            <span className="text-foreground">zéro composant hérité, zéro token hérité</span>. Ce
            système part de quatre décisions — une palette en OKLCH, un accent unique, une échelle
            typographique, une courbe d'animation — et refuse délibérément le reste.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Link
              to="/composants"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors duration-150 hover:bg-primary/90"
            >
              Voir les composants <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/couleurs"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-card px-4 text-sm font-medium shadow-xs transition-colors duration-150 hover:bg-muted"
            >
              Explorer les tokens
            </Link>
          </div>
        </div>

        {/* Échantillon de marque */}
        <div aria-hidden className="relative mt-10 flex gap-2">
          {[
            'bg-primary',
            'bg-accent',
            'bg-success',
            'bg-warning',
            'bg-info',
            'bg-destructive',
          ].map((c) => (
            <span key={c} className={`h-1.5 flex-1 rounded-full ${c}`} />
          ))}
        </div>
      </section>

      {/* Principes */}
      <section className="mb-16">
        <h2 className="mb-6 text-sm font-semibold tracking-tight">Cinq principes</h2>
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map((p, i) => (
            <div key={p.title} className="bg-card p-5">
              <span className="font-mono text-[11px] text-muted-foreground">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-2 text-sm font-medium">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
          <div className="grid place-items-center bg-card p-5">
            <p className="text-center text-xs text-muted-foreground">
              Et rien de plus.
              <br />
              C'est le principe le plus difficile à tenir.
            </p>
          </div>
        </div>
      </section>

      {/* Sections */}
      <section className="mb-14">
        <h2 className="mb-6 text-sm font-semibold tracking-tight">Explorer</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <Link key={s.to} to={s.to} className="group">
              <Card className="h-full transition-colors duration-150 group-hover:border-ring/40">
                <CardHeader>
                  <div className="grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <s.icon className="size-4" />
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
                </CardHeader>
                <CardContent className="mt-3">
                  <CardTitle>{s.title}</CardTitle>
                  <CardDescription className="mt-1">{s.body}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <Rule>
        Ce système remplace intégralement l'ancien. Tout ce qui n'est pas documenté ici n'existe
        pas encore : les écrans métier reviendront composés <em>à partir</em> de ces briques, et
        non l'inverse.
      </Rule>
    </div>
  );
}
