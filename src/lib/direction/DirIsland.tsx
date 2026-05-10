/**
 * DirIsland — break the direction cascade for a subtree.
 *
 * Some controls in this app are *physical* by convention and must not
 * mirror with the surrounding writing direction:
 *
 *   - Playback timelines (time always flows left → right).
 *   - Drone HUD instrument strips (artificial horizon, compass tape).
 *   - Audio waveforms / scrub bars.
 *   - Switches (off-on physical translation, see `ui/switch.tsx`).
 *
 * Wrapping such a subtree in `<DirIsland direction="ltr">` sets `dir="ltr"`
 * on its root element, which:
 *
 *   1. Makes Tailwind's `rtl:` / `ltr:` variants resolve as if the page
 *      were LTR inside the island, so any logical-property utilities
 *      (`start-*`, `me-*`, etc.) compute against LTR axes.
 *   2. Tells Floating-UI / Radix to position popovers as if the page
 *      were LTR.
 *   3. Tells the browser to lay out flex/grid `flex-direction: row` and
 *      text in LTR order regardless of the outer page direction.
 *
 * Use sparingly — the default should be "follow the page" via inherited
 * `dir`. Only reach for `DirIsland` when a control's affordance is
 * fundamentally tied to a physical axis.
 */

import type { ElementType, ReactNode } from 'react';
import type { Direction } from './DirectionProvider';

interface DirIslandProps {
  direction: Direction;
  children: ReactNode;
  /** Element to render. Defaults to `'div'`; pass `'span'` etc. when the parent expects inline content. */
  as?: ElementType;
  className?: string;
}

export function DirIsland({
  direction,
  children,
  as: Component = 'div',
  className,
}: DirIslandProps) {
  return (
    <Component dir={direction} className={className}>
      {children}
    </Component>
  );
}
