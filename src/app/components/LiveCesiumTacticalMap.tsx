/**
 * Subscriber boundary around `CesiumTacticalMap`.
 *
 * Reads the 4 Hz live map state (friendly-drone positions + card/row hover)
 * from the external `LiveMapStore` via `useSyncExternalStore`, and feeds it to
 * the memoized map alongside the rest of the (Dashboard-owned) props. Because
 * Dashboard never reads the store, store updates re-render only this thin
 * wrapper + the map — not the entire Dashboard tree.
 */

import { useSyncExternalStore } from 'react';
import { CesiumTacticalMap, type CesiumTacticalMapProps } from './CesiumTacticalMap';
import type { LiveMapStore } from './liveMapStore';

type LiveProps = 'friendlyDrones' | 'hoveredSensorIdFromCard' | 'hoveredTargetIdFromCard';

export interface LiveCesiumTacticalMapProps
  extends Omit<CesiumTacticalMapProps, LiveProps> {
  store: LiveMapStore;
}

export function LiveCesiumTacticalMap({ store, ...rest }: LiveCesiumTacticalMapProps) {
  const live = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return (
    <CesiumTacticalMap
      {...rest}
      friendlyDrones={live.friendlyDrones}
      hoveredSensorIdFromCard={live.hoveredSensorId}
      hoveredTargetIdFromCard={live.hoveredTargetId}
    />
  );
}
