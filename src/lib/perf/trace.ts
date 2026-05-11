/**
 * Export the in-memory perf-event ring buffer as a Chrome JSON trace
 * file. The output drops cleanly into:
 *
 *   - `chrome://tracing` (drag the file into the page)
 *   - DevTools Performance panel (click "Load profile…")
 *   - Perfetto UI at https://ui.perfetto.dev
 *   - The Perfetto `trace_processor` shell, which parses Chrome JSON
 *     and lets you run SQL over the trace.
 *
 * Format reference:
 *   https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU
 *
 * We emit:
 *   - One process (`pid: 1`) named "C2 Hub", one thread (`tid: 1`)
 *     named "Main", to keep the visual simple. Per-track grouping is
 *     handled by the DevTools extensibility payload (already on the
 *     measure entries) and by sane `cat` values.
 *   - `M` (metadata) events at the top to name the process and thread.
 *   - One `X` (complete) event per `PerfEvent` with a `dur`.
 *   - One `i` (instant) event per `PerfEvent` without a `dur`.
 *   - One `C` (counter) event per `PerfEvent` with a `value`.
 *
 * Timestamps are converted from `performance.now()` ms to microseconds
 * (Chrome trace timebase). `pid` and `tid` are static — we don't have
 * meaningful processes/threads in a single tab.
 */

import { snapshot, type PerfEvent } from './sink';

interface ChromeTraceEvent {
  name: string;
  cat: string;
  ph: 'X' | 'i' | 'C' | 'M' | 'B' | 'E';
  ts: number;
  dur?: number;
  pid: number;
  tid: number;
  args?: Record<string, unknown>;
  s?: 'g' | 'p' | 't';
}

const PID = 1;
const TID = 1;

function eventToTraceEntries(event: PerfEvent): ChromeTraceEvent[] {
  const tsUs = event.t * 1000;
  const base = {
    name: event.name,
    cat: event.category,
    pid: PID,
    tid: TID,
    args: event.args as Record<string, unknown> | undefined,
  };
  if (event.value != null) {
    // Counter events don't take `args` from us; the value goes under a
    // synthetic key matching the event name so chrome:tracing graphs
    // it on its own series.
    return [
      {
        ...base,
        ph: 'C',
        ts: tsUs,
        args: { [event.name]: event.value },
      },
    ];
  }
  if (event.dur != null && event.dur > 0) {
    return [
      {
        ...base,
        ph: 'X',
        ts: tsUs,
        dur: event.dur * 1000,
      },
    ];
  }
  return [
    {
      ...base,
      ph: 'i',
      ts: tsUs,
      // 't' = thread-scoped instant, which renders as a single tick
      // on the thread row instead of spanning the whole process.
      s: 't',
    },
  ];
}

/** Build the Chrome trace JSON object (not yet serialized). */
export function buildTrace(): { traceEvents: ChromeTraceEvent[]; displayTimeUnit: 'ms' } {
  const events = snapshot();
  const traceEvents: ChromeTraceEvent[] = [
    {
      name: 'process_name',
      cat: '__metadata',
      ph: 'M',
      pid: PID,
      tid: TID,
      ts: 0,
      args: { name: 'C2 Hub' },
    },
    {
      name: 'thread_name',
      cat: '__metadata',
      ph: 'M',
      pid: PID,
      tid: TID,
      ts: 0,
      args: { name: 'Main' },
    },
  ];
  for (const e of events) {
    for (const t of eventToTraceEntries(e)) traceEvents.push(t);
  }
  return { traceEvents, displayTimeUnit: 'ms' };
}

/**
 * Trigger a browser download of the trace as `c2hub-trace-<ts>.json`,
 * or `c2hub-trace-<suffix>-<ts>.json` if `filenameSuffix` is provided.
 * The scenario runner uses the suffix slot to embed a stable scenario
 * id so multiple captures from one session can be diffed on disk
 * without `(1)`-style filename collisions from the OS.
 *
 * Called from the HUD's "Download trace" button + the PerfScenarios runner.
 */
export function downloadTrace(filenameSuffix?: string): void {
  const trace = buildTrace();
  const json = JSON.stringify(trace);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const tail = filenameSuffix ? `${filenameSuffix}-${ts}` : ts;
  a.download = `c2hub-trace-${tail}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after the download has had time to start. 1 s is generous.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
