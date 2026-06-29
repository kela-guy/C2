/**
 * Reports when a story section crosses a thin focal band near the vertical
 * centre of the viewport, so the sticky stage can swap to that section's demo.
 *
 * The `rootMargin` collapses the observer's root to a ~10% band at the middle
 * of the screen; with each section sized to fill the viewport this means
 * exactly one section is "active" at a time as you scroll.
 */

import { useEffect } from 'react';

export function useActiveSection(
  ref: React.RefObject<HTMLElement | null>,
  onActive: () => void,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) onActive();
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, onActive]);
}
