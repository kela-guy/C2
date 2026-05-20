/**
 * Date-grouped jump-to list for the Track History panel. Sticky
 * group headers (Today / Yesterday / Earlier) keep the list scannable
 * as recorded closures accumulate alongside the seed.
 *
 * Roving-tabindex pattern lets ArrowUp / ArrowDown step through
 * rows and Enter trigger the row's `onClick`. The actual time-jump
 * happens upstream — this list is presentation-only.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useStrings } from '@/lib/intl';
import { TrackHistoryCard } from './TrackHistoryCard';
import type { HistoricalTrack } from './types';

interface TrackHistoryListProps {
  tracks: HistoricalTrack[];
  selectedTrackId: string | null;
  onSelectTrack: (id: string | null) => void;
}

interface TrackGroup {
  key: string;
  label: string;
  tracks: HistoricalTrack[];
}

export function TrackHistoryList({
  tracks,
  selectedTrackId,
  onSelectTrack,
}: TrackHistoryListProps) {
  const strings = useStrings().trackHistory;
  const containerRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(
    () => groupTracksByDate(tracks, strings.dateGroup),
    [tracks, strings.dateGroup],
  );

  const flatIds = useMemo(
    () => groups.flatMap((g) => g.tracks.map((t) => t.id)),
    [groups],
  );

  useEffect(() => {
    if (!selectedTrackId) return;
    const node = containerRef.current?.querySelector<HTMLElement>(
      `[data-testid="track-history-card-${selectedTrackId}"]`,
    );
    node?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }, [selectedTrackId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (flatIds.length === 0) return;
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') return;
    e.preventDefault();
    const idx = selectedTrackId ? flatIds.indexOf(selectedTrackId) : -1;
    if (e.key === 'Enter') {
      if (idx >= 0) onSelectTrack(flatIds[idx]);
      return;
    }
    const delta = e.key === 'ArrowDown' ? 1 : -1;
    const nextIdx =
      idx === -1
        ? e.key === 'ArrowDown'
          ? 0
          : flatIds.length - 1
        : Math.max(0, Math.min(flatIds.length - 1, idx + delta));
    onSelectTrack(flatIds[nextIdx]);
  };

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label={strings.list.ariaLabel}
      aria-activedescendant={selectedTrackId ?? undefined}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="flex flex-col py-1 focus:outline-none"
    >
      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`th-group-${group.key}`}>
          <header
            id={`th-group-${group.key}`}
            className="sticky top-0 z-10 px-2.5 py-1 bg-surface-2 text-[10px] font-semibold uppercase tracking-wider text-slate-10"
            style={{ letterSpacing: '0.06em' }}
          >
            {group.label}
          </header>
          <div className="flex flex-col px-2.5 pt-1">
            {group.tracks.map((track) => (
              <div key={track.id} data-testid={`track-history-card-${track.id}`}>
                <TrackHistoryCard
                  track={track}
                  open={track.id === selectedTrackId}
                  onToggle={() =>
                    onSelectTrack(track.id === selectedTrackId ? null : track.id)
                  }
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function groupTracksByDate(
  tracks: HistoricalTrack[],
  labels: { today: string; yesterday: string; earlier: string },
): TrackGroup[] {
  const now = new Date();
  const todayKey = dateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dateKey(yesterday);

  const buckets = new Map<string, TrackGroup>();
  for (const track of tracks) {
    const d = new Date(track.startedAt);
    const key = dateKey(d);
    let label: string;
    if (key === todayKey) label = labels.today;
    else if (key === yesterdayKey) label = labels.yesterday;
    else label = labels.earlier;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { key, label, tracks: [] };
      buckets.set(key, bucket);
    }
    bucket.tracks.push(track);
  }
  return Array.from(buckets.values());
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
