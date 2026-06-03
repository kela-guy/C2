/**
 * Eases a binary "is the camera moving" signal into a continuous
 * 0..1 bloom value for `CenterCrosshair`. Fast rise, slower decay —
 * the FPS-game spring-back feel where the reticle pops open and then
 * eases back to rest.
 *
 * Owns its own `requestAnimationFrame` loop. The loop only runs while
 * the value is in flight; once it reaches the target (and the target
 * is `0`) the rAF is cancelled and the component re-renders stop.
 *
 * `prefers-reduced-motion: reduce` → snap to target, no rAF.
 */

import { useEffect, useRef, useState } from 'react';

interface UseCrosshairBloomOptions {
  /** Time constant (ms) for opening. Lower = snappier. */
  riseMs?: number;
  /** Time constant (ms) for closing. Higher = longer spring-back. */
  decayMs?: number;
}

const DEFAULT_RISE_MS = 60;
const DEFAULT_DECAY_MS = 220;
const EPSILON = 0.001;

export function useCrosshairBloom(
  isMoving: boolean,
  opts: UseCrosshairBloomOptions = {},
): number {
  const { riseMs = DEFAULT_RISE_MS, decayMs = DEFAULT_DECAY_MS } = opts;
  const [bloom, setBloom] = useState(0);
  const valueRef = useRef(0);
  const targetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const target = isMoving ? 1 : 0;
    targetRef.current = target;

    if (reduceMotion) {
      valueRef.current = target;
      setBloom(target);
      return;
    }

    const tick = (ts: number) => {
      const last = lastTsRef.current ?? ts;
      const dt = Math.max(0, ts - last);
      lastTsRef.current = ts;

      const t = targetRef.current;
      const v = valueRef.current;
      const tau = t > v ? riseMs : decayMs;
      // Exponential approach — frame-rate-independent, same feel at 60 / 120 Hz.
      const alpha = 1 - Math.exp(-dt / tau);
      const next = v + (t - v) * alpha;
      const settled = Math.abs(next - t) < EPSILON;
      const final = settled ? t : next;

      valueRef.current = final;
      setBloom(final);

      if (settled) {
        rafRef.current = null;
        lastTsRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTsRef.current = null;
    };
  }, [isMoving, riseMs, decayMs]);

  return bloom;
}
