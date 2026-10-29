import * as React from 'react';
import { cn } from '@/lib/cn';

/**
 * Input — l'anatomie d'un champ, réglée une fois pour toutes.
 *
 * L'anneau de focus est porté par le champ lui-même : un `outline` posé par le
 * navigateur se décale dès qu'on ajoute une icône ou un bouton interne.
 */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-9 w-full min-w-0 rounded-md border border-input bg-card px-3 py-1 text-sm',
        'shadow-xs transition-[border-color,box-shadow] duration-150 ease-out-quint',
        'placeholder:text-muted-foreground',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/25',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
