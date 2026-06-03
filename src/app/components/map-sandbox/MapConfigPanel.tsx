/**
 * Right-side floating panel for the map sandbox. Grouped accordions
 * (Terrain / Sky / Fog / Lighting / Imagery / Camera) over a slider/toggle
 * rail. Save-as-preset, copy-as-code, and reset live in the footer.
 *
 * The panel paints with the global slate/surface tokens — opening it in
 * `/theme-sandbox` style would mean theming the sandbox tokens scope; for
 * this sandbox we keep it on the default tokens because the panel sits
 * over a Cesium canvas and never needs to colour-shift with theme state.
 */

import {
  Fragment,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

import {
  Activity,
  Check,
  ChevronDown,
  ChevronsRight,
  Copy,
  Gauge,
  Image as ImageIcon,
  Mountain,
  Plus,
  RotateCcw,
  Sparkles,
  Star,
  Sun,
  X,
  Zap,
  type IconComponent,
} from '@/lib/icons/central';
import type { CesiumMapViewMode, CesiumSceneMode } from '@/primitives/CesiumMap';

import {
  KNOB_RANGES,
  type KnobKey,
  type MapSettings,
} from './mapSettingsTypes';
import type { MapPreset, MapSettingsPatch, UseMapSettingsApi } from './useMapSettings';

interface MapConfigPanelProps {
  api: UseMapSettingsApi;
  codeBlock: string;
  diffLines: string[];
}

const SCENE_MODES: ReadonlyArray<{ id: CesiumSceneMode; label: string }> = [
  { id: '2D', label: '2D' },
  { id: '2.5D', label: '2.5D' },
  { id: '3D', label: '3D' },
];

const MAP_STYLES: ReadonlyArray<{ id: CesiumMapViewMode; label: string }> = [
  { id: 'current', label: 'Aerial' },
  { id: 'monochromeTerrain', label: 'Mono dark' },
  { id: 'monochromeLight', label: 'Mono light' },
];

function mapStyleLabel(style: CesiumMapViewMode): string {
  return MAP_STYLES.find((s) => s.id === style)?.label ?? style;
}

const GROUPS = [
  { id: 'terrain', label: 'Terrain', Icon: Mountain },
  { id: 'sky', label: 'Sky', Icon: Sun },
  { id: 'fog', label: 'Fog', Icon: Sparkles },
  { id: 'lighting', label: 'Lighting', Icon: Zap },
  { id: 'imagery', label: 'Imagery', Icon: ImageIcon },
  { id: 'camera', label: 'Camera', Icon: Gauge },
  { id: 'space', label: 'Space', Icon: Star },
] as const;

type GroupId = (typeof GROUPS)[number]['id'];

export function MapConfigPanel({ api, codeBlock, diffLines }: MapConfigPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<GroupId, boolean>>({
    terrain: true,
    sky: true,
    fog: false,
    lighting: false,
    imagery: false,
    camera: false,
    space: false,
  });
  const [codeOpen, setCodeOpen] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

  const handleCopy = () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    void navigator.clipboard.writeText(codeBlock).then(() => {
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1400);
    });
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="pointer-events-auto fixed end-3 top-3 z-30 grid h-9 w-9 place-items-center rounded-md border border-border-default bg-surface-3/85 text-slate-11 shadow-[var(--shadow-4)] backdrop-blur transition-colors hover:bg-surface-4 hover:text-slate-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-focus-ring)]"
        aria-label="Open map settings"
      >
        <Gauge size={16} />
      </button>
    );
  }

  const toggleGroup = (id: GroupId) =>
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  const { settings, patch } = api;

  return (
    <div
      dir="ltr"
      className="pointer-events-auto fixed end-3 top-3 bottom-3 z-30 flex w-[340px] flex-col overflow-hidden rounded-2xl border border-border-default bg-surface-2/90 text-slate-12 shadow-[var(--shadow-6)] backdrop-blur"
      role="region"
      aria-label="Map settings"
    >
      <header className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
        <div className="flex items-center gap-2">
          <Gauge size={14} className="text-slate-10" />
          <span className="text-[12px] font-medium tracking-wide text-slate-12">
            Map settings
          </span>
          {diffLines.length > 0 && (
            <span
              title={`${diffLines.length} change(s) from defaults`}
              className="rounded-full bg-state-selected px-1.5 text-[10px] font-mono tabular-nums text-slate-12"
            >
              {diffLines.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="grid h-6 w-6 place-items-center rounded text-slate-10 transition-colors hover:bg-state-hover hover:text-slate-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-focus-ring)]"
          aria-label="Collapse panel"
        >
          <ChevronsRight size={14} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3 [scrollbar-width:thin]">
        <SegmentRow
          label="Scene mode"
          options={SCENE_MODES}
          value={settings.sceneMode}
          onChange={(m) => patch({ sceneMode: m })}
        />
        <div className="mt-2">
          <SegmentRow
            label="Map style"
            options={MAP_STYLES}
            value={settings.mapStyle}
            onChange={(s) => patch({ mapStyle: s })}
          />
        </div>

        <div className="mt-3 space-y-2">
          {GROUPS.map(({ id, label, Icon }) => (
            <GroupAccordion
              key={id}
              label={label}
              Icon={Icon}
              open={openGroups[id]}
              onToggle={() => toggleGroup(id)}
              headerSuffix={id === 'imagery' ? mapStyleLabel(settings.mapStyle) : undefined}
            >
              {id === 'terrain' && <TerrainRows settings={settings} patch={patch} />}
              {id === 'sky' && <SkyRows settings={settings} patch={patch} />}
              {id === 'fog' && <FogRows settings={settings} patch={patch} />}
              {id === 'lighting' && <LightingRows settings={settings} patch={patch} />}
              {id === 'imagery' && <ImageryRows settings={settings} patch={patch} />}
              {id === 'camera' && <CameraRows settings={settings} patch={patch} />}
              {id === 'space' && <SpaceRows settings={settings} patch={patch} />}
            </GroupAccordion>
          ))}
        </div>

        <PresetsRow
          factoryPresets={api.factoryPresets}
          userPresets={api.userPresets}
          activeId={api.activePresetId}
          onSave={api.saveCurrentAsPreset}
          onSelect={api.selectPreset}
          onDelete={api.deletePreset}
        />

        {codeOpen && <CodeBlockPreview code={codeBlock} diffLines={diffLines} />}
      </div>

      <footer className="flex items-center gap-2 border-t border-border-subtle px-3 py-2">
        <button
          type="button"
          onClick={() => {
            setCodeOpen((v) => !v);
            if (!codeOpen) handleCopy();
          }}
          className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md border border-border-default bg-state-hover px-2 text-[11px] font-medium text-slate-12 transition-colors hover:bg-state-hover-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-focus-ring)]"
        >
          {copyState === 'copied' ? <Check size={12} /> : <Copy size={12} />}
          {copyState === 'copied' ? 'Copied' : codeOpen ? 'Hide TS' : 'Copy as TS'}
        </button>
        <button
          type="button"
          onClick={api.reset}
          className="flex h-7 items-center justify-center gap-1.5 rounded-md border border-border-default bg-state-hover px-2 text-[11px] font-medium text-slate-12 transition-colors hover:bg-state-hover-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-focus-ring)]"
          aria-label="Reset to defaults"
        >
          <RotateCcw size={12} />
          Reset
        </button>
      </footer>
    </div>
  );
}

function SegmentRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<{ id: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex items-center justify-center gap-0.5 rounded-md border border-border-default bg-state-hover p-0.5"
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.id)}
            className={`flex h-7 flex-1 items-center justify-center rounded-sm text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-focus-ring)] ${
              active
                ? 'bg-state-selected text-slate-12'
                : 'text-slate-10 hover:bg-state-hover-strong hover:text-slate-12'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function GroupAccordion({
  label,
  Icon,
  open,
  onToggle,
  headerSuffix,
  children,
}: {
  label: string;
  Icon: IconComponent;
  open: boolean;
  onToggle: () => void;
  headerSuffix?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-border-subtle bg-surface-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-11 transition-colors hover:bg-state-hover hover:text-slate-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-focus-ring)]"
      >
        <span className="flex items-center gap-1.5">
          <Icon size={12} className="text-slate-10" />
          {label}
          {headerSuffix && (
            <span className="ml-1 rounded-sm bg-state-hover px-1.5 py-px text-[9px] font-normal normal-case tracking-normal text-slate-10">
              {headerSuffix}
            </span>
          )}
        </span>
        <ChevronDown
          size={12}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="space-y-2 border-t border-border-subtle px-2 py-2">{children}</div>}
    </section>
  );
}

interface RowsProps {
  settings: MapSettings;
  patch: (patch: MapSettingsPatch) => void;
}

function TerrainRows({ settings, patch }: RowsProps) {
  return (
    <Fragment>
      <ToggleRow
        label="World terrain"
        checked={settings.terrain.enabled}
        onChange={(enabled) => patch({ terrain: { enabled } })}
      />
      <SliderRow
        knobKey="terrain.exaggeration"
        label="Exaggeration"
        value={settings.terrain.exaggeration}
        onChange={(exaggeration) => patch({ terrain: { exaggeration } })}
      />
      <SliderRow
        knobKey="terrain.relativeHeight"
        label="Relative height"
        value={settings.terrain.relativeHeight}
        onChange={(relativeHeight) => patch({ terrain: { relativeHeight } })}
      />
      <SliderRow
        knobKey="terrain.maxScreenSpaceError"
        label="Max screen-space error"
        value={settings.terrain.maxScreenSpaceError}
        onChange={(maxScreenSpaceError) => patch({ terrain: { maxScreenSpaceError } })}
      />
    </Fragment>
  );
}

function SkyRows({ settings, patch }: RowsProps) {
  return (
    <Fragment>
      <ToggleRow
        label="Sky atmosphere"
        checked={settings.sky.atmosphere}
        onChange={(atmosphere) => patch({ sky: { atmosphere } })}
      />
      <ToggleRow
        label="Ground atmosphere"
        checked={settings.sky.groundAtmosphere}
        onChange={(groundAtmosphere) => patch({ sky: { groundAtmosphere } })}
      />
      <SliderRow
        knobKey="sky.lightIntensity"
        label="Light intensity"
        value={settings.sky.lightIntensity}
        onChange={(lightIntensity) => patch({ sky: { lightIntensity } })}
      />
      <SliderRow
        knobKey="sky.hueShift"
        label="Hue shift"
        value={settings.sky.hueShift}
        onChange={(hueShift) => patch({ sky: { hueShift } })}
      />
      <SliderRow
        knobKey="sky.saturationShift"
        label="Saturation shift"
        value={settings.sky.saturationShift}
        onChange={(saturationShift) => patch({ sky: { saturationShift } })}
      />
      <SliderRow
        knobKey="sky.brightnessShift"
        label="Brightness shift"
        value={settings.sky.brightnessShift}
        onChange={(brightnessShift) => patch({ sky: { brightnessShift } })}
      />
      <ToggleRow
        label="Sun"
        checked={settings.sky.sun}
        onChange={(sun) => patch({ sky: { sun } })}
      />
      <ToggleRow
        label="Moon"
        checked={settings.sky.moon}
        onChange={(moon) => patch({ sky: { moon } })}
      />
    </Fragment>
  );
}

function FogRows({ settings, patch }: RowsProps) {
  return (
    <Fragment>
      <ToggleRow
        label="Fog"
        checked={settings.fog.enabled}
        onChange={(enabled) => patch({ fog: { enabled } })}
      />
      <SliderRow
        knobKey="fog.density"
        label="Density"
        value={settings.fog.density}
        onChange={(density) => patch({ fog: { density } })}
      />
      <SliderRow
        knobKey="fog.minimumBrightness"
        label="Min brightness"
        value={settings.fog.minimumBrightness}
        onChange={(minimumBrightness) => patch({ fog: { minimumBrightness } })}
      />
    </Fragment>
  );
}

function LightingRows({ settings, patch }: RowsProps) {
  return (
    <Fragment>
      <ToggleRow
        label="Globe lighting"
        checked={settings.lighting.globeLighting}
        onChange={(globeLighting) => patch({ lighting: { globeLighting } })}
      />
      <ToggleRow
        label="Dynamic atmosphere"
        checked={settings.lighting.dynamicAtmosphereLighting}
        onChange={(dynamicAtmosphereLighting) =>
          patch({ lighting: { dynamicAtmosphereLighting } })
        }
      />
      <ToggleRow
        label="Shadows"
        checked={settings.lighting.shadows}
        onChange={(shadows) => patch({ lighting: { shadows } })}
      />
      <ToggleRow
        label="Soft shadows"
        checked={settings.lighting.softShadows}
        onChange={(softShadows) => patch({ lighting: { softShadows } })}
      />
      <SliderRow
        knobKey="lighting.shadowDarkness"
        label="Shadow darkness"
        value={settings.lighting.shadowDarkness}
        onChange={(shadowDarkness) => patch({ lighting: { shadowDarkness } })}
      />
    </Fragment>
  );
}

function ImageryRows({ settings, patch }: RowsProps) {
  const slice = settings.imagery[settings.mapStyle];
  return (
    <Fragment>
      <SliderRow
        knobKey="imagery.brightness"
        label="Brightness"
        value={slice.brightness}
        onChange={(brightness) => patch({ imagery: { brightness } })}
      />
      <SliderRow
        knobKey="imagery.contrast"
        label="Contrast"
        value={slice.contrast}
        onChange={(contrast) => patch({ imagery: { contrast } })}
      />
      <SliderRow
        knobKey="imagery.saturation"
        label="Saturation"
        value={slice.saturation}
        onChange={(saturation) => patch({ imagery: { saturation } })}
      />
      <SliderRow
        knobKey="imagery.gamma"
        label="Gamma"
        value={slice.gamma}
        onChange={(gamma) => patch({ imagery: { gamma } })}
      />
      <SliderRow
        knobKey="imagery.hue"
        label="Hue (rad)"
        value={slice.hue}
        onChange={(hue) => patch({ imagery: { hue } })}
      />
      <ColorRow
        label="Globe base color"
        value={slice.globeBaseColor}
        onChange={(globeBaseColor) => patch({ imagery: { globeBaseColor } })}
      />
    </Fragment>
  );
}

function CameraRows({ settings, patch }: RowsProps) {
  return (
    <Fragment>
      <SliderRow
        knobKey="camera.targetFps"
        label="Target FPS"
        value={settings.camera.targetFps}
        onChange={(targetFps) => patch({ camera: { targetFps } })}
      />
      <SliderRow
        knobKey="camera.resolutionScale"
        label="Resolution scale"
        value={settings.camera.resolutionScale}
        onChange={(resolutionScale) => patch({ camera: { resolutionScale } })}
      />
      <SliderRow
        knobKey="camera.inertiaSpin"
        label="Inertia (spin)"
        value={settings.camera.inertiaSpin}
        onChange={(inertiaSpin) => patch({ camera: { inertiaSpin } })}
      />
      <SliderRow
        knobKey="camera.inertiaTranslate"
        label="Inertia (translate)"
        value={settings.camera.inertiaTranslate}
        onChange={(inertiaTranslate) => patch({ camera: { inertiaTranslate } })}
      />
      <SliderRow
        knobKey="camera.inertiaZoom"
        label="Inertia (zoom)"
        value={settings.camera.inertiaZoom}
        onChange={(inertiaZoom) => patch({ camera: { inertiaZoom } })}
      />
      <ToggleRow
        label="Request-render mode"
        checked={settings.camera.requestRenderMode}
        onChange={(requestRenderMode) => patch({ camera: { requestRenderMode } })}
      />
    </Fragment>
  );
}

function SpaceRows({ settings, patch }: RowsProps) {
  return (
    <Fragment>
      <ColorRow
        label="Background color"
        value={settings.space.backgroundColor}
        onChange={(backgroundColor) => patch({ space: { backgroundColor } })}
      />
    </Fragment>
  );
}

function SliderRow({
  knobKey,
  label,
  value,
  onChange,
}: {
  knobKey: KnobKey;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const range = KNOB_RANGES[knobKey];
  const log = range.log === true;
  const min = range.min;
  const max = range.max;
  const decimals = range.decimals ?? 2;
  const unit = range.unit ?? '';

  const sliderMin = log ? Math.log10(min) : min;
  const sliderMax = log ? Math.log10(max) : max;
  const sliderStep = log ? 0.01 : range.step;
  const sliderValue = log ? Math.log10(Math.max(value, Number.EPSILON)) : value;

  const handleSlider = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    const next = log ? Math.pow(10, raw) : raw;
    onChange(next);
  };

  return (
    <div className="flex items-center gap-2">
      <label className="flex-1 text-[11px] text-slate-10">{label}</label>
      <input
        type="range"
        min={sliderMin}
        max={sliderMax}
        step={sliderStep}
        value={sliderValue}
        onChange={handleSlider}
        className="h-1 w-[120px] cursor-pointer appearance-none rounded-full bg-state-hover-strong accent-slate-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-focus-ring)]"
      />
      <span className="w-14 shrink-0 text-end font-mono text-[10px] tabular-nums text-slate-11">
        {formatValueForDisplay(value, decimals, unit, log)}
      </span>
    </div>
  );
}

function formatValueForDisplay(value: number, decimals: number, unit: string, log: boolean): string {
  if (log && (Math.abs(value) < 1e-3 || Math.abs(value) >= 1e3)) {
    return value.toExponential(1) + unit;
  }
  return value.toFixed(decimals) + (unit ? unit : '');
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 py-0.5 text-[11px] text-slate-10 hover:text-slate-12">
      <span>{label}</span>
      <span
        className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-accent-info' : 'bg-state-hover-strong'
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-surface-1 shadow transition-transform ${
            checked ? 'translate-x-3.5' : 'translate-x-0.5'
          }`}
        />
      </span>
    </label>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputId = useId();
  const normalized = normalizeHex(value);
  return (
    <div className="flex items-center justify-between gap-2 py-0.5 text-[11px] text-slate-10">
      <label htmlFor={inputId}>{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          id={inputId}
          type="color"
          value={normalized}
          onChange={(e) => onChange(e.target.value)}
          className="h-5 w-7 cursor-pointer rounded border border-border-default bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-focus-ring)]"
        />
        <span className="font-mono text-[10px] tabular-nums text-slate-11">{normalized}</span>
      </div>
    </div>
  );
}

function normalizeHex(value: string): string {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return (
      '#' +
      trimmed
        .slice(1)
        .split('')
        .map((c) => c + c)
        .join('')
        .toLowerCase()
    );
  }
  return '#000000';
}

function PresetsRow({
  factoryPresets,
  userPresets,
  activeId,
  onSave,
  onSelect,
  onDelete,
}: {
  factoryPresets: ReadonlyArray<MapPreset>;
  userPresets: ReadonlyArray<MapPreset>;
  activeId: string | null;
  onSave: (label: string) => MapPreset | null;
  onSelect: (preset: MapPreset) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleStart = () => {
    setEditing(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleCommit = () => {
    const trimmed = draft.trim();
    setEditing(false);
    setDraft('');
    if (!trimmed) return;
    onSave(trimmed);
  };

  const handleKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditing(false);
      setDraft('');
    }
  };

  return (
    <section className="mt-3 rounded-md border border-border-subtle bg-surface-3 p-2">
      {factoryPresets.length > 0 && (
        <div className="mb-2">
          <header className="mb-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-10">
              Built-in
            </span>
          </header>
          <ul className="flex flex-wrap gap-1">
            {factoryPresets.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelect(p)}
                  className={`flex h-6 items-center gap-1 rounded-md border px-1.5 text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-focus-ring)] ${
                    activeId === p.id
                      ? 'border-border-default bg-state-selected text-slate-12'
                      : 'border-border-subtle bg-state-hover text-slate-11 hover:bg-state-hover-strong hover:text-slate-12'
                  }`}
                >
                  <Star size={10} className="text-slate-10" />
                  <span className="max-w-[110px] truncate">{p.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <header className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-10">
          My presets
        </span>
        {!editing ? (
          <button
            type="button"
            onClick={handleStart}
            className="grid h-5 w-5 place-items-center rounded text-slate-10 transition-colors hover:bg-state-hover hover:text-slate-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-focus-ring)]"
            aria-label="Save current settings as preset"
          >
            <Plus size={12} />
          </button>
        ) : (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={handleKey}
            placeholder="Preset name"
            maxLength={32}
            className="h-5 w-[140px] rounded bg-state-hover px-1.5 text-[10px] text-slate-12 placeholder:text-slate-9 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-focus-ring)]"
          />
        )}
      </header>
      {userPresets.length === 0 ? (
        <p className="text-[10px] text-slate-9">No presets saved yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-1">
          {userPresets.map((p) => (
            <li key={p.id} className="flex">
              <button
                type="button"
                onClick={() => onSelect(p)}
                className={`flex h-6 items-center gap-1 rounded-l-md border px-1.5 text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-focus-ring)] ${
                  activeId === p.id
                    ? 'border-border-default bg-state-selected text-slate-12'
                    : 'border-border-subtle bg-state-hover text-slate-11 hover:bg-state-hover-strong hover:text-slate-12'
                }`}
              >
                <Activity size={10} className="text-slate-10" />
                <span className="max-w-[110px] truncate">{p.label}</span>
              </button>
              <button
                type="button"
                onClick={() => onDelete(p.id)}
                className="flex h-6 items-center justify-center rounded-r-md border border-l-0 border-border-subtle bg-state-hover px-1 text-slate-10 transition-colors hover:bg-accent-danger-tint hover:text-accent-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-focus-ring)]"
                aria-label={`Delete preset ${p.label}`}
              >
                <X size={10} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CodeBlockPreview({ code, diffLines }: { code: string; diffLines: string[] }) {
  return (
    <section className="mt-3 overflow-hidden rounded-md border border-border-subtle bg-surface-1">
      {diffLines.length > 0 && (
        <header className="border-b border-border-subtle px-2 py-1.5">
          <p className="text-[10px] uppercase tracking-wide text-slate-10">
            Diff from defaults · {diffLines.length}
          </p>
          <ul className="mt-1 space-y-0.5">
            {diffLines.slice(0, 8).map((line) => (
              <li key={line} className="truncate font-mono text-[10px] text-slate-11">
                {line}
              </li>
            ))}
            {diffLines.length > 8 && (
              <li className="font-mono text-[10px] text-slate-9">
                …{diffLines.length - 8} more
              </li>
            )}
          </ul>
        </header>
      )}
      <pre className="max-h-64 overflow-auto px-2 py-2 font-mono text-[10px] leading-snug text-slate-11 [scrollbar-width:thin]">
        {code}
      </pre>
    </section>
  );
}
