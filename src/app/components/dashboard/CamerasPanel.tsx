/**
 * CamerasPanel — wires `<VideoPanel>` (camera-v2) into the
 * Gridblock left panel. Driven by `useVideoFeeds` for the feeds
 * + layout slice and `useDevicesAndAssets` for the per-camera /
 * per-drone label, status, and asset-picker derivations that the
 * legacy dashboard owns inline.
 *
 * UX trade-off the v2 surface accepts: in the single-left-panel
 * model the operator can't see the target list and the videos
 * simultaneously the way the legacy three-column layout allows.
 * Validate with the user before cutover; if it bites, the shell
 * supports adding a 4th wide-column slot.
 */
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { VideoPanel } from "@/app/components/camera-v2/VideoPanel";
import { CAMERA_ASSETS } from "@/app/components/tacticalAssets";
import type { PickerAsset } from "@/app/components/camera-v2/CameraAssetPicker";
import type {
  CameraFeed,
  CameraStatus,
  DetectionBox,
  LayoutKind,
} from "@/app/components/camera-v2/types";
import type { FriendlyDrone } from "@/app/hooks/useTacticalTargets";
import { MAX_VIDEO_FEEDS } from "@/app/hooks/useVideoFeeds";

const VIDEO_SRC_DAY = "/videos/target-feed.mov";
const VIDEO_SRC_NIGHT = "/videos/weapon-feed.mp4";
const VIDEO_SRC_PLAYBACK = "/videos/weapon-feed.mp4";

interface AssetLike {
  id: string;
  name: string;
  type: string;
}

interface CamerasPanelProps {
  feeds: CameraFeed[];
  onFeedsChange: (feeds: CameraFeed[]) => void;

  layout: LayoutKind;
  onLayoutChange: (next: LayoutKind) => void;

  heroIndex: number;
  onHeroChange: (next: number) => void;

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
}

/**
 * Stable empty maps keep memoised derivations referentially equal
 * across renders when the underlying inputs are identical.
 */
const EMPTY_DETECTIONS: Record<string, DetectionBox[]> = {};

function CamerasPanelImpl({
  feeds,
  onFeedsChange,
  layout,
  onLayoutChange,
  heroIndex,
  onHeroChange,
  cameraOwnership,
  setCameraOwnership,
  cameraZoomById,
  setCameraZoomById,
  allDevices,
  friendlyDrones,
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
      // No targeting backend yet — record receipt; the in-feed
      // flash from `DesignateTargetOverlay` is the visual.
      // eslint-disable-next-line no-console
      console.info("[v2] designate target", {
        cameraId,
        normX: Number(normX.toFixed(3)),
        normY: Number(normY.toFixed(3)),
      });
    },
    [],
  );

  // LRU swap path for `<VideoPanel onPinDevice>` — same logic as
  // the legacy dashboard. Empty slot → fill; room → append; full
  // → replace the camera focused least recently.
  const focusOrderRef = useRef<string[]>([]);
  const handleTileFocus = useCallback((cameraId: string) => {
    if (!cameraId) return;
    focusOrderRef.current = [
      cameraId,
      ...focusOrderRef.current.filter((id) => id !== cameraId),
    ];
  }, []);

  const handlePinDevice = useCallback(
    (deviceId: string) => {
      const next = (() => {
        if (feeds.some((f) => f.cameraId === deviceId)) return feeds;
        const emptyIdx = feeds.findIndex((f) => !f.cameraId);
        if (emptyIdx >= 0) {
          return feeds.map((f, i) =>
            i === emptyIdx
              ? { ...f, cameraId: deviceId, mode: "day", playback: undefined }
              : f,
          );
        }
        if (feeds.length < MAX_VIDEO_FEEDS) {
          return [
            ...feeds,
            { cameraId: deviceId, mode: "day" } as CameraFeed,
          ];
        }
        const order = focusOrderRef.current;
        const lruCameraId = [...feeds]
          .map((f) => f.cameraId)
          .sort((a, b) => {
            const ai = order.indexOf(a);
            const bi = order.indexOf(b);
            return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
          })
          .pop();
        if (!lruCameraId) return feeds;
        return feeds.map((f) =>
          f.cameraId === lruCameraId
            ? { ...f, cameraId: deviceId, mode: "day", playback: undefined }
            : f,
        );
      })();
      if (next !== feeds) onFeedsChange(next);
    },
    [feeds, onFeedsChange],
  );

  return (
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
      onPinDevice={handlePinDevice}
      onTileFocus={handleTileFocus}
      onZoomChange={handleZoomChange}
      onDesignateTarget={handleDesignateTarget}
      layout={layout}
      onLayoutChange={onLayoutChange}
      heroIndex={heroIndex}
      onHeroChange={onHeroChange}
      availableAssets={availableAssets}
    />
  );
}

export const CamerasPanel = memo(CamerasPanelImpl);
CamerasPanel.displayName = "CamerasPanel";
