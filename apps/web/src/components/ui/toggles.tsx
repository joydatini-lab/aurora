import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Switch — un réglage qui prend effet immédiatement.
 * La distinction avec Checkbox n'est pas cosmétique : la case à cocher est un
 * CHOIX qu'on valide ensuite (formulaire), l'interrupteur est un ÉTAT qui
 * s'applique tout de suite (réglage). Les confondre rend les formulaires
 * imprévisibles.
 */
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent',
        'transition-colors duration-150 ease-out-quint',
        'focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block size-4 rounded-full bg-card shadow-sm ring-0',
          'transition-transform duration-150 ease-out-quint',
          'data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0.5',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer size-4 shrink-0 rounded-[4px] border border-input bg-card shadow-xs',
        'transition-[background-color,border-color,box-shadow] duration-150 ease-out-quint',
        'focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        'data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground',
        'aria-invalid:border-destructive',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        {props.checked === 'indeterminate' ? (
          <Minus className="size-3" strokeWidth={3} />
        ) : (
          <Check className="size-3" strokeWidth={3} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Switch, Checkbox };
