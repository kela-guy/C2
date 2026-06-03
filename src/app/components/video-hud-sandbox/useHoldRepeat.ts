import { useCallback, useEffect, useRef } from 'react';

export type HoldRepeatMultiplier = 1 | 10;

export interface HoldRepeatOptions {
  initialDelayMs?: number;
  startIntervalMs?: number;
  minIntervalMs?: number;
  decay?: number;
}

export interface HoldRepeatHandle {
  start: (multiplier: HoldRepeatMultiplier) => void;
  cancel: () => void;
}

export function useHoldRepeat(
  tick: (multiplier: HoldRepeatMultiplier) => void,
  opts?: HoldRepeatOptions,
): HoldRepeatHandle {
  const initialDelay = opts?.initialDelayMs ?? 300;
  const startInterval = opts?.startIntervalMs ?? 180;
  const minInterval = opts?.minIntervalMs ?? 60;
  const decay = opts?.decay ?? 0.82;

  const tickRef = useRef(tick);
  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const timeoutRef = useRef<number | null>(null);
  const multiplierRef = useRef<HoldRepeatMultiplier>(1);

  const cancel = useCallback(() => {
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const start = useCallback(
    (multiplier: HoldRepeatMultiplier) => {
      cancel();
      multiplierRef.current = multiplier;
      tickRef.current(multiplier);

      timeoutRef.current = window.setTimeout(() => {
        let interval = startInterval;
        const next = () => {
          tickRef.current(multiplierRef.current);
          interval = Math.max(minInterval, interval * decay);
          timeoutRef.current = window.setTimeout(next, interval);
        };
        timeoutRef.current = window.setTimeout(next, interval);
      }, initialDelay);
    },
    [cancel, initialDelay, startInterval, minInterval, decay],
  );

  useEffect(() => cancel, [cancel]);

  return { start, cancel };
}
