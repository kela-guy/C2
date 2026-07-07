import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CameraFeedTile } from '@/app/components/camera-v2/CameraFeedTile';
import type { CameraAngle } from '@/app/components/camera-v2/CameraSettingsMenu';
import { useCrosshairBloom } from '@/app/components/camera-v2/useCrosshairBloom';
import type {
  CameraFeed,
  CameraStatus,
  DetectionBox,
  DayNightMode,
  FeedDeviceType,
} from '@/app/components/camera-v2/types';
import { SandboxSetpointRail, type RailDesign } from './SandboxSetpointRail';
import { SandboxBottomChrome } from './SandboxBottomChrome';
import { AiDetectionTriangles } from './AiDetectionTriangles';
import { AutoTrackOverlay } from './AutoTrackOverlay';
import { DeviceConnectivityBadge } from './DeviceConnectivityBadge';
import { SandboxCompassControl } from './SandboxCompassControl';
import { CameraSlewCue } from './CameraSlewCue';
import { AiTriangleLab } from './lab/AiTriangleLab';
import type { CameraAngle as PathfinderCameraAngle } from './SandboxAngleToggle';
import { SandboxDeviceSelect, type SandboxDevice } from './SandboxDeviceSelect';
import { SandboxVideoContextMenu } from './SandboxVideoContextMenu';
import {
  useAnimatedAngle,
  useAnimatedValue,
  shortestDelta,
} from './useAnimatedValue';
import { DirIsland } from '@/lib/direction';
import type { ComponentType } from 'react';
import type { IconComponent, IconProps } from '@/lib/icons/central';
import { CameraIcon, RadarIcon } from '@/app/components/tacticalIcons';
import { DroneDeviceIcon } from '@/primitives/ProductIcons';

const PITCH_MIN = -90;
const PITCH_MAX = 15;

const SETTINGS_LABEL_OVERRIDES = {
  playbackLabel: 'חקירת וידאו',
  displaySection: 'שכבות',
  aiDetectionsLabel: 'אנליטיקות AI',
} as const;

const SANDBOX_CONTEXT_MENU = {
  coordinates: '688180 / 3593940',
  altitude: '45 m',
  lookAtLabel: 'הסתכל לנקודה',
  createTargetLabel: 'Create target',
} as const;

const VIDEO_SRC_DAY = '/videos/target-feed.mov';
const VIDEO_SRC_NIGHT = '/videos/weapon-feed.mp4';
const CAMERA_ID = 'sandbox-drone-1';

export type SandboxAssetType = FeedDeviceType | 'pathfinder';

const ASSET_OPTIONS: { id: SandboxAssetType; label: string }[] = [
  { id: 'drone', label: 'Drone · ALT/SPD + dock chrome' },
  { id: 'camera', label: 'Camera · minimal HUD' },
  { id: 'pathfinder', label: 'Pathfinder · auto-track + angles' },
];

function assetToDeviceType(asset: SandboxAssetType): FeedDeviceType {
  return asset === 'camera' ? 'camera' : 'drone';
}

interface SandboxDeviceOption extends SandboxDevice {
  assetType: SandboxAssetType;
}

// The project's real asset glyphs (`DroneDeviceIcon`, `CameraIcon`, …) paint
// via a `fill` prop and don't take the `IconComponent` surface, so wrap each in
// a thin adapter that forwards `size`/`className` and lets the menu's
// `[&_svg]:size-*` rules size it.
function assetGlyph(Glyph: ComponentType<{ size?: number }>): IconComponent {
  return function AssetGlyph({ size = 16, className, 'aria-hidden': ariaHidden }: IconProps) {
    const px = typeof size === 'number' ? size : parseInt(size, 10) || 16;
    return (
      <span className={className} aria-hidden={ariaHidden} style={{ display: 'inline-flex' }}>
        <Glyph size={px} />
      </span>
    );
  };
}

const DroneAssetIcon = assetGlyph(DroneDeviceIcon);
const CameraAssetIcon = assetGlyph(CameraIcon);
const PathfinderAssetIcon = assetGlyph(RadarIcon);

const DEVICES: SandboxDeviceOption[] = [
  { id: 'PTH-01', label: 'PTH-01', sublabel: 'Pathfinder', assetType: 'pathfinder', Icon: PathfinderAssetIcon },
  { id: 'DRN-01', label: 'DRN-01', sublabel: 'Drone', assetType: 'drone', Icon: DroneAssetIcon },
  { id: 'DRN-02', label: 'DRN-02', sublabel: 'Drone', assetType: 'drone', Icon: DroneAssetIcon },
  { id: 'CAM-01', label: 'CAM-01', sublabel: 'Camera', assetType: 'camera', Icon: CameraAssetIcon },
];

function deviceById(id: string): SandboxDeviceOption {
  return DEVICES.find((d) => d.id === id) ?? DEVICES[0];
}

function firstDeviceForAsset(asset: SandboxAssetType): SandboxDeviceOption {
  return DEVICES.find((d) => d.assetType === asset) ?? DEVICES[0];
}

const RAIL_DESIGN: RailDesign = 'tube-chips';

function baseStatus(
  controlOwner: CameraStatus['controlOwner'],
  deviceType: FeedDeviceType,
  bearingDeg: number,
): CameraStatus {
  return {
    bearingDeg,
    fovDeg: 52,
    controlOwner,
    deviceType,
    altitudeM: 120,
    velocityMps: 8.5,
    batteryPct: 74,
    distanceFromHomeM: 412,
    signalPct: 88,
    areaName: 'Sector 7',
  };
}

const SANDBOX_DETECTIONS: DetectionBox[] = [
  { id: 'det-1', x: 0.34, y: 0.42, w: 0.12, h: 0.18, label: 'Person', confidence: 0.92 },
  { id: 'det-2', x: 0.58, y: 0.36, w: 0.16, h: 0.12, label: 'Vehicle', confidence: 0.78 },
  { id: 'det-3', x: 0.12, y: 0.62, w: 0.1, h: 0.1, label: 'Person', confidence: 0.65 },
];

const noop = () => {};

export default function VideoHudSandbox() {
  const [assetType, setAssetType] = useState<SandboxAssetType>('pathfinder');
  const [activeDeviceId, setActiveDeviceId] = useState<string>(
    firstDeviceForAsset('pathfinder').id,
  );
  const [foreignLocked, setForeignLocked] = useState(false);
  const [targetAltitudeM, setTargetAltitudeM] = useState(140);
  const [targetVelocityMps, setTargetVelocityMps] = useState(10);
  const [zoomLevel, setZoomLevel] = useState(2.4);
  const [mode, setMode] = useState<DayNightMode>('day');
  const [detectionsOn, setDetectionsOn] = useState(false);
  const [playbackOn, setPlaybackOn] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dockArmed, setDockArmed] = useState(false);
  const [stopArmed, setStopArmed] = useState(false);
  const [railAlwaysOpen, setRailAlwaysOpen] = useState(false);
  const [bottomChromeAlwaysOn, setBottomChromeAlwaysOn] = useState(false);
  const [holdMotion, setHoldMotion] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [videoHovered, setVideoHovered] = useState(false);
  const [mutedAlerts, setMutedAlerts] = useState(false);
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>('straight');
  const [pathfinderAngle, setPathfinderAngle] = useState<PathfinderCameraAngle>('straight');
  const [autoTrackArmed, setAutoTrackArmed] = useState(false);
  const [commandedBearingDeg, setCommandedBearingDeg] = useState(245);
  const [commandedPitchDeg, setCommandedPitchDeg] = useState(-18);
  const [selfControl, setSelfControl] = useState(true);
  const [showTriangleLab, setShowTriangleLab] = useState(false);
  const [pillBgOpacity, setPillBgOpacity] = useState(0.2);
  const [pillBlurPx, setPillBlurPx] = useState(1);
  const pulseTimerRef = useRef<number | null>(null);

  // Deliberately slow bearing easing so the camera visibly trails the
  // commanded heading — that lag is what the slew cue draws.
  const currentBearingDeg = useAnimatedAngle(commandedBearingDeg, 0.6);
  const currentPitchDeg = useAnimatedValue(commandedPitchDeg);
  const slewDelta = shortestDelta(currentBearingDeg, commandedBearingDeg);

  useEffect(
    () => () => {
      if (pulseTimerRef.current != null) window.clearTimeout(pulseTimerRef.current);
    },
    [],
  );

  const handlePulse = useCallback(() => {
    setPulsing(true);
    if (pulseTimerRef.current != null) window.clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = window.setTimeout(() => {
      setPulsing(false);
      pulseTimerRef.current = null;
    }, 350);
  }, []);

  // Slider-driven slew: while the camera trails the commanded bearing/pitch the
  // delta is non-zero, so the crosshair blooms like it does for the motion toggle.
  const pitchDelta = currentPitchDeg - commandedPitchDeg;
  const isSlewing = Math.abs(slewDelta) > 0.25 || Math.abs(pitchDelta) > 0.25;
  const crosshairBloom = useCrosshairBloom(holdMotion || pulsing || isSlewing);

  const isAirborne = assetType !== 'camera';
  const controlOwner: CameraStatus['controlOwner'] = foreignLocked
    ? 'other'
    : selfControl
      ? 'self'
      : 'none';
  const writeDisabled = controlOwner === 'other';
  const isManual = controlOwner === 'none';

  const status = useMemo<CameraStatus>(
    () => baseStatus(controlOwner, assetToDeviceType(assetType), currentBearingDeg),
    [controlOwner, assetType, currentBearingDeg],
  );

  const feed = useMemo<CameraFeed>(
    () => ({
      cameraId: CAMERA_ID,
      mode,
      showDetections: detectionsOn,
    }),
    [mode, detectionsOn],
  );

  const handleModeToggle = useCallback(
    () => setMode((m) => (m === 'day' ? 'night' : 'day')),
    [],
  );

  const handleDeviceChange = useCallback((id: string) => {
    const device = deviceById(id);
    setActiveDeviceId(device.id);
    setAssetType(device.assetType);
  }, []);

  // Keep the device select in sync when the debug header asset select drives
  // the asset type, so the two never desync.
  const handleAssetTypeChange = useCallback((asset: SandboxAssetType) => {
    setAssetType(asset);
    setActiveDeviceId((current) =>
      deviceById(current).assetType === asset ? current : firstDeviceForAsset(asset).id,
    );
  }, []);

  const activeDevice = deviceById(activeDeviceId);

  const handleDetectionsToggle = useCallback(() => setDetectionsOn((v) => !v), []);
  const handlePlaybackToggle = useCallback(() => setPlaybackOn((v) => !v), []);
  const handleFullscreenToggle = useCallback(() => setIsFullscreen((v) => !v), []);
  const handleDockToggle = useCallback(() => setDockArmed((v) => !v), []);
  const handleStopToggle = useCallback(() => setStopArmed((v) => !v), []);
  const handleMutedAlertsToggle = useCallback(() => setMutedAlerts((v) => !v), []);
  const handleAutoTrackStart = useCallback(() => setAutoTrackArmed(true), []);
  const handleAutoTrackReleased = useCallback(() => setAutoTrackArmed(false), []);
  const handleVideoEnter = useCallback(() => setVideoHovered(true), []);
  const handleVideoLeave = useCallback(() => setVideoHovered(false), []);
  const handleTakeRelease = useCallback(() => {
    if (foreignLocked) return;
    setSelfControl((v) => !v);
  }, [foreignLocked]);

  useEffect(() => {
    if (assetType !== 'pathfinder') setAutoTrackArmed(false);
  }, [assetType]);

  const shellClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-surface-void'
    : 'relative aspect-video w-full bg-black ring-1 ring-inset ring-border-default';

  return (
    <div className="min-h-screen w-full bg-surface-1 text-slate-12 flex flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-border-subtle px-4 py-2.5 text-xs shrink-0">
        <a
          href="/demo"
          className="rounded border border-border-default bg-surface-2 px-2 py-1 text-xs-plus font-medium text-slate-11 transition-colors hover:border-border-strong hover:text-slate-12"
        >
          Open Demo →
        </a>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-slate-10 cursor-pointer">
            <input
              type="checkbox"
              checked={showTriangleLab}
              onChange={(e) => setShowTriangleLab(e.target.checked)}
              className="rounded border-border-default"
            />
            Triangle lab
          </label>
          <label className="flex items-center gap-1.5 text-slate-10 cursor-pointer">
            <input
              type="checkbox"
              checked={foreignLocked}
              onChange={(e) => setForeignLocked(e.target.checked)}
              className="rounded border-border-default"
            />
            Foreign locked
          </label>
          {isAirborne && (
            <label className="flex items-center gap-1.5 text-slate-10 cursor-pointer">
              <input
                type="checkbox"
                checked={railAlwaysOpen}
                onChange={(e) => setRailAlwaysOpen(e.target.checked)}
                className="rounded border-border-default"
              />
              Rail always open
            </label>
          )}
          <label className="flex items-center gap-1.5 text-slate-10 cursor-pointer">
            <input
              type="checkbox"
              checked={bottomChromeAlwaysOn}
              onChange={(e) => setBottomChromeAlwaysOn(e.target.checked)}
              className="rounded border-border-default"
            />
            Bottom controls always on
          </label>
          <label className="flex items-center gap-1.5 text-slate-10 cursor-pointer">
            <input
              type="checkbox"
              checked={holdMotion}
              onChange={(e) => setHoldMotion(e.target.checked)}
              className="rounded border-border-default"
            />
            Simulate camera motion
          </label>
          <button
            type="button"
            onClick={handlePulse}
            className="bg-surface-2 border border-border-default rounded px-2 py-1 text-xs-plus text-slate-11 hover:border-border-strong"
          >
            Pulse
          </button>
          <select
            value={assetType}
            onChange={(e) => handleAssetTypeChange(e.target.value as SandboxAssetType)}
            className="bg-surface-2 border border-border-default rounded px-2 py-1 text-xs-plus text-slate-11"
            aria-label="Asset type"
          >
            {ASSET_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <SandboxCompassControl
            bearingDeg={commandedBearingDeg}
            onBearingChange={setCommandedBearingDeg}
          />
          <label className="flex items-center gap-2 rounded-md border border-border-default bg-surface-2 px-2 py-1">
            <span className="font-mono text-2xs uppercase tracking-[0.18em] text-slate-9">
              DEP
            </span>
            <input
              type="range"
              min={PITCH_MIN}
              max={PITCH_MAX}
              step={1}
              value={Math.round(commandedPitchDeg)}
              onChange={(e) => setCommandedPitchDeg(parseFloat(e.target.value))}
              aria-label="Depression"
              className="h-1 w-28 cursor-pointer appearance-none rounded-full bg-state-hover-strong accent-accent-info [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-12"
            />
            <span className="min-w-[4ch] text-end font-mono text-xs-plus tabular-nums text-slate-12">
              {Math.round(currentPitchDeg)}°
            </span>
          </label>
          <label className="flex items-center gap-2 rounded-md border border-border-default bg-surface-2 px-2 py-1">
            <span className="font-mono text-2xs uppercase tracking-[0.18em] text-slate-9">
              BG
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(pillBgOpacity * 100)}
              onChange={(e) => setPillBgOpacity(parseInt(e.target.value, 10) / 100)}
              aria-label="HUD chip background opacity"
              className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-state-hover-strong accent-accent-info [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-12"
            />
            <span className="min-w-[4ch] text-end font-mono text-xs-plus tabular-nums text-slate-12">
              {Math.round(pillBgOpacity * 100)}%
            </span>
          </label>
          <label className="flex items-center gap-2 rounded-md border border-border-default bg-surface-2 px-2 py-1">
            <span className="font-mono text-2xs uppercase tracking-[0.18em] text-slate-9">
              BLUR
            </span>
            <input
              type="range"
              min={0}
              max={24}
              step={1}
              value={pillBlurPx}
              onChange={(e) => setPillBlurPx(parseInt(e.target.value, 10))}
              aria-label="HUD chip backdrop blur"
              className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-state-hover-strong accent-accent-info [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-12"
            />
            <span className="min-w-[4ch] text-end font-mono text-xs-plus tabular-nums text-slate-12">
              {pillBlurPx}px
            </span>
          </label>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 min-h-0 overflow-auto">
        {showTriangleLab ? (
          <AiTriangleLab />
        ) : (
        <div className="w-full max-w-5xl">
          <div
            className={shellClass}
            onPointerEnter={handleVideoEnter}
            onPointerLeave={handleVideoLeave}
          >
            <CameraFeedTile
              feed={feed}
              cameraLabel={`${activeDevice.label} · ${activeDevice.sublabel}`}
              status={status}
              detections={[]}
              videoSrcDay={VIDEO_SRC_DAY}
              videoSrcNight={VIDEO_SRC_NIGHT}
              isFullscreen={isFullscreen}
              tileVariant="fill"
              suppressDroneHud
              suppressTelemetryStrip
              suppressCenterCrosshair
              showAssetPicker={false}
              crosshairBloom={crosshairBloom}
              renderContextMenu={(content) => (
                <SandboxVideoContextMenu
                  coordinates={SANDBOX_CONTEXT_MENU.coordinates}
                  altitude={SANDBOX_CONTEXT_MENU.altitude}
                  lookAtLabel={SANDBOX_CONTEXT_MENU.lookAtLabel}
                  createTargetLabel={SANDBOX_CONTEXT_MENU.createTargetLabel}
                >
                  {content}
                </SandboxVideoContextMenu>
              )}
              onTakeControl={noop}
              onReleaseControl={noop}
              onModeToggle={handleModeToggle}
              onDetectionsToggle={handleDetectionsToggle}
              onDesignateModeToggle={noop}
              onPlaybackToggle={handlePlaybackToggle}
              onPlaybackChange={noop}
              onZoomChange={setZoomLevel}
              onFullscreenToggle={handleFullscreenToggle}
              onDropDevice={noop}
            />
            <DirIsland
              direction="ltr"
              className="absolute left-3 top-3 z-30"
            >
              <SandboxDeviceSelect
                devices={DEVICES}
                value={activeDeviceId}
                onChange={handleDeviceChange}
                bgOpacity={pillBgOpacity}
                blurPx={pillBlurPx}
              />
            </DirIsland>
            <CameraSlewCue deltaDeg={slewDelta} bloom={crosshairBloom} />
            {detectionsOn && (
              <AiDetectionTriangles detections={SANDBOX_DETECTIONS} />
            )}
            {assetType === 'pathfinder' && (
              <AutoTrackOverlay
                armed={autoTrackArmed}
                onReleased={handleAutoTrackReleased}
              />
            )}
            {isAirborne && (
              <SandboxSetpointRail
                altitudeM={status.altitudeM ?? 0}
                velocityMps={status.velocityMps ?? 0}
                batteryPct={status.batteryPct ?? undefined}
                targetAltitudeM={targetAltitudeM}
                targetVelocityMps={targetVelocityMps}
                disabled={writeDisabled}
                forceExpanded={railAlwaysOpen}
                design={RAIL_DESIGN}
                onTargetAltitudeChange={setTargetAltitudeM}
                onTargetVelocityChange={setTargetVelocityMps}
              />
            )}
            {assetType !== 'drone' && (
              <DeviceConnectivityBadge
                manual={isManual}
                bgOpacity={pillBgOpacity}
                blurPx={pillBlurPx}
              />
            )}
            <SandboxBottomChrome
                mode={mode}
                onModeToggle={handleModeToggle}
                zoomLevel={zoomLevel}
                onZoomChange={setZoomLevel}
                deviceType={assetToDeviceType(assetType)}
                controlOwner={controlOwner}
                onTakeRelease={handleTakeRelease}
                detectionsOn={detectionsOn}
                playbackOn={playbackOn}
                onDetectionsToggle={handleDetectionsToggle}
                onPlaybackToggle={handlePlaybackToggle}
                settingsOpen={settingsOpen}
                onSettingsOpenChange={setSettingsOpen}
                isFullscreen={isFullscreen}
                onFullscreenToggle={handleFullscreenToggle}
                dockArmed={dockArmed}
                stopArmed={stopArmed}
                onDockToggle={handleDockToggle}
                onStopToggle={handleStopToggle}
                videoHovered={videoHovered}
                forceVisible={bottomChromeAlwaysOn}
                mutedAlerts={mutedAlerts}
                onMutedAlertsToggle={handleMutedAlertsToggle}
                deviceKind={assetType}
                cameraAngle={cameraAngle}
                onCameraAngleChange={setCameraAngle}
                pathfinderAngle={pathfinderAngle}
                onPathfinderAngleChange={setPathfinderAngle}
                onAutoTrackStart={handleAutoTrackStart}
                settingsLabelOverrides={SETTINGS_LABEL_OVERRIDES}
                alertsAsSwitch
                showAutoTrackItem={false}
                bgOpacity={pillBgOpacity}
                blurPx={pillBlurPx}
              />
          </div>
        </div>
        )}
      </main>
    </div>
  );
}
