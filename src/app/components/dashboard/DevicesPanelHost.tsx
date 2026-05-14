/**
 * DevicesPanelHost — wires the existing `<DevicesPanel>` into the
 * Gridblock left panel. The panel is fed by `useDevicesAndAssets`
 * (device list + selection state) at the page layer; this
 * component takes the slice it needs as props so the page is the
 * only place that knows the hook shape.
 *
 * `<DevicesPanel>` self-wraps in `<GridblockPanel>` (using the
 * unified rail chrome — same header height, close button, scroll
 * body, and sticky toolbar slot as Targets and Cameras). The host
 * doesn't need its own wrap, and Dashboard.tsx renders the Devices
 * tab the same way as every other rail panel.
 *
 * `onJamActivate`, `onFloodlightToggle`, `onSpeakerToggle` are
 * intentionally not wired yet: the legacy dashboard ties those to
 * device-specific simulation flows that haven't been ported. The
 * panel keeps rendering without them.
 */
import { memo, useCallback } from "react";
import { DevicesPanel } from "@/app/components/DevicesPanel";
import { useCameraPresets } from "@/app/components/useDevicesFromAssets";
import type { Device } from "@/app/components/DevicesPanel";
import { useStrings } from "@/lib/intl";

interface DevicesPanelHostProps {
  devices: Device[];
  open: boolean;
  onClose: () => void;
  focusedDeviceId: string | null;
  onSelectAsset: (id: string | null) => void;
  /**
   * Called when the operator clicks "fly to" on a device row. The
   * page should drive the map's focus-request state in response.
   */
  onFlyTo: (lat: number, lon: number) => void;
}

function DevicesPanelHostImpl({
  devices,
  open,
  onClose,
  focusedDeviceId,
  onSelectAsset,
  onFlyTo,
}: DevicesPanelHostProps) {
  const t = useStrings();
  const cameraPresets = useCameraPresets();

  // No-op hover handler — the v2 dashboard doesn't yet drive the
  // map's hovered-sensor halo from the devices panel. Wiring it
  // requires lifting `hoveredSensorIdFromCard` to the page; defer
  // until a follow-up.
  const handleHover = useCallback((_id: string | null) => {}, []);

  return (
    <DevicesPanel
      devices={devices}
      open={open}
      onClose={onClose}
      onFlyTo={onFlyTo}
      onDeviceHover={handleHover}
      onDeviceSelect={onSelectAsset}
      focusedDeviceId={focusedDeviceId}
      title={t.dashboard.devicesPanelTitle}
      closeAriaLabel={t.dashboard.devicesPanelClose}
      cameraPresets={cameraPresets}
      typeLabels={t.devices.typeLabels}
      connectionStateLabels={t.devices.connectionLabels}
      strings={t.devices.strings}
    />
  );
}

export const DevicesPanelHost = memo(DevicesPanelHostImpl);
DevicesPanelHost.displayName = "DevicesPanelHost";
