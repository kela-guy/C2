/**
 * `<DirIsland>` — pin a subtree to a specific writing direction.
 *
 * Why this exists
 * ───────────────
 *  Most of the app should follow the user's direction (set globally by
 *  `<DirectionProvider>`). But some surfaces are *direction-agnostic*
 *  by product convention and should never flip:
 *
 *    - Instrument HUDs (drone telemetry, compass strip, gauges) —
 *      operators learn the spatial layout once; mirroring it would
 *      undermine recall during high-stakes operations.
 *    - Media controls (playback timeline, video scrub bar) — time
 *      flows left-to-right universally.
 *    - The slim icon rail — the rail is a stable visual anchor; the
 *      product treats it as physical chrome, not reading content.
 *    - Latin-only chrome (frequency tables, code editors, log
 *      consoles) — switching them to RTL produces no benefit and
 *      breaks alignment of Latin tokens.
 *
 *  Wrapping such a subtree in `<DirIsland direction="ltr">` does three
 *  things at once:
 *
 *    1. Sets `dir="ltr"` on the wrapper element, which establishes a
 *       new bidi paragraph and re-anchors logical CSS utilities
 *       (`ms-*`, `start-*`, `text-start`, …) to the LTR side.
 *    2. Cuts the `rtl:` Tailwind variant cascade — see the comment in
 *       `src/styles/theme.css`. So a chevron with `rtl:rotate-180`
 *       sitting inside an LTR island stops flipping.
 *    3. Wraps the subtree in Radix's `DirectionProvider` so any Radix
 *       primitives rendered inside (DropdownMenu, ContextMenu,
 *       Tooltip, …) inherit the island's direction instead of the
 *       app's.
 *
 *  Use this primitive instead of writing `dir="ltr"` directly on
 *  arbitrary elements — it's greppable, self-documenting, and keeps
 *  Radix's React context in sync with the DOM attribute.
 */

import type { ElementType, ReactNode } from 'react';
import { DirectionProvider as RadixDirectionProvider } from '@radix-ui/react-direction';
import type { Direction } from './context';

export interface DirIslandProps {
  /** The direction this subtree should render in. */
  direction: Direction;
  /** Subtree to render. */
  children: ReactNode;
  /** Optional class names applied to the wrapper element. */
  className?: string;
  /**
   * Element the wrapper renders as. Defaults to `'div'`. Pass `'span'`
   * for inline contexts (e.g. an LTR callsign inside a Hebrew
   * sentence). Pass any other tag to keep the surrounding semantic
   * structure intact.
   */
  as?: ElementType;
}

export function DirIsland({
  direction,
  children,
  className,
  as: Component = 'div',
}: DirIslandProps) {
  return (
    <Component dir={direction} className={className}>
      <RadixDirectionProvider dir={direction}>{children}</RadixDirectionProvider>
    </Component>
  );
}
