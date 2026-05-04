/**
 * Cesium-specific perf instrumentation hooks.
 *
 * These are wired in by `CesiumMap.tsx` once a `Viewer` exists. They
 * provide the missing "what is the globe doing right now" signals
 * that no `PerformanceObserver` can give us:
 *
 *   - **Tile load progress** — number of outstanding tiles in flight.
 *     A non-zero value means the globe is actively streaming geometry
 *     and any FPS drop is likely IO-bound, not CPU-bound. Hits zero
 *     when the scene "settles".
 *   - **Settle latency** — time from a `moveStart` to the next
 *     `tileLoadProgress = 0`. The single best metric for "how long
 *     does the camera take to come to rest after a fly-to".
 *   - **Per-frame primitive/entity counts** — a 1 Hz sample of
 *     `viewer.entities.values.length` and the count of HTML markers.
 *     If a leak adds 10 entities/sec, this graph will show it
 *     instantly.
 *
 * Everything here records via the central `recordEvent` /
 * `mark` / `counter` functions; no DOM, no React.
 */

import type { Viewer } from 'cesium';
import { mark, counter } from './measure';
import { recordEvent } from './sink';

interface InstallOptions {
  /** Optional callback the host can use to expose the live entity count. */
  getHtmlMarkerCount?: () => number;
}

interface InstalledHandle {
  dispose: () => void;
}

export function installCesiumMarks(viewer: Viewer, options: InstallOptions = {}): InstalledHandle {
  const disposers: Array<() => void> = [];

  // ── Tile-load progress + settle timing ──────────────────────────────
  let lastMoveStart: number | null = null;
  let lastTileQueue = 0;
  const onTileProgress = (queued: number): void => {
    lastTileQueue = queued;
    counter('cesium', 'cesium.tilesQueued', queued);
    if (queued === 0 && lastMoveStart != null) {
      const settleMs = performance.now() - lastMoveStart;
      recordEvent({
        category: 'cesium',
        name: 'cesium.settle',
        t: lastMoveStart,
        dur: settleMs,
        args: { lastTileQueue: 0 },
      });
      lastMoveStart = null;
    }
  };
  viewer.scene.globe.tileLoadProgressEvent.addEventListener(onTileProgress);
  disposers.push(() => viewer.scene.globe.tileLoadProgressEvent.removeEventListener(onTileProgress));

  const onMoveStart = (): void => {
    // Only set a new "settle clock" if we aren't already mid-settle.
    if (lastMoveStart == null) {
      lastMoveStart = performance.now();
      mark('Cesium', 'cesium.moveStart', { tooltip: 'Camera move started; settle timer running' });
    }
  };
  viewer.camera.moveStart.addEventListener(onMoveStart);
  disposers.push(() => viewer.camera.moveStart.removeEventListener(onMoveStart));

  const onMoveEnd = (): void => {
    mark('Cesium', 'cesium.moveEnd', {
      tooltip: 'Camera move ended; settle resolves on next tileLoadProgress=0',
      properties: { tilesQueuedAtMoveEnd: lastTileQueue },
    });
  };
  viewer.camera.moveEnd.addEventListener(onMoveEnd);
  disposers.push(() => viewer.camera.moveEnd.removeEventListener(onMoveEnd));

  const onMorphComplete = (): void => {
    mark('Cesium', 'cesium.morphComplete', { tooltip: '2D/3D morph finished' });
  };
  viewer.scene.morphComplete.addEventListener(onMorphComplete);
  disposers.push(() => viewer.scene.morphComplete.removeEventListener(onMorphComplete));

  // ── 1 Hz scene-state sampler ────────────────────────────────────────
  // Captures entity count + HTML marker count + render mode flags.
  // Cheap (no allocations beyond the event itself) and gives the HUD
  // a counter graph to detect leaks in real time.
  const samplerId = window.setInterval(() => {
    const entities = viewer.entities.values.length;
    counter('cesium', 'cesium.entities', entities);
    if (options.getHtmlMarkerCount) {
      counter('cesium', 'cesium.htmlMarkers', options.getHtmlMarkerCount());
    }
    counter('cesium', 'cesium.tilesQueued', lastTileQueue);
  }, 1000);
  disposers.push(() => window.clearInterval(samplerId));

  return {
    dispose: () => {
      for (const d of disposers) {
        try {
          d();
        } catch {
          /* swallowed — viewer might already be destroyed */
        }
      }
    },
  };
}
