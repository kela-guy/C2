"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { TooltipSurface } from "@/primitives/Substrate";
import { cn } from "./utils";

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  showArrow = true,
  arrowClassName,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content> & {
  showArrow?: boolean;
  arrowClassName?: string;
}) {
  // Substrate: tooltips lift +3 above the surrounding context.
  // The Radix Arrow can't easily reach var(--surface) without a
  // ref-based read (it's a portaled SVG), so we paint the arrow
  // from --slate-7 — close enough to the substrate-3/4 popovers
  // most tooltips sit above. Inside dialogs the tooltip surface
  // pops to substrate 8, so the arrow disagreement is slight but
  // visible — TODO: bind the arrow fill to var(--surface) via a
  // ref or wrap Arrow in <Elevated asChild>.
  return (
    <TooltipPrimitive.Portal>
      <TooltipSurface asChild>
        <TooltipPrimitive.Content
          data-slot="tooltip-content"
          sideOffset={sideOffset}
          className={cn(
            "text-popover-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md border border-border-default px-3 py-1.5 text-xs text-balance",
            className,
          )}
          {...props}
        >
          {children}
          {showArrow && (
            <TooltipPrimitive.Arrow
              className={cn("fill-[var(--surface)] z-50", arrowClassName)}
            />
          )}
        </TooltipPrimitive.Content>
      </TooltipSurface>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
