/**
 * Bdi — wrapper around the native `<bdi>` (Bidirectional Isolate) element.
 *
 * `<bdi>` tells the browser's bidi algorithm to treat its content as a
 * standalone bidi context, isolated from surrounding text. The two cases
 * we hit constantly:
 *
 *   1. **User-supplied strings inside chrome.** Callsigns like
 *      `"BlackBerry-12 דרום"` or `"Patrol-3 (חוף)"` mix Latin + Hebrew.
 *      Without isolation, the browser's bidi algorithm can re-order
 *      neighbouring punctuation/whitespace based on the *first strong
 *      character* of the user string, so a parenthesis or comma sitting
 *      next to the callsign can jump to the wrong side. Wrapping the
 *      string in `<Bdi>` pins it to its own context.
 *
 *   2. **Numeric data inside RTL prose.** Coordinates, frequencies,
 *      timestamps — these read LTR even in Hebrew copy. `<Bdi>` keeps
 *      them as one inline atom rather than letting RTL prose reorder
 *      individual digits or units.
 *
 * Default `dir="auto"` lets the browser pick the strongest character's
 * direction, which is what we want >95% of the time. Override with
 * `dir="ltr"` for content that's *always* LTR regardless of glyphs
 * (e.g. an English-only callsign that you don't want to flip even when
 * embedded in RTL prose).
 */

import type { ReactNode } from 'react';

interface BdiProps {
  children: ReactNode;
  /** Forced direction for the isolated text. `'auto'` (default) lets the browser detect; `'ltr'`/`'rtl'` pin it. */
  dir?: 'auto' | 'ltr' | 'rtl';
  className?: string;
}

export function Bdi({ children, dir = 'auto', className }: BdiProps) {
  return (
    <bdi dir={dir} className={className}>
      {children}
    </bdi>
  );
}
