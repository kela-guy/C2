import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { spring } from '@/lib/springs';
import { useDrop } from 'react-dnd';
import { CAMERA_ASSETS, REGULUS_EFFECTORS, SPEAKER_ASSETS } from './tacticalAssets';
import { DEFAULT_SPEAKER_TRACKS } from './devices-panel';
import { bearingDegrees, haversineDistanceM } from '@/app/lib/mapGeo';
import { LiveCesiumTacticalMap } from './LiveCesiumTacticalMap';
import { useLiveMapStore } from './liveMapStore';
import {
  SonnerPathfinderToast,
  type PathfinderSimSnapshot,
  type PathfinderControls,
} from './pathfinder/SonnerPathfinderToast';
import {
  cardFlightState,
  mapPhase,
  PATHFINDER_DEVICE_ID,
  PATHFINDER_HOME,
  PATHFINDER_LOITER_CENTER,
  PATHFINDER_LOITER_RADIUS,
  PATHFINDER_ORBIT_SPEED,
  PATHFINDER_RETURN_MS,
  PATHFINDER_FOV_DEG,
  type PathfinderCardState,
  type PathfinderMapPhase,
} from './pathfinder/pathfinderState';
import { CesiumErrorBoundary } from './CesiumErrorBoundary';
import { MapDrawOverlay } from './map-draw/MapDrawOverlay';
import { MapDrawProvider } from './map-draw/MapDrawProvider';
import { MapDrawPanel } from './map-draw/MapDrawPanel';
import { FloatingGeoEntitiesControl } from './map-draw/FloatingGeoEntitiesControl';
import { MapFocusBridge } from './map-draw/MapFocusBridge';
import { NotificationSystem, showTacticalNotification } from './NotificationSystem';
import { NotificationCenter } from './NotificationCenter';
import ListOfSystems from '@/imports/ListOfSystems';
import type { Detection, RegulusEffector, LauncherEffector } from '@/imports/ListOfSystems';
import { List, Bell, Palette, Video, Sparkles, Devices, Agents } from '@/lib/icons/central';
import { FlowBuilderPanel, defaultFlowDraft } from './flow-builder/FlowBuilderPanel';
import { useFlowPlayer, type FlowPlayerOps } from './flow-builder/useFlowPlayer';
import type { FlowPreview, SensorDetectionLink } from './CesiumTacticalMap';
import type { FlowDef } from '@/lib/flowBuilder';
import { readFlowPresets, deleteFlowPreset, FLOW_LOCATION_PRESETS } from '@/lib/flowBuilder';
import { computeSeverityTrajectory } from './flow-builder/flowSeverity';
import { SimulationsPanel, type BuiltinKind } from './simulations/SimulationsPanel';
import { resolveTargetSeverity } from '@/primitives/urgency';
import { Toggle } from '@/shared/components/ui/toggle';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/shared/components/ui/tooltip';
import { Separator } from '@/shared/components/ui/separator';
import { DevicesPanel, DEVICE_CAMERA_DRAG_TYPE } from './DevicesPanel';
import type { DeviceCameraDragItem } from './DevicesPanel';
import { useDevicesFromAssets } from './useDevicesFromAssets';
import { useGotchaUnits } from './gotcha/useGotchaUnits';
import { gotchaUnitsToDevices } from './gotcha/gotchaUnitsToDevices';
import { getUnitHealth } from './gotcha/gotchaHealth';
import { CriticalAlertOverlay, type CriticalDroneAlert } from './gotcha/CriticalAlertOverlay';
import { VideoHudPanel } from './video-hud-sandbox/VideoHudPanel';
import type { VideoHudPanelFeed as CameraFeed } from './video-hud-sandbox/VideoHudPanel';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/shared/components/ui/resizable';
import { LAYOUT_TOKENS, SURFACE } from '@/primitives/tokens';
import { toast } from 'sonner';
import { getPriorityBaseline } from '@/imports/useActivityStatus';
import { useDirection, useIsRtl, useLocale } from '@/lib/direction';
import { useStrings, getStrings, type Strings } from '@/lib/intl';

// Stable no-op handler identities and empty collections, shared across renders.
// Defining these at module scope (instead of recreating them inside Dashboard
// on every render) keeps their reference identity constant, which is what lets
// React.memo(ListOfSystems) bail out on the 4 Hz friendly-patrol ticks that
// never touch the target list.
const noop = () => {};
const noopStr = (_a?: string) => {};
const noopStrStr = (_a?: string, _b?: string) => {};
const EMPTY_ARRAY: never[] = [];

// Threat kinds the CUAS simulator can spawn. Drones are the air threat;
// cars, tanks and trucks are ground vehicles engaged on the kinetic path.
type ThreatEntity = 'drone' | 'car' | 'tank' | 'truck' | 'bird';
const GROUND_THREATS: readonly ThreatEntity[] = ['car', 'tank', 'truck'];
const pickGroundThreat = (): ThreatEntity =>
  GROUND_THREATS[Math.floor(Math.random() * GROUND_THREATS.length)];

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

/** Stable id for the single Pathfinder launch toast (replace-in-place). */
const PATHFINDER_TOAST_ID = 'pathfinder-launch';
/**
 * Sonner keeps a dismissed toast in the DOM through its exit animation. Firing a
 * fresh launch toast inside that window stacks it behind the leaving one (reads
 * as a doubled toast), so a re-launch waits this out first.
 */
const PATHFINDER_TOAST_EXIT_MS = 350;

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
          : spring.slow}
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
        <span className={`text-xs transition-colors duration-150 ease-out
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
  /**
   * "Geo Entities Layers" lab mode: opens the map-draw panel on mount
   * and surfaces the panel-design variant switcher (Opt 1..4 + Original).
   * Off (the default) keeps production behaviour. Used by the DEV-only
   * `/geo-entities-layers-sandbox` route.
   */
  drawPanelLab?: boolean;
  /**
   * Lab mode for the Type section of the map-draw panel. Auto-opens the
   * map-draw panel and surfaces a 5-tab switcher (Opt 1..Opt 5) that
   * swaps the zone-type selector's layout. Used by the DEV-only
   * `/geo-entities-type-sandbox` route.
   */
  typePanelLab?: boolean;
}

export const Dashboard = ({
  demoMode = false,
  drawPanelLab = false,
  typePanelLab = false,
}: DashboardProps = {}) => {
  const allDevices = useDevicesFromAssets();
  const { units: gotchaUnits } = useGotchaUnits();
  // Composite Gotcha effectors render through the shared DeviceRow like every
  // other asset; the effector group sorts first via TYPE_ORDER.
  const gotchaDevices = useMemo(() => gotchaUnitsToDevices(gotchaUnits), [gotchaUnits]);
  const devicesWithGotcha = useMemo(
    () => [...gotchaDevices, ...allDevices],
    [gotchaDevices, allDevices],
  );
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
  // Flow Builder panel — independent of the inline-start mutual-exclusion group
  // (queue/devices). It docks on the inline-END so PM can watch the queue + map
  // react while editing the flow.
  const [flowBuilderOpen, setFlowBuilderOpen] = useState(false);
  // Draft owned here (not inside the panel) so closing+reopening
  // the panel preserves in-flight edits. Only named presets persist
  // across reloads — see `c2hub.flowBuilder.presets` in storage.ts.
  const [flowDraft, setFlowDraft] = useState<FlowDef>(() => defaultFlowDraft());
  // Simulations panel — joins the inline-START mutual-exclusion group
  // (queue/devices) so launching a sim naturally "switches to the
  // target panel." Replaces the old CUAS dropdown menu.
  const [simulationsPanelOpen, setSimulationsPanelOpen] = useState(false);
  // Map-draw panel — joins the inline-START mutual-exclusion group
  // (sidebar / Devices / Simulations / Flow Builder). Opening it closes
  // the others and vice-versa. The drawing engine itself lives inside
  // `<MapDrawProvider>` so the panel and the screen-space overlay share
  // selection / draft / tool state.
  const [mapDrawPanelOpen, setMapDrawPanelOpen] = useState(false);
  // Saved flow presets are lifted here so BOTH the Flow Builder (author)
  // and the Simulations panel (run gallery) share one live list — a
  // save in the builder shows up as a card immediately, no reload.
  const [flowPresets, setFlowPresets] = useState<FlowDef[]>(() => readFlowPresets());
  // Which saved preset the Flow Builder currently has loaded (so Save
  // overwrites it). Lifted here so the Simulations "edit" action can
  // load a preset into the builder with the right id.
  const [flowLoadedPresetId, setFlowLoadedPresetId] = useState<string | null>(null);
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
  // Always-fresh mirror of `targets` for callbacks that must read the
  // current track without being recreated each render (e.g. the flow
  // player's camera-point op reads a moving target's live coordinates).
  const targetsRef = useRef<Detection[]>([]);
  targetsRef.current = targets;
  // On/off state for floodlight + PA speaker devices (parent-owned; the
  // devices panel is presentational and reads these sets).
  const [floodlightOnIds, setFloodlightOnIds] = useState<Set<string>>(new Set());
  const [speakerPlayingIds, setSpeakerPlayingIds] = useState<Set<string>>(new Set());
  // Target-card audio broadcast: which target is currently broadcasting over the
  // PA speakers, plus the per-target selected track. Reuses the same speaker
  // pulse path (`speakerPlayingIds` over `SPEAKER_ASSETS`) as the device panel.
  const [audioPlayingTargetId, setAudioPlayingTargetId] = useState<string | null>(null);
  const [selectedAudioTrackIds, setSelectedAudioTrackIds] = useState<Map<string, string>>(new Map());
  // High-frequency map state (4 Hz friendly-drone positions + card/row
  // hover) lives in an external store so its updates re-render only the map
  // subscriber, never the Dashboard root. See `liveMapStore.ts`.
  const liveMap = useLiveMapStore(() => {
    const routes = getFriendlyPatrolRoutes(getStrings(locale));
    return {
      friendlyDrones: routes.map((r) => ({
        id: r.id,
        name: r.name,
        lat: r.waypoints[0][0],
        lon: r.waypoints[0][1],
        altitude: r.altitude,
        headingDeg: 0,
      })),
      hoveredSensorId: null,
      hoveredTargetId: null,
    };
  });
  // ── Pathfinder launch lifecycle ─────────────────────────────────────
  // The launch sim lives inside the Sonner toast (so it re-renders per step);
  // these mirror its state for the two other surfaces. `pathfinderFlightStates`
  // drives the device card's tri-state primary; the refs drive the map marker
  // kinematics, read by the 4 Hz patrol tick below.
  const [pathfinderFlightStates, setPathfinderFlightStates] = useState<
    Record<string, PathfinderCardState>
  >({ [PATHFINDER_DEVICE_ID]: 'docked' });
  // Live abort / return-to-base controls, published by the toast while it runs,
  // so the card's Stop / Return-to-dock buttons can command the same sequence.
  const pathfinderControlsRef = useRef<PathfinderControls | null>(null);
  const pathfinderToastClosedAtRef = useRef(0);
  const pathfinderMapPhaseRef = useRef<PathfinderMapPhase>('docked');
  const pathfinderOrbitRef = useRef(0);
  const pathfinderReturnRef = useRef<{ from: [number, number]; start: number } | null>(null);
  const pathfinderPosRef = useRef<[number, number]>(PATHFINDER_HOME);
  const pathfinderTrailRef = useRef<[number, number][]>([]);
  const pathfinderLabelRef = useRef({
    name: t.simulation.friendlyDrones.pathfinder.name,
    altitude: t.simulation.friendlyDrones.pathfinder.altitude,
  });
  useEffect(() => {
    pathfinderLabelRef.current = {
      name: t.simulation.friendlyDrones.pathfinder.name,
      altitude: t.simulation.friendlyDrones.pathfinder.altitude,
    };
  }, [t]);

  const closePathfinderToast = useCallback(() => {
    pathfinderToastClosedAtRef.current = Date.now();
    toast.dismiss(PATHFINDER_TOAST_ID);
  }, []);

  // Single sync point: the toast reports every phase/runState change here, and
  // we fan it out to the card flight state + the map marker phase.
  const handlePathfinderSimChange = useCallback(
    (snap: PathfinderSimSnapshot) => {
      const card = cardFlightState(snap);
      setPathfinderFlightStates((s) =>
        s[PATHFINDER_DEVICE_ID] === card ? s : { ...s, [PATHFINDER_DEVICE_ID]: card },
      );

      const phase = mapPhase(snap);
      if (phase !== pathfinderMapPhaseRef.current) {
        if (phase === 'returning') {
          pathfinderReturnRef.current = { from: pathfinderPosRef.current, start: Date.now() };
        } else if (phase === 'docked') {
          pathfinderReturnRef.current = null;
          pathfinderTrailRef.current = [];
        }
        pathfinderMapPhaseRef.current = phase;
      }

      if (snap.runState === 'done' || snap.runState === 'aborted') {
        closePathfinderToast();
      }
    },
    [closePathfinderToast],
  );

  const firePathfinderToast = useCallback(() => {
    const show = () =>
      toast.custom(
        () => (
          <SonnerPathfinderToast
            locale={locale}
            onClose={closePathfinderToast}
            onSimChange={handlePathfinderSimChange}
            controlsRef={pathfinderControlsRef}
          />
        ),
        {
          id: PATHFINDER_TOAST_ID,
          duration: Infinity,
          // The shared Toaster styles every `<li>` with its own bg/radius/shadow.
          // Our card brings its own surface, so strip the default container or it
          // peeks out behind ours and reads as a doubled toast.
          unstyled: true,
          style: {
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
            borderRadius: 0,
            padding: 0,
            width: 'auto',
          },
        },
      );
    const sinceClose = Date.now() - pathfinderToastClosedAtRef.current;
    if (sinceClose >= PATHFINDER_TOAST_EXIT_MS) show();
    else window.setTimeout(show, PATHFINDER_TOAST_EXIT_MS - sinceClose);
  }, [locale, closePathfinderToast, handlePathfinderSimChange]);

  const handlePathfinderLaunch = useCallback(() => {
    pathfinderMapPhaseRef.current = 'launching';
    pathfinderOrbitRef.current = 0;
    pathfinderReturnRef.current = null;
    pathfinderTrailRef.current = [];
    pathfinderPosRef.current = PATHFINDER_HOME;
    setPathfinderFlightStates((s) => ({ ...s, [PATHFINDER_DEVICE_ID]: 'launching' }));
    firePathfinderToast();
  }, [firePathfinderToast]);

  // Stop / return command the live sequence; its `onSimChange` then parks the
  // card + map. Defensive fallback resets directly if no toast is live.
  const handlePathfinderAbort = useCallback(() => {
    if (pathfinderControlsRef.current) {
      pathfinderControlsRef.current.abort();
    } else {
      setPathfinderFlightStates((s) => ({ ...s, [PATHFINDER_DEVICE_ID]: 'docked' }));
      pathfinderMapPhaseRef.current = 'docked';
      closePathfinderToast();
    }
  }, [closePathfinderToast]);

  const handlePathfinderReturnToBase = useCallback(() => {
    pathfinderControlsRef.current?.returnToBase();
  }, []);

  const [sensorFocusId, setSensorFocusId] = useState<string | null>(null);
  const [cameraLookAtRequest, setCameraLookAtRequest] = useState<{ cameraId: string; targetLat: number; targetLon: number; fovOverrideDeg?: number } | null>(null);
  const [regulusEffectors, setRegulusEffectors] = useState<RegulusEffector[]>(REGULUS_EFFECTORS);
  const [selectedEffectorIds, setSelectedEffectorIds] = useState<Map<string, string>>(new Map());
  const [selectedGotchaIds, setSelectedGotchaIds] = useState<Map<string, string>>(new Map());
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
      liveMap.setHoveredSensorId(null);
    }
  }, [cameraViewerFeeds.length, liveMap]);

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
      trailTickRef.current += 1;
      const sampleTrail = trailTickRef.current % TRAIL_SAMPLE_EVERY === 0;

      patrolProgressRef.current = patrolProgressRef.current.map((p) => {
        const next = p + PATROL_SPEED;
        return next >= friendlyPatrolRoutes[0].waypoints.length ? 0 : next;
      });

      const drones: FriendlyDrone[] = friendlyPatrolRoutes.map((route, i) => {
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
      });

      // Pathfinder marker — only on the map once a launch is in flight. Driven
      // by the launch lifecycle: holds at the dock through prepare/takeoff,
      // orbits the loiter centre when airborne, then glides home on RTB.
      const pfPhase = pathfinderMapPhaseRef.current;
      if (pfPhase !== 'docked') {
        let plat = PATHFINDER_HOME[0];
        let plon = PATHFINDER_HOME[1];
        let pheading = 0;
        if (pfPhase === 'launching') {
          pheading = bearingDegrees(
            PATHFINDER_HOME[0], PATHFINDER_HOME[1],
            PATHFINDER_LOITER_CENTER[0], PATHFINDER_LOITER_CENTER[1],
          );
        } else if (pfPhase === 'airborne') {
          pathfinderOrbitRef.current += PATHFINDER_ORBIT_SPEED;
          const theta = pathfinderOrbitRef.current;
          const latRad = (PATHFINDER_LOITER_CENTER[0] * Math.PI) / 180;
          plat = PATHFINDER_LOITER_CENTER[0] + PATHFINDER_LOITER_RADIUS * Math.cos(theta);
          plon = PATHFINDER_LOITER_CENTER[1] + (PATHFINDER_LOITER_RADIUS * Math.sin(theta)) / Math.cos(latRad);
          pheading = ((theta * 180) / Math.PI + 90) % 360;
        } else if (pfPhase === 'returning') {
          const r = pathfinderReturnRef.current;
          const frac = r ? Math.min(1, (Date.now() - r.start) / PATHFINDER_RETURN_MS) : 1;
          const fromPos = r?.from ?? PATHFINDER_HOME;
          plat = fromPos[0] + (PATHFINDER_HOME[0] - fromPos[0]) * frac;
          plon = fromPos[1] + (PATHFINDER_HOME[1] - fromPos[1]) * frac;
          pheading = bearingDegrees(plat, plon, PATHFINDER_HOME[0], PATHFINDER_HOME[1]);
        }
        pathfinderPosRef.current = [plat, plon];
        if (sampleTrail && pfPhase !== 'launching') {
          pathfinderTrailRef.current = [...pathfinderTrailRef.current, [plat, plon]].slice(-TRAIL_MAX_POINTS);
        }
        drones.push({
          id: PATHFINDER_DEVICE_ID,
          name: pathfinderLabelRef.current.name,
          lat: plat,
          lon: plon,
          altitude: pathfinderLabelRef.current.altitude,
          headingDeg: pheading,
          fovDeg: PATHFINDER_FOV_DEG,
          trail: pathfinderTrailRef.current,
        });
      }

      liveMap.setFriendlyDrones(drones);
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
      trailTick++;
      const sampleTrail = trailTick % TRAIL_SAMPLE_EVERY === 0;
      // Track which target ids loitered this tick so we can prune
      // `loiterStateRef` entries for targets that left the active-drone set
      // (mitigated, expired, dismissed, or removed entirely). Otherwise the
      // ref grows unboundedly across a long session.
      const activeLoiterIds = new Set<string>();
      setTargets(prev => {
        // Track whether any target actually moved this tick. With zero active
        // drones (no targets, all mitigated/approaching/flow-driven) nothing
        // changes, so we return the SAME array reference to skip a Dashboard
        // re-render entirely instead of allocating a fresh no-op array at 4 Hz.
        let loiterChanged = false;
        const next = prev.map(t => {
        if (approachingTargetIds.current.has(t.id)) return t;
        // Flow Builder spawns drive their own movement loop in
        // `useFlowPlayer`; never let the loiter sim fight it for the
        // same track.
        if (t.id.startsWith('FLOW-')) return t;

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

        loiterChanged = true;
        return {
          ...t,
          coordinates: `${clampedLat.toFixed(5)}, ${clampedLon.toFixed(5)}`,
          trail: nextTrail,
        };
        });
        return loiterChanged ? next : prev;
      });

      // Prune stale loiter state: any id that wasn't active this tick.
      const store = loiterStateRef.current;
      for (const id in store) {
        if (!activeLoiterIds.has(id)) {
          delete store[id];
        }
      }
    }, TICK_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- CUAS Target Spawn ---
  const spawnCuasTarget = useCallback((opts: {
    startLat: number; startLon: number; endLat: number; endLon: number;
    nameSuffix: string; intervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
    /** Precise threat kind. Falls back to the legacy isCar/isBird flags. */
    entity?: 'drone' | 'car' | 'tank' | 'truck' | 'bird';
    isBird?: boolean;
    isCar?: boolean;
    silent?: boolean;
  }) => {
    const targetId = `CUAS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = nowLocaleTime;

    // Resolve the threat kind. `entity` is the precise selector; the
    // legacy isCar/isBird flags are kept so existing callers stay valid.
    const entity = opts.entity ?? (opts.isCar ? 'car' : opts.isBird ? 'bird' : 'drone');
    const isBird = entity === 'bird';
    const isDrone = entity === 'drone';
    // Tanks and trucks join cars as ground vehicles — same kinematics,
    // laser ranging and kinetic (weapon) response path.
    const isGround = entity === 'car' || entity === 'tank' || entity === 'truck';
    // Read the current strings catalog inside the callback so a
    // mid-session locale flip applies to subsequently-spawned
    // targets. (Existing targets keep whatever language was active
    // when they spawned — see the launcher/drone state notes above.)
    const sim = t.simulation;
    const log = t.actionLog;
    const notif = t.notifications;

    // Per-entity copy + numbers, indexed once so the spawn and the
    // later classify step stay in lockstep.
    const nameByEntity = {
      drone: sim.targetNameDrone, car: sim.targetNameCar, tank: sim.targetNameTank,
      truck: sim.targetNameTruck, bird: sim.targetNameBird,
    } as const;
    const classifiedNameByEntity = {
      drone: sim.targetClassifiedDrone, car: sim.targetClassifiedCar, tank: sim.targetClassifiedTank,
      truck: sim.targetClassifiedTruck, bird: sim.targetClassifiedBird,
    } as const;
    const initialLogByEntity = {
      drone: log.initialDetectionDrone, car: log.initialDetectionCar, tank: log.initialDetectionTank,
      truck: log.initialDetectionTruck, bird: log.initialDetectionBird,
    } as const;
    const classifiedLogByEntity = {
      drone: log.classifiedAsDrone, car: log.classifiedAsCar, tank: log.classifiedAsTank,
      truck: log.classifiedAsTruck, bird: log.classifiedAsBird,
    } as const;
    const confidenceByEntity = { drone: 92, car: 88, tank: 90, truck: 89, bird: 85 } as const;

    const targetName = nameByEntity[entity](opts.nameSuffix);

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
    const droneIdentity = isDrone
      ? DRONE_MODELS[Math.floor(Math.random() * DRONE_MODELS.length)]
      : null;

    const rawDetection: Detection = {
      id: targetId,
      name: targetName,
      droneName: droneIdentity ? sim.droneIdentityName(opts.nameSuffix) : undefined,
      type: isBird ? 'unknown' : isGround ? 'ground_vehicle' : 'uav',
      classifiedType: entity,
      // Cars stay a softer `possibleThreat`; tanks/trucks (and drones)
      // are unambiguous inbound hostiles. Birds remain unknown.
      affiliation: isBird ? 'unknown' : entity === 'car' ? 'possibleThreat' : 'hostile',
      model: droneIdentity?.model,
      serialNumber: droneIdentity?.sn,
      status: 'detection',
      timestamp: now(),
      createdAtMs: Date.now(),
      coordinates: `${opts.startLat.toFixed(5)}, ${opts.startLon.toFixed(5)}`,
      distance: sim.distanceKm('3.2'),
      entityStage: 'classified',
      priority: getPriorityBaseline({ status: 'detection', entityStage: 'classified', flowType: 5 }),
      confidence: confidenceByEntity[entity],
      contributingSensors: [{
        sensorId: 'RAD-NVT-RADA',
        sensorType: 'Radar',
        firstDetectedAt: now(),
        lastDetectedAt: now(),
      }],
      trail: [{ lat: opts.startLat, lon: opts.startLon, timestamp: now() }],
      actionLog: [{
        time: now(),
        label: initialLogByEntity[entity],
      }],
      flowType: 5,
      mitigationStatus: 'idle',
      weaponPointingStatus: isGround ? 'idle' : undefined,
      altitude: isGround ? undefined : sim.altitudeM(120),
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
        message: isGround
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
          updated.classifiedType = entity;
          updated.type = isBird ? 'unknown' : isGround ? 'ground_vehicle' : 'uav';
          updated.name = classifiedNameByEntity[entity](tgt.name ?? '');
          updated.confidence = confidenceByEntity[entity];
          if (isGround) {
            updated.altitude = undefined;
            updated.weaponPointingStatus = 'idle';
          }
          updated.status = 'detection';
          updated.priority = getPriorityBaseline(updated);
          updated.actionLog = [...(updated.actionLog || []), { time: tnow, label: classifiedLogByEntity[entity] }];
          setTimeout(() => {
            showTacticalNotification({
              title: notif.newDetectionTitle(updated.name ?? ''),
              message: isBird
                ? notif.awaitingApproval(updated.confidence ?? 0)
                : isGround
                  ? notif.classifiedGroundThreat(updated.confidence ?? 0)
                  : notif.classifiedDroneAwait(updated.confidence ?? 0),
              code: targetId,
              level: isBird ? 'suspect' : 'critical',
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

    // Randomly assign types: ensure at least 1 ground vehicle, rest are
    // drones with a 30% chance of becoming a ground threat (car/tank/truck).
    const types: Array<ThreatEntity> = ['drone', 'drone', 'drone', 'drone'];
    const groundIdx = Math.floor(Math.random() * routes.length);
    types[groundIdx] = pickGroundThreat();
    for (let i = 0; i < types.length; i++) {
      if (types[i] === 'drone' && Math.random() < 0.3) types[i] = pickGroundThreat();
    }

    routes.forEach((route, i) => {
      const entity = types[i];
      const end = entity === 'drone' ? route.droneEnd : route.carEnd;
      const spawn = () => spawnCuasTarget({
        startLat: route.startLat, startLon: route.startLon,
        endLat: end.lat, endLon: end.lon,
        nameSuffix: String(Math.floor(Math.random() * 900) + 100),
        intervalRef: route.ref,
        entity,
      });
      if (route.delay === 0) spawn();
      else setTimeout(spawn, route.delay);
    });
  }, [devicesPanelOpen, spawnCuasTarget]);

  const handleCUASSingle = useCallback(() => {
    if (devicesPanelOpen) setPanelSwitching(true);
    setDevicesPanelOpen(false);
    setSelectedAssetId(null);
    setSidebarOpen(true);

    if (cuasIntervalRef.current) clearInterval(cuasIntervalRef.current);

    const entity: ThreatEntity = Math.random() < 0.3 ? pickGroundThreat() : 'drone';
    const isGround = entity !== 'drone';
    spawnCuasTarget({
      startLat: 32.4916, startLon: 35.0313,
      endLat: isGround ? 32.4836 : 32.4666,
      endLon: isGround ? 35.0233 : 35.0013,
      nameSuffix: String(Math.floor(Math.random() * 900) + 100),
      intervalRef: cuasIntervalRef,
      entity,
    });
  }, [devicesPanelOpen, spawnCuasTarget]);

  const handleCUASMassDetection = useCallback(() => {
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
      const entity: ThreatEntity = Math.random() < 0.3 ? pickGroundThreat() : 'drone';
      const isGround = entity !== 'drone';
      const endOffset = isGround ? 0.015 : 0.008;
      const endLat = isGround
        ? startLat + (baseLat - startLat) * 0.3
        : baseLat + (Math.random() - 0.5) * endOffset;
      const endLon = isGround
        ? startLon + (baseLon - startLon) * 0.3
        : baseLon + (Math.random() - 0.5) * endOffset;

      setTimeout(() => {
        const ref: React.MutableRefObject<NodeJS.Timeout | null> = { current: null };
        spawnCuasTarget({
          startLat, startLon, endLat, endLon,
          nameSuffix: String(100 + i),
          intervalRef: ref,
          entity,
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

  // --- Gotcha (counter-drone net effector) engagement ---
  // Expose the Gotcha units as generic flow assets; availability folds the
  // unit's worst-wins health (a degraded/offline unit can't engage).
  const gotchaEffectors = useMemo(
    () => gotchaUnits.map((u) => {
      const health = getUnitHealth(u);
      const available = health === 'ok' || health === 'warning';
      return { id: u.id, name: u.name, lat: u.lat, lon: u.lon, status: available ? 'available' : 'unavailable' };
    }),
    [gotchaUnits],
  );

  const handleGotchaSelect = useCallback((targetId: string, gotchaId: string) => {
    setSelectedGotchaIds(prev => new Map(prev).set(targetId, gotchaId));
  }, []);

  const handleEngageGotcha = useCallback((targetId: string, gotchaId: string) => {
    toast.success(t.toasts.gotchaStarted);
    setTargets(prev => appendLog(prev, targetId, `${t.actionLog.gotchaStart} — ${gotchaId}`).map(tg =>
      tg.id === targetId ? { ...tg, gotchaStatus: 'engaging' as const, engagingGotchaId: gotchaId } : tg
    ));
    setTimeout(() => {
      setTargets(prev => appendLog(prev, targetId, t.actionLog.gotchaEnd).map(tg =>
        tg.id === targetId ? { ...tg, gotchaStatus: 'engaged' as const } : tg
      ));
      toast.success(t.toasts.gotchaEngaged);
    }, 3000);
  }, [t]);

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
    // Toggling off mid-slew: the look-at request isn't set until the
    // pointing dwell completes, so cancel the pending slew + its timeout
    // directly when the camera is still pointing at this target.
    if (cameraPointingTargetId === targetId) {
      if (cameraPointingTimeoutRef.current) {
        clearTimeout(cameraPointingTimeoutRef.current);
        cameraPointingTimeoutRef.current = null;
      }
      setCameraPointingTargetId(null);
      setAllCamerasBusyForTarget(null);
      toast.success(t.toasts.cameraCancelled);
      return;
    }

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
    } else {
      setAllCamerasBusyForTarget(targetId);
      toast(t.toasts.allCamerasBusy, { icon: '⚠️' });
    }
  }, [targets, cameraLookAtRequest, cameraPointingTargetId, t]);

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
  const handleTargetClick = useCallback((target: Detection) => {
    setActiveTargetId(prev => prev === target.id ? null : target.id);
  }, []);

  const handleStartMission = useCallback((targetId: string, action: 'intercept' | 'surveillance' | 'investigate') => {
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
  }, [targets, t]);

  // Stable references for ListOfSystems props that would otherwise be fresh
  // object/array/closure literals every render and defeat its React.memo.
  const handleSensorFocus = useCallback((sensorId: string) => {
    setSensorFocusId(sensorId);
    setTimeout(() => setSensorFocusId(null), 2000);
  }, []);

  const flowAssets = useMemo(
    () => ({ regulusEffectors, launcherEffectors, gotchaEffectors }),
    [regulusEffectors, launcherEffectors, gotchaEffectors],
  );
  const flowSelectedIds = useMemo(
    () => ({ regulusEffectors: selectedEffectorIds, launcherEffectors: selectedLauncherIds, gotchaEffectors: selectedGotchaIds }),
    [selectedEffectorIds, selectedLauncherIds, selectedGotchaIds],
  );

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

  // One-click PA broadcast (כריזה) from the critical drone takeover —
  // lights up every PA speaker (mirrors `onSpeakerToggle` for each) and
  // surfaces a confirmation toast.
  const handleGotchaBroadcast = useCallback((trackId: string) => {
    setSpeakerPlayingIds((prev) => {
      const s = new Set(prev);
      for (const spk of SPEAKER_ASSETS) s.add(spk.id);
      return s;
    });
    toast.success(`PA broadcast: ${trackId}`, { duration: 3000 });
  }, []);

  // Target-card "Play audio": toggle a PA broadcast for one target. Drives the
  // same speaker pulse as the device panel (every SPEAKER_ASSET lights up) and
  // toasts the selected track label. Pressing again (or on another target's
  // card) stops this one.
  const handlePlayAudio = useCallback((targetId: string) => {
    const willPlay = audioPlayingTargetId !== targetId;
    setAudioPlayingTargetId(willPlay ? targetId : null);
    setSpeakerPlayingIds((prev) => {
      const s = new Set(prev);
      for (const spk of SPEAKER_ASSETS) {
        if (willPlay) s.add(spk.id);
        else s.delete(spk.id);
      }
      return s;
    });
    if (willPlay) {
      const trackId = selectedAudioTrackIds.get(targetId) ?? DEFAULT_SPEAKER_TRACKS[0]?.id;
      const track = DEFAULT_SPEAKER_TRACKS.find((tr) => tr.id === trackId);
      toast.success(`PA broadcast: ${track?.label ?? trackId}`, { duration: 3000 });
    }
  }, [audioPlayingTargetId, selectedAudioTrackIds]);

  const handleSelectAudioTrack = useCallback((targetId: string, trackId: string) => {
    setSelectedAudioTrackIds((prev) => {
      const m = new Map(prev);
      m.set(targetId, trackId);
      return m;
    });
  }, []);

  // "Show on map" from the takeover — focus + select the detecting unit.
  const handleGotchaLocate = useCallback((alert: CriticalDroneAlert) => {
    const unit = gotchaUnits.find((u) => u.id === alert.unitId);
    if (unit) {
      setSelectedAssetId(alert.sensorId ?? unit.id);
      handleDeviceFlyTo(unit.lat, unit.lon);
    }
  }, [gotchaUnits, handleDeviceFlyTo]);

  const openSystemsPanel = useCallback(() => {
    if (devicesPanelOpen || simulationsPanelOpen || flowBuilderOpen || mapDrawPanelOpen)
      setPanelSwitching(true);
    setSidebarOpen(true);
    setDevicesPanelOpen(false);
    setSimulationsPanelOpen(false);
    setFlowBuilderOpen(false);
    setMapDrawPanelOpen(false);
    setSelectedAssetId(null);
  }, [devicesPanelOpen, simulationsPanelOpen, flowBuilderOpen, mapDrawPanelOpen]);

  const closeSystemsPanel = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const openDevicesPanel = useCallback(() => {
    if (sidebarOpen || simulationsPanelOpen || flowBuilderOpen || mapDrawPanelOpen)
      setPanelSwitching(true);
    setSidebarOpen(false);
    setSimulationsPanelOpen(false);
    setFlowBuilderOpen(false);
    setMapDrawPanelOpen(false);
    setDevicesPanelOpen(true);
  }, [sidebarOpen, simulationsPanelOpen, flowBuilderOpen, mapDrawPanelOpen]);

  const closeDevicesPanel = useCallback(() => {
    setDevicesPanelOpen(false);
    setSelectedAssetId(null);
  }, []);

  const openSimulationsPanel = useCallback(() => {
    if (sidebarOpen || devicesPanelOpen || flowBuilderOpen || mapDrawPanelOpen)
      setPanelSwitching(true);
    setSidebarOpen(false);
    setDevicesPanelOpen(false);
    setFlowBuilderOpen(false);
    setMapDrawPanelOpen(false);
    setSelectedAssetId(null);
    setSimulationsPanelOpen(true);
  }, [sidebarOpen, devicesPanelOpen, flowBuilderOpen, mapDrawPanelOpen]);

  const closeSimulationsPanel = useCallback(() => {
    setSimulationsPanelOpen(false);
  }, []);

  // Map-draw panel — same mutual-exclusion choreography. Opening drops
  // the user into the panel-driven drawing flow; closing also drops out
  // of any active draft (handled by the panel via `setDrawTool(null)`).
  const openMapDrawPanel = useCallback(() => {
    if (sidebarOpen || devicesPanelOpen || simulationsPanelOpen || flowBuilderOpen)
      setPanelSwitching(true);
    setSidebarOpen(false);
    setDevicesPanelOpen(false);
    setSimulationsPanelOpen(false);
    setFlowBuilderOpen(false);
    setSelectedAssetId(null);
    setMapDrawPanelOpen(true);
  }, [sidebarOpen, devicesPanelOpen, simulationsPanelOpen, flowBuilderOpen]);

  const closeMapDrawPanel = useCallback(() => {
    setMapDrawPanelOpen(false);
  }, []);

  // Lab mode: auto-open the map-draw panel once on mount so reviewers
  // land directly on the drawing UI with the variant switcher visible.
  // The empty dep array is intentional — only fire once per Dashboard
  // mount; subsequent panel toggles are driven by the user as usual.
  useEffect(() => {
    if (drawPanelLab || typePanelLab) openMapDrawPanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Flow Builder joins the right-side mutual-exclusion group: opening it
  // closes the queue / Devices / Simulations / Map-draw (and vice-versa, above).
  const openFlowBuilderPanel = useCallback(() => {
    if (sidebarOpen || devicesPanelOpen || simulationsPanelOpen || mapDrawPanelOpen)
      setPanelSwitching(true);
    setSidebarOpen(false);
    setDevicesPanelOpen(false);
    setSimulationsPanelOpen(false);
    setMapDrawPanelOpen(false);
    setSelectedAssetId(null);
    setFlowBuilderOpen(true);
  }, [sidebarOpen, devicesPanelOpen, simulationsPanelOpen, mapDrawPanelOpen]);

  // ── Stable handler identities for child panels ─────────────────────
  //
  // The DevicesPanel is conditionally mounted but still receives these
  // callbacks on every Dashboard render. Memoizing them keeps the panel
  // (and the memoized DeviceRows beneath it) from re-rendering on the
  // 4 Hz sim ticks that don't touch device state.
  const handleDeviceJamActivate = useCallback(
    (jammerId: string) => {
      toast.success(t.toasts.jamActivated(jammerId), { duration: 3000 });
    },
    [t],
  );
  const handleDeviceFloodlightToggle = useCallback((id: string, next: boolean) => {
    setFloodlightOnIds((prev) => {
      const s = new Set(prev);
      if (next) s.add(id); else s.delete(id);
      return s;
    });
  }, []);
  const handleDeviceSpeakerToggle = useCallback((id: string, next: boolean) => {
    setSpeakerPlayingIds((prev) => {
      const s = new Set(prev);
      if (next) s.add(id); else s.delete(id);
      return s;
    });
  }, []);
  const handleDeviceArmNotifications = useCallback(
    (id: string, armed: boolean) => {
      toast.success(
        armed ? t.toasts.deviceNotificationsArmed(id) : t.toasts.deviceNotificationsDisarmed(id),
        { duration: 3000 },
      );
    },
    [t],
  );

  // Rail toggle + panel close handlers — stable so the toggles and the
  // resizable camera panel don't churn props every render.
  const handleSidebarPressedChange = useCallback(
    (next: boolean) => { if (next) openSystemsPanel(); else closeSystemsPanel(); },
    [openSystemsPanel, closeSystemsPanel],
  );
  const handleDevicesPressedChange = useCallback(
    (next: boolean) => { if (next) openDevicesPanel(); else closeDevicesPanel(); },
    [openDevicesPanel, closeDevicesPanel],
  );
  const handleSimulationsPressedChange = useCallback(
    (next: boolean) => { if (next) openSimulationsPanel(); else closeSimulationsPanel(); },
    [openSimulationsPanel, closeSimulationsPanel],
  );
  const handleFlowBuilderPressedChange = useCallback(
    (next: boolean) => (next ? openFlowBuilderPanel() : setFlowBuilderOpen(false)),
    [openFlowBuilderPanel],
  );
  const handleCameraPressedChange = useCallback(() => {
    setCameraViewerFeeds((prev) =>
      prev.length > 0 ? [] : [{ cameraId: CAMERA_ASSETS[0]?.id ?? '' }],
    );
  }, []);
  const handleCameraViewerCollapse = useCallback(() => setCameraViewerFeeds([]), []);
  const handleFlowBuilderClose = useCallback(() => setFlowBuilderOpen(false), []);

  const sidebarStyle = useMemo<React.CSSProperties>(
    () => ({
      width: sidebarWidth,
      backgroundColor: SURFACE.level1,
      ...(isDragging ? { transition: 'none', willChange: 'width' } : {}),
      ...(isSnapping ? { transition: 'width 200ms ease-out' } : {}),
    }),
    [sidebarWidth, isDragging, isSnapping],
  );

  // Tracks the flow detection id we've already stolen focus to, so the
  // escalation watcher (below) fires exactly once per playback. Resets
  // when the active flow detection clears (reset / new play mints a new
  // id, so the guard naturally re-arms).
  const flowEscalationRef = useRef<string | null>(null);

  // ── Flow Builder — production ops shim ──────────────────────────────
  //
  // The player ([useFlowPlayer](./flow-builder/useFlowPlayer.ts))
  // calls into these seams. Everything that has a production side
  // effect (engagement chain, effector reset) routes through the
  // SAME handlers the live card buttons use, so manual stepping and
  // auto playback are pixel-identical to operator-driven runs.
  const flowOps = useMemo<FlowPlayerOps>(() => ({
    appendDetection: (det) => {
      setTargets((prev) => [...prev, det]);
    },
    patchDetection: (id, patch) => {
      setTargets((prev) => prev.map((tg) => (tg.id === id ? { ...tg, ...patch } : tg)));
    },
    removeDetection: (id) => {
      setTargets((prev) => prev.filter((tg) => tg.id !== id));
    },
    dispatchAct: ({ kind, targetId }) => {
      if (kind === 'jam') {
        // Pick the first available regulus effector; the production
        // handler accepts an explicit asset id, so this mirrors the
        // operator clicking the topmost dropdown option.
        const eff = regulusEffectors.find((r) => r.status === 'available');
        if (eff) handleMitigate(targetId, eff.id);
        return;
      }
      if (kind === 'weapon') {
        const launcher = launcherEffectors.find((l) => l.status === 'available');
        if (launcher) {
          handlePointWeapon(targetId, launcher.id);
          // Chain pointing -> locking -> mission-complete with small
          // delays so the player's closure mutation lands on top of a
          // fully-driven engagement (matching what the operator sees
          // when clicking through manually).
          setTimeout(() => handleLockWeapon(targetId), 3200);
          setTimeout(() => handleCompleteMission(targetId), 5200);
        }
        return;
      }
      if (kind === 'dismiss') {
        handleDismiss(targetId);
      }
    },
    invokeCameraPoint: (targetId) => {
      // Real PTZ slew: pick the nearest camera to the (moving) target,
      // mark it pointing, then after a short dwell lock the look-at on
      // the target's CURRENT coordinates. Mirrors the production
      // `handleStartMission('investigate')` chain so the card pointing
      // state, action log, and camera viewer behave identically.
      const tgt = targetsRef.current.find((x) => x.id === targetId);
      if (!tgt) return;
      const [lat, lon] = (tgt.coordinates ?? '').split(',').map((s) => parseFloat(s.trim()));
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      const nearest = CAMERA_ASSETS
        .map((c) => ({ cam: c, dist: haversineDistanceM(c.latitude, c.longitude, lat, lon) }))
        .sort((a, b) => a.dist - b.dist)[0];
      if (!nearest) return;
      const cam = nearest.cam;

      if (cameraPointingTimeoutRef.current) clearTimeout(cameraPointingTimeoutRef.current);
      setCameraPointingTargetId(targetId);
      setActiveTargetId(targetId);
      setSidebarOpen(true);
      setTargets((prev) => appendLog(prev, targetId, t.actionLog.cameraPointing(cam.typeLabel)));

      cameraPointingTimeoutRef.current = setTimeout(() => {
        setCameraPointingTargetId(null);
        const cur = targetsRef.current.find((x) => x.id === targetId);
        const [clat, clon] = (cur?.coordinates ?? tgt.coordinates ?? '')
          .split(',')
          .map((s) => parseFloat(s.trim()));
        setCameraLookAtRequest({
          cameraId: cam.id,
          targetLat: Number.isFinite(clat) ? clat : lat,
          targetLon: Number.isFinite(clon) ? clon : lon,
        });
        setTargets((prev) => appendLog(prev, targetId, t.actionLog.cameraLocked(cam.typeLabel)));
      }, 1500);
    },
    resetEffectors: () => {
      setRegulusEffectors((prev) => prev.map((r) =>
        r.status !== 'available' ? { ...r, status: 'available' as const, activeTargetId: undefined } : r,
      ));
      setLauncherEffectors((prev) => prev.map((l) =>
        l.status !== 'available' ? { ...l, status: 'available' as const } : l,
      ));
    },
    onDetectionAppended: (det) => {
      // Detection-faithful spawn: behave like a real detection. Always
      // notify, but only "steal" focus (select + fly map) if the spawn
      // already lands at HIGH/CRITICAL — otherwise the card surfaces in
      // the queue without yanking the operator's attention. Mid-flow
      // escalation into HIGH/CRITICAL is handled by the watcher effect
      // below (see `flowEscalationRef`).
      const sev = resolveTargetSeverity(det);
      if (sev === 'HIGH' || sev === 'CRITICAL') {
        setActiveTargetId(det.id);
        const [lat, lon] = (det.coordinates ?? '').split(',').map((s) => parseFloat(s.trim()));
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          setMapFocusRequest({ lat, lon });
          setTimeout(() => setMapFocusRequest(null), 100);
        }
        flowEscalationRef.current = det.id;
      }
      showTacticalNotification({
        title: t.notifications.newDetectionTitle(det.name ?? det.id),
        message: det.coordinates ?? '',
        level: 'medium',
      });
    },
  }), [
    regulusEffectors,
    launcherEffectors,
    handleMitigate,
    handlePointWeapon,
    handleLockWeapon,
    handleCompleteMission,
    handleDismiss,
    t,
  ]);

  const flowPlayer = useFlowPlayer({ ops: flowOps, nowLabel: nowLocaleTime });

  // Derive the sensor->target detection geometry from the live player
  // state. Undefined while idle so the production map renders zero
  // extra polylines for normal operations.
  const flowSensorLinks = useMemo<SensorDetectionLink[] | undefined>(() => {
    const def = flowPlayer.def;
    const id = flowPlayer.state.activeDetectionId;
    if (!def || !id) return undefined;
    return def.sensorIds.map((sensorId) => ({ sensorId, targetId: id }));
  }, [flowPlayer.def, flowPlayer.state.activeDetectionId]);

  // Live draft preview: while the Flow Builder is open and no flow has
  // spawned yet, show a ghost target + sensor lines so the PM feels the
  // map react as they author. Severity = the first (detection-stage)
  // trajectory entry, so it reads as "what this looks like when it
  // spawns." Undefined while playing — the real geometry takes over.
  const flowPreview = useMemo<FlowPreview | undefined>(() => {
    if (!flowBuilderOpen || flowPlayer.state.activeDetectionId) return undefined;
    const loc = flowDraft.location.kind === 'custom'
      ? { lat: flowDraft.location.lat, lon: flowDraft.location.lon }
      : FLOW_LOCATION_PRESETS[flowDraft.location.key];
    const severity = computeSeverityTrajectory(flowDraft)[0]?.severity ?? 'MEDIUM';
    return {
      lat: loc.lat,
      lon: loc.lon,
      sensorIds: flowDraft.sensorIds,
      severity,
      entity: flowDraft.entity,
    };
  }, [flowBuilderOpen, flowPlayer.state.activeDetectionId, flowDraft]);

  // Detection-faithful focus escalation. A spawned flow detection that
  // starts LOW/MEDIUM sits quietly in the queue; the *moment* its
  // severity first crosses into HIGH/CRITICAL (e.g. as a hostile drone
  // classifies / engages) we steal focus once — select the card and fly
  // the map — mirroring how a real high-priority detection grabs the
  // operator. A bird/dismiss flow never crosses the threshold and never
  // steals focus.
  const activeFlowDetectionId = flowPlayer.state.activeDetectionId;
  useEffect(() => {
    if (!activeFlowDetectionId) {
      // Playback reset / idle — re-arm for the next run.
      flowEscalationRef.current = null;
      return;
    }
    if (flowEscalationRef.current === activeFlowDetectionId) return;
    const det = targets.find((tg) => tg.id === activeFlowDetectionId);
    if (!det) return;
    const sev = resolveTargetSeverity(det);
    if (sev === 'HIGH' || sev === 'CRITICAL') {
      flowEscalationRef.current = activeFlowDetectionId;
      setActiveTargetId(activeFlowDetectionId);
      const [lat, lon] = (det.coordinates ?? '').split(',').map((s) => parseFloat(s.trim()));
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        setMapFocusRequest({ lat, lon });
        setTimeout(() => setMapFocusRequest(null), 100);
      }
    }
  }, [activeFlowDetectionId, targets]);

  // ── Simulations panel — run / edit / delete ────────────────────────
  const handleRunBuiltin = useCallback((kind: BuiltinKind) => {
    // Close Simulations and surface the queue, then fire the existing
    // CUAS injector. The injectors already open the queue panel, so
    // this just guarantees Simulations isn't left covering it.
    setSimulationsPanelOpen(false);
    if (kind === 'single') handleCUASSingle();
    else if (kind === 'flow') handleCUASFlow();
    else handleCUASMassDetection();
  }, [handleCUASSingle, handleCUASFlow, handleCUASMassDetection]);

  const handleRunFlow = useCallback((def: FlowDef) => {
    // Switch to the target panel (closes Simulations + devices), then
    // load + play. Focus stealing is delegated to the player's
    // detection-faithful escalation rule.
    openSystemsPanel();
    flowPlayer.loadFlow(def);
    flowPlayer.play();
  }, [openSystemsPanel, flowPlayer]);

  const handleEditFlow = useCallback((def: FlowDef) => {
    setFlowDraft({ ...def });
    setFlowLoadedPresetId(def.id);
    openFlowBuilderPanel();
  }, [openFlowBuilderPanel]);

  const handleDeleteFlow = useCallback((def: FlowDef) => {
    const after = deleteFlowPreset(def.id);
    setFlowPresets(after);
    if (flowLoadedPresetId === def.id) {
      setFlowLoadedPresetId(null);
    }
    toast.success(t.flowBuilder.toasts.deleted(def.name));
  }, [flowLoadedPresetId, t]);

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
    <MapDrawProvider>
    {/* Bridge the geo-drawing engine's per-shape "center on map"
        requests to the Dashboard's existing map-focus state, which
        already drives Cesium's smooth camera focus. Renders nothing;
        acts purely as a side-effect wire. */}
    <MapFocusBridge
      onFocus={({ lat, lon }) => {
        setMapFocusRequest({ lat, lon });
        // Clear a moment later so re-focusing the same coord still
        // fires (Cesium reads a null->value transition).
        setTimeout(() => setMapFocusRequest(null), 100);
      }}
    />
    <div className="relative flex w-full h-screen overflow-hidden text-white font-sans selection:bg-red-500/30">
      {/* Minimal Left Nav */}
      <TooltipProvider>
      <nav className="relative z-50 flex flex-col justify-start items-center w-8 flex-shrink-0 h-full bg-[#1a1a1a] border-e border-white/10">
        <div className="flex items-center justify-center h-9 w-full">
          <div className="text-white scale-75 origin-center">
            <C2Logo />
          </div>
        </div>
        <Separator className="bg-white/10" />

        <div className="flex flex-col items-center justify-start gap-0.5 py-1.5 w-full flex-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                pressed={sidebarOpen}
                onPressedChange={handleSidebarPressedChange}
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
                onPressedChange={handleDevicesPressedChange}
                className="size-6 min-w-6 px-0 rounded bg-transparent text-gray-400 aria-pressed:bg-white/[0.08] aria-pressed:text-white aria-pressed:ring-1 aria-pressed:ring-inset aria-pressed:ring-white/15 hover:text-white hover:bg-white/10 active:scale-[0.97] transition-[color,background-color] focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:outline-none"
                aria-label={devicesPanelOpen ? t.dashboard.closeDevices : t.dashboard.devices}
              >
                <Devices size={20} strokeWidth={1.5} />
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
                onPressedChange={handleCameraPressedChange}
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

          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                pressed={simulationsPanelOpen}
                onPressedChange={handleSimulationsPressedChange}
                className="size-6 min-w-6 px-0 rounded bg-transparent text-gray-400 aria-pressed:bg-white/[0.08] aria-pressed:text-white aria-pressed:ring-1 aria-pressed:ring-inset aria-pressed:ring-white/15 hover:text-white hover:bg-white/10 active:scale-[0.97] transition-[color,background-color] focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:outline-none"
                aria-label={simulationsPanelOpen ? t.flowBuilder.simulations.close : t.flowBuilder.simulations.title}
              >
                <Agents size={20} strokeWidth={1.5} />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side={railTooltipSide} sideOffset={8}>{t.flowBuilder.simulations.title}</TooltipContent>
          </Tooltip>

          {/* Map-draw trigger moved to a floating control on the map
              (top-right). See `FloatingGeoEntitiesControl` mounted next
              to `MapDrawOverlay` below. */}
        </div>

        <Separator className="bg-white/10" />
        <div className="flex flex-col items-center gap-0.5 py-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                pressed={flowBuilderOpen}
                onPressedChange={handleFlowBuilderPressedChange}
                className="size-6 min-w-6 px-0 rounded bg-transparent text-gray-400 aria-pressed:bg-white/[0.08] aria-pressed:text-white aria-pressed:ring-1 aria-pressed:ring-inset aria-pressed:ring-white/15 hover:text-white hover:bg-white/10 active:scale-[0.97] transition-[color,background-color] focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:outline-none"
                aria-label={t.flowBuilder.panel.title}
              >
                <Sparkles size={20} />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side={railTooltipSide} sideOffset={8}>
              {t.flowBuilder.panel.title}
            </TooltipContent>
          </Tooltip>
          {/*
            Mount point for the Handoff Inspector picker. The inspector
            module (see `src/app/components/handoff/HandoffInspector.tsx`)
            queries for this slot and portals a 24x24 picker glyph into
            it whenever the dashboard is on screen. Routes without a
            rail get a floating fallback glyph instead.
          */}
          <div
            data-handoff-picker-slot="true"
            data-handoff-inspector="true"
            className="size-6"
          />
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
                className="size-6 rounded flex items-center justify-center text-xs font-mono font-semibold text-gray-400 hover:text-white hover:bg-white/10 active:scale-[0.97] transition-[color,background-color] focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:outline-none"
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
      <div className="relative z-0 flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
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
                <LiveCesiumTacticalMap
                  store={liveMap}
                  targets={targets}
                  activeTargetId={activeTargetId}
                  onMarkerClick={handleMarkerClick}
                  highlightedSensorIds={highlightedSensorIds}
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
                  smoothFocusRequest={mapFocusRequest}
                  onAssetClick={handleAssetClick}
                  offlineAssetIds={offlineAssetIds}
                  floodlightOnIds={floodlightOnIds}
                  speakerPlayingIds={speakerPlayingIds}
                  selectedEffectorIds={selectedEffectorIds}
                  launcherEffectors={launcherEffectors}
                  selectedLauncherIds={selectedLauncherIds}
                  darkMonochromeMap={demoMode}
                  sensorDetectionLinks={flowSensorLinks}
                  flowPreview={flowPreview}
                  gotchaUnits={gotchaUnits}
                  cameraLookAtRequest={cameraLookAtRequest}
                />
              </CesiumErrorBoundary>
              {/*
                Map-draw screen-space overlay. Sits above the Cesium
                canvas with `pointer-events: none` at rest so map pan /
                zoom keep working; flips to `auto` while a draw tool is
                active or a shape is selected. State (active tool /
                selection / draft) is read from `<MapDrawProvider>`,
                which the panel mutates in lockstep.
              */}
              <MapDrawOverlay
                onSelect={(id) => {
                  if (id && !mapDrawPanelOpen) openMapDrawPanel();
                }}
                panelOpen={mapDrawPanelOpen}
                panelWidthPx={sidebarWidth}
              />
              {/* Floating Geo Entities entry point (top-right).
                  Collapsed = a single polygon glyph; expanded = a row
                  of Line / Circle / POI buttons. Picking a tool closes
                  the docked panel and arms the drawing engine; once
                  the user commits a shape, the panel reopens for the
                  Save / Cancel editor. Replaces the old left-rail
                  "Geo Entities" Toggle. */}
              <FloatingGeoEntitiesControl
                panelOpen={mapDrawPanelOpen}
                onOpenPanel={openMapDrawPanel}
                onClosePanel={closeMapDrawPanel}
              />
            </div>
          </ResizablePanel>

          {isCameraViewerOpen && (
            <>
              <ResizableHandle className="w-px bg-white/10 hover:bg-white/20 transition-colors duration-150 ease-out" />
              <ResizablePanel defaultSize={45} minSize={25} maxSize={60} collapsible collapsedSize={0} onCollapse={handleCameraViewerCollapse}>
                  <VideoHudPanel
                    feeds={cameraViewerFeeds}
                    onFeedsChange={setCameraViewerFeeds}
                    onCameraHover={liveMap.setHoveredSensorId}
                    weaponFeedActive={weaponFeedActive}
                  />
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
            absolute top-0 bottom-0 start-0 border-e border-white/10 flex flex-col ${panelSwitching || isDragging ? '' : isSnapping ? '' : 'transition-[transform,opacity] duration-300 ease-in-out'} z-30
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'}
          `}
          style={sidebarStyle}
        >
          {sidebarOpen && (
            <div
              onPointerDown={handleResizePointerDown}
              className={`absolute end-0 top-0 bottom-0 w-1.5 z-20 cursor-col-resize transition-colors ${isDragging ? 'bg-white/20' : 'bg-transparent hover:bg-white/10'}`}
            />
          )}
          <div className="flex items-center px-4 h-9 border-b border-white/10">
            <h2 className="text-xs font-medium text-white/70 uppercase tracking-wider">{t.dashboard.activeSystemsHeading(targets.length)}</h2>
          </div>
          <div className="flex-1 overflow-y-auto" data-handoff-component="target-card">
            <ListOfSystems
              className="flex flex-col gap-0"
              targets={targets}
              activeTargetId={activeTargetId}
              onTargetClick={handleTargetClick}
              onVerify={handleStartMission}
              onDismiss={handleDismiss}
              onCancelMission={noop}
              onCompleteMission={handleCompleteMission}
              onEngage={noop}
              onBdaCamera={handleBdaCamera}
              onSendDroneVerification={startBdaSequence}
              droneVerifyingTargetId={null}
              onSensorHover={liveMap.setHoveredSensorId}
              onCameraLookAt={noopStrStr}
              onTakeControl={noopStr}
              onReleaseControl={noopStr}
              onSensorModeChange={noop}
              onPlaybookSelect={noopStrStr}
              onClosureOutcome={noop}
              onAdvanceFlowPhase={noopStr}
              nearbyCameras={EMPTY_ARRAY}
              nearbyHives={EMPTY_ARRAY}
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
              onPlanningRemoveWaypoint={noop}
              onPlanningToggleLoop={noopStr}
              onPlanningFinalize={noopStr}
              onPlanningUpdateWaypoint={noop}
              onPlanningSetRepetitions={noop}
              onPlanningSetDwellTime={noop}
              onPlanningSetScanCenter={noop}
              onPlanningSetScanWidth={noop}
              onPlanningSetScanSteps={noop}
              onPlanningSelectCamera={noopStr}
              onPlanningZoomCameras={noopStr}
              onMitigate={handleMitigate}
              onMitigateAll={handleMitigateAll}
              onEffectorSelect={handleEffectorSelect}
              onEngageGotcha={handleEngageGotcha}
              onGotchaSelect={handleGotchaSelect}
              regulusEffectors={regulusEffectors}
              selectedEffectorIds={selectedEffectorIds}
              onPointWeapon={handlePointWeapon}
              onLockWeapon={handleLockWeapon}
              onDismissLock={handleDismissLock}
              onLauncherSelect={handleLauncherSelect}
              launcherEffectors={launcherEffectors}
              selectedLauncherIds={selectedLauncherIds}
              flowAssets={flowAssets}
              flowSelectedIds={flowSelectedIds}
              onBdaOutcome={handleBdaOutcome}
              cameraActiveTargetId={cameraActiveTargetId}
              cameraPointingTargetId={cameraPointingTargetId}
              allCamerasBusyForTarget={allCamerasBusyForTarget}
              controlRequestCountdown={cameraControlRequest?.countdown ?? null}
              controlRequestTargetId={cameraControlRequest?.targetId ?? null}
              onRequestCameraControl={handleRequestCameraControl}
              onPlayAudio={handlePlayAudio}
              onSelectAudioTrack={handleSelectAudioTrack}
              audioPlayingTargetId={audioPlayingTargetId}
              audioTracks={DEFAULT_SPEAKER_TRACKS}
              selectedAudioTrackIds={selectedAudioTrackIds}
              onSensorFocus={handleSensorFocus}
              onTargetFocus={handleTargetFocus}
              onTargetHover={liveMap.setHoveredTargetId}
              thinMode
            />
          </div>
        </aside>

        {/*
          * Conditionally mount the devices panel — when closed it would otherwise
          * stay in the tree (just translated off-screen) and re-run its useMemos,
          * mute interval, and full device-list iteration on every Dashboard
          * render. We trade the slide-out animation for a tighter render budget.
          */}
        {flowBuilderOpen && (
          <FlowBuilderPanel
            open={flowBuilderOpen}
            onClose={handleFlowBuilderClose}
            width={sidebarWidth}
            noTransition={panelSwitching}
            draft={flowDraft}
            onDraftChange={setFlowDraft}
            presets={flowPresets}
            onPresetsChange={setFlowPresets}
            loadedPresetId={flowLoadedPresetId}
            onLoadedPresetIdChange={setFlowLoadedPresetId}
          />
        )}

        {simulationsPanelOpen && (
          <SimulationsPanel
            open={simulationsPanelOpen}
            onClose={closeSimulationsPanel}
            width={sidebarWidth}
            noTransition={panelSwitching}
            presets={flowPresets}
            onRunBuiltin={handleRunBuiltin}
            onRunFlow={handleRunFlow}
            onEditFlow={handleEditFlow}
            onDeleteFlow={handleDeleteFlow}
          />
        )}

        {mapDrawPanelOpen && (
          <MapDrawPanel
            open={mapDrawPanelOpen}
            onClose={closeMapDrawPanel}
            width={sidebarWidth}
            noTransition={panelSwitching}
            // Production default: Opt 5 (segmented tool bar inside a
            // Tools dropdown opened by default, layers list open). The
            // lab route keeps this as the initial variant but still lets
            // reviewers flip between Opt 2 / Opt 3 / Opt 5 / Original.
            variant="opt5"
            lab={drawPanelLab}
            typeLab={typePanelLab}
          />
        )}

        {devicesPanelOpen && (
          <DevicesPanel
            devices={devicesWithGotcha}
            open={devicesPanelOpen}
            onClose={closeDevicesPanel}
            onFlyTo={handleDeviceFlyTo}
            onDeviceHover={liveMap.setHoveredSensorId}
            onDeviceSelect={setSelectedAssetId}
            onJamActivate={handleDeviceJamActivate}
            floodlightOnIds={floodlightOnIds}
            speakerPlayingIds={speakerPlayingIds}
            onFloodlightToggle={handleDeviceFloodlightToggle}
            onSpeakerToggle={handleDeviceSpeakerToggle}
            onArmNotifications={handleDeviceArmNotifications}
            noTransition={panelSwitching}
            width={sidebarWidth}
            focusedDeviceId={focusedDeviceId}
            selectedDeviceId={selectedAssetId}
            title={t.dashboard.devicesPanelTitle}
            closeAriaLabel={t.dashboard.devicesPanelClose}
            typeLabels={t.devices.typeLabels}
            connectionStateLabels={t.devices.connectionLabels}
            strings={t.devices.strings}
            pathfinderFlightStates={pathfinderFlightStates}
            onLaunch={handlePathfinderLaunch}
            onAbort={handlePathfinderAbort}
            onReturnToBase={handlePathfinderReturnToBase}
          />
        )}

      </div>

      <NotificationSystem />
      <CriticalAlertOverlay onBroadcast={handleGotchaBroadcast} onLocate={handleGotchaLocate} />
    </div>
    </MapDrawProvider>
  );
};
