import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import type { CSSProperties, ComponentType } from 'react';
import {
  Eye, Radio, ShieldAlert, Zap, Crosshair, Ban, AlertTriangle,
  Trash2, Send, Compass, Gauge, Navigation, MapPin, CheckCircle2,
  Bird, Activity, History, Radar, Hand, Copy, Check, Download,
  BellOff, Camera, Wrench, Search, X, Lock,
  SlidersHorizontal, Tag, ChevronsUpDown, Square,
  Sun, Video,
  type IconComponent, type IconProps,
} from '@/lib/icons/central';
import { toast } from 'sonner';
import { Toaster } from '@/shared/components/ui/sonner';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { AppLoader } from '@/shared/components/ui/app-loader';
import { NAV, findGroupForId, findParentItemForChild } from '@/app/styleguide/navConfig';
import { CHANGELOG } from '@/app/styleguide/changelog';
import { StyleguideSidebar } from '@/app/styleguide/StyleguideSidebar';
import { StyleguideSearch } from '@/app/styleguide/StyleguideSearch';
import { StyleguideHeader } from '@/app/styleguide/StyleguideHeader';
import { StyleguideToc } from '@/app/styleguide/StyleguideToc';
import { StyleguidePager } from '@/app/styleguide/StyleguidePager';
import { ComponentPreview } from '@/app/styleguide/registry/docPrimitives';
import { stripCodeComments } from '@/app/styleguide/registry/stripCodeComments';
import {
  CARD_TOKENS, ELEVATION, SURFACE, LAYOUT_TOKENS, surfaceAt, overlayAt,
  StatusChip, STATUS_CHIP_COLORS, type StatusChipColor,
  HEALTH_DOT_CLASS, HEALTH_BADGE_CLASS,
  ActivityTimestampChip,
  ActionButton, ACTION_BUTTON_VARIANTS, ACTION_BUTTON_SIZES, type ActionButtonVariant,
  SplitActionButton, SPLIT_BUTTON_VARIANTS,
  AccordionSection, TelemetryRow,
  TargetCard, CardHeader, CardActions,
  CardDetails, CardIdentity, CardSensors, CardMedia, MEDIA_BADGE_CONFIG, CardLog, CardClosure, CopyButton,
  FilterBar, NewUpdatesPill,
  SEVERITY_COLOR, SEVERITY_PULSE, SEVERITY_ORDER, SEVERITY_LABEL, UNKNOWN_GRAY,
  type Severity,
  type CardAction, type CardSensor,
  type LogEntry, type ClosureOutcome, type DetailRow,
  type FilterDef,
} from '@/primitives';
import {
  CameraIcon, SensorIcon, RadarIcon, DroneIcon, DroneHiveIcon,
  LidarIcon, LauncherIcon, MissileIcon,
  FloodlightIcon, SpeakerIcon, GotchaIcon,
} from '@/app/components/tacticalIcons';
import {
  DroneCardIcon, JamWaveIcon, MissileCardIcon, CarIcon,
  TankIcon, TruckIcon, UnknownIcon, HumanIcon,
} from '@/primitives/MapIcons';
import { MapMarker } from '@/primitives/MapMarker';
import winterTheme from './winter-is-coming-theme.json';
import {
  resolveMarkerStyle,
  INTERACTION_STATES, AFFILIATIONS,
  INTERACTION_STATE_LABELS, AFFILIATION_LABELS,
  type Affiliation, type InteractionState,
} from '@/primitives/markerStyles';
import { iconPublicUrl } from '@/lib/styleguideIconAssets';
import {
  DevicesPanel, DeviceRow, DeviceAction,
  FloodlightSegmentedDefault, FloodlightSegmentedCompact,
  JamSplitButton, DeviceOverflowMenu, SpeakerTrackSelect,
  resolveDeviceAction,
  NotifyHeaderIndicator, NotifyCountdown,
  DEVICE_ACTION_TONES,
  DEVICE_HEALTH_VISUAL,
  DEFAULT_SPEAKER_TRACKS,
  DEFAULT_DEVICE_PANEL_STRINGS,
  NOTIFY_WINDOW_S,
  type Device, type DeviceHealth,
  type DeviceActionContext, type DeviceActionKind, type DeviceActionTone,
} from '@/shared/components/DevicesPanel';
import { DeviceChildRow } from '@/app/components/devices-panel/DeviceChildRow';
import { GOTCHA_UNITS } from '@/app/components/gotcha/gotchaAssets';
import { gotchaSectorColor } from '@/app/components/gotcha/gotchaHealth';
import { gotchaUnitsToDevices } from '@/app/components/gotcha/gotchaUnitsToDevices';
import { CriticalAlertOverlay, showCriticalDroneAlert } from '@/app/components/gotcha/CriticalAlertOverlay';
import { JamIcon, DroneDeviceIcon } from '@/primitives/ProductIcons';
import { Switch } from '@/shared/components/ui/switch';
import { Popover, PopoverTrigger, PopoverContent } from '@/shared/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/shared/components/ui/command';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { useCardSlots, type CardCallbacks, type CardContext } from '@/imports/useCardSlots';
import {
  cuas_raw, cuas_classified, cuas_classified_bird, cuas_mitigating, cuas_mitigated, cuas_bda_complete,
  flow1_suspicion, flow2_tracking, flow3_onStation, flow4_mission, flow4_complete, flow5_mitigated,
  drone_friendly, drone_hostile, drone_unknown,
} from '@/test-utils/mockDetections';
import type { Detection, RegulusEffector } from '@/imports/ListOfSystems';
import { getActivityStatus, getCreatedAtMs, formatTimeSince } from '@/imports/useActivityStatus';

import themeCssSrc from '@/styles/theme.css?raw';
import paletteCssSrc from '@/styles/palette.css?raw';

import statusChipSrc from '@/primitives/StatusChip.tsx?raw';
import actionButtonSrc from '@/primitives/ActionButton.tsx?raw';
import splitActionButtonSrc from '@/primitives/SplitActionButton.tsx?raw';
import accordionSectionSrc from '@/primitives/AccordionSection.tsx?raw';
import telemetryRowSrc from '@/primitives/TelemetryRow.tsx?raw';
import copyButtonSrc from '@/primitives/CopyButton.tsx?raw';
import targetCardSrc from '@/primitives/TargetCard.tsx?raw';
import cardHeaderSrc from '@/primitives/CardHeader.tsx?raw';
import cardActionsSrc from '@/primitives/CardActions.tsx?raw';
import cardDetailsSrc from '@/primitives/CardDetails.tsx?raw';
import cardIdentitySrc from '@/primitives/CardIdentity.tsx?raw';
import cardSensorsSrc from '@/primitives/CardSensors.tsx?raw';
import cardMediaSrc from '@/primitives/CardMedia.tsx?raw';
import cardLogSrc from '@/primitives/CardLog.tsx?raw';
import cardClosureSrc from '@/primitives/CardClosure.tsx?raw';
import filterBarSrc from '@/primitives/FilterBar.tsx?raw';
import newUpdatesPillSrc from '@/primitives/NewUpdatesPill.tsx?raw';
import devicesPanelSrc from '@/shared/components/DevicesPanel.tsx?raw';
import deviceRowSrc from '@/app/components/devices-panel/DeviceRow.tsx?raw';
import deviceActionSrc from '@/app/components/devices-panel/DeviceAction.tsx?raw';
import deviceRegistrySrc from '@/app/components/devices-panel/deviceRegistry.ts?raw';
import deviceHealthSrc from '@/app/components/devices-panel/deviceHealth.ts?raw';
import deviceChildGroupSrc from '@/app/components/devices-panel/DeviceChildGroup.tsx?raw';
import deviceChildRowSrc from '@/app/components/devices-panel/DeviceChildRow.tsx?raw';
import criticalAlertOverlaySrc from '@/app/components/gotcha/CriticalAlertOverlay.tsx?raw';
import gotchaUnitsToDevicesSrc from '@/app/components/gotcha/gotchaUnitsToDevices.ts?raw';
import popoverSrc from '@/shared/components/ui/popover.tsx?raw';
import commandSrc from '@/shared/components/ui/command.tsx?raw';
import buttonSrc from '@/shared/components/ui/button.tsx?raw';
import switchSrc from '@/shared/components/ui/switch.tsx?raw';
import mapMarkerSrc from '@/primitives/MapMarker.tsx?raw';
import mapIconsSrc from '@/primitives/MapIcons.tsx?raw';
import tokensSrc from '@/primitives/tokens.ts?raw';
import markerStylesSrc from '@/primitives/markerStyles.ts?raw';
import barrelIndexSrc from '@/primitives/index.ts?raw';
// ── Video HUD components (handoff sections) ──
import { SandboxDeviceSelect, type SandboxDevice } from '@/app/components/video-hud-sandbox/SandboxDeviceSelect';
import { SandboxAngleToggle, type CameraAngle as PathfinderCameraAngle } from '@/app/components/video-hud-sandbox/SandboxAngleToggle';
import { DeviceConnectivityBadge } from '@/app/components/video-hud-sandbox/DeviceConnectivityBadge';
import { DayNightSpringToggle } from '@/app/components/video-hud-sandbox/DayNightSpringToggle';
import { SandboxVideoContextMenu } from '@/app/components/video-hud-sandbox/SandboxVideoContextMenu';
import { SandboxSetpointRail } from '@/app/components/video-hud-sandbox/SandboxSetpointRail';
import { CameraSlewCue } from '@/app/components/video-hud-sandbox/CameraSlewCue';
import { AutoTrackOverlay } from '@/app/components/video-hud-sandbox/AutoTrackOverlay';
import { AiDetectionTriangles } from '@/app/components/video-hud-sandbox/AiDetectionTriangles';
import { CameraCompassStrip } from '@/app/components/camera-v2/CameraCompassStrip';
import type { DayNightMode, DetectionBox } from '@/app/components/camera-v2/types';
import sandboxDeviceSelectSrc from '@/app/components/video-hud-sandbox/SandboxDeviceSelect.tsx?raw';
import sandboxAngleToggleSrc from '@/app/components/video-hud-sandbox/SandboxAngleToggle.tsx?raw';
import deviceConnectivityBadgeSrc from '@/app/components/video-hud-sandbox/DeviceConnectivityBadge.tsx?raw';
import dayNightSpringToggleSrc from '@/app/components/video-hud-sandbox/DayNightSpringToggle.tsx?raw';
import sandboxVideoContextMenuSrc from '@/app/components/video-hud-sandbox/SandboxVideoContextMenu.tsx?raw';
import sandboxSetpointRailSrc from '@/app/components/video-hud-sandbox/SandboxSetpointRail.tsx?raw';
import cameraSlewCueSrc from '@/app/components/video-hud-sandbox/CameraSlewCue.tsx?raw';
import autoTrackOverlaySrc from '@/app/components/video-hud-sandbox/AutoTrackOverlay.tsx?raw';
import aiDetectionTrianglesSrc from '@/app/components/video-hud-sandbox/AiDetectionTriangles.tsx?raw';
import cameraCompassStripSrc from '@/app/components/camera-v2/CameraCompassStrip.tsx?raw';

interface RelatedFile {
  file: string;
  code: string;
}

const BARREL_FILE: RelatedFile = { file: 'index.ts', code: barrelIndexSrc };
const TOKENS_FILE: RelatedFile = { file: 'tokens.ts', code: tokensSrc };

const COMMON_FILES: RelatedFile[] = [TOKENS_FILE, BARREL_FILE];

// ── Video HUD handoff: shared glass helper + demo device list ──────────────────

/**
 * The dark-glass HUD chrome that every pill shares. Exposed as its own handoff
 * tab because `SandboxAngleToggle`, `DeviceConnectivityBadge`, and
 * `DayNightSpringToggle` all import `glassStyle` from `SandboxDeviceSelect`.
 */
const GLASS_HELPER_SRC = `import type { CSSProperties } from 'react';

/**
 * Dark-glass HUD chrome — translucent black fill + backdrop blur.
 * Defaults match \`backdrop-blur-sm\` on a 40% black scrim; the live video tunes
 * these down to 0.2 / 1px so the feed stays legible behind the pills.
 */
export function glassStyle(bgOpacity: number, blurPx: number): CSSProperties {
  const blur = \`blur(\${blurPx}px)\`;
  return {
    backgroundColor: \`rgba(0, 0, 0, \${bgOpacity})\`,
    backdropFilter: blur,
    WebkitBackdropFilter: blur,
  };
}
`;
const GLASS_FILE: RelatedFile = { file: 'glassStyle.ts', code: GLASS_HELPER_SRC };

/**
 * The project's real asset glyphs (`DroneDeviceIcon`, `CameraIcon`, …) paint via
 * a `fill` prop rather than the `IconComponent` surface, so wrap each in a thin
 * adapter that forwards `size`/`className` — mirrors the sandbox `assetGlyph`.
 */
function hudAssetGlyph(Glyph: ComponentType<{ size?: number }>): IconComponent {
  return function HudAssetGlyph({ size = 16, className, 'aria-hidden': ariaHidden }: IconProps) {
    const px = typeof size === 'number' ? size : parseInt(String(size), 10) || 16;
    return (
      <span className={className} aria-hidden={ariaHidden} style={{ display: 'inline-flex' }}>
        <Glyph size={px} />
      </span>
    );
  };
}

const HUD_DEVICES: SandboxDevice[] = [
  { id: 'PTH-01', label: 'PTH-01', sublabel: 'Pathfinder', Icon: hudAssetGlyph(RadarIcon) },
  { id: 'DRN-01', label: 'DRN-01', sublabel: 'Drone', Icon: hudAssetGlyph(DroneDeviceIcon) },
  { id: 'DRN-02', label: 'DRN-02', sublabel: 'Drone', Icon: hudAssetGlyph(DroneDeviceIcon) },
  { id: 'CAM-01', label: 'CAM-01', sublabel: 'Camera', Icon: hudAssetGlyph(CameraIcon) },
];

/** Common focus ring used across every HUD pill (copyable in the class recipe). */
const HUD_FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong focus-visible:ring-offset-1 focus-visible:ring-offset-black';

const CARD_ACTIONS_FILES: RelatedFile[] = [
  { file: 'ActionButton.tsx', code: actionButtonSrc },
  { file: 'SplitActionButton.tsx', code: splitActionButtonSrc },
  TOKENS_FILE, BARREL_FILE,
];

const CARD_DETAILS_FILES: RelatedFile[] = [
  { file: 'AccordionSection.tsx', code: accordionSectionSrc },
  { file: 'TelemetryRow.tsx', code: telemetryRowSrc },
  TOKENS_FILE, BARREL_FILE,
];

const CARD_LOG_FILES: RelatedFile[] = [
  { file: 'AccordionSection.tsx', code: accordionSectionSrc },
  TOKENS_FILE, BARREL_FILE,
];

const DEVICES_PANEL_FILES: RelatedFile[] = [
  { file: 'StatusChip.tsx', code: statusChipSrc },
  { file: 'FilterBar.tsx', code: filterBarSrc },
  { file: 'ui/popover.tsx', code: popoverSrc },
  { file: 'ui/command.tsx', code: commandSrc },
  { file: 'ui/button.tsx', code: buttonSrc },
  { file: 'ui/switch.tsx', code: switchSrc },
  TOKENS_FILE, BARREL_FILE,
];

const DEVICE_CARD_FILES: RelatedFile[] = [
  { file: 'DeviceRow.tsx', code: deviceRowSrc },
  { file: 'DeviceAction.tsx', code: deviceActionSrc },
  { file: 'deviceRegistry.ts', code: deviceRegistrySrc },
  { file: 'deviceHealth.ts', code: deviceHealthSrc },
  { file: 'DevicesPanel.tsx', code: devicesPanelSrc },
];

const MARKER_FILES: RelatedFile[] = [
  { file: 'markerStyles.ts', code: markerStylesSrc },
  { file: 'MapIcons.tsx', code: mapIconsSrc },
  TOKENS_FILE, BARREL_FILE,
];

const GOTCHA_FILES: RelatedFile[] = [
  { file: 'DeviceChildGroup.tsx', code: deviceChildGroupSrc },
  { file: 'DeviceChildRow.tsx', code: deviceChildRowSrc },
  { file: 'gotchaUnitsToDevices.ts', code: gotchaUnitsToDevicesSrc },
  { file: 'CriticalAlertOverlay.tsx', code: criticalAlertOverlaySrc },
];

// ─── Lazy sections ───────────────────────────────────────────────────────────
// Icon Library pulls in the full registry + react-dom/server. Lazy so the
// dashboard route never pays for it.
const IconLibrary = lazy(() => import('./styleguide/IconLibrary'));

// ─── FilterBar demo data ─────────────────────────────────────────────────────

const FILTER_BAR_DEMO_DEFS: FilterDef[] = [
  {
    id: 'status',
    label: 'Status',
    icon: SlidersHorizontal,
    options: [
      { value: 'active', label: 'Active' },
      { value: 'recent', label: 'Recently active' },
      { value: 'timeout', label: 'Timed out' },
      { value: 'dismissed', label: 'Dismissed' },
    ],
  },
  {
    id: 'type',
    label: 'Type',
    icon: Tag,
    options: [
      { value: 'drone', label: 'Drone' },
      { value: 'missile', label: 'Missile' },
      { value: 'vehicle', label: 'Vehicle' },
      { value: 'unknown', label: 'Unknown' },
    ],
  },
  {
    id: 'origin',
    label: 'Origin',
    icon: Radio,
    options: [
      { value: 'rf-01', label: 'RF Scanner 01' },
      { value: 'radar-01', label: 'Radar X-Band' },
      { value: 'eo-01', label: 'EO/IR Camera' },
    ],
  },
];

// ─── DevicesPanel demo data ──────────────────────────────────────────────────

const DEVICES_PANEL_DEMO_FILTER_DEFS: FilterDef[] = [
  {
    id: 'type',
    label: 'מכשירים',
    icon: Tag,
    options: [
      { value: 'camera', label: 'מצלמות' },
      { value: 'radar', label: 'מכ"מים' },
      { value: 'drone', label: 'רחפנים' },
      { value: 'ecm', label: 'ECM' },
      { value: 'floodlight', label: 'זרקורים' },
      { value: 'speaker', label: 'רמקולים' },
    ],
  },
];

const devicesPanelDemoDevices: Device[] = [
  {
    id: 'cam-01',
    name: 'PTZ Camera',
    type: 'camera',
    lat: 0,
    lon: 0,
    status: 'available',
    operationalStatus: 'operational',
    connectionState: 'online',
    Icon: CameraIcon,
    capabilities: ['video', 'photo'],
    batteryPct: 78,
  },
  {
    id: 'cam-02',
    name: 'PixelSight',
    type: 'camera',
    lat: 0,
    lon: 0,
    status: 'available',
    operationalStatus: 'operational',
    connectionState: 'warning',
    Icon: CameraIcon,
    capabilities: ['video'],
  },
  {
    id: 'rad-01',
    name: 'X-Band Radar',
    type: 'radar',
    lat: 0,
    lon: 0,
    status: 'available',
    operationalStatus: 'operational',
    connectionState: 'online',
    Icon: RadarIcon,
  },
  {
    id: 'ecm-01',
    name: 'Regulus North',
    type: 'ecm',
    lat: 0,
    lon: 0,
    status: 'active',
    operationalStatus: 'operational',
    connectionState: 'online',
    Icon: SensorIcon,
    coverageRadiusM: 5000,
  },
  {
    id: 'floodlight-01',
    name: 'Floodlight (North)',
    type: 'floodlight',
    lat: 0,
    lon: 0,
    status: 'available',
    operationalStatus: 'operational',
    connectionState: 'online',
    Icon: FloodlightIcon,
  },
  {
    id: 'floodlight-02',
    name: 'Floodlight (South)',
    type: 'floodlight',
    lat: 0,
    lon: 0,
    status: 'available',
    operationalStatus: 'operational',
    connectionState: 'online',
    Icon: FloodlightIcon,
  },
  {
    id: 'speaker-01',
    name: 'PA Speaker (Gate)',
    type: 'speaker',
    lat: 0,
    lon: 0,
    status: 'available',
    operationalStatus: 'operational',
    connectionState: 'online',
    Icon: SpeakerIcon,
  },
  {
    id: 'speaker-02',
    name: 'PA Speaker (Tower)',
    type: 'speaker',
    lat: 0,
    lon: 0,
    status: 'available',
    operationalStatus: 'operational',
    connectionState: 'online',
    Icon: SpeakerIcon,
  },
];

// Permutations that exercise the worst-wins health model + the
// disabled-action edge cases. Coordinates are non-zero so the Location
// stat row reads like the field, not 0.0000.
const deviceCardEdgeCases: Device[] = [
  {
    id: 'edge-cam-ok', name: 'PTZ Camera — nominal', type: 'camera',
    lat: 32.0853, lon: 34.7818, status: 'available',
    operationalStatus: 'operational', connectionState: 'online',
    Icon: CameraIcon, capabilities: ['video', 'photo'],
    fovDeg: 120, bearingDeg: 45, batteryPct: 78,
  },
  {
    id: 'edge-radar-warn', name: 'X-Band Radar — warning', type: 'radar',
    lat: 32.0901, lon: 34.7760, status: 'available',
    operationalStatus: 'operational', connectionState: 'warning',
    Icon: RadarIcon, fovDeg: 90, bearingDeg: 200,
  },
  {
    id: 'edge-drone-critical', name: 'Interceptor — malfunction', type: 'drone',
    lat: 32.0788, lon: 34.7900, status: 'active',
    operationalStatus: 'malfunctioning', connectionState: 'error',
    Icon: DroneDeviceIcon, altitude: '120m', batteryPct: 12, errorCount: 3,
  },
  {
    id: 'edge-dock-low', name: 'Drone Dock — low battery', type: 'dock',
    lat: 32.0820, lon: 34.7740, status: 'available',
    operationalStatus: 'operational', connectionState: 'online',
    Icon: DroneHiveIcon, batteryPct: 18,
  },
  {
    id: 'edge-ecm-active', name: 'Regulus — jamming', type: 'ecm',
    lat: 32.0870, lon: 34.7805, status: 'active',
    operationalStatus: 'operational', connectionState: 'online',
    Icon: SensorIcon, coverageRadiusM: 5000,
  },
  {
    id: 'edge-cam-offline', name: 'PixelSight — offline', type: 'camera',
    lat: 32.0840, lon: 34.7850, status: 'offline',
    operationalStatus: 'operational', connectionState: 'offline',
    Icon: CameraIcon, capabilities: ['video'],
  },
  {
    id: 'edge-drone-ok', name: 'Interceptor — nominal', type: 'drone',
    lat: 32.0795, lon: 34.7880, status: 'available',
    operationalStatus: 'operational', connectionState: 'online',
    Icon: DroneDeviceIcon, altitude: '95m', batteryPct: 64,
  },
  {
    id: 'edge-speaker-ok', name: 'PA Speaker (Gate)', type: 'speaker',
    lat: 32.0860, lon: 34.7790, status: 'available',
    operationalStatus: 'operational', connectionState: 'online',
    Icon: SpeakerIcon,
  },
  {
    id: 'edge-flood-ok', name: 'Floodlight (North)', type: 'floodlight',
    lat: 32.0880, lon: 34.7770, status: 'available',
    operationalStatus: 'operational', connectionState: 'online',
    Icon: FloodlightIcon,
  },
  {
    id: 'edge-launcher-ok', name: 'Missile Launcher', type: 'launcher',
    lat: 32.0844, lon: 34.7805, status: 'available',
    operationalStatus: 'operational', connectionState: 'online',
    Icon: LauncherIcon,
  },
  {
    id: 'edge-lidar-warn', name: 'LIDAR East — warning', type: 'lidar',
    lat: 32.0815, lon: 34.7871, status: 'available',
    operationalStatus: 'operational', connectionState: 'warning',
    Icon: LidarIcon, fovDeg: 360, bearingDeg: 0,
  },
  {
    id: 'edge-weapon-ok', name: 'C-RAM Battery', type: 'weapon_system',
    lat: 32.0851, lon: 34.7822, status: 'available',
    operationalStatus: 'operational', connectionState: 'online',
    Icon: MissileIcon,
  },
  {
    id: 'edge-ecm-idle', name: 'Regulus — idle', type: 'ecm',
    lat: 32.0872, lon: 34.7806, status: 'available',
    operationalStatus: 'operational', connectionState: 'online',
    Icon: SensorIcon, coverageRadiusM: 2500,
  },
];

// ─── Layout primitives ───────────────────────────────────────────────────────

function ComponentSection({
  id,
  name,
  description,
  children,
}: {
  id: string;
  name: string;
  /** Optional. Sections like Icon Library that have their own self-explanatory toolbar omit the paragraph. */
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-16 space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-n-12" style={{ textWrap: 'balance' }}>{name}</h2>
        {description && (
          <p className="text-base font-normal leading-7 text-n-9" style={{ textWrap: 'pretty' }}>{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function PreviewPanel({
  children,
  className = '',
  tight = false,
  align = 'center',
  grid = false,
}: {
  children: React.ReactNode;
  className?: string;
  tight?: boolean;
  /** How to position the demo inside the frame. `center` flex-centers (default, shadcn-like); `stretch` lets content flow naturally. */
  align?: 'center' | 'stretch';
  /** Opt-in dot-grid background for minimalist demos (chips, pills, buttons). */
  grid?: boolean;
}) {
  const isCenter = align === 'center';
  const gridStyle = grid
    ? {
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
        backgroundPosition: '0 0',
      }
    : undefined;

  return (
    <div
      dir="rtl"
      className={`rounded-xl shadow-[0_0_0_1px_rgba(255,255,255,0.06)] ${tight ? 'p-6' : 'p-10'} ${isCenter ? 'flex items-center justify-center min-h-[200px]' : ''} ${className}`}
      style={{ backgroundColor: SURFACE.level0, ...gridStyle }}
    >
      {children}
    </div>
  );
}

function ExampleBlock({
  id,
  title,
  children,
  tight = false,
  previewClassName = '',
  hideTitle = false,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
  tight?: boolean;
  previewClassName?: string;
  /** Suppress the inline heading — used when the example sits inside a tab whose trigger already shows the title. */
  hideTitle?: boolean;
}) {
  return (
    <div id={id} className={`space-y-4 mt-10 first:mt-0 ${id ? 'scroll-mt-20' : ''}`}>
      {!hideTitle && <h3 className="text-sm font-medium text-n-10">{title}</h3>}
      <PreviewPanel tight={tight} className={previewClassName}>{children}</PreviewPanel>
    </div>
  );
}

interface ExampleTabItem {
  value: string;
  label: string;
  children: React.ReactNode;
}

/**
 * Tabbed wrapper for a styleguide "Examples" section. Replaces a long
 * vertical stack of {@link ExampleBlock}s with a `line`-variant tab strip.
 *
 * `TabsContent` is force-mounted so inactive panels stay in the DOM — this
 * keeps interactive demo state alive and (critically) keeps any nested
 * `id` anchors reachable by `getElementById` for the styleguide's
 * scroll-spy + hash deep-link wiring. Radix sets `hidden` on inactive
 * panels, so only the active one is visible.
 *
 * Pass `value`/`onValueChange` to drive it from external anchor state
 * (see the Device Card section); otherwise it manages its own selection
 * via `defaultValue`.
 */
function ExampleTabs({
  items,
  value,
  defaultValue,
  onValueChange,
}: {
  items: ExampleTabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}) {
  if (items.length === 0) return null;
  const controlled = value !== undefined;
  return (
    <Tabs
      {...(controlled
        ? { value, onValueChange }
        : { defaultValue: defaultValue ?? items[0].value, onValueChange })}
      className="mt-6 gap-6"
    >
      <TabsList variant="line" className="flex-wrap">
        {items.map((it) => (
          <TabsTrigger key={it.value} value={it.value}>
            {it.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((it) => (
        <TabsContent key={it.value} value={it.value} forceMount className="data-[state=inactive]:hidden">
          {it.children}
        </TabsContent>
      ))}
    </Tabs>
  );
}

interface AnchoredTab {
  value: string;
  label: string;
  /**
   * Anchor ids contained in this tab, in document order. The first id is the
   * tab's representative anchor (what the URL hash / sidebar highlight resolves
   * to when the tab is opened directly).
   */
  anchorIds: string[];
  children: React.ReactNode;
}

/**
 * {@link ExampleTabs} wired to the page's `activeAnchor` state. The active tab
 * is derived from whichever tab owns the current anchor, so hash deep-links,
 * the "On This Page" TOC, and app→styleguide handoff links all open the right
 * tab; selecting a tab directly reports its representative anchor back up.
 */
function AnchoredExampleTabs({
  tabs,
  activeAnchor,
  onAnchorChange,
}: {
  tabs: AnchoredTab[];
  activeAnchor: string | null;
  onAnchorChange: (id: string) => void;
}) {
  const activeTab =
    tabs.find((t) => activeAnchor != null && t.anchorIds.includes(activeAnchor))?.value ??
    tabs[0]?.value;
  return (
    <ExampleTabs
      value={activeTab}
      onValueChange={(v) => {
        const tab = tabs.find((t) => t.value === v);
        if (tab && tab.anchorIds[0]) onAnchorChange(tab.anchorIds[0]);
      }}
      items={tabs.map(({ value, label, children }) => ({ value, label, children }))}
    />
  );
}

function IconCatalogTile({ name, icon }: { name: string; icon: React.ReactNode }) {
  const svgRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const copySvg = useCallback(() => {
    const svg = svgRef.current?.querySelector('svg');
    if (!svg) return;
    navigator.clipboard.writeText(svg.outerHTML).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const downloadHref = iconPublicUrl('tactical', `${name}.svg`);

  return (
    <div className="group flex flex-col items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div ref={svgRef} className="flex items-center justify-center size-12">
        {icon}
      </div>
      <span className="text-xs font-mono text-n-9">{name}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={copySvg}
          aria-label={copied ? 'Copied' : 'Copy SVG'}
          className="p-2.5 rounded-md text-n-120 hover:text-n-11 hover:bg-state-hover-overlay active:scale-[0.98] transition-[color,background-color,transform] duration-150 ease-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>
        <a
          href={downloadHref}
          download={`${name}.svg`}
          aria-label="Download SVG"
          className="p-2.5 rounded-md text-n-120 hover:text-n-11 hover:bg-state-hover-overlay active:scale-[0.98] transition-[color,background-color,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring"
        >
          <Download size={14} />
        </a>
      </div>
    </div>
  );
}

/**
 * Self-contained, interactive `DeviceRow` for the Device Card styleguide
 * page. Owns its own expand + control state so each demo card behaves
 * like the real thing (toggle open, mute, floodlight, speaker, pin)
 * without wiring a parent panel. Defaults to expanded so the handoff
 * doc shows the full card anatomy at a glance.
 */
function DeviceCardRowDemo({
  device,
  defaultExpanded = true,
  initialFloodOn = false,
  initialSpeakerOn = false,
  initialPinned = false,
}: {
  device: Device;
  defaultExpanded?: boolean;
  /** Pre-seed interactive states so the gallery shows them without a click. */
  initialFloodOn?: boolean;
  initialSpeakerOn?: boolean;
  initialPinned?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [floodOn, setFloodOn] = useState(initialFloodOn);
  const [speakerOn, setSpeakerOn] = useState(initialSpeakerOn);
  const [pinned, setPinned] = useState(initialPinned);
  return (
    <DeviceRow
      device={device}
      isExpanded={expanded}
      onToggle={() => setExpanded((v) => !v)}
      onHover={noop}
      onFlyTo={noop}
      isFloodlightOn={floodOn}
      onFloodlightToggle={() => setFloodOn((v) => !v)}
      isSpeakerPlaying={speakerOn}
      onSpeakerToggle={() => setSpeakerOn((v) => !v)}
      onJamActivate={noop}
      isPinnedToFeed={pinned}
      onPinToFeed={() => setPinned(true)}
      onUnpinFromFeed={() => setPinned(false)}
      onOpenLogs={(id) => console.info('[styleguide] open logs', id)}
      onArmNotifications={(id, armed) => console.info('[styleguide] notifications', id, armed)}
    />
  );
}

/**
 * The seed Gotcha effector, adapted through the production mapper into the
 * shared `Device` shape so the styleguide renders the exact composite card the
 * app ships (parent + 4 sector children + camera). Module-scope: the source is
 * static, so it never needs to recompute per render.
 */
const GOTCHA_STYLEGUIDE_DEVICE = gotchaUnitsToDevices(GOTCHA_UNITS)[0];

/**
 * Standalone `DeviceChildRow` gallery — the sensor/camera children pulled out
 * of the collapsible group so their selected / hover / unhealthy-with-Logs
 * states are visible without expanding the parent. Owns its own selection so
 * clicking a row shows the selected treatment.
 */
function GotchaSensorRowsDemo() {
  const [selected, setSelected] = useState<string | null>(
    GOTCHA_STYLEGUIDE_DEVICE?.children?.[0]?.id ?? null,
  );
  const children = GOTCHA_STYLEGUIDE_DEVICE?.children ?? [];
  return (
    <div className="w-full max-w-[320px] rounded border border-white/[0.06] bg-white/[0.04] p-1" dir="ltr">
      <div className="flex flex-col gap-0.5">
        {children.map((child) => (
          <DeviceChildRow
            key={child.id}
            device={child}
            strings={DEFAULT_DEVICE_PANEL_STRINGS}
            inset
            selected={selected === child.id}
            onHover={noop}
            onSelect={(id) => setSelected((cur) => (cur === id ? null : id))}
            onOpenErrors={noop}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Live trigger for the critical drone-alert takeover. Fires the same window
 * event the production detection pipeline uses (`showCriticalDroneAlert`); the
 * mounted overlay renders full-screen and is dismissable via the X, the scrim,
 * or Escape.
 */
function GotchaCriticalAlertDemo() {
  const fire = (withMedia: boolean) =>
    showCriticalDroneAlert({
      title: 'Drone detected',
      message: 'אזור ב׳ · quadcopter · closing',
      bearingDeg: 95,
      distanceM: 420,
      ...(withMedia ? { snapshotUrl: iconPublicUrl('tactical', 'DroneIcon.svg') } : {}),
    });
  return (
    <div className="flex w-full flex-col items-start gap-4" dir="ltr">
      <p className="max-w-[64ch] text-sm leading-6 text-n-9">
        The highest-severity lane: bypasses the batched notification pool entirely and drives an
        interactive full-screen takeover with a compass bearing, range readout, optional snapshot /
        live video, a one-click PA broadcast (כריזה), a Show-on-map jump, and a critical audio cue.
        It auto-dismisses on a countdown. Trigger it below — dismiss with the X, the scrim, or Escape.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fire(true)}
          className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/60"
        >
          <AlertTriangle size={16} />
          Trigger critical alert
        </button>
        <button
          type="button"
          onClick={() => fire(false)}
          className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/[0.04] px-3.5 py-2 text-sm font-medium text-n-10 transition-colors hover:bg-state-hover-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring"
        >
          Without media
        </button>
      </div>
      <CriticalAlertOverlay onBroadcast={noop} onLocate={noop} />
    </div>
  );
}

/** Sector / ring colour legend — colours come straight from the production rule. */
const GOTCHA_SECTOR_LEGEND: { label: string; color: string; note: string }[] = [
  { label: 'Healthy', color: gotchaSectorColor('ok'), note: 'friendly cyan — hidden at rest' },
  { label: 'Error / blind', color: gotchaSectorColor('error'), note: 'red — the only trouble tier' },
];

/** Map marker + 120-degree sector colour legend for the Gotcha effector. */
function GotchaMapDemo() {
  const style = resolveMarkerStyle('default', 'friendly');
  return (
    <div className="flex w-full flex-wrap items-start gap-12" dir="ltr">
      <div className="flex flex-col items-center gap-2">
        <MapMarker
          icon={<GotchaIcon outlined fill="white" size={34} />}
          style={style}
          surfaceSize={48}
          ringSize={38}
          label="Gotcha North"
          showLabel
        />
        <span className="text-xs font-mono text-n-9">GotchaIcon marker</span>
      </div>
      <div className="flex flex-col gap-3">
        <span className="text-2xs font-medium uppercase tracking-wide text-n-8">
          Sector colour (worst-wins health)
        </span>
        {GOTCHA_SECTOR_LEGEND.map(({ label, color, note }) => (
          <div key={label} className="flex items-center gap-3">
            <span
              className="size-4 shrink-0 rounded-sm"
              style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-n-11">{label}</span>
            <span className="font-mono text-xs-plus text-n-9">{color}</span>
            <span className="text-xs text-n-120">{note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StyleguideDeviceTile({ label, children, width = 380 }: { label?: string; children: React.ReactNode; width?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-xs font-medium text-n-9">{label}</span>}
      <div className="bg-n-1 border border-white/10 rounded-lg overflow-hidden" style={{ width }}>
        {children}
      </div>
    </div>
  );
}

// ─── Device elements catalog ─────────────────────────────────────────────────

/** Dark card-like surface so the device controls read in their real context. */
function CatalogSurface({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full rounded-md border border-white/10 bg-n-1 p-4" dir="ltr">
      {children}
    </div>
  );
}

function CatalogLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-2xs font-medium uppercase tracking-wide text-n-8">{children}</span>;
}

/**
 * Builds a live `DeviceActionContext` for the catalog — the same shape the
 * real row passes to `resolveDeviceAction`, with `useState`-backed toggles and
 * noop side effects. Driving the real resolver keeps the catalog in lockstep
 * with the registry: any new action kind shows up here for free.
 */
function useCatalogCtx(device: Device): DeviceActionContext {
  const [isFloodlightOn, setFlood] = useState(false);
  const [isSpeakerPlaying, setSpeaker] = useState(false);
  const [isPinnedToFeed, setPinned] = useState(false);
  const [isNotifyOn, setNotify] = useState(false);
  const [notifyRemaining, setRemaining] = useState(NOTIFY_WINDOW_S);
  const [selectedTrackId, setSelectedTrackId] = useState<string>(DEFAULT_SPEAKER_TRACKS[0]?.id ?? '');

  useEffect(() => {
    if (!isNotifyOn) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setNotify(false);
          return NOTIFY_WINDOW_S;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isNotifyOn]);

  return {
    device,
    strings: DEFAULT_DEVICE_PANEL_STRINGS,
    isFloodlightOn,
    isSpeakerPlaying,
    isPinnedToFeed,
    speakerTracks: DEFAULT_SPEAKER_TRACKS,
    selectedTrackId,
    onSelectTrack: setSelectedTrackId,
    errorCount: device.errorCount ?? 3,
    isNotifyOn,
    notifyRemaining,
    onToggleNotify: () => {
      setRemaining(NOTIFY_WINDOW_S);
      setNotify((v) => !v);
    },
    onOpenLogs: noop,
    onOpenErrors: noop,
    onFlyTo: noop,
    onFloodlightToggle: () => setFlood((v) => !v),
    onSpeakerToggle: () => setSpeaker((v) => !v),
    onJamActivate: noop,
    onPinToFeed: () => setPinned(true),
    onUnpinFromFeed: () => setPinned(false),
  };
}

const CATALOG_TONES: DeviceActionTone[] = ['neutral', 'engaged', 'caution', 'danger'];

function FloodlightToggleDemos() {
  const [wide, setWide] = useState(false);
  const [compact, setCompact] = useState(true);
  return (
    <div className="flex flex-wrap items-end gap-8">
      <div className="flex flex-col gap-2">
        <CatalogLabel>Default</CatalogLabel>
        <FloodlightSegmentedDefault on={wide} onToggle={() => setWide((v) => !v)} />
      </div>
      <div className="flex flex-col gap-2">
        <CatalogLabel>Compact (header)</CatalogLabel>
        <FloodlightSegmentedCompact on={compact} onToggle={() => setCompact((v) => !v)} />
      </div>
      <div className="flex flex-col gap-2">
        <CatalogLabel>Disabled</CatalogLabel>
        <FloodlightSegmentedCompact on={false} onToggle={noop} disabled />
      </div>
    </div>
  );
}

/**
 * One container with every action, toggle, and dropdown that lives inside the
 * device card, each in isolation. Lets a developer eyeball the full control
 * inventory without reading the row source.
 */
function DeviceElementsCatalog() {
  const camera = deviceCardEdgeCases[0];
  const drone = deviceCardEdgeCases[6];
  const speaker = deviceCardEdgeCases[7];
  const floodlight = deviceCardEdgeCases[8];
  const ecm = deviceCardEdgeCases[12];

  const cameraCtx = useCatalogCtx(camera);
  const speakerCtx = useCatalogCtx(speaker);
  const floodCtx = useCatalogCtx(floodlight);
  const ecmCtx = useCatalogCtx(ecm);
  const droneCtx = useCatalogCtx(drone);

  const resolved: { kind: DeviceActionKind; label: string; ctx: DeviceActionContext }[] = [
    { kind: 'center', label: 'Show on map', ctx: cameraCtx },
    { kind: 'floodlight', label: 'Floodlight', ctx: floodCtx },
    { kind: 'jam', label: 'ECM jam', ctx: ecmCtx },
    { kind: 'speaker', label: 'Speaker play/pause', ctx: speakerCtx },
    { kind: 'audio', label: 'Audio track', ctx: speakerCtx },
    { kind: 'watchVideo', label: 'Watch video', ctx: cameraCtx },
    { kind: 'pin', label: 'Pin to feed', ctx: cameraCtx },
    { kind: 'wipers', label: 'Wipers', ctx: droneCtx },
    { kind: 'calibrate', label: 'Calibrate', ctx: droneCtx },
  ];

  return (
    <div>
      <p className="mb-2 text-xs text-n-9">
        Every interactive element that lives inside the device card, in isolation. The action grid is
        rendered through the same <code className="font-mono text-n-10">resolveDeviceAction</code>
        {' '}resolver the real row uses, so it always mirrors the registry.
      </p>

      {/* ── DeviceAction primitive — tone x state ───────────── */}
      <ExampleBlock id="device-elements" title="DeviceAction — tone x state matrix">
        <CatalogSurface>
          <div className="mb-4 flex flex-wrap items-center gap-6 text-2xs text-n-8">
            <span>Solid footer pills: Idle / Pressed / Loading / Disabled</span>
            <span>·</span>
            <span>Ghost header glyphs: Idle / Pressed / Disabled</span>
          </div>
          <div className="flex flex-col gap-3">
            {CATALOG_TONES.map((tone) => (
              <div
                key={tone}
                className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] pb-3 last:border-0"
              >
                <div className="w-16 shrink-0 font-mono text-2xs text-n-8">{tone}</div>
                <DeviceAction tone={tone} icon={<CameraIcon size={12} />} label="Idle" ariaLabel="Idle" onClick={noop} />
                <DeviceAction tone={tone} pressed icon={<CameraIcon size={12} />} label="Pressed" ariaLabel="Pressed" onClick={noop} />
                <DeviceAction tone={tone} loading icon={<CameraIcon size={12} />} label="Loading" ariaLabel="Loading" />
                <DeviceAction
                  tone={tone}
                  disabled
                  disabledReason="Unavailable while offline"
                  icon={<CameraIcon size={12} />}
                  label="Disabled"
                  ariaLabel="Disabled"
                />
                <span aria-hidden className="mx-1 h-5 w-px bg-white/10" />
                <DeviceAction tone={tone} ghost iconOnly icon={<CameraIcon size={12} />} ariaLabel="Ghost idle" onClick={noop} />
                <DeviceAction tone={tone} ghost iconOnly pressed icon={<CameraIcon size={12} />} ariaLabel="Ghost pressed" onClick={noop} />
                <DeviceAction tone={tone} ghost iconOnly disabled disabledReason="Unavailable" icon={<CameraIcon size={12} />} ariaLabel="Ghost disabled" />
              </div>
            ))}
          </div>
        </CatalogSurface>
      </ExampleBlock>

      {/* ── Every registry action kind ──────────────────────── */}
      <ExampleBlock id="device-elements-resolved" title="Actions — every registry kind (header + footer)">
        <CatalogSurface>
          <div className="flex flex-col gap-4">
            {resolved.map(({ kind, label, ctx }) => {
              const header = resolveDeviceAction(kind, ctx, 'header');
              const footer = resolveDeviceAction(kind, ctx, 'footer');
              return (
                <div
                  key={kind}
                  className="flex flex-wrap items-start gap-x-8 gap-y-3 border-b border-white/[0.06] pb-4 last:border-0"
                >
                  <div className="w-36 shrink-0">
                    <div className="text-xs text-n-10">{label}</div>
                    <div className="font-mono text-2xs text-n-8">{kind}</div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <CatalogLabel>Header</CatalogLabel>
                    <div className="flex items-center gap-2">
                      {header?.node ?? <span className="text-2xs text-n-7">—</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <CatalogLabel>Footer</CatalogLabel>
                    <div className="flex items-start gap-2">
                      {footer?.node ?? <span className="text-2xs text-n-7">—</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CatalogSurface>
      </ExampleBlock>

      {/* ── Toggles ─────────────────────────────────────────── */}
      <ExampleBlock id="device-elements-toggles" title="Toggles — floodlight segmented On/Off">
        <CatalogSurface>
          <FloodlightToggleDemos />
        </CatalogSurface>
      </ExampleBlock>

      {/* ── Dropdowns ───────────────────────────────────────── */}
      <ExampleBlock id="device-elements-dropdowns" title="Dropdowns — audio-track combobox + ECM jam split">
        <CatalogSurface>
          <div className="flex flex-wrap items-start gap-10">
            <div className="flex flex-col gap-2">
              <CatalogLabel>Audio track (SpeakerTrackSelect)</CatalogLabel>
              <SpeakerTrackSelect tracks={DEFAULT_SPEAKER_TRACKS} strings={DEFAULT_DEVICE_PANEL_STRINGS} />
            </div>
            <div className="flex flex-col gap-2">
              <CatalogLabel>ECM jam (split + confirm)</CatalogLabel>
              <JamSplitButton device={ecm} strings={DEFAULT_DEVICE_PANEL_STRINGS} onJamActivate={noop} />
            </div>
          </div>
        </CatalogSurface>
      </ExampleBlock>

      {/* ── Overflow + notifications ────────────────────────── */}
      <ExampleBlock id="device-elements-overflow" title="Overflow + notifications — Logs error channel + timed window">
        <CatalogSurface>
          <div className="flex flex-wrap items-end gap-10">
            <div className="flex flex-col gap-2">
              <CatalogLabel>3-dot overflow (Logs + Notifications)</CatalogLabel>
              <div className="flex h-44 items-end">
                <DeviceOverflowMenu kinds={['logs', 'notifications']} ctx={ecmCtx} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <CatalogLabel>Notify header indicator</CatalogLabel>
              <NotifyHeaderIndicator armed remaining={120} ariaLabelPrefix="Notifications" />
            </div>
            <div className="flex flex-col gap-2">
              <CatalogLabel>Notify countdown</CatalogLabel>
              <NotifyCountdown remaining={30} />
            </div>
          </div>
        </CatalogSurface>
      </ExampleBlock>
    </div>
  );
}

/** Binary tone palette, mirroring `DeviceRowHeader`'s `HEALTH_TONE`. */
const STYLEGUIDE_HEALTH_TONE: Record<DeviceHealth, { dot: string; badge: string | null }> = {
  error: { dot: HEALTH_DOT_CLASS.error, badge: HEALTH_BADGE_CLASS.error },
  ok: { dot: HEALTH_DOT_CLASS.ok, badge: null },
};

/**
 * Static replica of the `DeviceRowHeader` health tooltip surface, rendered
 * always-open so the styleguide gallery can stress every edge case at once.
 * Markup tracks the real `TooltipContent`: a severity dot + truncating label +
 * optional count badge over a hairline, with the reason and a connection chip
 * fenced below. The fence collapses entirely when there is no reason or chip.
 */
function StyleguideHealthTooltip({
  tone,
  severity,
  errorCount = 0,
  reason,
  connectionLabel,
  dir = 'ltr',
}: {
  tone: DeviceHealth;
  severity: string;
  errorCount?: number;
  reason?: string;
  connectionLabel?: string;
  connectionColor?: StatusChipColor;
  dir?: 'ltr' | 'rtl';
}) {
  const t = STYLEGUIDE_HEALTH_TONE[tone];
  const showBadge = t.badge != null && errorCount > 0;
  const badgeLabel = errorCount > 99 ? '99+' : errorCount;
  const hasFence = reason != null || connectionLabel != null;
  return (
    <div
      dir={dir}
      className="w-fit min-w-[184px] max-w-[260px] overflow-hidden rounded-none bg-slate-4 text-xs text-slate-11 shadow-[0_0_0_1px_rgba(255,255,255,0.1)]"
    >
      <div className="flex items-center justify-start gap-1.5 px-2.5 py-1.5">
        <span className={`size-1.5 shrink-0 rounded-full ${t.dot}`} />
        <span className="w-full min-w-0 truncate text-xs font-semibold text-slate-12">{severity}</span>
        {showBadge && (
          <span className={`h-4 shrink-0 rounded-[2px] px-1.5 align-middle text-2xs font-medium leading-4 tabular-nums ${t.badge}`}>
            {badgeLabel}
          </span>
        )}
      </div>
      {hasFence && (
        <div className="border-t border-white/10 px-2.5 py-1.5">
          {reason != null && <div className="max-w-[220px] text-xs text-slate-11">{reason}</div>}
          {connectionLabel != null && (
            <div className="mt-0.5 text-2xs text-white/50">{connectionLabel}</div>
          )}
        </div>
      )}
    </div>
  );
}

interface HealthTipScenario {
  /** Lab-style caption naming the edge case under test. */
  label: string;
  tone: DeviceHealth;
  errorCount?: number;
  connectionColor?: StatusChipColor;
  en: { severity: string; reason?: string; connection?: string };
  he: { severity: string; reason?: string; connection?: string };
}

/** The edge-case matrix the health tooltip must survive, EN + RTL. */
const STYLEGUIDE_HEALTH_TIP_SCENARIOS: HealthTipScenario[] = [
  {
    label: 'Critical · 2 errors · reason + connection (canonical)',
    tone: 'error',
    errorCount: 2,
    connectionColor: 'orange',
    en: { severity: 'Critical', reason: 'Sensor fault', connection: 'Warning' },
    he: { severity: 'קריטי', reason: 'תקלת חיישן', connection: 'אזהרה' },
  },
  {
    label: 'Critical · 99+ errors (count clamp)',
    tone: 'error',
    errorCount: 248,
    connectionColor: 'red',
    en: { severity: 'Critical', reason: 'Repeated command timeouts', connection: 'Error' },
    he: { severity: 'קריטי', reason: 'פסקי זמן חוזרים בפקודות', connection: 'שגיאה' },
  },
  {
    label: 'Critical · 1 error (singular count)',
    tone: 'error',
    errorCount: 1,
    connectionColor: 'red',
    en: { severity: 'Critical', reason: 'Motor stall', connection: 'Error' },
    he: { severity: 'קריטי', reason: 'תקיעת מנוע', connection: 'שגיאה' },
  },
  {
    label: 'Critical · 0 errors (badge hidden)',
    tone: 'error',
    errorCount: 0,
    en: { severity: 'Critical', reason: 'Malfunction' },
    he: { severity: 'קריטי', reason: 'תקלה' },
  },
  {
    label: 'Error · battery reason + connection',
    tone: 'error',
    errorCount: 1,
    connectionColor: 'red',
    en: { severity: 'Errors', reason: 'Battery 18%', connection: 'Error' },
    he: { severity: 'שגיאות', reason: 'סוללה 18%', connection: 'שגיאה' },
  },
  {
    label: 'Error · disconnected ("Offline" is the reason)',
    tone: 'error',
    connectionColor: 'red',
    en: { severity: 'Errors', reason: 'Disconnected', connection: 'Offline' },
    he: { severity: 'שגיאות', reason: 'נותק החיבור', connection: 'לא מקוון' },
  },
  {
    label: 'OK · no fence (header-only, minimal)',
    tone: 'ok',
    en: { severity: 'Healthy' },
    he: { severity: 'תקין' },
  },
  {
    label: 'Long reason (wrap test)',
    tone: 'error',
    errorCount: 7,
    connectionColor: 'red',
    en: {
      severity: 'Critical',
      reason: 'GPS module unresponsive after firmware rollback; awaiting reconnection and operator acknowledgement',
      connection: 'Error',
    },
    he: {
      severity: 'קריטי',
      reason: 'מודול ה-GPS אינו מגיב לאחר חזרת קושחה; ממתין לחיבור מחדש ולאישור מפעיל',
      connection: 'שגיאה',
    },
  },
  {
    label: 'Missing reason + online (no fence, no divider)',
    tone: 'error',
    errorCount: 3,
    en: { severity: 'Errors' },
    he: { severity: 'שגיאות' },
  },
  {
    label: 'Long severity label vs badge (truncate test)',
    tone: 'error',
    errorCount: 12,
    connectionColor: 'red',
    en: { severity: 'Communications subsystem malfunction', reason: 'Link degraded', connection: 'Error' },
    he: { severity: 'תקלה במערכת התקשורת המשנית', reason: 'הקישור מתדרדר', connection: 'שגיאה' },
  },
  {
    label: 'Connection-only fence (no reason)',
    tone: 'error',
    errorCount: 1,
    connectionColor: 'red',
    en: { severity: 'Errors', connection: 'Error' },
    he: { severity: 'שגיאות', connection: 'שגיאה' },
  },
  {
    label: 'Reason-only fence (online, no chip)',
    tone: 'error',
    errorCount: 2,
    en: { severity: 'Critical', reason: 'Sensor fault' },
    he: { severity: 'קריטי', reason: 'תקלת חיישן' },
  },
];

function StyleguideBatteryIcon({ pct }: { pct: number }) {
  const colorClass = pct > 60 ? 'text-emerald-400' : pct > 30 ? 'text-amber-400' : pct >= 20 ? 'text-orange-400' : 'text-red-400';
  const fillWidth = Math.max(1, (pct / 100) * 17);
  return (
    <svg className={colorClass} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width={16} height={16}>
      <rect x="1" y="5" width="19" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="2.5" y="6.5" width={fillWidth} height="11" rx="1" fill="currentColor" />
      <rect x="20" y="10" width="3" height="4" rx="1" fill="currentColor" />
    </svg>
  );
}

function StyleguideJamIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width={size} height={size} className={className}>
      <path d="M22 12C19.5 10.5 19.5 5 17.5 5C15.5 5 15.5 10 13 10C10.5 10 10.5 2 8 2C5.5 2 5 10.5 2 12C5 13.5 5.5 22 8 22C10.5 22 10.5 14 13 14C15.5 14 15.5 19 17.5 19C19.5 19 19 13.5 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/** Solid play triangle used inside the speaker Play/Stop button (mirrors the
 * `PlayFilledIcon` colocated inside `DevicesPanel.tsx`). */
function StyleguidePlayFilledIcon({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6.5145 2.14251C6.20556 1.95715 5.82081 1.95229 5.5073 2.1298C5.19379 2.30731 5 2.63973 5 3V21C5 21.3603 5.19379 21.6927 5.5073 21.8702C5.82081 22.0477 6.20556 22.0429 6.5145 21.8575L21.5145 12.8575C21.8157 12.6768 22 12.3513 22 12C22 11.6487 21.8157 11.3232 21.5145 11.1425L6.5145 2.14251Z" />
    </svg>
  );
}

// ─── Section layout helpers (shadcn-style) ───────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xl font-semibold text-n-12 tracking-tight mt-12 first:mt-0 mb-3">
      {children}
    </h3>
  );
}

// ─── Interaction Flow block ──────────────────────────────────────────────────

interface FlowStep {
  label: string;
  detail?: string;
}

function InteractionFlowBlock({
  id,
  title,
  description,
  cardZone,
  mapZone,
  steps,
  /** When false, the map column is display-only (no marker hover/click); interaction hint follows the card column only. */
  mapInteractive = false,
}: {
  id: string;
  title: string;
  description: string;
  cardZone: React.ReactNode;
  mapZone: React.ReactNode;
  steps: FlowStep[];
  mapInteractive?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div id={id} className="scroll-mt-20 space-y-2.5">
      <div className="space-y-1">
        <h4 className="text-base font-semibold text-n-12 tracking-tight">{title}</h4>
        <p className="text-base font-normal leading-relaxed text-white/50 tracking-wide">{description}</p>
      </div>

      <div
        className="rounded-none overflow-hidden"
        style={{
          backgroundColor: SURFACE.level0,
          boxShadow: 'none',
        }}
        {...(mapInteractive
          ? { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) }
          : {})}
      >
        <div className="relative flex min-h-[200px]">
          {/* "Interactive" hint */}
          <span
            className="absolute bottom-2.5 left-3 z-10 text-xs font-medium text-n-120 uppercase tracking-[0.06em] transition-opacity duration-150 ease-out pointer-events-none"
            style={{ opacity: hovered ? 1 : 0 }}
          >
            Interactive
          </span>

          {/* Map zone */}
          <div
            className="flex-1 flex flex-col min-w-0"
            style={{ background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.4) 100%), ${SURFACE.level0}` }}
          >
            <span className="block text-xs font-semibold text-n-120 uppercase tracking-[0.08em] px-4 pt-3 pb-1.5">Map</span>
            <div
              className={`flex-1 relative px-4 pb-4 flex items-center justify-center${mapInteractive ? '' : ' pointer-events-none'}`}
            >
              {mapZone}
            </div>
          </div>

          {/* Card zone */}
          <div
            className="w-[280px] shrink-0 border-l border-white/[0.06] flex flex-col"
            style={{ backgroundColor: SURFACE.level1 }}
            {...(!mapInteractive
              ? { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) }
              : {})}
          >
            <span className="block text-xs font-semibold text-n-120 uppercase tracking-[0.08em] px-4 pt-3 pb-1.5">Card</span>
            <div dir="rtl" className="flex-1 px-4 pb-4 flex flex-col justify-center">{cardZone}</div>
          </div>
        </div>

        {/* Step sequence */}
        <div className="border-t border-white/[0.06] px-5 py-4">
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-xs font-bold text-sky-400 tabular-nums font-mono leading-[1.6] shrink-0 w-4 text-right">{i + 1}</span>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium text-n-11">{step.label}</span>
                  {step.detail && (
                    <span className="text-xs text-n-9 leading-relaxed font-mono font-medium" style={{ fontVariantNumeric: 'slashed-zero' }}>
                      {step.detail}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Tactical `DroneIcon` scaled for `CardHeader`’s icon slot; uses `currentColor` from the header tint box. */
function CardDroneHeaderIcon({
  size = 20,
  ...rest
}: { size?: number } & React.HTMLAttributes<HTMLSpanElement>) {
  const scale = size / 28;
  return (
    <span
      className="inline-flex items-center justify-center leading-none"
      style={{ width: size, height: size }}
      {...rest}
    >
      <span className="inline-block origin-center" style={{ transform: `scale(${scale})` }}>
        <DroneIcon color="currentColor" rotationDeg={-12} />
      </span>
    </span>
  );
}

function TargetCardFlows() {
  const [flow1Hovered, setFlow1Hovered] = useState(false);
  const [flow2Hovered, setFlow2Hovered] = useState(false);
  const [flow2Open, setFlow2Open] = useState(false);
  const [flow3Open, setFlow3Open] = useState(false);
  const [flow5HoveredSensor, setFlow5HoveredSensor] = useState<string | null>(null);

  const prefersReducedMotion = useReducedMotion();

  const defaultStyle = resolveMarkerStyle('default', 'hostile');
  const hoveredStyle = resolveMarkerStyle('selected', 'hostile');
  const activeStyle = resolveMarkerStyle('active', 'hostile');
  const friendlyDefault = resolveMarkerStyle('default', 'friendly');
  const friendlyHovered = resolveMarkerStyle('hovered', 'friendly');

  return (
    <div className="space-y-8">

      {/* ── Flow 1: Hover Card → Map Highlight ── */}
      <InteractionFlowBlock
        id="flow-hover-card"
        title="Hover Card → Map Highlight"
        description="Hovering a detection card in the sidebar highlights its corresponding marker on the map."
        cardZone={
          <div
            className="overflow-hidden cursor-default"
            style={{
              backgroundColor: CARD_TOKENS.container.bgColor,
              borderRadius: CARD_TOKENS.container.borderRadius,
              boxShadow: ELEVATION.shadow,
            }}
            onMouseEnter={() => setFlow1Hovered(true)}
            onMouseLeave={() => setFlow1Hovered(false)}
          >
            <div
              className="transition-colors hover:bg-state-hover"
              style={{ padding: `${CARD_TOKENS.header.paddingY}px ${CARD_TOKENS.header.paddingX}px` }}
            >
              <CardHeader
                icon={CardDroneHeaderIcon}
                iconColor="#f97316"
                title="רחפן חשוד"
                subtitle="DJI Mavic 3"
                status={<StatusChip label="active" color="red" />}
                open={false}
              />
            </div>
          </div>
        }
        mapZone={
          <div className="flex items-center gap-8">
            <div className="flex flex-col items-center gap-2" aria-label="מטרה — רחפן עוין">
              <MapMarker
                icon={<DroneIcon rotationDeg={-22} color={flow1Hovered ? hoveredStyle.glyphColor : defaultStyle.glyphColor} />}
                style={flow1Hovered ? hoveredStyle : defaultStyle}
                surfaceSize={42}
                ringSize={34}
              />
            </div>
            <div className="flex flex-col items-center gap-2 opacity-40" aria-label="כלי נוסף">
              <MapMarker
                icon={<DroneIcon rotationDeg={18} color={friendlyDefault.glyphColor} />}
                style={friendlyDefault}
                surfaceSize={42}
                ringSize={34}
              />
            </div>
          </div>
        }
        steps={[
          { label: 'User hovers detection card in sidebar' },
          { label: 'onTargetHover(targetId) fires' },
          { label: 'Map marker resolves to selected state' },
          { label: 'Mouse leaves → marker returns to default' },
        ]}
      />

      {/* ── Flow 2: Open Card → Map Pulse + Pan ── */}
      <InteractionFlowBlock
        id="flow-open-card"
        title="Open Card → Map Pulse + Pan"
        description="Hovering a card highlights its map marker. Clicking expands the card, activates the pulse, and pans the map."
        cardZone={
          <div
            className="overflow-hidden cursor-pointer"
            style={{
              backgroundColor: CARD_TOKENS.container.bgColor,
              borderRadius: CARD_TOKENS.container.borderRadius,
              boxShadow: ELEVATION.shadow,
            }}
            onMouseEnter={() => setFlow2Hovered(true)}
            onMouseLeave={() => setFlow2Hovered(false)}
            onClick={() => setFlow2Open(prev => !prev)}
          >
            <div
              className="transition-colors hover:bg-state-hover"
              style={{
                padding: `${CARD_TOKENS.header.paddingY}px ${CARD_TOKENS.header.paddingX}px`,
                backgroundColor: flow2Open ? `rgba(255,255,255,${CARD_TOKENS.header.selectedBgOpacity})` : undefined,
              }}
            >
              <CardHeader
                icon={CardDroneHeaderIcon}
                iconColor="#f97316"
                title="רחפן חשוד"
                subtitle="DJI Mavic 3"
                status={<StatusChip label="active" color="red" />}
                open={flow2Open}
              />
            </div>
            <AnimatePresence initial={false}>
              {flow2Open && (
                <motion.div
                  initial={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  animate={prefersReducedMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                  className="overflow-hidden"
                >
                  <div
                    className="px-3 py-3 text-xs text-n-9"
                    style={{ backgroundColor: CARD_TOKENS.content.bgColor, boxShadow: `inset 0 1px 0 0 ${CARD_TOKENS.content.borderColor}` }}
                  >
                    Card content expanded
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        }
        mapZone={
          <div className="flex flex-col items-center gap-2">
            <MapMarker
              icon={<DroneIcon rotationDeg={-12} color={(flow2Hovered || flow2Open) ? activeStyle.glyphColor : defaultStyle.glyphColor} />}
              style={(flow2Hovered || flow2Open) ? activeStyle : defaultStyle}
              surfaceSize={42}
              ringSize={34}
              pulse={flow2Open}
            />
            <span className="text-xs font-medium text-n-120 tabular-nums">
              {flow2Open ? 'Active (open)' : flow2Hovered ? 'Highlighted (hover)' : 'Idle'}
            </span>
          </div>
        }
        steps={[
          { label: 'User hovers detection card in sidebar' },
          { label: 'Marker enters its static hover-highlight state' },
          { label: 'User clicks card header to expand' },
          { label: 'Marker pulses and map pans to target coordinates' },
        ]}
      />

      {/* ── Flow 3: Click Map Marker → Open Card ── */}
      <InteractionFlowBlock
        id="flow-click-marker"
        mapInteractive
        title="Click Map Marker → Open Card"
        description="Clicking a target marker on the map opens its corresponding card in the sidebar."
        cardZone={
          <div
            className="overflow-hidden"
            style={{
              backgroundColor: CARD_TOKENS.container.bgColor,
              borderRadius: CARD_TOKENS.container.borderRadius,
              boxShadow: ELEVATION.shadow,
            }}
          >
            <div
              className="transition-colors"
              style={{
                padding: `${CARD_TOKENS.header.paddingY}px ${CARD_TOKENS.header.paddingX}px`,
                backgroundColor: flow3Open ? `rgba(255,255,255,${CARD_TOKENS.header.selectedBgOpacity})` : undefined,
              }}
            >
              <CardHeader
                icon={CardDroneHeaderIcon}
                iconColor="#f97316"
                title="רחפן חשוד"
                subtitle="DJI Mavic 3"
                status={<StatusChip label="active" color="red" />}
                open={flow3Open}
              />
            </div>
            <AnimatePresence initial={false}>
              {flow3Open && (
                <motion.div
                  initial={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  animate={prefersReducedMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                  className="overflow-hidden"
                >
                  <div
                    className="px-3 py-3 text-xs text-n-9"
                    style={{ backgroundColor: CARD_TOKENS.content.bgColor, boxShadow: `inset 0 1px 0 0 ${CARD_TOKENS.content.borderColor}` }}
                  >
                    Card opens from map click
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        }
        mapZone={
          <div className="flex items-start justify-start gap-8">
            <div
              className="flex flex-col items-center gap-2 cursor-pointer"
              onClick={() => setFlow3Open(prev => !prev)}
              aria-label="מטרה — לחץ להתאמה עם הכרטיס"
            >
              <MapMarker
                icon={<DroneIcon rotationDeg={-22} color={flow3Open ? activeStyle.glyphColor : defaultStyle.glyphColor} />}
                style={flow3Open ? activeStyle : defaultStyle}
                surfaceSize={42}
                ringSize={34}
                pulse={flow3Open}
              />
              <span className="text-xs font-medium text-n-9">Click me</span>
            </div>
            <div className="flex flex-col items-center gap-2 opacity-40" aria-label="כלי נוסף">
              <MapMarker
                icon={<DroneIcon rotationDeg={18} color={friendlyDefault.glyphColor} />}
                style={friendlyDefault}
                surfaceSize={42}
                ringSize={34}
              />
            </div>
          </div>
        }
        steps={[
          { label: 'User clicks target marker on map' },
          { label: 'onMarkerClick(targetId) fires' },
          { label: 'Card scrolls into view and expands' },
          { label: 'Marker activates pulse state' },
        ]}
      />

      {/* ── Flow 5: Hover Sensor in Card → Map Highlight ── */}
      <InteractionFlowBlock
        id="flow-hover-sensor"
        title="Hover Sensor in Card → Map Highlight"
        description="Hovering a sensor row inside a detection card highlights that sensor's marker on the map."
        cardZone={
          <div
            className="overflow-hidden"
            style={{ backgroundColor: CARD_TOKENS.container.bgColor, borderRadius: CARD_TOKENS.container.borderRadius, boxShadow: ELEVATION.shadow }}
          >
            <CardSensors
              sensors={[
                { id: 'rf-01', typeLabel: 'RF Scanner', icon: Radio, distanceLabel: '1.2 km', detectedAt: '14:32:01' },
                { id: 'radar-01', typeLabel: 'Radar X-Band', icon: Activity, distanceLabel: '0.8 km', detectedAt: '14:32:05' },
              ]}
              onSensorHover={setFlow5HoveredSensor}
            />
          </div>
        }
        mapZone={
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <MapMarker
                icon={<RadarIcon size={24} outlined fill={flow5HoveredSensor === 'rf-01' ? friendlyHovered.glyphColor : friendlyDefault.glyphColor} />}
                style={flow5HoveredSensor === 'rf-01' ? friendlyHovered : friendlyDefault}
                surfaceSize={38}
                ringSize={30}
                showLabel={flow5HoveredSensor === 'rf-01'}
                label="RF Scanner"
              />
              <span className="text-xs font-medium text-n-120">rf-01</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <MapMarker
                icon={<RadarIcon size={24} outlined fill={flow5HoveredSensor === 'radar-01' ? friendlyHovered.glyphColor : friendlyDefault.glyphColor} />}
                style={flow5HoveredSensor === 'radar-01' ? friendlyHovered : friendlyDefault}
                surfaceSize={38}
                ringSize={30}
                showLabel={flow5HoveredSensor === 'radar-01'}
                label="Radar X-Band"
              />
              <span className="text-xs font-medium text-n-120">radar-01</span>
            </div>
          </div>
        }
        steps={[
          { label: 'User hovers sensor row inside detection card' },
          { label: 'onSensorHover(sensorId) fires' },
          { label: 'Sensor marker on map enters hovered state' },
        ]}
      />

    </div>
  );
}

function DeviceCardFlows() {
  const [flowHoverDeviceId, setFlowHoverDeviceId] = useState<string | null>(null);
  const [flow4Selected, setFlow4Selected] = useState(false);
  const [flow4HoveredRow, setFlow4HoveredRow] = useState<string | null>(null);
  const flow7CamPos = { x: 50, y: 70 };
  const flow7TargetPos = { x: 230, y: 70 };
  const [flow7FovTip, setFlow7FovTip] = useState({ x: 140, y: 10 });
  const [flow7Dragging, setFlow7Dragging] = useState(false);
  const flow7MapRef = useRef<HTMLDivElement>(null);

  const flow7Dx = flow7FovTip.x - flow7CamPos.x;
  const flow7Dy = flow7FovTip.y - flow7CamPos.y;
  const flow7Angle = Math.atan2(flow7Dy, flow7Dx);
  const flow7ConeLen = Math.sqrt(flow7Dx * flow7Dx + flow7Dy * flow7Dy);
  const flow7FovHalf = 30 * (Math.PI / 180);
  const flow7ConeP1 = {
    x: flow7CamPos.x + flow7ConeLen * Math.cos(flow7Angle - flow7FovHalf),
    y: flow7CamPos.y + flow7ConeLen * Math.sin(flow7Angle - flow7FovHalf),
  };
  const flow7ConeP2 = {
    x: flow7CamPos.x + flow7ConeLen * Math.cos(flow7Angle + flow7FovHalf),
    y: flow7CamPos.y + flow7ConeLen * Math.sin(flow7Angle + flow7FovHalf),
  };
  const flow7TDx = flow7TargetPos.x - flow7CamPos.x;
  const flow7TDy = flow7TargetPos.y - flow7CamPos.y;
  const flow7AngleToTarget = Math.atan2(flow7TDy, flow7TDx);
  let flow7AngleDiff = flow7AngleToTarget - flow7Angle;
  if (flow7AngleDiff > Math.PI) flow7AngleDiff -= 2 * Math.PI;
  if (flow7AngleDiff < -Math.PI) flow7AngleDiff += 2 * Math.PI;
  const flow7OnTarget = Math.abs(flow7AngleDiff) < flow7FovHalf;

  const flow7HandlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setFlow7Dragging(true);
  }, []);

  const flow7HandlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!flow7Dragging || !flow7MapRef.current) return;
    const rect = flow7MapRef.current.getBoundingClientRect();
    setFlow7FovTip({
      x: Math.max(0, Math.min(280, e.clientX - rect.left)),
      y: Math.max(0, Math.min(160, e.clientY - rect.top)),
    });
  }, [flow7Dragging]);

  const flow7HandlePointerUp = useCallback(() => {
    setFlow7Dragging(false);
  }, []);

  const [flow7Animating, setFlow7Animating] = useState(false);
  const flow7AnimRef = useRef<number>(0);

  const flow7HandlePointAt = useCallback(() => {
    const dest = { x: 230, y: 70 };
    const duration = 800;
    let start: number | null = null;

    setFlow7Animating(true);
    setFlow7Dragging(false);

    const tick = (ts: number) => {
      if (!start) start = ts;
      const t = Math.min((ts - start) / duration, 1);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      setFlow7FovTip(prev => ({
        x: prev.x + (dest.x - prev.x) * ease * 0.15,
        y: prev.y + (dest.y - prev.y) * ease * 0.15,
      }));

      if (t < 1) {
        flow7AnimRef.current = requestAnimationFrame(tick);
      } else {
        setFlow7FovTip(dest);
        setTimeout(() => {
          setFlow7FovTip({ x: 140, y: 10 });
          setFlow7Animating(false);
        }, 1500);
      }
    };

    cancelAnimationFrame(flow7AnimRef.current);
    flow7AnimRef.current = requestAnimationFrame(tick);
  }, []);

  const defaultStyle = resolveMarkerStyle('default', 'hostile');
  const hoveredStyle = resolveMarkerStyle('selected', 'hostile');
  const friendlyDefault = resolveMarkerStyle('default', 'friendly');
  const friendlyHovered = resolveMarkerStyle('hovered', 'friendly');
  const friendlySelected = resolveMarkerStyle('selected', 'friendly');

  const hoverDeviceCam1: Device = useMemo(() => ({
    id: 'CAM-HOVER-1', name: 'מצלמה PTZ-N', type: 'camera',
    lat: 32.0853, lon: 34.7818, status: 'available',
    operationalStatus: 'operational', connectionState: 'online',
    fovDeg: 120, bearingDeg: 45, Icon: CameraIcon,
  }), []);

  const hoverDeviceCam2: Device = useMemo(() => ({
    id: 'CAM-HOVER-2', name: 'מצלמה Pixelsight', type: 'camera',
    lat: 32.0891, lon: 34.7756, status: 'available',
    operationalStatus: 'operational', connectionState: 'online',
    fovDeg: 90, bearingDeg: 180, Icon: CameraIcon,
  }), []);

  const flow4DeviceCam1: Device = useMemo(() => ({
    id: 'CAM-FLOW4-1', name: 'מצלמה PTZ-N', type: 'camera',
    lat: 32.0853, lon: 34.7818, status: 'available',
    operationalStatus: 'operational', connectionState: 'online',
    fovDeg: 120, bearingDeg: 45, Icon: CameraIcon,
  }), []);

  const flow4DeviceCam2: Device = useMemo(() => ({
    id: 'CAM-FLOW4-2', name: 'מצלמה Pixelsight', type: 'camera',
    lat: 32.0891, lon: 34.7756, status: 'available',
    operationalStatus: 'operational', connectionState: 'online',
    fovDeg: 90, bearingDeg: 180, Icon: CameraIcon,
  }), []);

  const noop = useCallback(() => {}, []);
  const noopFlyTo = useCallback((_lat: number, _lon: number) => {}, []);

  return (
    <div className="space-y-8">

      {/* ── Flow: Hover Device Row → Map Highlight ── */}
      <InteractionFlowBlock
        id="flow-hover-device"
        title="Hover Device Row → Map Highlight"
        description="Hovering a device row in the DevicesPanel highlights the corresponding asset marker on the map with a static inner glow."
        cardZone={
          <div className="overflow-hidden" style={{ backgroundColor: 'rgb(9,9,11)', borderRadius: CARD_TOKENS.container.borderRadius }}>
            <div dir="rtl" className="px-4 py-1.5 text-xs font-normal uppercase tracking-wider text-white border-b border-white/5 bg-white/5">
              מצלמות (2)
            </div>
            <DeviceRow
              device={hoverDeviceCam1}
              isExpanded={false}
              onToggle={noop}
              onHover={(id) => setFlowHoverDeviceId(id)}
              onFlyTo={noopFlyTo}
            />
            <DeviceRow
              device={hoverDeviceCam2}
              isExpanded={false}
              onToggle={noop}
              onHover={(id) => setFlowHoverDeviceId(id)}
              onFlyTo={noopFlyTo}
            />
          </div>
        }
        mapZone={
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <MapMarker
                icon={<CameraIcon size={24} outlined fill={flowHoverDeviceId === hoverDeviceCam1.id ? friendlyHovered.glyphColor : friendlyDefault.glyphColor} />}
                style={flowHoverDeviceId === hoverDeviceCam1.id ? friendlyHovered : friendlyDefault}
                surfaceSize={38}
                ringSize={30}
              />
              <span className="text-xs font-medium text-n-120">PTZ-N</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <MapMarker
                icon={<CameraIcon size={24} outlined fill={flowHoverDeviceId === hoverDeviceCam2.id ? friendlyHovered.glyphColor : friendlyDefault.glyphColor} />}
                style={flowHoverDeviceId === hoverDeviceCam2.id ? friendlyHovered : friendlyDefault}
                surfaceSize={38}
                ringSize={30}
              />
              <span className="text-xs font-medium text-n-120">Pixelsight</span>
            </div>
          </div>
        }
        steps={[
          { label: 'User hovers a device row in DevicesPanel' },
          { label: 'onDeviceHover(deviceId) fires' },
          { label: 'Map asset marker resolves to hovered state' },
          { label: 'Mouse leaves → marker returns to default' },
        ]}
      />

      {/* ── Flow 4: Click Asset Icon → Open Device Panel ── */}
      <InteractionFlowBlock
        id="flow-click-asset"
        mapInteractive
        title="Click Asset Icon → Open Device Panel"
        description="Clicking a sensor, effector, or launcher icon on the map opens the DevicesPanel with that device focused. Hovering a row highlights the marker."
        cardZone={
          <div className="overflow-hidden" style={{ backgroundColor: 'rgb(9,9,11)', borderRadius: CARD_TOKENS.container.borderRadius }}>
            <div dir="rtl" className="px-4 py-1.5 text-xs font-normal uppercase tracking-wider text-white border-b border-white/5 bg-white/5">
              מצלמות (2)
            </div>
            <DeviceRow
              device={flow4DeviceCam1}
              isExpanded={flow4Selected}
              onToggle={() => setFlow4Selected(prev => !prev)}
              onHover={(id) => setFlow4HoveredRow(id)}
              onFlyTo={noopFlyTo}
            />
            <DeviceRow
              device={flow4DeviceCam2}
              isExpanded={false}
              onToggle={noop}
              onHover={(id) => setFlow4HoveredRow(id)}
              onFlyTo={noopFlyTo}
            />
          </div>
        }
        mapZone={
          <div className="flex items-center gap-6">
            <div
              className="flex flex-col items-center gap-2 cursor-pointer"
              onClick={() => setFlow4Selected(prev => !prev)}
            >
              <MapMarker
                icon={<CameraIcon size={24} outlined fill={flow4Selected || flow4HoveredRow === flow4DeviceCam1.id ? friendlySelected.glyphColor : friendlyDefault.glyphColor} />}
                style={flow4Selected || flow4HoveredRow === flow4DeviceCam1.id ? friendlySelected : friendlyDefault}
                surfaceSize={38}
                ringSize={30}
                pulse={flow4Selected}
              />
              <span className="text-xs font-medium text-n-9">PTZ-N</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <MapMarker
                icon={<CameraIcon size={24} outlined fill={flow4HoveredRow === flow4DeviceCam2.id ? friendlyHovered.glyphColor : friendlyDefault.glyphColor} />}
                style={flow4HoveredRow === flow4DeviceCam2.id ? friendlyHovered : friendlyDefault}
                surfaceSize={38}
                ringSize={30}
              />
              <span className="text-xs font-medium text-n-120">Pixelsight</span>
            </div>
          </div>
        }
        steps={[
          { label: 'User clicks sensor/effector icon on map' },
          { label: 'onAssetClick(assetId) fires' },
          { label: 'Device card focused' },
          { label: 'Asset marker shown as selected' },
        ]}
      />

      {/* ── Flow 7: Camera Look-At ── */}
      <InteractionFlowBlock
        id="flow-camera-lookat"
        mapInteractive
        title="Camera Look-At"
        description="Drag the FOV cone tip to aim the camera. When the cone covers the target the marker activates."
        cardZone={
          <div className="overflow-hidden" style={{ backgroundColor: 'rgb(9,9,11)', borderRadius: CARD_TOKENS.container.borderRadius }}>
            <div dir="rtl" className="px-4 py-1.5 text-xs font-normal uppercase tracking-wider text-white border-b border-white/5 bg-white/5">
              מצלמות (1)
            </div>

            <div dir="rtl" className="flex items-center gap-2.5 px-4 py-2.5 text-right border-b border-white/[0.06] bg-white/[0.04]">
              <div className="relative w-8 h-8 rounded flex items-center justify-center shrink-0 bg-white/10">
                <CameraIcon size={20} fill="white" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-n-10 block truncate">מצלמה PTZ-N</span>
                <div className="text-xs font-mono tabular-nums text-white/50 truncate">
                  כיוון {Math.round((flow7Angle * 180) / Math.PI + 90)}° · שדה ראייה 60°
                </div>
              </div>
            </div>

            <div dir="rtl" className="px-4 py-3 flex items-center gap-3">
              <ActionButton
                label="הפנה מצלמה"
                icon={Camera}
                variant="fill"
                size="md"
                onClick={flow7HandlePointAt}
                disabled={flow7OnTarget || flow7Animating}
                loading={flow7Animating}
              />
              <span className="text-xs text-n-120">
                {flow7Animating ? 'מסתובבת...' : flow7OnTarget ? 'מכוון לעבר המטרה' : 'גרור את הקונוס או לחץ'}
              </span>
            </div>
          </div>
        }
        mapZone={
          <div
            ref={flow7MapRef}
            className="relative select-none"
            style={{ width: 280, height: 160, cursor: flow7Dragging ? 'grabbing' : undefined }}
            onPointerMove={flow7HandlePointerMove}
            onPointerUp={flow7HandlePointerUp}
          >
            {/* FOV cone */}
            <svg
              width="280"
              height="160"
              viewBox="0 0 280 160"
              fill="none"
              className="absolute inset-0"
              style={{ pointerEvents: 'none' }}
            >
              <path
                d={`M${flow7CamPos.x} ${flow7CamPos.y} L${flow7ConeP1.x} ${flow7ConeP1.y} L${flow7ConeP2.x} ${flow7ConeP2.y} Z`}
                fill={flow7OnTarget ? 'rgba(56,189,248,0.14)' : 'rgba(56,189,248,0.06)'}
                stroke={flow7OnTarget ? 'rgba(56,189,248,0.5)' : 'rgba(56,189,248,0.25)'}
                strokeWidth="1"
              />
              <line
                x1={flow7CamPos.x} y1={flow7CamPos.y}
                x2={flow7FovTip.x} y2={flow7FovTip.y}
                stroke="rgba(56,189,248,0.2)"
                strokeWidth="1"
                strokeDasharray="4 3"
              />
            </svg>

            {/* Drag handle at cone tip */}
            <div
              className="absolute z-10 flex items-center justify-center"
              style={{
                left: flow7FovTip.x,
                top: flow7FovTip.y,
                transform: 'translate(-50%, -50%)',
                width: 18,
                height: 18,
                cursor: flow7Dragging ? 'grabbing' : 'grab',
                touchAction: 'none',
              }}
              onPointerDown={flow7HandlePointerDown}
            >
              <div
                className="rounded-full border-2 border-sky-400"
                style={{
                  width: 10,
                  height: 10,
                  background: flow7Dragging ? 'rgba(56,189,248,0.6)' : 'rgba(56,189,248,0.3)',
                  boxShadow: '0 0 6px rgba(56,189,248,0.4)',
                }}
              />
            </div>

            {/* Camera marker — fixed */}
            <div className="absolute" style={{ left: flow7CamPos.x, top: flow7CamPos.y, transform: 'translate(-50%, -50%)' }}>
              <MapMarker
                icon={<CameraIcon size={24} outlined fill={friendlyDefault.glyphColor} />}
                style={friendlyDefault}
                surfaceSize={38}
                ringSize={30}
              />
            </div>
            <span className="absolute text-xs font-medium text-n-120" style={{ left: flow7CamPos.x, top: flow7CamPos.y + 28, transform: 'translateX(-50%)' }}>Camera</span>

            {/* Target marker — fixed */}
            <div className="absolute" style={{ left: flow7TargetPos.x, top: flow7TargetPos.y, transform: 'translate(-50%, -50%)' }}>
              <MapMarker
                icon={<SensorIcon size={24} outlined fill={flow7OnTarget ? hoveredStyle.glyphColor : defaultStyle.glyphColor} />}
                style={flow7OnTarget ? hoveredStyle : defaultStyle}
                surfaceSize={36}
                ringSize={28}
                pulse={flow7OnTarget}
              />
            </div>
            <span className="absolute text-xs font-medium text-n-120" style={{ left: flow7TargetPos.x, top: flow7TargetPos.y + 28, transform: 'translateX(-50%)' }}>Target</span>
          </div>
        }
        steps={[
          { label: 'User clicks "Point Camera" action' },
          { label: 'onCameraLookAt fires' },
          { label: 'Camera FOV cone on map rotates toward target bearing' },
          { label: 'Target marker activates when inside FOV' },
        ]}
      />

    </div>
  );
}

function InlineCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? 'Copied' : 'Copy code'}
      className="p-1.5 rounded cursor-pointer text-n-7 hover:text-n-10 hover:bg-state-hover-overlay active:scale-[0.98] transition-[color,background-color,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring"
    >
      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
    </button>
  );
}

function ChangelogLine({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('`') && part.endsWith('`') ? (
          <code key={i} className="text-sm font-mono text-sky-300/80 bg-white/[0.04] px-1.5 py-0.5 rounded">
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function QuickStartCodeBlock({ code }: { code: string }) {
  const clean = useMemo(() => stripCodeComments(code, 'tsx'), [code]);
  return (
    <div className="flex items-start rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.06)] overflow-hidden" style={{ backgroundColor: SURFACE.level0 }}>
      <div className="flex-1 min-w-0 px-4 py-3 overflow-x-auto">
        <HighlightedCode code={code} />
      </div>
      <div className="shrink-0 pt-2 pr-2">
        <InlineCopyButton text={clean} />
      </div>
    </div>
  );
}

function UsageBlock({ code, name }: { code: string; name: string }) {
  const snippet = useMemo(() => {
    const exportMatch = code.match(/export\s+(?:function|const)\s+(\w+)/);
    const componentName = exportMatch?.[1] ?? name;

    const propsBlock = extractPropsInterface(code);
    if (!propsBlock) return `<${componentName} />`;

    const lines = propsBlock.split('\n').map(l => l.trim()).filter(Boolean);
    const requiredProps: string[] = [];
    for (const line of lines) {
      if (line.startsWith('//') || line.startsWith('/*')) continue;
      const propMatch = line.match(/^(\w+)(\?)?:\s*(.*?)(?:;|$)/);
      if (propMatch && !propMatch[2]) {
        const propName = propMatch[1];
        const propType = propMatch[3].trim();
        if (propName === 'children') continue;
        let value: string;
        if (propType.includes('string')) value = `"..."`;
        else if (propType.includes('boolean')) value = '';
        else if (propType.includes('number')) value = `{0}`;
        else if (propType === 'ReactNode' || propType === 'React.ReactNode') value = `{...}`;
        else if (propType.includes('=>') || propType.includes('Function')) value = `{() => {}}`;
        else if (propType.includes('ElementType') || propType.includes('FC') || propType.includes('ComponentType')) value = `{Icon}`;
        else value = `{...}`;

        requiredProps.push(value ? `${propName}=${value}` : propName);
      }
    }

    if (requiredProps.length === 0) return `<${componentName} />`;
    if (requiredProps.length <= 2) return `<${componentName} ${requiredProps.join(' ')} />`;
    return `<${componentName}\n  ${requiredProps.join('\n  ')}\n/>`;
  }, [code, name]);

  return (
    <div className="flex items-start rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.06)] overflow-hidden" style={{ backgroundColor: SURFACE.level0 }}>
      <div className="flex-1 min-w-0 px-4 py-3 overflow-x-auto">
        <HighlightedCode code={snippet} />
      </div>
      <div className="shrink-0 pt-2.5 pr-2">
        <InlineCopyButton text={snippet} />
      </div>
    </div>
  );
}

// ─── Syntax highlighting ──────────────────────────────────────────────────────

type Highlighter = Awaited<ReturnType<typeof import('shiki')['createHighlighter']>>;

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki').then(({ createHighlighter }) =>
      createHighlighter({ themes: [winterTheme as Parameters<typeof createHighlighter>[0]['themes'][number]], langs: ['tsx'] }),
    );
  }
  return highlighterPromise;
}

function HighlightedCode({ code }: { code: string }) {
  const [html, setHtml] = useState<string | null>(null);
  // Styleguide previews render comment-free code.
  const clean = useMemo(() => stripCodeComments(code, 'tsx'), [code]);

  useEffect(() => {
    let cancelled = false;
    getHighlighter().then((highlighter) => {
      if (cancelled) return;
      setHtml(
        highlighter.codeToHtml(clean, {
          lang: 'tsx',
          theme: 'winter-is-coming-dark-blue',
        }),
      );
    });
    return () => { cancelled = true; };
  }, [clean]);

  if (!html) {
    return (
      <pre className="text-xs leading-[1.7] font-mono text-n-10 whitespace-pre">
        {clean}
      </pre>
    );
  }

  return (
    <div
      className="[&_pre]:!bg-transparent [&_pre]:text-xs [&_pre]:leading-[1.7] [&_pre]:font-mono [&_pre]:font-medium [&_code]:font-mono [&_code]:font-medium"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}


// ─── LLM markdown generation ──────────────────────────────────────────────────

function extractPropsInterface(source: string): string | null {
  const fnMatch = source.match(/export\s+function\s+\w+\(\{[^}]*\}:\s*\{([\s\S]*?)\}\s*\)/);
  if (fnMatch) return fnMatch[1].trim();

  const interfaceMatch = source.match(/(?:export\s+)?interface\s+\w+Props\s*\{([\s\S]*?)\}/);
  if (interfaceMatch) return interfaceMatch[1].trim();

  const typeMatch = source.match(/(?:export\s+)?type\s+\w+Props\s*=\s*\{([\s\S]*?)\}/);
  if (typeMatch) return typeMatch[1].trim();

  return null;
}

// ─── Code preview (design-system ComponentPreview) ────────────────────────────

/**
 * Thin adapter over the design-system {@link ComponentPreview}: live preview on
 * top, a Base UI-style tabbed source panel below. The component source is the
 * first tab (`<Name>.tsx`); any `relatedFiles` (tokens, helpers, css) follow as
 * sibling tabs so a developer can read every dependency in one place. `name`
 * and `description` are also rendered by the section heading; `tight` is kept in
 * the signature so existing call sites compile unchanged.
 */
function CodePreviewBlock(props: {
  name: string;
  description: string;
  code: string;
  children?: React.ReactNode;
  tight?: boolean;
  relatedFiles?: RelatedFile[];
}) {
  return <ComponentPreview code={props.code} render={() => props.children} />;
}

function CopyIcon({ copied }: { copied: boolean }) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={copied ? 'check' : 'copy'}
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
        transition={{ type: 'spring', duration: 0.2, bounce: 0 }}
        className="flex items-center justify-center"
      >
        {copied
          ? <Check size={14} className="text-emerald-400" />
          : <Copy size={14} className="text-white/90" />}
      </motion.span>
    </AnimatePresence>
  );
}


function VariantGrid({ entries, renderSample }: {
  entries: { key: string; usage?: string }[];
  renderSample: (key: string) => React.ReactNode;
}) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
      {entries.map(({ key, usage }) => (
        <div key={key} className="flex flex-col items-center gap-2 rounded-lg p-3" style={{ backgroundColor: SURFACE.level1 }}>
          {renderSample(key)}
          <span className="text-xs font-mono text-n-10">{key}</span>
          {usage && <span className="text-xs text-n-120 text-center leading-tight">{usage}</span>}
        </div>
      ))}
    </div>
  );
}

// ── Video HUD handoff primitives ───────────────────────────────────────────────

/**
 * A dark, faintly-lit "video frame" so the dark-glass HUD pills read against a
 * realistic backdrop (a flat panel makes `backdrop-blur` invisible). LTR-locked
 * because the live feed chrome is LTR even under the RTL app shell.
 */
function HudStage({
  children,
  center = false,
  height = 150,
  className = '',
}: {
  children: React.ReactNode;
  center?: boolean;
  height?: number;
  className?: string;
}) {
  return (
    <div
      dir="ltr"
      className={`relative w-full max-w-2xl overflow-hidden rounded-lg ring-1 ring-inset ring-white/10 ${className}`}
      style={{
        height,
        backgroundImage:
          'radial-gradient(130% 130% at 25% 15%, #2a3a4d 0%, #131c27 55%, #05080d 100%)',
      }}
    >
      {center ? (
        <div className="flex h-full w-full items-center justify-center">{children}</div>
      ) : (
        children
      )}
    </div>
  );
}

/**
 * Per-element "class recipe": the exact Tailwind className string behind each
 * part of a component, each with a one-click copy. This is the developer's
 * fast path to lift the styling without reading the whole source.
 */
function ClassNameRecipe({
  entries,
}: {
  entries: { label: string; className: string; note?: string }[];
}) {
  return (
    <div
      className="overflow-hidden rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
      style={{ backgroundColor: SURFACE.level0 }}
    >
      {entries.map((e, i) => (
        <div
          key={e.label}
          className={`flex items-start gap-3 px-4 py-3 ${i > 0 ? 'border-t border-white/[0.06]' : ''}`}
        >
          <div className="w-36 shrink-0 pt-0.5">
            <div className="text-xs font-medium text-n-11">{e.label}</div>
            {e.note && <div className="mt-0.5 text-xs-plus leading-snug text-n-9">{e.note}</div>}
          </div>
          <code
            dir="ltr"
            className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-[rgba(158,158,158,0.8)]"
          >
            {e.className}
          </code>
          <div className="shrink-0">
            <InlineCopyButton text={e.className} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Video HUD handoff sections ─────────────────────────────────────────────────

function HudDeviceSelectSection() {
  const [value, setValue] = useState('PTH-01');
  return (
    <ComponentSection
      id="hud-device-select"
      name="SandboxDeviceSelect"
      description="Dark-glass HUD device switcher. A dropdown pill that lives in the video's top-left corner; choosing a device reconfigures the surrounding HUD. Generic over a device list, rendered with the project's real asset glyphs."
    >
      <CodePreviewBlock
        name="SandboxDeviceSelect"
        description="Glass dropdown pill with real asset glyphs and a check on the active row."
        code={sandboxDeviceSelectSrc}
      >
        <HudStage center>
          <SandboxDeviceSelect devices={HUD_DEVICES} value={value} onChange={setValue} />
        </HudStage>
      </CodePreviewBlock>

      <SectionHeading>Usage</SectionHeading>
      <UsageBlock code={sandboxDeviceSelectSrc} name="SandboxDeviceSelect" />

      <SectionHeading>States</SectionHeading>
      <ExampleBlock title="Disabled">
        <HudStage center height={120}>
          <SandboxDeviceSelect devices={HUD_DEVICES} value="DRN-01" onChange={noop} disabled />
        </HudStage>
      </ExampleBlock>
      <ExampleBlock title="Glass tuning — default 0.4 / 4px vs. the live video's 0.2 / 1px">
        <HudStage center height={120}>
          <div className="flex items-center gap-6">
            <SandboxDeviceSelect devices={HUD_DEVICES} value="CAM-01" onChange={noop} />
            <SandboxDeviceSelect devices={HUD_DEVICES} value="CAM-01" onChange={noop} bgOpacity={0.2} blurPx={1} />
          </div>
        </HudStage>
      </ExampleBlock>

      <SectionHeading>Class recipe</SectionHeading>
      <ClassNameRecipe
        entries={[
          {
            label: 'Trigger pill',
            note: 'glass via inline style',
            className:
              'group inline-flex h-8 items-center gap-1.5 rounded-full border border-border-default/45 ps-2.5 pe-2 text-xs-plus text-slate-12',
          },
          {
            label: 'Menu content',
            className:
              'min-w-[11rem] rounded border-none bg-surface-2/95 p-1 text-slate-12 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.6)]',
          },
          {
            label: 'Radio item',
            note: 'drops the built-in dot',
            className:
              'gap-2.5 rounded-md py-1.5 ps-2.5 pe-2.5 text-xs focus:bg-white/10 focus:text-slate-12 [&>span:first-child]:hidden',
          },
          { label: 'Focus ring', className: HUD_FOCUS_RING },
        ]}
      />
    </ComponentSection>
  );
}

function HudAngleToggleSection() {
  const [value, setValue] = useState<PathfinderCameraAngle>('straight');
  return (
    <ComponentSection
      id="hud-angle-toggle"
      name="SandboxAngleToggle"
      description="Pathfinder camera-angle control — a segmented spring-thumb toggle. Three framing presets aim the camera at +45° / 0° / −45°; segments show only the degree, and hover/focus reveals a tooltip with the matching rotated arrow."
    >
      <CodePreviewBlock
        name="SandboxAngleToggle"
        description="Segmented spring-thumb toggle with degree readout + arrow tooltip."
        code={sandboxAngleToggleSrc}
        relatedFiles={[GLASS_FILE]}
      >
        <HudStage center>
          <SandboxAngleToggle value={value} onChange={setValue} />
        </HudStage>
      </CodePreviewBlock>

      <SectionHeading>Usage</SectionHeading>
      <UsageBlock code={sandboxAngleToggleSrc} name="SandboxAngleToggle" />

      <SectionHeading>States</SectionHeading>
      <ExampleBlock title="Presets — Front (+45°) · Straight (0°) · Down (−45°)">
        <HudStage center height={120}>
          <div className="flex items-center gap-6">
            <SandboxAngleToggle value="front" onChange={noop} />
            <SandboxAngleToggle value="straight" onChange={noop} />
            <SandboxAngleToggle value="down" onChange={noop} />
          </div>
        </HudStage>
      </ExampleBlock>
      <ExampleBlock title="Disabled">
        <HudStage center height={120}>
          <SandboxAngleToggle value="straight" onChange={noop} disabled />
        </HudStage>
      </ExampleBlock>

      <SectionHeading>Class recipe</SectionHeading>
      <ClassNameRecipe
        entries={[
          {
            label: 'Container',
            note: 'role=radiogroup',
            className:
              'relative inline-flex h-9 items-center justify-start rounded-full border border-border-default/45 p-0.5',
          },
          {
            label: 'Spring thumb',
            className:
              'absolute left-0.5 top-0.5 flex h-[30px] items-center justify-center rounded-full bg-state-selected font-sans text-xs font-semibold tabular-nums text-slate-12',
          },
          {
            label: 'Segment',
            className:
              'relative z-10 flex h-7 items-center justify-center rounded-full font-sans text-xs font-semibold tabular-nums transition-colors duration-150',
          },
          { label: 'Focus ring', className: HUD_FOCUS_RING },
        ]}
      />
    </ComponentSection>
  );
}

function HudConnectivityBadgeSection() {
  return (
    <ComponentSection
      id="hud-connectivity"
      name="DeviceConnectivityBadge"
      description="Top-right HUD chip for the active video source: real asset glyph, short label, and a coloured link-status dot. Releasing control flips it to amber 'Manual'. Self-positions absolute inside the nearest relative video frame."
    >
      <CodePreviewBlock
        name="DeviceConnectivityBadge"
        description="Glass source chip with a coloured link-status dot + hover label."
        code={deviceConnectivityBadgeSrc}
        relatedFiles={[GLASS_FILE]}
      >
        <HudStage>
          <DeviceConnectivityBadge />
        </HudStage>
      </CodePreviewBlock>

      <SectionHeading>Usage</SectionHeading>
      <UsageBlock code={deviceConnectivityBadgeSrc} name="DeviceConnectivityBadge" />

      <SectionHeading>States</SectionHeading>
      <ExampleBlock title="Link status — Online · Degraded · Offline · Manual">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <HudStage height={110}>
            <DeviceConnectivityBadge source={{ id: 'CAM-01', short: 'EO/IR', name: 'CAM-01', role: 'EO/IR Camera', kind: 'camera', signalPct: 88, status: 'online' }} />
            <span className="absolute bottom-2 left-3 text-xs-plus text-white/45">Online</span>
          </HudStage>
          <HudStage height={110}>
            <DeviceConnectivityBadge source={{ id: 'CAM-01', short: 'EO/IR', name: 'CAM-01', role: 'EO/IR Camera', kind: 'camera', signalPct: 54, status: 'degraded' }} />
            <span className="absolute bottom-2 left-3 text-xs-plus text-white/45">Degraded</span>
          </HudStage>
          <HudStage height={110}>
            <DeviceConnectivityBadge source={{ id: 'CAM-01', short: 'EO/IR', name: 'CAM-01', role: 'EO/IR Camera', kind: 'camera', signalPct: 0, status: 'offline' }} />
            <span className="absolute bottom-2 left-3 text-xs-plus text-white/45">Offline</span>
          </HudStage>
          <HudStage height={110}>
            <DeviceConnectivityBadge manual />
            <span className="absolute bottom-2 left-3 text-xs-plus text-white/45">Manual (control released)</span>
          </HudStage>
        </div>
      </ExampleBlock>
      <ExampleBlock title="Radar source">
        <HudStage height={110}>
          <DeviceConnectivityBadge source={{ id: 'RAD-02', short: 'RADAR', name: 'RAD-02', role: 'Surveillance Radar', kind: 'radar', signalPct: 80, status: 'online' }} />
        </HudStage>
      </ExampleBlock>

      <SectionHeading>Class recipe</SectionHeading>
      <ClassNameRecipe
        entries={[
          {
            label: 'Position wrapper',
            note: 'needs a relative parent',
            className: 'pointer-events-none absolute right-3 top-3 z-30',
          },
          {
            label: 'Chip',
            note: 'glass via inline style',
            className:
              'pointer-events-auto inline-flex h-8 items-center gap-1.5 rounded-full border border-border-default/45 px-2.5 text-xs-plus text-slate-12',
          },
          {
            label: 'Status dot',
            note: 'online / degraded / offline',
            className: 'size-1.5 shrink-0 rounded-full bg-accent-success',
          },
        ]}
      />
    </ComponentSection>
  );
}

function HudDayNightSection() {
  const [mode, setMode] = useState<DayNightMode>('day');
  return (
    <ComponentSection
      id="hud-day-night"
      name="DayNightSpringToggle"
      description="Day/Night view-mode control — a spring-driven thumb that slides between the Sun and Moon stops. Filled glyphs, reduced-motion safe, and Base UI-style grouped tooltips (the first waits, adjacent ones open instantly)."
    >
      <CodePreviewBlock
        name="DayNightSpringToggle"
        description="Binary spring-thumb toggle with filled Sun/Moon glyphs."
        code={dayNightSpringToggleSrc}
        relatedFiles={[GLASS_FILE]}
      >
        <HudStage center>
          <DayNightSpringToggle mode={mode} onToggle={() => setMode((m) => (m === 'day' ? 'night' : 'day'))} />
        </HudStage>
      </CodePreviewBlock>

      <SectionHeading>Usage</SectionHeading>
      <UsageBlock code={dayNightSpringToggleSrc} name="DayNightSpringToggle" />

      <SectionHeading>States</SectionHeading>
      <ExampleBlock title="Stops — Day · Night">
        <HudStage center height={120}>
          <div className="flex items-center gap-6">
            <DayNightSpringToggle mode="day" onToggle={noop} />
            <DayNightSpringToggle mode="night" onToggle={noop} />
          </div>
        </HudStage>
      </ExampleBlock>
      <ExampleBlock title="Disabled">
        <HudStage center height={120}>
          <DayNightSpringToggle mode="day" onToggle={noop} disabled />
        </HudStage>
      </ExampleBlock>

      <SectionHeading>Class recipe</SectionHeading>
      <ClassNameRecipe
        entries={[
          {
            label: 'Container',
            note: 'role=radiogroup',
            className: 'relative inline-flex h-9 items-center rounded-full border border-border-default/45 p-0.5',
          },
          {
            label: 'Spring thumb',
            className:
              'absolute left-0.5 top-0.5 flex size-[30px] items-center justify-center rounded-full bg-state-selected text-slate-12',
          },
          {
            label: 'Segment',
            className: 'relative z-10 flex size-7 items-center justify-center rounded-full transition-colors duration-150',
          },
          { label: 'Focus ring', className: HUD_FOCUS_RING },
        ]}
      />
    </ComponentSection>
  );
}

function HudContextMenuSection() {
  return (
    <ComponentSection
      id="hud-context-menu"
      name="SandboxVideoContextMenu"
      description="Right-click menu for the video feed, mirroring the map's point-context menu: a copyable coordinate/altitude readout, a 'look at point' slew action, and a 'create target' action. RTL menu with the numeric readout pinned LTR."
    >
      <CodePreviewBlock
        name="SandboxVideoContextMenu"
        description="Right-click the frame to open the coordinate / look-at / create-target menu."
        code={sandboxVideoContextMenuSrc}
      >
        <HudStage height={180}>
          <SandboxVideoContextMenu
            coordinates="688180 / 3593940"
            altitude="45 m"
            lookAtLabel="הסתכל לנקודה"
            createTargetLabel="Create target"
          >
            <div className="grid h-full w-full select-none place-items-center text-sm text-white/55">
              Right-click anywhere
            </div>
          </SandboxVideoContextMenu>
        </HudStage>
      </CodePreviewBlock>

      <SectionHeading>Usage</SectionHeading>
      <UsageBlock code={sandboxVideoContextMenuSrc} name="SandboxVideoContextMenu" />

      <SectionHeading>Examples</SectionHeading>
      <ExampleBlock title="English labels">
        <HudStage height={180}>
          <SandboxVideoContextMenu
            coordinates="688180 / 3593940"
            altitude="45 m"
            lookAtLabel="Look at point"
            createTargetLabel="Create target"
          >
            <div className="grid h-full w-full select-none place-items-center text-sm text-white/55">
              Right-click anywhere
            </div>
          </SandboxVideoContextMenu>
        </HudStage>
      </ExampleBlock>

      <SectionHeading>Class recipe</SectionHeading>
      <ClassNameRecipe
        entries={[
          {
            label: 'Content',
            note: 'glass + shadow from the shared ContextMenu primitive',
            className: 'min-w-[220px]',
          },
          {
            label: 'Coordinate item',
            note: 'click to copy "x / y | altitude"',
            className: 'gap-2.5 text-sm-minus font-mono tabular-nums',
          },
          { label: 'Action item', className: 'gap-2.5 text-sm-minus' },
        ]}
      />
    </ComponentSection>
  );
}

const HUD_RANGE_INPUT =
  'h-1 w-48 cursor-pointer appearance-none rounded-full bg-state-hover-strong accent-accent-info [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-12';

function HudDemoSlider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (next: number) => void;
}) {
  return (
    <label dir="ltr" className="flex items-center gap-3 text-xs">
      <span className="w-12 font-mono uppercase tracking-[0.12em] text-n-9">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={label}
        className={HUD_RANGE_INPUT}
      />
      <span className="w-16 text-end font-mono tabular-nums text-n-11">
        {value}
        {suffix}
      </span>
    </label>
  );
}

const HUD_DETECTIONS: DetectionBox[] = [
  { id: 'det-1', x: 0.3, y: 0.4, w: 0.12, h: 0.18, label: 'Person', confidence: 0.92 },
  { id: 'det-2', x: 0.58, y: 0.34, w: 0.16, h: 0.12, label: 'Vehicle', confidence: 0.78 },
  { id: 'det-3', x: 0.16, y: 0.62, w: 0.1, h: 0.1, label: 'Person', confidence: 0.65 },
];

function HudSetpointRailSection() {
  const [altitude, setAltitude] = useState(140);
  const [speed, setSpeed] = useState(10);
  return (
    <ComponentSection
      id="hud-setpoint-rail"
      name="SandboxSetpointRail"
      description="Left-edge altitude & speed setpoint sliders for airborne assets. Collapsed, it shows live read-outs; on hover/focus it expands to vertical sliders with chevron steppers and click-to-edit value chips. A live tick trails the commanded target so the closing gap stays visible."
    >
      <CodePreviewBlock
        name="SandboxSetpointRail"
        description="Hover the left edge to expand the altitude / speed sliders, then drag, step, or click a value to edit."
        code={sandboxSetpointRailSrc}
      >
        <HudStage height={400}>
          <SandboxSetpointRail
            altitudeM={120}
            velocityMps={8.5}
            batteryPct={74}
            targetAltitudeM={altitude}
            targetVelocityMps={speed}
            disabled={false}
            design="tube-chips"
            onTargetAltitudeChange={setAltitude}
            onTargetVelocityChange={setSpeed}
          />
        </HudStage>
      </CodePreviewBlock>

      <SectionHeading>Usage</SectionHeading>
      <UsageBlock code={sandboxSetpointRailSrc} name="SandboxSetpointRail" />

      <SectionHeading>States</SectionHeading>
      <ExampleBlock title="Expanded (pending target) vs. disabled (no control)">
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          <HudStage height={320}>
            <SandboxSetpointRail
              altitudeM={120}
              velocityMps={8.5}
              batteryPct={74}
              targetAltitudeM={170}
              targetVelocityMps={14}
              disabled={false}
              forceExpanded
              design="tube-chips"
              onTargetAltitudeChange={noop}
              onTargetVelocityChange={noop}
            />
          </HudStage>
          <HudStage height={320}>
            <SandboxSetpointRail
              altitudeM={120}
              velocityMps={8.5}
              batteryPct={74}
              targetAltitudeM={140}
              targetVelocityMps={10}
              disabled
              design="tube-chips"
              onTargetAltitudeChange={noop}
              onTargetVelocityChange={noop}
            />
          </HudStage>
        </div>
      </ExampleBlock>
      <SectionHeading>Class recipe</SectionHeading>
      <ClassNameRecipe
        entries={[
          {
            label: 'Rail container',
            note: 'needs a relative parent',
            className:
              'pointer-events-none absolute z-20 inset-y-0 left-0 h-full transition-opacity duration-150',
          },
          {
            label: 'Lane',
            note: 'one per setpoint',
            className: 'flex w-[64px] shrink-0 flex-col items-center gap-1',
          },
          {
            label: 'Idle read-out',
            note: 'collapsed value',
            className:
              'mt-1.5 block whitespace-nowrap font-mono text-xl leading-none tabular-nums text-slate-12',
          },
          {
            label: 'Chevron stepper',
            className:
              'flex h-5 w-7 items-center justify-center transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97] disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-strong',
          },
          {
            label: 'Value chip',
            note: 'recessed "well"',
            className:
              'ring-1 ring-inset ring-border-default bg-surface-void/30 shadow-[inset_0_0_4px_0_rgba(0,0,0,0.2)] backdrop-blur-md hover:ring-border-strong',
          },
        ]}
      />
    </ComponentSection>
  );
}

function HudCompassStripSection() {
  const [bearing, setBearing] = useState(42);
  return (
    <ComponentSection
      id="hud-compass-strip"
      name="CameraCompassStrip"
      description="The video HUD's top heading strip — a Call of Duty: Warzone-style horizontal compass pinned center-top of the feed (via CameraTopHud). Cardinals and 5° ticks scroll horizontally as the camera bearing changes; the fixed yellow marker + degrees readout show the current heading. North is tinted red."
    >
      <CodePreviewBlock
        name="CameraCompassStrip"
        description="Drag to change the camera bearing; the strip scrolls and the degrees readout follows."
        code={cameraCompassStripSrc}
      >
        <div className="w-full space-y-4">
          <HudStage height={160} center>
            <CameraCompassStrip bearingDeg={bearing} className="pointer-events-none" />
          </HudStage>
          <HudDemoSlider label="Bearing" value={bearing} min={0} max={359} suffix="°" onChange={setBearing} />
        </div>
      </CodePreviewBlock>

      <SectionHeading>Usage</SectionHeading>
      <UsageBlock code={cameraCompassStripSrc} name="CameraCompassStrip" />

      <SectionHeading>States</SectionHeading>
      <ExampleBlock title="Cardinals — N · E · S · W">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HudStage height={140} center>
            <CameraCompassStrip bearingDeg={0} className="pointer-events-none" />
          </HudStage>
          <HudStage height={140} center>
            <CameraCompassStrip bearingDeg={90} className="pointer-events-none" />
          </HudStage>
          <HudStage height={140} center>
            <CameraCompassStrip bearingDeg={180} className="pointer-events-none" />
          </HudStage>
          <HudStage height={140} center>
            <CameraCompassStrip bearingDeg={270} className="pointer-events-none" />
          </HudStage>
        </div>
      </ExampleBlock>

      <SectionHeading>Class recipe</SectionHeading>
      <ClassNameRecipe
        entries={[
          {
            label: 'Wrapper',
            note: 'fixed width via inline style',
            className: 'block',
          },
          {
            label: 'Degrees readout',
            note: 'amber + drop-shadow inline',
            className:
              'text-center font-mono text-xl leading-none tracking-tight tabular-nums mt-0.5',
          },
          {
            label: 'Ticks & cardinals',
            note: 'SVG strokes / fills, not classes',
            className:
              'stroke rgba(255,255,255,0.18→0.55) · marker fill #fde047 · N fill #fca5a5',
          },
        ]}
      />
    </ComponentSection>
  );
}

function HudSlewCueSection() {
  const [delta, setDelta] = useState(12);
  return (
    <ComponentSection
      id="hud-slew-cue"
      name="CameraSlewCue"
      description="Slew visualization for left/right camera movement. While the camera trails a commanded bearing, a dashed amber guide is drawn from frame center toward the commanded direction and the crosshair rides along it, snapping home once the bearings align."
    >
      <CodePreviewBlock
        name="CameraSlewCue"
        description="Drag to set the signed bearing gap; the crosshair slews along the dashed guide."
        code={cameraSlewCueSrc}
      >
        <div className="w-full space-y-4">
          <HudStage height={240} className="max-w-none!">
            <CameraSlewCue deltaDeg={delta} />
          </HudStage>
          <HudDemoSlider label="Δ deg" value={delta} min={-20} max={20} suffix="°" onChange={setDelta} />
        </div>
      </CodePreviewBlock>

      <SectionHeading>Usage</SectionHeading>
      <UsageBlock code={cameraSlewCueSrc} name="CameraSlewCue" />

      <SectionHeading>States</SectionHeading>
      <ExampleBlock title="Direction — slew left · aligned · slew right">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <HudStage height={200}>
            <CameraSlewCue deltaDeg={14} />
          </HudStage>
          <HudStage height={200}>
            <CameraSlewCue deltaDeg={0} />
          </HudStage>
          <HudStage height={200}>
            <CameraSlewCue deltaDeg={-14} />
          </HudStage>
        </div>
      </ExampleBlock>

      <SectionHeading>Class recipe</SectionHeading>
      <ClassNameRecipe
        entries={[
          {
            label: 'Overlay root',
            note: 'fills the feed, non-interactive',
            className: 'absolute inset-0 z-20 overflow-hidden pointer-events-none',
          },
          {
            label: 'Guide group',
            note: 'fades in while slewing',
            className:
              'absolute left-1/2 top-1/2 transition-opacity duration-150 ease-out motion-reduce:transition-none',
          },
          {
            label: 'Dashed guide',
            note: 'amber border via inline style',
            className: 'block',
          },
          {
            label: 'Endpoint dot',
            className:
              'absolute left-0 top-0 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full',
          },
          {
            label: 'Crosshair layer',
            className: 'absolute inset-0 flex items-center justify-center',
          },
        ]}
      />
    </ComponentSection>
  );
}

function HudAutoTrackSection() {
  const [armed, setArmed] = useState(true);
  return (
    <ComponentSection
      id="hud-auto-track"
      name="AutoTrackOverlay"
      description="Pathfinder auto-track flow. Once armed, a spinning reticle hunts the cursor across moving targets, snaps dashed brackets onto the nearest one, and locks solid green on click. Click off the box or press Esc to release."
    >
      <CodePreviewBlock
        name="AutoTrackOverlay"
        description="Move the cursor over the frame to hunt, click a snapped target to lock, Esc to release."
        code={autoTrackOverlaySrc}
      >
        <div className="flex h-full w-full flex-col space-y-4">
          <HudStage height={300} className="flex !max-w-none flex-col">
            <AutoTrackOverlay armed={armed} onReleased={() => setArmed(false)} />
            <span className="pointer-events-none absolute bottom-2 left-3 text-xs-plus text-white/45">
              Move cursor to hunt · click to lock · Esc to release
            </span>
          </HudStage>
          <button
            type="button"
            onClick={() => setArmed(true)}
            disabled={armed}
            className="rounded border border-border-default bg-surface-2 px-2.5 py-1 text-xs-plus text-slate-11 transition-colors hover:border-border-strong disabled:opacity-40"
          >
            {armed ? 'Armed' : 'Re-arm'}
          </button>
        </div>
      </CodePreviewBlock>

      <SectionHeading>Usage</SectionHeading>
      <UsageBlock code={autoTrackOverlaySrc} name="AutoTrackOverlay" />

      <SectionHeading>Class recipe</SectionHeading>
      <ClassNameRecipe
        entries={[
          {
            label: 'Overlay root',
            note: 'toggles pointer-events + cursor-none while hunting',
            className: 'absolute inset-0 z-20 pointer-events-auto cursor-none',
          },
          {
            label: 'Hunt reticle',
            note: 'spins via keyframes',
            className: 'autotrack-reticle-spin text-accent-warning',
          },
          {
            label: 'Corner brackets',
            note: 'snapped → warning, locked → success',
            className: 'size-full overflow-visible text-accent-warning',
          },
          {
            label: 'Lock label',
            className:
              'absolute font-mono text-3xs uppercase tracking-[0.18em] text-accent-success',
          },
          {
            label: 'Release fade',
            note: 'plays on unlock',
            className: 'autotrack-brackets-out',
          },
        ]}
      />
    </ComponentSection>
  );
}

function HudDetectionsSection() {
  return (
    <ComponentSection
      id="hud-detections"
      name="AiDetectionTriangles"
      description="AI-detection markers — fixed-size cyan triangles that point down at each detected box, with a soft gradient fill and glow. Marker size is independent of the detection box, so distant and near detections read consistently."
    >
      <CodePreviewBlock
        name="AiDetectionTriangles"
        description="Down-pointing cyan triangles mark each AI detection over the feed."
        code={aiDetectionTrianglesSrc}
      >
        <HudStage height={260}>
          <AiDetectionTriangles detections={HUD_DETECTIONS} />
        </HudStage>
      </CodePreviewBlock>

      <SectionHeading>Usage</SectionHeading>
      <UsageBlock code={aiDetectionTrianglesSrc} name="AiDetectionTriangles" />

      <SectionHeading>States</SectionHeading>
      <ExampleBlock title="Single detection vs. cluster">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <HudStage height={220}>
            <AiDetectionTriangles detections={[{ id: 'one', x: 0.42, y: 0.4, w: 0.16, h: 0.2, label: 'Person', confidence: 0.9 }]} />
          </HudStage>
          <HudStage height={220}>
            <AiDetectionTriangles detections={HUD_DETECTIONS} />
          </HudStage>
        </div>
      </ExampleBlock>

      <SectionHeading>Class recipe</SectionHeading>
      <ClassNameRecipe
        entries={[
          {
            label: 'Overlay root',
            note: 'sits under HUD chrome, non-interactive',
            className: 'pointer-events-none absolute inset-0 z-10',
          },
          {
            label: 'Marker',
            note: 'fixed 32px, centered + entrance keyframe',
            className: 'ai-detection-marker absolute',
          },
          {
            label: 'Triangle SVG',
            className: 'size-full overflow-visible',
          },
          {
            label: 'Cyan fill / stroke',
            note: 'SVG, not classes',
            className: 'fill url(#grad) · stroke var(--accent-cyan)',
          },
        ]}
      />
    </ComponentSection>
  );
}


function ElevationRamp() {
  const levels = (Object.keys(ELEVATION.overlay) as Array<keyof typeof ELEVATION.overlay>).map((key) => ({
    key,
    opacity: ELEVATION.overlay[key],
    hex: SURFACE[key],
    overlay: overlayAt(key),
  }));

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (hex: string, key: string) => {
    navigator.clipboard.writeText(hex).then(() => {
      setCopiedKey(key);
      toast.success(`Copied ${hex}`, { duration: 1500 });
      setTimeout(() => setCopiedKey(null), 1500);
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Ramp strip ── */}
      <div className="flex rounded-xl overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
        {levels.map(({ key, opacity, hex }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleCopy(hex, key)}
            className="group relative flex-1 h-24 cursor-pointer transition-[filter] duration-200 hover:brightness-125"
            style={{ backgroundColor: hex }}
          >
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <CopyIcon copied={copiedKey === key} />
            </span>
          </button>
        ))}
      </div>

      {/* ── Level data ── */}
      <div className="flex">
        {levels.map(({ key, opacity, hex }) => (
          <div key={key} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <span className="text-xs font-medium text-n-10 tabular-nums">{key}</span>
            <span className="text-xs font-mono text-n-9 tabular-nums">α {opacity}</span>
            <span className="text-xs font-mono text-n-9">{hex}</span>
          </div>
        ))}
      </div>

      {/* ── Base + shadow ── */}
      <div className="flex gap-6 pt-2">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]" style={{ backgroundColor: SURFACE.level0 }}>
          <div
            className="w-6 h-6 rounded shadow-[0_0_0_1px_rgba(255,255,255,0.1)]"
            style={{ backgroundColor: ELEVATION.baseSurface }}
          />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-n-10">Base surface</span>
            <span className="text-xs font-mono text-n-10">{ELEVATION.baseSurface}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg px-3 py-2 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]" style={{ backgroundColor: SURFACE.level0 }}>
          <div
            className="w-10 h-6 rounded"
            style={{ backgroundColor: SURFACE.level2, boxShadow: ELEVATION.shadow }}
          />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-n-10">Shadow</span>
            <code className="text-xs font-mono text-n-9 max-w-[220px] truncate" title={ELEVATION.shadow}>{ELEVATION.shadow}</code>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Shared noop / data ──────────────────────────────────────────────────────

const NEUTRAL_STEPS = [
  { step: 1, color: 'oklch(0.162 0 0)' },
  { step: 2, color: 'oklch(0.195 0 0)' },
  { step: 3, color: 'oklch(0.254 0 0)' },
  { step: 4, color: 'oklch(0.302 0 0)' },
  { step: 5, color: 'oklch(0.348 0 0)' },
  { step: 6, color: 'oklch(0.396 0 0)' },
  { step: 7, color: 'oklch(0.459 0 0)' },
  { step: 8, color: 'oklch(0.549 0 0)' },
  { step: 9, color: 'oklch(0.649 0 0)' },
  { step: 10, color: 'oklch(0.72 0 0)' },
  { step: 11, color: 'oklch(0.863 0 0)' },
  { step: 12, color: 'oklch(0.933 0 0)' },
];

const noop = () => {};

const ACTIVITY_STATUS_CHIP_COLOR: Record<string, 'green' | 'red' | 'orange' | 'gray'> = {
  active: 'green', recently_active: 'orange', timeout: 'gray', dismissed: 'gray', mitigated: 'green',
};
const ACTIVITY_STATUS_LABELS: Record<string, string> = {
  active: 'פעיל', recently_active: 'פעיל לאחרונה', timeout: 'פג תוקף', dismissed: 'בוטל', mitigated: 'נוטרל',
};

function styleguideStatusChip(target: Detection) {
  const status = getActivityStatus(target);
  // Status dot + timestamp; color carries the activity status, hover surfaces
  // the relative "time since detection".
  return (
    <ActivityTimestampChip
      timestamp={target.timestamp}
      color={ACTIVITY_STATUS_CHIP_COLOR[status] ?? 'gray'}
      statusLabel={ACTIVITY_STATUS_LABELS[status] ?? status}
      hoverLabel={formatTimeSince(getCreatedAtMs(target))}
    />
  );
}

const noopCallbacks: CardCallbacks = {
  onVerify: noop, onEngage: noop, onDismiss: noop,
  onCancelMission: noop, onCompleteMission: noop, onSendDroneVerification: noop,
  onSensorHover: noop, onCameraLookAt: noop, onTakeControl: noop,
  onReleaseControl: noop, onSensorModeChange: noop, onPlaybookSelect: noop,
  onClosureOutcome: noop, onAdvanceFlowPhase: noop, onEscalateCreatePOI: noop,
  onEscalateSendDrone: noop, onDroneSelect: noop, onDroneOverride: noop,
  onDroneResume: noop, onDroneRTB: noop, onMissionActivate: noop,
  onMissionPause: noop, onMissionResume: noop, onMissionOverride: noop,
  onMissionCancel: noop, onMitigate: noop, onMitigateAll: noop,
  onEffectorSelect: noop, onBdaOutcome: noop, onSensorFocus: noop,
};

const styleguideEffectors: RegulusEffector[] = [
  { id: 'eff-1', name: 'Regulus-1', lat: 32.09, lon: 34.78, coverageRadiusM: 5000, status: 'available' },
];

function StyleguideUnifiedCard({ detection, defaultOpen = true }: { detection: Detection; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const ctx: CardContext = { regulusEffectors: styleguideEffectors };
  const slots = useCardSlots(detection, noopCallbacks, ctx);
  const isSuccess = detection.status === 'event_resolved' || detection.status === 'event_neutralized';
  const isExpired = detection.status === 'expired';
  const showDetails = !isSuccess && !isExpired && detection.flowType !== 4;

  return (
    <TargetCard
      severity={slots.severity}
      completed={slots.completed}
      open={open}
      onToggle={() => setOpen(!open)}
      header={
        <CardHeader
          {...slots.header}
          status={styleguideStatusChip(detection)}
          open={open}
        />
      }
    >
      {slots.closureType && (
        <div className="px-2 pt-1.5 flex items-center gap-1">
          {slots.closureType === 'manual' ? (
            <div className="flex items-center gap-1 text-xs text-n-120">
              <Hand size={10} className="text-n-120" aria-hidden="true" />
              <span>סגירה ידנית</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-n-120">
              <Zap size={10} className="text-n-120" aria-hidden="true" />
              <span>סגירה אוטומטית</span>
            </div>
          )}
        </div>
      )}
      {slots.media && <CardMedia {...slots.media} />}
      {slots.actions.length > 0 && <CardActions actions={slots.actions} />}
      {showDetails && (
        <CardDetails rows={slots.details.rows} classification={slots.details.classification} />
      )}
      {slots.laserPosition.length > 0 && (
        <AccordionSection title="מיקום יחסי ללייזר" icon={Crosshair}>
          <div className="w-full py-1">
            <div className="grid grid-cols-3 grid-rows-1 gap-0">
              {slots.laserPosition.map((row, idx) => (
                <TelemetryRow key={idx} label={row.label} value={row.value} icon={row.icon} />
              ))}
            </div>
          </div>
        </AccordionSection>
      )}
      {slots.sensors.length > 0 && (
        <AccordionSection title={`חיישנים (${slots.sensors.length})`} icon={Radar}>
          <div className="px-0 pb-2 w-full pt-2">
            <CardSensors sensors={slots.sensors} label="" onSensorHover={noop} />
          </div>
        </AccordionSection>
      )}
      {slots.log.length > 0 && <CardLog entries={slots.log} />}
      {slots.closure && (
        <CardClosure outcomes={slots.closure.outcomes} onSelect={slots.closure.onSelect} />
      )}
    </TargetCard>
  );
}

// ─── Card state playground ────────────────────────────────────────────────────

interface StateEntry {
  id: string;
  label: string;
  detection: Detection;
  accent: keyof typeof CARD_TOKENS.spine.colors;
}

const sg_expired: Detection = {
  ...cuas_classified,
  id: 'sg-expired',
  status: 'expired' as const,
};

const STATE_GROUPS: { label: string; entries: StateEntry[] }[] = [
  {
    label: 'CUAS Lifecycle',
    entries: [
      { id: 'raw', label: 'Raw Detection', detection: cuas_raw, accent: 'detection' },
      { id: 'classified', label: 'Classified Drone', detection: cuas_classified, accent: 'detection' },
      { id: 'bird', label: 'Classified Bird', detection: cuas_classified_bird, accent: 'detection' },
      { id: 'mitigating', label: 'Mitigating', detection: cuas_mitigating, accent: 'mitigating' },
      { id: 'mitigated', label: 'Neutralized (BDA pending)', detection: cuas_mitigated, accent: 'active' },
      { id: 'resolved', label: 'Resolved', detection: cuas_bda_complete, accent: 'resolved' },
      { id: 'expired', label: 'Expired', detection: sg_expired, accent: 'expired' },
    ],
  },
  {
    label: 'Identity & Affiliation (IFF)',
    entries: [
      { id: 'aff-friendly', label: 'Friend', detection: drone_friendly, accent: 'idle' },
      { id: 'aff-hostile', label: 'Enemy', detection: drone_hostile, accent: 'detection' },
      { id: 'aff-unknown', label: 'Unknown', detection: drone_unknown, accent: 'suspicion' },
    ],
  },
  {
    label: 'Flow Variants',
    entries: [
      { id: 'suspicion', label: 'Suspicion', detection: flow1_suspicion, accent: 'suspicion' },
      { id: 'tracking', label: 'Tracking', detection: flow2_tracking, accent: 'tracking' },
      { id: 'drone-station', label: 'Drone On Station', detection: flow3_onStation, accent: 'active' },
      { id: 'mission', label: 'Mission Executing', detection: flow4_mission, accent: 'detection' },
      { id: 'mission-done', label: 'Mission Complete', detection: flow4_complete, accent: 'resolved' },
      { id: 'full-resolved', label: 'Fully Resolved (BDA)', detection: flow5_mitigated, accent: 'resolved' },
    ],
  },
];

const ALL_STATE_ENTRIES = STATE_GROUPS.flatMap((g) => g.entries);

function CardStatePlayground() {
  const [activeId, setActiveId] = useState(ALL_STATE_ENTRIES[0].id);
  const entry = ALL_STATE_ENTRIES.find((e) => e.id === activeId) ?? ALL_STATE_ENTRIES[0];
  const ctx: CardContext = { regulusEffectors: styleguideEffectors };
  const slots = useCardSlots(entry.detection, noopCallbacks, ctx);
  const activityStatus = getActivityStatus(entry.detection);
  const chipColor = ACTIVITY_STATUS_CHIP_COLOR[activityStatus] ?? 'gray';
  const chipLabel = ACTIVITY_STATUS_LABELS[activityStatus] ?? activityStatus;

  const iconName = entry.detection.flowType === 4
    ? 'ScanLine / Route'
    : entry.detection.type === 'uav'
      ? 'DroneCardIcon'
      : entry.detection.type === 'missile'
        ? 'MissileCardIcon'
        : 'Target';

  return (
    <div className="space-y-6">
      {/* State selector pills */}
      <div className="space-y-3">
        {STATE_GROUPS.map((group) => (
          <div key={group.label}>
            <span className="block text-xs font-semibold uppercase tracking-widest text-n-9 mb-1.5">
              {group.label}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {group.entries.map((e) => {
                const isActive = e.id === activeId;
                const dotColor = CARD_TOKENS.spine.colors[e.accent];
                return (
                  <button
                    key={e.id}
                    onClick={() => setActiveId(e.id)}
                    className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium cursor-pointer transition-[color,background-color,box-shadow] duration-150 ease-out active:scale-[0.98] ${
                      isActive
                        ? 'bg-state-selected text-n-12 shadow-[0_0_0_1px_rgba(255,255,255,0.15)]'
                        : 'text-n-120 hover:text-n-10 hover:bg-state-hover'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: dotColor }}
                    />
                    {e.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Live card preview */}
      <PreviewPanel tight>
        <div className="w-96 mx-auto">
          <StyleguideUnifiedCard detection={entry.detection} defaultOpen />
        </div>
      </PreviewPanel>

      {/* Visual properties annotation */}
      <div className="space-y-2.5">
        <h3 className="text-sm font-medium text-n-10">Computed Visual Properties</h3>
        <div className="overflow-x-auto rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.06)]" dir="ltr">
          <table className="w-full text-xs" dir="ltr">
            <thead>
              <tr className="border-b border-white/5" style={{ backgroundColor: SURFACE.level1 }}>
                <th className="py-2 px-3 text-left font-medium text-n-9">Property</th>
                <th className="py-2 px-3 text-left font-medium text-n-9">Value</th>
                <th className="py-2 px-3 text-left font-medium text-n-9">Visual</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.03]">
                <td className="py-2 px-3 font-mono text-sky-300/80">severity</td>
                <td className="py-2 px-3 font-mono text-n-10">{slots.severity}</td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded shadow-[0_0_0_1px_var(--border-subtle)]"
                      style={{ backgroundColor: SEVERITY_COLOR[slots.severity] }}
                    />
                    <span className="font-mono text-n-9 text-xs">{SEVERITY_COLOR[slots.severity]}</span>
                  </div>
                </td>
              </tr>
              <tr className="border-b border-white/[0.03]">
                <td className="py-2 px-3 font-mono text-sky-300/40">accent (deprecated)</td>
                <td className="py-2 px-3 font-mono text-n-9">{slots.accent}</td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded shadow-[0_0_0_1px_var(--border-subtle)] opacity-60"
                      style={{ backgroundColor: CARD_TOKENS.spine.colors[slots.accent] }}
                    />
                    <span className="font-mono text-n-9 text-xs">{CARD_TOKENS.spine.colors[slots.accent]}</span>
                  </div>
                </td>
              </tr>
              <tr className="border-b border-white/[0.03]">
                <td className="py-2 px-3 font-mono text-sky-300/80">completed</td>
                <td className="py-2 px-3 font-mono text-n-10">{slots.completed ? 'true' : 'false'}</td>
                <td className="py-2 px-3 text-n-9">
                  {slots.completed ? 'saturate(0.4) brightness(0.85)' : 'none'}
                </td>
              </tr>
              <tr className="border-b border-white/[0.03]">
                <td className="py-2 px-3 font-mono text-sky-300/80">icon</td>
                <td className="py-2 px-3 font-mono text-n-10">{iconName}</td>
                <td className="py-2 px-3">
                  {slots.header.icon && (
                    <div
                      className="flex items-center justify-center shrink-0"
                      style={{
                        width: CARD_TOKENS.iconBox.size,
                        height: CARD_TOKENS.iconBox.size,
                        borderRadius: CARD_TOKENS.iconBox.borderRadius,
                        backgroundColor: slots.header.iconBgActive
                          ? `${CARD_TOKENS.iconBox.activeBg}${Math.round(CARD_TOKENS.iconBox.activeBgOpacity * 255).toString(16).padStart(2, '0')}`
                          : CARD_TOKENS.iconBox.defaultBg,
                        color: slots.header.iconColor ?? (slots.header.iconBgActive ? CARD_TOKENS.iconBox.activeBg : undefined),
                      }}
                    >
                      <slots.header.icon size={CARD_TOKENS.iconBox.iconSize} aria-hidden />
                    </div>
                  )}
                </td>
              </tr>
              <tr className="border-b border-white/[0.03]">
                <td className="py-2 px-3 font-mono text-sky-300/80">iconColor</td>
                <td className="py-2 px-3 font-mono text-n-10">{slots.header.iconColor ?? 'none'}</td>
                <td className="py-2 px-3">
                  {slots.header.iconColor && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded shadow-[0_0_0_1px_var(--border-subtle)]"
                        style={{ backgroundColor: slots.header.iconColor }}
                      />
                      <span className="font-mono text-n-9 text-xs">{slots.header.iconColor}</span>
                    </div>
                  )}
                </td>
              </tr>
              <tr className="border-b border-white/[0.03]">
                <td className="py-2 px-3 font-mono text-sky-300/80">iconBgActive</td>
                <td className="py-2 px-3 font-mono text-n-10">{slots.header.iconBgActive ? 'true' : 'false'}</td>
                <td className="py-2 px-3 text-n-9">
                  {slots.header.iconBgActive
                    ? `${CARD_TOKENS.iconBox.activeBg} @ ${CARD_TOKENS.iconBox.activeBgOpacity} opacity`
                    : CARD_TOKENS.iconBox.defaultBg}
                </td>
              </tr>
              <tr className="border-b border-white/[0.03]">
                <td className="py-2 px-3 font-mono text-sky-300/80">closureType</td>
                <td className="py-2 px-3 font-mono text-n-10">{slots.closureType ?? 'null'}</td>
                <td className="py-2 px-3 text-n-9">
                  {slots.closureType === 'manual' ? 'Hand icon — manual closure' : slots.closureType === 'auto' ? 'Zap icon — auto closure' : '—'}
                </td>
              </tr>
              <tr className="border-b border-white/[0.03]">
                <td className="py-2 px-3 font-mono text-sky-300/80">activityStatus</td>
                <td className="py-2 px-3 font-mono text-n-10">{activityStatus}</td>
                <td className="py-2 px-3">
                  <StatusChip label={chipLabel} color={chipColor} />
                </td>
              </tr>
              <tr className="border-b border-white/[0.03] last:border-0">
                <td className="py-2 px-3 font-mono text-sky-300/80">badge</td>
                <td className="py-2 px-3 font-mono text-n-10">
                  {slots.header.badge ? 'visible' : 'hidden'}
                </td>
                <td className="py-2 px-3">
                  {slots.header.badge ?? <span className="text-n-7">—</span>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function StyleguidePage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<string>(NAV[0].items[0].id);
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [hoveredLayer, setHoveredLayer] = useState<number | null>(null);
  const layerLeaveTimer = useRef<ReturnType<typeof setTimeout>>();
  const handleLayerEnter = useCallback((num: number) => {
    clearTimeout(layerLeaveTimer.current);
    setHoveredLayer(num);
  }, []);
  const handleLayerLeave = useCallback(() => {
    layerLeaveTimer.current = setTimeout(() => setHoveredLayer(null), 100);
  }, []);
  const [explorerState, setExplorerState] = useState<InteractionState>('default');
  const [explorerAff, setExplorerAff] = useState<Affiliation>('friendly');
  const [hoveredAff, setHoveredAff] = useState<Affiliation | null>(null);
  const explorerLeaveTimer = useRef<ReturnType<typeof setTimeout>>();
  const handleStateEnter = useCallback((state: InteractionState, aff: Affiliation) => {
    clearTimeout(explorerLeaveTimer.current);
    setExplorerState(state);
    setHoveredAff(aff);
  }, []);
  const handleStateLeave = useCallback(() => {
    explorerLeaveTimer.current = setTimeout(() => {
      setExplorerState('default');
      setHoveredAff(null);
    }, 100);
  }, []);
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null);
  const overlayLeaveTimer = useRef<ReturnType<typeof setTimeout>>();
  const handleOverlayEnter = useCallback((id: string) => {
    clearTimeout(overlayLeaveTimer.current);
    setActiveOverlay(id);
  }, []);
  const handleOverlayLeave = useCallback(() => {
    overlayLeaveTimer.current = setTimeout(() => setActiveOverlay(null), 100);
  }, []);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const navigateTo = useCallback((id: string) => {
    const parent = findParentItemForChild(id);
    setActiveItem(parent ? parent.id : id);
    setActiveAnchor(id);

    if (parent) {
      // Double rAF so any tab containing this anchor has a frame to switch
      // active + unhide its panel before we scroll the (now visible) target.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }
  }, []);

  /** Selecting an example tab directly: sync the anchor highlight + hash (no scroll — the tab strip is already in view). */
  const handleExampleTabAnchor = useCallback((id: string) => {
    setActiveAnchor(id);
    window.history.replaceState(null, '', `#${id}`);
  }, []);

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.slice(1);
      if (hash) navigateTo(hash);
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [navigateTo]);

  useEffect(() => {
    const navItem = NAV.flatMap(g => g.items).find(i => i.id === activeItem);
    const children = navItem?.children;
    if (!children) { setActiveAnchor(null); return; }

    observerRef.current?.disconnect();
    const visibleIds = new Set<string>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visibleIds.add(entry.target.id);
          else visibleIds.delete(entry.target.id);
        });
        const ordered = children.filter(c => visibleIds.has(c.id));
        if (ordered.length > 0) {
          setActiveAnchor(ordered[0].id);
          window.history.replaceState(null, '', `#${ordered[0].id}`);
        }
      },
      { rootMargin: '-10% 0px -60% 0px', threshold: 0 },
    );

    requestAnimationFrame(() => {
      children.forEach(c => {
        const el = document.getElementById(c.id);
        if (el) observerRef.current?.observe(el);
      });
    });

    if (!activeAnchor && children.length > 0) setActiveAnchor(children[0].id);

    return () => observerRef.current?.disconnect();
  }, [activeItem]);

  const simulateLoading = (id: string) => {
    setLoading(id);
    setTimeout(() => setLoading(null), 2000);
  };

  const sampleDetailRows: DetailRow[] = [
    { label: 'גובה', value: '120m', icon: Navigation },
    { label: 'מהירות', value: '45 km/h', icon: Gauge },
    { label: 'כיוון', value: '270°', icon: Compass },
    { label: 'מרחק', value: '1.2 km', icon: MapPin },
  ];

  const sampleSensors: CardSensor[] = [
    { id: 'rf-01', typeLabel: 'RF Scanner', icon: Radio, distanceLabel: '1.2 km', detectedAt: '14:32:01' },
    { id: 'radar-01', typeLabel: 'Radar X-Band', icon: Activity, distanceLabel: '0.8 km', detectedAt: '14:32:05' },
    { id: 'eo-01', typeLabel: 'EO/IR Camera', icon: Eye, distanceLabel: '0.5 km', detectedAt: '14:32:12' },
  ];

  const sampleLogEntries: LogEntry[] = [
    { time: '14:30:01', label: 'זוהה אות RF חדש' },
    { time: '14:30:15', label: 'סיווג ראשוני: רחפן מסחרי' },
    { time: '14:31:02', label: 'מצלמה הופנתה ליעד' },
    { time: '14:31:30', label: 'אישור חזותי — DJI Mavic 3' },
    { time: '14:32:00', label: 'יעד נכנס לאזור מוגבל' },
    { time: '14:32:15', label: 'התראת איום שודרגה' },
    { time: '14:32:40', label: 'ג׳אמר RF הופעל' },
  ];

  const sampleClosureOutcomes: ClosureOutcome[] = [
    { id: 'bird', label: 'ציפור — סגור', icon: Bird },
    { id: 'threat', label: 'איום אמיתי', icon: ShieldAlert },
    { id: 'false-alarm', label: 'התרעת שווא', icon: AlertTriangle },
    { id: 'resolved', label: 'טופל בהצלחה', icon: CheckCircle2 },
  ];

  const sampleActions: CardAction[] = [
    {
      id: 'jam', label: 'הפעל ג׳אמר', icon: Zap, variant: 'danger', size: 'sm',
      group: 'primary', onClick: noop,
      dropdownActions: [
        { id: 'jam-rf', label: 'ג׳אמר RF', icon: Radio, onClick: noop },
        { id: 'jam-gps', label: 'ג׳אמר GPS', icon: Crosshair, onClick: noop },
      ],
    },
    { id: 'camera', label: 'הפנה מצלמה', icon: Eye, variant: 'fill', size: 'sm', group: 'secondary', onClick: noop },
    { id: 'dismiss', label: 'בטל', icon: Ban, variant: 'ghost', size: 'sm', group: 'secondary', onClick: noop },
  ];

  const [filterBarQuery, setFilterBarQuery] = useState('');
  const [filterBarSelections, setFilterBarSelections] = useState<Record<string, string[]>>({});

  const [devicesPanelFloodlightOnIds, setDevicesPanelFloodlightOnIds] = useState<Set<string>>(() => new Set(['floodlight-01']));
  const [devicesPanelSpeakerPlayingIds, setDevicesPanelSpeakerPlayingIds] = useState<Set<string>>(() => new Set(['speaker-01']));
  const handleDevicesPanelFloodlightToggle = useCallback((floodlightId: string, next: boolean) => {
    setDevicesPanelFloodlightOnIds((prev) => {
      const nextSet = new Set(prev);
      if (next) nextSet.add(floodlightId); else nextSet.delete(floodlightId);
      return nextSet;
    });
  }, []);
  const handleDevicesPanelSpeakerToggle = useCallback((speakerId: string, next: boolean) => {
    setDevicesPanelSpeakerPlayingIds((prev) => {
      const nextSet = new Set(prev);
      if (next) nextSet.add(speakerId); else nextSet.delete(speakerId);
      return nextSet;
    });
  }, []);

  const [comboboxDemoTrack, setComboboxDemoTrack] = useState('air-raid');
  const [comboboxDemoOpen, setComboboxDemoOpen] = useState(false);

  const handleSelectPage = useCallback((id: string) => {
    setActiveItem(id);
    window.history.replaceState(null, '', `#${id}`);
  }, []);

  const prefersReducedMotionRoot = useReducedMotion();

  return (
    <TooltipProvider>
      <div dir="ltr" className="flex min-h-screen bg-[#09090b] text-white font-sans antialiased">

        <StyleguideSidebar
          activeItem={activeItem}
          onSelectPage={handleSelectPage}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <StyleguideHeader
            activeItem={activeItem}
            onSearchOpen={() => setSearchOpen(true)}
          />

          <div className="flex flex-1">
            <main id="top" className="flex-1 min-w-0 overflow-y-auto py-4 pr-4">
              <div
                className="rounded-2xl bg-[#0c0c0e] min-h-[calc(100vh-2rem)]"
                style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 2px 8px rgba(0,0,0,0.2)' }}
              >
              <div className="px-8 py-10 sm:px-10 lg:px-14 lg:py-12 pb-24">
              <motion.div
                key={activeItem}
                className="mx-auto max-w-[880px] space-y-12"
                initial={prefersReducedMotionRoot ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
              >

            {activeItem === 'icon-library' && (
            <ComponentSection
              id="icon-library"
              name="Icon Library"
            >
              <Suspense
                fallback={
                  <div className="flex flex-col items-center justify-center gap-3 min-h-[240px] rounded-xl bg-white/[0.02] shadow-[0_0_0_1px_rgba(255,255,255,0.06)] text-sm text-n-9">
                    <AppLoader size={64} label="Loading icon library" />
                    Loading icon library…
                  </div>
                }
              >
                <IconLibrary />
              </Suspense>
            </ComponentSection>
            )}

            {activeItem === 'quick-start' && (
            <ComponentSection id="quick-start" name="Quick Start" description="Install C2 Hub components into any Vite + React project via the CLI.">
              <div className="space-y-8">

                <div className="space-y-3">
                  <SectionHeading>Install</SectionHeading>
                  <p className="text-base font-normal leading-relaxed text-white/50 tracking-wide">
                    Install every component, token, and icon in one command:
                  </p>
                  <QuickStartCodeBlock code="npx shadcn@latest add @c2/all" />
                  <p className="text-base font-normal leading-relaxed text-white/50 tracking-wide mt-2">
                    Or pick only what you need:
                  </p>
                  <QuickStartCodeBlock code="npx shadcn@latest add @c2/button @c2/target-card @c2/status-chip" />
                  <p className="text-base font-normal leading-relaxed text-white/50 tracking-wide mt-2">
                    Dependencies are resolved automatically — installing <code className="text-sm font-mono text-sky-300/80 bg-white/[0.04] px-1.5 py-0.5 rounded">target-card</code> pulls in <code className="text-sm font-mono text-sky-300/80 bg-white/[0.04] px-1.5 py-0.5 rounded">tokens</code>, <code className="text-sm font-mono text-sky-300/80 bg-white/[0.04] px-1.5 py-0.5 rounded">utils</code>, and any other internal dependencies.
                  </p>
                </div>

                <div className="space-y-3">
                  <SectionHeading>Use</SectionHeading>
                  <QuickStartCodeBlock code={`import { StatusChip, ActionButton } from "@/primitives"
import { Crosshair } from "@/lib/icons/central"

export function DetectionRow() {
  return (
    <div className="flex items-center gap-3">
      <StatusChip label="Active" color="green" />
      <ActionButton label="Track" icon={Crosshair} variant="fill" />
    </div>
  )
}`} />
                </div>

                <div className="space-y-3">
                  <SectionHeading>Project setup</SectionHeading>
                  <p className="text-base font-normal leading-relaxed text-white/50 tracking-wide mb-3">
                    First time? Complete these steps before installing components.
                  </p>

                  <p className="text-base font-normal leading-relaxed text-white/50 tracking-wide">
                    <span className="text-n-11 font-medium">1.</span>{' '}Requires <span className="text-n-11 font-medium">Vite + React + TypeScript + Tailwind CSS v4</span> with <code className="text-sm font-mono text-sky-300/80 bg-white/[0.04] px-1.5 py-0.5 rounded">@/*</code> path aliases configured.
                  </p>

                  <p className="text-base font-normal leading-relaxed text-white/50 tracking-wide mt-4">
                    <span className="text-n-11 font-medium">2.</span>{' '}Initialize shadcn if you don't have a <code className="text-sm font-mono text-sky-300/80 bg-white/[0.04] px-1.5 py-0.5 rounded">components.json</code> yet:
                  </p>
                  <QuickStartCodeBlock code="npx shadcn@latest init" />

                  <p className="text-base font-normal leading-relaxed text-white/50 tracking-wide mt-4">
                    <span className="text-n-11 font-medium">3.</span>{' '}Add the C2 registry to your <code className="text-sm font-mono text-sky-300/80 bg-white/[0.04] px-1.5 py-0.5 rounded">components.json</code>:
                  </p>
                  <QuickStartCodeBlock code={`// components.json
{
  "registries": {
    "@c2": "https://c2-hub-three.vercel.app/r/{name}.json"
  }
}`} />

                  <p className="text-base font-normal leading-relaxed text-white/50 tracking-wide mt-4">
                    <span className="text-n-11 font-medium">4.</span>{' '}Import the C2 theme in your CSS entry point:
                  </p>
                  <QuickStartCodeBlock code={`/* src/styles/index.css */
@import "tailwindcss";
@import "./theme.css";
@import "./fonts.css";`} />
                  <p className="text-base font-normal leading-relaxed text-white/50 tracking-wide mt-1.5">
                    Copy <code className="text-sm font-mono text-sky-300/80 bg-white/[0.04] px-1.5 py-0.5 rounded">theme.css</code> and <code className="text-sm font-mono text-sky-300/80 bg-white/[0.04] px-1.5 py-0.5 rounded">fonts.css</code> from the C2 Hub repo into your project's styles directory.
                  </p>
                </div>

                <div className="space-y-3">
                  <SectionHeading>Updating</SectionHeading>
                  <p className="text-base font-normal leading-relaxed text-white/50 tracking-wide">
                    Preview changes before updating:
                  </p>
                  <QuickStartCodeBlock code="npx shadcn@latest diff @c2/button" />
                  <p className="text-base font-normal leading-relaxed text-white/50 tracking-wide mt-3">
                    Apply the update:
                  </p>
                  <QuickStartCodeBlock code="npx shadcn@latest add @c2/button --overwrite" />
                </div>

              </div>
            </ComponentSection>
            )}

            {activeItem === 'releases' && (
            <ComponentSection id="releases" name="Releases" description="Changelogs for each C2 Hub registry release.">
              <div className="space-y-0 divide-y divide-white/[0.04]">
                {CHANGELOG.map((entry, i) => (
                  <div key={entry.version} className={`space-y-3 ${i === 0 ? 'pb-8' : 'py-8'}`}>
                    <span className="block text-sm font-mono text-n-120" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {entry.date}
                    </span>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-xl font-semibold text-n-12 tracking-tight" style={{ fontVariantNumeric: 'tabular-nums', textWrap: 'balance' }}>
                        v{entry.version}
                      </h3>
                      {i === 0 && (
                        <span className="text-xs font-medium bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full select-none">
                          Latest
                        </span>
                      )}
                    </div>
                    <ul className="space-y-1.5 pl-4">
                      {entry.highlights.map((item) => (
                        <li key={item} className="text-base font-normal leading-relaxed text-white/50 tracking-wide list-disc marker:text-white/30" style={{ textWrap: 'pretty' }}>
                          <ChangelogLine text={item} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </ComponentSection>
            )}

            {activeItem === 'styling' && (
            <ComponentSection id="styling" name="Styling" description="Color tokens, elevation surfaces, and typography setup. Paste the theme CSS into your project to get the full design language.">
              <SectionHeading>Theme CSS</SectionHeading>
              <p className="text-base font-normal text-white/50 mb-4 leading-relaxed tracking-wide">
                The design system uses two CSS files: <code className="text-sm font-mono text-n-10">palette.css</code> — the single source of truth for color (slate ramp, surface ladder, borders, state overlays, tactical accents) — and <code className="text-sm font-mono text-n-10">theme.css</code> for the shadcn semantic aliases and base typography. Copy each into your project.
              </p>
              <div className="space-y-6">
                <CodePreviewBlock name="palette.css" description="OKLCH slate ramp, surface + shadow ladder, borders, state overlays, and tactical accents." code={paletteCssSrc} />
                <CodePreviewBlock name="theme.css" description="Semantic color tokens aliased onto palette.css, Tailwind @theme bindings, and base typography." code={themeCssSrc} />
              </div>

              <SectionHeading>Neutral Scale</SectionHeading>
              <p className="text-base font-normal text-white/50 mb-4 leading-relaxed tracking-wide">
                12-step achromatic OKLCH ramp. Use <code className="text-sm font-mono text-n-10">text-n-8</code>, <code className="text-sm font-mono text-n-10">bg-n-3</code>, etc.
              </p>
              <PreviewPanel align="stretch">
                <div className="space-y-3" dir="ltr">
                  <div className="flex rounded-xl overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
                    {NEUTRAL_STEPS.map(({ step, color }) => (
                      <div key={step} className="flex-1 h-16" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                  <div className="flex">
                    {NEUTRAL_STEPS.map(({ step }) => (
                      <div key={step} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                        <span className="text-xs font-mono text-n-9 tabular-nums">n-{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </PreviewPanel>

              <SectionHeading>Elevation</SectionHeading>
              <p className="text-base font-normal text-white/50 mb-4 leading-relaxed tracking-wide">
                Surfaces rise from a dark base ({ELEVATION.baseSurface}) by mixing white overlays at increasing opacity. Click any level to copy its hex.
              </p>
              <PreviewPanel align="stretch">
                <ElevationRamp />
              </PreviewPanel>

              <SectionHeading>Fonts</SectionHeading>
              <PreviewPanel align="stretch">
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-widest text-n-9 mb-1 block">Sans — Heebo</span>
                    <p className="font-sans text-base text-n-11">אבגדהו The quick brown fox jumps over the lazy dog — 0123456789</p>
                  </div>
                  <div className="border-t border-white/5 pt-3">
                    <span className="text-xs font-semibold uppercase tracking-widest text-n-9 mb-1 block">Mono — IBM Plex Mono</span>
                    <p className="font-mono text-base text-n-11">const x = 42; // 0123456789 → tabular-nums</p>
                  </div>
                </div>
              </PreviewPanel>

              <SectionHeading>Press feedback</SectionHeading>
              <p className="text-base font-normal text-white/50 mb-4 leading-relaxed tracking-wide">
                Every interactive surface (buttons, list rows, icon affordances, filter triggers, combobox triggers) responds to <code className="text-sm font-mono text-n-10">:active</code> with a subtle <code className="text-sm font-mono text-n-10">scale(0.98)</code>. The scale is intentionally tiny so the feedback registers without feeling bouncy or toy-like. Pair it with a 150ms transform transition.
              </p>
              <PreviewPanel align="stretch" className="flex">
                <div className="flex flex-wrap items-center gap-3" dir="ltr">
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-white/80 bg-white/[0.06] hover:bg-state-hover-overlay active:scale-[0.98] transition-[background-color,color,transform] duration-150 ease-out">
                    Press me
                  </button>
                  <Button variant="secondary" size="sm" className="active:scale-[0.98] transition-[background-color,color,transform] duration-150 ease-out">
                    Secondary
                  </Button>
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 active:scale-[0.98] transition-[background-color,color,transform] duration-150 ease-out">
                    Stateful
                  </button>
                </div>
              </PreviewPanel>
              <p className="text-sm text-n-9 mt-3 leading-relaxed">
                Drop-in classes: <code className="text-xs font-mono text-sky-300/80 bg-white/[0.04] px-1.5 py-0.5 rounded">active:scale-[0.98]</code> + <code className="text-xs font-mono text-sky-300/80 bg-white/[0.04] px-1.5 py-0.5 rounded">transition-[background-color,color,transform] duration-150 ease-out</code>. If a button only animates on hover (no transform), it's safe to use the shorter <code className="text-xs font-mono text-sky-300/80 bg-white/[0.04] px-1.5 py-0.5 rounded">transition-colors</code> instead — but keep the scale value at <code className="text-xs font-mono text-sky-300/80 bg-white/[0.04] px-1.5 py-0.5 rounded">0.98</code> for consistency with the rest of the app.
              </p>
            </ComponentSection>
            )}

            {activeItem === 'status-chip' && (
            <ComponentSection id="status-chip" name="StatusChip" description="Compact colored badge indicating operational status of a target or system.">
              <CodePreviewBlock name="StatusChip" description="Compact colored badge indicating operational status of a target or system." code={statusChipSrc} relatedFiles={COMMON_FILES}>
                <div className="flex flex-wrap items-center gap-3">
                  {(Object.keys(STATUS_CHIP_COLORS) as StatusChipColor[]).map((color) => (
                    <StatusChip key={color} label={color} color={color} />
                  ))}
                </div>
              </CodePreviewBlock>

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={statusChipSrc} name="StatusChip" />

              <SectionHeading>Class recipe</SectionHeading>
              <ClassNameRecipe
                entries={[
                  {
                    label: 'Chip',
                    note: 'color via STATUS_CHIP_COLORS[color].bg + .text',
                    className:
                      'inline-flex items-center justify-center rounded border border-transparent px-2 py-0.5 text-xs font-medium w-fit max-w-full whitespace-nowrap shrink-0 gap-1',
                  },
                  { label: 'Label', className: 'min-w-0 truncate' },
                ]}
              />

            </ComponentSection>
            )}

            {activeItem === 'new-updates' && (
            <ComponentSection id="new-updates" name="NewUpdatesPill" description="Floating pill that appears above the list to surface new incoming detections.">
              <CodePreviewBlock name="NewUpdatesPill" description="Floating pill that appears above the list to surface new incoming detections." code={newUpdatesPillSrc} relatedFiles={COMMON_FILES}>
                <div className="flex flex-wrap items-center gap-4">
                  <NewUpdatesPill count={1} onClick={noop} />
                  <NewUpdatesPill count={5} onClick={noop} />
                  <NewUpdatesPill count={42} onClick={noop} />
                  <NewUpdatesPill count={147} onClick={noop} />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={newUpdatesPillSrc} name="NewUpdatesPill" />

              <SectionHeading>Class recipe</SectionHeading>
              <ClassNameRecipe
                entries={[
                  {
                    label: 'Pill (Button)',
                    className:
                      'h-8 gap-1.5 rounded-full border-0 bg-sky-500 px-3 text-xs font-semibold text-white shadow-[0_8px_24px_rgba(29,155,240,0.35),0_0_0_1px_rgba(255,255,255,0.1)] transition-[background-color,transform] duration-150 ease-out hover:bg-sky-400 focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring active:scale-[0.98]',
                  },
                  { label: 'Arrow icon', note: 'strokeWidth 2.5', className: 'size-[13px]' },
                ]}
              />

            </ComponentSection>
            )}

            {/* ────────────────────────────────────────────────────────────── */}
            {/*  PRIMITIVES — actions                                        */}
            {/* ────────────────────────────────────────────────────────────── */}

            {activeItem === 'action-button' && (
            <ComponentSection id="action-button" name="ActionButton" description="Tactical action trigger with variant, size, icon, and loading states. Used in card action rows and standalone controls.">
              <CodePreviewBlock name="ActionButton" description="Tactical action trigger with variant, size, icon, and loading states. Used in card action rows and standalone controls." code={actionButtonSrc} relatedFiles={COMMON_FILES}>
                <div className="flex flex-wrap items-center gap-2">
                  <ActionButton label="הפנה מצלמה" icon={Eye} variant="fill" size="md" />
                  <ActionButton label="ביטול" icon={Ban} variant="ghost" size="md" />
                  <ActionButton label="מחק" icon={Trash2} variant="danger" size="md" />
                  <ActionButton label="אזהרה" icon={AlertTriangle} variant="warning" size="md" />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={actionButtonSrc} name="ActionButton" />

              <SectionHeading>Variants</SectionHeading>
              <VariantGrid
                entries={(Object.keys(ACTION_BUTTON_VARIANTS) as ActionButtonVariant[]).map((key) => ({ key }))}
                renderSample={(key) => <ActionButton label={key} icon={Eye} variant={key as ActionButtonVariant} size="sm" />}
              />

              <SectionHeading>Sizes</SectionHeading>
              <VariantGrid
                entries={Object.keys(ACTION_BUTTON_SIZES).map((key) => ({ key }))}
                renderSample={(key) => <ActionButton label={key} icon={Eye} variant="fill" size={key as keyof typeof ACTION_BUTTON_SIZES} />}
              />

              <SectionHeading>Examples</SectionHeading>
              <ExampleTabs
                items={[
                  {
                    value: 'size-scale',
                    label: 'Size Scale',
                    children: (
                      <ExampleBlock hideTitle title="Size Scale">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <ActionButton label="sm" icon={Eye} variant="fill" size="sm" />
                            <ActionButton label="md" icon={Eye} variant="fill" size="md" />
                            <ActionButton label="lg" icon={Eye} variant="fill" size="lg" />
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <ActionButton label="sm" icon={Trash2} variant="danger" size="sm" />
                            <ActionButton label="md" icon={Trash2} variant="danger" size="md" />
                            <ActionButton label="lg" icon={Trash2} variant="danger" size="lg" />
                          </div>
                        </div>
                      </ExampleBlock>
                    ),
                  },
                  {
                    value: 'all-variants',
                    label: 'All Variants × sm',
                    children: (
                      <ExampleBlock hideTitle title="All Variants × sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <ActionButton label="הפנה מצלמה" icon={Eye} variant="fill" size="sm" />
                          <ActionButton label="ביטול" icon={Ban} variant="ghost" size="sm" />
                          <ActionButton label="מעקב" icon={Eye} variant="outline" size="sm" />
                          <ActionButton label="מחק" icon={Trash2} variant="danger" size="sm" />
                          <ActionButton label="אזהרה" icon={AlertTriangle} variant="warning" size="sm" />
                        </div>
                      </ExampleBlock>
                    ),
                  },
                  {
                    value: 'without-icon',
                    label: 'Without Icon',
                    children: (
                      <ExampleBlock hideTitle title="Without Icon">
                        <div className="flex flex-wrap items-center gap-2">
                          <ActionButton label="fill" variant="fill" size="sm" />
                          <ActionButton label="ghost" variant="ghost" size="sm" />
                          <ActionButton label="danger" variant="danger" size="sm" />
                          <ActionButton label="warning" variant="warning" size="sm" />
                        </div>
                      </ExampleBlock>
                    ),
                  },
                  {
                    value: 'disabled',
                    label: 'Disabled',
                    children: (
                      <ExampleBlock hideTitle title="Disabled">
                        <div className="flex flex-wrap items-center gap-2">
                          <ActionButton label="fill" icon={Eye} variant="fill" size="sm" disabled />
                          <ActionButton label="danger" icon={Trash2} variant="danger" size="sm" disabled />
                        </div>
                      </ExampleBlock>
                    ),
                  },
                  {
                    value: 'loading',
                    label: 'Loading (click to test)',
                    children: (
                      <ExampleBlock hideTitle title="Loading (click to test)">
                        <div className="flex flex-wrap items-center gap-2">
                          <ActionButton label="שולח..." icon={Send} variant="fill" size="sm" loading={loading === 'ab-fill'} onClick={() => simulateLoading('ab-fill')} />
                          <ActionButton label="מוחק..." icon={Trash2} variant="danger" size="sm" loading={loading === 'ab-danger'} onClick={() => simulateLoading('ab-danger')} />
                        </div>
                      </ExampleBlock>
                    ),
                  },
                ]}
              />

              <SectionHeading>Class recipe</SectionHeading>
              <ClassNameRecipe
                entries={[
                  {
                    label: 'Button base',
                    note: 'surface + size from the ui/button buttonVariants cva; BUTTON_VARIANTS / BUTTON_SIZES are alias maps onto it',
                    className:
                      'inline-flex items-center justify-center gap-2 px-3 rounded overflow-hidden transition-[background-color,box-shadow,transform] duration-150 ease-out',
                  },
                  {
                    label: 'Focus ring',
                    className:
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-state-focus-ring',
                  },
                  { label: 'Press feedback', className: 'active:scale-[0.98] will-change-transform' },
                  { label: 'Disabled', className: 'opacity-45 pointer-events-none' },
                  {
                    label: 'Pressed (toggle)',
                    className:
                      'bg-white/[0.20] hover:bg-white/[0.24] active:bg-white/[0.16] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]',
                  },
                ]}
              />
            </ComponentSection>
            )}

            {activeItem === 'split-action' && (
            <ComponentSection id="split-action" name="SplitActionButton" description="Two-segment button: primary action on the left, dropdown menu on the right. Used for effector controls with sub-options.">
              <CodePreviewBlock name="SplitActionButton" description="Two-segment button: primary action on the left, dropdown menu on the right. Used for effector controls with sub-options." code={splitActionButtonSrc} relatedFiles={COMMON_FILES}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-48">
                    <SplitActionButton label="שיגור" icon={Zap} variant="fill" size="sm" onClick={noop} dropdownItems={[
                      { id: '1', label: 'אפשרות א׳', icon: Radio, onClick: noop },
                      { id: '2', label: 'אפשרות ב׳', icon: Crosshair, onClick: noop },
                    ]} />
                  </div>
                  <div className="w-48">
                    <SplitActionButton label="מחק" icon={Trash2} variant="danger" size="sm" onClick={noop} dropdownItems={[
                      { id: '1', label: 'מחק לצמיתות', icon: Trash2, onClick: noop },
                    ]} />
                  </div>
                  <div className="w-48">
                    <SplitActionButton label="אזהרה" icon={AlertTriangle} variant="warning" size="sm" onClick={noop} dropdownItems={[
                      { id: '1', label: 'פעולה', onClick: noop },
                    ]} />
                  </div>
                </div>
              </CodePreviewBlock>

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={splitActionButtonSrc} name="SplitActionButton" />

              <SectionHeading>Variants</SectionHeading>
              <VariantGrid
                entries={Object.keys(SPLIT_BUTTON_VARIANTS).map((key) => ({ key }))}
                renderSample={(key) => (
                  <div className="w-36">
                    <SplitActionButton label={key} icon={Zap} variant={key as keyof typeof SPLIT_BUTTON_VARIANTS} size="sm" onClick={noop} dropdownItems={[{ id: '1', label: 'Option', onClick: noop }]} />
                  </div>
                )}
              />

              <SectionHeading>Examples</SectionHeading>
              <ExampleTabs
                items={[
                  {
                    value: 'size-scale',
                    label: 'Size Scale',
                    children: (
                      <ExampleBlock hideTitle title="Size Scale">
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="w-44">
                            <SplitActionButton label="sm" icon={Zap} variant="fill" size="sm" onClick={noop} dropdownItems={[{ id: '1', label: 'Option', onClick: noop }]} />
                          </div>
                          <div className="w-48">
                            <SplitActionButton label="md" icon={Zap} variant="fill" size="md" onClick={noop} dropdownItems={[{ id: '1', label: 'Option', onClick: noop }]} />
                          </div>
                          <div className="w-52">
                            <SplitActionButton label="lg" icon={Zap} variant="fill" size="lg" onClick={noop} dropdownItems={[{ id: '1', label: 'Option', onClick: noop }]} />
                          </div>
                        </div>
                      </ExampleBlock>
                    ),
                  },
                  {
                    value: 'disabled',
                    label: 'Disabled',
                    children: (
                      <ExampleBlock hideTitle title="Disabled">
                        <div className="w-48">
                          <SplitActionButton label="שיגור" icon={Zap} variant="fill" size="sm" disabled onClick={noop} dropdownItems={[{ id: '1', label: 'אפשרות א׳', onClick: noop }]} />
                        </div>
                      </ExampleBlock>
                    ),
                  },
                  {
                    value: 'loading',
                    label: 'Loading (click to test)',
                    children: (
                      <ExampleBlock hideTitle title="Loading (click to test)">
                        <div className="w-48">
                          <SplitActionButton label="שולח..." icon={Zap} variant="fill" size="sm" loading={loading === 'split-fill'} onClick={() => simulateLoading('split-fill')} dropdownItems={[{ id: '1', label: 'אפשרות א׳', onClick: noop }]} />
                        </div>
                      </ExampleBlock>
                    ),
                  },
                  {
                    value: 'with-badge',
                    label: 'With Badge (effector name inline)',
                    children: (
                      <ExampleBlock hideTitle title="With Badge (effector name inline)">
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="w-56">
                            <SplitActionButton label="שיבוש" badge="Regulus North" icon={Radio} variant="danger" size="sm" onClick={noop} dropdownItems={[
                              { id: '1', label: 'שיבוש כללי', icon: Radio, onClick: noop },
                              { id: '2', label: 'שיבוש ממוקד', icon: Crosshair, onClick: noop },
                            ]} />
                          </div>
                          <div className="w-56">
                            <SplitActionButton label="משבש אות..." badge="Regulus South" icon={Radio} variant="danger" size="sm" loading onClick={noop} dropdownItems={[
                              { id: '1', label: 'שיבוש כללי', onClick: noop },
                            ]} />
                          </div>
                        </div>
                      </ExampleBlock>
                    ),
                  },
                  {
                    value: 'grouped-dropdown',
                    label: 'Grouped Dropdown (RTL, effector selection)',
                    children: (
                      <ExampleBlock hideTitle title="Grouped Dropdown (RTL, effector selection)">
                        <div className="w-56">
                          <SplitActionButton label="שיבוש" badge="Regulus North" icon={Radio} variant="danger" size="sm" onClick={noop} dropdownItems={[]} dropdownGroups={[
                            { label: 'בחירת ג׳אמר', items: [
                              { id: 'eff-1', label: 'Regulus North (1.2 ק״מ)', active: true, onClick: noop },
                              { id: 'eff-2', label: 'Regulus South (3.8 ק״מ)', active: false, onClick: noop },
                            ]},
                            { items: [
                              { id: 'mode-1', label: 'שיבוש כללי', icon: Radio, onClick: noop },
                              { id: 'mode-2', label: 'שיבוש ממוקד', icon: Crosshair, onClick: noop },
                            ]},
                          ]} />
                        </div>
                      </ExampleBlock>
                    ),
                  },
                  {
                    value: 'ground-hostile',
                    label: 'Ground Hostile — Weapon Flow',
                    children: (
                      <ExampleBlock hideTitle title="Ground Hostile — Weapon Flow">
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="w-56">
                            <SplitActionButton label="כוון נשק" badge="משגר אלפא" icon={Crosshair} variant="danger" size="sm" onClick={noop} dropdownItems={[]} dropdownGroups={[
                              { label: 'בחירת משגר', items: [
                                { id: 'lchr-1', label: 'משגר אלפא (0.8 ק״מ)', active: true, onClick: noop },
                                { id: 'lchr-2', label: 'משגר בראבו (2.1 ק״מ)', active: false, onClick: noop },
                                { id: 'lchr-3', label: 'משגר גאמא (3.5 ק״מ)', active: false, onClick: noop },
                              ]},
                            ]} />
                          </div>
                          <div className="w-56">
                            <SplitActionButton label="מכוון..." badge="משגר אלפא" icon={Crosshair} variant="warning" size="sm" loading onClick={noop} dropdownItems={[]} dropdownGroups={[
                              { label: 'בחירת משגר', items: [
                                { id: 'lchr-1', label: 'משגר אלפא (0.8 ק״מ)', active: true, onClick: noop },
                              ]},
                            ]} />
                          </div>
                          <div className="w-56">
                            <SplitActionButton label="נעול על מטרה" badge="משגר אלפא" icon={Lock} variant="ghost" size="sm" disabled dimDisabledShell={false} onClick={noop} dropdownItems={[]} />
                          </div>
                        </div>
                      </ExampleBlock>
                    ),
                  },
                ]}
              />

              <SectionHeading>Class recipe</SectionHeading>
              <ClassNameRecipe
                entries={[
                  { label: 'Shell', className: 'flex w-full items-stretch gap-0.5 rounded' },
                  {
                    label: 'Primary segment',
                    note: 'a ui Button — same buttonVariants cva as the base Button',
                    className:
                      'flex flex-1 items-center justify-center gap-2 px-3 min-w-0 overflow-hidden rounded-s-[4px]',
                  },
                  {
                    label: 'Chevron segment',
                    note: 'a ui Button size="icon" (the DropdownMenuTrigger); width via BUTTON_SIZES[size].chevronMin',
                    className: 'flex shrink-0 items-center justify-center px-2 rounded-e-[4px]',
                  },
                  {
                    label: 'Menu content',
                    className:
                      'rounded-lg border-none p-1 bg-[#1c1c20] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_30px_rgba(0,0,0,0.5)]',
                  },
                  {
                    label: 'Menu item',
                    className:
                      'flex w-full flex-row items-center justify-start gap-2 rounded-md px-2.5 py-2 text-xs text-slate-11 cursor-pointer transition-[background-color,color] duration-150 ease-out hover:bg-state-hover-overlay hover:text-white focus:bg-white/[0.08] focus:text-white',
                  },
                ]}
              />
            </ComponentSection>
            )}

            {/* ────────────────────────────────────────────────────────────── */}
            {/*  PRIMITIVES — layout                                         */}
            {/* ────────────────────────────────────────────────────────────── */}

            {activeItem === 'accordion' && (
            <ComponentSection id="accordion" name="AccordionSection" description="Collapsible section with animated expand/collapse. Used inside cards for details, logs, and sensors.">
              <CodePreviewBlock name="AccordionSection" description="Collapsible section with animated expand/collapse. Used inside cards for details, logs, and sensors." tight code={accordionSectionSrc} relatedFiles={COMMON_FILES}>
                <div className="max-w-sm rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level1 }}>
                  <AccordionSection title="ברירת מחדל (סגור)" icon={Eye}>
                    <div className="p-3 text-xs text-n-9">תוכן AccordionSection</div>
                  </AccordionSection>
                  <AccordionSection title="פתוח כברירת מחדל" icon={History} defaultOpen>
                    <div className="p-3 text-xs text-n-9">תוכן AccordionSection שנפתח אוטומטית.</div>
                  </AccordionSection>
                  <AccordionSection title="עם פעולת כותרת" icon={Activity} headerAction={<StatusChip label="3" color="orange" />}>
                    <div className="p-3 text-xs text-n-9">AccordionSection עם badge בכותרת</div>
                  </AccordionSection>
                </div>
              </CodePreviewBlock>

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={accordionSectionSrc} name="AccordionSection" />

              <SectionHeading>Class recipe</SectionHeading>
              <ClassNameRecipe
                entries={[
                  {
                    label: 'Trigger',
                    className:
                      'flex w-full cursor-pointer items-center justify-between rounded-none bg-white/[0.08] p-[8px] transition-colors hover:bg-state-hover-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring',
                  },
                  { label: 'Title cluster', className: 'flex items-center gap-2 text-sm font-normal text-slate-11' },
                  {
                    label: 'Chevron',
                    className: 'text-slate-9 transition-transform duration-200 group-data-[state=open]:rotate-180',
                  },
                  {
                    label: 'Content',
                    className:
                      'overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
                  },
                  {
                    label: 'Content inner',
                    note: 'bg via CARD_TOKENS.elevation.overlay.level3 (inline style)',
                    className: 'flex flex-wrap px-[8px] py-[0px]',
                  },
                ]}
              />

            </ComponentSection>
            )}

            {activeItem === 'telemetry' && (
            <ComponentSection id="telemetry" name="TelemetryRow" description="Single telemetry metric display with icon, label, and monospace value. Laid out in a 3-column grid — rows wrap automatically based on item count.">
              <CodePreviewBlock name="TelemetryRow" description="Single telemetry metric display with icon, label, and monospace value. Laid out in a 3-column grid." tight code={telemetryRowSrc} relatedFiles={COMMON_FILES}>
                <div className="grid grid-cols-3 gap-x-4 gap-y-2 rounded-lg p-3" style={{ backgroundColor: SURFACE.level1 }}>
                  <TelemetryRow label="גובה" value="120m" icon={Navigation} />
                  <TelemetryRow label="מהירות" value="45 km/h" icon={Gauge} />
                  <TelemetryRow label="כיוון" value="270°" icon={Compass} />
                  <TelemetryRow label="מרחק" value="1.2 km" icon={MapPin} />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={telemetryRowSrc} name="TelemetryRow" />

              <SectionHeading>Examples</SectionHeading>
              <ExampleTabs
                items={[
                  {
                    value: 'three-items',
                    label: '3 items (single row)',
                    children: (
                      <ExampleBlock hideTitle title="3 items (single row)" tight>
                        <div className="grid grid-cols-3 gap-x-4 gap-y-2 rounded-lg p-3" style={{ backgroundColor: SURFACE.level1 }}>
                          <TelemetryRow label="גובה" value="120m" icon={Navigation} />
                          <TelemetryRow label="מהירות" value="45 km/h" icon={Gauge} />
                          <TelemetryRow label="כיוון" value="270°" icon={Compass} />
                        </div>
                      </ExampleBlock>
                    ),
                  },
                  {
                    value: 'six-items',
                    label: '6 items (2 rows)',
                    children: (
                      <ExampleBlock hideTitle title="6 items (2 rows)" tight>
                        <div className="grid grid-cols-3 gap-x-4 gap-y-2 rounded-lg p-3" style={{ backgroundColor: SURFACE.level1 }}>
                          <TelemetryRow label="גובה" value="120m" icon={Navigation} />
                          <TelemetryRow label="מהירות" value="45 km/h" icon={Gauge} />
                          <TelemetryRow label="כיוון" value="270°" icon={Compass} />
                          <TelemetryRow label="מרחק" value="1.2 km" icon={MapPin} />
                          <TelemetryRow label="RCS" value="0.01 m²" icon={Radio} />
                          <TelemetryRow label="סוג" value="DJI Mavic 3" icon={Eye} />
                        </div>
                      </ExampleBlock>
                    ),
                  },
                  {
                    value: 'two-items',
                    label: '2 items (partial row)',
                    children: (
                      <ExampleBlock hideTitle title="2 items (partial row)" tight>
                        <div className="grid grid-cols-3 gap-x-4 gap-y-2 rounded-lg p-3" style={{ backgroundColor: SURFACE.level1 }}>
                          <TelemetryRow label="גובה" value="120m" icon={Navigation} />
                          <TelemetryRow label="מהירות" value="45 km/h" icon={Gauge} />
                        </div>
                      </ExampleBlock>
                    ),
                  },
                ]}
              />

              <SectionHeading>Class recipe</SectionHeading>
              <ClassNameRecipe
                entries={[
                  { label: 'Row', className: 'w-full flex flex-col items-start justify-start py-1 gap-1' },
                  { label: 'Label cluster', className: 'flex items-center gap-1.5 shrink-0' },
                  { label: 'Label', className: 'text-xs text-slate-10' },
                  { label: 'Value', className: 'text-sm text-slate-11 font-mono tabular-nums truncate text-start' },
                ]}
              />
            </ComponentSection>
            )}

            {activeItem === 'copy-button' && (
            <ComponentSection id="copy-button" name="CopyButton" description="Quiet, hover-revealed icon button that copies a single value to the clipboard. Designed to live inside a Tailwind `group/copy` row so it only appears for the row the operator is pointing at. On success the Check glyph lands with visible presence (~2px larger than Copy, stroke 3 vs 2, color zinc-50 vs zinc-200, overshoot keyframes 0.85 → 1.06 → 1) — still neutral, no green. 40×40 hit target, touch-fallback always-visible, `cursor-pointer`, reduced-motion safe (collapses to a hard swap).">
              <CodePreviewBlock name="CopyButton" description="Per-row copy affordance composed exactly as it ships inside CardIdentity — w-fit value wrapper, absolute gradient-fade overlay, keyboard-only focus reveal. Hover a row to see the button fade in." tight code={copyButtonSrc} relatedFiles={COMMON_FILES}>
                {/*
                  Mirrors the CardIdentity composition: each row is `group/copy`,
                  the value sits in a `relative w-fit` wrapper so the icon rides
                  immediately after the text, and the gradient overlay fades into
                  SURFACE.level2 (the AccordionSection surface CardIdentity
                  actually renders on). Background here is SURFACE.level1 to match
                  the real card surface that sits behind that accordion.
                */}
                <div className="max-w-sm rounded-lg p-3 flex flex-col gap-3" style={{ backgroundColor: SURFACE.level1 }}>
                  {[
                    { label: 'Model', value: 'DJI Matrice 4 T/E', copyLabel: 'Copy model' },
                    { label: 'Serial Number', value: 'f7k3c251f00cx623', copyLabel: 'Copy serial number' },
                  ].map((row) => (
                    <div key={row.label} className="group/copy w-full flex flex-col items-start py-1 gap-1">
                      <span className="text-xs text-slate-10">{row.label}</span>
                      <div className="relative w-fit">
                        <span
                          dir="auto"
                          className="block w-fit text-xs text-slate-11 font-sans tabular-nums break-all text-end"
                          style={{ unicodeBidi: 'isolate', fontVariantNumeric: 'tabular-nums slashed-zero' }}
                        >
                          {row.value}
                        </span>
                        <div
                          className="pointer-events-none absolute inset-y-0 end-0 flex items-center justify-end ps-4 pe-0 bg-gradient-to-r rtl:bg-gradient-to-l from-transparent to-[var(--card-fade-bg)] to-50% opacity-0 group-hover/copy:opacity-100 has-[:focus-visible]:opacity-100 has-[[data-copied]]:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-150 ease-out"
                          style={{ ['--card-fade-bg' as string]: SURFACE.level2 } as CSSProperties}
                        >
                          <CopyButton
                            value={row.value}
                            copyLabel={row.copyLabel}
                            copiedLabel="Copied"
                            alwaysVisible
                            className="pointer-events-auto"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CodePreviewBlock>

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={copyButtonSrc} name="CopyButton" />

              <SectionHeading>Examples</SectionHeading>
              <ExampleTabs
                items={[
                  {
                    value: 'always-visible',
                    label: 'Always visible (no group/copy parent)',
                    children: (
                      <ExampleBlock hideTitle title="Always visible (no group/copy parent)" tight>
                        <div className="max-w-sm rounded-lg p-3 flex items-center gap-2" style={{ backgroundColor: SURFACE.level1 }}>
                          <span
                            className="flex-1 min-w-0 text-sm text-slate-11 font-mono tabular-nums"
                            style={{ fontVariantNumeric: 'tabular-nums slashed-zero' }}
                          >
                            f7k3c251f00cx623
                          </span>
                          <CopyButton value="f7k3c251f00cx623" copyLabel="Copy serial number" copiedLabel="Copied" alwaysVisible />
                        </div>
                      </ExampleBlock>
                    ),
                  },
                  {
                    value: 'disabled-empty',
                    label: 'Disabled (empty value)',
                    children: (
                      <ExampleBlock hideTitle title="Disabled (empty value)" tight>
                        <div className="max-w-sm rounded-lg p-3 flex items-center gap-2" style={{ backgroundColor: SURFACE.level1 }}>
                          <span className="flex-1 min-w-0 text-sm text-slate-9 italic">no value</span>
                          <CopyButton value="" copyLabel="Copy" copiedLabel="Copied" alwaysVisible />
                        </div>
                      </ExampleBlock>
                    ),
                  },
                  {
                    value: 'size-md',
                    label: 'Size: md',
                    children: (
                      <ExampleBlock hideTitle title="Size: md" tight>
                        <div className="max-w-sm rounded-lg p-3 flex items-center gap-2" style={{ backgroundColor: SURFACE.level1 }}>
                          <span
                            className="flex-1 min-w-0 text-sm text-slate-11 font-mono tabular-nums"
                            style={{ fontVariantNumeric: 'tabular-nums slashed-zero' }}
                          >
                            TGT-0042
                          </span>
                          <CopyButton value="TGT-0042" copyLabel="Copy target id" copiedLabel="Copied" size="md" alwaysVisible />
                        </div>
                      </ExampleBlock>
                    ),
                  },
                ]}
              />

              <SectionHeading>Class recipe</SectionHeading>
              <ClassNameRecipe
                entries={[
                  {
                    label: 'Button base',
                    note: 'box via SIZES[size].box (size-6 / size-7)',
                    className:
                      'relative shrink-0 inline-flex items-center justify-center rounded-md cursor-pointer text-slate-9 hover:text-slate-11 focus-visible:text-slate-11 data-[copied]:text-slate-12',
                  },
                  { label: 'Hit target', className: "before:absolute before:inset-[-8px] before:content-['']" },
                  {
                    label: 'Reveal',
                    note: 'parent row needs group/copy',
                    className:
                      'opacity-0 group-hover/copy:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 data-[copied]:opacity-100',
                  },
                  { label: 'Focus ring', className: 'outline-none focus-visible:ring-1 focus-visible:ring-state-focus-ring' },
                  { label: 'Transition', className: 'transition-[opacity,color] duration-150 ease-out' },
                ]}
              />
            </ComponentSection>
            )}

            {activeItem === 'card-header' && (
            <ComponentSection id="card-header" name="CardHeader" description="Top row of a TargetCard — icon, title, subtitle, status chip, badge, and chevron.">
              <CodePreviewBlock name="CardHeader" description="Top row of a TargetCard — icon, title, subtitle, status chip, badge, and chevron." tight code={cardHeaderSrc} relatedFiles={COMMON_FILES}>
                <div className="rounded-lg p-2" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardHeader
                    icon={ShieldAlert}
                    iconColor="#ef4444"
                    iconBgActive
                    title="רחפן DJI Mavic 3"
                    subtitle="TGT-0042"
                    status={<StatusChip label="פעיל" color="red" />}
                    open={false}
                  />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={cardHeaderSrc} name="CardHeader" />

              <SectionHeading>Examples</SectionHeading>
              <ExampleTabs
                items={[
                  {
                    value: 'open-state',
                    label: 'Open State',
                    children: (
                      <ExampleBlock hideTitle title="Open State" tight>
                        <div className="rounded-lg p-2" style={{ backgroundColor: SURFACE.level1 }}>
                          <CardHeader icon={Eye} title="עצם לא מזוהה" subtitle="TGT-0099" status={<StatusChip label="חשוד" color="orange" />} open />
                        </div>
                      </ExampleBlock>
                    ),
                  },
                  {
                    value: 'minimal',
                    label: 'Minimal (no icon, no badge)',
                    children: (
                      <ExampleBlock hideTitle title="Minimal (no icon, no badge)" tight>
                        <div className="rounded-lg p-2" style={{ backgroundColor: SURFACE.level1 }}>
                          <CardHeader title="יעד בסיסי" subtitle="TGT-0001" open={false} />
                        </div>
                      </ExampleBlock>
                    ),
                  },
                  {
                    value: 'affiliation',
                    label: 'Affiliation (hover icon for IFF tooltip)',
                    children: (
                      <ExampleBlock hideTitle title="Affiliation (hover icon for IFF tooltip)" tight>
                        <div className="flex flex-col gap-2">
                          <div className="rounded-lg p-2" style={{ backgroundColor: SURFACE.level1 }}>
                            <CardHeader icon={ShieldAlert} affiliation="hostile" title="רחפן עוין" subtitle="TGT-0042" open={false} />
                          </div>
                          <div className="rounded-lg p-2" style={{ backgroundColor: SURFACE.level1 }}>
                            <CardHeader icon={ShieldAlert} affiliation="friendly" title="רחפן ידידותי" subtitle="TGT-0043" open={false} />
                          </div>
                          <div className="rounded-lg p-2" style={{ backgroundColor: SURFACE.level1 }}>
                            <CardHeader icon={ShieldAlert} affiliation="unknown" title="עצם לא מזוהה" subtitle="TGT-0044" open={false} />
                          </div>
                        </div>
                      </ExampleBlock>
                    ),
                  },
                ]}
              />

              <SectionHeading>Class recipe</SectionHeading>
              <ClassNameRecipe
                entries={[
                  { label: 'Root', note: 'gap via CARD_TOKENS.header.gap (inline)', className: 'flex justify-between items-center' },
                  { label: 'Lead cluster', className: 'flex items-center gap-2 min-w-0 flex-1' },
                  {
                    label: 'Icon box',
                    note: 'size/radius/bg via CARD_TOKENS.iconBox (inline)',
                    className: 'flex items-center justify-center shrink-0',
                  },
                  {
                    label: 'Title',
                    note: 'color via CARD_TOKENS.title (inline)',
                    className: 'text-sm font-semibold text-balance leading-tight truncate',
                  },
                  {
                    label: 'Subtitle',
                    note: 'color via CARD_TOKENS.subtitle (inline)',
                    className: 'text-xs font-mono truncate',
                  },
                  { label: 'Trailing cluster', className: 'flex gap-1.5 items-center shrink-0' },
                  { label: 'Chevron', className: 'text-slate-9 shrink-0 transition-transform duration-200' },
                ]}
              />
            </ComponentSection>
            )}

            {activeItem === 'card-media' && (
            <ComponentSection id="card-media" name="CardMedia" description="Image or video slot for target surveillance feed. Supports live badge, playback controls, and lightbox expansion.">
              <CodePreviewBlock name="CardMedia" description="Image or video slot for target surveillance feed. Supports live badge, playback controls, and lightbox expansion." code={cardMediaSrc} relatedFiles={COMMON_FILES}>
                <div className="flex flex-wrap gap-4">
                  <div className="w-64 rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level0 }}>
                    <CardMedia
                      src="https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400&h=200&fit=crop"
                      type="image"
                      badge="threat"
                      alt="Drone surveillance image"
                    />
                  </div>
                  <div className="w-64 rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level0 }}>
                    <CardMedia
                      src="https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400&h=200&fit=crop"
                      type="image"
                      badge="bird"
                      alt="Bird detection image"
                    />
                  </div>
                </div>
              </CodePreviewBlock>

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={cardMediaSrc} name="CardMedia" />

              <SectionHeading>Badge Types</SectionHeading>
              <VariantGrid
                entries={Object.entries(MEDIA_BADGE_CONFIG).map(([key, val]) => ({ key, usage: val.usage }))}
                renderSample={(key) => {
                  const bc = MEDIA_BADGE_CONFIG[key as keyof typeof MEDIA_BADGE_CONFIG];
                  const Icon = bc.icon;
                  return <Icon size={20} className={bc.color} />;
                }}
              />

              <SectionHeading>Class recipe</SectionHeading>
              <ClassNameRecipe
                entries={[
                  {
                    label: 'Frame',
                    note: 'height h-[160px] video / h-[100px] image',
                    className: 'relative w-full overflow-hidden group/media bg-black',
                  },
                  {
                    label: 'Image',
                    className:
                      'w-full h-full object-cover opacity-70 group-hover/media:opacity-90 transition-opacity grayscale contrast-125',
                  },
                  { label: 'Scrim', className: 'absolute inset-0 bg-black/20 pointer-events-none' },
                  { label: 'Live badge', className: 'flex items-center gap-1 bg-black/80 px-1.5 py-0.5 rounded-sm' },
                  {
                    label: 'Tracking label',
                    className:
                      'absolute bottom-2 start-2 flex items-center gap-1 bg-cyan-900/80 shadow-[0_0_0_1px_rgba(34,211,238,0.3)] px-2 py-0.5 rounded',
                  },
                  {
                    label: 'Expand affordance',
                    className:
                      'flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-[0_0_0_1px_rgba(255,255,255,0.15)]',
                  },
                ]}
              />
            </ComponentSection>
            )}

            {activeItem === 'card-actions' && (
            <ComponentSection id="card-actions" name="CardActions" description="Action bar for TargetCard. Composes ActionButton, SplitActionButton, and the confirm pattern. Grouped effector/investigation layout, flat grid, and double-confirm dialogs.">
              <CodePreviewBlock name="CardActions" description="Action bar for TargetCard. Composes ActionButton, SplitActionButton, and the confirm pattern." tight code={cardActionsSrc} relatedFiles={CARD_ACTIONS_FILES}>
                <div className="max-w-sm rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardActions actions={sampleActions} />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={cardActionsSrc} name="CardActions" />

              <SectionHeading>Examples</SectionHeading>
              <ExampleTabs
                items={[
                  {
                    value: 'flat-grid',
                    label: 'Flat Grid (no groups)',
                    children: (
                      <ExampleBlock hideTitle title="Flat Grid (no groups)" tight>
                        <div className="max-w-sm rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level1 }}>
                          <CardActions actions={[
                            { id: 'cam', label: 'הפנה מצלמה', icon: Eye, variant: 'fill', size: 'sm', onClick: noop },
                            { id: 'del', label: 'מחק', icon: Trash2, variant: 'danger', size: 'sm', onClick: noop },
                            { id: 'cancel', label: 'ביטול', icon: Ban, variant: 'ghost', size: 'sm', onClick: noop },
                          ]} />
                        </div>
                      </ExampleBlock>
                    ),
                  },
                  {
                    value: 'with-confirm',
                    label: 'With Confirm Dialog',
                    children: (
                      <ExampleBlock hideTitle title="With Confirm Dialog" tight>
                        <div className="max-w-sm rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level1 }}>
                          <CardActions actions={[
                            {
                              id: 'danger-confirm', label: 'שיגור טיל', icon: Zap, variant: 'danger', size: 'lg',
                              onClick: noop,
                              confirm: { title: 'אישור שיגור', description: 'פעולה זו אינה הפיכה. האם אתה בטוח?', confirmLabel: 'שגר', doubleConfirm: true },
                            },
                            { id: 'cancel-confirm', label: 'ביטול', icon: Ban, variant: 'ghost', size: 'sm', onClick: noop },
                          ]} />
                        </div>
                      </ExampleBlock>
                    ),
                  },
                ]}
              />

              <SectionHeading>Class recipe</SectionHeading>
              <ClassNameRecipe
                entries={[
                  { label: 'Container', className: 'px-2 py-2' },
                  { label: 'Stack', className: 'flex flex-col gap-1.5' },
                  {
                    label: 'Secondary grid',
                    note: 'columns via inline gridTemplateColumns (max 4)',
                    className: 'grid gap-1.5',
                  },
                  {
                    label: 'Status strip',
                    className:
                      'w-full min-h-[30px] flex items-center justify-center gap-2 px-3 text-xs font-medium text-slate-11 cursor-default select-none pointer-events-none',
                  },
                  { label: 'Confirm panel', note: 'surface via CARD_TOKENS (inline)', className: 'mt-1 p-3 rounded' },
                  {
                    label: 'Confirm button',
                    className:
                      'flex-1 h-8 rounded bg-[oklch(0.348_0.111_17)] hover:bg-[oklch(0.445_0.151_17)] active:bg-[oklch(0.295_0.082_17)] text-[oklch(0.927_0.062_17)] ring-1 ring-inset ring-[oklch(0.348_0.111_17_/_0.4)] text-xs font-semibold transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring',
                  },
                  {
                    label: 'Cancel button',
                    className:
                      'flex-1 h-8 rounded bg-[oklch(0.302_0_0)] hover:bg-[oklch(0.388_0_0)] active:bg-[oklch(0.238_0_0)] text-white text-xs font-medium transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring',
                  },
                ]}
              />
            </ComponentSection>
            )}

            {activeItem === 'card-details' && (
            <ComponentSection id="card-details" name="CardDetails" description="Collapsible telemetry accordion. Composes AccordionSection and TelemetryRow in a fixed 2-column grid for metrics. Per-field copy lives on CardIdentity; this section is read-only.">
              <CodePreviewBlock name="CardDetails" description="Collapsible telemetry accordion in a fixed 2-column grid; uses AccordionSection and TelemetryRow." tight code={cardDetailsSrc} relatedFiles={CARD_DETAILS_FILES}>
                <div className="max-w-sm rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardDetails rows={sampleDetailRows} defaultOpen />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={cardDetailsSrc} name="CardDetails" />

              <SectionHeading>Class recipe</SectionHeading>
              <ClassNameRecipe
                entries={[
                  { label: 'Body', note: 'wraps AccordionSection + TelemetryRow', className: 'w-full py-1' },
                  { label: 'Metric grid', className: 'w-full grid grid-cols-2 gap-x-8 gap-y-2' },
                ]}
              />

            </ComponentSection>
            )}

            {activeItem === 'card-identity' && (
            <ComponentSection id="card-identity" name="CardIdentity" description="Collapsible 'General info' accordion that surfaces drone identity (model, serial number, future identity fields) as stacked rows. Sits above CardDetails because identity precedes telemetry in operator scanning order. Each value sits in a `w-fit` wrapper anchored to the row's inline-start edge, so the copy icon rides immediately after the text instead of being pinned to the row's far end. A gradient-fade overlay dissolves overflowing values into the icon. Reveal triggers on row hover, `:focus-visible` (keyboard only — never on mouse-click focus), the copied data-attribute, and touch — never on a plain `:focus`.">
              <CodePreviewBlock name="CardIdentity" description="Stacked identity rows in a collapsible 'General info' section. Hover a row to reveal the copy button overlay; long values fade under the gradient mask." tight code={cardIdentitySrc} relatedFiles={COMMON_FILES}>
                {/*
                  Preview uses SURFACE.level1 to match the real card context:
                  the card itself is bg-transparent over the sidebar, and
                  CardIdentity sits inside an AccordionSection that overlays
                  rgba(255,255,255,0.08) on top of that — landing on
                  SURFACE.level2, which is exactly what the gradient mask
                  inside CardIdentity fades into.
                */}
                <div className="max-w-sm rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardIdentity
                    rows={[
                      { label: 'Drone name', value: 'Drone 1' },
                      { label: 'Model', value: 'DJI Matrice 4 T/E' },
                      { label: 'Serial Number', value: 'f7k3c251f00cx623' },
                      { label: 'Long ID (wraps via break-all)', value: 'AB-12CD-34EF-56GH-78IJ-90KL-MNOPQRST' },
                    ]}
                    title="General info"
                    copyLabel="Copy"
                    copiedLabel="Copied"
                    defaultOpen
                  />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={cardIdentitySrc} name="CardIdentity" />

              <SectionHeading>Class recipe</SectionHeading>
              <ClassNameRecipe
                entries={[
                  { label: 'Body', className: 'w-full py-1' },
                  { label: 'Grid', className: 'w-full grid grid-cols-2 gap-x-8 gap-y-2' },
                  {
                    label: 'Row',
                    note: 'group/copy scopes the copy reveal',
                    className: 'group/copy w-full flex flex-col items-start py-1 gap-1 min-w-0',
                  },
                  { label: 'Label', className: 'text-xs text-slate-10' },
                  {
                    label: 'Value',
                    note: 'tabular-nums slashed-zero (inline)',
                    className: 'block w-fit text-xs text-slate-11 font-sans tabular-nums break-all text-end',
                  },
                  {
                    label: 'Fade overlay',
                    note: 'fade bg via SURFACE.level3 (inline var)',
                    className:
                      'pointer-events-none absolute inset-y-0 end-0 flex items-center justify-end ps-4 pe-0 bg-gradient-to-r rtl:bg-gradient-to-l from-transparent to-[var(--card-fade-bg)] to-50% opacity-0 group-hover/copy:opacity-100 has-[:focus-visible]:opacity-100 has-[[data-copied]]:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-150 ease-out',
                  },
                ]}
              />

            </ComponentSection>
            )}

            {activeItem === 'card-sensors' && (
            <ComponentSection id="card-sensors" name="CardSensors" description="Lists detecting sensors for a target with type, distance, and timestamp. Supports read-only and interactive modes.">
              <CodePreviewBlock name="CardSensors" description="Lists detecting sensors for a target with type, distance, and timestamp. Supports read-only and interactive modes." tight code={cardSensorsSrc} relatedFiles={COMMON_FILES}>
                <div className="max-w-sm rounded-lg overflow-hidden p-1" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardSensors sensors={sampleSensors} />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={cardSensorsSrc} name="CardSensors" />

              <SectionHeading>Examples</SectionHeading>
              <ExampleBlock title="Clickable (interactive)" tight>
                <div className="max-w-sm rounded-lg overflow-hidden p-1" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardSensors sensors={sampleSensors} onSensorClick={(id) => console.log('sensor clicked:', id)} />
                </div>
              </ExampleBlock>

              <SectionHeading>Class recipe</SectionHeading>
              <ClassNameRecipe
                entries={[
                  {
                    label: 'List',
                    note: 'top hairline via CARD_TOKENS.surface.level2 (inline)',
                    className: 'flex flex-col gap-2 w-full',
                  },
                  {
                    label: 'Row',
                    note: 'row bg via CARD_TOKENS.surface.level4 (inline)',
                    className:
                      'flex items-center gap-2 text-xs text-white hover:bg-state-hover-overlay rounded px-2 py-1.5 transition-colors group/sensor relative w-full text-end',
                  },
                  {
                    label: 'Row (interactive)',
                    className:
                      'cursor-pointer font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring active:bg-state-pressed',
                  },
                  { label: 'Timestamp', className: 'text-xs text-white font-mono tabular-nums' },
                  { label: 'Distance', className: 'text-xs text-slate-10 font-mono tabular-nums' },
                ]}
              />
            </ComponentSection>
            )}

            {activeItem === 'card-log' && (
            <ComponentSection id="card-log" name="CardLog" description="Chronological event log accordion with newest-first ordering and expand-all.">
              <CodePreviewBlock name="CardLog" description="Chronological event log accordion with newest-first ordering and expand-all." tight code={cardLogSrc} relatedFiles={CARD_LOG_FILES}>
                <div className="max-w-sm rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardLog entries={sampleLogEntries} maxVisible={4} defaultOpen />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={cardLogSrc} name="CardLog" />

              <SectionHeading>Class recipe</SectionHeading>
              <ClassNameRecipe
                entries={[
                  { label: 'Body', className: 'flex flex-col py-2 px-1' },
                  { label: 'Entry row', className: 'flex items-center justify-center gap-2.5 mb-2 relative w-full' },
                  {
                    label: 'Bullet',
                    note: 'bg via CARD_TOKENS.surface.level1 (inline)',
                    className: 'w-[11px] h-[11px] rounded-full shadow-[0_0_0_1px_rgba(255,255,255,0.2)] shrink-0 mt-0.5 z-[1]',
                  },
                  { label: 'Label', className: 'text-xs text-slate-11' },
                  { label: 'Time', className: 'text-xs text-white/50 font-mono shrink-0 tabular-nums leading-6 align-middle' },
                  {
                    label: 'Show more',
                    className: 'w-full text-center text-xs text-white hover:text-slate-11 transition-colors py-0.5',
                  },
                ]}
              />

            </ComponentSection>
            )}

            {activeItem === 'card-closure' && (
            <ComponentSection id="card-closure" name="CardClosure" description="Outcome selection grid for closing a detection event. Operator picks the resolution reason.">
              <CodePreviewBlock name="CardClosure" description="Outcome selection grid for closing a detection event. Operator picks the resolution reason." tight code={cardClosureSrc} relatedFiles={COMMON_FILES}>
                <div className="max-w-sm rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardClosure outcomes={sampleClosureOutcomes} onSelect={(id) => console.log('closure:', id)} />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={cardClosureSrc} name="CardClosure" />

              <SectionHeading>Class recipe</SectionHeading>
              <ClassNameRecipe
                entries={[
                  {
                    label: 'Container',
                    note: 'top hairline via CARD_TOKENS.surface.level2 (inline)',
                    className: 'p-3 space-y-2',
                  },
                  { label: 'Header', className: 'flex items-center gap-2' },
                  { label: 'Title', className: 'text-xs font-bold text-slate-11' },
                  { label: 'Outcome grid', className: 'grid grid-cols-2 gap-1.5' },
                  {
                    label: 'Outcome button',
                    note: 'surface via CARD_TOKENS.surface.level3 (inline)',
                    className:
                      'h-auto min-h-0 w-full justify-start px-2.5 py-2 rounded text-slate-11 transition-colors text-xs font-medium text-end gap-1.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring hover:bg-state-hover-overlay',
                  },
                ]}
              />

            </ComponentSection>
            )}

            {activeItem === 'card-states' && (
            <ComponentSection id="card-states" name="Card States" description="Interactive playground to explore how each detection lifecycle state affects the card's visual treatment — spine accent, icon design, ring, opacity, status chip, and closure type.">
              <CardStatePlayground />

              <SectionHeading>Class recipe</SectionHeading>
              <ClassNameRecipe
                entries={[
                  {
                    label: 'Card shell',
                    note: 'state visuals derive from TargetCard + useCardSlots',
                    className:
                      'group/card relative w-full gap-0 overflow-hidden border-0 bg-transparent p-0 text-white shadow-none transition-colors rounded-none',
                  },
                  {
                    label: 'Header (hover / selected / focus)',
                    note: 'selected bg + completed saturate/brightness are inline (CARD_TOKENS)',
                    className:
                      'transition-colors cursor-pointer hover:bg-state-hover-overlay focus-visible:ring-2 focus-visible:ring-state-focus-ring focus-visible:outline-none',
                  },
                  {
                    label: 'Content reveal',
                    className:
                      'overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
                  },
                ]}
              />
            </ComponentSection>
            )}

            {activeItem === 'target-card' && (
            <ComponentSection id="target-card" name="TargetCard" description="The core card shell. Composes CardHeader with slot children via the useCardSlots hook. These examples use real Detection mock data and the same composition as the main app.">
              <CodePreviewBlock name="TargetCard" description="The core card shell. Composes CardHeader with slot children via the useCardSlots hook." tight code={targetCardSrc} relatedFiles={COMMON_FILES}>
                <div className="w-96 mx-auto">
                  <StyleguideUnifiedCard detection={cuas_classified} defaultOpen />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={targetCardSrc} name="TargetCard" />

              <SectionHeading>Examples</SectionHeading>
              <ExampleTabs
                items={[
                  {
                    value: 'mitigating',
                    label: 'Mitigating (active jam)',
                    children: (
                      <ExampleBlock hideTitle title="Mitigating (active jam)" tight>
                        <div className="w-96 mx-auto">
                          <StyleguideUnifiedCard detection={cuas_mitigating} defaultOpen />
                        </div>
                      </ExampleBlock>
                    ),
                  },
                  {
                    value: 'completed',
                    label: 'Completed (resolved)',
                    children: (
                      <ExampleBlock hideTitle title="Completed (resolved)" tight>
                        <div className="w-96 mx-auto">
                          <StyleguideUnifiedCard detection={cuas_bda_complete} defaultOpen={false} />
                        </div>
                      </ExampleBlock>
                    ),
                  },
                ]}
              />

              <SectionHeading>Class recipe</SectionHeading>
              <ClassNameRecipe
                entries={[
                  { label: 'Outer', note: 'marginBottom via CARD_TOKENS.container (inline)', className: 'w-full' },
                  {
                    label: 'Card shell',
                    note: 'bg/radius/shadow + completed saturate/brightness via CARD_TOKENS (inline)',
                    className:
                      'group/card relative w-full gap-0 overflow-hidden border-0 bg-transparent p-0 text-white shadow-none transition-colors rounded-none',
                  },
                  {
                    label: 'Header trigger',
                    note: 'padding + selected bg via CARD_TOKENS (inline)',
                    className:
                      'transition-colors cursor-pointer hover:bg-state-hover-overlay focus-visible:ring-2 focus-visible:ring-state-focus-ring focus-visible:outline-none',
                  },
                  {
                    label: 'Content',
                    className:
                      'overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
                  },
                  {
                    label: 'Slot stack',
                    note: 'bg + inset hairline via CARD_TOKENS.content (inline)',
                    className: 'flex flex-col gap-px',
                  },
                ]}
              />
            </ComponentSection>
            )}

            {activeItem === 'filter-bar' && (
            <ComponentSection id="filter-bar" name="FilterBar" description="Search input + data-driven filter dropdowns. Pass any number of filter dimensions (status, type, origin, severity, ...) as a `filters: FilterDef[]` array; each renders as a popover with multi-select options.">
              <CodePreviewBlock name="FilterBar" description="Data-driven multi-filter bar." tight code={filterBarSrc} relatedFiles={COMMON_FILES}>
                <div className="w-96 mx-auto rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level1 }}>
                  <FilterBar
                    query={filterBarQuery}
                    onQueryChange={setFilterBarQuery}
                    filters={FILTER_BAR_DEMO_DEFS}
                    selections={filterBarSelections}
                    onFilterChange={(filterId, next) =>
                      setFilterBarSelections((prev) => ({ ...prev, [filterId]: next }))
                    }
                    onReset={() => {
                      setFilterBarQuery('');
                      setFilterBarSelections({});
                    }}
                  />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={filterBarSrc} name="FilterBar" />

              <SectionHeading>Class recipe</SectionHeading>
              <ClassNameRecipe
                entries={[
                  { label: 'Bar', className: 'border-b border-white/5 px-2 py-1.5' },
                  { label: 'Top row', className: 'flex items-center gap-1.5' },
                  {
                    label: 'Search input',
                    className:
                      'h-7 w-full rounded bg-white/[0.04] ps-7 pe-7 text-xs text-slate-12 shadow-[0_0_0_1px_rgba(255,255,255,0.07)] placeholder:text-slate-9 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400/40 focus-visible:shadow-[0_0_0_1px_rgba(56,189,248,0.35)]',
                  },
                  {
                    label: 'Reset button',
                    className:
                      'inline-flex h-7 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded bg-white/[0.06] px-2 text-xs font-medium text-white transition-[background-color,transform] duration-150 hover:bg-state-hover-overlay focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-state-focus-ring active:scale-[0.99]',
                  },
                  {
                    label: 'Filter row',
                    note: 'columns via inline gridTemplateColumns',
                    className: 'grid items-center gap-1.5 mt-1.5',
                  },
                  {
                    label: 'Filter trigger',
                    note: 'active/open → bg-sky-500/[0.12]',
                    className:
                      'inline-flex h-7 w-full cursor-pointer items-center justify-center gap-1.5 rounded px-2 text-xs font-medium text-white transition-[background-color,transform] duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-state-focus-ring active:scale-[0.99]',
                  },
                  {
                    label: 'Popover',
                    className:
                      'w-64 overflow-hidden rounded-lg p-0.5 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.25),0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl',
                  },
                  {
                    label: 'Option row',
                    className:
                      'flex h-7 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-start text-xs transition-colors duration-150 focus-within:bg-white/10 focus-within:outline-none',
                  },
                ]}
              />

            </ComponentSection>
            )}

            {activeItem === 'device-card' && (
            <ComponentSection id="device-card" name="Device Card">
              <CodePreviewBlock name="DeviceRow" description="The whole card — a camera row expanded. The header carries the Show-on-map cluster; the footer holds Watch video plus the 3-dot overflow (Logs + Notifications). Toggle it closed/open." tight code={deviceRowSrc} relatedFiles={DEVICE_CARD_FILES}>
                <StyleguideDeviceTile>
                  <DeviceCardRowDemo device={deviceCardEdgeCases[0]} />
                </StyleguideDeviceTile>
              </CodePreviewBlock>

              <SectionHeading>Examples</SectionHeading>

              <AnchoredExampleTabs
                activeAnchor={activeAnchor}
                onAnchorChange={handleExampleTabAnchor}
                tabs={[
                  {
                    value: 'health',
                    label: 'Health',
                    anchorIds: ['device-health', 'device-health-tooltip'],
                    children: (
                      <div>

              {/* ── Health tile ─────────────────────────────────── */}
              <ExampleBlock id="device-health" title="Health — the icon tile (binary: ok / error)">
                <div className="flex flex-col gap-6 w-full" dir="ltr">
                  <div className="flex flex-wrap items-start gap-8">
                    {[
                      { key: 'ok', tile: DEVICE_HEALTH_VISUAL.ok.tile, iconFill: DEVICE_HEALTH_VISUAL.ok.iconFill },
                      { key: 'error', tile: DEVICE_HEALTH_VISUAL.error.tile, iconFill: DEVICE_HEALTH_VISUAL.error.iconFill },
                    ].map((s) => (
                      <div key={s.key} className="flex flex-col items-center gap-2">
                        <div
                          className={`relative w-8 h-8 rounded flex items-center justify-center ${s.tile}`}
                          data-handoff-component="device-icon"
                          data-health={s.key}
                        >
                          <CameraIcon size={20} fill={s.iconFill} />
                        </div>
                        <span className="text-xs font-mono text-n-9">{s.key}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-n-9">
                    Two states only: the tile is neutral while the asset works and red
                    (<code className="font-mono text-n-10">--accent-danger-soft</code>) when it has an error.
                    The cause — offline, malfunction, low battery, stale link — is text in the tooltip
                    and connection chip, never a separate color tier.
                  </p>
                </div>
              </ExampleBlock>

              {/* ── Health tooltip edge cases ────────────────────── */}
              <ExampleBlock id="device-health-tooltip" title="Health tooltip — edge cases (titled header + fence)">
                <div className="w-full">
                  <p className="mb-6 text-xs text-n-9">
                    The titled health tooltip across everything it must carry — both tones, error-count
                    extremes (badge hidden at 0, “99+” clamp), short / long / missing reasons, partial or
                    absent fences, and an over-long severity label — each in English (LTR) and Hebrew (RTL).
                  </p>
                  <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
                    {STYLEGUIDE_HEALTH_TIP_SCENARIOS.map((sc) => (
                      <div key={sc.label} className="flex flex-col gap-3">
                        <div className="text-xs-plus leading-snug text-n-9">{sc.label}</div>
                        <div className="flex flex-wrap items-start gap-8">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-2xs font-medium uppercase tracking-wide text-n-8">EN</span>
                            <StyleguideHealthTooltip
                              dir="ltr"
                              tone={sc.tone}
                              errorCount={sc.errorCount}
                              connectionColor={sc.connectionColor}
                              severity={sc.en.severity}
                              reason={sc.en.reason}
                              connectionLabel={sc.en.connection}
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <span className="text-2xs font-medium uppercase tracking-wide text-n-8">עברית</span>
                            <StyleguideHealthTooltip
                              dir="rtl"
                              tone={sc.tone}
                              errorCount={sc.errorCount}
                              connectionColor={sc.connectionColor}
                              severity={sc.he.severity}
                              reason={sc.he.reason}
                              connectionLabel={sc.he.connection}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ExampleBlock>

                      </div>
                    ),
                  },
                  {
                    value: 'anatomy',
                    label: 'Anatomy',
                    anchorIds: ['device-detail-grid', 'device-camera-preview', 'device-header-cluster', 'device-row'],
                    children: (
                      <div>

              {/* ── Detail grid ─────────────────────────────────── */}
              <ExampleBlock id="device-detail-grid" title="Detail grid — registry-driven stat rows">
                <div className="flex flex-col gap-4">
                  <StyleguideDeviceTile>
                    <DeviceCardRowDemo device={deviceCardEdgeCases[1]} />
                  </StyleguideDeviceTile>
                  <StyleguideDeviceTile>
                    <DeviceCardRowDemo device={deviceCardEdgeCases[2]} />
                  </StyleguideDeviceTile>
                </div>
              </ExampleBlock>

              {/* ── Camera preview ──────────────────────────────── */}
              <ExampleBlock id="device-camera-preview" title="Camera preview hero (camera rows only)">
                <StyleguideDeviceTile>
                  <DeviceCardRowDemo device={deviceCardEdgeCases[0]} />
                </StyleguideDeviceTile>
              </ExampleBlock>

              {/* ── Header primary cluster ──────────────────────── */}
              <ExampleBlock id="device-header-cluster" title="Header primary cluster — always-visible controls">
                <div className="flex flex-col gap-4">
                  <StyleguideDeviceTile>
                    <DeviceCardRowDemo device={deviceCardEdgeCases[0]} defaultExpanded={false} />
                  </StyleguideDeviceTile>
                  <StyleguideDeviceTile>
                    <DeviceCardRowDemo device={deviceCardEdgeCases[7]} defaultExpanded={false} />
                  </StyleguideDeviceTile>
                  <StyleguideDeviceTile>
                    <DeviceCardRowDemo device={deviceCardEdgeCases[8]} defaultExpanded={false} />
                  </StyleguideDeviceTile>
                </div>
              </ExampleBlock>

              {/* ── Whole row, collapsed vs expanded ────────────── */}
              <ExampleBlock id="device-row" title="DeviceRow — collapsed vs expanded">
                <div className="flex flex-col gap-4">
                  <StyleguideDeviceTile>
                    <DeviceCardRowDemo device={deviceCardEdgeCases[0]} defaultExpanded={false} />
                  </StyleguideDeviceTile>
                  <StyleguideDeviceTile>
                    <DeviceCardRowDemo device={deviceCardEdgeCases[0]} />
                  </StyleguideDeviceTile>
                </div>
              </ExampleBlock>
                      </div>
                    ),
                  },
                  {
                    value: 'controls',
                    label: 'Controls & states',
                    anchorIds: ['device-row-actions', 'device-interaction-states', 'device-overflow'],
                    children: (
                      <div>

              {/* ── Action bar ──────────────────────────────────── */}
              <ExampleBlock id="device-row-actions" title="Action bar — registry footerActions + overflow">
                <div className="flex flex-col gap-4">
                  <StyleguideDeviceTile>
                    <DeviceCardRowDemo device={deviceCardEdgeCases[4]} />
                  </StyleguideDeviceTile>
                  <StyleguideDeviceTile>
                    <DeviceCardRowDemo device={deviceCardEdgeCases[6]} />
                  </StyleguideDeviceTile>
                  <StyleguideDeviceTile>
                    <DeviceCardRowDemo device={deviceCardEdgeCases[7]} />
                  </StyleguideDeviceTile>
                  <StyleguideDeviceTile>
                    <DeviceCardRowDemo device={deviceCardEdgeCases[8]} />
                  </StyleguideDeviceTile>
                </div>
              </ExampleBlock>

              {/* ── Interaction states (pre-seeded) ─────────────── */}
              <ExampleBlock id="device-interaction-states" title="Interaction states — controls in their active position">
                <div className="w-full">
                  <p className="mb-6 text-xs text-n-9">
                    The footer/header controls pre-seeded into their engaged state so each one is visible
                    without a click — speaker playing (now-playing strip), floodlight on,
                    camera watching, and the ECM jam split in its idle (pre-confirm) state.
                  </p>
                  <div className="flex flex-col gap-4">
                    <StyleguideDeviceTile label="Speaker — playing (now-playing strip)">
                      <DeviceCardRowDemo device={deviceCardEdgeCases[7]} initialSpeakerOn />
                    </StyleguideDeviceTile>
                    <StyleguideDeviceTile label="Floodlight — on">
                      <DeviceCardRowDemo device={deviceCardEdgeCases[8]} initialFloodOn />
                    </StyleguideDeviceTile>
                    <StyleguideDeviceTile label="Camera — watching (pinned to feed)">
                      <DeviceCardRowDemo device={deviceCardEdgeCases[0]} initialPinned />
                    </StyleguideDeviceTile>
                    <StyleguideDeviceTile label="ECM — jam idle (open the split for scope + confirm)">
                      <DeviceCardRowDemo device={deviceCardEdgeCases[12]} />
                    </StyleguideDeviceTile>
                  </div>
                </div>
              </ExampleBlock>

              {/* ── Overflow + timed notifications ───────────────── */}
              <ExampleBlock id="device-overflow" title="3-dot overflow — Logs error channel + timed Notifications">
                <div className="flex flex-col gap-4">
                  <StyleguideDeviceTile>
                    <DeviceCardRowDemo device={deviceCardEdgeCases[0]} />
                  </StyleguideDeviceTile>
                  <StyleguideDeviceTile>
                    <DeviceCardRowDemo device={deviceCardEdgeCases[2]} />
                  </StyleguideDeviceTile>
                </div>
              </ExampleBlock>
                      </div>
                    ),
                  },
                  {
                    value: 'composite',
                    label: 'Composite (Gotcha)',
                    anchorIds: ['gotcha-sensors-group', 'gotcha-child-row'],
                    children: (
                      <div>
                        {/* ── Sensors group (collapsible inset) ──────────── */}
                        <ExampleBlock id="gotcha-sensors-group" title="Sensors group — collapsible inset (composite unit)">
                          <div className="flex w-full flex-col gap-4">
                            <CodePreviewBlock
                              name="Gotcha unit card"
                              description="The composite effector rendered through the shared DeviceRow. Children (4 sectors + camera) live in the collapsible 'Sensors' inset; toggle the group to compare the collapsed roll-up vs the expanded per-row badges."
                              tight
                              code={deviceChildGroupSrc}
                              relatedFiles={GOTCHA_FILES}
                            >
                              <StyleguideDeviceTile>
                                <DeviceCardRowDemo device={GOTCHA_STYLEGUIDE_DEVICE} />
                              </StyleguideDeviceTile>
                            </CodePreviewBlock>
                          </div>
                        </ExampleBlock>

                        {/* ── Sensor child rows (states) ─────────────────── */}
                        <ExampleBlock id="gotcha-child-row" title="Sensor child row — selected / hover / unhealthy">
                          <div className="flex w-full flex-col items-center justify-center gap-4">
                            <GotchaSensorRowsDemo />
                          </div>
                        </ExampleBlock>

                        <div className="mt-12">
                          <h3 className="mb-4 text-sm font-medium text-n-10">Class recipe — Sensors inset</h3>
                          <ClassNameRecipe
                            entries={[
                              {
                                label: 'Sensors inset (outer)',
                                note: 'nested radii: outer rounded (4px) minus p-1 (4px) = inner rounded-sm (2px)',
                                className: 'rounded border border-white/[0.06] bg-white/[0.04] p-1',
                              },
                              {
                                label: 'Group toggle (header)',
                                note: 'summary chips while collapsed; chevron rotates -90deg collapsed',
                                className:
                                  'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-start transition-colors duration-150 ease-out hover:bg-state-hover active:bg-state-pressed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-state-focus-ring',
                              },
                              {
                                label: 'Collapse track',
                                note: 'grid 0fr to 1fr height ease; overflow-hidden clips rows as they close',
                                className:
                                  'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none grid-rows-[0fr]',
                              },
                              {
                                label: 'Child row (inset)',
                                note: 'rounded; selected adds bg-white/[0.07]',
                                className:
                                  'group relative flex min-h-[40px] items-center gap-2.5 py-2 px-2 rounded text-end cursor-pointer transition-[background-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-state-focus-ring focus-visible:ring-inset',
                              },
                            ]}
                          />
                        </div>
                      </div>
                    ),
                  },
                  {
                    value: 'edge-cases',
                    label: 'Edge cases',
                    anchorIds: ['device-card-states'],
                    children: (
                      <div>

              {/* ── Edge-case gallery ───────────────────────────── */}
              <ExampleBlock id="device-card-states" title="Edge cases — health, offline, malfunction, low battery">
                <div className="flex flex-col gap-4">
                  {deviceCardEdgeCases.map((device) => (
                    <StyleguideDeviceTile key={device.id}>
                      <DeviceCardRowDemo device={device} />
                    </StyleguideDeviceTile>
                  ))}
                </div>
              </ExampleBlock>
                      </div>
                    ),
                  },
                  {
                    value: 'elements',
                    label: 'Elements',
                    anchorIds: [
                      'device-elements',
                      'device-elements-resolved',
                      'device-elements-toggles',
                      'device-elements-dropdowns',
                      'device-elements-overflow',
                    ],
                    children: <DeviceElementsCatalog />,
                  },
                ]}
              />

              <SectionHeading>Class recipe</SectionHeading>
              <ClassNameRecipe
                entries={[
                  {
                    label: 'Header row',
                    note: 'expanded → bg-white/[0.04]; idle → hover/active',
                    className:
                      'flex items-center justify-center gap-2.5 px-4 py-2.5 text-end transition-[background-color,border-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-state-focus-ring border-b border-white/[0.06] cursor-pointer',
                  },
                  {
                    label: 'Health tile',
                    note: 'tint via DEVICE_HEALTH_VISUAL[health].tile',
                    className:
                      'relative w-8 h-8 rounded flex items-center justify-center shrink-0 transition-[background-color,box-shadow] duration-150 ease-out',
                  },
                  { label: 'Name + metric', className: 'flex-1 min-w-0 text-start' },
                  { label: 'Device name', className: 'text-sm font-medium truncate text-slate-11 block' },
                  { label: 'Metric line', className: 'text-start text-xs font-mono tabular-nums text-white/50 truncate' },
                  { label: 'Primary cluster', className: 'flex shrink-0 items-center gap-0.5' },
                  { label: 'Expanded content', className: 'overflow-hidden animate-in fade-in-0 duration-200' },
                  {
                    label: 'Footer action bar',
                    className: 'flex flex-wrap items-center gap-2 px-2 py-1.5 border-t border-white/[0.06] overflow-visible',
                  },
                  {
                    label: 'Action pill (DeviceAction)',
                    note: 'tone via DEVICE_ACTION_TONES[tone]; iconOnly → size-6 p-0, else px-2.5 py-1.5',
                    className:
                      'inline-flex shrink-0 items-center justify-center gap-1.5 rounded text-xs font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring',
                  },
                ]}
              />
            </ComponentSection>
            )}

            {activeItem === 'devices-panel' && (
            <ComponentSection id="devices-panel" name="DevicesPanel" description="Right-hand sidebar listing all connected field devices grouped by type. Supports search, type-filter isolation, device expansion with stats grid, camera preview with presets, ECM jam activation, mute with 30-min countdown, drone wipers/calibration, and drag-to-camera-viewer for camera rows.">
              <CodePreviewBlock name="DevicesPanel" description="Full interactive panel — try searching, filtering by type, expanding rows, toggling the floodlight Switch, and pressing Play on a speaker." tight code={devicesPanelSrc} relatedFiles={DEVICES_PANEL_FILES}>
                <div className="relative mx-auto overflow-hidden rounded-lg border border-white/10" style={{ width: LAYOUT_TOKENS.sidebarWidthPx, height: 520 }}>
                  <DevicesPanel
                    devices={devicesPanelDemoDevices}
                    open
                    onClose={noop}
                    onFlyTo={noop}
                    onDeviceHover={noop}
                    onDeviceSelect={noop}
                    onJamActivate={noop}
                    onFloodlightToggle={handleDevicesPanelFloodlightToggle}
                    onSpeakerToggle={handleDevicesPanelSpeakerToggle}
                    floodlightOnIds={devicesPanelFloodlightOnIds}
                    speakerPlayingIds={devicesPanelSpeakerPlayingIds}
                    noTransition
                  />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={devicesPanelSrc} name="DevicesPanel" />

              <SectionHeading>Examples</SectionHeading>
              <AnchoredExampleTabs
                activeAnchor={activeAnchor}
                onAnchorChange={handleExampleTabAnchor}
                tabs={[
                  {
                    value: 'chrome',
                    label: 'Empty & chrome',
                    anchorIds: ['devices-empty', 'devices-header', 'devices-search'],
                    children: (
                      <div>
              {/* ── Empty state ─────────────────────────────────── */}
              <ExampleBlock id="devices-empty" title="Empty state" tight>
                <StyleguideDeviceTile label="When no devices match the current search or filter, the panel shows this placeholder.">
                  <div dir="rtl" className="flex flex-col">
                    <div className="flex items-center justify-between px-4 pt-3 pb-2">
                      <h2 className="text-xs font-medium text-white uppercase tracking-wider">מכשירים (0)</h2>
                      <div className="p-2 -m-1 rounded text-n-120"><X size={14} /></div>
                    </div>
                    <FilterBar
                      query="זרקור"
                      onQueryChange={noop}
                      filters={DEVICES_PANEL_DEMO_FILTER_DEFS}
                      selections={{ type: ['camera'] }}
                      onFilterChange={noop}
                      onReset={noop}
                      searchPlaceholder="חיפוש..."
                      clearSearchAriaLabel="ניקוי חיפוש"
                      resetLabel="ניקוי"
                      resetAriaLabel="ניקוי מסננים"
                    />
                    <div className="px-3 py-8 text-center text-xs text-n-7">אין מכשירים תואמים</div>
                  </div>
                </StyleguideDeviceTile>
              </ExampleBlock>

              {/* ── Header ──────────────────────────────────────── */}
              <ExampleBlock id="devices-header" title="Header" tight>
                <StyleguideDeviceTile label="Panel title with device count and close button.">
                  <div className="flex items-center justify-between px-4 pt-3 pb-2">
                    <h2 className="text-xs font-medium text-white uppercase tracking-wider">מכשירים (16)</h2>
                    <button className="p-2 -m-1 rounded hover:bg-state-hover-overlay text-n-120 hover:text-n-10 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                </StyleguideDeviceTile>
              </ExampleBlock>

              {/* ── Search & type filters ───────────────────────── */}
              <ExampleBlock id="devices-search" title="Search & type filters" tight>
                <div className="space-y-4">
                  <StyleguideDeviceTile label="Default state — search empty, no Type selection (every device visible). Backed by the FilterBar primitive.">
                    <div dir="rtl">
                      <FilterBar
                        query=""
                        onQueryChange={noop}
                        filters={DEVICES_PANEL_DEMO_FILTER_DEFS}
                        selections={{}}
                        onFilterChange={noop}
                        onReset={noop}
                        searchPlaceholder="חיפוש..."
                        clearSearchAriaLabel="ניקוי חיפוש"
                        resetLabel="ניקוי"
                        resetAriaLabel="ניקוי מסננים"
                      />
                    </div>
                  </StyleguideDeviceTile>

                  <StyleguideDeviceTile label="Isolated filter — query 'MAGOS' + Type narrowed to cameras. Reset chip becomes available next to the trigger.">
                    <div dir="rtl">
                      <FilterBar
                        query="MAGOS"
                        onQueryChange={noop}
                        filters={DEVICES_PANEL_DEMO_FILTER_DEFS}
                        selections={{ type: ['camera'] }}
                        onFilterChange={noop}
                        onReset={noop}
                        searchPlaceholder="חיפוש..."
                        clearSearchAriaLabel="ניקוי חיפוש"
                        resetLabel="ניקוי"
                        resetAriaLabel="ניקוי מסננים"
                      />
                    </div>
                  </StyleguideDeviceTile>
                </div>
              </ExampleBlock>

              {/* ── Group header ────────────────────────────────── */}
              <ExampleBlock title="Group header" tight>
                <StyleguideDeviceTile label="Each device type gets a grouped section header with count.">
                  <div className="px-4 py-1.5 text-xs font-normal uppercase tracking-wider text-white border-b border-white/5 bg-white/5">
                    מצלמות (3)
                  </div>
                </StyleguideDeviceTile>
              </ExampleBlock>

                      </div>
                    ),
                  },
                  {
                    value: 'rows',
                    label: 'Device rows',
                    anchorIds: ['devices-rows', 'devices-camera', 'devices-ecm', 'devices-drone', 'devices-speaker', 'devices-floodlight'],
                    children: (
                      <div>
              {/* ── Device row — collapsed states ──────────────── */}
              <ExampleBlock id="devices-rows" title="Device row — collapsed states" tight>
                <div className="space-y-4">
                  <StyleguideDeviceTile label="Normal — camera device with battery indicator.">
                    <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right border-b border-white/[0.06] hover:bg-state-hover cursor-grab">
                      <div className="relative w-8 h-8 rounded flex items-center justify-center shrink-0 bg-white/10">
                        <CameraIcon size={20} fill="white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-n-10">PTZ Camera (North)</span>
                          <span className="flex items-center gap-1.5 text-xs font-['Heebo'] tabular-nums text-white/50">
                            <StyleguideBatteryIcon pct={18} />
                            18%
                          </span>
                        </div>
                      </div>
                    </div>
                  </StyleguideDeviceTile>

                  <StyleguideDeviceTile label="Malfunctioning — orange icon, warning triangle, connection dot.">
                    <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right border-b border-white/[0.06] hover:bg-state-hover cursor-pointer">
                      <div className="relative w-8 h-8 rounded flex items-center justify-center shrink-0 bg-orange-900/40">
                        <SensorIcon size={20} fill="#f97316" />
                        <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-2 ring-n-1 bg-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-orange-300">Magos (South)</span>
                          <AlertTriangle size={11} className="text-orange-400 shrink-0" />
                        </div>
                      </div>
                    </div>
                  </StyleguideDeviceTile>

                  <StyleguideDeviceTile label="Muted — BellOff icon with 30-min countdown timer.">
                    <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right border-b border-white/[0.06] bg-white/[0.04] cursor-pointer">
                      <div className="relative w-8 h-8 rounded flex items-center justify-center shrink-0 bg-white/10">
                        <RadarIcon size={20} fill="white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-n-10">RADA ieMHR</span>
                          <span className="flex items-center gap-1 text-xs font-mono tabular-nums text-white">
                            <BellOff size={12} className="text-white" />
                            28:42
                          </span>
                        </div>
                      </div>
                    </div>
                  </StyleguideDeviceTile>

                  <StyleguideDeviceTile label="ECM row — jam button inline on the collapsed row.">
                    <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right border-b border-white/[0.06] hover:bg-state-hover cursor-pointer">
                      <div className="relative w-8 h-8 rounded flex items-center justify-center shrink-0 bg-white/10">
                        <SensorIcon size={20} fill="white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-n-10">Regulus North</span>
                        <div className="text-xs font-mono tabular-nums text-white/50">1.5km</div>
                      </div>
                      <button className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-[oklch(0.348_0.111_17)] text-[oklch(0.927_0.062_17)] ring-1 ring-inset ring-[oklch(0.348_0.111_17_/_0.4)]">
                        <StyleguideJamIcon size={12} />
                        הפעל
                      </button>
                    </div>
                  </StyleguideDeviceTile>
                </div>
              </ExampleBlock>

              {/* ── Connection state dots ───────────────────────── */}
              <ExampleBlock title="Connection state dots" tight>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { label: 'Warning (אזהרה)', color: 'bg-amber-400' },
                    { label: 'Error (שגיאה)', color: 'bg-red-400' },
                    { label: 'Offline (לא מקוון)', color: 'bg-n-120' },
                  ] as const).map(({ label, color }) => (
                    <div key={label} className="flex flex-col items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 p-4">
                      <div className="relative w-8 h-8 rounded flex items-center justify-center bg-white/10">
                        <SensorIcon size={20} fill="white" />
                        <span className={`absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-2 ring-n-1 ${color}`} />
                      </div>
                      <span className="text-xs font-mono text-n-9">{label}</span>
                    </div>
                  ))}
                </div>
              </ExampleBlock>

              {/* ── Battery indicator ───────────────────────────── */}
              <ExampleBlock title="Battery indicator" tight>
                <div className="grid grid-cols-4 gap-3">
                  {([
                    { pct: 18, label: 'Critical' },
                    { pct: 35, label: 'Low' },
                    { pct: 63, label: 'Medium' },
                    { pct: 91, label: 'Good' },
                  ] as const).map(({ pct, label }) => (
                    <div key={pct} className="flex flex-col items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 p-4">
                      <span className="flex items-center gap-1.5 text-xs font-['Heebo'] tabular-nums text-white/50">
                        <StyleguideBatteryIcon pct={pct} />
                        {pct}%
                      </span>
                      <span className="text-xs font-mono text-n-9">{label}</span>
                    </div>
                  ))}
                </div>
              </ExampleBlock>

              {/* ── Expanded — Camera device ────────────────────── */}
              <ExampleBlock id="devices-camera" title="Expanded — Camera device" tight>
                <StyleguideDeviceTile label="Camera rows expand to show preset tabs, live preview, stats grid, and action bar. Camera rows are draggable to the viewer panel.">
                  <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right bg-white/[0.04] border-b border-white/[0.06] cursor-grab">
                    <div className="relative w-8 h-8 rounded flex items-center justify-center shrink-0 bg-white/10">
                      <CameraIcon size={20} fill="white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-n-10">PTZ Camera (North)</span>
                        <span className="flex items-center gap-1.5 text-xs font-['Heebo'] tabular-nums text-white/50">
                          <StyleguideBatteryIcon pct={18} />
                          18%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col bg-white/[0.03]">
                    <div className="flex items-center gap-0 px-3 border-b border-white/[0.06]">
                      {['רגיל', 'לילה', 'זום'].map((tab, i) => (
                        <button key={tab} className={`px-3 py-2 text-xs font-medium border-b-2 ${i === 0 ? 'text-white border-white' : 'text-n-120 border-transparent hover:text-n-10'}`}>
                          {tab}
                        </button>
                      ))}
                    </div>
                    <div className="relative w-full h-[200px] overflow-hidden bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.1)]">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Camera size={24} className="text-white/20" />
                      </div>
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-black/80 px-1.5 py-0.5 rounded-sm">
                        <div className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-xs font-medium text-white/90 uppercase tracking-wide">Live</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-x-4 gap-y-5 px-4 py-3">
                      {[
                        { l: 'מיקום', v: '32.4700, 35.0050' },
                        { l: 'כיוון', v: '45°' },
                        { l: 'שדה ראייה', v: '120°' },
                        { l: 'תקינות', v: 'תקין', c: 'text-emerald-400' },
                        { l: 'סוללה', v: '18%', c: 'text-red-400' },
                      ].map(r => (
                        <div key={r.l} className="flex flex-col gap-1 text-xs">
                          <span className="text-white/60 text-xs">{r.l}</span>
                          <span className={`font-sans tabular-nums text-xs ${r.c ?? 'text-white'}`}>{r.v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1.5 border-t border-white/[0.06]">
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-white/70 bg-white/[0.06] hover:bg-state-hover-overlay">
                        <MapPin size={12} />
                        מרכז במפה
                      </button>
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-white/70 bg-white/[0.06] hover:bg-state-hover-overlay">
                        <BellOff size={12} />
                        השתק
                      </button>
                    </div>
                  </div>
                </StyleguideDeviceTile>
              </ExampleBlock>

              {/* ── Expanded — ECM device (jam button states) ──── */}
              <ExampleBlock id="devices-ecm" title="Expanded — ECM device (jam button states)" tight>
                <div className="space-y-4">
                  <StyleguideDeviceTile label="Ready — jam button enabled.">
                    <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right bg-white/[0.04] border-b border-white/[0.06]">
                      <div className="w-8 h-8 rounded flex items-center justify-center shrink-0 bg-white/10">
                        <SensorIcon size={20} fill="white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-n-10">Regulus North</span>
                        <div className="text-xs font-mono tabular-nums text-white/50">1.5km</div>
                      </div>
                      <button className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-[oklch(0.348_0.111_17)] text-[oklch(0.927_0.062_17)] ring-1 ring-inset ring-[oklch(0.348_0.111_17_/_0.4)]">
                        <StyleguideJamIcon size={12} />
                        הפעל
                      </button>
                    </div>
                    <div className="flex flex-col bg-white/[0.03]">
                      <div className="grid grid-cols-3 gap-x-4 gap-y-5 px-4 py-3">
                        {[
                          { l: 'מיקום', v: '32.4650, 35.0020' },
                          { l: 'כיסוי', v: '1,500m' },
                          { l: 'תקינות', v: 'תקין', c: 'text-emerald-400' },
                        ].map(r => (
                          <div key={r.l} className="flex flex-col gap-1 text-xs">
                            <span className="text-white/60 text-xs">{r.l}</span>
                            <span className={`font-sans tabular-nums text-xs ${r.c ?? 'text-white'}`}>{r.v}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 border-t border-white/[0.06]">
                        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-white/70 bg-white/[0.06]">
                          <MapPin size={12} />
                          מרכז במפה
                        </button>
                        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-white/70 bg-white/[0.06]">
                          <BellOff size={12} />
                          השתק
                        </button>
                      </div>
                    </div>
                  </StyleguideDeviceTile>

                  <StyleguideDeviceTile label="Active — jam already running, button shows active state.">
                    <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right bg-white/[0.04] border-b border-white/[0.06]">
                      <div className="w-8 h-8 rounded flex items-center justify-center shrink-0 bg-white/10">
                        <SensorIcon size={20} fill="white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-n-10">Regulus East</span>
                      </div>
                      <button disabled className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium opacity-40 cursor-not-allowed bg-[oklch(0.348_0.111_17)] text-[oklch(0.927_0.062_17)] ring-1 ring-inset ring-[oklch(0.348_0.111_17_/_0.4)]">
                        <StyleguideJamIcon size={12} />
                        שיבוש פעיל
                      </button>
                    </div>
                  </StyleguideDeviceTile>

                  <StyleguideDeviceTile label="Malfunctioning — jam disabled, device in error state.">
                    <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right bg-white/[0.04] border-b border-white/[0.06]">
                      <div className="relative w-8 h-8 rounded flex items-center justify-center shrink-0 bg-orange-900/40">
                        <SensorIcon size={20} fill="#f97316" />
                        <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-2 ring-n-1 bg-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-orange-300">Regulus South</span>
                          <AlertTriangle size={11} className="text-orange-400 shrink-0" />
                        </div>
                      </div>
                      <button disabled className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium opacity-40 cursor-not-allowed bg-[oklch(0.348_0.111_17)] text-[oklch(0.927_0.062_17)] ring-1 ring-inset ring-[oklch(0.348_0.111_17_/_0.4)]">
                        <StyleguideJamIcon size={12} />
                        הפעל
                      </button>
                    </div>
                  </StyleguideDeviceTile>
                </div>
              </ExampleBlock>

              {/* ── Expanded — Drone device ─────────────────────── */}
              <ExampleBlock id="devices-drone" title="Expanded — Drone device" tight>
                <StyleguideDeviceTile label="Drone rows show altitude, wipers toggle, and calibration button with three states.">
                  <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right bg-white/[0.04] border-b border-white/[0.06] cursor-pointer">
                    <div className="w-8 h-8 rounded flex items-center justify-center shrink-0 bg-white/10">
                      <svg width={20} height={20} viewBox="0 0 28 32" fill="none"><path d="M23.334 15.7502L9.33696 0.583495L5.86139 4.0835L10.5007 11.0835L9.32456 15.7502L10.5007 20.4168L5.86139 27.4168L9.32456 30.6801L23.334 15.7502Z" fill="white" stroke="#0a0a0a" strokeWidth="1"/></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-n-10">סיור-3</span>
                    </div>
                  </div>
                  <div className="flex flex-col bg-white/[0.03]">
                    <div className="grid grid-cols-3 gap-x-4 gap-y-5 px-4 py-3">
                      {[
                        { l: 'מיקום', v: '32.4700, 35.0050' },
                        { l: 'גובה', v: '80 מ׳' },
                        { l: 'תקינות', v: 'תקין', c: 'text-emerald-400' },
                      ].map(r => (
                        <div key={r.l} className="flex flex-col gap-1 text-xs">
                          <span className="text-white/60 text-xs">{r.l}</span>
                          <span className={`font-sans tabular-nums text-xs ${r.c ?? 'text-white'}`}>{r.v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1.5 border-t border-white/[0.06]">
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-white/70 bg-white/[0.06]">
                        <MapPin size={12} />
                        מרכז במפה
                      </button>
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-white/70 bg-white/[0.06]">
                        <BellOff size={12} />
                        השתק
                      </button>
                      <div className="w-px h-5 bg-white/[0.08] mx-0.5" />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/60">מגבים</span>
                        <div className="h-[18px] w-8 rounded-full bg-white/10 relative">
                          <div className="absolute left-[2px] top-[2px] size-[14px] rounded-full bg-white/60 transition-transform" />
                        </div>
                      </div>
                      <button className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-white/70 bg-white/[0.06]">
                        <Wrench size={12} />
                        כיול
                      </button>
                    </div>
                  </div>
                </StyleguideDeviceTile>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {([
                    { label: 'Idle', icon: <Wrench size={12} />, text: 'כיול' },
                    { label: 'Running', icon: <AppLoader size={12} label="מכייל" />, text: 'מכייל...' },
                    { label: 'Done', icon: <Check size={12} className="text-emerald-400" />, text: 'הושלם' },
                  ] as const).map(({ label, icon, text }) => (
                    <div key={label} className="flex flex-col items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 p-4">
                      <button disabled={label !== 'Idle'} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-white/70 bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed">
                        {icon}
                        {text}
                      </button>
                      <span className="text-xs font-mono text-n-9">{label}</span>
                    </div>
                  ))}
                </div>
              </ExampleBlock>

              {/* ── Expanded — Speaker device ───────────────────── */}
              <ExampleBlock id="devices-speaker" title="Expanded — Speaker device" tight>
                <div className="space-y-4">
                  <StyleguideDeviceTile label="Idle — secondary Play button (custom solid triangle icon) sits inline on the collapsed row.">
                    <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right border-b border-white/[0.06]">
                      <div className="relative w-8 h-8 rounded flex items-center justify-center shrink-0 bg-white/10">
                        <SpeakerIcon size={20} fill="white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-n-10">PA Speaker (Gate)</span>
                      </div>
                      <Button variant="secondary" size="sm" className="shrink-0 h-7 gap-1.5 px-2 rounded text-xs font-medium" aria-pressed={false}>
                        <StyleguidePlayFilledIcon size={12} />
                        נגן
                      </Button>
                    </div>
                  </StyleguideDeviceTile>

                  <StyleguideDeviceTile label="Broadcasting — Stop icon swaps in, the active state is mirrored on the row icon and a 'משדר' chip near the device name.">
                    <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right border-b border-white/[0.06]">
                      <div className="relative w-8 h-8 rounded flex items-center justify-center shrink-0 bg-white/10">
                        <SpeakerIcon size={20} fill="white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm font-medium text-n-10 truncate">PA Speaker (Tower)</span>
                          <StatusChip label="משדר" color="green" className="h-5 px-1.5 text-xs leading-none" />
                        </div>
                      </div>
                      <Button variant="secondary" size="sm" className="shrink-0 h-7 gap-1.5 px-2 rounded text-xs font-medium" aria-pressed>
                        <Square size={12} />
                        עצור
                      </Button>
                    </div>
                  </StyleguideDeviceTile>

                  <StyleguideDeviceTile label="Expanded — track combobox is anchored at the start of the footer (right edge in RTL), then a divider, then the standard fly-to / mute pair.">
                    <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right bg-white/[0.04] border-b border-white/[0.06]">
                      <div className="relative w-8 h-8 rounded flex items-center justify-center shrink-0 bg-white/10">
                        <SpeakerIcon size={20} fill="white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-n-10">PA Speaker (Gate)</span>
                      </div>
                      <Button variant="secondary" size="sm" className="shrink-0 h-7 gap-1.5 px-2 rounded text-xs font-medium" aria-pressed={false}>
                        <StyleguidePlayFilledIcon size={12} />
                        נגן
                      </Button>
                    </div>
                    <div className="flex flex-col bg-white/[0.03]">
                      <div className="flex items-center gap-2 px-2 py-1.5 border-t border-white/[0.06]">
                        <div className="flex items-center gap-2 min-w-0 h-7 rounded bg-white/[0.05] text-white/[0.64]">
                          <button
                            type="button"
                            className="inline-flex items-center justify-between gap-2 h-7 min-w-0 max-w-[160px] px-2 rounded text-xs font-medium text-white/[0.64] bg-transparent transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-state-focus-ring"
                          >
                            <span className="truncate">אזעקת אש</span>
                            <ChevronsUpDown size={12} className="shrink-0 opacity-60" />
                          </button>
                        </div>
                        <div className="w-px h-5 bg-white/[0.08] mx-0.5" />
                        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-white/70 bg-white/[0.06]">
                          <MapPin size={12} />
                          מרכז במפה
                        </button>
                        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-white/70 bg-white/[0.06]">
                          <BellOff size={12} />
                          השתק
                        </button>
                      </div>
                    </div>
                  </StyleguideDeviceTile>
                </div>
              </ExampleBlock>

              {/* ── Expanded — Floodlight device ────────────────── */}
              <ExampleBlock id="devices-floodlight" title="Expanded — Floodlight device" tight>
                <div className="space-y-4">
                  <StyleguideDeviceTile label="Off — inline Switch lives on the collapsed row, status text reads ‘כבוי’.">
                    <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right border-b border-white/[0.06]">
                      <div className="relative w-8 h-8 rounded flex items-center justify-center shrink-0 bg-white/10">
                        <FloodlightIcon size={20} fill="white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-n-10">Floodlight (North)</span>
                      </div>
                      <span className="text-xs text-white/60 shrink-0">כבוי</span>
                      <Switch checked={false} aria-label="הפעל זרקור" className="shrink-0" />
                    </div>
                  </StyleguideDeviceTile>

                  <StyleguideDeviceTile label="On — Switch in the checked state, the active icon variant lights up, and the inline label flips to ‘דלוק’.">
                    <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right border-b border-white/[0.06]">
                      <div className="relative w-8 h-8 rounded flex items-center justify-center shrink-0 bg-white/10">
                        <FloodlightIcon size={20} fill="white" active />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-n-10">Floodlight (South)</span>
                      </div>
                      <span className="text-xs text-amber-300 shrink-0">דלוק</span>
                      <Switch checked aria-label="כבה זרקור" className="shrink-0" />
                    </div>
                  </StyleguideDeviceTile>

                  <StyleguideDeviceTile label="Expanded — the same Switch is duplicated inside the footer next to the standard fly-to / mute pair so the toggle remains reachable while the row is open.">
                    <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right bg-white/[0.04] border-b border-white/[0.06]">
                      <div className="relative w-8 h-8 rounded flex items-center justify-center shrink-0 bg-white/10">
                        <FloodlightIcon size={20} fill="white" active />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-n-10">Floodlight (South)</span>
                      </div>
                      <span className="text-xs text-amber-300 shrink-0">דלוק</span>
                      <Switch checked aria-label="כבה זרקור" className="shrink-0" />
                    </div>
                    <div className="flex flex-col bg-white/[0.03]">
                      <div className="grid grid-cols-3 gap-x-4 gap-y-5 px-4 py-3">
                        {[
                          { l: 'מיקום', v: '32.4690, 34.9990' },
                          { l: 'תקינות', v: 'תקין', c: 'text-emerald-400' },
                        ].map(r => (
                          <div key={r.l} className="flex flex-col gap-1 text-xs">
                            <span className="text-white/60 text-xs">{r.l}</span>
                            <span className={`font-sans tabular-nums text-xs ${r.c ?? 'text-white'}`}>{r.v}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 border-t border-white/[0.06]">
                        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-white/70 bg-white/[0.06]">
                          <MapPin size={12} />
                          מרכז במפה
                        </button>
                        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-white/70 bg-white/[0.06]">
                          <BellOff size={12} />
                          השתק
                        </button>
                        <div className="w-px h-5 bg-white/[0.08] mx-0.5" />
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/60">זרקור</span>
                          <Switch checked aria-label="כבה זרקור" />
                        </div>
                      </div>
                    </div>
                  </StyleguideDeviceTile>
                </div>
              </ExampleBlock>

                      </div>
                    ),
                  },
                  {
                    value: 'actions',
                    label: 'Actions',
                    anchorIds: ['devices-actions', 'devices-track-combobox'],
                    children: (
                      <div>
              {/* ── Action bar ──────────────────────────────────── */}
              <ExampleBlock id="devices-actions" title="Action bar" tight>
                <div className="space-y-4">
                  <StyleguideDeviceTile label="Default state — fly-to and mute buttons.">
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-white/70 bg-white/[0.06] hover:bg-state-hover-overlay hover:text-white/90">
                        <MapPin size={12} />
                        מרכז במפה
                      </button>
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-white/70 bg-white/[0.06] hover:bg-state-hover-overlay hover:text-white/90">
                        <BellOff size={12} />
                        השתק
                      </button>
                    </div>
                  </StyleguideDeviceTile>

                  <StyleguideDeviceTile label="Muted state — amber highlight on the mute button.">
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-white/70 bg-white/[0.06] hover:bg-state-hover-overlay hover:text-white/90">
                        <MapPin size={12} />
                        מרכז במפה
                      </button>
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-amber-500/15 text-amber-400 hover:bg-amber-500/25">
                        <BellOff size={12} />
                        בטל השתקה
                      </button>
                    </div>
                  </StyleguideDeviceTile>
                </div>
              </ExampleBlock>

              {/* ── Track combobox pattern ──────────────────────── */}
              <ExampleBlock id="devices-track-combobox" title="Audio-track combobox" tight>
                <div className="space-y-3">
                  <p className="text-sm text-n-9 leading-relaxed">
                    The speaker audio-track picker is the canonical "combobox with search" pattern in the app. It composes <code className="text-xs font-mono text-sky-300/80 bg-white/[0.04] px-1 py-0.5 rounded">Popover</code> for the open/close affordance with <code className="text-xs font-mono text-sky-300/80 bg-white/[0.04] px-1 py-0.5 rounded">cmdk</code>'s <code className="text-xs font-mono text-sky-300/80 bg-white/[0.04] px-1 py-0.5 rounded">Command</code> for the search input + filtered list. Use it whenever a Select would otherwise need an in-list search.
                  </p>
                  <p className="text-sm text-n-9 leading-relaxed">
                    Direction-aware notes: trigger uses <code className="text-xs font-mono text-sky-300/80 bg-white/[0.04] px-1 py-0.5 rounded">align="start"</code> so the popover anchors to the start edge in both LTR and RTL; the content overrides Radix's dynamic <code className="text-xs font-mono text-sky-300/80 bg-white/[0.04] px-1 py-0.5 rounded">--radix-popover-content-transform-origin</code> with <code className="text-xs font-mono text-sky-300/80 bg-white/[0.04] px-1 py-0.5 rounded">origin-top-left rtl:origin-top-right</code> so the open-animation scales out from the visually-correct corner.
                  </p>
                  <div dir="rtl" className="rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.06)] p-6 flex justify-center" style={{ backgroundColor: SURFACE.level0 }}>
                    <Popover open={comboboxDemoOpen} onOpenChange={setComboboxDemoOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-between gap-2 h-7 min-w-[160px] max-w-[220px] px-2 rounded text-xs font-medium text-white/[0.64] bg-white/[0.05] transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-state-focus-ring"
                        >
                          <span className="truncate">
                            {DEFAULT_SPEAKER_TRACKS.find((t) => t.id === comboboxDemoTrack)?.label ?? 'Track'}
                          </span>
                          <ChevronsUpDown size={12} className="shrink-0 opacity-60" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        sideOffset={4}
                        className="w-[220px] p-0 origin-top-left rtl:origin-top-right"
                      >
                        <Command className="bg-transparent">
                          <CommandInput placeholder="חיפוש מסלול..." className="text-xs" />
                          <CommandList>
                            <CommandEmpty>אין תוצאות תואמות</CommandEmpty>
                            <CommandGroup>
                              {DEFAULT_SPEAKER_TRACKS.map((track) => (
                                <CommandItem
                                  key={track.id}
                                  value={track.label}
                                  onSelect={() => {
                                    setComboboxDemoTrack(track.id);
                                    setComboboxDemoOpen(false);
                                  }}
                                  className="text-xs"
                                >
                                  <span className="flex-1 truncate">{track.label}</span>
                                  {track.id === comboboxDemoTrack && (
                                    <Check size={12} className="shrink-0 text-white/80" />
                                  )}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <p className="text-xs text-n-7 leading-relaxed">
                    Keyboard: <code className="text-xs font-mono text-n-9 bg-white/[0.04] px-1 py-0.5 rounded">Enter</code> / <code className="text-xs font-mono text-n-9 bg-white/[0.04] px-1 py-0.5 rounded">Space</code> opens the popover, <code className="text-xs font-mono text-n-9 bg-white/[0.04] px-1 py-0.5 rounded">↑</code>/<code className="text-xs font-mono text-n-9 bg-white/[0.04] px-1 py-0.5 rounded">↓</code> moves through filtered items, <code className="text-xs font-mono text-n-9 bg-white/[0.04] px-1 py-0.5 rounded">Enter</code> commits, <code className="text-xs font-mono text-n-9 bg-white/[0.04] px-1 py-0.5 rounded">Esc</code> dismisses.
                  </p>
                </div>
              </ExampleBlock>
                      </div>
                    ),
                  },
                ]}
              />

              <SectionHeading>Class recipe</SectionHeading>
              <ClassNameRecipe
                entries={[
                  {
                    label: 'Panel',
                    note: 'width/bg via LAYOUT_TOKENS + SURFACE (inline); open/closed via translate',
                    className: 'absolute top-0 bottom-0 start-0 border-e border-white/10 flex flex-col z-10 font-sans',
                  },
                  {
                    label: 'Header',
                    className: 'flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/10',
                  },
                  { label: 'Title', className: 'text-xs font-medium text-white uppercase tracking-wider' },
                  {
                    label: 'Close button',
                    className:
                      'p-2 -m-1 rounded hover:bg-state-hover-overlay text-slate-9 hover:text-slate-11 transition-[color,background-color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring',
                  },
                  { label: 'Scroll area', className: 'flex-1 overflow-y-auto' },
                  {
                    label: 'Group header',
                    className:
                      'px-4 py-1.5 text-xs font-normal uppercase tracking-wider text-white border-b border-white/5 bg-white/[0.08]',
                  },
                  { label: 'Empty state', className: 'px-3 py-8 text-center text-xs text-slate-8' },
                ]}
              />
            </ComponentSection>
            )}

            {activeItem === 'target-card-flows' && (
            <ComponentSection id="target-card-flows" name="Target Card + Map" description="Interaction choreography between detection cards in the sidebar and their corresponding markers on the tactical map. Covers hover highlights, click-to-expand, sensor focus, and bidirectional state sync.">
              <TargetCardFlows />
            </ComponentSection>
            )}

            {activeItem === 'device-card-flows' && (
            <ComponentSection id="device-card-flows" name="Device Card + Map" description="Interaction choreography between field device rows in the DevicesPanel and their asset markers on the tactical map. Covers asset selection, camera FOV cone rotation, and device focus.">
              <DeviceCardFlows />
            </ComponentSection>
            )}

            {activeItem === 'map-markers' && (
            <ComponentSection id="map-markers" name="Map Markers" description="Tactical marker system: SVG icons, composited layers, interaction states, affiliation palettes, and map-level overlays.">

              <CodePreviewBlock name="MapMarker" description="Composites 4 visual layers; on the live map, target markers are driven by severity (ring + glyph color) — see Severity & Urgency below" code={mapMarkerSrc} relatedFiles={MARKER_FILES}>
                <div className="flex items-center justify-start gap-6">
                  {SEVERITY_ORDER.map((sev) => {
                    const color = SEVERITY_COLOR[sev as Severity];
                    const base = resolveMarkerStyle('default', 'hostile');
                    const s = {
                      ...base,
                      ringColor: color,
                      ringPulse: SEVERITY_PULSE[sev as Severity],
                      ringOpacity: 1,
                      ringWidth: sev === 'CRITICAL' ? 3 : 2,
                      glyphColor: color,
                      innerGlowColor: color,
                    };
                    return (
                      <div key={sev} className="flex flex-col items-center gap-2">
                        <MapMarker icon={<CarIcon color={color} size={34} />} style={s} surfaceSize={48} ringSize={38} />
                        <span className="text-xs font-mono font-normal text-white">{sev}</span>
                      </div>
                    );
                  })}
                  <div className="flex flex-col items-center gap-2">
                    <MapMarker
                      icon={<UnknownIcon color={UNKNOWN_GRAY} size={34} />}
                      style={{
                        ...resolveMarkerStyle('default', 'unknown'),
                        ringColor: UNKNOWN_GRAY,
                        ringWidth: 0,
                        ringOpacity: 0,
                        ringPulse: false,
                        glyphColor: UNKNOWN_GRAY,
                        innerGlowColor: UNKNOWN_GRAY,
                      }}
                      surfaceSize={48}
                      ringSize={38}
                    />
                    <span className="text-xs font-mono font-normal text-white">unclassified</span>
                  </div>
                </div>
              </CodePreviewBlock>

              {/* ── Layer Anatomy ── */}
              <div id="layer-anatomy" className="scroll-mt-12 space-y-6 pt-10">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-n-12">Layer Anatomy</h3>
                  <p className="text-base font-normal leading-relaxed text-white/50 tracking-wide">
                    Each marker composites 4 concentric layers plus optional overlays. Hover a layer card to spotlight it on the preview.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    {([
                      { num: 1, layer: '1 — Surface' },
                      { num: 2, layer: '2 — Ring' },
                      { num: 3, layer: '3 — Glyph' },
                      { num: 4, layer: '4 — Inner Glow' },
                    ] as const).map(({ num, layer }) => (
                      <div
                        key={layer}
                        className={`rounded-lg border px-3 py-2.5 cursor-default transition-colors duration-200 ${
                          hoveredLayer === num
                            ? 'border-white/20 bg-white/[0.06]'
                            : 'border-white/[0.06] bg-white/[0.03]'
                        }`}
                        onMouseEnter={() => handleLayerEnter(num)}
                        onMouseLeave={handleLayerLeave}
                      >
                        <span className="text-sm font-semibold text-n-11">Layer {layer}</span>
                      </div>
                    ))}
                    <div
                      className={`rounded-lg border px-3 py-2.5 cursor-default transition-colors duration-200 ${
                        hoveredLayer === 5
                          ? 'border-white/20 bg-white/[0.06]'
                          : 'border-white/[0.06] bg-white/[0.03]'
                      }`}
                      onMouseEnter={() => handleLayerEnter(5)}
                      onMouseLeave={handleLayerLeave}
                    >
                      <span className="text-sm font-semibold text-n-11">Overlays</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center rounded-xl border border-white/10 p-8" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.25) 0%, rgba(0, 0, 0, 1) 61%)' }}>
                    <div className="relative" style={{ transition: 'filter 300ms ease' }}>
                      {(() => {
                        const style = resolveMarkerStyle('default', 'friendly');
                        return (
                          <MapMarker
                            icon={<SensorIcon size={48} outlined fill="#ffffff" />}
                            style={style}
                            surfaceSize={72}
                            ringSize={56}
                            label="Tooltip"
                            showLabel
                            heading={45}
                            showBadge
                            highlightLayer={hoveredLayer}
                          />
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── State Matrix ── */}
              <div id="state-matrix" className="scroll-mt-12 space-y-6 pt-10">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-n-12">Interaction State Matrix</h3>
                  <p className="text-base font-normal leading-relaxed text-white/50 tracking-wide">
                    {INTERACTION_STATES.length} interaction states &times; {AFFILIATIONS.length} affiliations = {INTERACTION_STATES.length * AFFILIATIONS.length} visual combinations. Hover a state card to preview it. Click an affiliation dot to change the hero.
                  </p>
                </div>
                <div className="flex gap-6">

                  {/* State cards column */}
                  <div className="w-full space-y-2">
                    {(() => {
                      const stateAffMap: Record<InteractionState, Affiliation> = {
                        default: 'friendly',
                        hovered: 'friendly',
                        selected: 'friendly',
                        active: 'hostile',
                        disabled: 'neutral',
                        expired: 'unknown',
                        jammer: 'possibleThreat',
                      };
                      return INTERACTION_STATES.map(state => {
                        const isHovered = explorerState === state;
                        const aff = stateAffMap[state];
                        const s = resolveMarkerStyle(state, aff);
                        return (
                          <div
                            key={state}
                            className={`flex items-center gap-4 rounded-lg border px-3 py-2.5 cursor-default transition-colors duration-200 w-full justify-start ${
                              isHovered
                                ? 'border-white/20 bg-white/[0.06]'
                                : 'border-white/[0.06] bg-white/[0.03]'
                            }`}
                            onMouseEnter={() => handleStateEnter(state, aff)}
                            onMouseLeave={handleStateLeave}
                          >
                            <MapMarker
                              icon={<SensorIcon outlined fill={s.glyphColor} />}
                              style={s}
                              surfaceSize={36}
                              ringSize={28}
                              pulse={state === 'selected' || state === 'active'}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span className="text-sm font-semibold text-n-11">{INTERACTION_STATE_LABELS[state]}</span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Hero column */}
                  <div className="flex flex-col items-center gap-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 self-start sticky top-4 w-[280px] shrink-0">
                    {(() => {
                      const heroStyle = resolveMarkerStyle(explorerState, hoveredAff ?? explorerAff);
                      return (
                        <MapMarker
                          icon={<SensorIcon size={48} outlined fill={heroStyle.glyphColor} />}
                          style={heroStyle}
                          surfaceSize={72}
                          ringSize={56}
                          pulse={explorerState === 'selected' || explorerState === 'active'}
                        />
                      );
                    })()}
                    <div className="text-center space-y-1">
                      <span className="block text-sm font-semibold text-n-12">{INTERACTION_STATE_LABELS[explorerState]}</span>
                    </div>
                    <span className="text-xs text-n-120">{AFFILIATION_LABELS[hoveredAff ?? explorerAff]}</span>
                  </div>

                </div>
              </div>

              {/* ── Severity & Urgency ── */}
              <div id="severity-matrix" className="scroll-mt-12 space-y-6 pt-10">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-n-12">Severity &amp; Urgency</h3>
                  <p className="text-base font-normal leading-relaxed text-white/50 tracking-wide">
                    The State Matrix above covers interaction &times; affiliation. On the live map, <strong className="text-white/70">target</strong> markers are driven by a separate <em>severity</em> model: <code className="text-n-10">resolveTargetMarkerStyle</code> overrides the ring + glyph color (and pulse) from <code className="text-n-10">SEVERITY_COLOR</code> rather than affiliation. Unclassified raw blips drop the ring entirely and render in neutral gray.
                  </p>
                  <a
                    href="/urgency-review"
                    className="inline-flex items-center gap-1 text-sm text-sky-300/90 hover:text-sky-200 transition-colors duration-150"
                  >
                    → Open the full Urgency Review
                  </a>
                </div>

                {/* Severity tiers */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                  {SEVERITY_ORDER.map((sev) => {
                    const color = SEVERITY_COLOR[sev as Severity];
                    const base = resolveMarkerStyle('default', 'hostile');
                    const style = {
                      ...base,
                      ringColor: color,
                      ringPulse: SEVERITY_PULSE[sev as Severity],
                      ringOpacity: 1,
                      ringWidth: sev === 'CRITICAL' ? 3 : 2,
                      glyphColor: color,
                      innerGlowColor: color,
                    };
                    return (
                      <div
                        key={sev}
                        className="flex flex-col items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-4"
                      >
                        <MapMarker icon={<CarIcon color={color} />} style={style} surfaceSize={42} ringSize={34} />
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-sm font-semibold text-n-11">{SEVERITY_LABEL[sev as Severity]}</span>
                          <span className="font-mono text-xs-plus text-n-9">{color}</span>
                          {SEVERITY_PULSE[sev as Severity] && (
                            <span className="text-2xs uppercase tracking-wide text-n-9">pulses</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {/* Unclassified unknown — ringless neutral gray */}
                  {(() => {
                    const base = resolveMarkerStyle('default', 'unknown');
                    const style = {
                      ...base,
                      ringColor: UNKNOWN_GRAY,
                      ringWidth: 0,
                      ringOpacity: 0,
                      ringPulse: false,
                      glyphColor: UNKNOWN_GRAY,
                      innerGlowColor: UNKNOWN_GRAY,
                    };
                    return (
                      <div className="flex flex-col items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-4">
                        <MapMarker icon={<UnknownIcon color={UNKNOWN_GRAY} />} style={style} surfaceSize={42} ringSize={34} />
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-sm font-semibold text-n-11">Unclassified</span>
                          <span className="font-mono text-xs-plus text-n-9">{UNKNOWN_GRAY}</span>
                          <span className="text-2xs uppercase tracking-wide text-n-9">no ring</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Entity glyph routing — mirrors buildThreatIcon */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-n-10">Entity glyph routing</h4>
                  <p className="text-sm leading-6 text-n-9">
                    Which glyph a target renders is chosen by its classified/raw type (see <code className="text-n-10">buildThreatIcon</code>). All inherit the severity color above.
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                    {([
                      { label: 'car · ground_vehicle', el: <CarIcon color="white" size={32} /> },
                      { label: 'tank', el: <TankIcon color="white" size={32} /> },
                      { label: 'truck', el: <TruckIcon color="white" size={32} /> },
                      { label: 'drone · aircraft · bird · uav · naval', el: <DroneIcon color="white" /> },
                      { label: 'missile', el: <MissileIcon fill="white" /> },
                      { label: 'unclassified unknown', el: <UnknownIcon color="white" size={32} /> },
                    ] as { label: string; el: React.ReactNode }[]).map(({ label, el }) => (
                      <div
                        key={label}
                        className="flex flex-col items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-4 text-center"
                      >
                        <div className="flex h-10 items-center justify-center">{el}</div>
                        <span className="text-xs-plus leading-tight text-n-9">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Icon Catalog ── */}
              <div id="icon-catalog" className="scroll-mt-12 space-y-6 pt-10">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-n-12">Icon Catalog</h3>
                  <p className="text-base font-normal leading-relaxed text-white/50 tracking-wide">
                    Tactical SVG icons used inside markers on the tactical map. Each icon accepts a <code className="text-n-10">fill</code> prop.
                  </p>
                  <a
                    href="#icon-library"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveItem('icon-library');
                    }}
                    className="inline-flex items-center gap-1 text-sm text-sky-300/90 hover:text-sky-200 transition-colors duration-150"
                  >
                    → See the full Icon Library
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {([
                    { name: 'SensorIcon', el: <SensorIcon size={32} fill="white" /> },
                    { name: 'CameraIcon', el: <CameraIcon size={32} fill="white" /> },
                    { name: 'RadarIcon', el: <RadarIcon size={32} fill="white" /> },
                    { name: 'LidarIcon', el: <LidarIcon size={32} fill="white" /> },
                    { name: 'LauncherIcon', el: <LauncherIcon size={32} fill="white" /> },
                    { name: 'DroneHiveIcon', el: <DroneHiveIcon size={32} fill="white" /> },
                    { name: 'DroneIcon', el: <DroneIcon color="white" /> },
                    { name: 'MissileIcon', el: <MissileIcon fill="white" /> },
                    { name: 'CarIcon', el: <CarIcon color="white" size={32} /> },
                    { name: 'TankIcon', el: <TankIcon color="white" size={32} /> },
                    { name: 'TruckIcon', el: <TruckIcon color="white" size={32} /> },
                    { name: 'UnknownIcon', el: <UnknownIcon color="white" size={32} /> },
                    { name: 'HumanIcon', el: <HumanIcon color="white" size={32} /> },
                    { name: 'FloodlightIcon', el: <FloodlightIcon size={32} fill="white" /> },
                    { name: 'SpeakerIcon', el: <SpeakerIcon size={32} fill="white" /> },
                  ] as { name: string; el: React.ReactNode }[]).map(({ name, el }) => (
                    <IconCatalogTile key={name} name={name} icon={el} />
                  ))}
                </div>

              </div>

            </ComponentSection>
            )}

            {activeItem === 'hud-device-select' && <HudDeviceSelectSection />}
            {activeItem === 'hud-angle-toggle' && <HudAngleToggleSection />}
            {activeItem === 'hud-setpoint-rail' && <HudSetpointRailSection />}
            {activeItem === 'hud-connectivity' && <HudConnectivityBadgeSection />}
            {activeItem === 'hud-compass-strip' && <HudCompassStripSection />}
            {activeItem === 'hud-slew-cue' && <HudSlewCueSection />}
            {activeItem === 'hud-auto-track' && <HudAutoTrackSection />}
            {activeItem === 'hud-detections' && <HudDetectionsSection />}
            {activeItem === 'hud-day-night' && <HudDayNightSection />}
            {activeItem === 'hud-context-menu' && <HudContextMenuSection />}

            {activeItem === 'onboarding-lab' && (
              <ComponentSection
                id="onboarding-lab"
                name="Onboarding Auto-Coverage"
                description="Previewable first-run base-protection setup on the live 3D map: auto-suggested asset layout, a live air/ground protection score, dead-zone / open-axis gap callouts, and drag-to-place refinement. Flat coverage estimate (no terrain line-of-sight yet)."
              >
                <PreviewPanel align="stretch" tight>
                  <div className="flex flex-col items-start gap-4">
                    <p className="text-sm leading-6 text-n-9">
                      This lab runs full-screen on its own route (it mounts a Cesium map and
                      docks its own step rail). Open it in a new tab to try the flow.
                    </p>
                    <a
                      href="/onboarding"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-md bg-white/[0.08] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring"
                    >
                      Open /onboarding
                    </a>
                  </div>
                </PreviewPanel>
              </ComponentSection>
            )}

            <StyleguidePager activeItem={activeItem} onNavigate={navigateTo} />
          </motion.div>
          </div>
          </div>
        </main>

            <StyleguideToc
              activeItem={activeItem}
              activeAnchor={activeAnchor}
              onSelect={(id) => {
                setActiveAnchor(id);
                window.history.replaceState(null, '', `#${id}`);
              }}
            />
          </div>
        </div>

        <StyleguideSearch
          open={searchOpen}
          onOpenChange={setSearchOpen}
          onNavigate={navigateTo}
        />

      </div>
      <Toaster />
    </TooltipProvider>
  );
}
