/**
 * useScrollEdges — observe a scroll container and report which edges still
 * have more content beyond the fold.
 *
 * Part of the scrolling-list edge-cue system
 * (https://www.fluidfunctionalism.com/docs/scrolling-list): a clipped list
 * looks finished, and since macOS hides scrollbars until you scroll, users
 * never realize there is more below. This hook drives the gradient + chevron
 * affordance (`ScrollEdgeCue`) that signals overflow on each edge.
 *
 * Tracks scroll position, container resizes, and content changes (rAF-batched)
 * so the cues stay correct as rows stream in or the viewport resizes. Callers
 * whose scroller mounts late (portals, virtualized lists) fold that into
 * `enabled` so the hook re-attaches once the element exists.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';

export type ScrollAxis = 'vertical' | 'horizontal' | 'both';

export interface ScrollEdges {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}

export interface UseScrollEdgesOptions {
  /** The scroll container to observe. */
  ref: RefObject<HTMLElement | null>;
  /** Which axes to measure. Default `vertical`. */
  axis?: ScrollAxis;
  /**
   * Attach/detach tracking. Pass `false` while the scroller is absent (late
   * portal mounts) so the hook re-attaches once it exists. Default `true`.
   */
  enabled?: boolean;
}

const NONE: ScrollEdges = { top: false, bottom: false, left: false, right: false };

/** Sub-pixel tolerance so a fully-scrolled edge reads as "no more content". */
const THRESHOLD = 1;

export function useScrollEdges({
  ref,
  axis = 'vertical',
  enabled = true,
}: UseScrollEdgesOptions): ScrollEdges {
  const [edges, setEdges] = useState<ScrollEdges>(NONE);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setEdges(NONE);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      frame.current = null;
      const {
        scrollTop,
        scrollHeight,
        clientHeight,
        scrollLeft,
        scrollWidth,
        clientWidth,
      } = el;
      const wantV = axis === 'vertical' || axis === 'both';
      const wantH = axis === 'horizontal' || axis === 'both';
      // RTL containers report a negative or right-anchored scrollLeft; the
      // absolute value is the distance scrolled from the inline-start edge.
      const absLeft = Math.abs(scrollLeft);
      const maxLeft = scrollWidth - clientWidth;
      setEdges({
        top: wantV && scrollTop > THRESHOLD,
        bottom: wantV && scrollTop < scrollHeight - clientHeight - THRESHOLD,
        left: wantH && absLeft > THRESHOLD,
        right: wantH && absLeft < maxLeft - THRESHOLD,
      });
    };

    const schedule = () => {
      if (frame.current != null) return;
      frame.current = requestAnimationFrame(measure);
    };

    measure();
    el.addEventListener('scroll', schedule, { passive: true });

    const ro = new ResizeObserver(schedule);
    ro.observe(el);

    // Content changes (rows streaming in, expand/collapse) shift the edges
    // without a scroll or resize event — watch the subtree.
    const mo = new MutationObserver(schedule);
    mo.observe(el, { childList: true, subtree: true, characterData: true });

    return () => {
      el.removeEventListener('scroll', schedule);
      ro.disconnect();
      mo.disconnect();
      if (frame.current != null) cancelAnimationFrame(frame.current);
    };
  }, [ref, axis, enabled]);

  return edges;
}
