/**
 * Always-visible top HUD overlay for a camera feed tile.
 *
 * v2 anatomy: just the CoD-Warzone heading strip in the center. The
 * top-left badge cluster (LIVE / DAY-IR / camera name / linked-from /
 * assignment) was removed in favour of:
 *   - LIVE / mode are visible from the bottom control bar.
 *   - The camera name moves to the settings popover (About this camera).
 */

import { CameraCompassStrip } from './CameraCompassStrip';
import type { CameraStatus, DayNightMode } from './types';

interface CameraTopHudProps {
  cameraLabel: string;
  mode: DayNightMode;
  status: CameraStatus;
  onAssignmentClick?: () => void;
}

export function CameraTopHud({ status }: CameraTopHudProps) {
  return (
    <div className="absolute inset-x-0 top-0 z-20 pointer-events-none">
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/55 via-black/20 to-transparent" />

      <div className="relative flex justify-center pt-2.5 px-3">
        <CameraCompassStrip
          bearingDeg={status.bearingDeg}
          className="pointer-events-none"
        />
      </div>
    </div>
  );
}
