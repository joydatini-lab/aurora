// @ts-nocheck — combobox: issue Radix PopoverProps/children
import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { Command as CommandPrimitive } from "cmdk"

import { cn } from "../../lib/utils"

const Combobox = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Root>
>(function Combobox({ children, ...props }, ref) {
  return (
    <PopoverPrimitive.Root ref={ref} {...props}>
      {children}
    </PopoverPrimitive.Root>
  )
})
Combobox.displayName = "Combobox"

const ComboboxTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <PopoverPrimitive.Trigger
    ref={ref}
    data-slot="combobox-trigger"
    className={cn("flex w-full items-center justify-between gap-2", className)}
    {...props}
  />
))
ComboboxTrigger.displayName = "ComboboxTrigger"

const ComboboxContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "start", alignOffset = 4, sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      alignOffset={alignOffset}
      sideOffset={sideOffset}
      className={cn(
        "relative z-50 max-h-96 min-w-52 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
        className
      )}
      {...props}
    >
      <CommandPrimitive className="bg-popover text-foreground">
        <ComboboxInput />
        <CommandPrimitive.List className="overflow-y-auto overflow-x-hidden">
          <CommandPrimitive.Empty className="py-6 text-center text-sm">
            Aucune entrée trouvée
          </CommandPrimitive.Empty>
          {props.children}
        </CommandPrimitive.List>
      </CommandPrimitive>
    </PopoverPrimitive.Content>
  </PopoverPrimitive.Portal>
))
ComboboxContent.displayName = "ComboboxContent"

const ComboboxInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center gap-2 border-b px-3">
    <CommandPrimitive.Input
      ref={ref}
      className={cn("flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground", className)}
      {...props}
    />
  </div>
))
ComboboxInput.displayName = "ComboboxInput"

const ComboboxItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    data-slot="combobox-item"
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
      className
    )}
    {...props}
  />
))
ComboboxItem.displayName = "ComboboxItem"

const ComboboxList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col gap-1 p-2", className)} {...props} />
))
ComboboxList.displayName = "ComboboxList"

const ComboboxSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 h-px bg-border", className)}
    {...props}
  />
))
ComboboxSeparator.displayName = "ComboboxSeparator"

const ComboboxEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className={cn("py-6 text-center text-sm text-muted-foreground", className)}
    {...props}
  />
))
ComboboxEmpty.displayName = "ComboboxEmpty"

const ComboboxValue = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <PopoverPrimitive.Trigger ref={ref} className={cn("flex items-center justify-between w-full", className)} {...props} />
))
ComboboxValue.displayName = "ComboboxValue"

export {
  Combobox,
  ComboboxTrigger,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxSeparator,
  ComboboxEmpty,
  ComboboxValue,
}
