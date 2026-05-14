/**
 * GridblockFooter — bottom strip with the global time selector.
 * Layout, inline-start to inline-end:
 *
 *   [ LIVE pill (96px) | divider | clock (70px) | pause |
 *     scrubber (flex-1, ticks every 15 min) | divider |
 *     "Last Hour" dropdown ]
 *
 * Behaviour is intentionally "live-pinned, non-interactive" in
 * this pass — the scrubber handle pins to the inline-end edge and
 * the Pause / Last-Hour buttons are visual-only. Drag wiring +
 * dropdown menu land as follow-ups.
 */

import { memo, useMemo } from "react";
import { Pause, ChevronDown } from "lucide-react";
import { useStrings } from "@/lib/intl";

import {
  formatGridblockShortClock,
  formatGridblockTickLabel,
  useGridblockClock,
} from "./useGridblockClock";
import { useTimezone } from "@/app/hooks/useTimezone";

const ONE_HOUR_MS = 60 * 60 * 1000;
const FIFTEEN_MIN_MS = 15 * 60 * 1000;

function GridblockFooterImpl() {
  const t = useStrings();
  const { tz } = useTimezone();
  const now = useGridblockClock();
  return (
    <footer
      className="gridblock-edge-top flex items-center gap-2 bg-[var(--gridblock-floor)] px-2"
      style={{ height: "var(--gridblock-footer-height)" }}
      data-testid="gridblock-footer"
    >
      <LivePill label={t.gridblock.live} />
      <span aria-hidden className="gridblock-divider" />
      <span
        className="text-center text-[12px] font-semibold leading-4 tabular-nums text-[var(--gridblock-live)]"
        style={{ width: 70 }}
      >
        {formatGridblockShortClock(now, tz)}
      </span>
      <button
        type="button"
        aria-label={t.gridblock.pauseTime}
        className="gridblock-iconbtn"
      >
        <Pause size={12} />
      </button>

      <div className="flex flex-1 items-center px-2">
        <Scrubber now={now} tz={tz} />
      </div>

      <span aria-hidden className="gridblock-divider" />
      <button
        type="button"
        className="gridblock-iconbtn gap-1 text-[12px]"
        aria-label={t.gridblock.timeWindow}
      >
        <span className="px-0.5">{t.gridblock.timeWindowLastHour}</span>
        <ChevronDown size={14} />
      </button>
    </footer>
  );
}

// Memoized — props are empty and the only dynamic input is the
// internal 1 Hz clock. Without `memo`, the footer reconciles on every
// dashboard parent re-render.
export const GridblockFooter = memo(GridblockFooterImpl);
GridblockFooter.displayName = "GridblockFooter";

/**
 * "Live" text in green. The pill sizes to its own content so the
 * Hebrew/English label sets its own footprint, and the green color
 * does the "currently live" work on its own (no heartbeat dot
 * inside the pill itself).
 */
function LivePill({ label }: { label: string }) {
  return (
    <span
      className="inline-flex w-[80px] items-center justify-center text-[12px] font-semibold leading-4 text-[var(--gridblock-live)]"
    >
      {label}
    </span>
  );
}

/**
 * Builds 15-min boundary ticks across a 1-hour window ending at
 * `now`. Snapping to the next clean boundary inside the window
 * keeps the labels stable as the live edge moves second-by-second
 * — they only step every 15 minutes.
 *
 * Ticks within `EDGE_MARGIN_PCT` of either end are dropped so the
 * label (centered on its leftPct via `translateX(-50%)`) cannot
 * overflow past the track's inline-start / inline-end edges.
 */
const EDGE_MARGIN_PCT = 3;
function computeTicks(
  now: Date,
  windowMs: number,
  intervalMs: number,
  tz: string,
): Array<{ leftPct: number; label: string }> {
  const startMs = now.getTime() - windowMs;
  const firstTickMs = Math.ceil(startMs / intervalMs) * intervalMs;
  const ticks: Array<{ leftPct: number; label: string }> = [];
  for (let t = firstTickMs; t < now.getTime(); t += intervalMs) {
    const leftPct = ((t - startMs) / windowMs) * 100;
    if (leftPct < EDGE_MARGIN_PCT || leftPct > 100 - EDGE_MARGIN_PCT) continue;
    ticks.push({
      leftPct,
      label: formatGridblockTickLabel(new Date(t), tz),
    });
  }
  return ticks;
}

interface ScrubberProps {
  now: Date;
  tz: string;
}

/**
 * Scrubber bar. The bar itself (`.gridblock-scrubber-track`, 4px
 * tall) is the only element in the flow — that means the parent's
 * `items-center` puts the BAR at the footer's exact vertical
 * center. Tick labels float ABOVE the bar via `bottom: 100%`,
 * tick lines drop BELOW it (height 12 > track 4), and the handle
 * extends below via `bottom: -10px`.
 *
 * The handle position is keyed off the inline-axis percentage
 * `left: 100%`. Browsers do NOT flip `left` automatically in RTL
 * for absolute positioning; if a future feature needs the handle
 * to float at, say, 60% of the historical window, prefer
 * `inset-inline-start: 60%` so the bar reads consistently in both
 * directions.
 */
function Scrubber({ now, tz }: ScrubberProps) {
  const ticks = useMemo(
    () => computeTicks(now, ONE_HOUR_MS, FIFTEEN_MIN_MS, tz),
    [now, tz],
  );
  return (
    <div className="gridblock-scrubber-track relative w-full">
      {ticks.map((t) => (
        <span
          key={`label-${t.label}`}
          className="gridblock-tick-label"
          style={{ left: `${t.leftPct}%` }}
        >
          {t.label}
        </span>
      ))}
      {ticks.map((t) => (
        <span
          key={`line-${t.label}`}
          className="gridblock-tick-line"
          style={{ left: `${t.leftPct}%` }}
        />
      ))}
      <span
        className="gridblock-scrubber-handle"
        style={{ left: "100%" }}
        aria-label="Scrubber handle"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={100}
      />
    </div>
  );
}
