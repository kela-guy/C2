/**
 * `performance.measureUserAgentSpecificMemory()` periodic sampler.
 *
 * Spec: https://w3c.github.io/performance-measure-memory/
 * Requires cross-origin isolation (COOP+COEP — set in vite.config.ts
 * dev headers).
 *
 * Why bother instead of `performance.memory`:
 *   - `performance.memory` is non-standard, Chrome-only, and reports
 *     V8 heap only. It misses DOM, Workers, and shared memory.
 *   - `measureUserAgentSpecificMemory` is the standardized successor
 *     and reports total *agent* memory broken down by URL + type
 *     (JavaScript, DOM, Shared, etc.).
 *   - Critical for Cesium debugging because Cesium allocates via
 *     ArrayBuffers (terrain tiles, vertex data) that show up in
 *     `Other` and `JavaScript` categories with different shapes.
 *
 * The API itself returns a Promise that resolves on the *next* GC
 * cycle (it's intentionally async + non-deterministic to prevent
 * cross-origin info leakage). So we sample every 30 s; more frequent
 * sampling would just queue up.
 */

import { recordEvent } from './sink';

const SAMPLE_INTERVAL_MS = 30_000;

interface MeasureMemoryBreakdown {
  bytes: number;
  attribution?: Array<{ url?: string; scope?: string }>;
  types?: string[];
}

interface MeasureMemoryResult {
  bytes: number;
  breakdown?: MeasureMemoryBreakdown[];
}

interface PerformanceWithMemory extends Performance {
  measureUserAgentSpecificMemory?: () => Promise<MeasureMemoryResult>;
}

let timerId: number | null = null;
let started = false;

async function sampleOnce(): Promise<void> {
  const perf = performance as PerformanceWithMemory;
  if (!perf.measureUserAgentSpecificMemory) {
    recordEvent({
      category: 'memory',
      name: 'memory.unavailable',
      t: performance.now(),
      args: {
        reason: globalThis.crossOriginIsolated
          ? 'API missing on this UA'
          : 'not cross-origin isolated; need COOP+COEP',
      },
    });
    return;
  }
  try {
    const result = await perf.measureUserAgentSpecificMemory();
    // Compress breakdown to per-type totals so the HUD has a small,
    // stable schema to graph. Full breakdown is preserved under args
    // for the trace export.
    const byType = new Map<string, number>();
    for (const b of result.breakdown ?? []) {
      const key = (b.types ?? []).join('+') || 'unknown';
      byType.set(key, (byType.get(key) ?? 0) + b.bytes);
    }
    recordEvent({
      category: 'memory',
      name: 'memory.total',
      t: performance.now(),
      value: result.bytes,
      args: {
        bytes: result.bytes,
        byType: Object.fromEntries(byType),
        breakdown: result.breakdown,
      },
    });
  } catch (err) {
    recordEvent({
      category: 'memory',
      name: 'memory.error',
      t: performance.now(),
      args: { message: (err as Error).message },
    });
  }
}

export function setupMemorySampler(): void {
  if (started) return;
  started = true;
  // Fire once after a small delay so we don't compete with hydration.
  window.setTimeout(() => {
    void sampleOnce();
  }, 5_000);
  timerId = window.setInterval(() => {
    void sampleOnce();
  }, SAMPLE_INTERVAL_MS);
}

export function teardownMemorySampler(): void {
  if (timerId != null) {
    window.clearInterval(timerId);
    timerId = null;
  }
  started = false;
}
