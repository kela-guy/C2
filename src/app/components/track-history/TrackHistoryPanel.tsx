/**
 * Track History panel — slim "jump-to" index. Selecting a row
 * rewinds the global footer scrubber so the rest of the dashboard
 * (Cesium, Targets panel) re-renders at that moment via the
 * time machine.
 *
 * Owns the filter-bar state (kill, sensor, time, callsign search)
 * and feeds the resulting `filteredTracks` into the list. The
 * filter primitive lives in `TrackHistoryFilters.tsx`; the
 * derivation helper is exported from there too.
 */

import { useMemo, useState } from 'react';
import { GridblockPanel } from '@/app/components/gridblock';
import { useStrings } from '@/lib/intl';
import type { HistoryStoreApi } from '@/app/hooks/useHistoryStore';
import { TrackHistoryList } from './TrackHistoryList';
import {
  TrackHistoryFilters,
  EMPTY_FILTERS,
  applyTrackHistoryFilters,
  hasActiveFilters,
  type TrackHistoryFilterState,
} from './TrackHistoryFilters';

interface TrackHistoryPanelProps {
  api: HistoryStoreApi;
  selectedTrackId: string | null;
  onSelectTrack: (id: string | null) => void;
  onClose: () => void;
}

export function TrackHistoryPanel({
  api,
  selectedTrackId,
  onSelectTrack,
  onClose,
}: TrackHistoryPanelProps) {
  const strings = useStrings().trackHistory;
  const { tracks } = api;

  const [filters, setFilters] = useState<TrackHistoryFilterState>(EMPTY_FILTERS);

  const filteredTracks = useMemo(
    () => applyTrackHistoryFilters(tracks, filters),
    [tracks, filters],
  );

  const filtersActive = hasActiveFilters(filters);

  return (
    <GridblockPanel
      title={
        <span className="flex items-baseline gap-2">
          <span>{strings.panelTitle}</span>
          <span className="text-[11px] font-normal text-slate-10 tabular-nums">
            {strings.panelSubtitle(filteredTracks.length)}
          </span>
        </span>
      }
      onClose={onClose}
      closeAriaLabel={strings.closePanel}
      closeTooltip={strings.closePanel}
      testId="track-history-panel"
      toolbar={
        tracks.length > 0 ? (
          <TrackHistoryFilters
            tracks={tracks}
            state={filters}
            onChange={setFilters}
          />
        ) : undefined
      }
    >
      {tracks.length === 0 ? (
        <EmptyState title={strings.list.empty} hint={strings.list.emptyHint} />
      ) : filteredTracks.length === 0 ? (
        <EmptyState
          title={strings.list.noMatches}
          hint={
            filtersActive ? strings.list.noMatchesHint : strings.list.emptyHint
          }
        />
      ) : (
        <TrackHistoryList
          tracks={filteredTracks}
          selectedTrackId={selectedTrackId}
          onSelectTrack={onSelectTrack}
        />
      )}
    </GridblockPanel>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center gap-1 px-6 text-center">
      <p className="text-xs font-semibold text-slate-12">{title}</p>
      <p className="text-[11px] text-slate-10">{hint}</p>
    </div>
  );
}
