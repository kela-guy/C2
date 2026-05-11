/**
 * In-memory perf-event sink.
 *
 * Every perf observer / `measure()` call funnels into a single ring
 * buffer here. The HUD subscribes to drain it for live displays; the
 * trace exporter dumps it to a Chrome JSON trace file on demand.
 *
 * Why a ring buffer (not unbounded growth):
 *   - Operator console sessions can run for hours. An unbounded array
 *     leaks memory by design.
 *   - The HUD only ever shows the recent past. Older events without a
 *     trace export are lost on purpose.
 *
 * Why in-memory (not localStorage / IndexedDB):
 *   - Persistence across sessions isn't useful — perf changes when
 *     code changes. Yesterday's frame times don't apply today.
 *   - Avoids any storage-quota pathologies on long sessions.
 *
 * Capacity (~120k events) covers ~30 min at the realistic event-rate
 * we expect (LoAF ~10 Hz peak, frame metrics 1 Hz, sim marks ~10 Hz,
 * INP a few per minute). Older events drop off the front.
 */

/**
 * Common envelope. `t` is `performance.now()` ms relative to the
 * navigation timeOrigin so it's directly comparable to PerformanceEntry
 * timestamps without any wall-clock skew.
 */
export interface PerfEvent {
  /** Coarse channel for HUD filtering and Chrome-trace `cat`. */
  category:
    | 'frame'
    | 'sim'
    | 'react'
    | 'cesium'
    | 'webvitals'
    | 'longanimationframe'
    | 'event'
    | 'lcp'
    | 'cls'
    | 'paint'
    | 'navigation'
    | 'resource'
    | 'measure'
    | 'memory'
    | 'profile'
    | 'meta';
  /** Short name used in the HUD and as the Chrome-trace `name`. */
  name: string;
  /** Start time, ms since `performance.timeOrigin`. */
  t: number;
  /** Duration in ms; omitted for instant events. */
  dur?: number;
  /** Numeric value for counter / metric events (FPS, queue depth, …). */
  value?: number;
  /** Free-form structured payload, exported as Chrome trace `args`. */
  args?: Record<string, unknown>;
}

const CAPACITY = 120_000;

const buffer: (PerfEvent | undefined)[] = new Array(CAPACITY);
let writeIdx = 0;
let totalCount = 0;
const subscribers = new Set<() => void>();

export function recordEvent(event: PerfEvent): void {
  buffer[writeIdx] = event;
  writeIdx = (writeIdx + 1) % CAPACITY;
  totalCount++;
  // Notify subscribers asynchronously so the hot path stays cheap and
  // synchronous re-entrancy is impossible. `queueMicrotask` defers
  // until the current task finishes.
  if (subscribers.size > 0) queueMicrotask(notifySubscribers);
}

let pendingNotify = false;
function notifySubscribers(): void {
  if (pendingNotify) return;
  pendingNotify = true;
  // Coalesce — many recordEvent calls per task should fan out to one
  // notify per task.
  Promise.resolve().then(() => {
    pendingNotify = false;
    for (const fn of subscribers) {
      try {
        fn();
      } catch {
        // Subscriber errors must not poison the perf pipe.
      }
    }
  });
}

/** Subscribe to drain notifications. Returns an unsubscribe. */
export function subscribe(fn: () => void): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

/**
 * Snapshot the buffer in chronological order. Used by the HUD live
 * displays and by the trace exporter. Allocates — call on demand, not
 * per-event.
 */
export function snapshot(): PerfEvent[] {
  const out: PerfEvent[] = [];
  if (totalCount < CAPACITY) {
    for (let i = 0; i < writeIdx; i++) {
      const e = buffer[i];
      if (e) out.push(e);
    }
  } else {
    // Wrapped — start at writeIdx (oldest), wrap around.
    for (let n = 0; n < CAPACITY; n++) {
      const e = buffer[(writeIdx + n) % CAPACITY];
      if (e) out.push(e);
    }
  }
  return out;
}

/**
 * Return only the events from the last `windowMs`. Cheap-ish: walks
 * the buffer once, doesn't allocate intermediate arrays.
 */
export function snapshotRecent(windowMs: number): PerfEvent[] {
  const now = performance.now();
  const cutoff = now - windowMs;
  const all = snapshot();
  const out: PerfEvent[] = [];
  for (const e of all) {
    if (e.t >= cutoff) out.push(e);
  }
  return out;
}

/** Total events ever recorded (monotonic, unaffected by ring overwrites). */
export function getTotalCount(): number {
  return totalCount;
}

/** For tests / manual reset. */
export function clearSink(): void {
  buffer.fill(undefined);
  writeIdx = 0;
  totalCount = 0;
  notifySubscribers();
}
