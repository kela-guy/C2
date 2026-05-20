/**
 * GridblockFooter — bottom strip with the global time selector.
 *
 *   [ LIVE/HISTORY pill (80px) | divider | clock (70px) | play/pause |
 *     scrubber (flex-1, ticks every 15 min, draggable) | divider |
 *     "Last Hour" dropdown ]
 *
 * The scrubber is the global playback control: handle position
 * encodes the offset between `viewedAtMs` and `now` over a fixed
 * 1-hour window. Drag the handle backward → the dashboard time-
 * machines into the past. Returning to 100% (or pressing Home)
 * resumes live mode.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, ChevronDown } from "lucide-react";
import { Check, Radar, Crosshair, Zap, CheckCircle2 } from "@/lib/icons/central";
import { useStrings } from "@/lib/intl";

import {
  formatGridblockDateTickLabel,
  formatGridblockSecondTickLabel,
  formatGridblockShortClock,
  formatGridblockTickLabel,
  useGridblockClock,
} from "./useGridblockClock";
import { useTimezone } from "@/app/hooks/useTimezone";
import { useViewedAt } from "@/app/state/ViewedAtContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { formatRelativeMs } from "@/app/components/track-history/time";
import type { ActionLogKind } from "@/app/components/track-history/types";

const MIN_MS = 60 * 1000;
const HOUR_MS = 60 * MIN_MS;
const DAY_MS = 24 * HOUR_MS;

export const TIME_WINDOW_KEYS = [
  "last1m",
  "last5m",
  "last15m",
  "last30m",
  "lastHour",
  "last5h",
  "last10h",
  "last24h",
  "last7d",
  "last30d",
] as const;
export type TimeWindowKey = (typeof TIME_WINDOW_KEYS)[number];

const WINDOW_MS: Record<TimeWindowKey, number> = {
  last1m: MIN_MS,
  last5m: 5 * MIN_MS,
  last15m: 15 * MIN_MS,
  last30m: 30 * MIN_MS,
  lastHour: HOUR_MS,
  last5h: 5 * HOUR_MS,
  last10h: 10 * HOUR_MS,
  last24h: 24 * HOUR_MS,
  last7d: 7 * DAY_MS,
  last30d: 30 * DAY_MS,
};

const TICK_INTERVAL_MS: Record<TimeWindowKey, number> = {
  last1m: 10_000,
  last5m: MIN_MS,
  last15m: 3 * MIN_MS,
  last30m: 5 * MIN_MS,
  lastHour: 15 * MIN_MS,
  last5h: HOUR_MS,
  last10h: 2 * HOUR_MS,
  last24h: 4 * HOUR_MS,
  last7d: DAY_MS,
  last30d: 5 * DAY_MS,
};

function tickFormatterFor(
  windowMs: number,
): (d: Date, tz: string) => string {
  if (windowMs <= 15 * MIN_MS) return formatGridblockSecondTickLabel;
  if (windowMs < DAY_MS) return formatGridblockTickLabel;
  return formatGridblockDateTickLabel;
}

/**
 * Scrubber tooltip eyebrow icon per action-log kind. Same glyph
 * vocabulary the History card uses elsewhere — Radar for sensor
 * beats, Crosshair for classification flips, Zap for engagement,
 * CheckCircle2 for terminal outcomes.
 */
const MARKER_KIND_ICON: Record<ActionLogKind, typeof Radar> = {
  detection: Radar,
  classification: Crosshair,
  engagement: Zap,
  outcome: CheckCircle2,
};

/**
 * Wall-clock event marker plotted on the scrubber. Today the only
 * producer is the Track History selection in `Dashboard`, surfacing
 * `actionLog[].pinned === true` beats so the operator can seek to
 * an engagement / kill / classification flip in one click.
 *
 * `trackStartedAtMs` is the wall-clock epoch the marker is relative
 * to — the tooltip uses it to render "T+3:22" so operators can see
 * how far into the track this beat happened (the post-mortem axis
 * the PRD asks for).
 */
export interface ScrubberMarker {
  id: string;
  /** Wall-clock epoch ms. */
  atMs: number;
  /** Tooltip body. */
  label: string;
  /** Coarse taxonomy — drives the tooltip eyebrow icon + label. */
  kind?: ActionLogKind;
  /** Wall-clock epoch of the marker's parent track start. */
  trackStartedAtMs: number;
}

/**
 * Wall-clock span highlighted on the scrubber as a thin band — the
 * "this is where the selected track lived" cue. Producer is Track
 * History selection in `Dashboard`. Outside the visible 1h window
 * the band silently clips.
 */
export interface ScrubberSpan {
  startMs: number;
  endMs: number;
}

interface GridblockFooterProps {
  markers?: ScrubberMarker[];
  selectedSpan?: ScrubberSpan | null;
}

function GridblockFooterImpl({
  markers = [],
  selectedSpan = null,
}: GridblockFooterProps) {
  const t = useStrings();
  const { tz } = useTimezone();
  const now = useGridblockClock();
  const viewedAt = useViewedAt();
  const [windowKey, setWindowKey] = useState<TimeWindowKey>("lastHour");
  const [windowMenuOpen, setWindowMenuOpen] = useState(false);

  const displayMs = viewedAt.isLive ? now.getTime() : viewedAt.viewedAtMs;
  const offsetMs = Math.max(0, now.getTime() - displayMs);
  const windowMs = WINDOW_MS[windowKey];
  const tickIntervalMs = TICK_INTERVAL_MS[windowKey];

  return (
    <footer
      className="gridblock-edge-top flex items-center bg-[var(--gridblock-bar)]"
      style={{ height: "var(--gridblock-footer-height)" }}
      data-testid="gridblock-footer"
    >
      <ModePill
        isLive={viewedAt.isLive}
        liveLabel={t.gridblock.live}
        offsetMs={offsetMs}
        offsetLabel={t.gridblock.historyOffset}
        returnToLiveLabel={t.gridblock.returnToLive}
        onReturnToLive={viewedAt.reset}
      />
      <span aria-hidden className="gridblock-divider" />
      <span
        className="text-center text-[12px] font-semibold leading-4 tabular-nums"
        style={{
          width: 70,
          color: viewedAt.isLive ? "var(--gridblock-live)" : "var(--slate-12)",
        }}
      >
        {formatGridblockShortClock(new Date(displayMs), tz)}
      </span>
      <button
        type="button"
        aria-label={
          viewedAt.playing ? t.gridblock.pauseTime : t.gridblock.playTime
        }
        className="gridblock-iconbtn"
        onClick={viewedAt.togglePlay}
        disabled={viewedAt.isLive}
      >
        {viewedAt.playing ? <Pause size={12} /> : <Play size={12} />}
      </button>

      <div className="flex flex-1 items-center px-2">
        <Scrubber
          now={now}
          tz={tz}
          markers={markers}
          selectedSpan={selectedSpan}
          windowMs={windowMs}
          tickIntervalMs={tickIntervalMs}
        />
      </div>

      <span aria-hidden className="gridblock-divider" />
      <Popover open={windowMenuOpen} onOpenChange={setWindowMenuOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="gridblock-iconbtn gap-1 px-2.5 text-[12px]"
            aria-label={t.gridblock.timeWindow}
            aria-haspopup="listbox"
            aria-expanded={windowMenuOpen}
          >
            <span className="px-0.5">
              {t.gridblock.timeWindowOptions[windowKey]}
            </span>
            <ChevronDown
              size={14}
              className={`transition-transform duration-150 motion-reduce:transition-none ${
                windowMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          sideOffset={6}
          className="w-44 overflow-hidden rounded-lg p-0.5 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.25),0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl [transform-origin:var(--radix-popover-content-transform-origin)] data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=top]:slide-in-from-bottom-1 data-[side=bottom]:slide-in-from-top-1 data-[state=open]:duration-150 data-[state=closed]:duration-100"
        >
          <ul role="listbox" className="flex flex-col gap-0.5">
            {TIME_WINDOW_KEYS.map((key) => {
              const active = key === windowKey;
              return (
                <li key={key}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setWindowKey(key);
                      setWindowMenuOpen(false);
                    }}
                    className={`flex h-7 w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 text-start text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:bg-state-hover-strong ${
                      active
                        ? "text-slate-12"
                        : "text-slate-11 hover:bg-state-hover hover:text-slate-12"
                    }`}
                  >
                    <span className="truncate">
                      {t.gridblock.timeWindowOptions[key]}
                    </span>
                    {active && (
                      <Check
                        size={12}
                        className="shrink-0 text-accent-info"
                        aria-hidden
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </PopoverContent>
      </Popover>
    </footer>
  );
}

export const GridblockFooter = memo(GridblockFooterImpl);
GridblockFooter.displayName = "GridblockFooter";

interface ModePillProps {
  isLive: boolean;
  liveLabel: string;
  offsetMs: number;
  offsetLabel: (offset: string) => string;
  returnToLiveLabel: string;
  onReturnToLive: () => void;
}

function ModePill({
  isLive,
  liveLabel,
  offsetMs,
  offsetLabel,
  returnToLiveLabel,
  onReturnToLive,
}: ModePillProps) {
  if (isLive) {
    return (
      <span
        className="inline-flex w-[80px] items-center justify-center text-[12px] font-semibold leading-4 text-[var(--gridblock-live)]"
      >
        {liveLabel}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onReturnToLive}
      aria-label={returnToLiveLabel}
      title={returnToLiveLabel}
      className="inline-flex w-[80px] items-center justify-center text-[12px] font-semibold leading-4 text-slate-11 hover:text-slate-12 focus:outline-none tabular-nums"
    >
      {offsetLabel(formatOffset(offsetMs))}
    </button>
  );
}

const EDGE_MARGIN_PCT = 3;

function computeTicks(
  now: Date,
  windowMs: number,
  intervalMs: number,
  tz: string,
  formatLabel: (d: Date, tz: string) => string,
): Array<{ leftPct: number; label: string }> {
  const startMs = now.getTime() - windowMs;
  const firstTickMs = Math.ceil(startMs / intervalMs) * intervalMs;
  const ticks: Array<{ leftPct: number; label: string }> = [];
  for (let t = firstTickMs; t < now.getTime(); t += intervalMs) {
    const leftPct = ((t - startMs) / windowMs) * 100;
    if (leftPct < EDGE_MARGIN_PCT || leftPct > 100 - EDGE_MARGIN_PCT) continue;
    ticks.push({
      leftPct,
      label: formatLabel(new Date(t), tz),
    });
  }
  return ticks;
}

interface ScrubberProps {
  now: Date;
  tz: string;
  markers: ScrubberMarker[];
  selectedSpan: ScrubberSpan | null;
  windowMs: number;
  tickIntervalMs: number;
}

/**
 * Interactive scrubber. The bar's own range is `[now − 1h, now]`;
 * dragging the handle inside that range updates `viewedAtMs`.
 *
 * Pointer-down anywhere on the track jumps the handle to the click
 * position; subsequent pointer-move events keep tracking. Keyboard
 * arrows nudge by 5s (Shift = 30s); Home returns to live.
 *
 * Direction-axis-aware via `inset-inline-start` so RTL flips the
 * scrubber automatically; the inline math still works because the
 * pointer X coordinate is converted to a percentage of the bar's
 * bounding rect, which always has logical left at the leading edge.
 */
function Scrubber({
  now,
  tz,
  markers,
  selectedSpan,
  windowMs,
  tickIntervalMs,
}: ScrubberProps) {
  const t = useStrings();
  const viewedAt = useViewedAt();
  const ticks = useMemo(
    () =>
      computeTicks(now, windowMs, tickIntervalMs, tz, tickFormatterFor(windowMs)),
    [now, tz, windowMs, tickIntervalMs],
  );

  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const nowMs = now.getTime();
  const windowStartMs = nowMs - windowMs;
  const handlePct = viewedAt.isLive
    ? 100
    : Math.max(
        0,
        Math.min(
          100,
          ((viewedAt.viewedAtMs - windowStartMs) / windowMs) * 100,
        ),
      );

  const visibleMarkers = useMemo(
    () =>
      markers
        .map((m) => ({
          ...m,
          leftPct: ((m.atMs - windowStartMs) / windowMs) * 100,
        }))
        .filter((m) => m.leftPct >= 0 && m.leftPct <= 100),
    [markers, windowStartMs, windowMs],
  );

  const visibleSpan = useMemo(() => {
    if (!selectedSpan) return null;
    const startPct = ((selectedSpan.startMs - windowStartMs) / windowMs) * 100;
    const endPct = ((selectedSpan.endMs - windowStartMs) / windowMs) * 100;
    const leftPct = Math.max(0, Math.min(100, startPct));
    const rightPct = Math.max(0, Math.min(100, endPct));
    if (rightPct <= leftPct) return null;
    return { leftPct, widthPct: rightPct - leftPct };
  }, [selectedSpan, windowStartMs, windowMs]);

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return;
      const pct = (clientX - rect.left) / rect.width;
      const clamped = Math.max(0, Math.min(1, pct));
      const nextMs = windowStartMs + clamped * windowMs;
      viewedAt.seekTo(nextMs);
    },
    [windowStartMs, windowMs, viewedAt],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    draggingRef.current = true;
    document.body.classList.add("gridblock-scrubbing");
    seekFromClientX(e.clientX);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    seekFromClientX(e.clientX);
  };

  const stopDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    document.body.classList.remove("gridblock-scrubbing");
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // pointer was already released — fine
    }
  };

  useEffect(() => {
    return () => {
      document.body.classList.remove("gridblock-scrubbing");
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const big = e.shiftKey ? 30_000 : 5_000;
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        viewedAt.jog(-big);
        break;
      case "ArrowRight":
        e.preventDefault();
        viewedAt.jog(big);
        break;
      case "Home":
        e.preventDefault();
        viewedAt.reset();
        break;
      case " ":
      case "Spacebar":
        if (!viewedAt.isLive) {
          e.preventDefault();
          viewedAt.togglePlay();
        }
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label={t.gridblock.scrubberAriaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(handlePct)}
      aria-valuetext={
        viewedAt.isLive
          ? t.gridblock.live
          : t.gridblock.historyOffset(formatOffset(nowMs - viewedAt.viewedAtMs))
      }
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onKeyDown={onKeyDown}
      className="gridblock-scrubber-track relative w-full cursor-pointer focus:outline-none"
    >
      {!viewedAt.isLive && (
        <span
          aria-hidden
          className="absolute inset-y-0"
          style={{
            left: `${handlePct}%`,
            width: `${100 - handlePct}%`,
            background:
              "color-mix(in oklch, var(--slate-12) 14%, transparent)",
          }}
        />
      )}
      {visibleSpan && (
        <span
          aria-hidden
          className="gridblock-track-band"
          style={{
            left: `${visibleSpan.leftPct}%`,
            width: `${visibleSpan.widthPct}%`,
          }}
        />
      )}
      {ticks.map((tk) => (
        <span
          key={`label-${tk.label}`}
          className="gridblock-tick-label"
          style={{ left: `${tk.leftPct}%` }}
        >
          {tk.label}
        </span>
      ))}
      {ticks.map((tk) => (
        <span
          key={`line-${tk.label}`}
          className="gridblock-tick-line"
          style={{ left: `${tk.leftPct}%` }}
        />
      ))}
      {visibleMarkers.map((m) => {
        const kind: ActionLogKind = m.kind ?? "detection";
        const KindIcon = MARKER_KIND_ICON[kind];
        const wallClock = formatGridblockShortClock(new Date(m.atMs), tz);
        const offsetLabel = formatRelativeMs(m.atMs - m.trackStartedAtMs);
        return (
          <Tooltip key={m.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="gridblock-event-marker"
                style={{ left: `${m.leftPct}%` }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  viewedAt.seekTo(m.atMs);
                }}
                aria-label={`${t.gridblock.scrubberKind[kind]} — ${m.label} · ${wallClock}`}
              />
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              <div className="flex flex-col gap-1 min-w-[180px]">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-10">
                  <KindIcon size={12} aria-hidden />
                  <span>{t.gridblock.scrubberKind[kind]}</span>
                </div>
                <div className="text-[13px] font-semibold text-slate-12 leading-tight">
                  {m.label}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-10 tabular-nums">
                  <span>
                    {t.gridblock.scrubberOffsetPrefix}
                    {offsetLabel}
                  </span>
                  <span aria-hidden>·</span>
                  <span>{wallClock}</span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
      <span
        className="gridblock-scrubber-handle"
        style={{ left: `${handlePct}%` }}
        aria-hidden
      />
    </div>
  );
}

function formatOffset(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec}s`;
  return `${m}m${sec.toString().padStart(2, "0")}s`;
}
