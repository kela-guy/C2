/**
 * Track History filters — kill-reason, sensor type, time window, plus
 * a free-text callsign search. Wraps the shared `FilterBar` primitive
 * so the chrome matches the live targets list.
 *
 * Filter definitions are derived from the panel's track list (sensor
 * options, in particular, are dynamic — they reflect what the
 * recorded fixtures and live closures actually carry). Time options
 * are fixed so the popover doesn't shuffle as the dataset grows.
 */

import { useMemo } from 'react';
import { FilterBar, type FilterDef } from '@/primitives/FilterBar';
import { useStrings } from '@/lib/intl';
import type { HistoricalTrack, KillReason } from './types';

export type TrackHistoryTimeWindow =
  | 'last1m'
  | 'last5m'
  | 'last15m'
  | 'last30m'
  | 'lastHour'
  | 'last5h'
  | 'last10h'
  | 'last24h'
  | 'last7d'
  | 'last30d';

export interface TrackHistoryFilterState {
  query: string;
  kill: KillReason[];
  sensor: string[];
  time: TrackHistoryTimeWindow[];
}

export const EMPTY_FILTERS: TrackHistoryFilterState = {
  query: '',
  kill: [],
  sensor: [],
  time: [],
};

interface TrackHistoryFiltersProps {
  tracks: HistoricalTrack[];
  state: TrackHistoryFilterState;
  onChange: (next: TrackHistoryFilterState) => void;
}

const KILL_ORDER: KillReason[] = [
  'mitigated',
  'no_more_detections',
  'dropped',
  'timeout',
];

const TIME_ORDER: TrackHistoryTimeWindow[] = [
  'last1m',
  'last5m',
  'last15m',
  'last30m',
  'lastHour',
  'last5h',
  'last10h',
  'last24h',
  'last7d',
  'last30d',
];

const MIN_MS = 60 * 1000;
const HOUR_MS = 60 * MIN_MS;
const DAY_MS = 24 * HOUR_MS;

const WINDOW_MS: Record<TrackHistoryTimeWindow, number> = {
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

export function TrackHistoryFilters({
  tracks,
  state,
  onChange,
}: TrackHistoryFiltersProps) {
  const strings = useStrings().trackHistory;

  const sensorOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of tracks) {
      for (const snap of t.snapshots) {
        for (const s of snap.sensors) {
          if (!seen.has(s.typeLabel)) seen.set(s.typeLabel, s.typeLabel);
        }
      }
    }
    return Array.from(seen.values())
      .sort((a, b) => a.localeCompare(b))
      .map((label) => ({ value: label, label }));
  }, [tracks]);

  const filters: FilterDef[] = [
    {
      id: 'kill',
      label: strings.filters.kill,
      options: KILL_ORDER.map((k) => ({
        value: k,
        label: strings.killReason[k],
      })),
    },
    {
      id: 'sensor',
      label: strings.filters.sensor,
      options: sensorOptions,
    },
    {
      id: 'time',
      label: strings.filters.time,
      options: TIME_ORDER.map((t) => ({
        value: t,
        label: strings.filters.timeOptions[t],
      })),
    },
  ];

  const selections: Record<string, string[]> = {
    kill: state.kill,
    sensor: state.sensor,
    time: state.time,
  };

  const handleFilterChange = (id: string, next: string[]) => {
    switch (id) {
      case 'kill':
        onChange({ ...state, kill: next as KillReason[] });
        return;
      case 'sensor':
        onChange({ ...state, sensor: next });
        return;
      case 'time':
        onChange({ ...state, time: next as TrackHistoryTimeWindow[] });
        return;
    }
  };

  const summarize = (selected: string[]) =>
    selected.length === 0 ? '' : strings.filters.summaryCount(selected.length);

  return (
    <FilterBar
      query={state.query}
      onQueryChange={(q) => onChange({ ...state, query: q })}
      filters={filters}
      selections={selections}
      onFilterChange={handleFilterChange}
      onReset={() => onChange(EMPTY_FILTERS)}
      searchPlaceholder={strings.filters.searchPlaceholder}
      searchAriaLabel={strings.filters.searchAriaLabel}
      clearSearchAriaLabel={strings.filters.clearSearchAriaLabel}
      resetLabel={strings.filters.resetLabel}
      resetAriaLabel={strings.filters.resetAriaLabel}
      emptyOptionsLabel={strings.filters.emptyOptionsLabel}
      defaultSummary={summarize}
    />
  );
}

/**
 * Apply the filter state to a track list. Returns a new array;
 * preserves source ordering (caller owns sort).
 *
 * Time predicate is a rolling window — `track.startedAt >= now -
 * window`. Multi-select unions: the widest selected window wins.
 */
export function applyTrackHistoryFilters(
  tracks: HistoricalTrack[],
  state: TrackHistoryFilterState,
): HistoricalTrack[] {
  const q = state.query.trim().toLowerCase();
  const killSet = state.kill.length > 0 ? new Set(state.kill) : null;
  const sensorSet = state.sensor.length > 0 ? new Set(state.sensor) : null;

  const now = Date.now();
  const widestWindowMs =
    state.time.length > 0
      ? Math.max(...state.time.map((w) => WINDOW_MS[w]))
      : null;
  const cutoffMs = widestWindowMs == null ? null : now - widestWindowMs;

  return tracks.filter((track) => {
    if (q && !track.callsign.toLowerCase().includes(q)) return false;
    if (killSet && !killSet.has(track.killReason)) return false;
    if (sensorSet) {
      const hit = track.snapshots.some((snap) =>
        snap.sensors.some((s) => sensorSet.has(s.typeLabel)),
      );
      if (!hit) return false;
    }
    if (cutoffMs != null && track.startedAt < cutoffMs) return false;
    return true;
  });
}

export function hasActiveFilters(state: TrackHistoryFilterState): boolean {
  return (
    state.query.trim() !== '' ||
    state.kill.length > 0 ||
    state.sensor.length > 0 ||
    state.time.length > 0
  );
}
