import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui';

/**
 * 404.
 *
 * Une page d'erreur utile dit trois choses : ce qui s'est passé, où aller,
 * et où l'on était. C'est la seule page où afficher l'URL fautive est
 * réellement rendu service.
 */
export function NotFoundPage() {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-[60vh] flex-col justify-center">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
        404
      </p>
      <h1 className="mt-3 text-display-2 font-semibold text-balance">
        Cette page n'existe pas.
      </h1>
      <p className="mt-4 max-w-prose text-base leading-relaxed text-muted-foreground text-pretty">
        L'adresse <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">{pathname}</code>{' '}
        ne correspond à aucune section documentée. Le design system vit sur cinq écrans —
        c'est peu, mais c'est délibéré.
      </p>
      <div className="mt-7 flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/">
            <ArrowLeft /> Vue d'ensemble
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/composants">Galerie de composants</Link>
        </Button>
      </div>
    </div>
  );
}
