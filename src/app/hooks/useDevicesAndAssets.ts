/**
 * useDevicesAndAssets — convenience wrapper that combines the
 * source-of-truth device list (`useDevicesFromAssets`) with the
 * dashboard's UI selection state (`devicesPanelOpen`,
 * `selectedAssetId`, `focusedDeviceId`).
 *
 * The legacy Dashboard already mounts each of these primitives
 * inline — keeping them in one hook lets the new GridblockShell-based
 * dashboard subscribe to the same shape with a single line:
 *
 *     const devices = useDevicesAndAssets();
 *
 * Each setter remains exposed so callers can imperatively wire
 * panel-open / asset-selected from outside (e.g. `?asset=` query
 * param wiring, or the tour notifier).
 */

import { useCallback, useState } from "react";
import { useDevicesFromAssets } from "@/app/components/useDevicesFromAssets";
import type { Device } from "@/app/components/DevicesPanel";

export interface DevicesAndAssetsApi {
  /** Full list of devices derived from the static asset registries. */
  allDevices: Device[];

  /** Whether the devices panel chrome is currently visible. */
  devicesPanelOpen: boolean;
  setDevicesPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;

  /**
   * `null` when no asset is selected; otherwise the selected asset
   * id (cameras, radars, lidars, hives, weapons share one id space).
   */
  selectedAssetId: string | null;
  setSelectedAssetId: React.Dispatch<React.SetStateAction<string | null>>;

  /**
   * Device id currently focused via the devices panel UI (slim
   * highlight on the row + crosshair on the map). May be set
   * without `devicesPanelOpen=true` when other surfaces drive the
   * focus (e.g. tour step).
   */
  focusedDeviceId: string | null;
  setFocusedDeviceId: React.Dispatch<React.SetStateAction<string | null>>;

  /** Helper — close the panel + clear every linked selection. */
  closeAndClear: () => void;
}

export function useDevicesAndAssets(): DevicesAndAssetsApi {
  const allDevices = useDevicesFromAssets();
  const [devicesPanelOpen, setDevicesPanelOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [focusedDeviceId, setFocusedDeviceId] = useState<string | null>(null);

  const closeAndClear = useCallback(() => {
    setDevicesPanelOpen(false);
    setSelectedAssetId(null);
    setFocusedDeviceId(null);
  }, []);

  return {
    allDevices,
    devicesPanelOpen,
    setDevicesPanelOpen,
    selectedAssetId,
    setSelectedAssetId,
    focusedDeviceId,
    setFocusedDeviceId,
    closeAndClear,
  };
}
