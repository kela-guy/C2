/**
 * `measure(track, name, fn, properties?)` — instrument a synchronous or
 * async function with a User Timing measurement that ALSO renders as a
 * custom track in Chrome DevTools' Performance panel via the
 * `detail.devtools` extensibility payload (Chromium 129+).
 *
 * One-time investment, lifetime payoff:
 *   - Live in DevTools: the call appears on its named track with the
 *     chosen color, properties as a structured tooltip, and a tooltip
 *     text. No extension required.
 *   - Captured in saved traces: drag-drop a saved trace and the same
 *     tracks appear.
 *   - Mirrored to our in-memory sink so the in-app HUD + Chrome JSON
 *     trace exporter can consume the same data.
 *
 * All marks/measures use unique label names (suffixed with a counter +
 * `performance.now()`) so they don't collide in `performance.getEntries`
 * and so DevTools doesn't merge separate calls into one entry.
 */

import { recordEvent, type PerfEvent } from './sink';

/**
 * Hard kill-switch for production. `measure.ts` is the only perf
 * module imported by app code (Dashboard.tsx wraps sim ticks with
 * `measure()`), so without this gate we'd be calling
 * `performance.mark/measure` and pushing into the sink buffer in every
 * production session. The constant inlines at build time and the
 * tree-shaker drops the rest.
 */
const PERF_ENABLED = import.meta.env.DEV;

/**
 * Custom DevTools tracks we emit on. Names match the HUD's category
 * tabs so the developer sees the same labels in DevTools and in the HUD.
 */
export type PerfTrack = 'Sim' | 'Cesium' | 'React' | 'Network' | 'App';

const TRACK_GROUP = 'C2 Hub';

/** DevTools accepts a small palette of named colors for `properties.color`. */
type DevtoolsColor =
  | 'primary'
  | 'primary-light'
  | 'primary-dark'
  | 'secondary'
  | 'secondary-light'
  | 'secondary-dark'
  | 'tertiary'
  | 'tertiary-light'
  | 'tertiary-dark'
  | 'error';

const TRACK_COLORS: Record<PerfTrack, DevtoolsColor> = {
  Sim: 'primary',
  Cesium: 'secondary',
  React: 'tertiary',
  Network: 'tertiary-light',
  App: 'primary-dark',
};

const CATEGORY_FROM_TRACK: Record<PerfTrack, PerfEvent['category']> = {
  Sim: 'sim',
  Cesium: 'cesium',
  React: 'react',
  Network: 'resource',
  App: 'measure',
};

let labelCounter = 0;
function uniqueLabel(name: string): string {
  // Suffix guarantees uniqueness across rapid calls; DevTools dedups
  // entries by label so without this you'd get one merged bar per
  // tick instead of one bar per call.
  labelCounter = (labelCounter + 1) | 0;
  return `${name}#${labelCounter}`;
}

interface MeasureOptions {
  /** Override the default color for this entry. */
  color?: DevtoolsColor;
  /** Tooltip text rendered when hovering the bar in DevTools. */
  tooltip?: string;
  /** Structured key/value pairs shown in the DevTools details pane + Chrome trace `args`. */
  properties?: Record<string, string | number | boolean | undefined | null>;
}

function buildDevtoolsDetail(
  track: PerfTrack,
  options: MeasureOptions | undefined,
): unknown {
  const color = options?.color ?? TRACK_COLORS[track];
  // Properties are rendered as `[key, value]` tuples; values must be strings.
  const properties: Array<[string, string]> = [];
  if (options?.properties) {
    for (const [k, v] of Object.entries(options.properties)) {
      if (v == null) continue;
      properties.push([k, String(v)]);
    }
  }
  return {
    devtools: {
      dataType: 'track-entry',
      track,
      trackGroup: TRACK_GROUP,
      color,
      properties: properties.length > 0 ? properties : undefined,
      tooltipText: options?.tooltip,
    },
  };
}

/**
 * Wrap a synchronous function. Records duration in DevTools custom
 * track + our sink. Returns the function's return value transparently.
 */
export function measure<T>(
  track: PerfTrack,
  name: string,
  fn: () => T,
  options?: MeasureOptions,
): T {
  if (!PERF_ENABLED) return fn();
  const label = uniqueLabel(name);
  const startMark = `${label}:s`;
  performance.mark(startMark);
  const t = performance.now();
  let result: T;
  try {
    result = fn();
  } finally {
    const dur = performance.now() - t;
    try {
      performance.measure(label, {
        start: startMark,
        end: performance.now(),
        detail: buildDevtoolsDetail(track, options),
      });
    } catch {
      // measure() can throw on unsupported `detail` shapes in older
      // Chromium; fall back to a plain measure.
      try {
        performance.measure(label, startMark);
      } catch {
        // Give up — the sink record below still happens.
      }
    }
    performance.clearMarks(startMark);
    recordEvent({
      category: CATEGORY_FROM_TRACK[track],
      name,
      t,
      dur,
      args: options?.properties as Record<string, unknown> | undefined,
    });
  }
  return result;
}

/** Async variant. Awaits the promise; everything else is identical. */
export async function measureAsync<T>(
  track: PerfTrack,
  name: string,
  fn: () => Promise<T>,
  options?: MeasureOptions,
): Promise<T> {
  if (!PERF_ENABLED) return fn();
  const label = uniqueLabel(name);
  const startMark = `${label}:s`;
  performance.mark(startMark);
  const t = performance.now();
  try {
    return await fn();
  } finally {
    const dur = performance.now() - t;
    try {
      performance.measure(label, {
        start: startMark,
        end: performance.now(),
        detail: buildDevtoolsDetail(track, options),
      });
    } catch {
      try {
        performance.measure(label, startMark);
      } catch {
        /* swallowed — the sink record below still happens */
      }
    }
    performance.clearMarks(startMark);
    recordEvent({
      category: CATEGORY_FROM_TRACK[track],
      name,
      t,
      dur,
      args: options?.properties as Record<string, unknown> | undefined,
    });
  }
}

/**
 * Instant marker (zero duration). Use for "interesting moments" that
 * don't span a window — e.g. "tile load progress hit zero", "user
 * clicked Engage", "panel opened".
 */
export function mark(
  track: PerfTrack,
  name: string,
  options?: MeasureOptions,
): void {
  if (!PERF_ENABLED) return;
  const label = uniqueLabel(name);
  try {
    performance.mark(label, {
      detail: buildDevtoolsDetail(track, options),
    });
  } catch {
    try {
      performance.mark(label);
    } catch {
      /* swallowed */
    }
  }
  recordEvent({
    category: CATEGORY_FROM_TRACK[track],
    name,
    t: performance.now(),
    args: options?.properties as Record<string, unknown> | undefined,
  });
}

/**
 * Counter / metric event. Doesn't appear in DevTools tracks (DevTools
 * has no counter type for the extensibility API yet), but feeds the
 * HUD live displays and the Chrome trace exporter (where it becomes a
 * `ph: "C"` counter event with proper time-series rendering).
 */
export function counter(
  category: PerfEvent['category'],
  name: string,
  value: number,
  args?: Record<string, unknown>,
): void {
  if (!PERF_ENABLED) return;
  recordEvent({
    category,
    name,
    t: performance.now(),
    value,
    args,
  });
}
