/**
 * Locale-aware formatting helpers.
 *
 * Why this module exists
 * ──────────────────────
 *  Before this layer, the codebase mixed three patterns:
 *
 *    1. Hard-coded `Intl.DateTimeFormat('he-IL', …)` (Dashboard clock,
 *       NotificationSystem timestamps).
 *    2. Bare `value.toLocaleString()` with no locale tag (DevicesPanel
 *       distance, chart axes).
 *    3. Inline `Intl` constructors created on every render (cheap per
 *       call, expensive in tight loops like log streams).
 *
 *  The result was inconsistent UX: the live clock always showed in
 *  Hebrew numerals, but a list of distances next to it followed the
 *  user's browser locale. Switching the app's direction (now
 *  user-controllable via `<DirectionProvider>`) had no effect on any
 *  of it.
 *
 *  This module gives every locale-sensitive call site one thing to
 *  reach for: a formatter bound to the active direction's locale tag.
 *  Internally it caches `Intl.*` instances per (locale, options key),
 *  so even hot loops pay only one constructor per unique formatter.
 *
 * Two access patterns
 * ───────────────────
 *  - From React components: use the hooks (`useNumberFormat`,
 *    `useTimeFormat`, …). They pick up the active locale from
 *    `useDirection()` and return a memoized formatter.
 *
 *  - From non-React code (selectors, workers, log adapters): import
 *    the underlying `getNumberFormat(locale, opts)` factories and
 *    pass the locale explicitly. Direction state is React-only.
 */

import { useMemo } from 'react';
import { useLocale, type Locale } from '@/lib/direction';

// ────────────────────────────────────────────────────────────────────
// Locale tags
// ────────────────────────────────────────────────────────────────────
//
// `Intl` accepts more specific tags than the bare `'he' | 'en'` we
// store in direction state — `'he-IL'` and `'en-US'` give us the
// expected calendar / numbering / 12-hour conventions. Map once.

const INTL_LOCALE: Record<Locale, string> = {
  he: 'he-IL',
  en: 'en-US',
};

// ────────────────────────────────────────────────────────────────────
// Per-(locale, options) caches
// ────────────────────────────────────────────────────────────────────
//
// `Intl.NumberFormat` constructors are surprisingly heavy (~30µs on
// modern V8). The Dashboard renders thousands of telemetry rows per
// frame; constructing a formatter inline regresses input latency by
// 5–10ms. We cache by stable JSON keys so the constructor cost is
// paid once per option shape across the whole app's lifetime.

const numberCache = new Map<string, Intl.NumberFormat>();
const dateCache = new Map<string, Intl.DateTimeFormat>();
const relativeCache = new Map<string, Intl.RelativeTimeFormat>();
const listCache = new Map<string, Intl.ListFormat>();

function cacheKey(locale: string, opts: object | undefined): string {
  return opts ? `${locale}|${JSON.stringify(opts)}` : locale;
}

// ────────────────────────────────────────────────────────────────────
// Pure factories (no React)
// ────────────────────────────────────────────────────────────────────

export function getNumberFormat(locale: Locale, opts?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const tag = INTL_LOCALE[locale];
  const key = cacheKey(tag, opts);
  let fmt = numberCache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(tag, opts);
    numberCache.set(key, fmt);
  }
  return fmt;
}

export function getDateTimeFormat(locale: Locale, opts?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const tag = INTL_LOCALE[locale];
  const key = cacheKey(tag, opts);
  let fmt = dateCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(tag, opts);
    dateCache.set(key, fmt);
  }
  return fmt;
}

export function getRelativeTimeFormat(
  locale: Locale,
  opts?: Intl.RelativeTimeFormatOptions,
): Intl.RelativeTimeFormat {
  const tag = INTL_LOCALE[locale];
  const key = cacheKey(tag, opts);
  let fmt = relativeCache.get(key);
  if (!fmt) {
    fmt = new Intl.RelativeTimeFormat(tag, opts);
    relativeCache.set(key, fmt);
  }
  return fmt;
}

export function getListFormat(locale: Locale, opts?: Intl.ListFormatOptions): Intl.ListFormat {
  const tag = INTL_LOCALE[locale];
  const key = cacheKey(tag, opts);
  let fmt = listCache.get(key);
  if (!fmt) {
    fmt = new Intl.ListFormat(tag, opts);
    listCache.set(key, fmt);
  }
  return fmt;
}

// ────────────────────────────────────────────────────────────────────
// React hooks
// ────────────────────────────────────────────────────────────────────
//
// These all return a stable `Intl.*` instance; consumers can call it
// repeatedly inside a render without re-allocating.

export function useNumberFormat(opts?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const locale = useLocale();
  return useMemo(() => getNumberFormat(locale, opts), [locale, opts]);
}

export function useDateTimeFormat(opts?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const locale = useLocale();
  return useMemo(() => getDateTimeFormat(locale, opts), [locale, opts]);
}

export function useRelativeTimeFormat(opts?: Intl.RelativeTimeFormatOptions): Intl.RelativeTimeFormat {
  const locale = useLocale();
  return useMemo(() => getRelativeTimeFormat(locale, opts), [locale, opts]);
}

export function useListFormat(opts?: Intl.ListFormatOptions): Intl.ListFormat {
  const locale = useLocale();
  return useMemo(() => getListFormat(locale, opts), [locale, opts]);
}

// ────────────────────────────────────────────────────────────────────
// Domain helpers
// ────────────────────────────────────────────────────────────────────
//
// Wrap the `Intl` primitives with the option shapes we use
// repeatedly. Co-locating them here means every consumer gets the
// same formatting, and tweaking a convention (e.g. switching live
// clock from 24h to 12h) is a one-line change.

const TIME_OPTS: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
};

const TIME_NO_SECONDS_OPTS: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
};

const DATE_SHORT_OPTS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
};

/** Format a `Date` (or ms timestamp) as `HH:MM:SS` in the active locale. */
export function formatTime(value: Date | number, locale: Locale): string {
  const date = typeof value === 'number' ? new Date(value) : value;
  return getDateTimeFormat(locale, TIME_OPTS).format(date);
}

/** Format as `HH:MM` in the active locale. */
export function formatTimeShort(value: Date | number, locale: Locale): string {
  const date = typeof value === 'number' ? new Date(value) : value;
  return getDateTimeFormat(locale, TIME_NO_SECONDS_OPTS).format(date);
}

/** Format a `Date` (or ms timestamp) as `YYYY-MM-DD` in the active locale. */
export function formatDateShort(value: Date | number, locale: Locale): string {
  const date = typeof value === 'number' ? new Date(value) : value;
  return getDateTimeFormat(locale, DATE_SHORT_OPTS).format(date);
}

/**
 * Format a coordinate (decimal degrees) with a hemisphere suffix.
 * Always renders in LTR Latin form regardless of the active locale —
 * coords are universal navigation tokens; flipping them produces
 * `°N 32.0853` which is wrong. Wrap the call site in `<Bdi>` for
 * inline isolation inside Hebrew sentences.
 */
export function formatLatLon(
  lat: number,
  lon: number,
  precision: number = 4,
): string {
  const latStr = `${Math.abs(lat).toFixed(precision)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(precision)}° ${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lonStr}`;
}
