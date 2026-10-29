import * as React from 'react';
import { cn } from '@/lib/cn';

/**
 * Primitives de documentation du design space.
 *
 * Ce sont des OUTILS DE DOC, pas des composants du produit : ils vivent hors de
 * `components/ui` et n'ont pas vocation à être importés par un écran métier.
 * Les mélanger serait le début de la fin — un jour, un `<Swatch>` se
 * retrouverait dans une page utilisateur.
 */

/** En-tête d'écran : sur-titre, titre, chapô. */
export function PageHeader({
  overline,
  title,
  description,
  children,
}: {
  overline: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-12 max-w-3xl">
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {overline}
      </p>
      <h1 className="text-display-2 font-semibold text-balance">{title}</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty">
        {description}
      </p>
      {children ? <div className="mt-6 flex flex-wrap items-center gap-2">{children}</div> : null}
    </header>
  );
}

/** Bloc de section : titre + note facultative + contenu. */
export function Section({
  title,
  note,
  children,
  className,
}: {
  title: string;
  note?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('mb-14', className)}>
      <div className="mb-5 flex flex-col gap-1 border-b border-border pb-3">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {note ? <p className="max-w-2xl text-sm text-muted-foreground">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Grille responsive, l'unité de mise en page de toutes les pages de doc. */
export function Grid({
  cols = 3,
  children,
  className,
}: {
  cols?: 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid gap-4',
        cols === 2 && 'sm:grid-cols-2',
        cols === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
        cols === 4 && 'grid-cols-2 lg:grid-cols-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Montre une valeur de token avec son nom technique.
 *
 * Le nom est affiché parce que c'est LUI qu'on utilise dans le code : une doc
 * qui ne montre que la couleur oblige à rouvrir la feuille de style.
 */
export function TokenCard({
  name,
  value,
  label,
  swatch,
  className,
}: {
  name: string;
  value?: string;
  label?: string;
  swatch?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-card shadow-xs',
        className,
      )}
    >
      {swatch ? (
        <div className="h-16 w-full border-b border-border" style={{ background: swatch }} />
      ) : null}
      <div className="px-3 py-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <code className="font-mono text-xs font-medium text-foreground">{name}</code>
          {value ? (
            <span className="font-mono text-[11px] text-muted-foreground">{value}</span>
          ) : null}
        </div>
        {label ? <p className="mt-0.5 text-xs text-muted-foreground">{label}</p> : null}
      </div>
    </div>
  );
}

/** Encadré de démonstration : fond distinct pour isoler un exemple. */
export function Demo({
  children,
  className,
  dark,
}: {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-lg border border-border p-5',
        dark ? 'bg-foreground text-background' : 'bg-muted/40',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Paire « ce qu'on voit / le code qui le produit ». */
export function Specimen({
  title,
  code,
  children,
}: {
  title: string;
  code?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <span className="text-xs font-medium text-foreground">{title}</span>
        {code ? <code className="font-mono text-[11px] text-muted-foreground">{code}</code> : null}
      </div>
      <div className="flex flex-wrap items-center gap-3 bg-muted/30 p-5">{children}</div>
    </div>
  );
}

/** Règle de conception — le « pourquoi », à côté du « comment ». */
export function Rule({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border-l-2 border-primary bg-primary/[0.04] px-4 py-3 text-sm text-muted-foreground">
      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
      <p className="text-pretty">{children}</p>
    </div>
  );
}
