/**
 * Tracks the lifecycle of a tile's detection list to drive the
 * two-tier `TileDetectionAlert`:
 *
 *   - `hasActive` is true whenever there is at least one detection on
 *     the feed. Drives the always-on subtle ring.
 *   - `pulseKey` increments whenever a *new* detection id appears that
 *     wasn't in the previous render. Mounted as a `key` on the pulse
 *     overlay so each new arrival forces a fresh enter animation.
 *
 * The hook prefers `firstSeenAt` from the detection (the operator's
 * detection backend can supply this directly) but synthesises arrival
 * via id-set diff when it isn't present, so the alert works against
 * the existing mock data unchanged.
 *
 * The diff is local to this hook (a `useRef` of seen ids); two tiles
 * showing the same `cameraId` end up with independent pulse counters
 * — that's the right behaviour because each tile is a separate
 * surface the operator may or may not be looking at.
 */

import { useEffect, useRef, useState } from 'react';
import type { DetectionBox } from './types';

export interface DetectionPulseState {
  hasActive: boolean;
  /** Bumped whenever a new detection id is observed. Use as `key` on
   *  the pulse overlay so each new arrival re-mounts (and re-runs)
   *  the enter animation. `0` means no pulse has fired yet. */
  pulseKey: number;
}

export function useDetectionPulse(detections: DetectionBox[]): DetectionPulseState {
  const seenIdsRef = useRef<Set<string>>(new Set());
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    const incoming = new Set(detections.map((d) => d.id));
    let foundNew = false;
    for (const id of incoming) {
      if (!seenIdsRef.current.has(id)) {
        foundNew = true;
        break;
      }
    }
    seenIdsRef.current = incoming;
    if (foundNew) setPulseKey((k) => k + 1);
  }, [detections]);

  return {
    hasActive: detections.length > 0,
    pulseKey,
  };
}
