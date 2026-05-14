/**
 * Per-tile asset switcher. Replaces the static camera label that used
 * to live in the top-start area of the HUD with a pill-style
 * `DropdownMenu` trigger that lists every available device, grouped
 * by type (cameras → drones).
 *
 * Behaviour:
 *  - The currently-mounted camera is rendered with a check mark and
 *    `aria-current="true"`. Clicking it is a silent no-op (Radix
 *    closes the menu, we never fire `onSwapAsset`).
 *  - A device that's pinned in another tile is rendered `disabled`
 *    with an "in another tile" hint to the right. The picker never
 *    causes a hidden swap — that matches the operator's
 *    `disable_already_pinned` choice from the plan.
 *  - Otherwise clicking fires `onSwapAsset(id)`. The panel reuses the
 *    same `handleSwapFeed` path drag-drop uses, so playback resets
 *    cleanly between cameras.
 *
 * The trigger uses the same glassy chrome as the rest of the top
 * HUD chrome (`bg-black/35` → `bg-black/55` on hover), and is the
 * first interactive element inside `CameraTopHud` so the parent
 * gradient still backs it.
 *
 * Defensive disabling: when `availableAssets` is empty (or only
 * contains this tile's own asset and no others), the trigger
 * disables itself and drops the chevron — there's nothing to switch
 * *to*, so opening an empty menu would be cruel.
 */

import { Camera, Check, ChevronDown, Plane } from '@/lib/icons/central';
import { useIsRtl } from '@/lib/direction';
import { useStrings } from '@/lib/intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

export interface PickerAsset {
  id: string;
  label: string;
  type: 'camera' | 'drone';
}

interface CameraAssetPickerProps {
  currentCameraId: string;
  currentLabel: string;
  availableAssets: PickerAsset[];
  pinnedCameraIds: Set<string>;
  onSwapAsset: (cameraId: string) => void;
}

export function CameraAssetPicker({
  currentCameraId,
  currentLabel,
  availableAssets,
  pinnedCameraIds,
  onSwapAsset,
}: CameraAssetPickerProps) {
  const tile = useStrings().camera.feedTile;
  // Tile content (camera label, drone names, item rows) is locale-aware
  // (Hebrew in RTL, English in LTR), so the dropdown follows app direction.
  // Setting `dir` explicitly here — rather than relying on Radix's
  // DirectionProvider context — makes the picker robust against any
  // surrounding LTR `<DirIsland>` chrome (the camera HUD has several:
  // CameraControlBar, DroneHud, CameraTelemetryStrip, PlaybackTimeline).
  // With `align="start"` + the right `dir`, Radix's Popper computes the
  // transform-origin at the start corner of the trigger automatically:
  //   - LTR: top-left → menu grows from the trigger's left edge
  //   - RTL: top-right → menu grows from the trigger's right edge
  const isRtl = useIsRtl();
  const dir: 'rtl' | 'ltr' = isRtl ? 'rtl' : 'ltr';

  // Group + sort once per render. The list is small (low double-digit
  // device counts at most), so a flat sort is cheaper than memoising.
  const cameras = availableAssets
    .filter((a) => a.type === 'camera')
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label));
  const drones = availableAssets
    .filter((a) => a.type === 'drone')
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label));

  // Are there any *other* assets the operator could swap to? If not,
  // collapse the trigger into a non-interactive pill — the chevron is
  // a lie when there's nothing to pick.
  const hasOtherSwitchable = availableAssets.some(
    (a) => a.id !== currentCameraId,
  );

  return (
    <DropdownMenu dir={dir}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={tile.switchAssetTriggerAriaLabel}
          disabled={!hasOtherSwitchable}
          className={`pointer-events-auto inline-flex items-center gap-1 px-2 py-1 rounded-sm
            bg-black/35 backdrop-blur-sm ring-1 ring-inset ring-white/10
            text-[11px] font-medium text-white/90 leading-none
            transition-colors duration-150 ease-out
            hover:bg-black/55 hover:text-white
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40
            data-[state=open]:bg-black/55 data-[state=open]:text-white
            disabled:opacity-60 disabled:cursor-default disabled:hover:bg-black/35`}
        >
          <span className="truncate max-w-[14ch]">{currentLabel}</span>
          {hasOtherSwitchable && (
            <ChevronDown
              size={12}
              aria-hidden="true"
              className="text-white/70"
            />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={4}
        className="min-w-[12rem]"
      >
        {cameras.length > 0 && (
          <>
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {tile.switchAssetSectionCameras}
            </DropdownMenuLabel>
            {cameras.map((asset) => (
              <AssetRow
                key={asset.id}
                asset={asset}
                currentCameraId={currentCameraId}
                pinnedCameraIds={pinnedCameraIds}
                pinnedHint={tile.assetPinnedElsewhere}
                onSwapAsset={onSwapAsset}
              />
            ))}
          </>
        )}

        {cameras.length > 0 && drones.length > 0 && <DropdownMenuSeparator />}

        {drones.length > 0 && (
          <>
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {tile.switchAssetSectionDrones}
            </DropdownMenuLabel>
            {drones.map((asset) => (
              <AssetRow
                key={asset.id}
                asset={asset}
                currentCameraId={currentCameraId}
                pinnedCameraIds={pinnedCameraIds}
                pinnedHint={tile.assetPinnedElsewhere}
                onSwapAsset={onSwapAsset}
              />
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface AssetRowProps {
  asset: PickerAsset;
  currentCameraId: string;
  pinnedCameraIds: Set<string>;
  pinnedHint: string;
  onSwapAsset: (cameraId: string) => void;
}

function AssetRow({
  asset,
  currentCameraId,
  pinnedCameraIds,
  pinnedHint,
  onSwapAsset,
}: AssetRowProps) {
  const isCurrent = asset.id === currentCameraId;
  // "Pinned elsewhere" only counts when it's pinned in a *different*
  // tile — the current tile naturally pins its own asset.
  const isPinnedElsewhere = !isCurrent && pinnedCameraIds.has(asset.id);
  const TypeIcon = asset.type === 'drone' ? Plane : Camera;

  return (
    <DropdownMenuItem
      // Disabled covers both the silent no-op for the current tile and
      // the hard "can't swap to something already pinned" case. The
      // current row gets aria-current so screen readers announce it as
      // the active selection even though it isn't selectable.
      disabled={isCurrent || isPinnedElsewhere}
      aria-current={isCurrent ? 'true' : undefined}
      onSelect={() => {
        if (isCurrent || isPinnedElsewhere) return;
        onSwapAsset(asset.id);
      }}
      className="gap-2"
    >
      <TypeIcon
        size={14}
        aria-hidden="true"
        className="text-muted-foreground"
      />
      <span className="flex-1 truncate">{asset.label}</span>
      {isPinnedElsewhere && (
        <span className="text-[10px] text-muted-foreground ms-auto">
          {pinnedHint}
        </span>
      )}
      {isCurrent && (
        <Check
          size={14}
          aria-hidden="true"
          className="text-foreground ms-auto"
        />
      )}
    </DropdownMenuItem>
  );
}
