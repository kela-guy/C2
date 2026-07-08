/**
 * Tiny external store for the high-frequency map state that must NOT flow
 * through the Dashboard root render.
 *
 * The friendly-patrol simulation updates drone positions 4x/second, and
 * card/row hover writes fire on every pointer move. Previously these lived
 * in Dashboard `useState`, so each update re-rendered the entire ~2,350-line
 * Dashboard tree. They only ever feed `CesiumTacticalMap`, so we keep them in
 * a `useSyncExternalStore`-compatible store that only the map subscriber
 * reads. Dashboard writes to the store without subscribing, so the 4 Hz tick
 * re-renders the map alone.
 */

import { useRef } from 'react';
import type { FriendlyDrone } from './Dashboard';

export interface LiveMapSnapshot {
  friendlyDrones: FriendlyDrone[];
  hoveredSensorId: string | null;
  hoveredTargetId: string | null;
}

export interface LiveMapStore {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => LiveMapSnapshot;
  setFriendlyDrones: (drones: FriendlyDrone[]) => void;
  setHoveredSensorId: (id: string | null) => void;
  setHoveredTargetId: (id: string | null) => void;
}

export function createLiveMapStore(initial: LiveMapSnapshot): LiveMapStore {
  let snapshot = initial;
  const listeners = new Set<() => void>();
  const emit = () => {
    for (const l of listeners) l();
  };

  return {
    subscribe(onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    getSnapshot() {
      return snapshot;
    },
    setFriendlyDrones(friendlyDrones) {
      snapshot = { ...snapshot, friendlyDrones };
      emit();
    },
    setHoveredSensorId(hoveredSensorId) {
      if (snapshot.hoveredSensorId === hoveredSensorId) return;
      snapshot = { ...snapshot, hoveredSensorId };
      emit();
    },
    setHoveredTargetId(hoveredTargetId) {
      if (snapshot.hoveredTargetId === hoveredTargetId) return;
      snapshot = { ...snapshot, hoveredTargetId };
      emit();
    },
  };
}

/**
 * Returns a stable store instance for the lifetime of the component. The
 * `init` factory runs exactly once (lazy ref init), mirroring the
 * `useState(() => …)` pattern it replaces.
 */
export function useLiveMapStore(init: () => LiveMapSnapshot): LiveMapStore {
  const ref = useRef<LiveMapStore | null>(null);
  if (ref.current === null) ref.current = createLiveMapStore(init());
  return ref.current;
}
