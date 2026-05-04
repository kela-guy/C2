/**
 * React `<Profiler>` aggregator. The HUD wraps top-level panels in a
 * lightweight `<PerfProfiled id="...">` (defined in `PerfProfiled.tsx`)
 * which forwards all React Profiler `onRender` callbacks here.
 *
 * What we keep per id:
 *   - `count`: total render count this session
 *   - `lastDuration`: last actual commit duration (ms)
 *   - `lastBaseDuration`: last base duration without memoization (ms)
 *   - `lastPhase`: 'mount' | 'update' | 'nested-update'
 *
 * Every render also pushes a `react.<id>` event into the central sink
 * so the Chrome trace export shows per-component render bars on the
 * timeline. Without that, you have to switch between the HUD and a
 * separate React DevTools profiler — far more friction.
 *
 * In production this module's `recordRender` short-circuits; only the
 * map allocation survives, but `<Profiler>` itself is a development-
 * only React feature when used outside of a profiling-enabled build.
 */

import { recordEvent } from './sink';

interface RenderEntry {
  count: number;
  lastDuration: number;
  lastBaseDuration: number;
  lastPhase: 'mount' | 'update' | 'nested-update';
  totalDuration: number;
}

const counts = new Map<string, RenderEntry>();
const subscribers = new Set<() => void>();
const PERF_ENABLED = import.meta.env.DEV;

let pendingNotify = false;
function scheduleNotify(): void {
  if (pendingNotify) return;
  pendingNotify = true;
  // Coalesce — many renders per task should fan out to one notify.
  queueMicrotask(() => {
    pendingNotify = false;
    for (const fn of subscribers) {
      try {
        fn();
      } catch {
        /* swallowed — subscribers must not crash the profiler */
      }
    }
  });
}

export function recordRender(
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
): void {
  if (!PERF_ENABLED) return;
  const existing = counts.get(id);
  if (existing) {
    existing.count++;
    existing.lastDuration = actualDuration;
    existing.lastBaseDuration = baseDuration;
    existing.lastPhase = phase;
    existing.totalDuration += actualDuration;
  } else {
    counts.set(id, {
      count: 1,
      lastDuration: actualDuration,
      lastBaseDuration: baseDuration,
      lastPhase: phase,
      totalDuration: actualDuration,
    });
  }
  recordEvent({
    category: 'react',
    name: id,
    t: startTime,
    dur: actualDuration,
    args: { phase, baseDuration },
  });
  scheduleNotify();
}

export function getRenderCounts(): Record<string, RenderEntry> {
  return Object.fromEntries(counts);
}

export function subscribeRenderCounts(fn: () => void): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function clearRenderCounts(): void {
  counts.clear();
  scheduleNotify();
}
