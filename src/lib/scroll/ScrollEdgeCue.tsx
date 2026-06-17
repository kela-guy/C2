/**
 * ScrollEdgeCue — the overflow affordance for one edge of a scroll container.
 *
 * Renders a surface-coloured gradient that fades toward the surface level of
 * its context (so a menu elevated above a dialog fades into the menu colour,
 * not the page) plus a directional chevron. Wire `visible` to the matching
 * flag from `useScrollEdges`. Part of the scrolling-list system
 * (https://www.fluidfunctionalism.com/docs/scrolling-list).
 *
 * Modes:
 *  - `absolute` (default): an overlay band positioned over the viewport. Use
 *    when the cue sits in a relatively-positioned wrapper around the scroller
 *    (e.g. virtualized lists where Virtuoso owns the scroll element).
 *  - `sticky`: a zero-flow sticky element rendered *inside* the scroller, so it
 *    rides the visible edge without being clipped. Use inside listboxes/menus.
 */
import type { CSSProperties } from 'react';
import { surfaceAt } from '@/primitives/tokens';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from '@/lib/icons/central';
import { cn } from '@/shared/components/ui/utils';

export type ScrollEdge = 'top' | 'bottom' | 'left' | 'right';
export type ScrollCueSize = 'tight' | 'comfortable';
export type ScrollCueMode = 'sticky' | 'absolute';
export type SurfaceLevel = 'level0' | 'level1' | 'level2' | 'level3' | 'level4';

export interface ScrollEdgeCueProps {
  /** Which scroll edge the cue marks. */
  edge: ScrollEdge;
  /** Whether the cue shows — wire to the matching `useScrollEdges` flag. */
  visible: boolean;
  /** `absolute` overlay band (default) or `sticky` in-scroller element. */
  mode?: ScrollCueMode;
  /** Surface level the gradient fades toward. Default `level1` (panel bg). */
  surfaceLevel?: SurfaceLevel;
  /**
   * Explicit colour the gradient fades toward, for surfaces outside the
   * elevation scale (e.g. a zinc-950 sheet). Any CSS colour; overrides
   * `surfaceLevel`. Accepts a hex or `var(--token)`.
   */
  surfaceColor?: string;
  /** Band size along the scroll axis — tight 32px, comfortable 60px. */
  size?: ScrollCueSize;
  /** Show the directional chevron. The gradient always renders. Default true. */
  chevron?: boolean;
  className?: string;
}

const BAND_PX: Record<ScrollCueSize, number> = { tight: 32, comfortable: 60 };

const CHEVRONS = {
  top: ChevronUp,
  bottom: ChevronDown,
  left: ChevronLeft,
  right: ChevronRight,
} as const;

const GRADIENT_DIR: Record<ScrollEdge, string> = {
  top: 'to bottom',
  bottom: 'to top',
  left: 'to right',
  right: 'to left',
};

export function ScrollEdgeCue({
  edge,
  visible,
  mode = 'absolute',
  surfaceLevel = 'level1',
  surfaceColor,
  size = 'comfortable',
  chevron = true,
  className,
}: ScrollEdgeCueProps) {
  const surface = surfaceColor ?? surfaceAt(surfaceLevel);
  const band = BAND_PX[size];
  const isVertical = edge === 'top' || edge === 'bottom';
  const Chevron = CHEVRONS[edge];

  // Opaque surface at the edge, fading to transparent away from it. The mid
  // stop uses color-mix so the runway reads as the same material at any depth.
  const background = `linear-gradient(${GRADIENT_DIR[edge]}, ${surface} 0%, color-mix(in oklab, ${surface} 55%, transparent) 45%, transparent 100%)`;

  const style: CSSProperties = {
    background,
    [isVertical ? 'height' : 'width']: band,
    // sticky bands must not consume flow space inside the scroller.
    ...(mode === 'sticky'
      ? { position: 'sticky', marginBottom: edge === 'top' ? -band : undefined, marginTop: edge === 'bottom' ? -band : undefined }
      : null),
  };

  return (
    <div
      aria-hidden
      data-scroll-edge={edge}
      className={cn(
        'pointer-events-none z-10 flex transition-opacity duration-[var(--motion-fast)]',
        mode === 'absolute' && 'absolute',
        isVertical ? 'inset-x-0' : 'inset-y-0',
        edge === 'top' && 'top-0 items-start justify-center pt-1',
        edge === 'bottom' && 'bottom-0 items-end justify-center pb-1',
        edge === 'left' && 'start-0 items-center justify-start ps-1',
        edge === 'right' && 'end-0 items-center justify-end pe-1',
        visible ? 'opacity-100' : 'opacity-0',
        className,
      )}
      style={style}
    >
      {chevron && <Chevron size={16} className="text-white/45" aria-hidden />}
    </div>
  );
}
