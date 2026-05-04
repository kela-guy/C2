import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Eye, Radio, ShieldAlert, Zap, Crosshair, Ban, AlertTriangle,
  Trash2, Send, Compass, Gauge, Navigation, MapPin, CheckCircle2,
  Bird, Activity, History, Radar, Hand, Copy, Check, Download,
  BellOff, Camera, Wrench, Loader2, Search, X, Lock,
  SlidersHorizontal, Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/shared/components/ui/sonner';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { NAV, findGroupForId, findParentItemForChild } from '@/app/styleguide/navConfig';
import { CHANGELOG } from '@/app/styleguide/changelog';
import { StyleguideSidebar } from '@/app/styleguide/StyleguideSidebar';
import { StyleguideSearch } from '@/app/styleguide/StyleguideSearch';
import { StyleguideHeader } from '@/app/styleguide/StyleguideHeader';
import { StyleguideToc } from '@/app/styleguide/StyleguideToc';
import { StyleguidePager } from '@/app/styleguide/StyleguidePager';
import {
  CARD_TOKENS, ELEVATION, SURFACE, LAYOUT_TOKENS, surfaceAt, overlayAt,
  StatusChip, STATUS_CHIP_COLORS, type StatusChipColor,
  ActionButton, ACTION_BUTTON_VARIANTS, ACTION_BUTTON_SIZES, type ActionButtonVariant,
  SplitActionButton, SPLIT_BUTTON_VARIANTS,
  AccordionSection, TelemetryRow,
  TargetCard, CardHeader, CardActions,
  CardDetails, CardSensors, CardMedia, MEDIA_BADGE_CONFIG, CardLog, CardClosure,
  FilterBar, NewUpdatesPill,
  CesiumMap, type CesiumMarker,
  type CardAction, type CardSensor,
  type LogEntry, type ClosureOutcome, type DetailRow,
  type FilterDef,
} from '@/primitives';
import {
  CameraIcon, SensorIcon, RadarIcon, DroneIcon, DroneHiveIcon,
  LidarIcon, LauncherIcon, MissileIcon,
} from '@/app/components/tacticalIcons';
import { DroneCardIcon, JamWaveIcon, MissileCardIcon, CarIcon } from '@/primitives/MapIcons';
import { MapMarker } from '@/primitives/MapMarker';
import winterTheme from './winter-is-coming-theme.json';
import {
  resolveMarkerStyle,
  INTERACTION_STATES, AFFILIATIONS,
  INTERACTION_STATE_LABELS, AFFILIATION_LABELS,
  type Affiliation, type InteractionState,
} from '@/primitives/markerStyles';
import { iconPublicUrl } from '@/lib/styleguideIconAssets';
import { DevicesPanel, DeviceRow, type Device } from '@/shared/components/DevicesPanel';
import { useCardSlots, type CardCallbacks, type CardContext } from '@/imports/useCardSlots';
import {
  cuas_raw, cuas_classified, cuas_classified_bird, cuas_mitigating, cuas_mitigated, cuas_bda_complete,
  flow1_suspicion, flow2_tracking, flow3_onStation, flow4_mission, flow4_complete, flow5_mitigated,
} from '@/test-utils/mockDetections';
import type { Detection, RegulusEffector } from '@/imports/ListOfSystems';
import { getActivityStatus } from '@/imports/useActivityStatus';

import themeCssSrc from '@/styles/theme.css?raw';
import indexCssSrc from '@/index.css?raw';

import statusChipSrc from '@/primitives/StatusChip.tsx?raw';
import actionButtonSrc from '@/primitives/ActionButton.tsx?raw';
import splitActionButtonSrc from '@/primitives/SplitActionButton.tsx?raw';
import accordionSectionSrc from '@/primitives/AccordionSection.tsx?raw';
import telemetryRowSrc from '@/primitives/TelemetryRow.tsx?raw';
import targetCardSrc from '@/primitives/TargetCard.tsx?raw';
import cardHeaderSrc from '@/primitives/CardHeader.tsx?raw';
import cardActionsSrc from '@/primitives/CardActions.tsx?raw';
import cardDetailsSrc from '@/primitives/CardDetails.tsx?raw';
import cardSensorsSrc from '@/primitives/CardSensors.tsx?raw';
import cardMediaSrc from '@/primitives/CardMedia.tsx?raw';
import cardLogSrc from '@/primitives/CardLog.tsx?raw';
import cardClosureSrc from '@/primitives/CardClosure.tsx?raw';
import filterBarSrc from '@/primitives/FilterBar.tsx?raw';
import newUpdatesPillSrc from '@/primitives/NewUpdatesPill.tsx?raw';
import devicesPanelSrc from '@/shared/components/DevicesPanel.tsx?raw';
import mapMarkerSrc from '@/primitives/MapMarker.tsx?raw';
import mapIconsSrc from '@/primitives/MapIcons.tsx?raw';
import tokensSrc from '@/primitives/tokens.ts?raw';
import markerStylesSrc from '@/primitives/markerStyles.ts?raw';
import barrelIndexSrc from '@/primitives/index.ts?raw';

interface RelatedFile {
  file: string;
  code: string;
}

const BARREL_FILE: RelatedFile = { file: 'index.ts', code: barrelIndexSrc };
const TOKENS_FILE: RelatedFile = { file: 'tokens.ts', code: tokensSrc };

const COMMON_FILES: RelatedFile[] = [TOKENS_FILE, BARREL_FILE];

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
  TOKENS_FILE, BARREL_FILE,
];

const MARKER_FILES: RelatedFile[] = [
  { file: 'markerStyles.ts', code: markerStylesSrc },
  { file: 'MapIcons.tsx', code: mapIconsSrc },
  TOKENS_FILE, BARREL_FILE,
];

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

// ─── CesiumMap demo data ─────────────────────────────────────────────────────

const CESIUM_ION_TOKEN = (import.meta.env.VITE_CESIUM_ION_TOKEN as string | undefined) ?? '';

const cesiumDemoBasicMarkers: CesiumMarker[] = [
  { id: 'm-1', lat: 32.470, lon: 35.005, label: 'Drone', color: '#fa5252' },
  { id: 'm-2', lat: 32.463, lon: 34.998, label: 'Patrol', color: '#74c0fc' },
  { id: 'm-3', lat: 32.467, lon: 35.012, label: 'Sensor', color: '#22b8cf' },
];

const cesiumDemoFovMarkers: CesiumMarker[] = [
  {
    id: 'cam-north',
    lat: 32.4776,
    lon: 34.9913,
    label: 'PTZ-N',
    color: '#74c0fc',
    fov: { rangeM: 1500, bearingDeg: 135, widthDeg: 60 },
  },
  {
    id: 'cam-south',
    lat: 32.4526,
    lon: 35.0013,
    label: 'PTZ-S',
    color: '#74c0fc',
    fov: { rangeM: 1500, bearingDeg: 45, widthDeg: 60 },
  },
  {
    id: 'reg-east',
    lat: 32.4646,
    lon: 35.0213,
    label: 'Regulus East',
    color: '#fa5252',
    coverageRadiusM: 2500,
  },
];

function CesiumFlyToDemo() {
  const [target, setTarget] = useState<{ lat: number; lon: number; heightM?: number } | null>({
    lat: 32.466,
    lon: 35.005,
    heightM: 10000,
  });

  const flyTo = (lat: number, lon: number, heightM: number) => {
    // Always pass a NEW object so the effect re-runs.
    setTarget({ lat, lon, heightM });
  };

  return (
    <PreviewPanel align="stretch">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => flyTo(32.4776, 34.9913, 4000)}
            className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.06)] px-3 py-1.5 text-[13px] font-medium text-n-11 hover:bg-white/[0.08] hover:text-white transition-colors"
          >
            Fly to Camera North
          </button>
          <button
            type="button"
            onClick={() => flyTo(32.4646, 35.0213, 4000)}
            className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.06)] px-3 py-1.5 text-[13px] font-medium text-n-11 hover:bg-white/[0.08] hover:text-white transition-colors"
          >
            Fly to Regulus East
          </button>
          <button
            type="button"
            onClick={() => flyTo(32.466, 35.005, 12000)}
            className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.06)] px-3 py-1.5 text-[13px] font-medium text-n-11 hover:bg-white/[0.08] hover:text-white transition-colors"
          >
            Zoom out
          </button>
        </div>
        <div className="h-[420px] rounded-lg overflow-hidden">
          <CesiumMap
            ionToken={CESIUM_ION_TOKEN}
            initialView={{ lat: 32.466, lon: 35.005, heightM: 10000 }}
            markers={cesiumDemoFovMarkers}
            flyTo={target}
            sceneMode="2D"
          />
        </div>
      </div>
    </PreviewPanel>
  );
}

// ─── DevicesPanel demo data ──────────────────────────────────────────────────

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
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-16 space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-[30px] font-bold tracking-tight text-n-12" style={{ textWrap: 'balance' }}>{name}</h2>
        <p className="text-[16px] font-normal leading-7 text-n-9" style={{ textWrap: 'pretty' }}>{description}</p>
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
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
  tight?: boolean;
}) {
  return (
    <div id={id} className={`space-y-4 mt-10 first:mt-0 ${id ? 'scroll-mt-20' : ''}`}>
      <h3 className="text-[14px] font-medium text-n-10">{title}</h3>
      <PreviewPanel tight={tight}>{children}</PreviewPanel>
    </div>
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
          className="p-2.5 rounded-md text-n-120 hover:text-n-11 hover:bg-white/[0.08] active:scale-[0.92] transition-[color,background-color,transform] duration-150 ease-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>
        <a
          href={downloadHref}
          download={`${name}.svg`}
          aria-label="Download SVG"
          className="p-2.5 rounded-md text-n-120 hover:text-n-11 hover:bg-white/[0.08] active:scale-[0.92] transition-[color,background-color,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
        >
          <Download size={14} />
        </a>
      </div>
    </div>
  );
}

function StyleguideDeviceTile({ label, children, width = 380 }: { label: string; children: React.ReactNode; width?: number }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-medium text-n-9">{label}</span>
      <div className="bg-n-1 border border-white/10 rounded-lg overflow-hidden" style={{ width }}>
        {children}
      </div>
    </div>
  );
}

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

interface PropDef {
  name: string;
  type: string;
  default?: string;
  description: string;
}

function PropsTable({ items }: { items: PropDef[] }) {
  return (
    <div className="space-y-4 mt-6 mb-4">
      <div className="overflow-x-auto rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.06)]" dir="ltr">
        <table className="w-full text-[13px]" dir="ltr">
          <thead>
            <tr className="border-b border-white/5" style={{ backgroundColor: SURFACE.level1 }}>
              <th className="py-2.5 px-4 text-left font-medium text-n-10">Prop</th>
              <th className="py-2.5 px-4 text-left font-medium text-n-10">Type</th>
              <th className="py-2.5 px-4 text-left font-medium text-n-10">Default</th>
              <th className="py-2.5 px-4 text-left font-medium text-n-10">Description</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.name} className="border-b border-white/[0.03] last:border-0">
                <td className="py-3 px-4 font-mono text-[13px] text-sky-300/90 font-medium">{p.name}</td>
                <td className="py-3 px-4 font-mono text-n-9">{p.type}</td>
                <td className="py-3 px-4 font-mono text-n-9">{p.default ?? '—'}</td>
                <td className="py-3 px-4 text-n-9">{p.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Section layout helpers (shadcn-style) ───────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[20px] font-semibold text-n-12 tracking-tight mt-12 first:mt-0 mb-3">
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
        <h4 className="text-[15px] font-semibold text-n-12 tracking-tight">{title}</h4>
        <p className="text-[16px] font-normal leading-relaxed text-white/50 tracking-wide">{description}</p>
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
            className="absolute bottom-2.5 left-3 z-10 text-[10px] font-medium text-n-120 uppercase tracking-[0.06em] transition-opacity duration-150 ease-out pointer-events-none"
            style={{ opacity: hovered ? 1 : 0 }}
          >
            Interactive
          </span>

          {/* Map zone */}
          <div
            className="flex-1 flex flex-col min-w-0"
            style={{ background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.4) 100%), ${SURFACE.level0}` }}
          >
            <span className="block text-[10px] font-semibold text-n-120 uppercase tracking-[0.08em] px-4 pt-3 pb-1.5">Map</span>
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
            <span className="block text-[10px] font-semibold text-n-120 uppercase tracking-[0.08em] px-4 pt-3 pb-1.5">Card</span>
            <div dir="rtl" className="flex-1 px-4 pb-4 flex flex-col justify-center">{cardZone}</div>
          </div>
        </div>

        {/* Step sequence */}
        <div className="border-t border-white/[0.06] px-5 py-4">
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-[11px] font-bold text-sky-400 tabular-nums font-mono leading-[1.6] shrink-0 w-4 text-right">{i + 1}</span>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[13px] font-medium text-n-11">{step.label}</span>
                  {step.detail && (
                    <span className="text-[12px] text-n-9 leading-relaxed font-mono font-medium" style={{ fontVariantNumeric: 'slashed-zero' }}>
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
              className="transition-colors hover:bg-white/5"
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
                pulse={flow1Hovered}
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
        description="Hovering a card activates the map marker pulse. Clicking expands the card and pans the map."
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
              className="transition-colors hover:bg-white/5"
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
                    className="px-3 py-3 text-[11px] text-n-9"
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
              pulse={flow2Hovered || flow2Open}
            />
            <span className="text-[10px] font-medium text-n-120 tabular-nums">
              {flow2Open ? 'Active (open)' : flow2Hovered ? 'Pulsing (hover)' : 'Idle'}
            </span>
          </div>
        }
        steps={[
          { label: 'User hovers detection card in sidebar' },
          { label: 'Marker immediately enters active state with pulse' },
          { label: 'User clicks card header to expand' },
          { label: 'Map pans to target coordinates' },
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
                    className="px-3 py-3 text-[11px] text-n-9"
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
              <span className="text-[10px] font-medium text-n-9">Click me</span>
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
                icon={<RadarIcon size={24} fill={flow5HoveredSensor === 'rf-01' ? friendlyHovered.glyphColor : friendlyDefault.glyphColor} />}
                style={flow5HoveredSensor === 'rf-01' ? friendlyHovered : friendlyDefault}
                surfaceSize={38}
                ringSize={30}
                pulse={flow5HoveredSensor === 'rf-01'}
                showLabel={flow5HoveredSensor === 'rf-01'}
                label="RF Scanner"
              />
              <span className="text-[10px] font-medium text-n-120">rf-01</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <MapMarker
                icon={<RadarIcon size={24} fill={flow5HoveredSensor === 'radar-01' ? friendlyHovered.glyphColor : friendlyDefault.glyphColor} />}
                style={flow5HoveredSensor === 'radar-01' ? friendlyHovered : friendlyDefault}
                surfaceSize={38}
                ringSize={30}
                pulse={flow5HoveredSensor === 'radar-01'}
                showLabel={flow5HoveredSensor === 'radar-01'}
                label="Radar X-Band"
              />
              <span className="text-[10px] font-medium text-n-120">radar-01</span>
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
  const noopMute = useCallback((_id: string) => {}, []);

  return (
    <div className="space-y-8">

      {/* ── Flow: Hover Device Row → Map Highlight ── */}
      <InteractionFlowBlock
        id="flow-hover-device"
        title="Hover Device Row → Map Highlight"
        description="Hovering a device row in the DevicesPanel highlights the corresponding asset marker on the map with inner glow + pulse."
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
              isMuted={false}
              muteRemaining={null}
              onToggleMute={noopMute}
            />
            <DeviceRow
              device={hoverDeviceCam2}
              isExpanded={false}
              onToggle={noop}
              onHover={(id) => setFlowHoverDeviceId(id)}
              onFlyTo={noopFlyTo}
              isMuted={false}
              muteRemaining={null}
              onToggleMute={noopMute}
            />
          </div>
        }
        mapZone={
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <MapMarker
                icon={<CameraIcon size={24} fill={flowHoverDeviceId === hoverDeviceCam1.id ? friendlyHovered.glyphColor : friendlyDefault.glyphColor} />}
                style={flowHoverDeviceId === hoverDeviceCam1.id ? friendlyHovered : friendlyDefault}
                surfaceSize={38}
                ringSize={30}
                pulse={flowHoverDeviceId === hoverDeviceCam1.id}
              />
              <span className="text-[10px] font-medium text-n-120">PTZ-N</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <MapMarker
                icon={<CameraIcon size={24} fill={flowHoverDeviceId === hoverDeviceCam2.id ? friendlyHovered.glyphColor : friendlyDefault.glyphColor} />}
                style={flowHoverDeviceId === hoverDeviceCam2.id ? friendlyHovered : friendlyDefault}
                surfaceSize={38}
                ringSize={30}
                pulse={flowHoverDeviceId === hoverDeviceCam2.id}
              />
              <span className="text-[10px] font-medium text-n-120">Pixelsight</span>
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
              isMuted={false}
              muteRemaining={null}
              onToggleMute={noopMute}
            />
            <DeviceRow
              device={flow4DeviceCam2}
              isExpanded={false}
              onToggle={noop}
              onHover={(id) => setFlow4HoveredRow(id)}
              onFlyTo={noopFlyTo}
              isMuted={false}
              muteRemaining={null}
              onToggleMute={noopMute}
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
                icon={<CameraIcon size={24} fill={flow4Selected || flow4HoveredRow === flow4DeviceCam1.id ? friendlySelected.glyphColor : friendlyDefault.glyphColor} />}
                style={flow4Selected || flow4HoveredRow === flow4DeviceCam1.id ? friendlySelected : friendlyDefault}
                surfaceSize={38}
                ringSize={30}
                pulse={flow4Selected || flow4HoveredRow === flow4DeviceCam1.id}
              />
              <span className="text-[10px] font-medium text-n-9">PTZ-N</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <MapMarker
                icon={<CameraIcon size={24} fill={flow4HoveredRow === flow4DeviceCam2.id ? friendlyHovered.glyphColor : friendlyDefault.glyphColor} />}
                style={flow4HoveredRow === flow4DeviceCam2.id ? friendlyHovered : friendlyDefault}
                surfaceSize={38}
                ringSize={30}
                pulse={flow4HoveredRow === flow4DeviceCam2.id}
              />
              <span className="text-[10px] font-medium text-n-120">Pixelsight</span>
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
                <span className="text-[13px] font-medium text-n-10 block truncate">מצלמה PTZ-N</span>
                <div className="text-[11px] font-mono tabular-nums text-white/50 truncate">
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
              <span className="text-[11px] text-n-120">
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
                icon={<CameraIcon size={24} fill={friendlyDefault.glyphColor} />}
                style={friendlyDefault}
                surfaceSize={38}
                ringSize={30}
              />
            </div>
            <span className="absolute text-[10px] font-medium text-n-120" style={{ left: flow7CamPos.x, top: flow7CamPos.y + 28, transform: 'translateX(-50%)' }}>Camera</span>

            {/* Target marker — fixed */}
            <div className="absolute" style={{ left: flow7TargetPos.x, top: flow7TargetPos.y, transform: 'translate(-50%, -50%)' }}>
              <MapMarker
                icon={<SensorIcon size={24} fill={flow7OnTarget ? hoveredStyle.glyphColor : defaultStyle.glyphColor} />}
                style={flow7OnTarget ? hoveredStyle : defaultStyle}
                surfaceSize={36}
                ringSize={28}
                pulse={flow7OnTarget}
              />
            </div>
            <span className="absolute text-[10px] font-medium text-n-120" style={{ left: flow7TargetPos.x, top: flow7TargetPos.y + 28, transform: 'translateX(-50%)' }}>Target</span>
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

// ─── Engagement Line Preview + Source ────────────────────────────────────────

const ENGAGEMENT_LINE_SOURCE = `// ── Engagement line animation (from useEngagementLine.ts) ────────────────

// Mapbox GL layers: dashed line + traveling particle circles
// Color: #ffffff (standby) → #f59e0b (weapon pointing) → #ef4444 (mitigating / locked)

// ── 1. Dashed line (marching dash) ──────────────────────────────────────────

const D = 4;
const PERIOD = D + D;            // 8
const TOTAL_STEPS = 32;
// ~20 ms throttle via requestAnimationFrame

const animate = (time: number) => {
  if (time - lastTime > 20) {
    lastTime = time;
    step = (step + 1) % TOTAL_STEPS;
    const s = (step / TOTAL_STEPS) * PERIOD;
    const pattern: number[] =
      s < 0.01       ? [D, D] :
      s < D          ? [0, s, D, D - s] :
      s > PERIOD - 0.01 ? [D, D] :
                       [s - D, D, PERIOD - s, 0.01];
    map.setPaintProperty('engagement-line-dash', 'line-dasharray', pattern);
  }
  frameId = requestAnimationFrame(animate);
};

// Line layer paint:
// {
//   'line-color': flowConfig.lineColor(phase),  // #ffffff → #f59e0b → #ef4444
//   'line-width': 2,
//   'line-dasharray': [4, 4],  ← animated
// }

// ── 2. Traveling particles (spring-eased) ───────────────────────────────────

const COUNT = 3;                  // evenly spaced at 0, 1/3, 2/3
const SPEED = 0.25;               // normalized units / sec

// Spring lookup table
const stiffness = 160, damping = 70, mass = 1;
const steps = 300;
const dt = 1 / 120;
let x = 0, v = 0;
const lut: number[] = [];
for (let i = 0; i <= steps; i++) {
  lut.push(Math.max(0, Math.min(x, 1.5)));
  const a = (-stiffness * (x - 1) - damping * v) / mass;
  v += a * dt;
  x += v * dt;
}

const easeSpring = (t: number) => {
  const idx = t * (lut.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, lut.length - 1);
  return lut[lo] + (lut[hi] - lut[lo]) * (idx - lo);
};

// Particle layers paint:
// Glow:  { 'circle-radius': 14, 'circle-opacity': 0.225, 'circle-blur': 1 }
// Core:  { 'circle-radius': 4,  'circle-opacity': 0.9 }

// ── 3. Distance badge ───────────────────────────────────────────────────────

// Position: midpoint of effector ↔ target
// Style:    rounded px-2 py-1 font-mono text-xs tabular-nums
// Shadow:   0 2px 8px rgba(0,0,0,0.4)
// Format:   < 1000 → \${Math.round(m)}m   |   >= 1000 → \${(m/1000).toFixed(1)} km
// Bg:       flowConfig.badgeTextColor(phase) drives badge background
// Text:     contrasts with bg — white on red/amber, black on white

// ── 4. Reduced motion ───────────────────────────────────────────────────────

// Both animations bail early when prefers-reduced-motion: reduce
// Line and particles still render statically — only the motion stops.
`;

function EngagementLineAnimatedPreview({ color }: { color: string }) {
  const effectorStyle = resolveMarkerStyle('default', 'friendly');
  const hostileStyle = resolveMarkerStyle('default', 'hostile');
  const isRed = color === '#ef4444';
  const badgeBg = isRed ? '#ef4444' : '#ffffff';
  const badgeText = isRed ? '#ffffff' : '#000000';

  const lineY = 75;
  const markerR = 21;

  const prefersReducedMotion = useReducedMotion();

  const springLut = useMemo(() => {
    const stiffness = 160, damping = 70, mass = 1;
    const steps = 300;
    const dt = 1 / 120;
    let x = 0, v = 0;
    const lut: number[] = [];
    for (let i = 0; i <= steps; i++) {
      lut.push(Math.max(0, Math.min(x, 1.5)));
      const a = (-stiffness * (x - 1) - damping * v) / mass;
      v += a * dt;
      x += v * dt;
    }
    return lut;
  }, []);

  const particleTRef = useRef<number[]>([0, 1 / 3, 2 / 3]);
  const dashStepRef = useRef(0);
  const [particlePositions, setParticlePositions] = useState<number[]>([0.17, 0.5, 0.83]);
  const [dashOffset, setDashOffset] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(600);
  // Pause the rAF loop when the preview is offscreen or the tab is hidden —
  // multiple instances of this preview render simultaneously on the styleguide
  // page and each one runs an unconditional rAF + setState every frame.
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (!isVisible) return;
    let frameId: number;
    let lastTime = 0;

    const easeSpring = (t: number) => {
      const idx = t * (springLut.length - 1);
      const lo = Math.floor(idx);
      const hi = Math.min(lo + 1, springLut.length - 1);
      return springLut[lo] + (springLut[hi] - springLut[lo]) * (idx - lo);
    };

    const animate = (time: number) => {
      const dt = lastTime ? (time - lastTime) / 1000 : 0;
      lastTime = time;

      const ts = particleTRef.current;
      for (let i = 0; i < 3; i++) {
        ts[i] = (ts[i] + 0.25 * dt) % 1;
      }
      setParticlePositions(ts.map(easeSpring));

      dashStepRef.current = (dashStepRef.current + dt * 50) % 16;
      setDashOffset(dashStepRef.current);

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [prefersReducedMotion, springLut, isVisible]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const ro = new ResizeObserver(([e]) => setCw(e.contentRect.width));
    ro.observe(node);

    let inView = true;
    let documentVisible = typeof document !== 'undefined' ? !document.hidden : true;
    const apply = () => setIsVisible(inView && documentVisible);

    const io = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? false;
        apply();
      },
      { threshold: 0.01 },
    );
    io.observe(node);

    const onVisibility = () => {
      documentVisible = !document.hidden;
      apply();
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      ro.disconnect();
      io.disconnect();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, []);

  const pad = 32;
  const leftX = pad + markerR;
  const rightX = cw - pad - markerR;
  const lineStart = leftX + markerR + 4;
  const lineEnd = rightX - markerR - 4;
  const lineLen = Math.max(lineEnd - lineStart, 1);
  const midX = (lineStart + lineEnd) / 2;
  const particleFullLen = rightX - leftX;

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl border border-white/10"
      style={{
        background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.4) 100%), ${SURFACE.level0}`,
        height: 150,
      }}
    >
      <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
        <line
          x1={lineStart} y1={lineY} x2={lineEnd} y2={lineY}
          stroke={color} strokeWidth={2}
          strokeDasharray="8 8"
          strokeDashoffset={-dashOffset}
          strokeOpacity={0.8}
        />
        {particlePositions.map((t, i) => {
          const clamped = Math.min(t, 1);
          const cx = leftX + particleFullLen * clamped;
          const fadeIn = Math.min(clamped / 0.08, 1);
          const fadeOut = Math.min((1 - clamped) / 0.08, 1);
          const alpha = fadeIn * fadeOut;
          if (alpha <= 0) return null;
          return (
            <g key={i} opacity={alpha}>
              <circle cx={cx} cy={lineY} r={14} fill={color} opacity={0.15} />
              <circle cx={cx} cy={lineY} r={4} fill={color} opacity={0.9} />
            </g>
          );
        })}
      </svg>

      <div className="absolute" style={{ left: leftX - markerR, top: lineY - markerR }}>
        <MapMarker
          icon={<LauncherIcon size={20} fill={effectorStyle.glyphColor} />}
          style={effectorStyle}
          surfaceSize={42}
          ringSize={34}
        />
      </div>

      <div className="absolute" style={{ left: rightX - markerR, top: lineY - markerR }}>
        <MapMarker
          icon={<DroneIcon rotationDeg={-22} color={hostileStyle.glyphColor} />}
          style={hostileStyle}
          surfaceSize={42}
          ringSize={34}
        />
      </div>

      <div className="absolute" style={{ left: midX - 28, top: lineY - 14 }}>
        <div
          className="rounded px-2 py-1 font-mono text-xs tabular-nums whitespace-nowrap pointer-events-none select-none"
          style={{ backgroundColor: badgeBg, color: badgeText, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
        >
          1.2 km
        </div>
      </div>

      <div className="absolute text-[10px] text-n-120 font-medium" style={{ left: leftX - 12, top: lineY + 30 }}>Effector</div>
      <div className="absolute text-[10px] text-n-120 font-medium text-right" style={{ left: rightX - 12, top: lineY + 30 }}>Target</div>
    </div>
  );
}

function EngagementLineFlows() {
  return (
    <div className="space-y-8">

      {/* ── Animated preview ── */}
      <div id="engagement-anatomy" className="scroll-mt-12 space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-n-12">Line Anatomy</h3>
          <p className="text-[16px] font-normal leading-relaxed text-white/50 tracking-wide">
            Dashed engagement line with spring-eased traveling particles and a midpoint distance badge. Connects the selected effector to the active target via Mapbox GL layers.
          </p>
        </div>
        <div className="space-y-3">
          <span className="text-[11px] font-semibold text-n-9 uppercase tracking-[0.06em]">Standby (selected)</span>
          <EngagementLineAnimatedPreview color="#ffffff" />
        </div>
        <div className="space-y-3">
          <span className="text-[11px] font-semibold text-n-9 uppercase tracking-[0.06em]">Weapon Pointing (aiming)</span>
          <EngagementLineAnimatedPreview color="#f59e0b" />
        </div>
        <div className="space-y-3">
          <span className="text-[11px] font-semibold text-n-9 uppercase tracking-[0.06em]">Mitigating / Locked</span>
          <EngagementLineAnimatedPreview color="#ef4444" />
        </div>
      </div>

      {/* ── Source / spec ── */}
      <div id="engagement-spec" className="scroll-mt-12 pt-10">
        <CodePreviewBlock
          name="Engagement Line"
          description="Animation constants, spring LUT, layer paint values, distance badge format, and reduced-motion behavior."
          code={ENGAGEMENT_LINE_SOURCE}
        >
          <div className="space-y-6" dir="ltr">
            <div className="grid grid-cols-2 gap-4 text-[12px]">
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-n-9 uppercase tracking-[0.06em]">Dashed line</span>
                <div className="space-y-1 font-mono text-n-10">
                  <div>dash: <span className="text-sky-300/80">[4, 4]</span> period: <span className="text-sky-300/80">8</span></div>
                  <div>cycle: <span className="text-sky-300/80">32</span> steps, <span className="text-sky-300/80">~20ms</span> throttle</div>
                  <div>width: <span className="text-sky-300/80">2px</span></div>
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-n-9 uppercase tracking-[0.06em]">Particles</span>
                <div className="space-y-1 font-mono text-n-10">
                  <div>count: <span className="text-sky-300/80">3</span> speed: <span className="text-sky-300/80">0.25</span>/s</div>
                  <div>spring: <span className="text-sky-300/80">160</span> / <span className="text-sky-300/80">70</span> / <span className="text-sky-300/80">1</span></div>
                  <div>glow: r<span className="text-sky-300/80">14</span> α<span className="text-sky-300/80">0.225</span> core: r<span className="text-sky-300/80">4</span> α<span className="text-sky-300/80">0.9</span></div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-[12px]">
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-n-9 uppercase tracking-[0.06em]">Colors</span>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-mono text-n-10">
                    <span className="inline-block w-3 h-3 rounded-full bg-white border border-white/20" />
                    standby <span className="text-sky-300/80">#ffffff</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-n-10">
                    <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                    weapon pointing <span className="text-sky-300/80">#f59e0b</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-n-10">
                    <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
                    mitigating / locked <span className="text-sky-300/80">#ef4444</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-n-9 uppercase tracking-[0.06em]">Badge</span>
                <div className="space-y-1 font-mono text-n-10">
                  <div>pos: <span className="text-n-9">midpoint</span></div>
                  <div>shadow: <span className="text-sky-300/80">0 2px 8px</span> rgba(0,0,0,0.4)</div>
                  <div>&lt;1000m → Xm, else → X.X km</div>
                </div>
              </div>
            </div>
            <div className="text-[12px] text-white/50">
              Both animations respect <code className="text-white/60 font-mono">prefers-reduced-motion: reduce</code> — line and particles render statically.
            </div>
          </div>
        </CodePreviewBlock>
      </div>

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
      className="p-1.5 rounded cursor-pointer text-n-7 hover:text-n-10 hover:bg-white/[0.08] active:scale-[0.94] transition-[color,background-color,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
    >
      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
    </button>
  );
}

function ImportBlock({ path, names }: { path: string; names: string[] }) {
  const code = `import { ${names.join(', ')} } from '${path}'`;
  return (
    <div className="flex items-center rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.06)] overflow-hidden" style={{ backgroundColor: SURFACE.level0 }}>
      <div className="flex-1 min-w-0 px-4 py-3 overflow-x-auto">
        <HighlightedCode code={code} />
      </div>
      <div className="shrink-0 pr-2">
        <InlineCopyButton text={code} />
      </div>
    </div>
  );
}


function ChangelogLine({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('`') && part.endsWith('`') ? (
          <code key={i} className="text-[13px] font-mono text-sky-300/80 bg-white/[0.04] px-1.5 py-0.5 rounded">
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
  return (
    <div className="flex items-start rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.06)] overflow-hidden" style={{ backgroundColor: SURFACE.level0 }}>
      <div className="flex-1 min-w-0 px-4 py-3 overflow-x-auto">
        <HighlightedCode code={code} />
      </div>
      <div className="shrink-0 pt-2 pr-2">
        <InlineCopyButton text={code} />
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

  useEffect(() => {
    let cancelled = false;
    getHighlighter().then((highlighter) => {
      if (cancelled) return;
      setHtml(
        highlighter.codeToHtml(code, {
          lang: 'tsx',
          theme: 'winter-is-coming-dark-blue',
        }),
      );
    });
    return () => { cancelled = true; };
  }, [code]);

  if (!html) {
    return (
      <pre className="text-[12px] leading-[1.7] font-mono text-n-10 whitespace-pre">
        {code}
      </pre>
    );
  }

  return (
    <div
      className="[&_pre]:!bg-transparent [&_pre]:text-[12px] [&_pre]:leading-[1.7] [&_pre]:font-mono [&_pre]:font-medium [&_code]:font-mono [&_code]:font-medium"
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

function extractDependencies(source: string): { external: string[]; internal: string[] } {
  const external: string[] = [];
  const internal: string[] = [];
  const importRegex = /^import\s+.*?from\s+['"]([^'"]+)['"]/gm;
  let match;
  while ((match = importRegex.exec(source)) !== null) {
    const line = match[0];
    const path = match[1];
    if (path.startsWith('.') || path.startsWith('@/')) {
      internal.push(line);
    } else {
      external.push(line);
    }
  }
  return { external, internal };
}

function generateComponentMarkdown(name: string, description: string, source: string): string {
  const lines: string[] = [];

  lines.push(`# ${name}\n`);
  lines.push(`> ${description}\n`);

  const props = extractPropsInterface(source);
  if (props) {
    lines.push(`## Props Interface\n`);
    lines.push('```typescript');
    lines.push(props);
    lines.push('```\n');
  }

  lines.push(`## Source Code\n`);
  lines.push('```tsx');
  lines.push(source.trim());
  lines.push('```\n');

  const deps = extractDependencies(source);
  if (deps.external.length > 0 || deps.internal.length > 0) {
    lines.push(`## Dependencies\n`);
    if (deps.external.length > 0) {
      lines.push('**External:**');
      for (const d of deps.external) lines.push(`- \`${d}\``);
      lines.push('');
    }
    if (deps.internal.length > 0) {
      lines.push('**Internal:**');
      for (const d of deps.internal) lines.push(`- \`${d}\``);
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ─── Animated copy button ─────────────────────────────────────────────────────

function CopyIconButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  const iconTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.15, ease: [0, 0, 0.2, 1] };

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? 'Copied' : 'Copy component as markdown'}
      className="flex items-center gap-1.5 h-7 px-2.5 rounded-[10px_4px_4px_4px] cursor-pointer text-n-120 hover:text-n-11 hover:bg-white/[0.06] active:scale-[0.96] transition-[color,background-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30"
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="check"
            className="flex items-center gap-1.5"
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.9 }}
            transition={iconTransition}
          >
            <Check size={13} className="text-emerald-400" />
            <span className="text-[11px] font-medium text-emerald-400">Copied</span>
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            className="flex items-center gap-1.5"
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.9 }}
            transition={iconTransition}
          >
            <Copy size={13} />
            <span className="text-[11px] font-medium">Copy .md</span>
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

// ─── Code preview with tabs ───────────────────────────────────────────────────

type CodeTab = 'preview' | 'source' | 'files';

function CodePreviewBlock({
  name,
  description,
  code,
  children,
  tight = false,
  relatedFiles,
}: {
  name: string;
  description: string;
  code: string;
  children?: React.ReactNode;
  tight?: boolean;
  relatedFiles?: RelatedFile[];
}) {
  const hasPreview = !!children;
  const hasFiles = relatedFiles && relatedFiles.length > 0;
  const [tab, setTab] = useState<CodeTab>(hasPreview ? 'preview' : 'source');
  const [activeFile, setActiveFile] = useState(0);

  const tabs: { id: CodeTab; label: string }[] = [
    ...(hasPreview ? [{ id: 'preview' as CodeTab, label: 'Preview' }] : []),
    { id: 'source', label: 'Source' },
    ...(hasFiles ? [{ id: 'files' as CodeTab, label: 'Files' }] : []),
  ];

  const markdown = useMemo(
    () => generateComponentMarkdown(name, description, code),
    [name, description, code],
  );

  return (
    <div className="rounded-xl shadow-[0_0_0_1px_rgba(255,255,255,0.06)] overflow-hidden" style={{ backgroundColor: SURFACE.level0 }}>
      <div className="flex items-center border-b border-white/[0.06]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2.5 text-[13px] font-medium cursor-pointer transition-[color,border-color] duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/25 ${
              tab === t.id
                ? 'text-n-12 border-b-2 border-n-12'
                : 'text-n-9 hover:text-n-11 border-b-2 border-transparent'
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center pl-1.5">
          <CopyIconButton text={markdown} />
        </div>
      </div>
      {tab === 'preview' && (
        <div
          dir="rtl"
          className={
            tight
              ? 'p-6'
              : 'p-10 flex items-center justify-center min-h-[200px]'
          }
        >
          {children}
        </div>
      )}
      {tab === 'source' && (
        <div className="relative p-4 overflow-x-auto max-h-[600px] overflow-y-auto rounded-b-xl text-[13px]">
          <div className="absolute top-2 right-2 z-10">
            <InlineCopyButton text={code} />
          </div>
          <HighlightedCode code={code} />
        </div>
      )}
      {tab === 'files' && hasFiles && (
        <div className="flex">
          <div className="shrink-0 border-r border-white/[0.06] py-3 min-w-[200px] max-w-[240px]">
            {relatedFiles.map((f, i) => (
              <button
                key={f.file}
                onClick={() => setActiveFile(i)}
                className={`block w-full text-left px-4 py-2 text-[13px] font-mono cursor-pointer transition-colors duration-100 ${
                  activeFile === i
                    ? 'text-sky-300/90 bg-white/[0.06]'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.02]'
                }`}
              >
                {f.file}
              </button>
            ))}
          </div>
          <div className="relative flex-1 p-4 overflow-x-auto max-h-[600px] overflow-y-auto">
            <div className="absolute top-2 right-2 z-10">
              <InlineCopyButton text={relatedFiles[activeFile].code} />
            </div>
            <HighlightedCode code={relatedFiles[activeFile].code} />
          </div>
        </div>
      )}
    </div>
  );
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
          <span className="text-[11px] font-mono text-n-10">{key}</span>
          {usage && <span className="text-[10px] text-n-120 text-center leading-tight">{usage}</span>}
        </div>
      ))}
    </div>
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
            <span className="text-[11px] font-medium text-n-10 tabular-nums">{key}</span>
            <span className="text-[10px] font-mono text-n-9 tabular-nums">α {opacity}</span>
            <span className="text-[10px] font-mono text-n-9">{hex}</span>
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
            <span className="text-[10px] font-medium text-n-10">Base surface</span>
            <span className="text-[11px] font-mono text-n-10">{ELEVATION.baseSurface}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg px-3 py-2 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]" style={{ backgroundColor: SURFACE.level0 }}>
          <div
            className="w-10 h-6 rounded"
            style={{ backgroundColor: SURFACE.level2, boxShadow: ELEVATION.shadow }}
          />
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium text-n-10">Shadow</span>
            <code className="text-[10px] font-mono text-n-9 max-w-[220px] truncate" title={ELEVATION.shadow}>{ELEVATION.shadow}</code>
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
  return <StatusChip label={ACTIVITY_STATUS_LABELS[status] ?? status} color={ACTIVITY_STATUS_CHIP_COLOR[status] ?? 'gray'} />;
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
      accent={slots.accent}
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
            <div className="flex items-center gap-1 text-[9px] text-n-120">
              <Hand size={10} className="text-n-120" aria-hidden="true" />
              <span>סגירה ידנית</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[9px] text-n-120">
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
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-n-9 mb-1.5">
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
                    className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium cursor-pointer transition-[color,background-color,box-shadow] duration-150 ease-out active:scale-[0.97] ${
                      isActive
                        ? 'bg-white/[0.1] text-n-12 shadow-[0_0_0_1px_rgba(255,255,255,0.15)]'
                        : 'text-n-120 hover:text-n-10 hover:bg-white/[0.04]'
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
        <h3 className="text-[13px] font-medium text-n-10">Computed Visual Properties</h3>
        <div className="overflow-x-auto rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.06)]" dir="ltr">
          <table className="w-full text-[12px]" dir="ltr">
            <thead>
              <tr className="border-b border-white/5" style={{ backgroundColor: SURFACE.level1 }}>
                <th className="py-2 px-3 text-left font-medium text-n-9">Property</th>
                <th className="py-2 px-3 text-left font-medium text-n-9">Value</th>
                <th className="py-2 px-3 text-left font-medium text-n-9">Visual</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.03]">
                <td className="py-2 px-3 font-mono text-sky-300/80">accent</td>
                <td className="py-2 px-3 font-mono text-n-10">{slots.accent}</td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                      style={{ backgroundColor: CARD_TOKENS.spine.colors[slots.accent] }}
                    />
                    <span className="font-mono text-n-9 text-[11px]">{CARD_TOKENS.spine.colors[slots.accent]}</span>
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
                        className="w-4 h-4 rounded shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                        style={{ backgroundColor: slots.header.iconColor }}
                      />
                      <span className="font-mono text-n-9 text-[11px]">{slots.header.iconColor}</span>
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
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
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
                initial={prefersReducedMotionRoot ? false : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
              >

            {activeItem === 'quick-start' && (
            <ComponentSection id="quick-start" name="Quick Start" description="Install C2 Hub components into any Vite + React project via the CLI.">
              <div className="space-y-8">

                <div className="space-y-3">
                  <SectionHeading>Install</SectionHeading>
                  <p className="text-[16px] font-normal leading-relaxed text-white/50 tracking-wide">
                    Install every component, token, and icon in one command:
                  </p>
                  <QuickStartCodeBlock code="npx shadcn@latest add @c2/all" />
                  <p className="text-[16px] font-normal leading-relaxed text-white/50 tracking-wide mt-2">
                    Or pick only what you need:
                  </p>
                  <QuickStartCodeBlock code="npx shadcn@latest add @c2/button @c2/target-card @c2/status-chip" />
                  <p className="text-[16px] font-normal leading-relaxed text-white/50 tracking-wide mt-2">
                    Dependencies are resolved automatically — installing <code className="text-[13px] font-mono text-sky-300/80 bg-white/[0.04] px-1.5 py-0.5 rounded">target-card</code> pulls in <code className="text-[13px] font-mono text-sky-300/80 bg-white/[0.04] px-1.5 py-0.5 rounded">tokens</code>, <code className="text-[13px] font-mono text-sky-300/80 bg-white/[0.04] px-1.5 py-0.5 rounded">utils</code>, and any other internal dependencies.
                  </p>
                </div>

                <div className="space-y-3">
                  <SectionHeading>Use</SectionHeading>
                  <QuickStartCodeBlock code={`import { StatusChip, ActionButton } from "@/primitives"
import { Crosshair } from "lucide-react"

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
                  <p className="text-[16px] font-normal leading-relaxed text-white/50 tracking-wide mb-3">
                    First time? Complete these steps before installing components.
                  </p>

                  <p className="text-[16px] font-normal leading-relaxed text-white/50 tracking-wide">
                    <span className="text-n-11 font-medium">1.</span>{' '}Requires <span className="text-n-11 font-medium">Vite + React + TypeScript + Tailwind CSS v4</span> with <code className="text-[13px] font-mono text-sky-300/80 bg-white/[0.04] px-1.5 py-0.5 rounded">@/*</code> path aliases configured.
                  </p>

                  <p className="text-[16px] font-normal leading-relaxed text-white/50 tracking-wide mt-4">
                    <span className="text-n-11 font-medium">2.</span>{' '}Initialize shadcn if you don't have a <code className="text-[13px] font-mono text-sky-300/80 bg-white/[0.04] px-1.5 py-0.5 rounded">components.json</code> yet:
                  </p>
                  <QuickStartCodeBlock code="npx shadcn@latest init" />

                  <p className="text-[16px] font-normal leading-relaxed text-white/50 tracking-wide mt-4">
                    <span className="text-n-11 font-medium">3.</span>{' '}Add the C2 registry to your <code className="text-[13px] font-mono text-sky-300/80 bg-white/[0.04] px-1.5 py-0.5 rounded">components.json</code>:
                  </p>
                  <QuickStartCodeBlock code={`// components.json
{
  "registries": {
    "@c2": "https://c2-hub-three.vercel.app/r/{name}.json"
  }
}`} />

                  <p className="text-[16px] font-normal leading-relaxed text-white/50 tracking-wide mt-4">
                    <span className="text-n-11 font-medium">4.</span>{' '}Import the C2 theme in your CSS entry point:
                  </p>
                  <QuickStartCodeBlock code={`/* src/styles/index.css */
@import "tailwindcss";
@import "./theme.css";
@import "./fonts.css";`} />
                  <p className="text-[16px] font-normal leading-relaxed text-white/50 tracking-wide mt-1.5">
                    Copy <code className="text-[13px] font-mono text-sky-300/80 bg-white/[0.04] px-1.5 py-0.5 rounded">theme.css</code> and <code className="text-[13px] font-mono text-sky-300/80 bg-white/[0.04] px-1.5 py-0.5 rounded">fonts.css</code> from the C2 Hub repo into your project's styles directory.
                  </p>
                </div>

                <div className="space-y-3">
                  <SectionHeading>Updating</SectionHeading>
                  <p className="text-[16px] font-normal leading-relaxed text-white/50 tracking-wide">
                    Preview changes before updating:
                  </p>
                  <QuickStartCodeBlock code="npx shadcn@latest diff @c2/button" />
                  <p className="text-[16px] font-normal leading-relaxed text-white/50 tracking-wide mt-3">
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
                    <span className="block text-[13px] font-mono text-n-120" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {entry.date}
                    </span>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-[20px] font-semibold text-n-12 tracking-tight" style={{ fontVariantNumeric: 'tabular-nums', textWrap: 'balance' }}>
                        v{entry.version}
                      </h3>
                      {i === 0 && (
                        <span className="text-[11px] font-medium bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full select-none">
                          Latest
                        </span>
                      )}
                    </div>
                    <ul className="space-y-1.5 pl-4">
                      {entry.highlights.map((item) => (
                        <li key={item} className="text-[16px] font-normal leading-relaxed text-white/50 tracking-wide list-disc marker:text-white/30" style={{ textWrap: 'pretty' }}>
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
              <p className="text-[16px] font-normal text-white/50 mb-4 leading-relaxed tracking-wide">
                The design system uses two CSS files: <code className="text-[13px] font-mono text-n-10">theme.css</code> for semantic color tokens (light/dark) and Tailwind bindings, and <code className="text-[13px] font-mono text-n-10">index.css</code> for the neutral scale, tactical red palette, and global resets. Copy each into your project.
              </p>
              <div className="space-y-6">
                <CodePreviewBlock name="theme.css" description="Semantic color tokens, Tailwind @theme bindings, and base typography." code={themeCssSrc} />
                <CodePreviewBlock name="index.css" description="Neutral scale, tactical red palette, custom theme colors, and global resets." code={indexCssSrc} />
              </div>

              <SectionHeading>Neutral Scale</SectionHeading>
              <p className="text-[16px] font-normal text-white/50 mb-4 leading-relaxed tracking-wide">
                12-step achromatic OKLCH ramp. Use <code className="text-[13px] font-mono text-n-10">text-n-8</code>, <code className="text-[13px] font-mono text-n-10">bg-n-3</code>, etc.
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
                        <span className="text-[10px] font-mono text-n-9 tabular-nums">n-{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </PreviewPanel>

              <SectionHeading>Elevation</SectionHeading>
              <p className="text-[16px] font-normal text-white/50 mb-4 leading-relaxed tracking-wide">
                Surfaces rise from a dark base ({ELEVATION.baseSurface}) by mixing white overlays at increasing opacity. Click any level to copy its hex.
              </p>
              <PreviewPanel align="stretch">
                <ElevationRamp />
              </PreviewPanel>

              <SectionHeading>Fonts</SectionHeading>
              <PreviewPanel align="stretch">
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-n-9 mb-1 block">Sans — Heebo</span>
                    <p className="font-sans text-base text-n-11">אבגדהו The quick brown fox jumps over the lazy dog — 0123456789</p>
                  </div>
                  <div className="border-t border-white/5 pt-3">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-n-9 mb-1 block">Mono — IBM Plex Mono</span>
                    <p className="font-mono text-base text-n-11">const x = 42; // 0123456789 → tabular-nums</p>
                  </div>
                </div>
              </PreviewPanel>
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

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['StatusChip', 'STATUS_CHIP_COLORS', 'type StatusChipColor']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={statusChipSrc} name="StatusChip" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'label', type: 'string', description: 'Display text' },
                { name: 'color', type: 'StatusChipColor', default: '"green"', description: 'Semantic color variant' },
                { name: 'className', type: 'string', description: 'Additional Tailwind classes' },
              ]} />

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

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['NewUpdatesPill']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={newUpdatesPillSrc} name="NewUpdatesPill" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'count', type: 'number', description: 'Number of new updates to display' },
                { name: 'onClick', type: '() => void', description: 'Scroll-to-top handler' },
              ]} />
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

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['ActionButton', 'ACTION_BUTTON_VARIANTS', 'ACTION_BUTTON_SIZES', 'type ActionButtonVariant', 'type ActionButtonSize']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={actionButtonSrc} name="ActionButton" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'label', type: 'string', description: 'Button text' },
                { name: 'icon', type: 'React.ElementType', description: 'Lucide icon component' },
                { name: 'variant', type: 'ActionButtonVariant', default: '"fill"', description: 'Visual treatment' },
                { name: 'size', type: 'ActionButtonSize', default: '"md"', description: 'Height and padding scale' },
                { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable interaction' },
                { name: 'loading', type: 'boolean', default: 'false', description: 'Show spinner, disable click' },
                { name: 'onClick', type: '(e: MouseEvent) => void', description: 'Click handler' },
              ]} />

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
              <ExampleBlock title="Size Scale">
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

              <ExampleBlock title="All Variants × sm">
                <div className="flex flex-wrap items-center gap-2">
                  <ActionButton label="הפנה מצלמה" icon={Eye} variant="fill" size="sm" />
                  <ActionButton label="ביטול" icon={Ban} variant="ghost" size="sm" />
                  <ActionButton label="מעקב" icon={Eye} variant="outline" size="sm" />
                  <ActionButton label="מחק" icon={Trash2} variant="danger" size="sm" />
                  <ActionButton label="אזהרה" icon={AlertTriangle} variant="warning" size="sm" />
                </div>
              </ExampleBlock>

              <ExampleBlock title="Without Icon">
                <div className="flex flex-wrap items-center gap-2">
                  <ActionButton label="fill" variant="fill" size="sm" />
                  <ActionButton label="ghost" variant="ghost" size="sm" />
                  <ActionButton label="danger" variant="danger" size="sm" />
                  <ActionButton label="warning" variant="warning" size="sm" />
                </div>
              </ExampleBlock>

              <ExampleBlock title="Disabled">
                <div className="flex flex-wrap items-center gap-2">
                  <ActionButton label="fill" icon={Eye} variant="fill" size="sm" disabled />
                  <ActionButton label="danger" icon={Trash2} variant="danger" size="sm" disabled />
                </div>
              </ExampleBlock>

              <ExampleBlock title="Loading (click to test)">
                <div className="flex flex-wrap items-center gap-2">
                  <ActionButton label="שולח..." icon={Send} variant="fill" size="sm" loading={loading === 'ab-fill'} onClick={() => simulateLoading('ab-fill')} />
                  <ActionButton label="מוחק..." icon={Trash2} variant="danger" size="sm" loading={loading === 'ab-danger'} onClick={() => simulateLoading('ab-danger')} />
                </div>
              </ExampleBlock>
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

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['SplitActionButton', 'SPLIT_BUTTON_VARIANTS', 'type SplitButtonVariant']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={splitActionButtonSrc} name="SplitActionButton" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'label', type: 'string', description: 'Primary button text' },
                { name: 'badge', type: 'string', description: 'Inline chip displayed after the label (e.g. effector name)' },
                { name: 'icon', type: 'React.ElementType', description: 'Lucide icon' },
                { name: 'variant', type: 'SplitButtonVariant', default: '"fill"', description: 'Color treatment' },
                { name: 'size', type: 'SplitButtonSize', default: '"sm"', description: 'Height scale' },
                { name: 'dropdownItems', type: 'SplitDropdownItem[]', description: 'Sub-action menu items' },
                { name: 'dropdownGroups', type: 'SplitDropdownGroup[]', description: 'Grouped dropdown sections with labels and separators' },
                { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable both segments' },
                { name: 'loading', type: 'boolean', default: 'false', description: 'Show spinner on primary' },
                { name: 'dimDisabledShell', type: 'boolean', default: 'true', description: 'Reduce opacity when disabled' },
                { name: 'onHover', type: '(hovering: boolean) => void', description: 'Fires on mouseEnter/Leave of primary segment — used to highlight effector on map' },
              ]} />

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
              <ExampleBlock title="Size Scale">
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

              <ExampleBlock title="Disabled">
                <div className="w-48">
                  <SplitActionButton label="שיגור" icon={Zap} variant="fill" size="sm" disabled onClick={noop} dropdownItems={[{ id: '1', label: 'אפשרות א׳', onClick: noop }]} />
                </div>
              </ExampleBlock>

              <ExampleBlock title="Loading (click to test)">
                <div className="w-48">
                  <SplitActionButton label="שולח..." icon={Zap} variant="fill" size="sm" loading={loading === 'split-fill'} onClick={() => simulateLoading('split-fill')} dropdownItems={[{ id: '1', label: 'אפשרות א׳', onClick: noop }]} />
                </div>
              </ExampleBlock>

              <ExampleBlock title="With Badge (effector name inline)">
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

              <ExampleBlock title="Grouped Dropdown (RTL, effector selection)">
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

              <ExampleBlock title="Ground Hostile — Weapon Flow">
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

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['AccordionSection']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={accordionSectionSrc} name="AccordionSection" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'title', type: 'ReactNode', description: 'Section heading' },
                { name: 'icon', type: 'React.ElementType | null', description: 'Leading icon' },
                { name: 'defaultOpen', type: 'boolean', default: 'false', description: 'Start expanded' },
                { name: 'headerAction', type: 'ReactNode', description: 'Right-side action slot (badge, button)' },
              ]} />
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

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['TelemetryRow']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={telemetryRowSrc} name="TelemetryRow" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'label', type: 'string', description: 'Metric name' },
                { name: 'value', type: 'string', description: 'Metric value (monospace, tabular-nums)' },
                { name: 'icon', type: 'React.ElementType', description: 'Leading icon' },
              ]} />

              <SectionHeading>Examples</SectionHeading>
              <ExampleBlock title="3 items (single row)" tight>
                <div className="grid grid-cols-3 gap-x-4 gap-y-2 rounded-lg p-3" style={{ backgroundColor: SURFACE.level1 }}>
                  <TelemetryRow label="גובה" value="120m" icon={Navigation} />
                  <TelemetryRow label="מהירות" value="45 km/h" icon={Gauge} />
                  <TelemetryRow label="כיוון" value="270°" icon={Compass} />
                </div>
              </ExampleBlock>

              <ExampleBlock title="6 items (2 rows)" tight>
                <div className="grid grid-cols-3 gap-x-4 gap-y-2 rounded-lg p-3" style={{ backgroundColor: SURFACE.level1 }}>
                  <TelemetryRow label="גובה" value="120m" icon={Navigation} />
                  <TelemetryRow label="מהירות" value="45 km/h" icon={Gauge} />
                  <TelemetryRow label="כיוון" value="270°" icon={Compass} />
                  <TelemetryRow label="מרחק" value="1.2 km" icon={MapPin} />
                  <TelemetryRow label="RCS" value="0.01 m²" icon={Radio} />
                  <TelemetryRow label="סוג" value="DJI Mavic 3" icon={Eye} />
                </div>
              </ExampleBlock>

              <ExampleBlock title="2 items (partial row)" tight>
                <div className="grid grid-cols-3 gap-x-4 gap-y-2 rounded-lg p-3" style={{ backgroundColor: SURFACE.level1 }}>
                  <TelemetryRow label="גובה" value="120m" icon={Navigation} />
                  <TelemetryRow label="מהירות" value="45 km/h" icon={Gauge} />
                </div>
              </ExampleBlock>
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

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['CardHeader']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={cardHeaderSrc} name="CardHeader" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'title', type: 'string', description: 'Target display name' },
                { name: 'subtitle', type: 'string', description: 'Target ID or secondary label' },
                { name: 'icon', type: 'React.ElementType', description: 'Threat type icon' },
                { name: 'iconColor', type: 'string', description: 'Icon color override' },
                { name: 'iconBgActive', type: 'boolean', default: 'false', description: 'Use active (red) icon background' },
                { name: 'status', type: 'ReactNode', description: 'StatusChip or similar' },
                { name: 'badge', type: 'ReactNode', description: 'Optional badge element' },
                { name: 'open', type: 'boolean', description: 'Controls chevron rotation' },
              ]} />

              <SectionHeading>Examples</SectionHeading>
              <ExampleBlock title="Open State" tight>
                <div className="rounded-lg p-2" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardHeader icon={Eye} title="עצם לא מזוהה" subtitle="TGT-0099" status={<StatusChip label="חשוד" color="orange" />} open />
                </div>
              </ExampleBlock>

              <ExampleBlock title="Minimal (no icon, no badge)" tight>
                <div className="rounded-lg p-2" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardHeader title="יעד בסיסי" subtitle="TGT-0001" open={false} />
                </div>
              </ExampleBlock>
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

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['CardMedia', 'MEDIA_BADGE_CONFIG', 'type MediaBadgeType']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={cardMediaSrc} name="CardMedia" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'src', type: 'string', description: 'Image or video URL' },
                { name: 'type', type: '"video" | "image"', default: '"image"', description: 'Media type' },
                { name: 'badge', type: 'MediaBadgeType | null', description: 'Overlay badge icon' },
                { name: 'showControls', type: 'boolean', default: 'false', description: 'Show video playback controls' },
                { name: 'trackingLabel', type: 'string', description: 'Bottom-left tracking status label' },
              ]} />

              <SectionHeading>Badge Types</SectionHeading>
              <VariantGrid
                entries={Object.entries(MEDIA_BADGE_CONFIG).map(([key, val]) => ({ key, usage: val.usage }))}
                renderSample={(key) => {
                  const bc = MEDIA_BADGE_CONFIG[key as keyof typeof MEDIA_BADGE_CONFIG];
                  const Icon = bc.icon;
                  return <Icon size={20} className={bc.color} />;
                }}
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

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['CardActions']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={cardActionsSrc} name="CardActions" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'actions', type: 'CardAction[]', description: 'Action definitions with group, variant, confirm' },
                { name: 'layout', type: '"row" | "grid" | "stack"', default: '"row"', description: 'Fallback layout when no groups' },
              ]} />

              <SectionHeading>Examples</SectionHeading>
              <ExampleBlock title="Flat Grid (no groups)" tight>
                <div className="max-w-sm rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardActions actions={[
                    { id: 'cam', label: 'הפנה מצלמה', icon: Eye, variant: 'fill', size: 'sm', onClick: noop },
                    { id: 'del', label: 'מחק', icon: Trash2, variant: 'danger', size: 'sm', onClick: noop },
                    { id: 'cancel', label: 'ביטול', icon: Ban, variant: 'ghost', size: 'sm', onClick: noop },
                  ]} />
                </div>
              </ExampleBlock>

              <ExampleBlock title="With Confirm Dialog" tight>
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
            </ComponentSection>
            )}

            {activeItem === 'card-details' && (
            <ComponentSection id="card-details" name="CardDetails" description="Collapsible telemetry accordion with a copy-all button. Composes AccordionSection and TelemetryRow in a grid layout for metrics.">
              <CodePreviewBlock name="CardDetails" description="Collapsible telemetry accordion with a copy-all button; uses AccordionSection and TelemetryRow." tight code={cardDetailsSrc} relatedFiles={CARD_DETAILS_FILES}>
                <div className="max-w-sm rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardDetails rows={sampleDetailRows} defaultOpen />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['CardDetails']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={cardDetailsSrc} name="CardDetails" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'rows', type: 'DetailRow[]', description: 'Array of { label, value, icon }' },
                { name: 'defaultOpen', type: 'boolean', default: 'false', description: 'Start expanded' },
              ]} />
            </ComponentSection>
            )}

            {activeItem === 'card-sensors' && (
            <ComponentSection id="card-sensors" name="CardSensors" description="Lists detecting sensors for a target with type, distance, and timestamp. Supports read-only and interactive modes.">
              <CodePreviewBlock name="CardSensors" description="Lists detecting sensors for a target with type, distance, and timestamp. Supports read-only and interactive modes." tight code={cardSensorsSrc} relatedFiles={COMMON_FILES}>
                <div className="max-w-sm rounded-lg overflow-hidden p-1" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardSensors sensors={sampleSensors} />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['CardSensors']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={cardSensorsSrc} name="CardSensors" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'sensors', type: 'CardSensor[]', description: 'Array of sensor entries' },
                { name: 'onSensorClick', type: '(id: string) => void', description: 'Makes rows clickable buttons' },
                { name: 'onSensorHover', type: '(id: string | null) => void', description: 'Hover callback for map highlighting' },
              ]} />

              <SectionHeading>Examples</SectionHeading>
              <ExampleBlock title="Clickable (interactive)" tight>
                <div className="max-w-sm rounded-lg overflow-hidden p-1" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardSensors sensors={sampleSensors} onSensorClick={(id) => console.log('sensor clicked:', id)} />
                </div>
              </ExampleBlock>
            </ComponentSection>
            )}

            {activeItem === 'card-log' && (
            <ComponentSection id="card-log" name="CardLog" description="Chronological event log accordion with newest-first ordering and expand-all.">
              <CodePreviewBlock name="CardLog" description="Chronological event log accordion with newest-first ordering and expand-all." tight code={cardLogSrc} relatedFiles={CARD_LOG_FILES}>
                <div className="max-w-sm rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardLog entries={sampleLogEntries} maxVisible={4} defaultOpen />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['CardLog']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={cardLogSrc} name="CardLog" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'entries', type: 'LogEntry[]', description: 'Array of { time, label }' },
                { name: 'maxVisible', type: 'number', default: '5', description: 'Entries shown before "show more"' },
                { name: 'defaultOpen', type: 'boolean', default: 'false', description: 'Start accordion expanded' },
              ]} />
            </ComponentSection>
            )}

            {activeItem === 'card-closure' && (
            <ComponentSection id="card-closure" name="CardClosure" description="Outcome selection grid for closing a detection event. Operator picks the resolution reason.">
              <CodePreviewBlock name="CardClosure" description="Outcome selection grid for closing a detection event. Operator picks the resolution reason." tight code={cardClosureSrc} relatedFiles={COMMON_FILES}>
                <div className="max-w-sm rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardClosure outcomes={sampleClosureOutcomes} onSelect={(id) => console.log('closure:', id)} />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['CardClosure']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={cardClosureSrc} name="CardClosure" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'outcomes', type: 'ClosureOutcome[]', description: 'Array of { id, label, icon }' },
                { name: 'onSelect', type: '(outcomeId: string) => void', description: 'Selection handler' },
                { name: 'title', type: 'string', default: '"סגירת אירוע — בחר סיבה"', description: 'Section heading' },
              ]} />
            </ComponentSection>
            )}

            {activeItem === 'card-states' && (
            <ComponentSection id="card-states" name="Card States" description="Interactive playground to explore how each detection lifecycle state affects the card's visual treatment — spine accent, icon design, ring, opacity, status chip, and closure type.">
              <CardStatePlayground />
            </ComponentSection>
            )}

            {activeItem === 'target-card' && (
            <ComponentSection id="target-card" name="TargetCard" description="The core card shell. Composes CardHeader with slot children via the useCardSlots hook. These examples use real Detection mock data and the same composition as the main app.">
              <CodePreviewBlock name="TargetCard" description="The core card shell. Composes CardHeader with slot children via the useCardSlots hook." tight code={targetCardSrc} relatedFiles={COMMON_FILES}>
                <div className="w-96 mx-auto">
                  <StyleguideUnifiedCard detection={cuas_classified} defaultOpen />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['TargetCard']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={targetCardSrc} name="TargetCard" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'header', type: 'ReactNode', description: 'CardHeader element' },
                { name: 'children', type: 'ReactNode', description: 'Slot components (media, actions, timeline, details, sensors, log, closure)' },
                { name: 'open', type: 'boolean', description: 'Expanded state' },
                { name: 'onToggle', type: '() => void', description: 'Toggle handler' },
                { name: 'accent', type: 'ThreatAccent', default: '"idle"', description: 'Spine color key' },
                { name: 'completed', type: 'boolean', description: 'Desaturate card' },
              ]} />

              <SectionHeading>Examples</SectionHeading>
              <ExampleBlock title="Mitigating (active jam)" tight>
                <div className="w-96 mx-auto">
                  <StyleguideUnifiedCard detection={cuas_mitigating} defaultOpen />
                </div>
              </ExampleBlock>

              <ExampleBlock title="Completed (resolved)" tight>
                <div className="w-96 mx-auto">
                  <StyleguideUnifiedCard detection={cuas_bda_complete} defaultOpen={false} />
                </div>
              </ExampleBlock>
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

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['FilterBar', 'type FilterDef', 'type FilterOption']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={filterBarSrc} name="FilterBar" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'query', type: 'string', description: 'Free-text search value (controlled).' },
                { name: 'onQueryChange', type: '(next: string) => void', description: 'Search input change handler.' },
                { name: 'filters', type: 'FilterDef[]', description: 'Filter dimensions to render — each becomes a popover trigger.' },
                { name: 'selections', type: 'Record<string, string[]>', description: 'Selection state keyed by FilterDef.id.' },
                { name: 'onFilterChange', type: '(filterId, nextValues) => void', description: 'Replace one filter’s selected values.' },
                { name: 'onReset', type: '() => void', description: 'Clear query + all selections.' },
                { name: 'searchPlaceholder', type: 'string', default: '"Search…"', description: 'Input placeholder.' },
                { name: 'resetLabel', type: 'string', default: '"Reset"', description: 'Reset button text.' },
                { name: 'emptyOptionsLabel', type: 'string', default: '"No options"', description: 'Shown when a filter has no options.' },
              ]} />
            </ComponentSection>
            )}

            {activeItem === 'devices-panel' && (
            <ComponentSection id="devices-panel" name="DevicesPanel" description="Right-hand sidebar listing all connected field devices grouped by type. Supports search, type-filter isolation, device expansion with stats grid, camera preview with presets, ECM jam activation, mute with 30-min countdown, drone wipers/calibration, and drag-to-camera-viewer for camera rows.">
              <CodePreviewBlock name="DevicesPanel" description="Full interactive panel — try searching, filtering by type, expanding rows, and clicking actions." tight code={devicesPanelSrc} relatedFiles={DEVICES_PANEL_FILES}>
                <div className="relative mx-auto overflow-hidden rounded-lg border border-white/10" style={{ width: LAYOUT_TOKENS.sidebarWidthPx, height: 400 }}>
                  <DevicesPanel devices={devicesPanelDemoDevices} open onClose={() => {}} onFlyTo={() => {}} noTransition />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/shared/components/DevicesPanel" names={['DevicesPanel']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={devicesPanelSrc} name="DevicesPanel" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'open', type: 'boolean', description: 'Controls sidebar visibility (slide in/out)' },
                { name: 'onClose', type: '() => void', description: 'Called when the X close button is clicked' },
                { name: 'onFlyTo', type: '(lat, lon) => void', description: 'Called when "מרכז במפה" is clicked on an expanded device' },
                { name: 'onDeviceHover', type: '(id | null) => void', description: 'Called on row mouse enter/leave for map highlight sync' },
                { name: 'onJamActivate', type: '(jammerId) => void', description: 'Called when the ECM jam button is clicked on an effector device' },
                { name: 'noTransition', type: 'boolean', default: 'false', description: 'Skip the slide-in CSS transition (useful for styleguide / tests)' },
                { name: 'width', type: 'number', default: 'LAYOUT_TOKENS.sidebarWidthPx', description: 'Override the default sidebar width' },
                { name: 'focusedDeviceId', type: 'string | null', default: 'undefined', description: 'Auto-expand this device, ensure its type filter is active, clear search, and scroll it into view' },
              ]} />

              <SectionHeading>Examples</SectionHeading>
              {/* ── Empty state ─────────────────────────────────── */}
              <ExampleBlock id="devices-empty" title="Empty state" tight>
                <StyleguideDeviceTile label="When no devices match the current search or filter, the panel shows this placeholder.">
                  <div className="flex flex-col gap-2 px-4 pt-3 pb-2 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs font-medium text-white uppercase tracking-wider">מכשירים (0)</h2>
                      <div className="p-2 -m-1 rounded text-n-120"><X size={14} /></div>
                    </div>
                    <div className="relative">
                      <Search size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-n-120 pointer-events-none" />
                      <div className="w-full bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.1)] rounded text-[12px] text-n-7 pr-7 pl-7 py-1.5">חיפוש...</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {[CameraIcon, RadarIcon, DroneHiveIcon, SensorIcon, LauncherIcon, LidarIcon].map((Icon, i) => (
                        <div key={i} className="p-2 rounded text-white hover:text-n-10 hover:bg-white/[0.06]">
                          <Icon size={20} fill="currentColor" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="px-3 py-8 text-center text-[12px] text-n-7">אין מכשירים תואמים</div>
                </StyleguideDeviceTile>
              </ExampleBlock>

              {/* ── Header ──────────────────────────────────────── */}
              <ExampleBlock id="devices-header" title="Header" tight>
                <StyleguideDeviceTile label="Panel title with device count and close button.">
                  <div className="flex items-center justify-between px-4 pt-3 pb-2">
                    <h2 className="text-xs font-medium text-white uppercase tracking-wider">מכשירים (16)</h2>
                    <button className="p-2 -m-1 rounded hover:bg-white/10 text-n-120 hover:text-n-10 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                </StyleguideDeviceTile>
              </ExampleBlock>

              {/* ── Search & type filters ───────────────────────── */}
              <ExampleBlock id="devices-search" title="Search & type filters" tight>
                <div className="space-y-4">
                  <StyleguideDeviceTile label="Default state — all device types active, search empty.">
                    <div className="flex flex-col gap-2 px-4 py-3">
                      <div className="relative">
                        <Search size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-n-120 pointer-events-none" />
                        <div className="w-full bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.1)] rounded text-[12px] text-n-7 pr-7 pl-7 py-1.5">חיפוש...</div>
                      </div>
                      <div className="flex items-center gap-1">
                        {[CameraIcon, RadarIcon, DroneHiveIcon, SensorIcon, LauncherIcon, LidarIcon].map((Icon, i) => (
                          <div key={i} className="p-2 rounded text-white hover:text-n-10 hover:bg-white/[0.06]">
                            <Icon size={20} fill="currentColor" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </StyleguideDeviceTile>

                  <StyleguideDeviceTile label="Isolated filter — only cameras selected. 'ניקוי' reset button appears.">
                    <div className="flex flex-col gap-2 px-4 py-3">
                      <div className="relative">
                        <Search size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-n-120 pointer-events-none" />
                        <div className="w-full bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.1)] rounded text-[12px] text-n-10 pr-7 pl-7 py-1.5">MAGOS</div>
                        <button className="absolute left-1 top-1/2 -translate-y-1/2 p-1 text-n-120 hover:text-n-10">
                          <X size={12} />
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="p-2 rounded bg-white/15 text-white ring-1 ring-white/30">
                          <CameraIcon size={20} fill="currentColor" />
                        </div>
                        {[RadarIcon, DroneHiveIcon, SensorIcon, LauncherIcon, LidarIcon].map((Icon, i) => (
                          <div key={i} className="p-2 rounded text-white hover:text-n-10 hover:bg-white/[0.06]">
                            <Icon size={20} fill="currentColor" />
                          </div>
                        ))}
                        <button className="mr-auto px-2 py-1 rounded text-[11px] text-white/70 hover:text-n-10 hover:bg-white/[0.06]">
                          ניקוי
                        </button>
                      </div>
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

              {/* ── Device row — collapsed states ──────────────── */}
              <ExampleBlock id="devices-rows" title="Device row — collapsed states" tight>
                <div className="space-y-4">
                  <StyleguideDeviceTile label="Normal — camera device with battery indicator.">
                    <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right border-b border-white/[0.06] hover:bg-white/[0.04] cursor-grab">
                      <div className="relative w-8 h-8 rounded flex items-center justify-center shrink-0 bg-white/10">
                        <CameraIcon size={20} fill="white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-medium text-n-10">PTZ Camera (North)</span>
                          <span className="flex items-center gap-1.5 text-[11px] font-['Heebo'] tabular-nums text-white/50">
                            <StyleguideBatteryIcon pct={18} />
                            18%
                          </span>
                        </div>
                      </div>
                    </div>
                  </StyleguideDeviceTile>

                  <StyleguideDeviceTile label="Malfunctioning — orange icon, warning triangle, connection dot.">
                    <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right border-b border-white/[0.06] hover:bg-white/[0.04] cursor-pointer">
                      <div className="relative w-8 h-8 rounded flex items-center justify-center shrink-0 bg-orange-900/40">
                        <SensorIcon size={20} fill="#f97316" />
                        <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-2 ring-n-1 bg-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-medium text-orange-300">Magos (South)</span>
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
                          <span className="text-[13px] font-medium text-n-10">RADA ieMHR</span>
                          <span className="flex items-center gap-1 text-xs font-mono tabular-nums text-white">
                            <BellOff size={12} className="text-white" />
                            28:42
                          </span>
                        </div>
                      </div>
                    </div>
                  </StyleguideDeviceTile>

                  <StyleguideDeviceTile label="ECM row — jam button inline on the collapsed row.">
                    <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right border-b border-white/[0.06] hover:bg-white/[0.04] cursor-pointer">
                      <div className="relative w-8 h-8 rounded flex items-center justify-center shrink-0 bg-white/10">
                        <SensorIcon size={20} fill="white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-medium text-n-10">Regulus North</span>
                        <div className="text-[11px] font-mono tabular-nums text-white/50">1.5km</div>
                      </div>
                      <button className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium bg-[oklch(0.348_0.111_17)] text-[oklch(0.927_0.062_17)] ring-1 ring-inset ring-[oklch(0.348_0.111_17_/_0.4)]">
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
                      <span className="text-[10px] font-mono text-n-9">{label}</span>
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
                      <span className="flex items-center gap-1.5 text-[11px] font-['Heebo'] tabular-nums text-white/50">
                        <StyleguideBatteryIcon pct={pct} />
                        {pct}%
                      </span>
                      <span className="text-[10px] font-mono text-n-9">{label}</span>
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
                        <span className="text-[13px] font-medium text-n-10">PTZ Camera (North)</span>
                        <span className="flex items-center gap-1.5 text-[11px] font-['Heebo'] tabular-nums text-white/50">
                          <StyleguideBatteryIcon pct={18} />
                          18%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col bg-white/[0.03]">
                    <div className="flex items-center gap-0 px-3 border-b border-white/[0.06]">
                      {['רגיל', 'לילה', 'זום'].map((tab, i) => (
                        <button key={tab} className={`px-3 py-2 text-[12px] font-medium border-b-2 ${i === 0 ? 'text-white border-white' : 'text-n-120 border-transparent hover:text-n-10'}`}>
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
                        <span className="text-[9px] font-medium text-white/90 uppercase tracking-wide">Live</span>
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
                          <span className="text-white/60 text-[10px]">{r.l}</span>
                          <span className={`font-sans tabular-nums text-xs ${r.c ?? 'text-white'}`}>{r.v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1.5 border-t border-white/[0.06]">
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-white/70 bg-white/[0.06] hover:bg-white/10">
                        <MapPin size={12} />
                        מרכז במפה
                      </button>
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-white/70 bg-white/[0.06] hover:bg-white/10">
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
                        <span className="text-[13px] font-medium text-n-10">Regulus North</span>
                        <div className="text-[11px] font-mono tabular-nums text-white/50">1.5km</div>
                      </div>
                      <button className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium bg-[oklch(0.348_0.111_17)] text-[oklch(0.927_0.062_17)] ring-1 ring-inset ring-[oklch(0.348_0.111_17_/_0.4)]">
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
                            <span className="text-white/60 text-[10px]">{r.l}</span>
                            <span className={`font-sans tabular-nums text-xs ${r.c ?? 'text-white'}`}>{r.v}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 border-t border-white/[0.06]">
                        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-white/70 bg-white/[0.06]">
                          <MapPin size={12} />
                          מרכז במפה
                        </button>
                        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-white/70 bg-white/[0.06]">
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
                        <span className="text-[13px] font-medium text-n-10">Regulus East</span>
                      </div>
                      <button disabled className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium opacity-40 cursor-not-allowed bg-[oklch(0.348_0.111_17)] text-[oklch(0.927_0.062_17)] ring-1 ring-inset ring-[oklch(0.348_0.111_17_/_0.4)]">
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
                          <span className="text-[13px] font-medium text-orange-300">Regulus South</span>
                          <AlertTriangle size={11} className="text-orange-400 shrink-0" />
                        </div>
                      </div>
                      <button disabled className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium opacity-40 cursor-not-allowed bg-[oklch(0.348_0.111_17)] text-[oklch(0.927_0.062_17)] ring-1 ring-inset ring-[oklch(0.348_0.111_17_/_0.4)]">
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
                      <span className="text-[13px] font-medium text-n-10">סיור-3</span>
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
                          <span className="text-white/60 text-[10px]">{r.l}</span>
                          <span className={`font-sans tabular-nums text-xs ${r.c ?? 'text-white'}`}>{r.v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1.5 border-t border-white/[0.06]">
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-white/70 bg-white/[0.06]">
                        <MapPin size={12} />
                        מרכז במפה
                      </button>
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-white/70 bg-white/[0.06]">
                        <BellOff size={12} />
                        השתק
                      </button>
                      <div className="w-px h-5 bg-white/[0.08] mx-0.5" />
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-white/60">מגבים</span>
                        <div className="h-[18px] w-8 rounded-full bg-white/10 relative">
                          <div className="absolute left-[2px] top-[2px] size-[14px] rounded-full bg-white/60 transition-transform" />
                        </div>
                      </div>
                      <button className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-white/70 bg-white/[0.06]">
                        <Wrench size={12} />
                        כיול
                      </button>
                    </div>
                  </div>
                </StyleguideDeviceTile>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {([
                    { label: 'Idle', icon: <Wrench size={12} />, text: 'כיול' },
                    { label: 'Running', icon: <Loader2 size={12} className="animate-spin" />, text: 'מכייל...' },
                    { label: 'Done', icon: <Check size={12} className="text-emerald-400" />, text: 'הושלם' },
                  ] as const).map(({ label, icon, text }) => (
                    <div key={label} className="flex flex-col items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 p-4">
                      <button disabled={label !== 'Idle'} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-white/70 bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed">
                        {icon}
                        {text}
                      </button>
                      <span className="text-[10px] font-mono text-n-9">{label}</span>
                    </div>
                  ))}
                </div>
              </ExampleBlock>

              {/* ── Action bar ──────────────────────────────────── */}
              <ExampleBlock id="devices-actions" title="Action bar" tight>
                <div className="space-y-4">
                  <StyleguideDeviceTile label="Default state — fly-to and mute buttons.">
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-white/70 bg-white/[0.06] hover:bg-white/10 hover:text-white/90">
                        <MapPin size={12} />
                        מרכז במפה
                      </button>
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-white/70 bg-white/[0.06] hover:bg-white/10 hover:text-white/90">
                        <BellOff size={12} />
                        השתק
                      </button>
                    </div>
                  </StyleguideDeviceTile>

                  <StyleguideDeviceTile label="Muted state — amber highlight on the mute button.">
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-white/70 bg-white/[0.06] hover:bg-white/10 hover:text-white/90">
                        <MapPin size={12} />
                        מרכז במפה
                      </button>
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium bg-amber-500/15 text-amber-400 hover:bg-amber-500/25">
                        <BellOff size={12} />
                        בטל השתקה
                      </button>
                    </div>
                  </StyleguideDeviceTile>
                </div>
              </ExampleBlock>
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

            {activeItem === 'engagement-line-flows' && (
            <ComponentSection id="engagement-line-flows" name="Engagement Line" description="The dashed engagement line connects an effector asset to the active hostile target on the tactical map. Animated with marching dashes and traveling particles. Color encodes flow state: white (standby), amber (weapon pointing), red (jam mitigating / weapon locked).">
              <EngagementLineFlows />
            </ComponentSection>
            )}

            {activeItem === 'map-markers' && (
            <ComponentSection id="map-markers" name="Map Markers" description="Tactical marker system: SVG icons, composited layers, interaction states, affiliation palettes, and map-level overlays.">

              <SectionHeading>Source</SectionHeading>
              <CodePreviewBlock name="MapMarker" description="Composites 4 visual layers controlled by a style+affiliation matrix" code={mapMarkerSrc} relatedFiles={MARKER_FILES}>
                <div className="flex items-center justify-start gap-6">
                  {AFFILIATIONS.map(aff => {
                    const s = resolveMarkerStyle('default', aff);
                    return (
                      <div key={aff} className="flex flex-col items-center gap-2">
                        <MapMarker icon={<SensorIcon size={34} fill={s.glyphColor} />} style={s} surfaceSize={48} ringSize={38} />
                        <span className="text-xs font-mono font-normal text-white">{aff}</span>
                      </div>
                    );
                  })}
                </div>
              </CodePreviewBlock>

              <SectionHeading>Imports</SectionHeading>
              <div className="space-y-2">
                <ImportBlock path="@/primitives/MapMarker" names={['MapMarker']} />
                <ImportBlock path="@/primitives/markerStyles" names={['resolveMarkerStyle', 'INTERACTION_STATES', 'AFFILIATIONS']} />
                <ImportBlock path="@/app/components/tacticalIcons" names={['CameraIcon', 'RadarIcon', 'SensorIcon', 'DroneIcon', 'DroneHiveIcon', 'LidarIcon', 'LauncherIcon', 'MissileIcon']} />
              </div>

              {/* ── Layer Anatomy ── */}
              <div id="layer-anatomy" className="scroll-mt-12 space-y-6 pt-10">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-n-12">Layer Anatomy</h3>
                  <p className="text-[16px] font-normal leading-relaxed text-white/50 tracking-wide">
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
                        className={`rounded-lg border px-3 py-2.5 cursor-default transition-all duration-200 ${
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
                      className={`rounded-lg border px-3 py-2.5 cursor-default transition-all duration-200 ${
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
                            icon={<SensorIcon size={48} fill="#ffffff" />}
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
                  <p className="text-[16px] font-normal leading-relaxed text-white/50 tracking-wide">
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
                        alert: 'hostile',
                        jammer: 'possibleThreat',
                        weaponPointing: 'hostile',
                        weaponLocked: 'hostile',
                      };
                      return INTERACTION_STATES.map(state => {
                        const isHovered = explorerState === state;
                        const aff = stateAffMap[state];
                        const s = resolveMarkerStyle(state, aff);
                        return (
                          <div
                            key={state}
                            className={`flex items-center gap-4 rounded-lg border px-3 py-2.5 cursor-default transition-all duration-200 w-full justify-start ${
                              isHovered
                                ? 'border-white/20 bg-white/[0.06]'
                                : 'border-white/[0.06] bg-white/[0.03]'
                            }`}
                            onMouseEnter={() => handleStateEnter(state, aff)}
                            onMouseLeave={handleStateLeave}
                          >
                            <MapMarker
                              icon={<SensorIcon fill={s.glyphColor} />}
                              style={s}
                              surfaceSize={36}
                              ringSize={28}
                              pulse={isHovered && (state === 'hovered' || state === 'selected' || state === 'active' || state === 'weaponPointing' || state === 'weaponLocked')}
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
                          icon={<SensorIcon size={48} fill={heroStyle.glyphColor} />}
                          style={heroStyle}
                          surfaceSize={72}
                          ringSize={56}
                          pulse={explorerState === 'hovered' || explorerState === 'selected' || explorerState === 'active' || explorerState === 'weaponPointing' || explorerState === 'weaponLocked'}
                        />
                      );
                    })()}
                    <div className="text-center space-y-1">
                      <span className="block text-sm font-semibold text-n-12">{INTERACTION_STATE_LABELS[explorerState]}</span>
                    </div>
                    <span className="text-[10px] text-n-120">{AFFILIATION_LABELS[hoveredAff ?? explorerAff]}</span>
                  </div>

                </div>
              </div>

              {/* ── Icon Catalog ── */}
              <div id="icon-catalog" className="scroll-mt-12 space-y-6 pt-10">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-n-12">Icon Catalog</h3>
                  <p className="text-[16px] font-normal leading-relaxed text-white/50 tracking-wide">
                    Tactical SVG icons used inside map markers on the Mapbox canvas. Each icon accepts a <code className="text-n-10">fill</code> prop.
                  </p>
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
                  ] as { name: string; el: React.ReactNode }[]).map(({ name, el }) => (
                    <IconCatalogTile key={name} name={name} icon={el} />
                  ))}
                </div>

              </div>

            </ComponentSection>
            )}

            {activeItem === 'cesium-map' && (
            <ComponentSection
              id="cesium-map"
              name="Cesium Map"
              description="A CesiumJS-based map primitive — sandbox for replacing the Mapbox-based TacticalMap. Step 1: feature parity with our current map (basemap, markers, FOV, ECM coverage, fly-to). Step 2: Cesium-only capabilities (terrain, time-aware data, true 3D)."
            >
              <SectionHeading>Basics — Bing Aerial via Cesium Ion (2D)</SectionHeading>
              <p className="text-[14px] leading-6 text-n-10">
                Imagery: Cesium Ion asset id <code className="text-[13px] font-mono bg-white/[0.06] px-1 py-0.5 rounded">2</code>{' '}
                (Bing Maps Aerial). Token comes from the{' '}
                <code className="text-[13px] font-mono bg-white/[0.06] px-1 py-0.5 rounded">VITE_CESIUM_ION_TOKEN</code>{' '}
                env var (see <code className="text-[13px] font-mono bg-white/[0.06] px-1 py-0.5 rounded">.env.example</code>).
                Scene mode is <code className="text-[13px] font-mono bg-white/[0.06] px-1 py-0.5 rounded">'2D'</code> for parity with the top-down Mapbox view.
              </p>

              {!CESIUM_ION_TOKEN ? (
                <div className="rounded-md p-4 text-[13px] text-amber-300 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] bg-amber-500/[0.06]">
                  <strong>Token missing.</strong> Set <code className="font-mono">VITE_CESIUM_ION_TOKEN</code> in <code className="font-mono">.env.local</code> and restart the dev server.
                </div>
              ) : (
                <div id="cesium-basics" className="scroll-mt-20 space-y-4 mt-10 first:mt-0">
                  <h3 className="text-[14px] font-medium text-n-10">3 markers, no FOV / coverage</h3>
                  <PreviewPanel align="stretch">
                    <div className="h-[420px] rounded-lg overflow-hidden">
                      <CesiumMap
                        ionToken={CESIUM_ION_TOKEN}
                        initialView={{ lat: 32.466, lon: 35.005, heightM: 8000 }}
                        markers={cesiumDemoBasicMarkers}
                        sceneMode="2D"
                      />
                    </div>
                  </PreviewPanel>
                </div>
              )}

              {CESIUM_ION_TOKEN && (
                <>
                  <SectionHeading>FOV + Coverage</SectionHeading>
                  <div id="cesium-fov" className="scroll-mt-20 space-y-4 mt-10 first:mt-0">
                    <h3 className="text-[14px] font-medium text-n-10">Sensor FOV cone (sector polygon) and ECM coverage ring (ellipse)</h3>
                    <PreviewPanel align="stretch">
                      <div className="h-[420px] rounded-lg overflow-hidden">
                        <CesiumMap
                          ionToken={CESIUM_ION_TOKEN}
                          initialView={{ lat: 32.466, lon: 35.005, heightM: 6000 }}
                          markers={cesiumDemoFovMarkers}
                          sceneMode="2D"
                        />
                      </div>
                    </PreviewPanel>
                  </div>

                  <SectionHeading>Fly-To</SectionHeading>
                  <div id="cesium-fly-to" className="scroll-mt-20 space-y-4 mt-10 first:mt-0">
                    <h3 className="text-[14px] font-medium text-n-10">Imperative camera control. Pass a new flyTo prop to trigger an animation.</h3>
                    <CesiumFlyToDemo />
                  </div>
                </>
              )}

              <SectionHeading>Import</SectionHeading>
              <ImportBlock
                path="@/primitives"
                names={['CesiumMap', 'type CesiumMarker', 'type CesiumMapProps', 'type CesiumSceneMode']}
              />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable
                items={[
                  { name: 'ionToken', type: 'string', description: 'Cesium Ion access token (use VITE_CESIUM_ION_TOKEN).' },
                  { name: 'initialView', type: '{ lat, lon, heightM? }', description: 'First-paint camera target.' },
                  { name: 'markers', type: 'CesiumMarker[]', description: 'Pins. Each may carry an FOV sector and/or coverage ring.' },
                  { name: 'flyTo', type: 'CesiumMapFlyTo | null', description: 'Pass a new object to trigger an imperative camera fly.' },
                  { name: 'sceneMode', type: "'2D' | '2.5D' | '3D'", default: "'2D'", description: 'Cesium scene mode. 2D matches current Mapbox UX.' },
                  { name: 'ionImageryAssetId', type: 'number', default: '2', description: 'Cesium Ion imagery asset id. 2 = Bing Aerial.' },
                  { name: 'onMarkerClick', type: '(id: string) => void', description: 'Marker click handler.' },
                  { name: 'onMarkerHover', type: '(id: string | null) => void', description: 'Hover enter (id) / leave (null).' },
                  { name: 'className', type: 'string', default: "'w-full h-full'", description: 'Wrapper sizing.' },
                ]}
              />

              <SectionHeading>Step 2 — Cesium-only opportunities</SectionHeading>
              <div id="cesium-step-2" className="scroll-mt-20 space-y-4 mt-10 first:mt-0">
                <p className="text-[14px] leading-6 text-n-10">
                  Once parity lands, these are the capabilities Cesium gives us that Mapbox GL JS does not (or that Cesium does much better). They are deliberately documented here, not implemented yet — so we choose deliberately what to ship next.
                </p>
                <ul className="space-y-3 text-[14px] leading-6 text-n-10 list-disc ps-6 marker:text-n-9">
                  <li>
                    <strong className="text-n-12">True 3D globe + terrain.</strong> Cesium World Terrain (Ion asset 1) renders real elevation. Sensor lines-of-sight, drone altitude, missile trajectories all become visually correct in 3D, not faked with flat overlays.
                  </li>
                  <li>
                    <strong className="text-n-12">Time-dynamic data (CZML).</strong> Replay engagements with a built-in clock + scrub bar. Drone, missile, jam, target tracks all driven by timestamped properties — not hand-rolled <code className="font-mono text-[13px] bg-white/[0.06] px-1 rounded">requestAnimationFrame</code> loops.
                  </li>
                  <li>
                    <strong className="text-n-12">3D Tiles for assets.</strong> Buildings, photogrammetry, ground stations as 3D-Tiles models. Camera collision, occlusion, and identification become possible.
                  </li>
                  <li>
                    <strong className="text-n-12">Real line-of-sight visualization.</strong> Cesium has <code className="font-mono text-[13px] bg-white/[0.06] px-1 rounded">Cesium.SensorVolume</code>-style primitives + the <code className="font-mono text-[13px] bg-white/[0.06] px-1 rounded">cesium-sensor-volumes</code> add-on that draw conic / rectangular / spherical sensor volumes intersected with terrain.
                  </li>
                  <li>
                    <strong className="text-n-12">Atmospheric + sun lighting.</strong> Day/night terminator, cast shadows, atmospheric scattering — useful for surveillance scenarios that depend on sun angle.
                  </li>
                  <li>
                    <strong className="text-n-12">Sub-meter cameras.</strong> Cesium camera supports lookAt / lookAtTransform with smooth easing — better fit for our "camera look-at sensor" interaction than Mapbox's bearing/pitch.
                  </li>
                  <li>
                    <strong className="text-n-12">Geodesic correctness everywhere.</strong> Distances, FOV cones, coverage rings are computed on the WGS-84 ellipsoid — no Mercator distortion at high latitude. Our existing FOV math is already approximate; Cesium handles it natively.
                  </li>
                  <li>
                    <strong className="text-n-12">Vector + raster + mesh in one scene.</strong> No need to layer DOM markers above WebGL — Entities, Primitives, GeoJsonDataSource, KmlDataSource all coexist in one render loop.
                  </li>
                </ul>

                <p className="text-[14px] leading-6 text-n-10">
                  <strong className="text-n-12">Suggested next milestones</strong> (after parity):
                </p>
                <ol className="space-y-2 text-[14px] leading-6 text-n-10 list-decimal ps-6 marker:text-n-9">
                  <li>Switch this primitive to 3D mode behind a toggle, layer in Cesium World Terrain.</li>
                  <li>Move drone / missile / engagement-line animations to CZML so the clock / scrub UI works.</li>
                  <li>Replace the flat FOV polygon with a real <code className="font-mono text-[13px] bg-white/[0.06] px-1 rounded">SensorVolume</code> (terrain-clipped 3D cone).</li>
                  <li>Wire <code className="font-mono text-[13px] bg-white/[0.06] px-1 rounded">CesiumMap</code> into <code className="font-mono text-[13px] bg-white/[0.06] px-1 rounded">Dashboard</code> behind a feature flag, then deprecate <code className="font-mono text-[13px] bg-white/[0.06] px-1 rounded">TacticalMap</code> when parity is full.</li>
                </ol>
              </div>
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
