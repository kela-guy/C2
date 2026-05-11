/**
 * Direction-aware icon helpers.
 *
 * Lucide / Central icons are named by *physical* direction
 * (`ChevronLeft`, `ChevronRight`, `ArrowLeft`, `ArrowRight`).
 * In an RTL UI a "previous page" chevron should still mean "previous
 * page" — but visually it has to point the other way. The naive fix
 * (writing `isRtl ? <ChevronLeft /> : <ChevronRight />` everywhere)
 * pollutes call sites with direction logic that has nothing to do
 * with the feature.
 *
 * `<DirectionalIcon>` solves this once. Pass the LTR start/end glyphs
 * and it picks the right one for the closest direction context (which
 * may be the app default OR a `<DirIsland>` you're rendering inside —
 * see `useDirection` for the lookup chain).
 *
 *   // pagination "previous page" arrow:
 *   <ChevronStart size={12} />
 *
 *   // breadcrumb separator:
 *   <ChevronEnd size={12} className="opacity-60" />
 *
 *   // a custom pair:
 *   <DirectionalIcon
 *     start={ChevronLeft}
 *     end={ChevronRight}
 *     size={14}
 *   />
 *
 * For glyphs that are *physically symmetric* but should still rotate
 * with direction (e.g. a `Send` icon that's drawn pointing east), use
 * a Tailwind class instead — `className="rtl:scale-x-[-1]"` — which
 * is cheaper than carrying a second icon component.
 *
 * Note: media-playback chevrons (Skip Back / Skip Forward) are
 * *time-directional*, not reading-directional, and should NOT flip.
 * Wrap the playback strip in `<DirIsland direction="ltr">` (already
 * done in `PlaybackTimeline`) instead of using these helpers there.
 */

import type { ComponentProps, ComponentType } from 'react';
// Sourced from lucide-react directly — `@/lib/icons/central` (the
// Central Icons re-export shim used elsewhere in the stash) hasn't
// landed yet on this branch, and these glyphs render identically
// across the two icon sets. Swap to the central shim once the icon
// migration arrives.
import {
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useIsRtl } from './context';

/**
 * Loose icon shape — Central icons, lucide icons, and our own SVG
 * components all satisfy `ComponentType<{ size?, className?, ... }>`.
 */
type IconLike = ComponentType<{ size?: number | string; className?: string; [key: string]: unknown }>;

export interface DirectionalIconProps {
  /** Glyph to render at the *inline-start* edge (the side text begins). */
  start: IconLike;
  /** Glyph to render at the *inline-end* edge (the side text finishes). */
  end: IconLike;
  /** Size in pixels (forwarded to the icon). */
  size?: number | string;
  /** Optional class names (forwarded to the icon). */
  className?: string;
  /** Catch-all for icon-specific props (`aria-hidden`, `strokeWidth`, …). */
  [key: string]: unknown;
}

/**
 * Generic chooser. Prefer the named helpers below at call sites — they
 * read better and don't require importing `<icon>` components inline.
 */
export function DirectionalIcon({ start: Start, end: End, ...rest }: DirectionalIconProps) {
  const isRtl = useIsRtl();
  const Icon = (isRtl ? End : Start) as IconLike;
  return <Icon {...(rest as ComponentProps<IconLike>)} />;
}

type ChevronProps = Omit<ComponentProps<typeof ChevronLeft>, 'ref'>;

/** Chevron pointing toward the *inline-start* edge (e.g. "previous"). */
export function ChevronStart(props: ChevronProps) {
  const isRtl = useIsRtl();
  const Icon = isRtl ? ChevronRight : ChevronLeft;
  return <Icon {...props} />;
}

/** Chevron pointing toward the *inline-end* edge (e.g. "next", submenu indicator). */
export function ChevronEnd(props: ChevronProps) {
  const isRtl = useIsRtl();
  const Icon = isRtl ? ChevronLeft : ChevronRight;
  return <Icon {...props} />;
}

/** Double-chevron pointing toward the inline-start edge (e.g. "first page"). */
export function ChevronsStart(props: ChevronProps) {
  const isRtl = useIsRtl();
  const Icon = isRtl ? ChevronsRight : ChevronsLeft;
  return <Icon {...props} />;
}

/** Double-chevron pointing toward the inline-end edge (e.g. "last page"). */
export function ChevronsEnd(props: ChevronProps) {
  const isRtl = useIsRtl();
  const Icon = isRtl ? ChevronsLeft : ChevronsRight;
  return <Icon {...props} />;
}

/**
 * Arrow pointing toward the inline-start edge.
 *
 * The Central icon set doesn't ship dedicated `ArrowLeft` / `ArrowRight`
 * glyphs (only `ArrowUp` / `ArrowUpDown` are wrapped — see
 * `src/lib/icons/central.ts`). We approximate by rotating `ArrowUp`:
 *  - LTR: rotate `-90deg` → arrow points *physically* left → matches
 *    inline-start in LTR.
 *  - RTL: rotate `+90deg` → arrow points *physically* right → matches
 *    inline-start in RTL.
 *
 * If/when Central exports a dedicated arrow glyph, swap the rotation
 * out for direct icon import.
 */
export function ArrowStart(props: ChevronProps) {
  const isRtl = useIsRtl();
  const className = `${props.className ?? ''} ${isRtl ? 'rotate-90' : '-rotate-90'}`.trim();
  return <ArrowUp {...props} className={className} />;
}

/** Arrow pointing toward the inline-end edge. Same approach as `ArrowStart`. */
export function ArrowEnd(props: ChevronProps) {
  const isRtl = useIsRtl();
  const className = `${props.className ?? ''} ${isRtl ? '-rotate-90' : 'rotate-90'}`.trim();
  return <ArrowUp {...props} className={className} />;
}

// `ChevronDown` is exported here purely for documentation — vertical
// chevrons (open/close, expand/collapse) are not direction-sensitive
// and should be imported directly from `@/lib/icons/central`.
export type { ChevronDown };
