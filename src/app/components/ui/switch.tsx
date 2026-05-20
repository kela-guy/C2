"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "./utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    // Switches are an *instrument* control — the thumb position on
    // the physical right is treated as universal "on" across most
    // platforms (iOS, Android, macOS, Windows). Forcing `dir="ltr"`
    // keeps the off→on motion consistent regardless of the app's
    // active direction. Same convention as the playback timeline
    // and the drone HUD; see `src/lib/direction/DirIsland.tsx`.
    // Track + thumb are tuned for our dark tactical popovers. The
    // shadcn defaults (`bg-switch-background`, `transition-all` with no
    // duration) read as invisible against `bg-[#1a1a1a]/95` and feel
    // instant; explicit duration + a brighter unchecked state restore
    // the off→on motion.
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer relative inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full",
        "ring-1 ring-inset ring-border-default",
        "data-[state=unchecked]:bg-state-selected data-[state=checked]:bg-accent-success/80",
        "transition-colors duration-200 ease-out",
        "outline-none focus-visible:ring-2 focus-visible:ring-border-strong",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-slate-12 shadow-sm ring-0",
          "transition-transform duration-200 ease-out",
          // Physical X-translation isn't direction-aware; use rtl: variants
          // so the thumb travels the trailing edge in RTL contexts (Hebrew),
          // matching the visual on/off semantics readers expect.
          "data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0",
          "rtl:data-[state=checked]:-translate-x-[calc(100%-2px)] rtl:data-[state=unchecked]:translate-x-0",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
