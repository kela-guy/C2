/**
 * Battery of `PerformanceObserver`s. Every browser-emitted entry that
 * tells us something about user-perceived latency or main-thread cost
 * gets normalized and dropped into the in-memory sink.
 *
 * Each observer is registered with `buffered: true` so we capture
 * entries that fired before the observer was registered (matters for
 * paint/navigation/LCP, which often happen during the first commit
 * before our setup has run).
 *
 * Why we deliberately use `long-animation-frame` and NOT `longtask`:
 *   - LoAF is strictly more useful in Chromium 123+. It aggregates
 *     sub-50 ms tasks within a frame and includes per-script
 *     attribution (`scripts[]` with invoker, sourceURL,
 *     sourceFunctionName, duration, forcedStyleAndLayoutDuration).
 *   - We're a Chromium-only target so falling back to `longtask` for
 *     non-Chromium browsers isn't worth the extra observer.
 *
 * All registrations are idempotent — `setupObservers()` no-ops on
 * second call. Returns an unsubscribe that disconnects every observer.
 */

import { recordEvent } from './sink';

interface LoAFScript {
  invoker?: string;
  invokerType?: string;
  sourceURL?: string;
  sourceFunctionName?: string;
  duration?: number;
  forcedStyleAndLayoutDuration?: number;
  windowAttribution?: string;
}

interface LoAFEntry extends PerformanceEntry {
  blockingDuration?: number;
  renderStart?: number;
  styleAndLayoutStart?: number;
  firstUIEventTimestamp?: number;
  scripts?: LoAFScript[];
}

interface EventTimingEntry extends PerformanceEntry {
  interactionId?: number;
  processingStart?: number;
  processingEnd?: number;
  cancelable?: boolean;
  target?: Element | null;
}

interface LayoutShiftEntry extends PerformanceEntry {
  value?: number;
  hadRecentInput?: boolean;
  sources?: Array<{ node?: Node | null; previousRect?: DOMRectReadOnly; currentRect?: DOMRectReadOnly }>;
}

interface LcpEntry extends PerformanceEntry {
  size?: number;
  element?: Element | null;
  url?: string;
  loadTime?: number;
  renderTime?: number;
}

let registered = false;
let observers: PerformanceObserver[] = [];

function safeObserve(type: string, options: PerformanceObserverInit, fn: PerformanceObserverCallback): void {
  try {
    const obs = new PerformanceObserver(fn);
    obs.observe({ type, ...options });
    observers.push(obs);
  } catch {
    // Type unsupported in this browser — skip silently. We don't want
    // a perf observer to crash the app on a partially-supported UA.
  }
}

export function setupObservers(): () => void {
  if (registered) return teardownObservers;
  registered = true;

  // ── Long Animation Frames (Chromium 123+) ───────────────────────────
  safeObserve('long-animation-frame', { buffered: true }, (list) => {
    for (const entry of list.getEntries() as LoAFEntry[]) {
      // Compress the scripts[] array to top-3 by duration. Full LoAF
      // entries can have a dozen scripts; the top contributors are
      // what matters for HUD display, and the full payload is still
      // available in the original PerformanceEntry if needed via
      // `performance.getEntriesByType('long-animation-frame')`.
      const scripts = (entry.scripts ?? [])
        .slice()
        .sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0))
        .slice(0, 3)
        .map((s) => ({
          invoker: s.invoker,
          sourceURL: s.sourceURL,
          sourceFunctionName: s.sourceFunctionName,
          duration: s.duration,
          forcedStyleAndLayoutDuration: s.forcedStyleAndLayoutDuration,
        }));
      recordEvent({
        category: 'longanimationframe',
        name: 'LoAF',
        t: entry.startTime,
        dur: entry.duration,
        args: {
          blockingDuration: entry.blockingDuration,
          renderStart: entry.renderStart,
          styleAndLayoutStart: entry.styleAndLayoutStart,
          firstUIEventTimestamp: entry.firstUIEventTimestamp,
          scripts,
        },
      });
    }
  });

  // ── Event Timing (foundation of INP) ────────────────────────────────
  safeObserve('event', { buffered: true, durationThreshold: 16 } as PerformanceObserverInit, (list) => {
    for (const entry of list.getEntries() as EventTimingEntry[]) {
      // Skip events without an interactionId — they're non-interactive
      // (e.g. mousemove without a real "click → response" semantic).
      // INP is calculated only from interactionId-bearing events.
      if (!entry.interactionId) continue;
      recordEvent({
        category: 'event',
        name: entry.name,
        t: entry.startTime,
        dur: entry.duration,
        args: {
          interactionId: entry.interactionId,
          processingStart: entry.processingStart,
          processingEnd: entry.processingEnd,
          cancelable: entry.cancelable,
          targetTag: entry.target?.tagName,
          targetId: (entry.target as HTMLElement | null)?.id || undefined,
        },
      });
    }
  });

  // ── Largest Contentful Paint ────────────────────────────────────────
  safeObserve('largest-contentful-paint', { buffered: true }, (list) => {
    // LCP fires multiple times as the candidate is upgraded. Each
    // entry is the new candidate at that moment.
    for (const entry of list.getEntries() as LcpEntry[]) {
      recordEvent({
        category: 'lcp',
        name: 'LCP',
        t: entry.startTime,
        value: entry.startTime,
        args: {
          size: entry.size,
          url: entry.url,
          element: entry.element?.tagName,
          loadTime: entry.loadTime,
          renderTime: entry.renderTime,
        },
      });
    }
  });

  // ── Cumulative Layout Shift sources ─────────────────────────────────
  safeObserve('layout-shift', { buffered: true }, (list) => {
    for (const entry of list.getEntries() as LayoutShiftEntry[]) {
      // Only count non-input-related shifts (CLS spec). Input-driven
      // shifts (within 500 ms of input) are user-initiated and don't
      // count toward CLS.
      if (entry.hadRecentInput) continue;
      recordEvent({
        category: 'cls',
        name: 'shift',
        t: entry.startTime,
        value: entry.value,
        args: {
          sources: entry.sources?.length,
        },
      });
    }
  });

  // ── Paint timing (FP, FCP) ──────────────────────────────────────────
  safeObserve('paint', { buffered: true }, (list) => {
    for (const entry of list.getEntries()) {
      recordEvent({
        category: 'paint',
        name: entry.name,
        t: entry.startTime,
        value: entry.startTime,
      });
    }
  });

  // ── Navigation Timing v2 ────────────────────────────────────────────
  safeObserve('navigation', { buffered: true }, (list) => {
    for (const entry of list.getEntries() as PerformanceNavigationTiming[]) {
      recordEvent({
        category: 'navigation',
        name: 'navigation',
        t: entry.startTime,
        dur: entry.duration,
        args: {
          type: entry.type,
          domContentLoadedEventEnd: entry.domContentLoadedEventEnd,
          loadEventEnd: entry.loadEventEnd,
          transferSize: entry.transferSize,
          encodedBodySize: entry.encodedBodySize,
          decodedBodySize: entry.decodedBodySize,
        },
      });
    }
  });

  // ── Resource Timing ─────────────────────────────────────────────────
  safeObserve('resource', { buffered: true }, (list) => {
    for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
      recordEvent({
        category: 'resource',
        name: entry.name.split('/').pop() || entry.name,
        t: entry.startTime,
        dur: entry.duration,
        args: {
          initiatorType: entry.initiatorType,
          transferSize: entry.transferSize,
          encodedBodySize: entry.encodedBodySize,
          decodedBodySize: entry.decodedBodySize,
          url: entry.name,
        },
      });
    }
  });
  return teardownObservers;
}

function teardownObservers(): void {
  for (const o of observers) {
    try {
      o.disconnect();
    } catch {
      /* swallowed */
    }
  }
  observers = [];
  registered = false;
}
