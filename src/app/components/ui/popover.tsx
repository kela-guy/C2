"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { PopoverSurface } from "@/primitives/Substrate";
import { cn } from "./utils";

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

const PopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentProps<typeof PopoverPrimitive.Trigger>
>(function PopoverTrigger(props, ref) {
  return (
    <PopoverPrimitive.Trigger ref={ref} data-slot="popover-trigger" {...props} />
  );
});

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentProps<typeof PopoverPrimitive.Content>
>(function PopoverContent(
  { className, align = "center", sideOffset = 4, ...props },
  ref,
) {
  // Radix's `align` prop is **logical**: floating-ui auto-detects RTL from
  // `getComputedStyle(reference).direction` and resolves `start`/`end` to
  // the reading-order-correct physical edge. So `align="end"` anchors to
  // the trigger's inline-end edge in both directions — no manual flip
  // needed at the call site.
  //
  // Note: Radix's transform-origin middleware is **not** RTL-aware (it
  // hard-codes `start → 0%`, `end → 100%`). The `rtl-popover-origin` CSS
  // utility in `src/styles/theme.css` overrides the origin in RTL based on
  // `[data-align]` so the zoom-in animation starts from the corner
  // adjacent to the trigger.
  // Substrate: popovers paint via <PopoverSurface asChild>, which
  // lifts the substrate +2 above whatever the trigger lived in.
  // The Radix Content node itself receives data-substrate plus the
  // bg-[var(--surface)] shadow-[var(--shadow)] classes; no wrapper
  // div needed.
  return (
    <PopoverPrimitive.Portal>
      <PopoverSurface asChild>
        <PopoverPrimitive.Content
          ref={ref}
          data-slot="popover-content"
          align={align}
          sideOffset={sideOffset}
          className={cn(
            "text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border border-border-default p-4 outline-hidden",
            className,
          )}
          {...props}
        />
      </PopoverSurface>
    </PopoverPrimitive.Portal>
  );
});

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
