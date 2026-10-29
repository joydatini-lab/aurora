import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

/* -------------------------------------------------------------------------- */
/* Progress                                                                    */
/* -------------------------------------------------------------------------- */

function Progress({
  className,
  value = 0,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  // On borne la valeur ici : un appelant qui passe 140 % ne doit pas peindre
  // une barre qui déborde du cadre.
  const clamped = Math.min(100, Math.max(0, value ?? 0));
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={clamped}
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full w-full flex-1 rounded-full bg-primary transition-transform duration-300 ease-out-quint"
        style={{ transform: `translateX(-${100 - clamped}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* Skeleton                                                                    */
/* -------------------------------------------------------------------------- */

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      // `aria-hidden` : un squelette n'a aucun sens pour un lecteur d'écran.
      // L'état de chargement se dit avec `aria-busy` sur le conteneur.
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Alert                                                                       */
/* -------------------------------------------------------------------------- */

const alertVariants = cva('relative flex gap-3 rounded-lg border p-4 text-sm', {
  variants: {
    variant: {
      default: 'border-border bg-muted/50 text-foreground',
      info: 'border-info/30 bg-info/8 text-foreground [&_[data-slot=alert-icon]]:text-info',
      success: 'border-success/30 bg-success/8 text-foreground [&_[data-slot=alert-icon]]:text-success',
      warning: 'border-warning/35 bg-warning/12 text-foreground [&_[data-slot=alert-icon]]:text-warning',
      destructive:
        'border-destructive/30 bg-destructive/8 text-foreground [&_[data-slot=alert-icon]]:text-destructive',
    },
  },
  defaultVariants: { variant: 'default' },
});

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      // `role="alert"` déclenche une annonce immédiate : réservé aux erreurs.
      // Les variantes informatives restent en `status` (annonce polie).
      role={variant === 'destructive' ? 'alert' : 'status'}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-title" className={cn('font-medium', className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="alert-description"
      className={cn('mt-1 text-muted-foreground', className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Avatar                                                                      */
/* -------------------------------------------------------------------------- */

function Avatar({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="avatar"
      className={cn(
        'relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Tooltip                                                                     */
/* -------------------------------------------------------------------------- */

const TooltipProvider = TooltipPrimitive.Provider;

function Tooltip({
  children,
  content,
  side = 'top',
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  return (
    <TooltipPrimitive.Root delayDuration={200}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className={cn(
            'z-50 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-md',
            'data-[state=delayed-open]:animate-in data-[state=closed]:animate-out',
            'origin-[var(--radix-tooltip-content-transform-origin)]',
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export { Progress, Skeleton, Alert, AlertTitle, AlertDescription, Avatar, Tooltip, TooltipProvider };
