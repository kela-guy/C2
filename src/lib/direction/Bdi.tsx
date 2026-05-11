/**
 * `<Bdi>` — bidirectional isolation for inline mixed-script content.
 *
 * Use this any time a Latin (or LTR-leaning) token appears inline
 * inside a Hebrew (RTL) sentence:
 *
 *   <p>קוד היחידה: <Bdi>ALPHA-7</Bdi> דווח תקין.</p>
 *   <p>תדר עדכני: <Bdi>915.250 MHz</Bdi></p>
 *   <p>קואורדינטות: <Bdi>32.0853° N, 34.7818° E</Bdi></p>
 *
 * Without isolation the surrounding RTL paragraph reorders the
 * token's neutral characters (commas, periods, hyphens, the `°`
 * symbol) in subtle, hard-to-spot ways — coords print as
 * `32.0853°N E 34.7818°,` which is *technically* the same characters
 * but useless to operators. The browser's BiDi algorithm is doing
 * exactly what the spec says; the fix is to mark the token as a
 * separate paragraph using the `<bdi>` element + `unicode-bidi:
 * isolate`.
 *
 * Two opt-in props:
 *  - `direction` forces a specific embedding direction. Most callers
 *    should leave this `'auto'`, which lets the browser detect each
 *    token's strong character. Set `'ltr'` when you know the token is
 *    Latin (callsign, frequency, hex code).
 *  - `as` swaps the rendered element. Defaults to `<bdi>`. Pass
 *    `'span'` if you need a class-named hook for styling — but bear
 *    in mind that a plain `<span>` on its own does NOT isolate; we
 *    add `unicode-bidi: isolate` inline so the behavior is the same.
 *
 * Why not use `<bdo>` (override)?
 *  `<bdo>` *forces* a direction and is mostly useful for displaying
 *  intentionally-mirrored text (e.g. teaching material). For runtime
 *  product UI we want isolation, not override — `<bdi>` is the right
 *  tag.
 */

import type { ElementType, ReactNode } from 'react';

export interface BdiProps {
  /** Inline content to isolate. */
  children: ReactNode;
  /**
   * Embedding direction for the isolated chunk.
   *  - `'auto'` (default): browser infers from the first strong
   *    character. Best for unknown / dynamic content.
   *  - `'ltr'`: forces Latin-side embedding. Use for callsigns,
   *    frequencies, hex IDs, MGRS, lat/long.
   *  - `'rtl'`: forces RTL embedding. Rare in this app — most strings
   *    that need isolation are LTR tokens inside RTL sentences.
   */
  direction?: 'auto' | 'ltr' | 'rtl';
  /**
   * Element to render. Defaults to `<bdi>`, which carries `unicode-bidi:
   * isolate` semantics by default. Pass `'span'` if you need a styled
   * wrapper — we add `unicode-bidi: isolate` inline so the isolation
   * still applies.
   */
  as?: ElementType;
  /** Optional class names. */
  className?: string;
}

export function Bdi({ children, direction = 'auto', as: Component = 'bdi', className }: BdiProps) {
  // For non-`<bdi>` elements we have to add `unicode-bidi: isolate`
  // explicitly — only `<bdi>` carries it via the user agent stylesheet.
  const style = Component === 'bdi' ? undefined : { unicodeBidi: 'isolate' as const };

  return (
    <Component dir={direction} className={className} style={style}>
      {children}
    </Component>
  );
}
