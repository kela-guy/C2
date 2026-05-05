import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useDrop } from 'react-dnd';
import { TacticalMap, CAMERA_ASSETS, REGULUS_EFFECTORS, bearingDegrees, haversineDistanceM } from './TacticalMap';
import { CesiumTacticalMap } from './CesiumTacticalMap';
import { CesiumErrorBoundary } from './CesiumErrorBoundary';
import { IS_CESIUM } from '@/lib/mapBackend';
import { NotificationSystem, showTacticalNotification } from './NotificationSystem';
import { NotificationCenter } from './NotificationCenter';
import ListOfSystems from '@/imports/ListOfSystems';
import type { Detection, RegulusEffector, LauncherEffector } from '@/imports/ListOfSystems';
import { List, Bell, Radar, HelpCircle, Palette, Target, Video } from 'lucide-react';
import { Toggle } from '@/shared/components/ui/toggle';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/shared/components/ui/tooltip';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/shared/components/ui/dropdown-menu';
import { Separator } from '@/shared/components/ui/separator';
import { DevicesPanel, DevicesIcon, DEVICE_CAMERA_DRAG_TYPE } from './DevicesPanel';
import type { DeviceCameraDragItem } from './DevicesPanel';
import { useDevicesFromAssets, CAMERA_PRESETS } from './useDevicesFromAssets';
import { CameraViewerPanel } from './CameraViewerPanel';
import type { CameraFeed } from './CameraViewerPanel';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/shared/components/ui/resizable';
import { LAYOUT_TOKENS } from '@/primitives/tokens';
import { CuasIcon, C2Logo, SplitLeftIcon } from '@/primitives/ProductIcons';
import { toast } from 'sonner';
import Joyride from 'react-joyride';
import { useCuasTour } from '../hooks/useCuasTour';
import { getPriorityBaseline } from '@/imports/useActivityStatus';

function appendLog(targets: Detection[], targetId: string, label: string): Detection[] {
  const time = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return targets.map(t => t.id !== targetId ? t : {
    ...t,
    actionLog: [...(t.actionLog || []), { time, label }],
  });
}

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

const FRIENDLY_PATROL_ROUTES: { id: string; name: string; altitude: string; fovDeg: number; waypoints: [number, number][] }[] = [
  {
    id: 'FRIENDLY-01', name: 'סיור-3', altitude: '80 מ׳', fovDeg: 78,
    waypoints: [[32.4746, 34.9883], [32.4766, 34.9923], [32.4786, 34.9903], [32.4756, 34.9863]],
  },
  {
    id: 'FRIENDLY-02', name: 'תצפית-7', altitude: '110 מ׳', fovDeg: 105,
    waypoints: [[32.4816, 35.0143], [32.4836, 35.0113], [32.4806, 35.0083], [32.4796, 35.0123]],
  },
  {
    id: 'FRIENDLY-03', name: 'סיור-11', altitude: '95 מ׳', fovDeg: 62,
    waypoints: [[32.4680, 34.9940], [32.4700, 34.9980], [32.4720, 34.9960], [32.4695, 34.9920]],
  },
  {
    id: 'FRIENDLY-04', name: 'תצפית-2', altitude: '120 מ׳', fovDeg: 118,
    waypoints: [[32.4590, 35.0020], [32.4610, 35.0060], [32.4630, 35.0030], [32.4605, 35.0000]],
  },
  {
    id: 'FRIENDLY-05', name: 'סיור-9', altitude: '70 מ׳', fovDeg: 88,
    waypoints: [[32.4850, 34.9980], [32.4870, 35.0020], [32.4890, 34.9990], [32.4860, 34.9960]],
  },
];

function SplitDropZone({
  onDrop,
  visible,
}: {
  onDrop: (item: DeviceCameraDragItem) => void;
  visible: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();
  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: DEVICE_CAMERA_DRAG_TYPE,
    drop: (item: DeviceCameraDragItem) => onDrop(item),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }), [onDrop]);

  const hiddenX = shouldReduceMotion ? 0 : '-100%';

  return (
    <div ref={dropRef} className={`absolute left-3 top-3 bottom-3 z-20 w-[180px] ${!visible ? 'pointer-events-none' : ''}`}>
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
          {isOver ? 'שחרר כדי לצפות' : 'גרור לכאן'}
        </span>
      </motion.div>
    </div>
  );
}

export const Dashboard = () => {
  const allDevices = useDevicesFromAssets();
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
  const [launcherEffectors, setLauncherEffectors] = useState<LauncherEffector[]>([
    { id: 'LCHR-NVT-ALPHA', name: 'משגר אלפא', lat: 32.4626, lon: 34.9963, status: 'available' },
    { id: 'LCHR-NVT-BRAVO', name: 'משגר בראבו', lat: 32.4756, lon: 35.0113, status: 'available' },
    { id: 'LCHR-NVT-GAMMA', name: 'משגר גאמא', lat: 32.4506, lon: 35.0243, status: 'available' },
  ]);
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
  const [friendlyDrones, setFriendlyDrones] = useState<FriendlyDrone[]>(() =>
    FRIENDLY_PATROL_ROUTES.map(r => ({
      id: r.id,
      name: r.name,
      lat: r.waypoints[0][0],
      lon: r.waypoints[0][1],
      altitude: r.altitude,
      headingDeg: 0,
    }))
  );

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
  const [tourTargetId, setTourTargetId] = useState<string | null>(null);
  const activeTarget = targets.find(t => t.id === activeTargetId);

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

  const tourTarget = useMemo(
    () => tourTargetId ? targets.find(t => t.id === tourTargetId) ?? null : null,
    [targets, tourTargetId],
  );

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
              toast.success("שליטה על מצלמה התקבלה — מפנה לאימות");
            }
          }
          return null;
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [cameraControlRequest?.targetId]);

  // --- Friendly drone patrol simulation ---
  const patrolProgressRef = useRef<number[]>(FRIENDLY_PATROL_ROUTES.map(() => 0));
  const friendlyTrailRef = useRef<[number, number][][]>(FRIENDLY_PATROL_ROUTES.map(() => []));
  const trailTickRef = useRef(0);
  const PATROL_SPEED = 0.004;
  const TRAIL_SAMPLE_EVERY = 3;
  const TRAIL_MAX_POINTS = 40;

  useEffect(() => {
    const tick = setInterval(() => {
      trailTickRef.current += 1;
      const sampleTrail = trailTickRef.current % TRAIL_SAMPLE_EVERY === 0;

      patrolProgressRef.current = patrolProgressRef.current.map((p) => {
        const next = p + PATROL_SPEED;
        return next >= FRIENDLY_PATROL_ROUTES[0].waypoints.length ? 0 : next;
      });

      setFriendlyDrones(
        FRIENDLY_PATROL_ROUTES.map((route, i) => {
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
    }, 120);

    return () => clearInterval(tick);
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
    const TICK_MS = 250;
    const SPEED = 0.00012; // degrees per tick (~13m)
    const TURN_RATE = 0.08; // max radians per tick to steer toward target heading
    const HOME_RADIUS = 0.006; // ~650m before steering back

    const interval = setInterval(() => {
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

        const now = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const updatedTrail = [...(t.trail || []), { lat: clampedLat, lon: clampedLon, timestamp: now }];

        return {
          ...t,
          coordinates: `${clampedLat.toFixed(5)}, ${clampedLon.toFixed(5)}`,
          trail: updatedTrail.length > 60 ? updatedTrail.slice(-60) : updatedTrail,
        };
      }));
    }, TICK_MS);

    return () => clearInterval(interval);
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
    const now = () => new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const isCar = !!opts.isCar;
    const isBird = !!opts.isBird;
    const targetName = isCar ? `רכב — זיהוי ${opts.nameSuffix}`
      : isBird ? `ציפור — זיהוי ${opts.nameSuffix}`
      : `רחפן — זיהוי ${opts.nameSuffix}`;
    const rawDetection: Detection = {
      id: targetId,
      name: targetName,
      type: isCar ? 'ground_vehicle' : isBird ? 'unknown' : 'uav',
      classifiedType: isCar ? 'car' : isBird ? 'bird' : 'drone',
      status: 'detection',
      timestamp: now(),
      createdAtMs: Date.now(),
      coordinates: `${opts.startLat.toFixed(5)}, ${opts.startLon.toFixed(5)}`,
      distance: '3.2 ק״מ',
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
      actionLog: [{ time: now(), label: isCar ? 'זיהוי ראשוני — רכב עוין' : isBird ? 'זיהוי ראשוני — ציפור' : 'זיהוי ראשוני — רחפן עוין' }],
      flowType: 5,
      mitigationStatus: 'idle',
      weaponPointingStatus: isCar ? 'idle' : undefined,
      altitude: isCar ? undefined : '120 מ׳',
      laserDistance: '2,840 מ׳',
      laserAzimuth: '253.44°',
      laserElevation: '2.39°',
      laserRange: '3575.89 m',
    };

    approachingTargetIds.current.add(targetId);
    setTargets(prev => [...prev, rawDetection]);

    if (!opts.silent) {
      showTacticalNotification({
        title: `זיהוי חדש — ${rawDetection.name}`,
        message: `ביטחון ${rawDetection.confidence}% — ${isCar ? 'איום קרקעי מסווג' : isBird ? 'סווג כציפור' : 'איום אווירי מסווג'}`,
        code: targetId,
        level: isBird ? 'suspect' : 'critical',
      });
    }

    let step = 0;
    opts.intervalRef.current = setInterval(() => {
      step++;
      const t = now();
      const progress = Math.min(step / 12, 1);
      const curLat = opts.startLat + (opts.endLat - opts.startLat) * progress;
      const curLon = opts.startLon + (opts.endLon - opts.startLon) * progress;
      const distKm = (3.2 - progress * 2.5).toFixed(1);

      setTargets(prev => prev.map(tgt => {
        if (tgt.id !== targetId) return tgt;
        const updated = { ...tgt };
        updated.coordinates = `${curLat.toFixed(5)}, ${curLon.toFixed(5)}`;
        updated.distance = `${distKm} ק״מ`;
        updated.timestamp = t;
        if (tgt.altitude != null) updated.altitude = `${Math.round(120 + Math.sin(progress * Math.PI) * 30)} מ׳`;
        updated.trail = [...(tgt.trail || []), { lat: curLat, lon: curLon, timestamp: t }];
        const currentRange = 2840 - progress * 1800;
        updated.laserDistance = `${Math.round(currentRange)} מ׳`;
        updated.laserAzimuth = `${(253.44 - progress * 12).toFixed(2)}°`;
        updated.laserElevation = `${(2.39 + progress * 3.5).toFixed(2)}°`;
        updated.laserRange = `${currentRange.toFixed(2)} m`;

        if (step === 2 && tgt.entityStage === 'raw_detection') {
          updated.confidence = 45;
          updated.contributingSensors = [
            ...(tgt.contributingSensors || []),
            { sensorId: 'SENS-NVT-MAGOS-N', sensorType: 'Magos', firstDetectedAt: t, lastDetectedAt: t },
          ];
          updated.actionLog = [...(tgt.actionLog || []), { time: t, label: 'חיישן נוסף — Magos North' }];
          showTacticalNotification({
            title: `חיישן נוסף — ${updated.name ?? tgt.name}`,
            message: `ביטחון ${updated.confidence}% — SENS-NVT-MAGOS-N (+${updated.contributingSensors.length - 1})`,
            code: targetId,
            level: 'info',
          });
        }

        if (step === 3 && tgt.entityStage === 'raw_detection') {
          updated.contributingSensors = [
            ...(updated.contributingSensors || []),
            { sensorId: 'RAD-NVT-ELTA', sensorType: 'Radar', firstDetectedAt: t, lastDetectedAt: t },
          ];
          updated.confidence = 65;
          updated.actionLog = [...(updated.actionLog || []), { time: t, label: 'חיישן נוסף — Elta MHR' }];
          showTacticalNotification({
            title: `חיישן נוסף — ${updated.name ?? tgt.name}`,
            message: `ביטחון ${updated.confidence}% — RAD-NVT-ELTA (+${updated.contributingSensors.length - 1})`,
            code: targetId,
            level: 'info',
          });
        }

        if (step === 5 && tgt.entityStage === 'raw_detection') {
          updated.entityStage = 'classified';
          if (opts.isBird) {
            updated.classifiedType = 'bird';
            updated.type = 'unknown';
            updated.name = `ציפור — ${tgt.name}`;
            updated.confidence = 85;
          } else if (opts.isCar) {
            updated.classifiedType = 'car';
            updated.type = 'ground_vehicle';
            updated.name = `רכב — ${tgt.name}`;
            updated.confidence = 88;
            updated.altitude = undefined;
            updated.weaponPointingStatus = 'idle';
          } else {
            updated.classifiedType = 'drone';
            updated.type = 'uav';
            updated.name = `רחפן — ${tgt.name}`;
            updated.confidence = 92;
          }
          updated.status = 'detection';
          updated.priority = getPriorityBaseline(updated);
          updated.actionLog = [...(updated.actionLog || []), { time: t, label: opts.isBird ? 'סווג כציפור — ביטחון 85%' : 'סווג כרחפן — ביטחון 92%' }];
          setTimeout(() => {
            showTacticalNotification({
              title: `זיהוי חדש — ${updated.name}`,
              message: `ביטחון ${updated.confidence}% — ${opts.isBird ? 'ממתין לאישור' : 'איום מסווג — רחפן עוין'}`,
              code: targetId,
              level: opts.isBird ? 'suspect' : 'critical',
            });
          }, 200);
        }

        if (updated.contributingSensors) {
          updated.contributingSensors = updated.contributingSensors.map(s => ({ ...s, lastDetectedAt: t }));
        }

        return updated;
      }));

      if (step >= 12) {
        if (opts.intervalRef.current) clearInterval(opts.intervalRef.current);
        approachingTargetIds.current.delete(targetId);
      }
    }, 2000);

    return targetId;
  }, [activeTargetId]);

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
        title: 'התראת נחיל',
        message: `${count} זיהויים בו-זמנית — מצב חירום`,
        code: 'SWARM',
        level: 'critical',
      });
    }, 300);
  }, [devicesPanelOpen, spawnCuasTarget]);

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
    startLog: 'שיבוש',
    startToast: 'שיבוש אלקטרוני הופעל',
    endStatus: 'mitigated',
    endLog: 'שיבוש הושלם — ממתין לאימות',
    endToast: 'שיבוש הושלם — נדרש אימות',
    endAssetStatus: 'available',
    extraEndTargetFields: { missionType: 'jamming', missionStatus: 'waiting_confirmation' },
    delayMs: 3000,
  }), []);

  const JAMMABLE_STATUSES = new Set(['suspicion', 'detection', 'tracking', 'event']);

  const handleMitigateAll = useCallback((targetId?: string) => {
    const available = regulusEffectors.filter(r => r.status === 'available');
    toast.success(`שיבוש כללי הופעל — ${available.length} אפקטורים`);

    setRegulusEffectors(prev => prev.map(r =>
      r.status === 'available' ? { ...r, status: 'active' as const, activeTargetId: targetId } : r
    ));

    setTargets(prev => {
      const logged = targetId ? appendLog(prev, targetId, `שיבוש כללי — ${available.length} אפקטורים`) : prev;
      return logged.map(t => {
        if (JAMMABLE_STATUSES.has(t.status) && t.mitigationStatus !== 'mitigated') {
          return { ...t, mitigationStatus: 'mitigating' as const, mitigatingEffectorId: 'ALL' };
        }
        return t;
      });
    });

    setTimeout(() => {
      setTargets(prev => {
        const logged = targetId ? appendLog(prev, targetId, 'שיבוש כללי הושלם — ממתין לאימות') : prev;
        return logged.map(t =>
          t.mitigatingEffectorId === 'ALL' && t.mitigationStatus === 'mitigating'
            ? {
                ...t,
                mitigationStatus: 'mitigated' as const,
                missionType: 'jamming' as const,
                missionStatus: 'waiting_confirmation' as const,
              }
            : t
        );
      });
      setRegulusEffectors(prev => prev.map(r => ({ ...r, status: 'available' as const, activeTargetId: undefined })));
      toast.success('שיבוש הושלם — נדרש אימות');
    }, 3000);
  }, [regulusEffectors]);

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
    startLog: 'כיוון נשק',
    startToast: 'מכוון נשק למטרה',
    endStatus: 'pointed',
    endLog: 'נשק מכוון — ממתין לנעילה',
    endToast: 'נשק מכוון — ניתן לנעול',
    delayMs: 3000,
  }), []);

  const handleLockWeapon = useCallback((targetId: string) => {
    setTargets(prev => appendLog(prev, targetId, 'נועל על מטרה...').map(t =>
      t.id === targetId ? { ...t, weaponPointingStatus: 'locking' as const } : t
    ));

    setTimeout(() => {
      setTargets(prev => {
        const tgt = prev.find(t => t.id === targetId);
        const launcherId = tgt?.pointingLauncherId;
        if (launcherId) {
          setLauncherEffectors(lp => lp.map(l =>
            l.id === launcherId ? { ...l, status: 'locked' as const } : l
          ));
        }
        return appendLog(prev, targetId, 'נעול על מטרה').map(t =>
          t.id === targetId ? { ...t, weaponPointingStatus: 'locked' as const } : t
        );
      });
      toast.success('נעול על מטרה — עבור למכשיר חיצוני לירי');
    }, 1500);
  }, []);

  const handleDismissLock = useCallback((targetId: string) => {
    const target = targets.find(t => t.id === targetId);
    const wasLocked = target?.weaponPointingStatus === 'locked';
    const launcherId = target?.pointingLauncherId;
    if (launcherId) {
      setLauncherEffectors(prev => prev.map(l =>
        l.id === launcherId ? { ...l, status: 'available' as const, activeTargetId: undefined, bearingDeg: undefined } : l
      ));
    }
    setTargets(prev => appendLog(prev, targetId, wasLocked ? 'נעילה בוטלה' : 'כיוון בוטל').map(t =>
      t.id === targetId ? { ...t, weaponPointingStatus: 'idle' as const, pointingLauncherId: undefined } : t
    ));
    toast.info(wasLocked ? 'נעילה בוטלה' : 'כיוון בוטל');
  }, [targets]);

  const handleCompleteMission = useCallback((targetId: string) => {
    const target = targets.find(t => t.id === targetId);
    const launcherId = target?.pointingLauncherId;
    if (launcherId) {
      setLauncherEffectors(prev => prev.map(l =>
        l.id === launcherId ? { ...l, status: 'available' as const, activeTargetId: undefined, bearingDeg: undefined } : l
      ));
    }
    setTargets(prev => prev.map(t => {
      if (t.id !== targetId) return t;
      return {
        ...t,
        missionStatus: 'complete' as const,
        status: 'event_neutralized' as const,
        activityStatus: 'mitigated' as const,
        weaponPointingStatus: 'idle' as const,
        pointingLauncherId: undefined,
      };
    }));
    toast.success('משימה הושלמה בהצלחה');
  }, [targets]);

  const handleBdaCamera = useCallback((targetId: string) => {
    if (cameraLookAtRequest) {
      const tgt = targets.find(t => t.id === targetId);
      if (tgt) {
        const [latS, lonS] = tgt.coordinates.split(',').map(s => parseFloat(s.trim()));
        const isActiveForTarget = Math.abs(latS - cameraLookAtRequest.targetLat) < 0.01
          && Math.abs(lonS - cameraLookAtRequest.targetLon) < 0.01;
        if (isActiveForTarget) {
          setCameraLookAtRequest(null);
          setAllCamerasBusyForTarget(null);
          toast.success('מצלמה בוטלה');
          return;
        }
      }
    }

    const tgt = targets.find(t => t.id === targetId);
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
      toast.success('מפנה מצלמה לאימות שיבוש');
      tour.notifyBdaClicked();
    } else {
      setAllCamerasBusyForTarget(targetId);
      toast("כל המצלמות תפוסות — לחץ 'בקש שליטה' להשגת גישה", { icon: '⚠️' });
    }
  }, [targets, cameraLookAtRequest, tour.notifyBdaClicked]);

  const handleRequestCameraControl = useCallback((targetId: string) => {
    setCameraControlRequest({ targetId, countdown: 10 });
    toast("מבקש שליטה על מצלמה...", { icon: '🔒' });
  }, []);

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
      setTargets(prev => appendLog(prev, targetId, 'BDA — מתייצב').map(t =>
        t.id === targetId ? { ...t, bdaStatus: 'stabilizing' as const } : t
      ));
    }, 2000);
    setTimeout(() => {
      setTargets(prev => appendLog(prev, targetId, 'BDA — תצפית פעילה').map(t =>
        t.id === targetId ? { ...t, bdaStatus: 'observing' as const } : t
      ));
    }, 5000);
  }, [targets]);

  const handleBdaOutcome = useCallback((targetId: string, outcome: 'neutralized' | 'active' | 'lost') => {
    if (outcome === 'neutralized') {
      setTargets(prev => appendLog(prev, targetId, 'BDA — נוטרל').map(t =>
        t.id === targetId ? { ...t, bdaStatus: 'complete' as const } : t
      ));
      toast.success('יעד נוטרל — לחץ סיום משימה להעברה לטופל');
    } else if (outcome === 'active') {
      setTargets(prev => appendLog(prev, targetId, 'BDA — עדיין פעיל').map(t =>
        t.id === targetId ? { ...t, bdaStatus: undefined, mitigationStatus: 'idle' as const, mitigatingEffectorId: undefined, activityStatus: undefined } : t
      ));
      toast.warning('יעד עדיין פעיל — ניתן לשבש שוב');
    } else {
      const now = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const tgt = targets.find(t => t.id === targetId);
      setTargets(prev => appendLog(prev, targetId, 'BDA — אבד מגע').map(t =>
        t.id === targetId ? { ...t, bdaStatus: 'complete' as const, lastSeenAt: now, lastSeenCoordinates: tgt?.coordinates } : t
      ));
      toast('יעד אבד — לחץ סיום משימה להעברה לטופל');
    }
    setCameraLookAtRequest(null);
  }, [targets]);

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
      setTargets(prev => appendLog(prev, targetId, `מצלמה ${bestCam!.typeLabel} מפנה למטרה...`));
      toast.success(`${bestCam.typeLabel} מפנה לאימות...`);

      const camRef = bestCam;
      cameraPointingTimeoutRef.current = setTimeout(() => {
        setCameraPointingTargetId(null);
        setCameraLookAtRequest({ cameraId: camRef.id, targetLat: lat, targetLon: lon });
        setTargets(prev => appendLog(prev, targetId, `מצלמה ${camRef.typeLabel} נעולה על המטרה`));
        toast.success(`${camRef.typeLabel} נעולה על מטרה`);
      }, 1500);
    }
  };

  const handleDismiss = (targetId: string, reason?: string) => {
    if (reason === 'escalate') {
      const target = targets.find(t => t.id === targetId);
      setTargets(prev => appendLog(prev, targetId, 'דיווח נשלח לגורם ממונה'));
      toast.success(`דיווח נשלח — ${target?.name || 'יעד'}`);
      return;
    }

    const target = targets.find(t => t.id === targetId);
    const launcherId = target?.pointingLauncherId;
    if (launcherId) {
      setLauncherEffectors(prev => prev.map(l =>
        l.id === launcherId ? { ...l, status: 'available' as const, activeTargetId: undefined, bearingDeg: undefined } : l
      ));
    }

    const isBirdConfirm = reason === 'bird_confirmed';
    const isFalseAlarm = reason === 'false_alarm';
    const newStatus = isBirdConfirm || isFalseAlarm ? 'event_resolved' as const : 'expired' as const;
    setTargets(prev => prev.map(t =>
      t.id === targetId ? { ...t, status: newStatus, dismissReason: reason, activityStatus: 'dismissed' as const, weaponPointingStatus: 'idle' as const, pointingLauncherId: undefined } : t
    ));
    if (activeTargetId === targetId) setActiveTargetId(null);
    const messages: Record<string, string> = {
      bird_confirmed: 'אושר כציפור — זיהוי נסגר',
      false_alarm: 'סומן כאזעקת שווא',
    };
    toast(messages[reason || ''] || (reason ? `הוסר: ${reason}` : 'איתור הוסר ממעקב'));
  };

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

  const handleResizePointerDown = useCallback((e: React.PointerEvent) => {
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

    const onMove = (ev: PointerEvent) => {
      const aside = asideRef.current;
      if (!aside) return;
      const parent = aside.parentElement;
      if (!parent) return;
      const parentRight = parent.getBoundingClientRect().right;
      const newWidth = Math.round(
        Math.max(LAYOUT_TOKENS.sidebarMinWidth, Math.min(LAYOUT_TOKENS.sidebarMaxWidth, parentRight - ev.clientX))
      );
      setSidebarWidth(newWidth);
    };

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.body.style.userSelect = '';
      const el = document.getElementById('resize-overlay');
      if (el) el.remove();

      setSidebarWidth(prev => {
        const snapped = Math.round(prev / LAYOUT_TOKENS.sidebarSnapInterval) * LAYOUT_TOKENS.sidebarSnapInterval;
        return Math.max(LAYOUT_TOKENS.sidebarMinWidth, Math.min(LAYOUT_TOKENS.sidebarMaxWidth, snapped));
      });
      setIsSnapping(true);
      setIsDragging(false);
      setTimeout(() => setIsSnapping(false), 200);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }, []);

  const noopStr = () => {};
  const noopStrStr = (_a: string, _b: string) => {};

  return (
    <div className="relative flex w-full h-screen overflow-hidden text-white font-sans selection:bg-red-500/30">
      {/* Minimal Left Nav */}
      <TooltipProvider delayDuration={200}>
      <nav className="relative z-50 flex flex-col justify-start items-center w-8 flex-shrink-0 h-full bg-[#1a1a1a] border-l border-white/10" dir="ltr">
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
                aria-label={sidebarOpen ? 'סגור רשימת מערכות' : 'פתח רשימת מערכות'}
              >
                <List size={20} strokeWidth={1.5} />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={8}>
              {sidebarOpen ? 'סגור רשימת מערכות' : 'פתח רשימת מערכות'}
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
                aria-label={devicesPanelOpen ? 'סגור מכשירים' : 'מכשירים'}
              >
                <DevicesIcon size={20} />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={8}>
              {devicesPanelOpen ? 'סגור מכשירים' : 'מכשירים'}
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
                aria-label={isCameraViewerOpen ? 'סגור מצלמות' : 'מצלמות'}
              >
                <Video size={20} strokeWidth={1.5} />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={8}>
              {isCameraViewerOpen ? 'סגור מצלמות' : 'מצלמות'}
            </TooltipContent>
          </Tooltip>

          <DropdownMenu onOpenChange={(open) => { if (open) tour.notifySimMenuOpened(); }}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    data-cuas-sim-menu
                    className="size-6 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 active:scale-[0.97] transition-[color,background-color] focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:outline-none"
                    aria-label="תרחישי CUAS"
                  >
                    <CuasIcon size={20} strokeWidth={1.5} />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={8}>תרחישי CUAS</TooltipContent>
            </Tooltip>
            <DropdownMenuContent
              side="left"
              align="start"
              sideOffset={8}
              className="w-52 rounded bg-[#202020] border-0 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]"
            >
              <DropdownMenuLabel className="text-[11px] text-white/70 uppercase tracking-wider">CUAS</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem data-tour="cuas-single-sim" onSelect={handleCUASSingle} className="gap-2.5 text-xs text-zinc-300 focus:bg-white/10 focus:text-white">
                <Target size={14} className="shrink-0 text-zinc-400" />
                <span>יעד בודד</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleCUASFlow} className="gap-2.5 text-xs text-zinc-300 focus:bg-white/10 focus:text-white">
                <CuasIcon size={14} className="shrink-0 text-zinc-400" />
                <span>תרחיש מלא (3 יעדים)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleCUASMassDetection} className="gap-2.5 text-xs text-zinc-300 focus:bg-white/10 focus:text-white">
                <Radar size={14} className="shrink-0 text-zinc-400" />
                <span>תרחיש נחיל (20 יעדים)</span>
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
                aria-label="סיור הדרכה"
              >
                <HelpCircle size={20} strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={8}>סיור הדרכה</TooltipContent>
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
            <TooltipContent side="left" sideOffset={8}>Style Guide</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <NotificationCenter
                  trigger={
                    <button
                      className="size-6 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 active:scale-[0.97] transition-[color,background-color] focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:outline-none"
                      aria-label="התראות"
                    >
                      <Bell size={20} strokeWidth={1.5} />
                    </button>
                  }
                />
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={8}>התראות</TooltipContent>
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
            onResize={() => window.dispatchEvent(new Event('resize'))}
          >
            <div ref={mapDropRef} className="relative w-full h-full">
              {(() => {
                // Map backend selector — `?map=cesium` swaps the entire renderer
                // for the Cesium-based component (parity migration in progress).
                // Both branches receive the EXACT same props so the dashboard
                // never has to know which one it's mounting. The Cesium branch
                // is additionally wrapped in an error boundary so a viewer
                // crash doesn't take the whole dashboard down.
                const MapComponent = IS_CESIUM ? CesiumTacticalMap : TacticalMap;
                const mapNode = (
              <MapComponent
                targets={targets}
                activeTargetId={activeTargetId}
                onMarkerClick={(id) => {
                  setActiveTargetId(id);
                  openSystemsPanel();
                }}
                highlightedSensorIds={highlightedSensorIds}
                hoveredSensorIdFromCard={hoveredSensorIdFromCard}
                sensorFocusId={sensorFocusId}
                onContextMenuAction={(action, elementType, elementId) => {
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
                }}
                cameraLookAtRequest={cameraLookAtRequest}
                regulusEffectors={regulusEffectors}
                focusCoords={null}
                missileLaunchRequest={null}
                onMissilePhaseChange={() => {}}
                jammingTargetId={null}
                jammingJammerAssetId={null}
                jammingVerification={null}
                onJammingVerificationComplete={() => {}}
                controlIndicator={false}
                fitBoundsPoints={null}
                activeDrone={null}
                missionRoute={null}
                planningMode={false}
                planningMissionType={undefined}
                planningScanViz={null}
                selectedAssetId={selectedAssetId}
                onMapClick={() => {}}
                friendlyDrones={friendlyDrones}
                smoothFocusRequest={mapFocusRequest}
                hoveredTargetIdFromCard={hoveredTargetIdFromCard}
                onAssetClick={handleAssetClick}
                offlineAssetIds={offlineAssetIds}
                selectedEffectorIds={selectedEffectorIds}
                launcherEffectors={launcherEffectors}
                selectedLauncherIds={selectedLauncherIds}
              />
                );
                return IS_CESIUM
                  ? <CesiumErrorBoundary>{mapNode}</CesiumErrorBoundary>
                  : mapNode;
              })()}
            </div>
          </ResizablePanel>

          {isCameraViewerOpen && (
            <>
              <ResizableHandle className="w-px bg-white/10 hover:bg-white/20 transition-colors duration-150 ease-out" />
              <ResizablePanel defaultSize={45} minSize={25} maxSize={60} collapsible collapsedSize={0} onCollapse={() => setCameraViewerFeeds([])}>
                <CameraViewerPanel
                  feeds={cameraViewerFeeds}
                  onFeedsChange={setCameraViewerFeeds}
                  onCameraHover={setHoveredSensorIdFromCard}
                  weaponFeedActive={targets.some(t => t.weaponPointingStatus && t.weaponPointingStatus !== 'idle')}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

        {/* Right Sidebar */}
        <aside
          ref={asideRef}
          className={`
            absolute top-0 bottom-0 bg-[#141414] border-l border-white/10 flex flex-col ${panelSwitching || isDragging ? '' : isSnapping ? '' : 'transition-[transform,opacity] duration-300 ease-in-out'} z-30
            ${sidebarOpen ? 'translate-x-0 right-0' : 'translate-x-full right-0'}
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
              className={`absolute left-0 top-0 bottom-0 w-1.5 z-20 cursor-col-resize transition-colors ${isDragging ? 'bg-white/20' : 'bg-transparent hover:bg-white/10'}`}
            />
          )}
          <div className="flex items-center px-4 h-9 border-b border-white/10">
            <h2 className="text-[11px] font-medium text-white/70 uppercase tracking-wider">Dashboard — מערכות פעילות ({targets.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
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
              cameraActiveTargetId={cameraLookAtRequest ? targets.find(t => {
                const [lat, lon] = t.coordinates.split(',').map(s => parseFloat(s.trim()));
                return Math.abs(lat - cameraLookAtRequest.targetLat) < 0.01 && Math.abs(lon - cameraLookAtRequest.targetLon) < 0.01;
              })?.id ?? null : null}
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
          </div>
        </aside>

        <DevicesPanel
          devices={allDevices}
          open={devicesPanelOpen}
          onClose={closeDevicesPanel}
          onFlyTo={handleDeviceFlyTo}
          onDeviceHover={setHoveredSensorIdFromCard}
          onDeviceSelect={setSelectedAssetId}
          onJamActivate={(jammerId) => {
            toast.success(`שיבוש הופעל — ${jammerId}`, { duration: 3000 });
          }}
          noTransition={panelSwitching}
          width={sidebarWidth}
          focusedDeviceId={focusedDeviceId}
          title="מכשירים"
          closeAriaLabel="סגור"
          cameraPresets={CAMERA_PRESETS}
          typeLabels={{
            camera: 'מצלמות',
            radar: 'מכ"מים',
            dock: 'כוורות',
            drone: 'רחפנים',
            ecm: 'משבשים',
            launcher: 'משגרים',
            lidar: 'לידר',
            weapon_system: 'מערכות נשק',
          }}
          connectionStateLabels={{
            online: 'מחובר',
            offline: 'לא מקוון',
            error: 'שגיאה',
            warning: 'אזהרה',
          }}
          strings={{
            searchPlaceholder: 'חיפוש...',
            clearSearch: 'נקה חיפוש',
            resetFilters: 'איפוס סינון',
            resetFiltersLabel: 'ניקוי',
            noMatches: 'אין מכשירים תואמים',
            location: 'מיקום',
            bearing: 'כיוון',
            fieldOfView: 'שדה ראייה',
            coverage: 'כיסוי',
            altitude: 'גובה',
            health: 'תקינות',
            healthOk: 'תקין',
            healthMalfunction: 'תקלה',
            battery: 'סוללה',
            jam: 'הפעל',
            jamActive: 'שיבוש פעיל',
            jamDisabledOffline: 'המכשיר לא מקוון',
            jamDisabledMalfunction: 'המכשיר בתקלה',
            jamDisabledAlreadyActive: 'שיבוש כבר פעיל',
            cameraModeAriaLabel: 'מצב מצלמה',
            centerOnMap: 'מרכז במפה',
            mute: 'השתק',
            unmute: 'בטל השתקה',
            wipers: 'מגבים',
            wipersAriaLabel: 'מגבים',
            calibrate: 'כיול',
            calibrating: 'מכייל...',
            calibrated: 'הושלם',
            calibrateAriaLabel: 'כיול',
          }}
        />

      </div>

      <NotificationSystem />

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
    </div>
  );
};
