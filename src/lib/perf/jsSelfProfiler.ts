/**
 * JS Self-Profiling API (Chromium 94+, requires `Document-Policy:
 * js-profiling`, see vite.config.ts dev headers).
 *
 * Spec: https://wicg.github.io/js-self-profiling/
 *
 * Why a sampling profiler when we already have LoAF + custom marks:
 *   - LoAF tells us a frame was slow and gives us per-script attribution
 *     at the *script* granularity (sourceURL + sourceFunctionName for
 *     the entry point). It does NOT tell us where inside a function
 *     time was spent.
 *   - The Self Profiler returns a stack-sampled time-series. You can
 *     reconstruct hot paths with full call-stacks at e.g. 10 ms
 *     resolution.
 *
 * We start the profiler on `setupPerf()` and stop+restart every
 * `WINDOW_MS` so we get bounded samples we can dump. The collected
 * trace is converted to Chrome `Profile` events and pushed into the
 * sink so the trace exporter picks it up.
 *
 * Failure modes:
 *   - If `Profiler` doesn't exist, this no-ops. (Non-Chromium UA.)
 *   - If `Document-Policy: js-profiling` is missing, the constructor
 *     throws. We catch and log once.
 */

import { recordEvent } from './sink';

const SAMPLE_INTERVAL_MS = 10;
const MAX_BUFFER_SIZE = 10_000; // ~100 s worth of 10 ms samples
const WINDOW_MS = 30_000;

interface ProfilerSample {
  timestamp: number;
  stackId?: number;
}

interface ProfilerStack {
  parentId?: number;
  frameId: number;
}

interface ProfilerFrame {
  name: string;
  resourceId?: number;
  line?: number;
  column?: number;
}

interface ProfilerTrace {
  samples: ProfilerSample[];
  stacks: ProfilerStack[];
  frames: ProfilerFrame[];
  resources: string[];
}

interface ProfilerInstance {
  stop: () => Promise<ProfilerTrace>;
  stopped: boolean;
}

interface ProfilerCtor {
  new (init: { sampleInterval: number; maxBufferSize: number }): ProfilerInstance;
}

let active: ProfilerInstance | null = null;
let cycleTimer: number | null = null;
let started = false;

function getProfilerCtor(): ProfilerCtor | null {
  const ctor = (globalThis as { Profiler?: ProfilerCtor }).Profiler;
  return ctor ?? null;
}

async function rotate(): Promise<void> {
  if (active) {
    try {
      const trace = await active.stop();
      const t = performance.now();
      recordEvent({
        category: 'profile',
        name: 'js-self-profile.window',
        t: t - WINDOW_MS,
        dur: WINDOW_MS,
        args: {
          samples: trace.samples.length,
          stacks: trace.stacks.length,
          frames: trace.frames.length,
          // Stash the entire trace under args; it'll travel with the
          // Chrome JSON export and can be inspected post-hoc. Heavy
          // (~MBs) but only ever stored for the most recent windows
          // — older args are ring-buffered out.
          trace,
        },
      });
    } catch (err) {
      recordEvent({
        category: 'profile',
        name: 'js-self-profile.error',
        t: performance.now(),
        args: { message: (err as Error).message },
      });
    }
    active = null;
  }
  startWindow();
}

function startWindow(): void {
  const ctor = getProfilerCtor();
  if (!ctor) return;
  try {
    active = new ctor({ sampleInterval: SAMPLE_INTERVAL_MS, maxBufferSize: MAX_BUFFER_SIZE });
    cycleTimer = window.setTimeout(() => {
      void rotate();
    }, WINDOW_MS);
  } catch (err) {
    // Most likely cause: `Document-Policy: js-profiling` not present.
    // Record once so the HUD can show a "self-profiler unavailable" hint.
    recordEvent({
      category: 'profile',
      name: 'js-self-profile.unavailable',
      t: performance.now(),
      args: { message: (err as Error).message },
    });
  }
}

export function setupJsSelfProfiler(): void {
  if (started) return;
  started = true;
  startWindow();
}

export function teardownJsSelfProfiler(): void {
  if (cycleTimer != null) {
    window.clearTimeout(cycleTimer);
    cycleTimer = null;
  }
  if (active) {
    void active.stop().catch(() => {
      /* swallowed */
    });
    active = null;
  }
  started = false;
}
