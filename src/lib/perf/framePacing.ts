/**
 * Frame-pacing collector.
 *
 * Maintains a rolling 10-second histogram of frame intervals (gap
 * between consecutive `requestAnimationFrame` callbacks). Emits a
 * counter event every 1 s carrying:
 *   - `fps`  — frames-per-second over the last 1 s window
 *   - `p50`, `p95`, `p99` — frame-interval percentiles in ms (lower is better)
 *   - `dropped` — count of frames where interval > 33 ms (≈< 30 fps)
 *
 * Why a separate signal from LoAF:
 *   - LoAF tells us *why* a frame was slow (which scripts blocked).
 *     Frame pacing tells us *how often* it happens and what the
 *     steady-state quality is. Both are needed.
 *   - LoAF only fires for frames > ~50 ms. Frame pacing surfaces the
 *     "gradually getting worse" regressions that don't trip LoAF.
 *
 * The collector is started by `setupPerf()` and intentionally NEVER
 * stops — once started, it's cheap (O(1) per rAF) and the HUD assumes
 * it's running.
 */

import { recordEvent } from './sink';

const REPORT_INTERVAL_MS = 1000;
// Hold ~600 frames (10 s @ 60 Hz, 12 s @ 50 Hz) for percentiles.
const HISTORY_SIZE = 600;

const intervals = new Float32Array(HISTORY_SIZE);
let writeIdx = 0;
let count = 0;
let lastFrame = 0;
let lastReport = 0;
let lastReportFrameCount = 0;
let frameCount = 0;
let started = false;

function frame(now: number): void {
  if (lastFrame > 0) {
    intervals[writeIdx] = now - lastFrame;
    writeIdx = (writeIdx + 1) % HISTORY_SIZE;
    if (count < HISTORY_SIZE) count++;
    frameCount++;
  }
  lastFrame = now;

  if (lastReport === 0) lastReport = now;
  if (now - lastReport >= REPORT_INTERVAL_MS) {
    emitReport(now);
    lastReport = now;
    lastReportFrameCount = frameCount;
  }
  requestAnimationFrame(frame);
}

const sortBuf = new Float32Array(HISTORY_SIZE);

function emitReport(now: number): void {
  if (count === 0) return;
  // Copy live intervals into sortBuf, sort ascending.
  for (let i = 0; i < count; i++) sortBuf[i] = intervals[i];
  // In-place insertion sort is fine for 600 elements at 1 Hz.
  for (let i = 1; i < count; i++) {
    const v = sortBuf[i];
    let j = i - 1;
    while (j >= 0 && sortBuf[j] > v) {
      sortBuf[j + 1] = sortBuf[j];
      j--;
    }
    sortBuf[j + 1] = v;
  }
  const p50 = sortBuf[Math.floor(count * 0.5)];
  const p95 = sortBuf[Math.floor(count * 0.95)];
  const p99 = sortBuf[Math.min(count - 1, Math.floor(count * 0.99))];

  let dropped = 0;
  for (let i = 0; i < count; i++) if (intervals[i] > 33) dropped++;

  // Frames since last report, divided by elapsed seconds.
  const framesThisWindow = frameCount - lastReportFrameCount;
  const elapsedS = (now - (now - REPORT_INTERVAL_MS)) / 1000;
  const fps = framesThisWindow / elapsedS;

  recordEvent({
    category: 'frame',
    name: 'fps',
    t: now,
    value: fps,
    args: { p50, p95, p99, dropped, samples: count },
  });
  recordEvent({ category: 'frame', name: 'frame.p50', t: now, value: p50 });
  recordEvent({ category: 'frame', name: 'frame.p95', t: now, value: p95 });
  recordEvent({ category: 'frame', name: 'frame.p99', t: now, value: p99 });
  recordEvent({ category: 'frame', name: 'frame.dropped', t: now, value: dropped });
}

export function setupFramePacing(): void {
  if (started) return;
  started = true;
  requestAnimationFrame(frame);
}

/**
 * Read the current rolling histogram (chronological order). Used by
 * the HUD's frame strip to render last-N intervals as a sparkline.
 */
export function getFrameIntervals(): Float32Array {
  if (count < HISTORY_SIZE) return intervals.slice(0, count);
  // Wrapped — concat the two halves into a fresh array in
  // chronological order.
  const out = new Float32Array(HISTORY_SIZE);
  let o = 0;
  for (let i = writeIdx; i < HISTORY_SIZE; i++) out[o++] = intervals[i];
  for (let i = 0; i < writeIdx; i++) out[o++] = intervals[i];
  return out;
}
