import { useCallback, useMemo, useState } from 'react';
import { CameraFeedTile } from '@/app/components/camera-v2/CameraFeedTile';
import type {
  CameraFeed,
  CameraStatus,
  DayNightMode,
  FeedDeviceType,
} from '@/app/components/camera-v2/types';
import { SandboxSetpointRail } from './SandboxSetpointRail';
import { SandboxPassiveTelemetry, type PassiveComposition } from './SandboxPassiveTelemetry';
import { SandboxBottomChrome } from './SandboxBottomChrome';

const VIDEO_SRC_DAY = '/videos/target-feed.mov';
const VIDEO_SRC_NIGHT = '/videos/weapon-feed.mp4';
const CAMERA_ID = 'sandbox-drone-1';

const ASSET_OPTIONS: { id: FeedDeviceType; label: string }[] = [
  { id: 'drone', label: 'Drone · ALT/SPD + dock chrome' },
  { id: 'camera', label: 'Camera · minimal HUD' },
];

const COMPOSITION_OPTIONS: { id: PassiveComposition; label: string }[] = [
  { id: 'D', label: 'D · Top strip' },
  { id: 'A', label: 'A · Bottom center' },
  { id: 'B', label: 'B · Top right' },
  { id: 'C', label: 'C · Right stack' },
  { id: 'E', label: 'E · Corners' },
  { id: 'F', label: 'F · Minimal corners' },
];

function baseStatus(
  controlOwner: CameraStatus['controlOwner'],
  deviceType: FeedDeviceType,
): CameraStatus {
  return {
    bearingDeg: 245,
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

const noop = () => {};

export default function VideoHudSandbox() {
  const [assetType, setAssetType] = useState<FeedDeviceType>('drone');
  const [foreignLocked, setForeignLocked] = useState(false);
  const [showBottomChrome, setShowBottomChrome] = useState(true);
  const [composition, setComposition] = useState<PassiveComposition>('C');
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

  const isDrone = assetType === 'drone';
  const controlOwner: CameraStatus['controlOwner'] = foreignLocked ? 'other' : 'self';
  const writeDisabled = controlOwner === 'other';

  const status = useMemo<CameraStatus>(
    () => baseStatus(controlOwner, assetType),
    [controlOwner, assetType],
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

  const handleDetectionsToggle = useCallback(() => setDetectionsOn((v) => !v), []);
  const handlePlaybackToggle = useCallback(() => setPlaybackOn((v) => !v), []);
  const handleFullscreenToggle = useCallback(() => setIsFullscreen((v) => !v), []);
  const handleDockToggle = useCallback(() => setDockArmed((v) => !v), []);
  const handleStopToggle = useCallback(() => setStopArmed((v) => !v), []);

  const shellClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-surface-void'
    : 'relative aspect-video w-full bg-black ring-1 ring-inset ring-border-default';

  return (
    <div className="min-h-screen w-full bg-surface-1 text-slate-12 flex flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-border-subtle px-4 py-2.5 text-[12px] shrink-0">
        <span className="font-mono text-slate-9">/video-hud-sandbox</span>
        <span className="text-slate-11">
          {isDrone ? 'Drone HUD — hover ALT/SPD scrub' : 'Camera HUD — minimal corners'}
        </span>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-slate-10 cursor-pointer">
            <input
              type="checkbox"
              checked={foreignLocked}
              onChange={(e) => setForeignLocked(e.target.checked)}
              className="rounded border-border-default"
            />
            Foreign locked
          </label>
          <label className="flex items-center gap-1.5 text-slate-10 cursor-pointer">
            <input
              type="checkbox"
              checked={showBottomChrome}
              onChange={(e) => setShowBottomChrome(e.target.checked)}
              className="rounded border-border-default"
            />
            Bottom chrome
          </label>
          {isDrone && (
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
          <select
            value={assetType}
            onChange={(e) => setAssetType(e.target.value as FeedDeviceType)}
            className="bg-surface-2 border border-border-default rounded px-2 py-1 text-[11px] text-slate-11"
            aria-label="Asset type"
          >
            {ASSET_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          {isDrone && (
            <select
              value={composition}
              onChange={(e) => setComposition(e.target.value as PassiveComposition)}
              className="bg-surface-2 border border-border-default rounded px-2 py-1 text-[11px] text-slate-11"
              aria-label="Passive telemetry composition"
            >
              {COMPOSITION_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 min-h-0">
        <div className="w-full max-w-5xl">
          <p className="text-[11px] text-slate-9 mb-3 text-center">
            Paper baseline: ALT/SPD on the left, passive telemetry on the right, bottom chrome locked to 4SB.
          </p>
          <div className={shellClass}>
            <CameraFeedTile
              feed={feed}
              cameraLabel={isDrone ? 'DRN-01 · Sandbox' : 'CAM-01 · Sandbox'}
              status={status}
              detections={[]}
              videoSrcDay={VIDEO_SRC_DAY}
              videoSrcNight={VIDEO_SRC_NIGHT}
              isFullscreen={isFullscreen}
              tileVariant="fill"
              suppressDroneHud
              suppressTelemetryStrip
              suppressControlBar
              showAssetPicker={false}
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
            {isDrone && (
              <SandboxSetpointRail
                altitudeM={status.altitudeM ?? 0}
                velocityMps={status.velocityMps ?? 0}
                targetAltitudeM={targetAltitudeM}
                targetVelocityMps={targetVelocityMps}
                disabled={writeDisabled}
                forceExpanded={railAlwaysOpen}
                onTargetAltitudeChange={setTargetAltitudeM}
                onTargetVelocityChange={setTargetVelocityMps}
              />
            )}
            <SandboxPassiveTelemetry
              status={status}
              composition={composition}
              deviceType={assetType}
            />
            {showBottomChrome && (
              <SandboxBottomChrome
                mode={mode}
                onModeToggle={handleModeToggle}
                zoomLevel={zoomLevel}
                onZoomChange={setZoomLevel}
                deviceType={assetType}
                controlOwner={controlOwner}
                onTakeRelease={noop}
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
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
