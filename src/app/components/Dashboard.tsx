import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useDrop } from 'react-dnd';
import { CAMERA_ASSETS, REGULUS_EFFECTORS } from './tacticalAssets';
import { bearingDegrees, haversineDistanceM } from '@/app/lib/mapGeo';
import { CesiumTacticalMap } from './CesiumTacticalMap';
import { CesiumErrorBoundary } from './CesiumErrorBoundary';
import { NotificationSystem, showTacticalNotification } from './NotificationSystem';
import { NotificationCenter } from './NotificationCenter';
import ListOfSystems from '@/imports/ListOfSystems';
import type { Detection, RegulusEffector, LauncherEffector } from '@/imports/ListOfSystems';
import { List, Bell, Radar, HelpCircle, Palette, Target, Video } from '@/lib/icons/central';
import { Toggle } from '@/shared/components/ui/toggle';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/shared/components/ui/tooltip';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/shared/components/ui/dropdown-menu';
import { Separator } from '@/shared/components/ui/separator';
import { DevicesPanel, DevicesIcon, DEVICE_CAMERA_DRAG_TYPE } from './DevicesPanel';
import type { DeviceCameraDragItem } from './DevicesPanel';
import { useDevicesFromAssets, useCameraPresets } from './useDevicesFromAssets';
import { CameraViewerPanel } from './CameraViewerPanel';
import type { CameraFeed } from './CameraViewerPanel';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/shared/components/ui/resizable';
import { LAYOUT_TOKENS } from '@/primitives/tokens';
import { toast } from 'sonner';
// Joyride is only used when the user opens the in-app tour. Lazy-loading it
// keeps the ~80 KB tour package out of the dashboard's initial bundle.
const Joyride = lazy(() => import('react-joyride'));
import { useCuasTour } from '../hooks/useCuasTour';
import { getPriorityBaseline } from '@/imports/useActivityStatus';
import { useDirection, useIsRtl, useLocale } from '@/lib/direction';
import { useStrings, getStrings, type Strings } from '@/lib/intl';
import { measure } from '@/lib/perf/measure';
import { PerfProfiled } from './perf/PerfProfiled';

function CuasIcon({ size = 20, strokeWidth = 2, className = '' }: { size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9.5 5.398C7.093 6.19 5.19 8.093 4.398 10.5M19.86 14.5c.092-.486.14-.987.14-1.5 0-2.01-.742-3.848-1.966-5.253M6.708 19c1.41 1.245 3.263 2 5.292 2 .513 0 1.014-.048 1.5-.14" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="5" r="2.5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3.82 14.835c1.196-.69 2.725-.28 3.415.915.69 1.196.28 2.724-.915 3.415-1.196.69-2.725.28-3.415-.915-.69-1.196-.28-2.725.916-3.415Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17.672 19.165c-1.196-.69-1.605-2.22-.915-3.415.69-1.196 2.219-1.605 3.415-.915 1.195.69 1.605 2.219.915 3.415-.69 1.195-2.22 1.605-3.415.915Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Cached Hebrew locale time formatter. Reused across all hot paths so we
// don't allocate a fresh `Intl.DateTimeFormat` (a heavy ICU lookup) on
// every 250 ms simulation tick. Internally we also memoise the formatted
// string for the current wall-clock second — multiple targets ticking on
// the same loop see the exact same string and share it.
const HE_TIME_FORMATTER = new Intl.DateTimeFormat('he-IL', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});
let cachedTimeSecond = -1;
let cachedTimeString = '';
function nowLocaleTime(): string {
  const second = Math.floor(Date.now() / 1000);
  if (second !== cachedTimeSecond) {
    cachedTimeSecond = second;
    cachedTimeString = HE_TIME_FORMATTER.format(new Date(second * 1000));
  }
  return cachedTimeString;
}

function appendLog(targets: Detection[], targetId: string, label: string): Detection[] {
  const time = nowLocaleTime();
  return targets.map(t => t.id !== targetId ? t : {
    ...t,
    actionLog: [...(t.actionLog || []), { time, label }],
  });
}

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

// Device panel label sets are now sourced from the i18n catalog
// (`t.devices.{typeLabels,connectionLabels,strings}`) — see
// `src/lib/intl/strings.ts`. The catalog returns referentially stable
// objects per locale, so `<DevicesPanel>`'s internal `useMemo` caches
// stay valid across Dashboard renders.

export interface FriendlyDrone {
  id: string;
  name: string;
  lat: number;
  lon: number;
  altitude: string;
  headingDeg?: number;
  fovDeg?: number;
  trail?: [number, number][];
}

interface FriendlyPatrolRoute {
  id: string;
  name: string;
  altitude: string;
  fovDeg: number;
  waypoints: [number, number][];
}

/**
 * Friendly patrol drones used by the simulation. Names + altitudes
 * come from the i18n catalog so they read in the active locale; the
 * rest (waypoints, FOV, ids) are deterministic geometry shared
 * across both languages.
 */
function getFriendlyPatrolRoutes(t: Strings): FriendlyPatrolRoute[] {
  const d = t.simulation.friendlyDrones;
  return [
    {
      id: 'FRIENDLY-01', name: d.patrol3.name, altitude: d.patrol3.altitude, fovDeg: 78,
      waypoints: [[32.4746, 34.9883], [32.4766, 34.9923], [32.4786, 34.9903], [32.4756, 34.9863]],
    },
    {
      id: 'FRIENDLY-02', name: d.observation7.name, altitude: d.observation7.altitude, fovDeg: 105,
      waypoints: [[32.4816, 35.0143], [32.4836, 35.0113], [32.4806, 35.0083], [32.4796, 35.0123]],
    },
    {
      id: 'FRIENDLY-03', name: d.patrol11.name, altitude: d.patrol11.altitude, fovDeg: 62,
      waypoints: [[32.4680, 34.9940], [32.4700, 34.9980], [32.4720, 34.9960], [32.4695, 34.9920]],
    },
    {
      id: 'FRIENDLY-04', name: d.observation2.name, altitude: d.observation2.altitude, fovDeg: 118,
      waypoints: [[32.4590, 35.0020], [32.4610, 35.0060], [32.4630, 35.0030], [32.4605, 35.0000]],
    },
    {
      id: 'FRIENDLY-05', name: d.patrol9.name, altitude: d.patrol9.altitude, fovDeg: 88,
      waypoints: [[32.4850, 34.9980], [32.4870, 35.0020], [32.4890, 34.9990], [32.4860, 34.9960]],
    },
  ];
}

function SplitLeftIcon({ className }: { className?: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
         className={className} aria-hidden="true">
      <rect x="2" y="3" width="20" height="18" rx="2"
            stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="3" width="8" height="18" rx="2"
            fill="currentColor" fillOpacity="0.15" />
      <line x1="10" y1="3" x2="10" y2="21"
            stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function SplitDropZone({
  onDrop,
  visible,
}: {
  onDrop: (item: DeviceCameraDragItem) => void;
  visible: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();
  const isRtl = useIsRtl();
  const t = useStrings();
  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: DEVICE_CAMERA_DRAG_TYPE,
    drop: (item: DeviceCameraDragItem) => onDrop(item),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }), [onDrop]);

  // Slide off-screen toward the inline-start edge — that's `-X` in LTR
  // (left side off-screen) and `+X` in RTL (right side off-screen).
  // Tailwind's `start-3` keeps the visible position on the inline-start
  // edge of the parent so the drop affordance stays in the natural
  // reading-entry corner regardless of locale.
  const hiddenX = shouldReduceMotion ? 0 : (isRtl ? '100%' : '-100%');

  return (
    <div ref={dropRef} className={`absolute start-3 top-3 bottom-3 z-20 w-[180px] ${!visible ? 'pointer-events-none' : ''}`}>
      <motion.div
        animate={visible
          ? { x: 0, opacity: 1 }
          : { x: hiddenX, opacity: 0 }}
        transition={shouldReduceMotion
          ? { duration: 0.15 }
          : { type: 'spring', duration: 0.45, bounce: 0.15 }}
        className={`w-full h-full
          flex flex-col items-center justify-center gap-2
          rounded-xl border-2 border-dashed backdrop-blur-sm
          shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_8px_24px_-4px_rgba(0,0,0,0.5)]
          transition-[background-color,border-color] duration-200 ease-out
          ${isOver
            ? 'border-sky-400/40 bg-[#1c2028]/95'
            : 'border-white/[0.15] bg-[#181818]/95'}`}
      >
        <SplitLeftIcon className={`transition-colors duration-150 ease-out
          ${isOver ? 'text-white/60' : 'text-white/25'}`} />
        <span className={`text-[11px] transition-colors duration-150 ease-out
          ${isOver ? 'text-white/60' : 'text-white/30'}`}>
          {isOver ? t.dashboard.dropZoneRelease : t.dashboard.dropZoneHint}
        </span>
      </motion.div>
    </div>
  );
}

/**
 * Props for {@link Dashboard}.
 *
 * The dashboard is normally self-contained (no consumer-supplied data),
 * but a small set of opt-in switches exists so the same component can
 * be rendered as a marketing-recording surface from `/demo`. Defaults
 * preserve the production behaviour exactly — only the marketing route
 * passes anything other than `false`.
 */
interface DashboardProps {
  /**
   * Render the production dashboard with marketing-recording defaults:
   *   - flat dark monochrome basemap (CartoDB Dark Matter, no labels)
   *     instead of the satellite imagery
   *
   * Off (the default) keeps every operator-facing surface identical to
   * production. The flag is read once per render and threaded straight
   * down to {@link CesiumTacticalMap}; nothing else in the dashboard
   * branches on it today.
   */
  demoMode?: boolean;
}

export const Dashboard = ({ demoMode = false }: DashboardProps = {}) => {
  const allDevices = useDevicesFromAssets();
  const cameraPresets = useCameraPresets();
  // Active i18n catalog. Locale is driven by the direction system
  // (`'rtl'` ⇒ Hebrew, `'ltr'` ⇒ English), so the marketing
  // `/demo` route — which forces direction to `'ltr'` via the
  // outer `<DirectionProvider forceDirection="ltr">` — automatically
  // gets English everywhere this catalog is read.
  const t = useStrings();
  const locale = useLocale();
  // Friendly patrol drones — names + altitudes come from the active
  // catalog so they read in the current language. Memoised by locale
  // so a steady-state render doesn't re-allocate the array.
  const friendlyPatrolRoutes = useMemo(() => getFriendlyPatrolRoutes(t), [t]);
  // The slim icon rail follows app direction, so its tooltips need to flip
  // to the opposite physical side. In LTR the rail sits on the left edge
  // of the viewport (tooltips fly right); in RTL it sits on the right edge
  // (tooltips fly left). Computed once and reused at every TooltipContent.
  const { direction, toggleDirection } = useDirection();
  const isRtl = direction === 'rtl';
  const railTooltipSide: 'left' | 'right' = isRtl ? 'left' : 'right';
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [devicesPanelOpen, setDevicesPanelOpen] = useState(false);
  const [simulationMenuOpen, setSimulationMenuOpen] = useState(false);
  const [focusedDeviceId, setFocusedDeviceId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [panelSwitching, setPanelSwitching] = useState(false);

  useEffect(() => {
    if (panelSwitching) {
      const id = requestAnimationFrame(() => setPanelSwitching(false));
      return () => cancelAnimationFrame(id);
    }
  }, [panelSwitching]);

  useEffect(() => {
    return () => {
      if (cameraPointingTimeoutRef.current) clearTimeout(cameraPointingTimeoutRef.current);
    };
  }, []);

  const [targets, setTargets] = useState<Detection[]>([]);
  const [hoveredSensorIdFromCard, setHoveredSensorIdFromCard] = useState<string | null>(null);
  const [hoveredTargetIdFromCard, setHoveredTargetIdFromCard] = useState<string | null>(null);
  const [sensorFocusId, setSensorFocusId] = useState<string | null>(null);
  const [cameraLookAtRequest, setCameraLookAtRequest] = useState<{ cameraId: string; targetLat: number; targetLon: number; fovOverrideDeg?: number } | null>(null);
  const [regulusEffectors, setRegulusEffectors] = useState<RegulusEffector[]>(REGULUS_EFFECTORS);
  const [selectedEffectorIds, setSelectedEffectorIds] = useState<Map<string, string>>(new Map());
  const [launcherEffectors, setLauncherEffectors] = useState<LauncherEffector[]>(() => {
    // Initial launcher names come from the catalog at mount time —
    // toggling locale at runtime won't relabel existing launchers
    // (they live in component state), only freshly-mounted dashboards
    // pick up the new language. The toggle is rare enough that
    // accepting this is simpler than wiring a locale-watching effect
    // that mutates the list.
    const initT = getStrings(locale);
    return [
      { id: 'LCHR-NVT-ALPHA', name: initT.simulation.launchers.alpha, lat: 32.4626, lon: 34.9963, status: 'available' },
      { id: 'LCHR-NVT-BRAVO', name: initT.simulation.launchers.bravo, lat: 32.4756, lon: 35.0113, status: 'available' },
      { id: 'LCHR-NVT-GAMMA', name: initT.simulation.launchers.gamma, lat: 32.4506, lon: 35.0243, status: 'available' },
    ];
  });
  const [selectedLauncherIds, setSelectedLauncherIds] = useState<Map<string, string>>(new Map());
  const [mapFocusRequest, setMapFocusRequest] = useState<{ lat: number; lon: number } | null>(null);
  const [allCamerasBusyForTarget, setAllCamerasBusyForTarget] = useState<string | null>(null);
  const [cameraPointingTargetId, setCameraPointingTargetId] = useState<string | null>(null);
  const cameraPointingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cameraViewerFeeds, setCameraViewerFeeds] = useState<CameraFeed[]>([]);
  const isCameraViewerOpen = cameraViewerFeeds.length > 0;

  useEffect(() => {
    if (!sidebarOpen || !devicesPanelOpen) return;
    setDevicesPanelOpen(false);
    setSelectedAssetId(null);
  }, [sidebarOpen, devicesPanelOpen]);

  useEffect(() => {
    if (cameraViewerFeeds.length === 0) {
      setHoveredSensorIdFromCard(null);
    }
  }, [cameraViewerFeeds.length]);

  const handleCameraDrop = useCallback((item: DeviceCameraDragItem) => {
    setCameraViewerFeeds(prev => {
      const already = prev.find(f => f.cameraId === item.cameraId);
      if (already) return prev;
      return [...prev, { cameraId: item.cameraId }];
    });
  }, []);

  const [{ canDropOnMap }, mapDropRef] = useDrop(() => ({
    accept: DEVICE_CAMERA_DRAG_TYPE,
    collect: (monitor) => ({
      canDropOnMap: monitor.canDrop(),
    }),
  }), []);

  const [sidebarWidth, setSidebarWidth] = useState(LAYOUT_TOKENS.sidebarWidthPx);
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const [cameraControlRequest, setCameraControlRequest] = useState<{ targetId: string; countdown: number } | null>(null);
  const [friendlyDrones, setFriendlyDrones] = useState<FriendlyDrone[]>(() => {
    // Same pattern as launchers — drone names are stamped at mount.
    const routes = getFriendlyPatrolRoutes(getStrings(locale));
    return routes.map(r => ({
      id: r.id,
      name: r.name,
      lat: r.waypoints[0][0],
      lon: r.waypoints[0][1],
      altitude: r.altitude,
      headingDeg: 0,
    }));
  });

  const offlineAssetIds = useMemo(
    () => allDevices.filter((d) => d.connectionState === 'offline').map((d) => d.id),
    [allDevices],
  );

  const highlightedSensorIds = useMemo(() => {
    const ids = new Set<string>();
    for (const t of targets) {
      if (t.detectedBySensors) {
        for (const s of t.detectedBySensors) ids.add(s.id);
      }
    }
    return Array.from(ids);
  }, [targets]);

  const cuasIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cuasIntervalRef2 = useRef<NodeJS.Timeout | null>(null);
  const cuasIntervalRef3 = useRef<NodeJS.Timeout | null>(null);
  const cuasIntervalRef4 = useRef<NodeJS.Timeout | null>(null);
  const cuasMassRefs = useRef<NodeJS.Timeout[]>([]);
  // Tracks bare `setTimeout` calls scheduled outside the main timer refs so we
  // can clear them on unmount (CUAS spawn, mitigation cascades, focus resets).
  const pendingTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const [tourTargetId, setTourTargetId] = useState<string | null>(null);

  // Master unmount cleanup for every long-lived timer the dashboard owns.
  // Component unmount only happens on full route changes today, but it's the
  // right hygiene — leaked intervals fire `setTargets` after unmount, which
  // logs a React warning and keeps the entire (heavy) Dashboard subtree alive
  // in the heap.
  useEffect(() => {
    const cuasRefs = [cuasIntervalRef, cuasIntervalRef2, cuasIntervalRef3, cuasIntervalRef4];
    const massRefs = cuasMassRefs;
    const pending = pendingTimeoutsRef;
    const camPointing = cameraPointingTimeoutRef;
    return () => {
      for (const ref of cuasRefs) {
        if (ref.current) {
          clearInterval(ref.current);
          ref.current = null;
        }
      }
      for (const id of massRefs.current) clearInterval(id);
      massRefs.current = [];
      for (const id of pending.current) clearTimeout(id);
      pending.current.clear();
      if (camPointing.current) {
        clearTimeout(camPointing.current);
        camPointing.current = null;
      }
    };
  }, []);

  const tour = useCuasTour(
    useCallback((nextStepIndex: number) => {
      if (nextStepIndex >= 3) {
        setDevicesPanelOpen(false);
        setSelectedAssetId(null);
        setSidebarOpen(true);
      }
      if (nextStepIndex >= 4 && nextStepIndex <= 12 && tourTargetId) {
        setActiveTargetId(tourTargetId);
      }
    }, [tourTargetId]),
  );

  // Defer the (large) react-joyride mount until the user actually starts the
  // tour at least once. Once mounted we keep it alive — toggling between
  // mount + unmount on every tour open would re-fetch the chunk each time.
  const [tourEverStarted, setTourEverStarted] = useState(false);
  useEffect(() => {
    if (tour.run) setTourEverStarted(true);
  }, [tour.run]);

  const tourTarget = useMemo(
    () => tourTargetId ? targets.find(t => t.id === tourTargetId) ?? null : null,
    [targets, tourTargetId],
  );

  // True iff any target has an active weapon-pointing flow. Hoisted out of the
  // CameraViewerPanel JSX so the .some() runs once per `targets` change instead
  // of on every Dashboard render.
  const weaponFeedActive = useMemo(
    () => targets.some(t => t.weaponPointingStatus && t.weaponPointingStatus !== 'idle'),
    [targets],
  );

  // Resolve which target the BDA camera request is currently looking at.
  // Computed once per `targets` / `cameraLookAtRequest` change instead of
  // re-walking the array on every Dashboard render.
  const cameraActiveTargetId = useMemo(() => {
    if (!cameraLookAtRequest) return null;
    const match = targets.find(t => {
      const [lat, lon] = t.coordinates.split(',').map(s => parseFloat(s.trim()));
      return Math.abs(lat - cameraLookAtRequest.targetLat) < 0.01
        && Math.abs(lon - cameraLookAtRequest.targetLon) < 0.01;
    });
    return match?.id ?? null;
  }, [targets, cameraLookAtRequest]);

  useEffect(() => {
    tour.updateTargetState(tourTarget);
  }, [tourTarget, tour.updateTargetState]);

  useEffect(() => {
    if (!tour.run) return;
    const handler = () => tour.notifyCompletedTabClicked();
    const el = document.querySelector('[data-tour="cuas-completed-tab"]');
    el?.addEventListener('click', handler);
    return () => el?.removeEventListener('click', handler);
  }, [tour.run, tour.stepIndex, tour.notifyCompletedTabClicked]);

  useEffect(() => {
    const handleToastClick = (e: any) => {
      const targetId = e.detail?.code;
      if (targetId) {
        setActiveTargetId(targetId);
        setDevicesPanelOpen(false);
        setSelectedAssetId(null);
        setSidebarOpen(true);
      }
    };
    window.addEventListener('toast-clicked', handleToastClick);
    return () => window.removeEventListener('toast-clicked', handleToastClick);
  }, []);

  useEffect(() => {
    if (!cameraControlRequest) return;
    const iv = setInterval(() => {
      setCameraControlRequest(prev => {
        if (!prev) return null;
        if (prev.countdown <= 1) {
          const tgt = targets.find(t => t.id === prev.targetId);
          if (tgt) {
            const [lat, lon] = tgt.coordinates.split(',').map(s => parseFloat(s.trim()));
            const nearest = CAMERA_ASSETS
              .map(c => ({ cam: c, dist: haversineDistanceM(c.latitude, c.longitude, lat, lon) }))
              .sort((a, b) => a.dist - b.dist)[0];
            if (nearest) {
              setCameraLookAtRequest({ cameraId: nearest.cam.id, targetLat: lat, targetLon: lon, fovOverrideDeg: 135 });
              setAllCamerasBusyForTarget(null);
              toast.success(t.toasts.cameraControlAcquired);
            }
          }
          return null;
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [cameraControlRequest?.targetId, targets, t]);

  // --- Friendly drone patrol simulation ---
  // Sims can be disabled via `?sim=off` for perf-sensitive sessions
  // (kiosk mode, demos). When enabled (default) the loop also pauses
  // automatically while the tab is hidden — no point burning GPU on
  // markers that nobody is watching.
  const SIM_ENABLED = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('sim') !== 'off'
    : true;
  const patrolProgressRef = useRef<number[]>(friendlyPatrolRoutes.map(() => 0));
  const friendlyTrailRef = useRef<[number, number][][]>(friendlyPatrolRoutes.map(() => []));
  const trailTickRef = useRef(0);
  // Tick at 250 ms (4 Hz). The kinematic motion track in CesiumMap
  // smoothly interpolates between samples, so the visible movement is
  // still fluid; previously we sampled at ~8 Hz which doubled all
  // downstream work for no perceptible quality gain. PATROL_SPEED is
  // doubled to keep the on-screen drone speed identical.
  const PATROL_TICK_MS = 250;
  const PATROL_SPEED = 0.008;
  // Sample a trail breadcrumb every 4th tick (≈1 s). Each new trail
  // point invalidates the polyline fingerprint and re-tessellates a
  // ground-clamped line in Cesium — by far the heaviest per-frame cost
  // in the simulation. 1 Hz still reads as a continuous breadcrumb path
  // when the line is buffered to 40 points.
  const TRAIL_SAMPLE_EVERY = 4;
  const TRAIL_MAX_POINTS = 40;

  useEffect(() => {
    if (!SIM_ENABLED) return;
    const tick = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      measure('Sim', 'sim.friendlyPatrol', () => {
      trailTickRef.current += 1;
      const sampleTrail = trailTickRef.current % TRAIL_SAMPLE_EVERY === 0;

      patrolProgressRef.current = patrolProgressRef.current.map((p) => {
        const next = p + PATROL_SPEED;
        return next >= friendlyPatrolRoutes[0].waypoints.length ? 0 : next;
      });

      setFriendlyDrones(
        friendlyPatrolRoutes.map((route, i) => {
          const progress = patrolProgressRef.current[i];
          const legIndex = Math.floor(progress) % route.waypoints.length;
          const legFrac = progress - legIndex;
          const from = route.waypoints[legIndex];
          const to = route.waypoints[(legIndex + 1) % route.waypoints.length];

          const lat = from[0] + (to[0] - from[0]) * legFrac;
          const lon = from[1] + (to[1] - from[1]) * legFrac;
          const heading = bearingDegrees(from[0], from[1], to[0], to[1]);

          if (sampleTrail) {
            friendlyTrailRef.current[i] = [...friendlyTrailRef.current[i], [lat, lon]].slice(-TRAIL_MAX_POINTS);
          }

          return {
            id: route.id,
            name: route.name,
            lat,
            lon,
            altitude: route.altitude,
            headingDeg: heading,
            fovDeg: route.fovDeg,
            trail: friendlyTrailRef.current[i],
          };
        })
      );
      }, { properties: { tick: trailTickRef.current, drones: friendlyPatrolRoutes.length } });
    }, PATROL_TICK_MS);

    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Targets still on their initial approach path — loitering must not interfere
  const approachingTargetIds = useRef<Set<string>>(new Set());

  // --- Hostile drone loitering: smooth random movement within asset area until jammed ---
  const loiterStateRef = useRef<Record<string, {
    homeLat: number; homeLon: number;
    heading: number; targetHeading: number;
    nextTurnTick: number; tick: number;
  }>>({});

  // Asset area bounds (derived from sensor/camera/radar positions with padding)
  const AREA_MIN_LAT = 32.4506, AREA_MAX_LAT = 32.4806;
  const AREA_MIN_LON = 34.9813, AREA_MAX_LON = 35.0263;

  useEffect(() => {
    if (!SIM_ENABLED) return;
    const TICK_MS = 250;
    const SPEED = 0.00012; // degrees per tick (~13m)
    const TURN_RATE = 0.08; // max radians per tick to steer toward target heading
    const HOME_RADIUS = 0.006; // ~650m before steering back
    // Same rationale as the friendly-patrol trail sampling: the marker
    // position itself updates every tick (kinematic interpolation keeps
    // movement smooth), but the breadcrumb trail only needs a new point
    // every ~1 s so we don't re-tessellate ground-clamped polylines on
    // every frame.
    const TRAIL_SAMPLE_EVERY = 4;
    let trailTick = 0;

    const interval = setInterval(() => {
      // Tab hidden: pause sim to release GPU/CPU. The map still
      // renders frames on demand for new state but the sim doesn't
      // generate any.
      if (typeof document !== 'undefined' && document.hidden) return;
      measure('Sim', 'sim.hostileLoiter', () => {
      trailTick++;
      const sampleTrail = trailTick % TRAIL_SAMPLE_EVERY === 0;
      // Track which target ids loitered this tick so we can prune
      // `loiterStateRef` entries for targets that left the active-drone set
      // (mitigated, expired, dismissed, or removed entirely). Otherwise the
      // ref grows unboundedly across a long session.
      const activeLoiterIds = new Set<string>();
      setTargets(prev => prev.map(t => {
        if (approachingTargetIds.current.has(t.id)) return t;

        const isActiveDrone = t.entityStage === 'classified'
          && t.classifiedType === 'drone'
          && t.mitigationStatus !== 'mitigating'
          && t.mitigationStatus !== 'mitigated'
          && t.status !== 'event_resolved'
          && t.status !== 'event_neutralized'
          && t.status !== 'expired';
        if (!isActiveDrone) return t;
        activeLoiterIds.add(t.id);

        const [curLat, curLon] = t.coordinates.split(',').map(s => parseFloat(s.trim()));
        if (isNaN(curLat) || isNaN(curLon)) return t;

        if (!loiterStateRef.current[t.id]) {
          loiterStateRef.current[t.id] = {
            homeLat: curLat, homeLon: curLon,
            heading: Math.random() * Math.PI * 2,
            targetHeading: Math.random() * Math.PI * 2,
            nextTurnTick: 8 + Math.floor(Math.random() * 15),
            tick: 0,
          };
        }

        const state = loiterStateRef.current[t.id];
        state.tick++;

        // Periodically pick a new random target heading
        if (state.tick >= state.nextTurnTick) {
          state.targetHeading = Math.random() * Math.PI * 2;
          state.nextTurnTick = state.tick + 10 + Math.floor(Math.random() * 20);
        }

        // If too far from home, steer back
        const dFromHome = Math.sqrt((curLat - state.homeLat) ** 2 + (curLon - state.homeLon) ** 2);
        if (dFromHome > HOME_RADIUS) {
          state.targetHeading = Math.atan2(state.homeLon - curLon, state.homeLat - curLat);
        }

        // Steer toward area center if near bounds
        const latMargin = 0.003, lonMargin = 0.003;
        if (curLat < AREA_MIN_LAT + latMargin) state.targetHeading = Math.PI * 0.5 * (Math.random() - 0.5); // steer north-ish
        if (curLat > AREA_MAX_LAT - latMargin) state.targetHeading = Math.PI + Math.PI * 0.5 * (Math.random() - 0.5);
        if (curLon < AREA_MIN_LON + lonMargin) state.targetHeading = Math.PI * 0.5 + Math.PI * 0.5 * (Math.random() - 0.5);
        if (curLon > AREA_MAX_LON - lonMargin) state.targetHeading = -Math.PI * 0.5 + Math.PI * 0.5 * (Math.random() - 0.5);

        // Smoothly steer current heading toward target
        let diff = state.targetHeading - state.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        state.heading += Math.sign(diff) * Math.min(Math.abs(diff), TURN_RATE);

        const newLat = curLat + Math.cos(state.heading) * SPEED;
        const newLon = curLon + Math.sin(state.heading) * SPEED;

        // Clamp to area
        const clampedLat = Math.max(AREA_MIN_LAT, Math.min(AREA_MAX_LAT, newLat));
        const clampedLon = Math.max(AREA_MIN_LON, Math.min(AREA_MAX_LON, newLon));

        let nextTrail = t.trail;
        if (sampleTrail) {
          const now = nowLocaleTime();
          const updatedTrail = [...(t.trail || []), { lat: clampedLat, lon: clampedLon, timestamp: now }];
          nextTrail = updatedTrail.length > 60 ? updatedTrail.slice(-60) : updatedTrail;
        }

        return {
          ...t,
          coordinates: `${clampedLat.toFixed(5)}, ${clampedLon.toFixed(5)}`,
          trail: nextTrail,
        };
      }));

      // Prune stale loiter state: any id that wasn't active this tick.
      const store = loiterStateRef.current;
      for (const id in store) {
        if (!activeLoiterIds.has(id)) {
          delete store[id];
        }
      }
      }, { properties: { tick: trailTick } });
    }, TICK_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- CUAS Target Spawn ---
  const spawnCuasTarget = useCallback((opts: {
    startLat: number; startLon: number; endLat: number; endLon: number;
    nameSuffix: string; intervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
    isBird?: boolean;
    isCar?: boolean;
    silent?: boolean;
  }) => {
    const targetId = `CUAS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = nowLocaleTime;

    const isCar = !!opts.isCar;
    const isBird = !!opts.isBird;
    // Read the current strings catalog inside the callback so a
    // mid-session locale flip applies to subsequently-spawned
    // targets. (Existing targets keep whatever language was active
    // when they spawned — see the launcher/drone state notes above.)
    const sim = t.simulation;
    const log = t.actionLog;
    const notif = t.notifications;
    const targetName = isCar
      ? sim.targetNameCar(opts.nameSuffix)
      : isBird
        ? sim.targetNameBird(opts.nameSuffix)
        : sim.targetNameDrone(opts.nameSuffix);

    // Drone identity (IFF + model + serial). Birds carry no identity. Cars are
    // ground vehicles, treated as `possibleThreat` here. Drones spawned by the
    // simulator are inbound CUAS threats, so `hostile`. Model/serial are mock
    // values drawn from a small fleet so consecutive spawns show variety on
    // the cards without faking precision the sim doesn't have.
    const DRONE_MODELS: { model: string; sn: string }[] = [
      { model: 'DJI Matrice 4 T/E', sn: 'f7k3c251f00cx623' },
      { model: 'DJI Matrice 4D/4TD', sn: 'f8hgx253q00a05dq' },
      { model: 'DJI Avata 2', sn: 'f6w8b248g0020h44' },
      { model: 'DJI Mavic 3 Pro', sn: 'd45b9174a02e7c10' },
    ];
    const droneIdentity = !isCar && !isBird
      ? DRONE_MODELS[Math.floor(Math.random() * DRONE_MODELS.length)]
      : null;

    const rawDetection: Detection = {
      id: targetId,
      name: targetName,
      type: isCar ? 'ground_vehicle' : isBird ? 'unknown' : 'uav',
      classifiedType: isCar ? 'car' : isBird ? 'bird' : 'drone',
      affiliation: isBird ? 'unknown' : isCar ? 'possibleThreat' : 'hostile',
      model: droneIdentity?.model,
      serialNumber: droneIdentity?.sn,
      status: 'detection',
      timestamp: now(),
      createdAtMs: Date.now(),
      coordinates: `${opts.startLat.toFixed(5)}, ${opts.startLon.toFixed(5)}`,
      distance: sim.distanceKm('3.2'),
      entityStage: 'classified',
      priority: getPriorityBaseline({ status: 'detection', entityStage: 'classified', flowType: 5 }),
      confidence: isCar ? 88 : isBird ? 85 : 92,
      contributingSensors: [{
        sensorId: 'RAD-NVT-RADA',
        sensorType: 'Radar',
        firstDetectedAt: now(),
        lastDetectedAt: now(),
      }],
      trail: [{ lat: opts.startLat, lon: opts.startLon, timestamp: now() }],
      actionLog: [{
        time: now(),
        label: isCar
          ? log.initialDetectionCar
          : isBird
            ? log.initialDetectionBird
            : log.initialDetectionDrone,
      }],
      flowType: 5,
      mitigationStatus: 'idle',
      weaponPointingStatus: isCar ? 'idle' : undefined,
      altitude: isCar ? undefined : sim.altitudeM(120),
      laserDistance: sim.laserDistanceM(2840),
      laserAzimuth: '253.44°',
      laserElevation: '2.39°',
      laserRange: '3575.89 m',
    };

    approachingTargetIds.current.add(targetId);
    setTargets(prev => [...prev, rawDetection]);

    if (!opts.silent) {
      showTacticalNotification({
        title: notif.newDetectionTitle(rawDetection.name ?? ''),
        message: isCar
          ? notif.classifiedGroundThreat(rawDetection.confidence ?? 0)
          : isBird
            ? notif.classifiedAsBird(rawDetection.confidence ?? 0)
            : notif.classifiedAirThreat(rawDetection.confidence ?? 0),
        code: targetId,
        level: isBird ? 'suspect' : 'critical',
      });
    }

    let step = 0;
    opts.intervalRef.current = setInterval(() => {
      step++;
      const tnow = now();
      const progress = Math.min(step / 12, 1);
      const curLat = opts.startLat + (opts.endLat - opts.startLat) * progress;
      const curLon = opts.startLon + (opts.endLon - opts.startLon) * progress;
      const distKm = (3.2 - progress * 2.5).toFixed(1);

      setTargets(prev => prev.map(tgt => {
        if (tgt.id !== targetId) return tgt;
        const updated = { ...tgt };
        updated.coordinates = `${curLat.toFixed(5)}, ${curLon.toFixed(5)}`;
        updated.distance = sim.distanceKm(distKm);
        updated.timestamp = tnow;
        if (tgt.altitude != null) updated.altitude = sim.altitudeM(Math.round(120 + Math.sin(progress * Math.PI) * 30));
        updated.trail = [...(tgt.trail || []), { lat: curLat, lon: curLon, timestamp: tnow }];
        const currentRange = 2840 - progress * 1800;
        updated.laserDistance = sim.laserDistanceM(Math.round(currentRange));
        updated.laserAzimuth = `${(253.44 - progress * 12).toFixed(2)}°`;
        updated.laserElevation = `${(2.39 + progress * 3.5).toFixed(2)}°`;
        updated.laserRange = `${currentRange.toFixed(2)} m`;

        if (step === 2 && tgt.entityStage === 'raw_detection') {
          updated.confidence = 45;
          updated.contributingSensors = [
            ...(tgt.contributingSensors || []),
            { sensorId: 'SENS-NVT-MAGOS-N', sensorType: 'Magos', firstDetectedAt: tnow, lastDetectedAt: tnow },
          ];
          updated.actionLog = [...(tgt.actionLog || []), { time: tnow, label: log.additionalSensorMagos }];
          showTacticalNotification({
            title: notif.additionalSensorTitle(updated.name ?? tgt.name ?? ''),
            message: notif.additionalSensorMessageMagos(updated.confidence ?? 0, updated.contributingSensors.length - 1),
            code: targetId,
            level: 'info',
          });
        }

        if (step === 3 && tgt.entityStage === 'raw_detection') {
          updated.contributingSensors = [
            ...(updated.contributingSensors || []),
            { sensorId: 'RAD-NVT-ELTA', sensorType: 'Radar', firstDetectedAt: tnow, lastDetectedAt: tnow },
          ];
          updated.confidence = 65;
          updated.actionLog = [...(updated.actionLog || []), { time: tnow, label: log.additionalSensorElta }];
          showTacticalNotification({
            title: notif.additionalSensorTitle(updated.name ?? tgt.name ?? ''),
            message: notif.additionalSensorMessageElta(updated.confidence ?? 0, updated.contributingSensors.length - 1),
            code: targetId,
            level: 'info',
          });
        }

        if (step === 5 && tgt.entityStage === 'raw_detection') {
          updated.entityStage = 'classified';
          if (opts.isBird) {
            updated.classifiedType = 'bird';
            updated.type = 'unknown';
            updated.name = sim.targetClassifiedBird(tgt.name ?? '');
            updated.confidence = 85;
          } else if (opts.isCar) {
            updated.classifiedType = 'car';
            updated.type = 'ground_vehicle';
            updated.name = sim.targetClassifiedCar(tgt.name ?? '');
            updated.confidence = 88;
            updated.altitude = undefined;
            updated.weaponPointingStatus = 'idle';
          } else {
            updated.classifiedType = 'drone';
            updated.type = 'uav';
            updated.name = sim.targetClassifiedDrone(tgt.name ?? '');
            updated.confidence = 92;
          }
          updated.status = 'detection';
          updated.priority = getPriorityBaseline(updated);
          updated.actionLog = [...(updated.actionLog || []), { time: tnow, label: opts.isBird ? log.classifiedAsBird : log.classifiedAsDrone }];
          setTimeout(() => {
            showTacticalNotification({
              title: notif.newDetectionTitle(updated.name ?? ''),
              message: opts.isBird
                ? notif.awaitingApproval(updated.confidence ?? 0)
                : notif.classifiedDroneAwait(updated.confidence ?? 0),
              code: targetId,
              level: opts.isBird ? 'suspect' : 'critical',
            });
          }, 200);
        }

        if (updated.contributingSensors) {
          updated.contributingSensors = updated.contributingSensors.map(s => ({ ...s, lastDetectedAt: tnow }));
        }

        return updated;
      }));

      if (step >= 12) {
        if (opts.intervalRef.current) clearInterval(opts.intervalRef.current);
        approachingTargetIds.current.delete(targetId);
      }
    }, 2000);

    return targetId;
  }, [activeTargetId, t]);

  // --- CUAS Simulation Flows ---
  const handleCUASFlow = useCallback(() => {
    setSimulationMenuOpen(false);
    if (devicesPanelOpen) setPanelSwitching(true);
    setDevicesPanelOpen(false);
    setSelectedAssetId(null);
    setSidebarOpen(true);
    if (cuasIntervalRef.current) clearInterval(cuasIntervalRef.current);
    if (cuasIntervalRef2.current) clearInterval(cuasIntervalRef2.current);
    if (cuasIntervalRef3.current) clearInterval(cuasIntervalRef3.current);
    if (cuasIntervalRef4.current) clearInterval(cuasIntervalRef4.current);

    const routes = [
      { startLat: 32.4916, startLon: 35.0313, droneEnd: { lat: 32.4666, lon: 35.0013 }, carEnd: { lat: 32.4836, lon: 35.0233 }, ref: cuasIntervalRef, delay: 0 },
      { startLat: 32.4466, startLon: 34.9713, droneEnd: { lat: 32.4646, lon: 34.9963 }, carEnd: { lat: 32.4506, lon: 34.9773 }, ref: cuasIntervalRef2, delay: 10000 },
      { startLat: 32.4966, startLon: 34.9963, droneEnd: { lat: 32.4716, lon: 35.0063 }, carEnd: { lat: 32.4886, lon: 34.9983 }, ref: cuasIntervalRef3, delay: 15000 },
      { startLat: 32.4416, startLon: 35.0313, droneEnd: { lat: 32.4596, lon: 35.0063 }, carEnd: { lat: 32.4446, lon: 35.0273 }, ref: cuasIntervalRef4, delay: 25000 },
    ];

    // Randomly assign types: ensure at least 1 car, rest are drones with 30% car chance
    const types: Array<'drone' | 'car'> = ['drone', 'drone', 'drone', 'drone'];
    const carIdx = Math.floor(Math.random() * routes.length);
    types[carIdx] = 'car';
    for (let i = 0; i < types.length; i++) {
      if (types[i] === 'drone' && Math.random() < 0.3) types[i] = 'car';
    }

    routes.forEach((route, i) => {
      const isCar = types[i] === 'car';
      const end = isCar ? route.carEnd : route.droneEnd;
      const spawn = () => spawnCuasTarget({
        startLat: route.startLat, startLon: route.startLon,
        endLat: end.lat, endLon: end.lon,
        nameSuffix: String(Math.floor(Math.random() * 900) + 100),
        intervalRef: route.ref,
        isCar,
      });
      if (route.delay === 0) spawn();
      else setTimeout(spawn, route.delay);
    });
  }, [devicesPanelOpen, spawnCuasTarget]);

  const handleCUASSingle = useCallback(() => {
    setSimulationMenuOpen(false);
    if (devicesPanelOpen) setPanelSwitching(true);
    setDevicesPanelOpen(false);
    setSelectedAssetId(null);
    setSidebarOpen(true);

    if (cuasIntervalRef.current) clearInterval(cuasIntervalRef.current);

    const isCar = Math.random() < 0.3;
    const id = spawnCuasTarget({
      startLat: 32.4916, startLon: 35.0313,
      endLat: isCar ? 32.4836 : 32.4666,
      endLon: isCar ? 35.0233 : 35.0013,
      nameSuffix: String(Math.floor(Math.random() * 900) + 100),
      intervalRef: cuasIntervalRef,
      isCar,
    });

    if (tour.run) {
      setTourTargetId(id);
      tour.notifyTargetSpawned();
    }
  }, [devicesPanelOpen, spawnCuasTarget, tour.run, tour.notifyTargetSpawned]);

  const handleCUASMassDetection = useCallback(() => {
    setSimulationMenuOpen(false);
    if (devicesPanelOpen) setPanelSwitching(true);
    setDevicesPanelOpen(false);
    setSelectedAssetId(null);
    setSidebarOpen(true);

    cuasMassRefs.current.forEach(ref => clearInterval(ref));
    cuasMassRefs.current = [];

    const baseLat = 32.4666;
    const baseLon = 35.0013;
    const count = 20;

    for (let i = 0; i < count; i++) {
      const delay = i * 400 + Math.random() * 300;
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const radius = 0.025 + Math.random() * 0.015;
      const startLat = baseLat + Math.cos(angle) * radius;
      const startLon = baseLon + Math.sin(angle) * radius;
      const isCar = Math.random() < 0.3;
      const endOffset = isCar ? 0.015 : 0.008;
      const endLat = isCar
        ? startLat + (baseLat - startLat) * 0.3
        : baseLat + (Math.random() - 0.5) * endOffset;
      const endLon = isCar
        ? startLon + (baseLon - startLon) * 0.3
        : baseLon + (Math.random() - 0.5) * endOffset;

      setTimeout(() => {
        const ref: React.MutableRefObject<NodeJS.Timeout | null> = { current: null };
        spawnCuasTarget({
          startLat, startLon, endLat, endLon,
          nameSuffix: String(100 + i),
          intervalRef: ref,
          isCar,
          silent: true,
        });
        if (ref.current) cuasMassRefs.current.push(ref.current);
      }, delay);
    }

    setTimeout(() => {
      showTacticalNotification({
        title: t.notifications.swarmAlertTitle,
        message: t.notifications.swarmAlertMessage(count),
        code: 'SWARM',
        level: 'critical',
      });
    }, 300);
  }, [devicesPanelOpen, spawnCuasTarget, t]);

  const handleEffectorSelect = useCallback((targetId: string, effectorId: string) => {
    setSelectedEffectorIds(prev => new Map(prev).set(targetId, effectorId));
  }, []);

  // --- CUAS Mitigation Handlers ---
  /**
   * Generic factory for the "activate asset -> set target status -> delay -> advance status" pattern.
   * Covers both jam (mitigate) and weapon pointing flows.
   */
  function createFlowActivateHandler(config: {
    setAssets: React.Dispatch<React.SetStateAction<any[]>>;
    assetActiveStatus: string;
    targetStatusField: 'mitigationStatus' | 'weaponPointingStatus';
    targetAssetIdField: 'mitigatingEffectorId' | 'pointingLauncherId';
    startStatus: string;
    startLog: string;
    startToast: string;
    endStatus: string;
    endLog: string;
    endToast: string;
    endAssetStatus?: string;
    extraEndTargetFields?: Partial<Detection>;
    delayMs: number;
  }) {
    return (targetId: string, assetId: string) => {
      toast.success(config.startToast);
      config.setAssets((prev: any[]) => prev.map((a: any) =>
        a.id === assetId ? { ...a, status: config.assetActiveStatus, activeTargetId: targetId } : a
      ));
      setTargets(prev => appendLog(prev, targetId, `${config.startLog} — ${assetId}`).map(t =>
        t.id === targetId ? { ...t, [config.targetStatusField]: config.startStatus, [config.targetAssetIdField]: assetId } : t
      ));
      setTimeout(() => {
        setTargets(prev => appendLog(prev, targetId, config.endLog).map(t =>
          t.id === targetId ? { ...t, [config.targetStatusField]: config.endStatus, ...config.extraEndTargetFields } : t
        ));
        if (config.endAssetStatus) {
          config.setAssets((prev: any[]) => prev.map((a: any) =>
            a.id === assetId ? { ...a, status: config.endAssetStatus, activeTargetId: undefined } : a
          ));
        }
        toast.success(config.endToast);
      }, config.delayMs);
    };
  }

  const handleMitigate = useCallback(createFlowActivateHandler({
    setAssets: setRegulusEffectors,
    assetActiveStatus: 'active',
    targetStatusField: 'mitigationStatus',
    targetAssetIdField: 'mitigatingEffectorId',
    startStatus: 'mitigating',
    startLog: t.actionLog.jamStart,
    startToast: t.toasts.jamStarted,
    endStatus: 'mitigated',
    endLog: t.actionLog.jamEnd,
    endToast: t.toasts.jamEndedAwaitVerify,
    endAssetStatus: 'available',
    extraEndTargetFields: { missionType: 'jamming', missionStatus: 'waiting_confirmation' },
    delayMs: 3000,
  }), [t]);

  const JAMMABLE_STATUSES = new Set(['suspicion', 'detection', 'tracking', 'event']);

  const handleMitigateAll = useCallback((targetId?: string) => {
    const available = regulusEffectors.filter(r => r.status === 'available');
    toast.success(t.toasts.jamGlobalStarted(available.length));

    setRegulusEffectors(prev => prev.map(r =>
      r.status === 'available' ? { ...r, status: 'active' as const, activeTargetId: targetId } : r
    ));

    setTargets(prev => {
      const logged = targetId ? appendLog(prev, targetId, t.actionLog.jamGlobal(available.length)) : prev;
      return logged.map(tgt => {
        if (JAMMABLE_STATUSES.has(tgt.status) && tgt.mitigationStatus !== 'mitigated') {
          return { ...tgt, mitigationStatus: 'mitigating' as const, mitigatingEffectorId: 'ALL' };
        }
        return tgt;
      });
    });

    setTimeout(() => {
      setTargets(prev => {
        const logged = targetId ? appendLog(prev, targetId, t.actionLog.jamGlobalEnd) : prev;
        return logged.map(tgt =>
          tgt.mitigatingEffectorId === 'ALL' && tgt.mitigationStatus === 'mitigating'
            ? {
                ...tgt,
                mitigationStatus: 'mitigated' as const,
                missionType: 'jamming' as const,
                missionStatus: 'waiting_confirmation' as const,
              }
            : tgt
        );
      });
      setRegulusEffectors(prev => prev.map(r => ({ ...r, status: 'available' as const, activeTargetId: undefined })));
      toast.success(t.toasts.jamEndedAwaitVerify);
    }, 3000);
  }, [regulusEffectors, t]);

  // --- Ground Vehicle Weapon Pointing Handlers ---
  const handleLauncherSelect = useCallback((targetId: string, launcherId: string) => {
    setSelectedLauncherIds(prev => new Map(prev).set(targetId, launcherId));
  }, []);

  const handlePointWeapon = useCallback(createFlowActivateHandler({
    setAssets: setLauncherEffectors,
    assetActiveStatus: 'pointing',
    targetStatusField: 'weaponPointingStatus',
    targetAssetIdField: 'pointingLauncherId',
    startStatus: 'pointing',
    startLog: t.actionLog.weaponStart,
    startToast: t.toasts.weaponPointing,
    endStatus: 'pointed',
    endLog: t.actionLog.weaponEnd,
    endToast: t.toasts.weaponPointed,
    delayMs: 3000,
  }), [t]);

  const handleLockWeapon = useCallback((targetId: string) => {
    setTargets(prev => appendLog(prev, targetId, t.actionLog.locking).map(tgt =>
      tgt.id === targetId ? { ...tgt, weaponPointingStatus: 'locking' as const } : tgt
    ));

    setTimeout(() => {
      setTargets(prev => {
        const tgt = prev.find(tg => tg.id === targetId);
        const launcherId = tgt?.pointingLauncherId;
        if (launcherId) {
          setLauncherEffectors(lp => lp.map(l =>
            l.id === launcherId ? { ...l, status: 'locked' as const } : l
          ));
        }
        return appendLog(prev, targetId, t.actionLog.locked).map(tg =>
          tg.id === targetId ? { ...tg, weaponPointingStatus: 'locked' as const } : tg
        );
      });
      toast.success(t.toasts.lockedReadyForFire);
    }, 1500);
  }, [t]);

  const handleDismissLock = useCallback((targetId: string) => {
    const target = targets.find(tg => tg.id === targetId);
    const wasLocked = target?.weaponPointingStatus === 'locked';
    const launcherId = target?.pointingLauncherId;
    if (launcherId) {
      setLauncherEffectors(prev => prev.map(l =>
        l.id === launcherId ? { ...l, status: 'available' as const, activeTargetId: undefined, bearingDeg: undefined } : l
      ));
    }
    setTargets(prev => appendLog(prev, targetId, wasLocked ? t.actionLog.lockCancelled : t.actionLog.pointingCancelled).map(tg =>
      tg.id === targetId ? { ...tg, weaponPointingStatus: 'idle' as const, pointingLauncherId: undefined } : tg
    ));
    toast.info(wasLocked ? t.toasts.lockCancelled : t.toasts.pointingCancelled);
  }, [targets, t]);

  const handleCompleteMission = useCallback((targetId: string) => {
    const target = targets.find(tg => tg.id === targetId);
    const launcherId = target?.pointingLauncherId;
    if (launcherId) {
      setLauncherEffectors(prev => prev.map(l =>
        l.id === launcherId ? { ...l, status: 'available' as const, activeTargetId: undefined, bearingDeg: undefined } : l
      ));
    }
    setTargets(prev => prev.map(tg => {
      if (tg.id !== targetId) return tg;
      return {
        ...tg,
        missionStatus: 'complete' as const,
        status: 'event_neutralized' as const,
        activityStatus: 'mitigated' as const,
        weaponPointingStatus: 'idle' as const,
        pointingLauncherId: undefined,
      };
    }));
    toast.success(t.toasts.missionComplete);
  }, [targets, t]);

  const handleBdaCamera = useCallback((targetId: string) => {
    if (cameraLookAtRequest) {
      const tgt = targets.find(tg => tg.id === targetId);
      if (tgt) {
        const [latS, lonS] = tgt.coordinates.split(',').map(s => parseFloat(s.trim()));
        const isActiveForTarget = Math.abs(latS - cameraLookAtRequest.targetLat) < 0.01
          && Math.abs(lonS - cameraLookAtRequest.targetLon) < 0.01;
        if (isActiveForTarget) {
          setCameraLookAtRequest(null);
          setAllCamerasBusyForTarget(null);
          toast.success(t.toasts.cameraCancelled);
          return;
        }
      }
    }

    const tgt = targets.find(tg => tg.id === targetId);
    if (!tgt) return;
    const [latS, lonS] = tgt.coordinates.split(',').map(s => parseFloat(s.trim()));
    if (isNaN(latS) || isNaN(lonS)) return;

    const sorted = CAMERA_ASSETS
      .map(c => ({ cam: c, dist: haversineDistanceM(c.latitude, c.longitude, latS, lonS) }))
      .sort((a, b) => a.dist - b.dist);

    const busyCameraId = cameraLookAtRequest?.cameraId ?? null;
    const freeCamera = sorted.find(c => c.cam.id !== busyCameraId);

    if (freeCamera) {
      setCameraLookAtRequest({ cameraId: freeCamera.cam.id, targetLat: latS, targetLon: lonS, fovOverrideDeg: 135 });
      setAllCamerasBusyForTarget(null);
      toast.success(t.toasts.cameraPointingForJamVerify);
      tour.notifyBdaClicked();
    } else {
      setAllCamerasBusyForTarget(targetId);
      toast(t.toasts.allCamerasBusy, { icon: '⚠️' });
    }
  }, [targets, cameraLookAtRequest, tour.notifyBdaClicked, t]);

  const handleRequestCameraControl = useCallback((targetId: string) => {
    setCameraControlRequest({ targetId, countdown: 10 });
    toast(t.toasts.requestingCameraControl, { icon: '🔒' });
  }, [t]);

  const startBdaSequence = useCallback((targetId: string) => {
    const tgt = targets.find(t => t.id === targetId);
    if (tgt) {
      const [latS, lonS] = tgt.coordinates.split(',').map(s => parseFloat(s.trim()));
      if (!isNaN(latS) && !isNaN(lonS)) {
        const cam = CAMERA_ASSETS.reduce((best, c) => {
          const d = haversineDistanceM(c.latitude, c.longitude, latS, lonS);
          return (!best || d < best.dist) ? { cam: c, dist: d } : best;
        }, null as { cam: typeof CAMERA_ASSETS[0]; dist: number } | null);
        if (cam && cam.dist <= 3000) {
          setCameraLookAtRequest({ cameraId: cam.cam.id, targetLat: latS, targetLon: lonS });
        }
      }
    }

    setTimeout(() => {
      setTargets(prev => appendLog(prev, targetId, t.actionLog.bdaInProgress).map(tg =>
        tg.id === targetId ? { ...tg, bdaStatus: 'stabilizing' as const } : tg
      ));
    }, 2000);
    setTimeout(() => {
      setTargets(prev => appendLog(prev, targetId, t.actionLog.bdaObserving).map(tg =>
        tg.id === targetId ? { ...tg, bdaStatus: 'observing' as const } : tg
      ));
    }, 5000);
  }, [targets, t]);

  const handleBdaOutcome = useCallback((targetId: string, outcome: 'neutralized' | 'active' | 'lost') => {
    if (outcome === 'neutralized') {
      setTargets(prev => appendLog(prev, targetId, t.actionLog.bdaNeutralized).map(tg =>
        tg.id === targetId ? { ...tg, bdaStatus: 'complete' as const } : tg
      ));
      toast.success(t.toasts.targetNeutralized);
    } else if (outcome === 'active') {
      setTargets(prev => appendLog(prev, targetId, t.actionLog.bdaStillActive).map(tg =>
        tg.id === targetId ? { ...tg, bdaStatus: undefined, mitigationStatus: 'idle' as const, mitigatingEffectorId: undefined, activityStatus: undefined } : tg
      ));
      toast.warning(t.toasts.targetStillActive);
    } else {
      const now = nowLocaleTime();
      const tgt = targets.find(tg => tg.id === targetId);
      setTargets(prev => appendLog(prev, targetId, t.actionLog.bdaLost).map(tg =>
        tg.id === targetId ? { ...tg, bdaStatus: 'complete' as const, lastSeenAt: now, lastSeenCoordinates: tgt?.coordinates } : tg
      ));
      toast(t.toasts.targetLost);
    }
    setCameraLookAtRequest(null);
  }, [targets, t]);

  // --- Simple Handlers ---
  const handleTargetClick = (target: Detection) => {
    setActiveTargetId(prev => prev === target.id ? null : target.id);
  };

  const handleStartMission = (targetId: string, action: 'intercept' | 'surveillance' | 'investigate') => {
    if (action !== 'investigate') return;
    const target = targets.find(t => t.id === targetId);
    if (!target) return;
    const [lat, lon] = target.coordinates.split(',').map(c => parseFloat(c.trim()));
    if (isNaN(lat) || isNaN(lon)) return;

    let bestCam: typeof CAMERA_ASSETS[0] | null = null;
    let bestDist = Infinity;
    for (const cam of CAMERA_ASSETS) {
      const d = Math.hypot(cam.latitude - lat, cam.longitude - lon);
      if (d < bestDist) { bestDist = d; bestCam = cam; }
    }
    if (bestCam) {
      if (cameraPointingTimeoutRef.current) clearTimeout(cameraPointingTimeoutRef.current);
      setCameraPointingTargetId(targetId);
      setActiveTargetId(targetId);
      setSidebarOpen(true);
      setTargets(prev => appendLog(prev, targetId, t.actionLog.cameraPointing(bestCam!.typeLabel)));
      toast.success(t.toasts.cameraPointingForVerify(bestCam.typeLabel));

      const camRef = bestCam;
      cameraPointingTimeoutRef.current = setTimeout(() => {
        setCameraPointingTargetId(null);
        setCameraLookAtRequest({ cameraId: camRef.id, targetLat: lat, targetLon: lon });
        setTargets(prev => appendLog(prev, targetId, t.actionLog.cameraLocked(camRef.typeLabel)));
        toast.success(t.toasts.cameraLockedOnTarget(camRef.typeLabel));
      }, 1500);
    }
  };

  const handleDismiss = useCallback((targetId: string, reason?: string) => {
    if (reason === 'escalate') {
      const target = targets.find(tg => tg.id === targetId);
      setTargets(prev => appendLog(prev, targetId, t.actionLog.reportSent));
      toast.success(t.toasts.reportSentTo(target?.name || t.toasts.targetFallback));
      return;
    }

    const target = targets.find(tg => tg.id === targetId);
    const launcherId = target?.pointingLauncherId;
    if (launcherId) {
      setLauncherEffectors(prev => prev.map(l =>
        l.id === launcherId ? { ...l, status: 'available' as const, activeTargetId: undefined, bearingDeg: undefined } : l
      ));
    }

    const isBirdConfirm = reason === 'bird_confirmed';
    const isFalseAlarm = reason === 'false_alarm';
    const newStatus = isBirdConfirm || isFalseAlarm ? 'event_resolved' as const : 'expired' as const;
    setTargets(prev => prev.map(tg =>
      tg.id === targetId ? { ...tg, status: newStatus, dismissReason: reason, activityStatus: 'dismissed' as const, weaponPointingStatus: 'idle' as const, pointingLauncherId: undefined } : tg
    ));
    if (activeTargetId === targetId) setActiveTargetId(null);
    const messages: Record<string, string> = {
      bird_confirmed: t.toasts.confirmedAsBird,
      false_alarm: t.toasts.falseAlarm,
    };
    toast(messages[reason || ''] || (reason ? t.toasts.dismissedReason(reason) : t.toasts.dismissedDefault));
  }, [targets, activeTargetId, t]);

  const handleTargetFocus = useCallback((targetId: string) => {
    const target = targets.find(t => t.id === targetId);
    if (!target) return;
    const [lat, lon] = target.coordinates.split(',').map(c => parseFloat(c.trim()));
    if (isNaN(lat) || isNaN(lon)) return;
    setMapFocusRequest({ lat, lon });
    setTimeout(() => setMapFocusRequest(null), 100);
  }, [targets]);

  const handleDeviceFlyTo = useCallback((lat: number, lon: number) => {
    setMapFocusRequest({ lat, lon });
    setTimeout(() => setMapFocusRequest(null), 100);
  }, []);

  const openSystemsPanel = useCallback(() => {
    if (devicesPanelOpen) setPanelSwitching(true);
    setSidebarOpen(true);
    setDevicesPanelOpen(false);
    setSelectedAssetId(null);
  }, [devicesPanelOpen]);

  const closeSystemsPanel = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const openDevicesPanel = useCallback(() => {
    if (sidebarOpen) setPanelSwitching(true);
    setSidebarOpen(false);
    setDevicesPanelOpen(true);
  }, [sidebarOpen]);

  const closeDevicesPanel = useCallback(() => {
    setDevicesPanelOpen(false);
    setSelectedAssetId(null);
  }, []);

  const handleAssetClick = useCallback((assetId: string) => {
    openDevicesPanel();
    setFocusedDeviceId(assetId);
    setSelectedAssetId(assetId);
    setTimeout(() => setFocusedDeviceId(null), 500);
  }, [openDevicesPanel]);

  // Throttle the global `resize` dispatch fired on every ResizablePanel
  // tick. The map listens for `resize` and triggers a Cesium re-render,
  // so an unthrottled stream can fire dozens of times per drag tick on
  // a fast pointer — stalling the actual drag and bloating GPU work.
  // Coalesce to a single rAF tick so at most one resize per frame.
  const resizeRafRef = useRef<number | null>(null);
  const handlePanelResize = useCallback(() => {
    if (resizeRafRef.current != null) return;
    resizeRafRef.current = requestAnimationFrame(() => {
      resizeRafRef.current = null;
      window.dispatchEvent(new Event('resize'));
    });
  }, []);
  useEffect(() => {
    return () => {
      if (resizeRafRef.current != null) {
        cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }
    };
  }, []);

  const handleResizePointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setIsSnapping(false);
    document.body.style.userSelect = 'none';

    const overlay = document.createElement('div');
    overlay.id = 'resize-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '9999', cursor: 'col-resize',
    });
    document.body.appendChild(overlay);

    // Pointer capture routes all subsequent pointer events to the handle
    // element regardless of where the cursor goes — even when it leaves the
    // window. We get a guaranteed `lostpointercapture` cleanup, so the
    // global listener / overlay can never get orphaned (e.g. when an alert
    // or DevTools steals focus mid-drag).
    const target = e.currentTarget;
    const pointerId = e.pointerId;

    const cleanup = () => {
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onUp);
      target.removeEventListener('lostpointercapture', onUp);
      document.body.style.userSelect = '';
      const el = document.getElementById('resize-overlay');
      if (el) el.remove();
    };

    const onMove = (ev: PointerEvent) => {
      const aside = asideRef.current;
      if (!aside) return;
      const parent = aside.parentElement;
      if (!parent) return;
      // Sidebar anchors to the inline-start edge of `parent` (left in LTR,
      // right in RTL). It grows toward the inline-end edge — so width is the
      // distance from the cursor back to the start edge.
      const rect = parent.getBoundingClientRect();
      const distance = isRtl ? (rect.right - ev.clientX) : (ev.clientX - rect.left);
      const newWidth = Math.round(
        Math.max(LAYOUT_TOKENS.sidebarMinWidth, Math.min(LAYOUT_TOKENS.sidebarMaxWidth, distance))
      );
      setSidebarWidth(newWidth);
    };

    const onUp = () => {
      cleanup();
      setSidebarWidth(prev => {
        const snapped = Math.round(prev / LAYOUT_TOKENS.sidebarSnapInterval) * LAYOUT_TOKENS.sidebarSnapInterval;
        return Math.max(LAYOUT_TOKENS.sidebarMinWidth, Math.min(LAYOUT_TOKENS.sidebarMaxWidth, snapped));
      });
      setIsSnapping(true);
      setIsDragging(false);
      setTimeout(() => setIsSnapping(false), 200);
    };

    try {
      target.setPointerCapture(pointerId);
    } catch {
      // setPointerCapture can throw if the pointer is already released; the
      // listeners below still cover the normal completion path.
    }
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onUp);
    target.addEventListener('lostpointercapture', onUp);
  }, [isRtl]);

  const noopStr = () => {};
  const noopStrStr = (_a: string, _b: string) => {};

  // Stable handlers for the map. CesiumTacticalMap stores callbacks in refs
  // internally, but useCallback keeps deps stable in case we wrap it in
  // React.memo later — and avoids handing a fresh closure to the marker
  // sub-components that consume them indirectly.
  const handleMarkerClick = useCallback((id: string) => {
    setActiveTargetId(id);
    openSystemsPanel();
  }, [openSystemsPanel]);

  const handleContextMenuAction = useCallback(
    (action: string, elementType: 'target' | 'effector' | 'sensor', elementId: string) => {
      if (elementType === 'target') {
        if (action === 'open-card') { setActiveTargetId(elementId); openSystemsPanel(); }
        else if (action === 'mitigate') { setActiveTargetId(elementId); openSystemsPanel(); }
        else if (action === 'mitigate-all') { handleMitigateAll(elementId); }
        else if (action === 'dismiss') { handleDismiss(elementId); }
        else if (action === 'track') { setActiveTargetId(elementId); openSystemsPanel(); }
        else if (action === 'investigate') { setActiveTargetId(elementId); openSystemsPanel(); }
      } else if (elementType === 'sensor' && action === 'view-feed') {
        const cam = CAMERA_ASSETS.find(c => c.id === elementId);
        if (cam) {
          setCameraViewerFeeds(prev => {
            const already = prev.find(f => f.cameraId === elementId);
            if (already) return prev;
            if (prev.length === 0) return [{ cameraId: elementId }];
            if (prev.length === 1) return [...prev, { cameraId: elementId }];
            return [{ cameraId: elementId }, prev[1]];
          });
        }
      }
    },
    [openSystemsPanel, handleMitigateAll, handleDismiss],
  );

  return (
    <div className="relative flex w-full h-screen overflow-hidden text-white font-sans selection:bg-red-500/30">
      {/* Minimal Left Nav */}
      <TooltipProvider delayDuration={200}>
      <nav className="relative z-50 flex flex-col justify-start items-center w-8 flex-shrink-0 h-full bg-[#1a1a1a] border-e border-white/10">
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
                pressed={sidebarOpen}
                onPressedChange={(next) => {
                  if (next) openSystemsPanel();
                  else closeSystemsPanel();
                }}
                className="size-6 min-w-6 px-0 rounded bg-transparent text-gray-400 aria-pressed:bg-white/[0.08] aria-pressed:text-white aria-pressed:ring-1 aria-pressed:ring-inset aria-pressed:ring-white/15 hover:text-white hover:bg-white/10 active:scale-[0.97] transition-[color,background-color] focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:outline-none"
                aria-label={sidebarOpen ? t.dashboard.closeSidebar : t.dashboard.openSidebar}
              >
                <List size={20} strokeWidth={1.5} />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side={railTooltipSide} sideOffset={8}>
              {sidebarOpen ? t.dashboard.closeSidebar : t.dashboard.openSidebar}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                pressed={devicesPanelOpen}
                onPressedChange={(next) => {
                  if (next) openDevicesPanel();
                  else closeDevicesPanel();
                }}
                className="size-6 min-w-6 px-0 rounded bg-transparent text-gray-400 aria-pressed:bg-white/[0.08] aria-pressed:text-white aria-pressed:ring-1 aria-pressed:ring-inset aria-pressed:ring-white/15 hover:text-white hover:bg-white/10 active:scale-[0.97] transition-[color,background-color] focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:outline-none"
                aria-label={devicesPanelOpen ? t.dashboard.closeDevices : t.dashboard.devices}
              >
                <DevicesIcon size={20} />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side={railTooltipSide} sideOffset={8}>
              {devicesPanelOpen ? t.dashboard.closeDevices : t.dashboard.devices}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                pressed={isCameraViewerOpen}
                onPressedChange={() => {
                  if (isCameraViewerOpen) {
                    setCameraViewerFeeds([]);
                  } else {
                    setCameraViewerFeeds([{ cameraId: CAMERA_ASSETS[0]?.id ?? '' }]);
                  }
                }}
                className="size-6 min-w-6 px-0 rounded bg-transparent text-gray-400 aria-pressed:bg-white/[0.08] aria-pressed:text-white aria-pressed:ring-1 aria-pressed:ring-inset aria-pressed:ring-white/15 hover:text-white hover:bg-white/10 active:scale-[0.97] transition-[color,background-color] focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:outline-none"
                aria-label={isCameraViewerOpen ? t.dashboard.closeCameras : t.dashboard.cameras}
              >
                <Video size={20} strokeWidth={1.5} />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side={railTooltipSide} sideOffset={8}>
              {isCameraViewerOpen ? t.dashboard.closeCameras : t.dashboard.cameras}
            </TooltipContent>
          </Tooltip>

          <DropdownMenu onOpenChange={(open) => { if (open) tour.notifySimMenuOpened(); }}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    data-cuas-sim-menu
                    className="size-6 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 active:scale-[0.97] transition-[color,background-color] focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:outline-none"
                    aria-label={t.dashboard.cuasScenariosAriaLabel}
                  >
                    <CuasIcon size={20} strokeWidth={1.5} />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side={railTooltipSide} sideOffset={8}>{t.dashboard.cuasScenarios}</TooltipContent>
            </Tooltip>
            <DropdownMenuContent
              side={railTooltipSide}
              align="start"
              sideOffset={8}
              className="w-52 rounded bg-[#202020] border-0 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]"
            >
              <DropdownMenuLabel className="text-[11px] text-white/70 uppercase tracking-wider">CUAS</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem data-tour="cuas-single-sim" onSelect={handleCUASSingle} className="gap-2.5 text-xs text-zinc-300 focus:bg-white/10 focus:text-white">
                <Target size={14} className="shrink-0 text-zinc-400" />
                <span>{t.dashboard.scenarioSingle}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleCUASFlow} className="gap-2.5 text-xs text-zinc-300 focus:bg-white/10 focus:text-white">
                <CuasIcon size={14} className="shrink-0 text-zinc-400" />
                <span>{t.dashboard.scenarioFull}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleCUASMassDetection} className="gap-2.5 text-xs text-zinc-300 focus:bg-white/10 focus:text-white">
                <Radar size={14} className="shrink-0 text-zinc-400" />
                <span>{t.dashboard.scenarioSwarm}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Separator className="bg-white/10" />
        <div className="flex flex-col items-center gap-0.5 py-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={tour.startTour}
                className="size-6 rounded flex items-center justify-center text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 active:scale-[0.97] transition-[color,background-color] focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:outline-none"
                aria-label={t.dashboard.helpTourAriaLabel}
              >
                <HelpCircle size={20} strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side={railTooltipSide} sideOffset={8}>{t.dashboard.helpTour}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href="/styleguide"
                className="size-6 rounded flex items-center justify-center text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 active:scale-[0.97] transition-[color,background-color] focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:outline-none"
                aria-label="Style Guide"
              >
                <Palette size={20} strokeWidth={1.5} />
              </a>
            </TooltipTrigger>
            <TooltipContent side={railTooltipSide} sideOffset={8}>Style Guide</TooltipContent>
          </Tooltip>
          {/*
            Direction toggle — flips the entire app between Hebrew (RTL)
            and English (LTR) writing direction. The choice persists to
            `localStorage` and re-applies on next load.

            We render the *opposite* locale tag inside the button so the
            click target reads like a verb ("press here to switch to EN")
            instead of an indicator. Two-letter pill keeps it within the
            24px slim-rail footprint without an icon.
          */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleDirection}
                aria-label={isRtl ? t.dashboard.switchToEnglish : t.dashboard.switchToHebrew}
                className="size-6 rounded flex items-center justify-center text-[10px] font-mono font-semibold text-gray-400 hover:text-white hover:bg-white/10 active:scale-[0.97] transition-[color,background-color] focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:outline-none"
              >
                {isRtl ? 'EN' : 'עב'}
              </button>
            </TooltipTrigger>
            <TooltipContent side={railTooltipSide} sideOffset={8}>
              {isRtl ? t.dashboard.switchToEnglish : t.dashboard.switchToHebrew}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <NotificationCenter
                  trigger={
                    <button
                      className="size-6 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 active:scale-[0.97] transition-[color,background-color] focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:outline-none"
                      aria-label={t.dashboard.notificationsAriaLabel}
                    >
                      <Bell size={20} strokeWidth={1.5} />
                    </button>
                  }
                />
              </span>
            </TooltipTrigger>
            <TooltipContent side={railTooltipSide} sideOffset={8}>{t.dashboard.notifications}</TooltipContent>
          </Tooltip>
        </div>
      </nav>
      </TooltipProvider>

      {/* Map + Camera Viewer Split */}
      <div className="relative z-0 flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden" data-tour="cuas-map">
        <SplitDropZone
          visible={canDropOnMap}
          onDrop={handleCameraDrop}
        />
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel
            defaultSize={isCameraViewerOpen ? 55 : 100}
            minSize={40}
            onResize={handlePanelResize}
          >
            <div ref={mapDropRef} className="relative w-full h-full">
              {/*
                * Cesium is the only map backend. The viewer is wrapped in an
                * error boundary so a WebGL/scene crash can't take the whole
                * dashboard down with it.
                */}
              <CesiumErrorBoundary>
                <PerfProfiled id="CesiumTacticalMap">
                <CesiumTacticalMap
                  targets={targets}
                  activeTargetId={activeTargetId}
                  onMarkerClick={handleMarkerClick}
                  highlightedSensorIds={highlightedSensorIds}
                  hoveredSensorIdFromCard={hoveredSensorIdFromCard}
                  sensorFocusId={sensorFocusId}
                  onContextMenuAction={handleContextMenuAction}
                  regulusEffectors={regulusEffectors}
                  focusCoords={null}
                  jammingTargetId={null}
                  jammingJammerAssetId={null}
                  controlIndicator={false}
                  fitBoundsPoints={null}
                  activeDrone={null}
                  missionRoute={null}
                  planningScanViz={null}
                  selectedAssetId={selectedAssetId}
                  friendlyDrones={friendlyDrones}
                  smoothFocusRequest={mapFocusRequest}
                  hoveredTargetIdFromCard={hoveredTargetIdFromCard}
                  onAssetClick={handleAssetClick}
                  offlineAssetIds={offlineAssetIds}
                  selectedEffectorIds={selectedEffectorIds}
                  launcherEffectors={launcherEffectors}
                  selectedLauncherIds={selectedLauncherIds}
                  darkMonochromeMap={demoMode}
                />
                </PerfProfiled>
              </CesiumErrorBoundary>
            </div>
          </ResizablePanel>

          {isCameraViewerOpen && (
            <>
              <ResizableHandle className="w-px bg-white/10 hover:bg-white/20 transition-colors duration-150 ease-out" />
              <ResizablePanel defaultSize={45} minSize={25} maxSize={60} collapsible collapsedSize={0} onCollapse={() => setCameraViewerFeeds([])}>
                <PerfProfiled id="CameraViewerPanel">
                  <CameraViewerPanel
                    feeds={cameraViewerFeeds}
                    onFeedsChange={setCameraViewerFeeds}
                    onCameraHover={setHoveredSensorIdFromCard}
                    weaponFeedActive={weaponFeedActive}
                  />
                </PerfProfiled>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

        {/* Inline-start Sidebar — sits on the inline-start edge of the dashboard,
            adjacent to the slim rail (left in LTR, right in RTL). Slide-out
            animates AWAY from that edge: in LTR that's `-X`; in RTL it's `+X`.
            Border-end is the divider that faces the map. */}
        <aside
          ref={asideRef}
          className={`
            absolute top-0 bottom-0 start-0 bg-[#141414] border-e border-white/10 flex flex-col ${panelSwitching || isDragging ? '' : isSnapping ? '' : 'transition-[transform,opacity] duration-300 ease-in-out'} z-30
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'}
          `}
          style={{
            width: sidebarWidth,
            ...(isDragging ? { transition: 'none', willChange: 'width' } : {}),
            ...(isSnapping ? { transition: 'width 200ms ease-out' } : {}),
          }}
        >
          {sidebarOpen && (
            <div
              onPointerDown={handleResizePointerDown}
              className={`absolute end-0 top-0 bottom-0 w-1.5 z-20 cursor-col-resize transition-colors ${isDragging ? 'bg-white/20' : 'bg-transparent hover:bg-white/10'}`}
            />
          )}
          <div className="flex items-center px-4 h-9 border-b border-white/10">
            <h2 className="text-[11px] font-medium text-white/70 uppercase tracking-wider">{t.dashboard.activeSystemsHeading(targets.length)}</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <PerfProfiled id="ListOfSystems">
            <ListOfSystems
              className="flex flex-col gap-0"
              targets={targets}
              activeTargetId={activeTargetId}
              onTargetClick={handleTargetClick}
              onVerify={handleStartMission}
              onDismiss={handleDismiss}
              onCancelMission={() => {}}
              onCompleteMission={handleCompleteMission}
              onEngage={() => {}}
              onBdaCamera={handleBdaCamera}
              onSendDroneVerification={startBdaSequence}
              droneVerifyingTargetId={null}
              onSensorHover={setHoveredSensorIdFromCard}
              onCameraLookAt={noopStrStr}
              onTakeControl={noopStr}
              onReleaseControl={noopStr}
              onSensorModeChange={() => {}}
              onPlaybookSelect={noopStrStr}
              onClosureOutcome={() => {}}
              onAdvanceFlowPhase={noopStr}
              nearbyCameras={[]}
              nearbyHives={[]}
              onEscalateCreatePOI={noopStr}
              onEscalateSendDrone={noopStr}
              onDroneSelect={noopStrStr}
              onDroneOverride={noopStr}
              onDroneResume={noopStr}
              onDroneRTB={noopStr}
              onMissionActivate={noopStr}
              onMissionPause={noopStr}
              onMissionResume={noopStr}
              onMissionOverride={noopStr}
              onMissionCancel={noopStr}
              missionPlanningMode={null}
              onPlanningRemoveWaypoint={() => {}}
              onPlanningToggleLoop={noopStr}
              onPlanningFinalize={noopStr}
              onPlanningUpdateWaypoint={() => {}}
              onPlanningSetRepetitions={() => {}}
              onPlanningSetDwellTime={() => {}}
              onPlanningSetScanCenter={() => {}}
              onPlanningSetScanWidth={() => {}}
              onPlanningSetScanSteps={() => {}}
              onPlanningSelectCamera={noopStr}
              onPlanningZoomCameras={noopStr}
              onMitigate={handleMitigate}
              onMitigateAll={handleMitigateAll}
              onEffectorSelect={handleEffectorSelect}
              regulusEffectors={regulusEffectors}
              selectedEffectorIds={selectedEffectorIds}
              onPointWeapon={handlePointWeapon}
              onLockWeapon={handleLockWeapon}
              onDismissLock={handleDismissLock}
              onLauncherSelect={handleLauncherSelect}
              launcherEffectors={launcherEffectors}
              selectedLauncherIds={selectedLauncherIds}
              flowAssets={{ regulusEffectors, launcherEffectors }}
              flowSelectedIds={{ regulusEffectors: selectedEffectorIds, launcherEffectors: selectedLauncherIds }}
              onBdaOutcome={handleBdaOutcome}
              cameraActiveTargetId={cameraActiveTargetId}
              cameraPointingTargetId={cameraPointingTargetId}
              allCamerasBusyForTarget={allCamerasBusyForTarget}
              controlRequestCountdown={cameraControlRequest?.countdown ?? null}
              controlRequestTargetId={cameraControlRequest?.targetId ?? null}
              onRequestCameraControl={handleRequestCameraControl}
              onSensorFocus={(sensorId) => {
                setSensorFocusId(sensorId);
                setTimeout(() => setSensorFocusId(null), 2000);
              }}
              onTargetFocus={handleTargetFocus}
              onTargetHover={setHoveredTargetIdFromCard}
              thinMode
            />
            </PerfProfiled>
          </div>
        </aside>

        {/*
          * Conditionally mount the devices panel — when closed it would otherwise
          * stay in the tree (just translated off-screen) and re-run its useMemos,
          * mute interval, and full device-list iteration on every Dashboard
          * render. We trade the slide-out animation for a tighter render budget.
          */}
        {devicesPanelOpen && (
          <DevicesPanel
            devices={allDevices}
            open={devicesPanelOpen}
            onClose={closeDevicesPanel}
            onFlyTo={handleDeviceFlyTo}
            onDeviceHover={setHoveredSensorIdFromCard}
            onDeviceSelect={setSelectedAssetId}
            onJamActivate={(jammerId) => {
              toast.success(t.toasts.jamActivated(jammerId), { duration: 3000 });
            }}
            noTransition={panelSwitching}
            width={sidebarWidth}
            focusedDeviceId={focusedDeviceId}
            title={t.dashboard.devicesPanelTitle}
            closeAriaLabel={t.dashboard.devicesPanelClose}
            cameraPresets={cameraPresets}
            typeLabels={t.devices.typeLabels}
            connectionStateLabels={t.devices.connectionLabels}
            strings={t.devices.strings}
          />
        )}

      </div>

      <NotificationSystem />

      {tourEverStarted && (
        <Suspense fallback={null}>
          <Joyride
            steps={tour.steps}
            run={tour.run}
            stepIndex={tour.stepIndex}
            continuous
            showSkipButton
            scrollToFirstStep
            disableScrollParentFix
            disableOverlayClose
            disableCloseOnEsc
            callback={tour.handleCallback}
            styles={tour.styles}
            locale={tour.locale}
            floaterProps={{ disableAnimation: true }}
          />
        </Suspense>
      )}
    </div>
  );
};
