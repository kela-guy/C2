import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Map, { Marker } from 'react-map-gl';
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
} from '@/shared/components/TacticalMap';
import {
  DroneCardIcon,
  MissileCardIcon,
  JamWaveIcon,
} from '@/primitives/MapIcons';
import { MapMarker } from '@/primitives/MapMarker';
import {
  type Affiliation,
  type InteractionState,
  type MarkerStyle,
  INTERACTION_STATES,
  AFFILIATIONS,
  INTERACTION_STATE_LABELS,
  AFFILIATION_LABELS,
  resolveMarkerStyle,
} from '@/primitives/mapMarkerStates';
import { cn } from '@/shared/components/ui/utils';

const MAPBOX_TOKEN =
  'pk.eyJ1IjoiZ3V5c2hhIiwiYSI6ImNtZ3htODN0dTE2dGMybXFrYWRlZmN5MGMifQ.dIQzO3kIdQaES0pfedlRvA';

const MAP_CENTER = { lat: 32.4746, lng: 34.9983 };

type IconDef = {
  id: string;
  label: string;
  hasFov: boolean;
  render: (size: number, fill: string, rotationDeg?: number) => React.ReactNode;
};

const ALL_ICONS: IconDef[] = [
  { id: 'camera', label: 'Camera', hasFov: true, render: (s, f) => <CameraIcon size={s} fill={f} /> },
  { id: 'sensor', label: 'Sensor', hasFov: true, render: (s, f) => <SensorIcon size={s} fill={f} /> },
  { id: 'radar', label: 'Radar', hasFov: true, render: (s, f) => <RadarIcon size={s} fill={f} /> },
  { id: 'lidar', label: 'LiDAR', hasFov: true, render: (s, f) => <LidarIcon size={s} fill={f} /> },
  { id: 'launcher', label: 'Launcher', hasFov: false, render: (s, f) => <LauncherIcon size={s} fill={f} /> },
  { id: 'drone-hive', label: 'Drone Hive', hasFov: false, render: (s, f) => <DroneHiveIcon size={s} fill={f} /> },
  { id: 'drone', label: 'Drone', hasFov: true, render: (_s, f, r) => <DroneIcon color={f} rotationDeg={r} /> },
  { id: 'missile', label: 'Missile', hasFov: false, render: (_s, _f, r) => <MissileIcon rotationDeg={r} /> },
  { id: 'drone-card', label: 'Drone Card', hasFov: false, render: (s, f) => <div style={{ color: f }}><DroneCardIcon size={s} /></div> },
  { id: 'missile-card', label: 'Missile Card', hasFov: false, render: (s, f) => <div style={{ color: f }}><MissileCardIcon size={s} /></div> },
  { id: 'jam-wave', label: 'Jam Wave', hasFov: false, render: (s, f) => <div style={{ color: f }}><JamWaveIcon size={s} /></div> },
];

const FOV_COLOR = '#00e5ff';

const AFFILIATION_COLORS: Record<Affiliation, string> = {
  friendly: '#ffffff',
  hostile: '#ff3d40',
  possibleThreat: '#ff9e3d',
  neutral: '#4ade80',
  unknown: '#facc15',
};

function Slider({ label, value, onChange, min, max, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[10px] text-zinc-500 w-16 shrink-0">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1 accent-cyan-500 bg-white/10 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:cursor-pointer"
      />
      <span className="text-[10px] text-zinc-400 font-mono w-10 text-right tabular-nums">{value}</span>
    </label>
  );
}

function ColorInput({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[10px] text-zinc-500 w-16 shrink-0">{label}</span>
      <input
        type="color" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-5 h-5 rounded border border-white/10 bg-transparent cursor-pointer p-0
          [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none"
      />
      <span className="text-[10px] text-zinc-400 font-mono">{value}</span>
    </label>
  );
}

function Toggle({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <span className="text-[10px] text-zinc-500 w-16 shrink-0">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          'w-7 h-4 rounded-full transition-colors relative',
          value ? 'bg-cyan-500/60' : 'bg-white/10',
        )}
      >
        <div className={cn(
          'absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform',
          value ? 'translate-x-3.5' : 'translate-x-0.5',
        )} />
      </button>
    </label>
  );
}

function Section({ title, children, defaultOpen = true }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/[0.06]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-zinc-400 font-semibold hover:text-zinc-200 transition-colors"
      >
        {title}
        <span className="text-[9px] text-zinc-600">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="px-3 pb-3 flex flex-col gap-2">{children}</div>}
    </div>
  );
}

const STORAGE_KEY = 'mapicons:playground';

interface SavedConfig {
  selectedIconId: string;
  activeState: InteractionState;
  affiliation: Affiliation;
  iconSize: number;
  surfaceSize: number;
  ringSize: number;
  glyphRotation: number;
  heading: number;
  showBadge: boolean;
  badgeSize: number;
  badgeFill: string;
  badgeOpacity: number;
  fovAngle: number;
  fovRange: number;
  overrides: Partial<MarkerStyle>;
}

const DEFAULTS: SavedConfig = {
  selectedIconId: 'camera',
  activeState: 'default',
  affiliation: 'friendly',
  iconSize: 28,
  surfaceSize: 36,
  ringSize: 28,
  glyphRotation: 0,
  heading: 180,
  showBadge: true,
  badgeSize: 16,
  badgeFill: '#0a0a0a',
  badgeOpacity: 0.85,
  fovAngle: 60,
  fovRange: 120,
  overrides: {},
};

function loadConfig(): SavedConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULTS;
}

export default function MapIconsPlayground() {
  const iconRef = useRef<HTMLDivElement>(null);
  const [saved] = useState(loadConfig);

  const [selectedIconId, setSelectedIconId] = useState(saved.selectedIconId);
  const [activeState, setActiveState] = useState<InteractionState>(saved.activeState);
  const [affiliation, setAffiliation] = useState<Affiliation>(saved.affiliation);
  const [viewState, setViewState] = useState({
    latitude: MAP_CENTER.lat,
    longitude: MAP_CENTER.lng,
    zoom: 15,
  });

  const [isHovered, setIsHovered] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const [iconSize, setIconSize] = useState(saved.iconSize);
  const [surfaceSize, setSurfaceSize] = useState(saved.surfaceSize);
  const [ringSize, setRingSize] = useState(saved.ringSize);
  const [glyphRotation, setGlyphRotation] = useState(saved.glyphRotation);
  const [heading, setHeading] = useState(saved.heading);
  const [showBadge, setShowBadge] = useState(saved.showBadge);
  const [badgeSize, setBadgeSize] = useState(saved.badgeSize);
  const [badgeFill, setBadgeFill] = useState(saved.badgeFill);
  const [badgeOpacity, setBadgeOpacity] = useState(saved.badgeOpacity);
  const [fovAngle, setFovAngle] = useState(saved.fovAngle);
  const [fovRange, setFovRange] = useState(saved.fovRange);

  const [overrides, setOverrides] = useState<Partial<MarkerStyle>>(saved.overrides);

  const saveAll = useCallback(() => {
    const config: SavedConfig = {
      selectedIconId, activeState, affiliation,
      iconSize, surfaceSize, ringSize, glyphRotation,
      heading, showBadge, badgeSize, badgeFill, badgeOpacity,
      fovAngle, fovRange, overrides,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  }, [
    selectedIconId, activeState, affiliation,
    iconSize, surfaceSize, ringSize, glyphRotation,
    heading, showBadge, badgeSize, badgeFill, badgeOpacity,
    fovAngle, fovRange, overrides,
  ]);

  const setOverride = useCallback(<K extends keyof MarkerStyle>(key: K, value: MarkerStyle[K]) => {
    setOverrides((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearOverrides = useCallback(() => setOverrides({}), []);

  const selectedIcon = ALL_ICONS.find((i) => i.id === selectedIconId) ?? ALL_ICONS[0];

  const effectiveState: InteractionState = isHovered && activeState === 'default' ? 'hovered' : activeState;
  const baseStyle = resolveMarkerStyle(effectiveState, affiliation);
  const resolved = resolveMarkerStyle(effectiveState, affiliation, overrides);
  const iconNode = selectedIcon.render(iconSize, resolved.glyphColor, glyphRotation);

  const interactiveStates: InteractionState[] = ['hovered', 'selected', 'active'];
  const showLabel = isHovered || interactiveStates.includes(activeState);
  const showFov = (isHovered || interactiveStates.includes(activeState)) && selectedIcon.hasFov;

  const hasOverrides = Object.keys(overrides).length > 0;

  return (
    <div className="h-screen flex flex-col text-white font-sans bg-[#0a0a0a]">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.06] shrink-0 z-10">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          Back
        </Link>
        <div className="w-px h-4 bg-white/10" />
        <h1 className="text-sm font-semibold text-zinc-200 tracking-wide">
          Map Icons Playground
        </h1>
        <button
          type="button"
          onClick={saveAll}
          className={cn(
            'ml-auto px-3 py-1 rounded text-xs font-medium transition-all',
            justSaved
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
              : 'bg-white/[0.06] border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.1]',
          )}
        >
          {justSaved ? 'Saved' : 'Save'}
        </button>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Left panel: States + Affiliations + Icons */}
        <div className="w-52 border-r border-white/[0.06] flex flex-col shrink-0 overflow-y-auto">
          {/* Affiliation selector */}
          <div className="border-b border-white/[0.06] p-3">
            <div className="text-[10px] uppercase tracking-[0.1em] text-zinc-500 font-semibold mb-2">
              Affiliation
            </div>
            <div className="flex flex-col gap-0.5">
              {AFFILIATIONS.map((aff) => (
                <button
                  key={aff}
                  type="button"
                  onClick={() => { setAffiliation(aff); clearOverrides(); }}
                  className={cn(
                    'flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-all text-xs',
                    affiliation === aff
                      ? 'bg-white/[0.08] text-white'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]',
                  )}
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: AFFILIATION_COLORS[aff] }}
                  />
                  {AFFILIATION_LABELS[aff]}
                </button>
              ))}
            </div>
          </div>

          {/* State selector */}
          <div className="border-b border-white/[0.06] p-3">
            <div className="text-[10px] uppercase tracking-[0.1em] text-zinc-500 font-semibold mb-2">
              Interaction State
            </div>
            <div className="flex flex-col gap-0.5">
              {INTERACTION_STATES.map((state) => {
                const stateStyle = resolveMarkerStyle(state, affiliation);
                return (
                  <button
                    key={state}
                    type="button"
                    onClick={() => { setActiveState(state); clearOverrides(); }}
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-all text-xs',
                      activeState === state
                        ? 'bg-white/[0.08] text-white'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]',
                    )}
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0 border"
                      style={{
                        borderColor: stateStyle.ringColor,
                        background: stateStyle.glyphColor,
                        opacity: stateStyle.glyphOpacity,
                      }}
                    />
                    {INTERACTION_STATE_LABELS[state]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Icon selector */}
          <div className="p-3">
            <div className="text-[10px] uppercase tracking-[0.1em] text-zinc-500 font-semibold mb-2">
              Icon
            </div>
            <div className="grid grid-cols-3 gap-1">
              {ALL_ICONS.map((iconDef) => (
                <button
                  key={iconDef.id}
                  type="button"
                  onClick={() => setSelectedIconId(iconDef.id)}
                  className={cn(
                    'flex flex-col items-center gap-0.5 p-1.5 rounded transition-all',
                    iconDef.id === selectedIconId
                      ? 'ring-1 ring-cyan-400/40 bg-white/[0.08]'
                      : 'hover:bg-white/[0.04]',
                  )}
                  title={iconDef.label}
                >
                  <div className="flex items-center justify-center w-6 h-6" style={{ color: '#ffffff' }}>
                    {iconDef.render(16, '#ffffff')}
                  </div>
                  <span className={cn(
                    'text-[8px] font-mono whitespace-nowrap',
                    iconDef.id === selectedIconId ? 'text-cyan-400' : 'text-zinc-600',
                  )}>
                    {iconDef.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Map preview */}
        <div className="flex-1 relative min-h-0">
          <Map
            {...viewState}
            onMove={(evt) => setViewState(evt.viewState)}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/satellite-v9"
            mapboxAccessToken={MAPBOX_TOKEN}
          >
            <Marker latitude={MAP_CENTER.lat} longitude={MAP_CENTER.lng} anchor="center">
              <div
                className="relative flex flex-col items-center"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {/* FOV triangle */}
                <AnimatePresence>
                  {showFov && (
                    <motion.div
                      className="absolute pointer-events-none"
                      style={{ bottom: '50%', left: '50%' }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <svg
                        width={fovRange * 2}
                        height={fovRange}
                        viewBox={`0 0 ${fovRange * 2} ${fovRange}`}
                        style={{
                          transform: `translate(-50%, 0) rotate(${glyphRotation}deg)`,
                          transformOrigin: '50% 100%',
                        }}
                      >
                        {(() => {
                          const cx = fovRange;
                          const cy = fovRange;
                          const halfAngle = (fovAngle / 2) * (Math.PI / 180);
                          const x1 = cx + fovRange * Math.sin(-halfAngle);
                          const y1 = cy - fovRange * Math.cos(-halfAngle);
                          const x2 = cx + fovRange * Math.sin(halfAngle);
                          const y2 = cy - fovRange * Math.cos(halfAngle);
                          const largeArc = fovAngle > 180 ? 1 : 0;
                          const d = `M ${cx} ${cy} L ${x1} ${y1} A ${fovRange} ${fovRange} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                          return (
                            <path
                              d={d}
                              fill={`${FOV_COLOR}33`}
                              stroke={FOV_COLOR}
                              strokeWidth={1}
                            />
                          );
                        })()}
                      </svg>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div
                  key={`${activeState}-${affiliation}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', visualDuration: 0.25, bounce: 0.15 }}
                >
                  <div ref={iconRef}>
                    <MapMarker
                      icon={iconNode}
                      surfaceSize={surfaceSize}
                      ringSize={ringSize}
                      style={resolved}
                      heading={heading}
                      showBadge={showBadge}
                      badgeSize={badgeSize}
                      badgeFill={badgeFill}
                      badgeOpacity={badgeOpacity}
                      label={selectedIcon.label}
                      showLabel={showLabel}
                    />
                  </div>
                </motion.div>
              </div>
            </Marker>
          </Map>

          {/* State + affiliation info overlay */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <div className="px-2.5 py-1 rounded bg-black/60 backdrop-blur-sm border border-white/[0.08]">
              <span className="text-[10px] text-zinc-400 font-mono">
                {AFFILIATION_LABELS[affiliation]} / {INTERACTION_STATE_LABELS[effectiveState]}
                {isHovered && activeState === 'default' ? ' (hover)' : ''}
              </span>
            </div>
            {hasOverrides && (
              <button
                type="button"
                onClick={clearOverrides}
                className="px-2 py-1 rounded bg-cyan-500/20 border border-cyan-500/30 text-[10px] text-cyan-400 font-mono hover:bg-cyan-500/30 transition-colors"
              >
                Reset overrides
              </button>
            )}
          </div>
        </div>

        {/* Right panel: Configuration */}
        <div className="w-72 border-l border-white/[0.06] flex flex-col shrink-0 overflow-y-auto">
          <Section title="Surface">
            <ColorInput
              label="Fill"
              value={overrides.surfaceFill ?? baseStyle.surfaceFill}
              onChange={(v) => setOverride('surfaceFill', v)}
            />
            <Slider
              label="Opacity" min={0} max={1} step={0.01}
              value={overrides.surfaceOpacity ?? baseStyle.surfaceOpacity}
              onChange={(v) => setOverride('surfaceOpacity', v)}
            />
            <Slider
              label="Blur" min={0} max={40} step={1}
              value={overrides.surfaceBlur ?? baseStyle.surfaceBlur}
              onChange={(v) => setOverride('surfaceBlur', v)}
            />
            <Slider
              label="Size" min={16} max={160} step={1}
              value={surfaceSize}
              onChange={setSurfaceSize}
            />
          </Section>

          <Section title="Ring">
            <ColorInput
              label="Color"
              value={overrides.ringColor ?? baseStyle.ringColor}
              onChange={(v) => setOverride('ringColor', v)}
            />
            <Slider
              label="Opacity" min={0} max={1} step={0.01}
              value={overrides.ringOpacity ?? baseStyle.ringOpacity}
              onChange={(v) => setOverride('ringOpacity', v)}
            />
            <Slider
              label="Width" min={0} max={8} step={0.5}
              value={overrides.ringWidth ?? baseStyle.ringWidth}
              onChange={(v) => setOverride('ringWidth', v)}
            />
            <Slider
              label="Size" min={16} max={160} step={1}
              value={ringSize}
              onChange={setRingSize}
            />
            <Toggle
              label="Dashed"
              value={(overrides.ringDash ?? baseStyle.ringDash) === 'dashed'}
              onChange={(v) => setOverride('ringDash', v ? 'dashed' : 'solid')}
            />
            <Toggle
              label="Pulse"
              value={overrides.ringPulse ?? baseStyle.ringPulse}
              onChange={(v) => setOverride('ringPulse', v)}
            />
          </Section>

          <Section title="Glyph">
            <ColorInput
              label="Color"
              value={overrides.glyphColor ?? baseStyle.glyphColor}
              onChange={(v) => setOverride('glyphColor', v)}
            />
            <Slider
              label="Opacity" min={0} max={1} step={0.01}
              value={overrides.glyphOpacity ?? baseStyle.glyphOpacity}
              onChange={(v) => setOverride('glyphOpacity', v)}
            />
            <Slider
              label="Size" min={8} max={128} step={1}
              value={iconSize}
              onChange={setIconSize}
            />
            <Slider
              label="Rotation" min={0} max={360} step={1}
              value={glyphRotation}
              onChange={setGlyphRotation}
            />
          </Section>

          <Section title="Badge" defaultOpen={false}>
            <Toggle label="Show" value={showBadge} onChange={setShowBadge} />
            <Slider
              label="Heading" min={0} max={360} step={1}
              value={heading}
              onChange={setHeading}
            />
            <Slider
              label="Size" min={8} max={32} step={1}
              value={badgeSize}
              onChange={setBadgeSize}
            />
            <ColorInput label="Fill" value={badgeFill} onChange={setBadgeFill} />
            <Slider
              label="Opacity" min={0} max={1} step={0.01}
              value={badgeOpacity}
              onChange={setBadgeOpacity}
            />
          </Section>

          <Section title="FOV" defaultOpen={false}>
            <Slider
              label="Angle" min={10} max={180} step={1}
              value={fovAngle}
              onChange={setFovAngle}
            />
            <Slider
              label="Range" min={40} max={300} step={5}
              value={fovRange}
              onChange={setFovRange}
            />
            <div className="text-[9px] text-zinc-600 font-mono mt-1">
              {selectedIcon.hasFov ? 'Shows on hover' : 'No FOV for this icon'}
            </div>
          </Section>

          <Section title="Marker" defaultOpen={false}>
            <Slider
              label="Scale" min={0.5} max={3} step={0.05}
              value={overrides.markerScale ?? baseStyle.markerScale}
              onChange={(v) => setOverride('markerScale', v)}
            />
          </Section>

          {/* Style values readout */}
          <div className="p-3 border-t border-white/[0.06]">
            <div className="text-[10px] uppercase tracking-[0.1em] text-zinc-500 font-semibold mb-2">
              Resolved Values
            </div>
            <div className="flex flex-col gap-0.5 font-mono text-[9px] text-zinc-600">
              {Object.entries(resolved).map(([key, val]) => (
                <div key={key} className="flex justify-between">
                  <span className={overrides[key as keyof MarkerStyle] !== undefined ? 'text-cyan-500' : ''}>
                    {key}
                  </span>
                  <span className="text-zinc-400">{typeof val === 'number' ? Math.round(val * 100) / 100 : String(val)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
