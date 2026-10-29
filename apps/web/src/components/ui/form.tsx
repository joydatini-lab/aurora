import * as React from 'react';
import { cn } from '@/lib/cn';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-20 w-full rounded-md border border-input bg-card px-3 py-2 text-sm',
        'shadow-xs transition-[border-color,box-shadow] duration-150 ease-out-quint',
        'placeholder:text-muted-foreground',
        // `field-sizing: content` n'est pas universel : `resize-y` reste le
        // comportement par défaut, sans casser la hauteur minimale.
        'resize-y',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/25',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      data-slot="label"
      className={cn(
        'flex select-none items-center gap-2 text-sm font-medium leading-none',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}

function Separator({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<'div'> & { orientation?: 'horizontal' | 'vertical' }) {
  return (
    <div
      data-slot="separator"
      role="separator"
      aria-orientation={orientation}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea, Label, Separator };
