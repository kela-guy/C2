"use client";

import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { useScrollEdges, type ScrollAxis } from "@/lib/scroll/useScrollEdges";
import {
  ScrollEdgeCue,
  type ScrollCueSize,
  type SurfaceLevel,
} from "@/lib/scroll/ScrollEdgeCue";
import { cn } from "./utils";

type ScrollOrientation = "vertical" | "horizontal" | "both";

/** Touch-primary devices: platform scroll physics beat any custom scrollbar. */
function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return coarse;
}

const ORIENTATION_AXIS: Record<ScrollOrientation, ScrollAxis> = {
  vertical: "vertical",
  horizontal: "horizontal",
  both: "both",
};

function ScrollArea({
  className,
  children,
  orientation = "vertical",
  scrollFade = true,
  chevron = true,
  cueSize = "comfortable",
  surfaceLevel = "level1",
  viewportClassName,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  /** Which axes get scrollbars and edge cues. Default `vertical`. */
  orientation?: ScrollOrientation;
  /** Surface-gradient + chevron cues at overflowing edges. Default true. */
  scrollFade?: boolean;
  /** Show the directional chevron in the cues (gradient always renders). */
  chevron?: boolean;
  /** Cue band size along the scroll axis. Default `comfortable` (60px). */
  cueSize?: ScrollCueSize;
  /** Surface level the cue gradient fades toward. Default `level1`. */
  surfaceLevel?: SurfaceLevel;
  /** Extra classes for the inner scrolling viewport. */
  viewportClassName?: string;
}) {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const coarse = useCoarsePointer();
  const edges = useScrollEdges({
    ref: viewportRef,
    axis: ORIENTATION_AXIS[orientation],
    enabled: scrollFade,
  });

  const wantV = orientation === "vertical" || orientation === "both";
  const wantH = orientation === "horizontal" || orientation === "both";

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        data-slot="scroll-area-viewport"
        className={cn(
          "focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1",
          viewportClassName,
        )}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>

      {/*
        Custom overlay scrollbars are pointer-device only. On touch-primary
        devices we drop them and let native scrolling/physics run; the edge
        cues stay active in both modes.
      */}
      {!coarse && wantV && <ScrollBar orientation="vertical" />}
      {!coarse && wantH && <ScrollBar orientation="horizontal" />}
      {!coarse && orientation === "both" && <ScrollAreaPrimitive.Corner />}

      {scrollFade && (
        <>
          {wantV && (
            <>
              <ScrollEdgeCue edge="top" visible={edges.top} size={cueSize} chevron={chevron} surfaceLevel={surfaceLevel} />
              <ScrollEdgeCue edge="bottom" visible={edges.bottom} size={cueSize} chevron={chevron} surfaceLevel={surfaceLevel} />
            </>
          )}
          {wantH && (
            <>
              <ScrollEdgeCue edge="left" visible={edges.left} size={cueSize} chevron={chevron} surfaceLevel={surfaceLevel} />
              <ScrollEdgeCue edge="right" visible={edges.right} size={cueSize} chevron={chevron} surfaceLevel={surfaceLevel} />
            </>
          )}
        </>
      )}
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "z-20 flex touch-none p-px transition-colors select-none",
        // Vertical scrollbar sits at the inline-end (right in LTR, left in
        // RTL). Use logical border so the gutter follows direction.
        orientation === "vertical" &&
          "h-full w-2.5 border-s border-s-transparent",
        orientation === "horizontal" &&
          "h-2.5 flex-col border-t border-t-transparent",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-white/20 transition-colors duration-[var(--motion-fast)] hover:bg-white/30"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollBar };
