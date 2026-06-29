/**
 * Per-frame reading focus — the heartbeat of the reference page.
 *
 * Every `[data-prose]` block's opacity is interpolated from its distance to a
 * focal scroll line (~42% down the viewport): blocks at the focal line are fully
 * lit, blocks above/below fade toward `min`. Driven by a `requestAnimationFrame`
 * scroll loop (no CSS transition — verified the reference uses
 * `transition-duration: 0s` and updates opacity directly each frame), so the
 * dimming tracks the scroll position smoothly and continuously.
 *
 * Respects `prefers-reduced-motion`: when set, every block stays fully lit.
 */

import { useEffect } from 'react';

interface ScrollOpacityOptions {
  /** Focal line as a fraction of viewport height. */
  focal?: number;
  /** Distance (px) from the focal line that stays fully lit. */
  full?: number;
  /** Falloff distance (px) over which opacity ramps from 1 to `min`. */
  range?: number;
  /** Minimum opacity for far-away blocks. */
  min?: number;
}

export function useScrollOpacity(
  containerRef: React.RefObject<HTMLElement | null>,
  opts: ScrollOpacityOptions = {},
) {
  const { focal = 0.42, full = 120, range = 360, min = 0.2 } = opts;

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;

    const apply = () => {
      raf = 0;
      const blocks = root.querySelectorAll<HTMLElement>('[data-prose]');
      if (reduce) {
        blocks.forEach((el) => (el.style.opacity = '1'));
        return;
      }
      const focalY = window.innerHeight * focal;
      blocks.forEach((el) => {
        const r = el.getBoundingClientRect();
        const center = r.top + r.height / 2;
        const d = Math.abs(center - focalY);
        const o = d <= full ? 1 : Math.max(min, 1 - (d - full) / range);
        el.style.opacity = o.toFixed(3);
      });
    };

    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [containerRef, focal, full, range, min]);
}
