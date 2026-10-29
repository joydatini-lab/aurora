import * as React from 'react';
import { cn } from '@/lib/cn';

/**
 * Card — un conteneur, pas une décoration.
 *
 * Une seule élévation (`shadow-xs`) et une bordure : empiler les ombres pour
 * « faire ressortir » est le plus sûr moyen d'obtenir une interface bruyante.
 * L'élévation forte est réservée aux surfaces flottantes (popover, dialog).
 */
function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'flex flex-col gap-5 rounded-xl border border-border bg-card py-5 text-card-foreground shadow-xs',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 px-5',
        // Quand un header suit une description, l'espacement se resserre.
        '[.border-b]:pb-4',
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('text-sm font-semibold tracking-tight', className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-5', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center gap-2 px-5', className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
