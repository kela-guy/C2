/**
 * useGridblockClock — returns the current `Date`, tick-rate
 * configurable. Used by the header clock readout and the footer
 * scrubber.
 *
 * Defaults to 1 Hz so the seconds digit doesn't stutter; pass
 * `intervalMs: 60_000` for header-only consumers that only need
 * minute precision.
 *
 * Format helpers in this module render strings in a chosen IANA
 * timezone (default `'UTC'`). The `formatGridblockClock` long
 * variant preserves the reference shell's exact format
 * (`Mon 11 May 26, 17:42:41Z`) when `tz === 'UTC'`; otherwise the
 * suffix swaps to the abbreviated tz name.
 */

import { useEffect, useState } from "react";

export const UTC_TZ = "UTC" as const;

export function useGridblockClock(intervalMs: number = 1_000): Date {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * Compute the calendar parts (weekday, day, month, year, hh, mm, ss)
 * of `d` in `tz`. Reuses a single Intl.DateTimeFormat per `tz` since
 * constructing a formatter is the heavy part of the ICU lookup.
 */
const PARTS_FORMATTERS = new Map<string, Intl.DateTimeFormat>();
function getPartsFormatter(tz: string): Intl.DateTimeFormat {
  let f = PARTS_FORMATTERS.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    PARTS_FORMATTERS.set(tz, f);
  }
  return f;
}

interface ClockParts {
  weekday: string;
  day: string;
  month: string;
  year: string;
  hh: string;
  mm: string;
  ss: string;
}

function partsIn(d: Date, tz: string): ClockParts {
  // For UTC we read the values directly off `Date` to keep the
  // exact wording of WEEKDAY / MONTH constants (the reference
  // shell shipped with these). Other tzs go through Intl.
  if (tz === UTC_TZ) {
    return {
      weekday: WEEKDAY[d.getUTCDay()],
      day: String(d.getUTCDate()).padStart(2, "0"),
      month: MONTH[d.getUTCMonth()],
      year: String(d.getUTCFullYear()),
      hh: String(d.getUTCHours()).padStart(2, "0"),
      mm: String(d.getUTCMinutes()).padStart(2, "0"),
      ss: String(d.getUTCSeconds()).padStart(2, "0"),
    };
  }
  const parts = getPartsFormatter(tz).formatToParts(d);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return {
    weekday: get("weekday"),
    day: get("day"),
    month: get("month"),
    year: get("year"),
    hh: get("hour"),
    mm: get("minute"),
    ss: get("second"),
  };
}

/**
 * Suffix shown after the time digits — `Z` for UTC, the tz
 * abbreviation otherwise (e.g. `EST`, `IST`). Cached per-tz so we
 * don't repeat the Intl roundtrip every tick.
 */
const TZ_SUFFIX_CACHE = new Map<string, string>();
export function tzSuffix(tz: string, sample: Date = new Date()): string {
  if (tz === UTC_TZ) return "Z";
  let cached = TZ_SUFFIX_CACHE.get(tz);
  if (!cached) {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    });
    const parts = fmt.formatToParts(sample);
    cached = parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
    TZ_SUFFIX_CACHE.set(tz, cached);
  }
  return cached;
}

/** `Mon 11 May 26, 17:42:41Z` (or with the tz abbreviation in place of `Z`). */
export function formatGridblockClock(d: Date, tz: string = UTC_TZ): string {
  const p = partsIn(d, tz);
  const yr = p.year.slice(-2);
  return `${p.weekday} ${p.day} ${p.month} ${yr}, ${p.hh}:${p.mm}:${p.ss}${tzSuffix(tz, d)}`;
}

/** `17:42:41Z` — short variant used in the footer time label. */
export function formatGridblockShortClock(
  d: Date,
  tz: string = UTC_TZ,
): string {
  const p = partsIn(d, tz);
  return `${p.hh}:${p.mm}:${p.ss}${tzSuffix(tz, d)}`;
}

/**
 * `17:45Z` — minute-precision label for scrubber tick marks. Drops
 * seconds because ticks land on 15-min boundaries; showing `:00Z`
 * for every label adds noise without information.
 */
export function formatGridblockTickLabel(
  d: Date,
  tz: string = UTC_TZ,
): string {
  const p = partsIn(d, tz);
  return `${p.hh}:${p.mm}${tzSuffix(tz, d)}`;
}

/**
 * `17:45:30Z` — second-precision tick label for scrubber windows
 * short enough that minute resolution is too coarse (≤ 15 min).
 */
export function formatGridblockSecondTickLabel(
  d: Date,
  tz: string = UTC_TZ,
): string {
  const p = partsIn(d, tz);
  return `${p.hh}:${p.mm}:${p.ss}${tzSuffix(tz, d)}`;
}

/**
 * `Mon 11` — day-precision tick label for scrubber windows that
 * span days. No tz suffix: at day resolution the offset stops
 * mattering and the suffix only adds noise.
 */
export function formatGridblockDateTickLabel(
  d: Date,
  tz: string = UTC_TZ,
): string {
  const p = partsIn(d, tz);
  return `${p.weekday} ${p.day}`;
}
