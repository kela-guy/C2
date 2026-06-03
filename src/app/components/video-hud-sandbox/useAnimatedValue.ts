import { useEffect, useRef, useState } from 'react';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function shortestDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

function normalize(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Eases a value toward `target` with an exponential approach (time
 * constant `tau`, seconds). `wrap` treats the value as an angle and
 * follows the shortest path across the 0/360 seam. Snaps instantly when
 * the user prefers reduced motion.
 */
function useEased(target: number, wrap: boolean, tau: number): number {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      valueRef.current = target;
      setValue(target);
      return;
    }

    const loop = (now: number) => {
      const last = lastRef.current;
      lastRef.current = now;
      const dt = last == null ? 0 : Math.min((now - last) / 1000, 0.1);
      const delta = wrap
        ? shortestDelta(valueRef.current, target)
        : target - valueRef.current;

      if (Math.abs(delta) < 0.05) {
        valueRef.current = wrap ? normalize(target) : target;
        setValue(valueRef.current);
        rafRef.current = null;
        lastRef.current = null;
        return;
      }

      const k = 1 - Math.exp(-dt / tau);
      const next = valueRef.current + delta * k;
      valueRef.current = wrap ? normalize(next) : next;
      setValue(valueRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
    };
  }, [target, wrap, tau]);

  return value;
}

export function useAnimatedAngle(target: number, tau = 0.22): number {
  return useEased(target, true, tau);
}

export function useAnimatedValue(target: number, tau = 0.22): number {
  return useEased(target, false, tau);
}

export { shortestDelta };
