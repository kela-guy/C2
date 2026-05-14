/**
 * useTimezone — operator's chosen IANA timezone for chrome clocks.
 *
 * The Gridblock header displays the active timezone next to the
 * UTC clock and exposes a small picker so the operator can flip
 * between UTC and their local zone (and a couple of other commonly
 * relevant ones for tactical surfaces). The choice persists to
 * localStorage and re-applies on next load.
 *
 * Default is `'UTC'` so a freshly-loaded surface always reads the
 * same wall-clock as the rest of the world, regardless of where
 * the operator's machine is.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "c2.gridblock.tz.v1";
const DEFAULT_TZ = "UTC" as const;

/**
 * Try `Intl.DateTimeFormat().resolvedOptions().timeZone` for the
 * "local" entry. Falls back to UTC if the runtime can't resolve it
 * (e.g. some sandboxed environments).
 */
function detectLocalTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TZ;
  } catch {
    return DEFAULT_TZ;
  }
}

export interface TimezoneOption {
  /** IANA timezone identifier (e.g. `UTC`, `Asia/Jerusalem`). */
  id: string;
  /** Display label shown in the picker (e.g. `UTC`, `Local`). */
  label: string;
}

/**
 * Curated default options. Callers can override via the hook's
 * argument, but the production header just uses these.
 *
 * `Local` is the operator's machine timezone — useful in field
 * deployments. `UTC` is canonical. `Asia/Jerusalem` is the home
 * timezone for the production deployment; replace via the
 * argument if your deployment ships somewhere else.
 */
export function defaultTimezoneOptions(): TimezoneOption[] {
  const local = detectLocalTz();
  const list: TimezoneOption[] = [{ id: "UTC", label: "UTC" }];
  if (local !== "UTC") {
    list.push({ id: local, label: `Local (${local})` });
  }
  if (local !== "Asia/Jerusalem" && "Asia/Jerusalem" !== "UTC") {
    list.push({ id: "Asia/Jerusalem", label: "Asia / Jerusalem" });
  }
  return list;
}

interface UseTimezoneResult {
  /** Active IANA timezone id. */
  tz: string;
  /** Imperatively change the timezone. Persists to localStorage. */
  setTz: (next: string) => void;
  /** Curated options to render in the header picker. */
  options: ReadonlyArray<TimezoneOption>;
}

export function useTimezone(
  options: ReadonlyArray<TimezoneOption> = defaultTimezoneOptions(),
): UseTimezoneResult {
  const [tz, setTzState] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_TZ;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw && typeof raw === "string" ? raw : DEFAULT_TZ;
    } catch {
      return DEFAULT_TZ;
    }
  });

  const setTz = useCallback((next: string) => {
    setTzState(next);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, tz);
    } catch {
      // Ignore quota / SecurityError — the choice is non-critical.
    }
  }, [tz]);

  // Stable identity for the options array when callers don't pass
  // their own (the helper allocates a fresh array per call so we
  // need to memoise to keep React reference equality intact).
  const stableOptions = useMemo(() => options, [options]);

  return { tz, setTz, options: stableOptions };
}
