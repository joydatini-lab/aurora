import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

/**
 * Button — l'action, et rien d'autre.
 *
 * Six variantes, quatre tailles : au-delà, un design system commence à proposer
 * des boutons que personne ne sait choisir. `link` existe parce qu'une action
 * de navigation déguisée en texte reste un bouton pour le clavier.
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-md text-sm font-medium',
    // La transition porte sur les propriétés réellement animées, pas `all` :
    // `transition-all` fait sauter la mise en page sur les propriétés de flux.
    'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out-quint',
    "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:border-ring",
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
    'active:translate-y-px',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-input bg-card text-foreground shadow-xs hover:bg-muted',
        ghost: 'text-foreground hover:bg-muted',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        default: 'h-9 px-4',
        lg: 'h-11 px-6 text-[15px]',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Rend un enfant unique à la place du `<button>` (ex. `<a>`, `<Link>`). */
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
