/**
 * Always-visible top HUD overlay for a camera feed tile.
 *
 * v2 anatomy:
 *   - Top-start: pill-style asset picker (was a static label).
 *     Replaces the old top-left badge cluster — switching the device
 *     mounted in this tile is now a single, well-discovered click.
 *   - Center: CoD-Warzone heading strip.
 *
 * The asset picker is omitted when there are no other devices to
 * switch to — in that case the picker self-disables but we still
 * render it so the operator sees the camera label in its usual spot.
 *
 * `pointer-events-none` lives on the wrapper so the live frame stays
 * interactive (designate-target click-through, focus, drop-target),
 * and individual children re-enable pointer events as needed.
 */

import { CameraCompassStrip } from './CameraCompassStrip';
import { CameraAssetPicker, type PickerAsset } from './CameraAssetPicker';
import type { CameraStatus, DayNightMode } from './types';

interface CameraTopHudProps {
  cameraLabel: string;
  /** Reserved for future surfaces that re-introduce a mode badge. */
  mode: DayNightMode;
  status: CameraStatus;
  onAssignmentClick?: () => void;
  /** Identity of the camera currently mounted in this tile. Required
   *  for the asset picker to mark its current selection. */
  cameraId: string;
  /** Every device the operator could swap into this tile. Empty array
   *  hides the picker entirely (the camera label is still rendered as
   *  a non-interactive pill). */
  availableAssets: PickerAsset[];
  /** Camera ids currently mounted in *any* tile. Used to disable the
   *  matching rows in the picker so the operator can't double-mount
   *  the same device. */
  pinnedCameraIds: Set<string>;
  onSwapAsset: (cameraId: string) => void;
}

export function CameraTopHud({
  cameraLabel,
  status,
  cameraId,
  availableAssets,
  pinnedCameraIds,
  onSwapAsset,
}: CameraTopHudProps) {
  return (
    <div className="absolute inset-x-0 top-0 z-20 pointer-events-none">
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/55 via-black/20 to-transparent" />

      <div className="relative flex items-start justify-between gap-2 pt-2.5 px-3">
        <CameraAssetPicker
          currentCameraId={cameraId}
          currentLabel={cameraLabel}
          availableAssets={availableAssets}
          pinnedCameraIds={pinnedCameraIds}
          onSwapAsset={onSwapAsset}
        />
        <CameraCompassStrip
          bearingDeg={status.bearingDeg}
          className="pointer-events-none"
        />
        {/* Spacer that mirrors the picker's footprint so the compass
            strip stays visually centred regardless of the device
            label's length. The picker max-truncates at 14ch, so a
            ~6rem reservation matches it within tolerance. */}
        <div aria-hidden="true" className="w-[6rem] shrink-0" />
      </div>
    </div>
  );
}
