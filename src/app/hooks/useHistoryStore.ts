/**
 * useHistoryStore — owns the historical-track list the time machine
 * samples from. Two layers:
 *
 *   1. A single seeded fixture track that's always present so the
 *      panel never starts empty and operators have something to
 *      scrub the moment they open the tab.
 *   2. Recorded closures appended at runtime by
 *      `useClosedTrackRecorder` whenever a live target leaves the
 *      tactical sim. These are kept in memory only — page refresh
 *      wipes them; the seed survives.
 *
 * Consumers (the panel list, the time-machine projector) read
 * `tracks` and `byId`. The recorder calls `appendClosed`.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import type { HistoricalTrack } from "@/app/components/track-history/types";
import { buildSeedHistoricalTrack } from "@/app/components/track-history/historicalTracksFixture";

export interface HistoryStoreApi {
  /** Seed plus every track recorded since the last refresh. */
  tracks: HistoricalTrack[];
  byId: (id: string) => HistoricalTrack | undefined;
  /** Append a closed track captured by the recorder. */
  appendClosed: (track: HistoricalTrack) => void;
}

export function useHistoryStore(): HistoryStoreApi {
  const seedRef = useRef<HistoricalTrack>();
  if (!seedRef.current) {
    seedRef.current = buildSeedHistoricalTrack(Date.now());
  }
  const [recorded, setRecorded] = useState<HistoricalTrack[]>([]);

  const tracks = useMemo(() => {
    const seed = seedRef.current!;
    return [...recorded, seed].sort((a, b) => b.startedAt - a.startedAt);
  }, [recorded]);

  const byId = useMemo(() => {
    const map = new Map(tracks.map((t) => [t.id, t]));
    return (id: string) => map.get(id);
  }, [tracks]);

  const appendClosed = useCallback((track: HistoricalTrack) => {
    setRecorded((prev) => {
      if (prev.some((t) => t.id === track.id)) return prev;
      return [track, ...prev];
    });
  }, []);

  return { tracks, byId, appendClosed };
}
