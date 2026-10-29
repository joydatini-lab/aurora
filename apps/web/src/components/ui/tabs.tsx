import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/cn';

/**
 * Tabs — Radix porte l'accessibilité (roving tabindex, `aria-controls`,
 * navigation aux flèches) ; nous ne portons que l'apparence. C'est exactement
 * le partage qu'on veut d'un design system : le comportement ne s'improvise pas.
 */
const Tabs = TabsPrimitive.Root;

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'inline-flex h-9 items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex h-7 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium',
        'transition-[background-color,color,box-shadow] duration-150 ease-out-quint',
        'hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
        'data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs',
        'disabled:pointer-events-none disabled:opacity-50',
        '[&_svg]:size-4 [&_svg]:pointer-events-none',
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('mt-4 focus-visible:outline-none', className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
