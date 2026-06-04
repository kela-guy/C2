/**
 * Production video HUD panel — the "video HUD" we designed in the sandbox,
 * wired into the live app. Renders the active camera feed with the full HUD
 * chrome (device select, bottom control bar, setpoint rail for airborne
 * assets, connectivity badge for cameras, AI detection triangles, and the
 * center crosshair) on top of {@link CameraFeedTile}.
 *
 * Drop-in replacement for the legacy `CameraViewerPanel`: it takes the same
 * `{ cameraId }[]` feed list so `Dashboard` only swaps the component. All HUD
 * interaction state (day/night, zoom, detections, control, dock/stop) is held
 * locally because the app has no live PTZ / ownership backend yet — same
 * stance as the sandbox.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from 'react';
import { CameraFeedTile } from '@/app/components/camera-v2/CameraFeedTile';
import { useCrosshairBloom } from '@/app/components/camera-v2/useCrosshairBloom';
import type {
  CameraFeed,
  CameraStatus,
  DayNightMode,
  DetectionBox,
  FeedDeviceType,
} from '@/app/components/camera-v2/types';
import { DirIsland } from '@/lib/direction';
import type { IconComponent, IconProps } from '@/lib/icons/central';
import { CAMERA_ASSETS } from '@/app/components/tacticalAssets';
import { useDevicesFromAssets } from '@/app/components/useDevicesFromAssets';
import type { Device } from '@/app/components/DevicesPanel';
import { SandboxSetpointRail } from './SandboxSetpointRail';
import { SandboxBottomChrome } from './SandboxBottomChrome';
import { SandboxDeviceSelect, type SandboxDevice } from './SandboxDeviceSelect';
import { CameraSlewCue } from './CameraSlewCue';
import { DeviceConnectivityBadge } from './DeviceConnectivityBadge';
import { AiDetectionTriangles } from './AiDetectionTriangles';

const VIDEO_SRC_DAY = '/videos/target-feed.mov';
const VIDEO_SRC_NIGHT = '/videos/weapon-feed.mp4';

const noop = () => {};

export interface VideoHudPanelFeed {
  cameraId: string;
}

export interface VideoHudPanelProps {
  feeds: VideoHudPanelFeed[];
  onFeedsChange: (feeds: VideoHudPanelFeed[]) => void;
  onCameraHover?: (id: string | null) => void;
  /** Reserved for parity with the legacy panel; the HUD does not branch on it. */
  weaponFeedActive?: boolean;
}

/**
 * The asset glyphs (`CameraIcon`, drone glyph, …) paint via a `size`/`fill`
 * prop rather than the `IconComponent` surface, so wrap each in a thin adapter
 * that forwards `size`/`className` — mirrors the sandbox `assetGlyph`.
 */
function toIconComponent(Glyph: ComponentType<{ size?: number }>): IconComponent {
  return function HudDeviceGlyph({ size = 16, className, 'aria-hidden': ariaHidden }: IconProps) {
    const px = typeof size === 'number' ? size : parseInt(String(size), 10) || 16;
    return (
      <span className={className} aria-hidden={ariaHidden} style={{ display: 'inline-flex' }}>
        <Glyph size={px} />
      </span>
    );
  };
}

function deviceFeedType(device: Device | undefined): FeedDeviceType {
  return device?.type === 'drone' ? 'drone' : 'camera';
}

export function VideoHudPanel({ feeds, onFeedsChange, onCameraHover }: VideoHudPanelProps) {
  const devices = useDevicesFromAssets();
  const deviceById = useMemo(() => {
    const map: Record<string, Device> = {};
    for (const d of devices) map[d.id] = d;
    return map;
  }, [devices]);

  const cameraAssetById = useMemo(
    () => Object.fromEntries(CAMERA_ASSETS.map((c) => [c.id, c])),
    [],
  );

  const feedIds = useMemo(() => feeds.map((f) => f.cameraId), [feeds]);

  const [activeCameraId, setActiveCameraId] = useState<string>(feedIds[0] ?? '');
  // Keep the active selection valid as feeds are added / removed.
  useEffect(() => {
    if (feedIds.length === 0) return;
    if (!feedIds.includes(activeCameraId)) setActiveCameraId(feedIds[0]);
  }, [feedIds, activeCameraId]);

  // Per-feed HUD state — local because there's no live backend yet.
  const [modeById, setModeById] = useState<Record<string, DayNightMode>>({});
  const [detectionsById, setDetectionsById] = useState<Record<string, boolean>>({});
  const [ownerById, setOwnerById] = useState<Record<string, 'self' | 'none'>>({});
  const [zoom, setZoom] = useState(2.4);
  const [targetAltitudeM, setTargetAltitudeM] = useState(140);
  const [targetVelocityMps, setTargetVelocityMps] = useState(10);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dockArmed, setDockArmed] = useState(false);
  const [stopArmed, setStopArmed] = useState(false);
  const [mutedAlerts, setMutedAlerts] = useState(false);
  const [videoHovered, setVideoHovered] = useState(false);

  const activeDevice = deviceById[activeCameraId];
  const activeAsset = cameraAssetById[activeCameraId];
  const deviceType = deviceFeedType(activeDevice);
  const isAirborne = deviceType === 'drone';
  const mode = modeById[activeCameraId] ?? 'day';
  const detectionsOn = !!detectionsById[activeCameraId];
  const controlOwner: CameraStatus['controlOwner'] = ownerById[activeCameraId] ?? 'none';
  const isManual = controlOwner === 'none';
  const writeDisabled = false;

  // No live PTZ/heading telemetry yet — the crosshair rests at home.
  const crosshairBloom = useCrosshairBloom(false);

  const hudDevices = useMemo<SandboxDevice[]>(
    () =>
      feedIds.map((id) => {
        const device = deviceById[id];
        const asset = cameraAssetById[id];
        const label = device?.name ?? asset?.typeLabel ?? id;
        const sublabel = device?.type === 'drone' ? 'Drone' : 'Camera';
        const Glyph = device?.Icon as ComponentType<{ size?: number }> | undefined;
        return {
          id,
          label: id,
          sublabel: label !== id ? label : sublabel,
          Icon: Glyph ? toIconComponent(Glyph) : toIconComponent(() => null),
        };
      }),
    [feedIds, deviceById, cameraAssetById],
  );

  const status = useMemo<CameraStatus>(
    () => ({
      bearingDeg: activeAsset?.bearingDeg ?? activeDevice?.bearingDeg ?? 0,
      fovDeg: activeAsset?.fovDeg ?? activeDevice?.fovDeg ?? 52,
      controlOwner,
      deviceType,
      altitudeM: isAirborne ? 120 : undefined,
      velocityMps: isAirborne ? 8.5 : undefined,
      batteryPct: isAirborne ? (activeDevice?.batteryPct ?? 74) : undefined,
      areaName: undefined,
    }),
    [activeAsset, activeDevice, controlOwner, deviceType, isAirborne],
  );

  const tileFeed = useMemo<CameraFeed>(
    () => ({ cameraId: activeCameraId, mode, showDetections: false }),
    [activeCameraId, mode],
  );

  const detections = useMemo<DetectionBox[]>(() => [], []);

  const handleModeToggle = useCallback(() => {
    setModeById((prev) => ({ ...prev, [activeCameraId]: (prev[activeCameraId] ?? 'day') === 'day' ? 'night' : 'day' }));
  }, [activeCameraId]);

  const handleDetectionsToggle = useCallback(() => {
    setDetectionsById((prev) => ({ ...prev, [activeCameraId]: !prev[activeCameraId] }));
  }, [activeCameraId]);

  const handleTakeRelease = useCallback(() => {
    setOwnerById((prev) => ({ ...prev, [activeCameraId]: (prev[activeCameraId] ?? 'none') === 'self' ? 'none' : 'self' }));
  }, [activeCameraId]);

  const handleFullscreenToggle = useCallback(() => setIsFullscreen((v) => !v), []);
  const handleDockToggle = useCallback(() => setDockArmed((v) => !v), []);
  const handleStopToggle = useCallback(() => setStopArmed((v) => !v), []);
  const handleMutedAlertsToggle = useCallback(() => setMutedAlerts((v) => !v), []);
  const handleVideoEnter = useCallback(() => setVideoHovered(true), []);
  const handleVideoLeave = useCallback(() => setVideoHovered(false), []);

  const handleDeviceChange = useCallback(
    (id: string) => {
      setActiveCameraId(id);
      onCameraHover?.(id);
    },
    [onCameraHover],
  );

  const handleDropDevice = useCallback(
    (item: { cameraId: string }) => {
      if (!item.cameraId) return;
      if (!feedIds.includes(item.cameraId)) onFeedsChange([...feeds, { cameraId: item.cameraId }]);
      setActiveCameraId(item.cameraId);
    },
    [feedIds, feeds, onFeedsChange],
  );

  if (feeds.length === 0 || !activeCameraId) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-sm text-white/40">
        No camera feed
      </div>
    );
  }

  const shellClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-surface-void'
    : 'relative h-full w-full bg-black';

  return (
    <div
      className={shellClass}
      onPointerEnter={handleVideoEnter}
      onPointerLeave={handleVideoLeave}
      onMouseEnter={() => onCameraHover?.(activeCameraId)}
      onMouseLeave={() => onCameraHover?.(null)}
    >
      <CameraFeedTile
        feed={tileFeed}
        cameraLabel={`${activeDevice?.name ?? activeAsset?.typeLabel ?? activeCameraId}`}
        status={status}
        detections={detections}
        videoSrcDay={VIDEO_SRC_DAY}
        videoSrcNight={VIDEO_SRC_NIGHT}
        isFullscreen={isFullscreen}
        suppressDroneHud
        suppressTelemetryStrip
        onTakeControl={handleTakeRelease}
        onReleaseControl={handleTakeRelease}
        onModeToggle={handleModeToggle}
        onDetectionsToggle={handleDetectionsToggle}
        onDesignateModeToggle={noop}
        onPlaybackToggle={noop}
        onPlaybackChange={noop}
        onZoomChange={setZoom}
        onFullscreenToggle={handleFullscreenToggle}
        onDropDevice={handleDropDevice}
      />

      {hudDevices.length > 0 && (
        <DirIsland direction="ltr" className="absolute left-3 top-3 z-30">
          <SandboxDeviceSelect
            devices={hudDevices}
            value={activeCameraId}
            onChange={handleDeviceChange}
          />
        </DirIsland>
      )}

      <CameraSlewCue deltaDeg={0} bloom={crosshairBloom} />

      {detectionsOn && <AiDetectionTriangles detections={detections} />}

      {isAirborne && (
        <SandboxSetpointRail
          altitudeM={status.altitudeM ?? 0}
          velocityMps={status.velocityMps ?? 0}
          batteryPct={status.batteryPct ?? undefined}
          targetAltitudeM={targetAltitudeM}
          targetVelocityMps={targetVelocityMps}
          disabled={writeDisabled}
          design="tube-chips"
          onTargetAltitudeChange={setTargetAltitudeM}
          onTargetVelocityChange={setTargetVelocityMps}
        />
      )}

      {!isAirborne && <DeviceConnectivityBadge manual={isManual} />}

      <SandboxBottomChrome
        mode={mode}
        onModeToggle={handleModeToggle}
        zoomLevel={zoom}
        onZoomChange={setZoom}
        deviceType={deviceType}
        controlOwner={controlOwner}
        onTakeRelease={handleTakeRelease}
        detectionsOn={detectionsOn}
        playbackOn={false}
        onDetectionsToggle={handleDetectionsToggle}
        onPlaybackToggle={noop}
        settingsOpen={settingsOpen}
        onSettingsOpenChange={setSettingsOpen}
        isFullscreen={isFullscreen}
        onFullscreenToggle={handleFullscreenToggle}
        dockArmed={dockArmed}
        stopArmed={stopArmed}
        onDockToggle={handleDockToggle}
        onStopToggle={handleStopToggle}
        videoHovered={videoHovered}
        mutedAlerts={mutedAlerts}
        onMutedAlertsToggle={handleMutedAlertsToggle}
        deviceKind={deviceType}
        alertsAsSwitch
      />
    </div>
  );
}
