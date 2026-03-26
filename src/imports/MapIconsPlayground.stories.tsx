import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, useCallback, useRef } from 'react';
import Map, { Marker, type MapRef } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  CameraIcon,
  SensorIcon,
  RadarIcon,
  DroneIcon,
  DroneHiveIcon,
  LidarIcon,
  LauncherIcon,
  MissileIcon,
} from '@/app/components/TacticalMap';
import {
  DroneCardIcon,
  MissileCardIcon,
  JamWaveIcon,
} from '@/primitives/MapIcons';
import { cn } from '@/app/components/ui/utils';

const TOKEN =
  'pk.eyJ1IjoiZ3V5c2hhIiwiYSI6ImNtZ3htODN0dTE2dGMybXFrYWRlZmN5MGMifQ.dIQzO3kIdQaES0pfedlRvA';

const CENTER = { lat: 32.4746, lon: 34.9983 };

const FOV_BEARING = 350;
const FOV_RADIUS_PX = 100;

// ---------------------------------------------------------------------------
// Map icon definitions (for the map row)
// ---------------------------------------------------------------------------

type IconDef = {
  id: string;
  label: string;
  fovDeg: number;
  render: (size: number, fill: string) => React.ReactNode;
};

const ICONS: IconDef[] = [
  { id: 'camera',       label: 'Camera',           fovDeg: 90,  render: (s, f) => <CameraIcon size={s} fill={f} /> },
  { id: 'sensor',       label: 'Sensor',           fovDeg: 180, render: (s, f) => <SensorIcon size={s} fill={f} /> },
  { id: 'radar',        label: 'Radar',            fovDeg: 180, render: (s, f) => <RadarIcon size={s} fill={f} /> },
  { id: 'lidar',        label: 'LiDAR',            fovDeg: 360, render: (s, f) => <LidarIcon size={s} fill={f} /> },
  { id: 'launcher',     label: 'Launcher',         fovDeg: 0,   render: (s, f) => <LauncherIcon size={s} fill={f} /> },
  { id: 'drone-hive',   label: 'Drone Hive',       fovDeg: 0,   render: (s, f) => <DroneHiveIcon size={s} fill={f} /> },
  { id: 'drone-friend', label: 'Drone (Friendly)',  fovDeg: 0,   render: () => <DroneIcon /> },
  { id: 'drone-enemy',  label: 'Drone (Enemy)',     fovDeg: 0,   render: () => <DroneIcon color="#ef4444" /> },
  { id: 'missile',      label: 'Missile',          fovDeg: 0,   render: () => <MissileIcon /> },
  { id: 'regulus',      label: 'Regulus',           fovDeg: 0,   render: (s, f) => <SensorIcon size={s} fill={f} /> },
];

const ICON_SPACING_LON = 0.007;

// ---------------------------------------------------------------------------
// Icon catalog (for the reference panel)
// ---------------------------------------------------------------------------

type CatalogEntry = {
  id: string;
  label: string;
  group: 'map' | 'card';
  source: string;
  viewBox: string;
  props: string;
  notes: string;
  render: (size: number) => React.ReactNode;
};

const ICON_CATALOG: CatalogEntry[] = [
  { id: 'camera',       label: 'Camera',            group: 'map',  source: 'TacticalMap.tsx', viewBox: '0 0 28 28', props: 'size, fill',           notes: 'Fill prop, black stroke outline',         render: (s) => <CameraIcon size={s} fill="white" /> },
  { id: 'sensor',       label: 'Sensor',            group: 'map',  source: 'TacticalMap.tsx', viewBox: '0 0 28 28', props: 'size, fill',           notes: 'Fill prop, black stroke outline',         render: (s) => <SensorIcon size={s} fill="white" /> },
  { id: 'radar',        label: 'Radar',             group: 'map',  source: 'TacticalMap.tsx', viewBox: '0 0 28 28', props: 'size, fill',           notes: 'Fill prop, black stroke outline',         render: (s) => <RadarIcon size={s} fill="white" /> },
  { id: 'lidar',        label: 'LiDAR',             group: 'map',  source: 'TacticalMap.tsx', viewBox: '0 0 24 24', props: 'size, fill',           notes: 'Fill prop, black stroke, round joins',    render: (s) => <LidarIcon size={s} fill="white" /> },
  { id: 'launcher',     label: 'Launcher',          group: 'map',  source: 'TacticalMap.tsx', viewBox: '0 0 24 24', props: 'size, fill',           notes: 'Fill prop, missile launcher silhouette',   render: (s) => <LauncherIcon size={s} fill="white" /> },
  { id: 'drone-hive',   label: 'Drone Hive',        group: 'map',  source: 'TacticalMap.tsx', viewBox: '0 0 28 28', props: 'size, fill',           notes: 'Fill prop, black stroke outline',         render: (s) => <DroneHiveIcon size={s} fill="white" /> },
  { id: 'drone-friend', label: 'Drone (Friendly)',   group: 'map',  source: 'TacticalMap.tsx', viewBox: '0 0 28 32', props: 'rotationDeg, color',   notes: 'Default cyan #15FFF6, rotation, drop-shadow', render: (s) => <div style={{ width: s, height: s }} className="flex items-center justify-center"><DroneIcon /></div> },
  { id: 'drone-enemy',  label: 'Drone (Enemy)',      group: 'map',  source: 'TacticalMap.tsx', viewBox: '0 0 28 32', props: 'rotationDeg, color',   notes: 'Red #ef4444 via color prop',              render: (s) => <div style={{ width: s, height: s }} className="flex items-center justify-center"><DroneIcon color="#ef4444" /></div> },
  { id: 'missile',      label: 'Missile',           group: 'map',  source: 'TacticalMap.tsx', viewBox: '0 0 42 30', props: 'rotationDeg',          notes: 'Fixed cyan #15FFF6, hardcoded 42x30',     render: (s) => <div style={{ width: s, height: s }} className="flex items-center justify-center"><MissileIcon /></div> },
  { id: 'regulus',      label: 'Regulus',           group: 'map',  source: 'TacticalMap.tsx', viewBox: '0 0 28 28', props: 'size, fill',           notes: 'Uses SensorIcon — jammer effector on map',  render: (s) => <SensorIcon size={s} fill="white" /> },
  { id: 'drone-card',   label: 'Drone Card',        group: 'card', source: 'MapIcons.tsx',    viewBox: '2 -2 22 36', props: 'size',                 notes: 'currentColor fill, no stroke',            render: (s) => <div style={{ color: 'white' }}><DroneCardIcon size={s} /></div> },
  { id: 'missile-card', label: 'Missile Card',      group: 'card', source: 'MapIcons.tsx',    viewBox: '2 6 36 18',  props: 'size',                 notes: 'currentColor fill, no stroke',            render: (s) => <div style={{ color: 'white' }}><MissileCardIcon size={s} /></div> },
  { id: 'jam-wave',     label: 'Jam Wave',          group: 'card', source: 'MapIcons.tsx',    viewBox: '0 0 24 24',  props: 'size',                 notes: 'currentColor stroke, no fill',            render: (s) => <div style={{ color: 'white' }}><JamWaveIcon size={s} /></div> },
];

// ---------------------------------------------------------------------------
// Copy / download helpers
// ---------------------------------------------------------------------------

function copySvg(container: HTMLElement | null) {
  const svg = container?.querySelector('svg');
  if (!svg) return;
  navigator.clipboard.writeText(svg.outerHTML);
}

function downloadSvg(container: HTMLElement | null, name: string) {
  const svg = container?.querySelector('svg');
  if (!svg) return;
  const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name}.svg`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------------------------------------------------------------------------
// Visual states — toggled via buttons, applied to the map markers
// ---------------------------------------------------------------------------

type StateId =
  | 'hovered'
  | 'active'
  | 'disabled'
  | 'expired'
  | 'highlight'
  | 'jammer'
  | 'mission-planning'
  | 'fov';

const STATE_BUTTONS: { id: StateId; label: string; description: string }[] = [
  { id: 'hovered',          label: 'Hovered',           description: 'Marker hovered on map or from sidebar card' },
  { id: 'active',           label: 'Active / Selected', description: 'Active target — selected in sidebar' },
  { id: 'disabled',         label: 'Disabled',          description: 'Jammed / offline sensor' },
  { id: 'expired',          label: 'Expired',           description: 'Expired CUAS target — dimmed' },
  { id: 'highlight',        label: 'Card Highlight',    description: 'Sensor highlighted from card hover' },
  { id: 'jammer',           label: 'Jammer Active',     description: 'Regulus jammer actively jamming' },
  { id: 'mission-planning', label: 'Mission Planning',  description: 'Selected for mission planning' },
  { id: 'fov',              label: 'Show FOV',          description: 'Toggle FOV polygon overlay' },
];

function stateClasses(active: Set<StateId>): string {
  const parts: string[] = [];
  if (active.has('disabled'))         parts.push('opacity-50 grayscale');
  if (active.has('expired'))          parts.push('opacity-30');
  if (active.has('highlight'))        parts.push('scale-110');
  if (active.has('jammer'))           parts.push('ring-2 ring-green-400/60 scale-125');
  if (active.has('mission-planning')) parts.push('ring-2 ring-violet-400/60');
  return parts.join(' ');
}

function fillForState(active: Set<StateId>, baseFill: string): string {
  if (active.has('jammer')) return '#4ade80';
  if (active.has('mission-planning')) return '#a78bfa';
  return baseFill;
}

// ---------------------------------------------------------------------------
// FOV SVG overlay
// ---------------------------------------------------------------------------

function FovOverlay({ radiusPx, fovDeg, bearingDeg }: { radiusPx: number; fovDeg: number; bearingDeg: number }) {
  const size = radiusPx * 2;
  const cx = radiusPx;
  const cy = radiusPx;
  const isFullCircle = fovDeg >= 360;

  let shape: React.ReactNode;

  if (isFullCircle) {
    shape = (
      <circle
        cx={cx}
        cy={cy}
        r={radiusPx - 1}
        fill="rgba(34, 211, 238, 0.15)"
        stroke="rgba(34, 211, 238, 0.6)"
        strokeWidth={2}
      />
    );
  } else {
    const startAngle = bearingDeg - fovDeg / 2 - 90;
    const endAngle = bearingDeg + fovDeg / 2 - 90;
    const toRad = (a: number) => (a * Math.PI) / 180;
    const x1 = cx + radiusPx * Math.cos(toRad(startAngle));
    const y1 = cy + radiusPx * Math.sin(toRad(startAngle));
    const x2 = cx + radiusPx * Math.cos(toRad(endAngle));
    const y2 = cy + radiusPx * Math.sin(toRad(endAngle));
    const largeArc = fovDeg > 180 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radiusPx} ${radiusPx} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    shape = (
      <path
        d={d}
        fill="rgba(34, 211, 238, 0.25)"
        stroke="rgba(34, 211, 238, 0.8)"
        strokeWidth={2}
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="absolute pointer-events-none"
      style={{
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      }}
    >
      {shape}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Icon reference card
// ---------------------------------------------------------------------------

const SIZES = [
  { label: 'SM', px: 16 },
  { label: 'MD', px: 28 },
  { label: 'LG', px: 48 },
];

function IconRefCard({ entry }: { entry: CatalogEntry }) {
  const lgRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copySvg(lgRef.current);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{
      background: 'rgba(255,255,255,0.03)',
      boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.3)',
    }}>
      {/* Icon preview strip */}
      <div className="flex items-end justify-center gap-5 px-4 pt-5 pb-4 bg-white/[0.02]">
        {SIZES.map(({ label, px }) => (
          <div key={label} className="flex flex-col items-center gap-1.5">
            <div
              ref={label === 'LG' ? lgRef : undefined}
              className="flex items-center justify-center rounded-lg"
              style={{
                width: px + 20,
                height: px + 20,
                background: 'rgba(0,0,0,0.4)',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
              }}
            >
              {entry.render(px)}
            </div>
            <span className="text-[10px] font-mono text-zinc-400 tabular-nums tracking-wide">
              {label} <span className="text-zinc-500">{px}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Info section */}
      <div className="px-4 py-3.5 space-y-2 border-t border-white/[0.04]">
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold text-white leading-tight">{entry.label}</div>
            <div className="text-[11px] text-zinc-400 font-mono mt-0.5">{entry.source}</div>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={handleCopy}
              className={cn(
                'text-[11px] px-2.5 py-1 rounded-lg font-medium cursor-pointer',
                'transition-colors duration-150',
                copied
                  ? 'text-emerald-300'
                  : 'text-zinc-200 hover:text-white',
              )}
              style={copied ? {
                background: 'rgba(52, 211, 153, 0.12)',
                boxShadow: '0 0 0 1px rgba(52, 211, 153, 0.2), 0 1px 2px rgba(0,0,0,0.2)',
              } : {
                background: 'rgba(255,255,255,0.07)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.1), 0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={() => downloadSvg(lgRef.current, entry.id)}
              className="text-[11px] px-2.5 py-1 rounded-lg font-medium text-zinc-200 hover:text-white cursor-pointer transition-colors duration-150"
              style={{
                background: 'rgba(255,255,255,0.07)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.1), 0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
              }}
            >
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function IconsPlayground() {
  const [activeStates, setActiveStates] = useState<Set<StateId>>(new Set());
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState({
    latitude: CENTER.lat,
    longitude: CENTER.lon,
    zoom: 13.2,
  });

  const toggle = useCallback((id: StateId) => {
    setActiveStates((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const showFov = activeStates.has('fov') || activeStates.has('hovered') || activeStates.has('active') || activeStates.has('highlight');

  const combinedStates = new Set(activeStates);

  const isHovered = (iconId: string) =>
    hoveredIcon === iconId || activeStates.has('hovered') || activeStates.has('active') || activeStates.has('highlight');

  const currentFill = fillForState(combinedStates, '#ffffff');

  const startLon = CENTER.lon - ((ICONS.length - 1) / 2) * ICON_SPACING_LON;

  const mapIcons = ICON_CATALOG.filter((e) => e.group === 'map');
  const cardIcons = ICON_CATALOG.filter((e) => e.group === 'card');

  return (
    <div className="flex h-full min-h-screen text-white">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Map */}
        <div className="h-[45vh] min-h-[300px] relative">
          <Map
            ref={mapRef}
            {...viewState}
            onMove={(evt) => setViewState(evt.viewState)}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/satellite-v9"
            mapboxAccessToken={TOKEN}
          >
            {ICONS.map((icon, i) => {
              const lon = startLon + i * ICON_SPACING_LON;
              const hovered = isHovered(icon.id);
              const iconCombined = new Set(activeStates);
              if (hoveredIcon === icon.id) iconCombined.add('hovered');

              return (
                <Marker key={icon.id} latitude={CENTER.lat} longitude={lon} anchor="center">
                  <div className="relative flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        'relative flex items-center justify-center rounded-full p-2 cursor-pointer transition-all duration-200',
                        hovered ? 'bg-white/10' : '',
                        stateClasses(iconCombined),
                      )}
                      onMouseEnter={() => setHoveredIcon(icon.id)}
                      onMouseLeave={() => setHoveredIcon(null)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(showFov || hoveredIcon === icon.id) && icon.fovDeg > 0 && (
                        <FovOverlay radiusPx={FOV_RADIUS_PX} fovDeg={icon.fovDeg} bearingDeg={FOV_BEARING} />
                      )}
                      <div
                        className="absolute rounded-full pointer-events-none transition-[border-color] duration-200"
                        style={{
                          width: 42,
                          height: 42,
                          border: `1px solid ${hovered ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.2)'}`,
                          boxShadow: '0px 0px 0px 2px rgba(0,0,0,1)',
                        }}
                      />
                      {icon.render(28, currentFill)}
                      {hovered && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 text-[10px] text-white px-2 py-1 rounded pointer-events-none">
                          {icon.label}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-white font-semibold whitespace-nowrap pointer-events-none">
                      {icon.label}
                    </span>
                  </div>
                </Marker>
              );
            })}
          </Map>

          {activeStates.size > 0 && (
            <div className="absolute top-3 left-3 flex flex-wrap gap-1 pointer-events-none">
              {[...activeStates].map((s) => (
                <span key={s} className="text-[9px] bg-white/10 text-white/70 px-1.5 py-0.5 rounded">
                  {STATE_BUTTONS.find((b) => b.id === s)?.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Icon Reference */}
        <div className="flex-1 min-h-0 overflow-y-auto border-t border-white/[0.06]" style={{ background: 'rgba(0,0,0,0.25)' }}>
          <div className="p-5 lg:p-6 space-y-8">
            {/* Map Icons */}
            <section>
              <div className="flex items-baseline gap-3 mb-4">
                <h3 className="text-sm font-semibold text-zinc-200 tracking-wide uppercase">
                  Map Icons
                </h3>
                <span className="text-xs text-zinc-600 font-mono">TacticalMap.tsx</span>
                <span className="text-[10px] text-zinc-600 tabular-nums">{mapIcons.length} icons</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                {mapIcons.map((entry) => (
                  <IconRefCard key={entry.id} entry={entry} />
                ))}
              </div>
            </section>

            {/* Card Icons */}
            <section>
              <div className="flex items-baseline gap-3 mb-4">
                <h3 className="text-sm font-semibold text-zinc-200 tracking-wide uppercase">
                  Card Icons
                </h3>
                <span className="text-xs text-zinc-600 font-mono">MapIcons.tsx</span>
                <span className="text-[10px] text-zinc-600 tabular-nums">{cardIcons.length} icons</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                {cardIcons.map((entry) => (
                  <IconRefCard key={entry.id} entry={entry} />
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Config panel — Visual States only */}
      <div className="w-[220px] shrink-0 overflow-y-auto p-4 space-y-5" style={{
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div>
          <label className="text-xs uppercase tracking-[0.08em] text-zinc-300 font-semibold mb-3 block">
            Visual States
          </label>
          <div className="space-y-1.5">
            {STATE_BUTTONS.map((btn) => (
              <button
                key={btn.id}
                onClick={() => toggle(btn.id)}
                title={btn.description}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium cursor-pointer',
                  'transition-colors duration-150',
                  activeStates.has(btn.id)
                    ? 'text-white'
                    : 'text-zinc-400 hover:text-zinc-200',
                )}
                style={activeStates.has(btn.id) ? {
                  background: 'rgba(255,255,255,0.1)',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.15), 0 1px 3px rgba(0,0,0,0.3)',
                } : {
                  background: 'transparent',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
          {activeStates.size > 0 && (
            <button
              onClick={() => setActiveStates(new Set())}
              className="mt-3 text-[11px] text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors duration-150"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Storybook meta
// ---------------------------------------------------------------------------

const meta: Meta = {
  title: 'Map/Icons Playground',
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

export const Interactive: StoryObj = {
  name: 'Camera',
  render: () => <IconsPlayground />,
};
