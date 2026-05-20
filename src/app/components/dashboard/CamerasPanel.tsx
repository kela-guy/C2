/**
 * CamerasPanel — wires `<VideoPanel>` (camera-v2) into the
 * Gridblock end panel and owns its own panel chrome so the header
 * can host camera-specific affordances (asset tabs, layout picker).
 *
 * Driven by `useVideoFeeds` for the feeds + layout slice and
 * `useDevicesAndAssets` for the per-camera / per-drone label,
 * status, and asset-picker derivations that the legacy dashboard
 * owns inline.
 */
import { memo, useCallback, useMemo, useState } from "react";
import { VideoPanel } from "@/app/components/camera-v2/VideoPanel";
import { CameraTabStrip } from "@/app/components/camera-v2/CameraTabStrip";
import { VideoLayoutPicker } from "@/app/components/camera-v2/VideoLayoutPicker";
import { CAMERA_ASSETS } from "@/app/components/tacticalAssets";
import type { PickerAsset } from "@/app/components/camera-v2/CameraAssetPicker";
import type {
  CameraFeed,
  CameraFeedTab,
  CameraStatus,
  DetectionBox,
  LayoutKind,
} from "@/app/components/camera-v2/types";
import type { FriendlyDrone } from "@/app/hooks/useTacticalTargets";
import { GridblockPanel } from "@/app/components/gridblock";

const VIDEO_SRC_DAY = "/videos/target-feed.mov";
const VIDEO_SRC_NIGHT = "/videos/weapon-feed.mp4";
const VIDEO_SRC_PLAYBACK = "/videos/weapon-feed.mp4";

interface AssetLike {
  id: string;
  name: string;
  type: string;
}

interface CamerasPanelProps {
  title: string;
  onClose: () => void;
  closeAriaLabel: string;
  closeTooltip: string;

  tabs: CameraFeedTab[];
  activeTabIndex: number;
  onActivateTab: (index: number) => void;
  onCloseTab: (index: number) => void;

  feeds: CameraFeed[];
  onFeedsChange: (feeds: CameraFeed[]) => void;

  layout: LayoutKind;
  onLayoutChange: (next: LayoutKind) => void;

  activeFeedIndex: number;
  onActiveFeedChange: (next: number) => void;

  cameraOwnership: Record<string, "self" | "other" | "none">;
  setCameraOwnership: React.Dispatch<
    React.SetStateAction<Record<string, "self" | "other" | "none">>
  >;
  cameraZoomById: Record<string, number>;
  setCameraZoomById: React.Dispatch<
    React.SetStateAction<Record<string, number>>
  >;

  allDevices: ReadonlyArray<AssetLike>;
  friendlyDrones: ReadonlyArray<FriendlyDrone>;

  pinnedDeviceIds: ReadonlySet<string>;
  onOpenDeviceTab: (deviceId: string) => void;
  onAddToActiveTab: (deviceId: string) => void;
  onAddToTab: (tabIndex: number, deviceId: string) => void;
  onMergeTab: (sourceTabIndex: number, targetTabIndex: number) => void;
  onUnpinFeed: (deviceId: string) => void;
  onTileFocus: (cameraId: string) => void;
  onTileHover: (cameraId: string | null) => void;
}

/**
 * Stable empty maps keep memoised derivations referentially equal
 * across renders when the underlying inputs are identical.
 */
const EMPTY_DETECTIONS: Record<string, DetectionBox[]> = {};

function CamerasPanelImpl({
  title,
  onClose,
  closeAriaLabel,
  closeTooltip,
  tabs,
  activeTabIndex,
  onActivateTab,
  onCloseTab,
  feeds,
  onFeedsChange,
  layout,
  onLayoutChange,
  activeFeedIndex,
  onActiveFeedChange,
  cameraOwnership,
  setCameraOwnership,
  cameraZoomById,
  setCameraZoomById,
  allDevices,
  friendlyDrones,
  pinnedDeviceIds,
  onOpenDeviceTab,
  onAddToActiveTab,
  onAddToTab,
  onMergeTab,
  onUnpinFeed,
  onTileFocus,
  onTileHover,
}: CamerasPanelProps) {
  // Local UI state that doesn't belong on the page yet — the
  // legacy dashboard kept these here too. Fullscreen toggle is a
  // panel-local affordance; designate-target is a dev-only stub
  // until a real targeting backend exists.
  const [fullscreen, setFullscreen] = useState(false);

  const cameraLabelById = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const c of CAMERA_ASSETS) map[c.id] = c.typeLabel;
    for (const d of allDevices) {
      if (d.type === "camera" || d.type === "drone") map[d.id] = d.name;
    }
    return map;
  }, [allDevices]);

  const availableAssets = useMemo<PickerAsset[]>(
    () =>
      allDevices
        .filter((d) => d.type === "camera" || d.type === "drone")
        .map((d) => ({
          id: d.id,
          label: cameraLabelById[d.id] ?? d.name,
          type: d.type as "camera" | "drone",
        })),
    [allDevices, cameraLabelById],
  );

  const pinnedCameraIds = useMemo(
    () => new Set(pinnedDeviceIds),
    [pinnedDeviceIds],
  );

  const statusByCameraId = useMemo<Record<string, CameraStatus>>(() => {
    const map: Record<string, CameraStatus> = {};
    for (const cam of CAMERA_ASSETS) {
      const owner = cameraOwnership[cam.id] ?? "none";
      map[cam.id] = {
        bearingDeg: cam.bearingDeg,
        fovDeg: cam.fovDeg,
        controlOwner: owner,
        deviceType: "camera",
        zoomLevel: cameraZoomById[cam.id] ?? 1,
      };
    }
    for (const drone of friendlyDrones) {
      const owner = cameraOwnership[drone.id] ?? "none";
      map[drone.id] = {
        bearingDeg: drone.headingDeg ?? 0,
        fovDeg: drone.fovDeg ?? 78,
        controlOwner: owner,
        deviceType: "drone",
        zoomLevel: cameraZoomById[drone.id] ?? 1,
      };
    }
    return map;
  }, [cameraOwnership, cameraZoomById, friendlyDrones]);

  const handleFullscreenToggle = useCallback(() => {
    setFullscreen((prev) => !prev);
  }, []);

  const handleTakeControl = useCallback(
    (cameraId: string) => {
      if (!cameraId) return;
      setCameraOwnership((prev) => ({ ...prev, [cameraId]: "self" }));
    },
    [setCameraOwnership],
  );
  const handleReleaseControl = useCallback(
    (cameraId: string) => {
      if (!cameraId) return;
      setCameraOwnership((prev) => ({ ...prev, [cameraId]: "none" }));
    },
    [setCameraOwnership],
  );
  const handleZoomChange = useCallback(
    (cameraId: string, zoomLevel: number) => {
      setCameraZoomById((prev) => ({ ...prev, [cameraId]: zoomLevel }));
    },
    [setCameraZoomById],
  );
  const handleDesignateTarget = useCallback(
    (cameraId: string, normX: number, normY: number) => {
      // eslint-disable-next-line no-console
      console.info("[v2] designate target", {
        cameraId,
        normX: Number(normX.toFixed(3)),
        normY: Number(normY.toFixed(3)),
      });
    },
    [],
  );

  const headerActions =
    tabs.length > 0 ? (
      <>
        <CameraTabStrip
          tabs={tabs}
          cameraLabelById={cameraLabelById}
          activeTabIndex={activeTabIndex}
          onActivate={onActivateTab}
          onClose={onCloseTab}
          onAddToTab={onAddToTab}
          onMergeTab={onMergeTab}
          onUnpinFeed={onUnpinFeed}
          availableAssets={availableAssets}
          pinnedCameraIds={pinnedCameraIds}
          onPin={onOpenDeviceTab}
          canPinMore
        />
        {feeds.length >= 2 ? (
          <VideoLayoutPicker
            value={layout}
            onChange={onLayoutChange}
            feedCount={feeds.length}
            variant="panelHeader"
            className="shrink-0"
          />
        ) : null}
      </>
    ) : undefined;

  return (
    <GridblockPanel
      title={tabs.length === 0 ? title : null}
      onClose={onClose}
      closeAriaLabel={closeAriaLabel}
      closeTooltip={closeTooltip}
      headerActions={headerActions}
      testId="dashboard-panel-cameras"
    >
      <VideoPanel
        feeds={feeds}
        onFeedsChange={onFeedsChange}
        cameraLabelById={cameraLabelById}
        statusByCameraId={statusByCameraId}
        detectionsByCameraId={EMPTY_DETECTIONS}
        videoSrcDay={VIDEO_SRC_DAY}
        videoSrcNight={VIDEO_SRC_NIGHT}
        videoSrcPlayback={VIDEO_SRC_PLAYBACK}
        fullscreen={fullscreen}
        onFullscreenToggle={handleFullscreenToggle}
        onTakeControl={handleTakeControl}
        onReleaseControl={handleReleaseControl}
        onAddToActiveTab={onAddToActiveTab}
        onTileFocus={onTileFocus}
        onTileHover={onTileHover}
        onZoomChange={handleZoomChange}
        onDesignateTarget={handleDesignateTarget}
        layout={layout}
        onLayoutChange={onLayoutChange}
        activeFeedIndex={activeFeedIndex}
        onActiveFeedChange={onActiveFeedChange}
        showLayoutPicker={false}
        showTileAssetPicker={false}
        availableAssets={availableAssets}
      />
    </GridblockPanel>
  );
}

export const CamerasPanel = memo(CamerasPanelImpl);
CamerasPanel.displayName = "CamerasPanel";
