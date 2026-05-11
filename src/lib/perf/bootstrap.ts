/**
 * `setupPerf()` — entry point dynamically imported by `main.tsx` in
 * dev. Wires up every always-on observer + the level-gated heavyweight
 * samplers. The whole `src/lib/perf` subtree only ever loads in dev,
 * so prod bundles stay clean.
 *
 * Order matters:
 *   1. Read flags first — bail early if `?perf=off`.
 *   2. Stand up the sink (passive — just a buffer).
 *   3. Register `PerformanceObserver`s with `buffered: true` so we
 *      don't lose the early entries (paint/LCP fire before this code).
 *   4. Hook `web-vitals` (which itself uses the same `buffered: true`
 *      observers; safe to coexist with ours).
 *   5. Start frame pacing.
 *   6. If `?perf=full`, attach the JS Self Profiler + memory sampler
 *      (Phase 3 modules — they import lazily on the first call).
 */

import { isPerfEnabled, isPerfFull, getPerfLevel } from './flags';
import { setupObservers } from './observers';
import { setupWebVitals } from './webVitals';
import { setupFramePacing } from './framePacing';
import { recordEvent } from './sink';

let booted = false;

export async function setupPerf(): Promise<void> {
  if (booted) return;
  if (!isPerfEnabled()) return;
  booted = true;

  recordEvent({
    category: 'meta',
    name: 'perf.boot',
    t: performance.now(),
    args: {
      level: getPerfLevel(),
      userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
      crossOriginIsolated: globalThis.crossOriginIsolated ?? false,
    },
  });

  setupObservers();
  setupWebVitals();
  setupFramePacing();

  if (isPerfFull()) {
    // These modules pull in slightly heavier code (e.g. Profiler
    // construction); only load when actually requested.
    const [{ setupJsSelfProfiler }, { setupMemorySampler }] = await Promise.all([
      import('./jsSelfProfiler'),
      import('./memorySampler'),
    ]);
    setupJsSelfProfiler();
    setupMemorySampler();
  }
}
