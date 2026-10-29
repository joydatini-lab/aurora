import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

/**
 * Badge — une étiquette, jamais une action. S'il faut cliquer, c'est un
 * bouton `ghost` avec la taille `sm`.
 *
 * Les variantes sémantiques reprennent exactement les quatre statuts du
 * système : rien n'est inventé localement.
 */
const badgeVariants = cva(
  [
    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5',
    'text-xs font-medium whitespace-nowrap',
    '[&_svg]:size-3 [&_svg]:pointer-events-none',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border text-foreground',
        success: 'border-success/25 bg-success/12 text-success',
        warning: 'border-warning/30 bg-warning/15 text-warning-foreground dark:text-warning',
        info: 'border-info/25 bg-info/12 text-info',
        destructive: 'border-destructive/25 bg-destructive/12 text-destructive',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
