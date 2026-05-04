/**
 * Isolated `/playground` route for iterating on the rebuilt video feature.
 *
 * Stripped-down shell: a 32px slim left nav with two toggles (cameras +
 * devices) and a `VideoPanel` (camera-v2) filling the rest of the viewport.
 * No map, no sidebar, no notifications - by design.
 *
 * All mutable state (feeds, ownership, ownership countdown, mocked drone
 * telemetry, focus history) lives here so tile components stay
 * dumb / promotable.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Toggle } from '@/shared/components/ui/toggle';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/components/ui/tooltip';
import { Separator } from '@/shared/components/ui/separator';
import { Video } from 'lucide-react';
import { CAMERA_ASSETS } from './TacticalMap';
import { VideoPanel } from './camera-v2/VideoPanel';
import { DevicesPanel, DevicesIcon } from './DevicesPanel';
import { useDevicesFromAssets } from './useDevicesFromAssets';
import type { CameraFeed, CameraStatus, DetectionBox } from './camera-v2/types';

const C2Logo = ({ className }: { className?: string }) => (
  <svg width={32} height={32} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.1483 17.565L20.7437 27.1604L20.8479 27.2601C22.623 28.9401 25.4215 28.9084 27.1603 27.1695L27.183 27.1468L36.7649 17.565L43.1679 23.968L23.9543 43.1816L4.74072 23.968L11.1437 17.565H11.1483ZM28.4373 23.3295C28.306 22.3921 27.8758 21.491 27.1558 20.7665C25.3853 18.9959 22.5188 18.9959 20.7528 20.7665C20.0328 21.4865 19.6071 22.3921 19.4713 23.3295L12.4253 16.2835L23.9543 4.75439L35.4834 16.2835L28.4373 23.3295Z"
      fill="currentColor"
    />
  </svg>
);

const VIDEO_SRC_DAY = '/videos/target-feed.mov';
const VIDEO_SRC_NIGHT = '/videos/weapon-feed.mp4';
const VIDEO_SRC_PLAYBACK = '/videos/weapon-feed.mp4';

const CONTROL_REQUEST_SECONDS = 10;
const MAX_FEEDS = 4;

const CAMERA_ID_PTZ = CAMERA_ASSETS[0]?.id ?? 'CAM-NVT-PTZ-N';
const CAMERA_ID_PIXEL = CAMERA_ASSETS[1]?.id ?? 'CAM-NVT-PIXELSIGHT';
const DRONE_ID_PATROL = 'FRIENDLY-01';
const DRONE_ID_OBS = 'FRIENDLY-02';

const MOCK_AREA_NAMES: Record<string, string> = {
  [CAMERA_ID_PTZ]: 'Sector North',
  [CAMERA_ID_PIXEL]: 'Sector South',
  [DRONE_ID_PATROL]: 'Patrol Loop A',
  [DRONE_ID_OBS]: 'Observation Hill',
};

const MOCK_LINKED_FROM: Record<string, { id: string; label: string; type: 'radar' }> = {
  [CAMERA_ID_PTZ]: { id: 'RAD-NVT-RADA', label: 'RAD-NVT-RADA', type: 'radar' },
};

const MOCK_DETECTIONS: Record<string, DetectionBox[]> = {
  [CAMERA_ID_PTZ]: [
    { id: 'd1', x: 0.42, y: 0.34, w: 0.12, h: 0.18, label: 'UAV', confidence: 0.91 },
    { id: 'd2', x: 0.18, y: 0.62, w: 0.08, h: 0.12, label: 'GROUND', confidence: 0.68 },
  ],
  [CAMERA_ID_PIXEL]: [
    { id: 'd3', x: 0.55, y: 0.45, w: 0.16, h: 0.22, label: 'VEHICLE', confidence: 0.82 },
  ],
  [DRONE_ID_PATROL]: [
    { id: 'd4', x: 0.32, y: 0.4, w: 0.14, h: 0.18, label: 'PERSON', confidence: 0.78 },
  ],
};

const MOCK_ASSIGNMENT: Record<string, { id: string; label: string }> = {
  [CAMERA_ID_PTZ]: { id: 'TGT-014', label: 'TGT-014 \u00b7 Drone' },
};

interface DroneTelemetry {
  altitudeM: number;
  velocityMps: number;
  batteryPct: number;
  signalPct: number;
  distanceFromHomeM: number;
  bearingDeg: number;
}

const INITIAL_DRONE_TELEMETRY: Record<string, DroneTelemetry> = {
  [DRONE_ID_PATROL]: { altitudeM: 80, velocityMps: 9.2, batteryPct: 78, signalPct: 92, distanceFromHomeM: 412, bearingDeg: 95 },
  [DRONE_ID_OBS]: { altitudeM: 110, velocityMps: 6.4, batteryPct: 64, signalPct: 71, distanceFromHomeM: 738, bearingDeg: 168 },
};

const DEVICE_TYPE_LABELS = {
  camera: 'מצלמות',
  radar: 'מכ״מים',
  dock: 'בסיסי רחפנים',
  drone: 'רחפנים',
  ecm: 'שיבוש',
  launcher: 'משגרים',
  lidar: 'LIDAR',
  weapon_system: 'מערכות נשק',
} as const;

const DEVICE_PANEL_STRINGS = {
  searchPlaceholder: 'חיפוש...',
  resetFiltersLabel: 'ניקוי',
  noMatches: 'אין מכשירים תואמים',
  centerOnMap: 'מרכז במפה',
  mute: 'השתק',
  unmute: 'בטל השתקה',
  pinToFeed: 'נעץ',
  pinToFeedAriaLabel: 'נעץ מכשיר לפיד וידאו',
  unpinFromFeed: 'בטל נעיצה',
  unpinFromFeedAriaLabel: 'הסר מכשיר מהפיד',
} as const;

export default function PlaygroundPage() {
  const devices = useDevicesFromAssets();

  const cameraLabelById = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const c of CAMERA_ASSETS) map[c.id] = c.typeLabel;
    for (const d of devices) {
      if (d.type === 'drone') map[d.id] = d.name;
    }
    return map;
  }, [devices]);

  const cameraBearingById = useMemo<Record<string, { bearingDeg: number; fovDeg: number }>>(
    () => Object.fromEntries(CAMERA_ASSETS.map((c) => [c.id, { bearingDeg: c.bearingDeg, fovDeg: c.fovDeg }])),
    [],
  );

  const [cameraPanelOpen, setCameraPanelOpen] = useState(true);
  const [devicesPanelOpen, setDevicesPanelOpen] = useState(false);
  const [feeds, setFeeds] = useState<CameraFeed[]>([
    { cameraId: CAMERA_ID_PTZ, mode: 'day', showDetections: false, designateMode: false },
  ]);
  const [fullscreen, setFullscreen] = useState(false);

  // Per-camera ownership state. Mock the second camera as owned by another
  // operator so the locked state is always reachable.
  const [ownership, setOwnership] = useState<Record<string, 'self' | 'other' | 'none'>>(() => ({
    [CAMERA_ID_PTZ]: 'none',
    [CAMERA_ID_PIXEL]: 'other',
  }));
  const [pendingRequest, setPendingRequest] = useState<{ cameraId: string; countdown: number } | null>(null);
  const requestTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Per-camera zoom state. Display only on the playground.
  const [zoomById, setZoomById] = useState<Record<string, number>>({});

  // Drone telemetry tick - jittered so the HUD looks alive.
  const [droneTelemetry, setDroneTelemetry] = useState<Record<string, DroneTelemetry>>(INITIAL_DRONE_TELEMETRY);
  useEffect(() => {
    const id = setInterval(() => {
      setDroneTelemetry((prev) => {
        const next: Record<string, DroneTelemetry> = {};
        const t = Date.now() / 1000;
        for (const [droneId, tele] of Object.entries(prev)) {
          next[droneId] = {
            altitudeM: Math.max(20, tele.altitudeM + Math.sin(t / 2) * 0.3),
            velocityMps: Math.max(0, tele.velocityMps + (Math.random() - 0.5) * 0.2),
            batteryPct: Math.max(0, tele.batteryPct - 0.05),
            signalPct: Math.max(0, Math.min(100, tele.signalPct + (Math.random() - 0.5) * 0.6)),
            distanceFromHomeM: Math.max(0, tele.distanceFromHomeM + (Math.random() - 0.5) * 2),
            bearingDeg: (tele.bearingDeg + 0.4 + 360) % 360,
          };
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Track which cameraId was focused most recently so the pin handler can swap
  // out the LRU tile when the panel is full.
  const focusOrderRef = useRef<string[]>([CAMERA_ID_PTZ]);
  const handleTileFocus = useCallback((cameraId: string) => {
    focusOrderRef.current = [cameraId, ...focusOrderRef.current.filter((id) => id !== cameraId)];
  }, []);

  useEffect(() => {
    return () => {
      if (requestTimerRef.current) clearInterval(requestTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!pendingRequest) return;
    if (requestTimerRef.current) clearInterval(requestTimerRef.current);
    requestTimerRef.current = setInterval(() => {
      setPendingRequest((prev) => {
        if (!prev) return null;
        if (prev.countdown <= 1) {
          setOwnership((own) => ({ ...own, [prev.cameraId]: 'self' }));
          return null;
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);
    return () => {
      if (requestTimerRef.current) clearInterval(requestTimerRef.current);
    };
  }, [pendingRequest?.cameraId]);

  const handleTakeControl = useCallback(
    (cameraId: string) => {
      if (!cameraId) return;
      if (ownership[cameraId] === 'self' || ownership[cameraId] === 'other') return;
      setPendingRequest({ cameraId, countdown: CONTROL_REQUEST_SECONDS });
    },
    [ownership],
  );

  const handleReleaseControl = useCallback((cameraId: string) => {
    if (!cameraId) return;
    setOwnership((own) => ({ ...own, [cameraId]: 'none' }));
    setPendingRequest((prev) => (prev?.cameraId === cameraId ? null : prev));
  }, []);

  const handleFullscreenToggle = useCallback(() => {
    setFullscreen((prev) => !prev);
  }, []);

  const handleZoomChange = useCallback((cameraId: string, zoomLevel: number) => {
    setZoomById((prev) => ({ ...prev, [cameraId]: zoomLevel }));
  }, []);

  // Operator marked a point on a feed as a target. Until the real targeting
  // backend is wired we just log it; the in-feed flash gives visual receipt.
  const handleDesignateTarget = useCallback(
    (cameraId: string, normX: number, normY: number) => {
      // eslint-disable-next-line no-console
      console.info('[playground] designate target', {
        cameraId,
        normX: Number(normX.toFixed(3)),
        normY: Number(normY.toFixed(3)),
      });
    },
    [],
  );

  // Pin a device to a feed slot.
  //   - already pinned -> no-op
  //   - empty slot exists -> fill it
  //   - room available -> append
  //   - full -> swap the LRU tile
  const handlePinDevice = useCallback(
    (deviceId: string) => {
      setFeeds((prev) => {
        if (prev.some((f) => f.cameraId === deviceId)) return prev;
        const emptyIdx = prev.findIndex((f) => !f.cameraId);
        if (emptyIdx >= 0) {
          return prev.map((f, i) => (i === emptyIdx ? { ...f, cameraId: deviceId } : f));
        }
        if (prev.length < MAX_FEEDS) {
          return [...prev, { cameraId: deviceId, mode: 'day' }];
        }
        // Full: pick the camera that was focused least recently.
        const order = focusOrderRef.current;
        const lruCameraId = [...prev]
          .map((f) => f.cameraId)
          .sort((a, b) => {
            const ai = order.indexOf(a);
            const bi = order.indexOf(b);
            return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
          })
          .pop();
        if (!lruCameraId) return prev;
        return prev.map((f) => (f.cameraId === lruCameraId ? { ...f, cameraId: deviceId } : f));
      });
    },
    [],
  );

  // Unpin: drop the matching feed entirely.
  const handleUnpinDevice = useCallback((deviceId: string) => {
    setFeeds((prev) => prev.filter((f) => f.cameraId !== deviceId));
    focusOrderRef.current = focusOrderRef.current.filter((id) => id !== deviceId);
  }, []);

  const pinnedDeviceIds = useMemo(
    () => new Set(feeds.map((f) => f.cameraId).filter((id): id is string => !!id)),
    [feeds],
  );

  // Page-level Esc shortcut so the user can exit fullscreen even when no tile
  // is focused.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape' && fullscreen) {
        e.preventDefault();
        setFullscreen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const statusByCameraId = useMemo<Record<string, CameraStatus>>(() => {
    const map: Record<string, CameraStatus> = {};
    for (const cam of CAMERA_ASSETS) {
      const owner = ownership[cam.id] ?? 'none';
      const requestPending = pendingRequest?.cameraId === cam.id;
      const assignment = MOCK_ASSIGNMENT[cam.id];
      const linked = MOCK_LINKED_FROM[cam.id];
      map[cam.id] = {
        bearingDeg: cameraBearingById[cam.id]?.bearingDeg ?? 0,
        fovDeg: cameraBearingById[cam.id]?.fovDeg ?? 0,
        controlOwner: owner,
        controlOwnerName: owner === 'other' ? 'Operator B' : undefined,
        assignedTargetId: assignment?.id ?? null,
        assignedTargetLabel: assignment?.label ?? null,
        controlRequestPending: requestPending,
        controlRequestCountdown: requestPending ? pendingRequest?.countdown : undefined,
        deviceType: 'camera',
        linkedFromDeviceId: linked?.id ?? null,
        linkedFromDeviceLabel: linked?.label ?? null,
        linkedFromDeviceType: linked?.type ?? null,
        zoomLevel: zoomById[cam.id] ?? 1,
        areaName: MOCK_AREA_NAMES[cam.id],
      };
    }
    for (const droneId of Object.keys(droneTelemetry)) {
      const tele = droneTelemetry[droneId];
      const owner = ownership[droneId] ?? 'none';
      const requestPending = pendingRequest?.cameraId === droneId;
      map[droneId] = {
        bearingDeg: tele.bearingDeg,
        fovDeg: 84,
        controlOwner: owner,
        controlOwnerName: owner === 'other' ? 'Operator B' : undefined,
        assignedTargetId: null,
        assignedTargetLabel: null,
        controlRequestPending: requestPending,
        controlRequestCountdown: requestPending ? pendingRequest?.countdown : undefined,
        deviceType: 'drone',
        zoomLevel: zoomById[droneId] ?? 1,
        altitudeM: tele.altitudeM,
        velocityMps: tele.velocityMps,
        batteryPct: tele.batteryPct,
        signalPct: tele.signalPct,
        distanceFromHomeM: tele.distanceFromHomeM,
        areaName: MOCK_AREA_NAMES[droneId],
      };
    }
    return map;
  }, [cameraBearingById, droneTelemetry, ownership, pendingRequest, zoomById]);

  const handleCameraPanelToggle = useCallback(
    (next: boolean) => {
      setCameraPanelOpen(next);
      if (!next) setFeeds([]);
      else if (feeds.length === 0) setFeeds([{ cameraId: CAMERA_ID_PTZ, mode: 'day' }]);
    },
    [feeds.length],
  );

  return (
    <div className="relative flex w-full h-screen overflow-hidden text-white font-sans bg-[#050505]" dir="rtl">
      {!fullscreen && (
        <nav
          className="relative z-50 flex flex-col justify-start items-center w-8 flex-shrink-0 h-full bg-[#1a1a1a] border-l border-white/10"
          dir="ltr"
        >
          <div className="flex items-center justify-center h-9 w-full">
            <div className="text-white scale-75 origin-center">
              <C2Logo />
            </div>
          </div>
          <Separator className="bg-white/10" />

          <div className="flex flex-col items-center gap-0.5 py-0 w-fit flex-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={cameraPanelOpen}
                  onPressedChange={handleCameraPanelToggle}
                  className="size-6 min-w-6 px-0 rounded bg-transparent text-gray-400 aria-pressed:bg-white/[0.08] aria-pressed:text-white aria-pressed:ring-1 aria-pressed:ring-inset aria-pressed:ring-white/15 hover:text-white hover:bg-white/10 active:scale-[0.97] transition-[color,background-color] focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:outline-none"
                  aria-label={cameraPanelOpen ? 'סגור מצלמות' : 'מצלמות'}
                >
                  <Video size={20} strokeWidth={1.5} />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={8}>
                {cameraPanelOpen ? 'סגור מצלמות' : 'מצלמות'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={devicesPanelOpen}
                  onPressedChange={setDevicesPanelOpen}
                  className="size-6 min-w-6 px-0 rounded bg-transparent text-gray-400 aria-pressed:bg-white/[0.08] aria-pressed:text-white aria-pressed:ring-1 aria-pressed:ring-inset aria-pressed:ring-white/15 hover:text-white hover:bg-white/10 active:scale-[0.97] transition-[color,background-color] focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:outline-none"
                  aria-label={devicesPanelOpen ? 'סגור מכשירים' : 'מכשירים'}
                >
                  <DevicesIcon size={18} className="text-current" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={8}>
                {devicesPanelOpen ? 'סגור מכשירים' : 'מכשירים'}
              </TooltipContent>
            </Tooltip>
          </div>
        </nav>
      )}

      <main className={`relative flex-1 min-w-0 min-h-0 ${fullscreen ? 'absolute inset-0 z-40' : ''}`}>
        {cameraPanelOpen ? (
          <VideoPanel
            feeds={feeds}
            onFeedsChange={setFeeds}
            cameraLabelById={cameraLabelById}
            statusByCameraId={statusByCameraId}
            detectionsByCameraId={MOCK_DETECTIONS}
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
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-zinc-500 text-sm">
            לחץ על כפתור המצלמה בסרגל השמאלי כדי לפתוח
          </div>
        )}

        <DevicesPanel
          devices={devices}
          open={devicesPanelOpen}
          onClose={() => setDevicesPanelOpen(false)}
          onFlyTo={() => {}}
          onPinToFeed={handlePinDevice}
          onUnpinFromFeed={handleUnpinDevice}
          pinnedDeviceIds={pinnedDeviceIds}
          title="מכשירים"
          closeAriaLabel="סגור"
          typeLabels={DEVICE_TYPE_LABELS}
          strings={DEVICE_PANEL_STRINGS}
        />
      </main>
    </div>
  );
}
