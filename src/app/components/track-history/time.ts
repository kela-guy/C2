/**
 * Time-formatting helpers shared across the Track History feature.
 *
 * `formatRelativeMs` formats milliseconds as a `MM:SS` string with
 * tabular-nums-friendly zero padding, used for action-log
 * timestamps and the scrubber playhead. Hours roll over to
 * `H:MM:SS` so very long tracks stay readable.
 *
 * `formatClock` formats an absolute epoch ms as `HH:MM` in the
 * user's local timezone — used for "started at" labels in rows
 * and detail headers.
 */

export function formatRelativeMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatClock(epochMs: number): string {
  const d = new Date(epochMs);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}
