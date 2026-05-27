import type { AgentState } from '@/app/components/ui/orb';
import { Moon, RotateCcw, Sparkles, Sun } from '@/lib/icons/central';

export type VolumeMode = 'auto' | 'manual';
export type OrbColors = [string, string];
export type ShapePreset = 'circle' | 'ellipse' | 'blob' | 'free' | 'custom';
export type RadiusMode = 'round' | 'morph' | 'free';

export interface ShapeState {
  preset: ShapePreset;
  widthPx: number;
  heightPx: number;
  rotationDeg: number;
  skewXDeg: number;
  skewYDeg: number;
  radiusMode: RadiusMode;
  wobbleAmount: number;
  wobblePeriodSec: number;
}

interface OrbConfigPanelProps {
  agentState: AgentState;
  onAgentStateChange: (next: AgentState) => void;
  colors: OrbColors;
  onColorsChange: (next: OrbColors) => void;
  seed: number;
  onSeedChange: (next: number) => void;
  onRandomizeSeed: () => void;
  volumeMode: VolumeMode;
  onVolumeModeChange: (next: VolumeMode) => void;
  manualInput: number;
  onManualInputChange: (next: number) => void;
  manualOutput: number;
  onManualOutputChange: (next: number) => void;
  shape: ShapeState;
  onShapePreset: (preset: ShapePreset) => void;
  onShapeFieldChange: <K extends keyof ShapeState>(key: K, value: ShapeState[K]) => void;
  darkMode: boolean;
  onDarkModeChange: (next: boolean) => void;
  onReset: () => void;
}

const STATE_OPTIONS: { id: AgentState; label: string }[] = [
  { id: null, label: 'Idle' },
  { id: 'thinking', label: 'Thinking' },
  { id: 'listening', label: 'Listening' },
  { id: 'talking', label: 'Talking' },
];

// Orb shader gradient endpoints (Three.js Color uniforms — not CSS).
const COLOR_PRESETS: { id: string; label: string; colors: OrbColors }[] = [
  { id: 'sky', label: 'Sky', colors: ['#CADCFC', '#A0B9D1'] },
  { id: 'sand', label: 'Sand', colors: ['#F6E7D8', '#E0CFC2'] },
  { id: 'slate', label: 'Slate', colors: ['#E5E7EB', '#9CA3AF'] },
  { id: 'reef', label: 'Reef', colors: ['#FF6B6B', '#4ECDC4'] },
  { id: 'amber', label: 'Amber', colors: ['#FDE68A', '#F59E0B'] },
  { id: 'violet', label: 'Violet', colors: ['#C4B5FD', '#7C3AED'] },
];

const SHAPE_OPTIONS: { id: Exclude<ShapePreset, 'custom'>; label: string }[] = [
  { id: 'circle', label: 'Circle' },
  { id: 'ellipse', label: 'Ellipse' },
  { id: 'blob', label: 'Blob' },
  { id: 'free', label: 'Free' },
];

const WOBBLE_DEFAULT_AMOUNT = 0.55;

export function OrbConfigPanel(props: OrbConfigPanelProps) {
  const { shape } = props;
  const wobbleOn = shape.radiusMode === 'morph';

  return (
    <aside
      dir="ltr"
      role="region"
      aria-label="Orb config"
      className="pointer-events-auto fixed right-4 top-1/2 z-30 w-80 -translate-y-1/2 overflow-hidden rounded-2xl border border-border-default bg-surface-3/95 text-slate-12 shadow-[var(--shadow-6)] backdrop-blur"
    >
      <header className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <div className="flex flex-col">
          <span className="text-[13px] font-medium text-slate-12">Orb config</span>
          <span className="font-mono text-[10px] text-slate-9">/orb-sandbox</span>
        </div>
        <button
          type="button"
          onClick={props.onReset}
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border-default bg-surface-2 px-2 text-[11px] text-slate-11 transition-colors hover:bg-state-hover-strong hover:text-slate-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
          aria-label="Reset to defaults"
        >
          <RotateCcw className="size-3.5" />
          Reset
        </button>
      </header>

      <div className="flex max-h-[78vh] flex-col gap-4 overflow-y-auto px-4 py-4">
        <Section title="State">
          <div className="grid grid-cols-4 gap-1 rounded-md bg-surface-2 p-1">
            {STATE_OPTIONS.map((opt) => {
              const active = opt.id === props.agentState;
              return (
                <button
                  key={String(opt.id ?? 'idle')}
                  type="button"
                  onClick={() => props.onAgentStateChange(opt.id)}
                  aria-pressed={active}
                  className={`rounded-[5px] px-2 py-1.5 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong ${
                    active
                      ? 'bg-accent-info text-surface-1'
                      : 'text-slate-11 hover:bg-state-hover hover:text-slate-12'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Colors">
          <div className="flex items-center gap-2">
            <ColorField
              label="Dark"
              value={props.colors[0]}
              onChange={(v) => props.onColorsChange([v, props.colors[1]])}
            />
            <ColorField
              label="Light"
              value={props.colors[1]}
              onChange={(v) => props.onColorsChange([props.colors[0], v])}
            />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {COLOR_PRESETS.map((preset) => {
              const active =
                preset.colors[0].toLowerCase() === props.colors[0].toLowerCase() &&
                preset.colors[1].toLowerCase() === props.colors[1].toLowerCase();
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => props.onColorsChange(preset.colors)}
                  aria-pressed={active}
                  title={preset.label}
                  className={`group flex h-9 items-center gap-1.5 rounded-md border px-1.5 text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong ${
                    active
                      ? 'border-border-strong bg-state-selected text-slate-12'
                      : 'border-border-default bg-surface-2 text-slate-11 hover:bg-state-hover-strong'
                  }`}
                >
                  <span
                    aria-hidden
                    className="inline-flex size-5 shrink-0 rounded-full border border-border-default"
                    style={{
                      background: `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]})`,
                    }}
                  />
                  <span className="truncate">{preset.label}</span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Animation">
          <div className="flex items-center gap-2">
            <label className="flex flex-1 items-center gap-2 text-[11px] text-slate-10">
              <span className="w-12 shrink-0">Seed</span>
              <input
                type="number"
                value={props.seed}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) props.onSeedChange(Math.floor(n));
                }}
                className="h-8 flex-1 rounded-md border border-border-default bg-surface-2 px-2 text-[12px] text-slate-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
              />
            </label>
            <button
              type="button"
              onClick={props.onRandomizeSeed}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-default bg-surface-2 px-2 text-[11px] text-slate-11 transition-colors hover:bg-state-hover-strong hover:text-slate-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
              aria-label="Randomize seed"
            >
              <Sparkles className="size-3.5" />
              Random
            </button>
          </div>
        </Section>

        <Section title="Volume">
          <div className="grid grid-cols-2 gap-1 rounded-md bg-surface-2 p-1">
            {(['auto', 'manual'] as const).map((mode) => {
              const active = mode === props.volumeMode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => props.onVolumeModeChange(mode)}
                  aria-pressed={active}
                  className={`rounded-[5px] px-2 py-1.5 text-[11px] capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong ${
                    active
                      ? 'bg-accent-info text-surface-1'
                      : 'text-slate-11 hover:bg-state-hover hover:text-slate-12'
                  }`}
                >
                  {mode}
                </button>
              );
            })}
          </div>
          <SliderField
            label="Input"
            value={props.manualInput}
            min={0}
            max={1}
            step={0.01}
            disabled={props.volumeMode !== 'manual'}
            onChange={props.onManualInputChange}
          />
          <SliderField
            label="Output"
            value={props.manualOutput}
            min={0}
            max={1}
            step={0.01}
            disabled={props.volumeMode !== 'manual'}
            onChange={props.onManualOutputChange}
          />
        </Section>

        <Section title="Shape">
          <div className="grid grid-cols-4 gap-1 rounded-md bg-surface-2 p-1">
            {SHAPE_OPTIONS.map((opt) => {
              const active = opt.id === shape.preset;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => props.onShapePreset(opt.id)}
                  aria-pressed={active}
                  className={`rounded-[5px] px-2 py-1.5 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong ${
                    active
                      ? 'bg-accent-info text-surface-1'
                      : 'text-slate-11 hover:bg-state-hover hover:text-slate-12'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {shape.preset === 'custom' && (
            <span className="text-[10px] text-slate-9">Custom — knobs overridden</span>
          )}
          <SliderField
            label="Width"
            value={shape.widthPx}
            min={160}
            max={640}
            step={4}
            suffix="px"
            onChange={(v) => props.onShapeFieldChange('widthPx', v)}
          />
          <SliderField
            label="Height"
            value={shape.heightPx}
            min={160}
            max={640}
            step={4}
            suffix="px"
            onChange={(v) => props.onShapeFieldChange('heightPx', v)}
          />
          <SliderField
            label="Rotation"
            value={shape.rotationDeg}
            min={-180}
            max={180}
            step={1}
            suffix="°"
            onChange={(v) => props.onShapeFieldChange('rotationDeg', v)}
          />
          <SliderField
            label="Skew X"
            value={shape.skewXDeg}
            min={-30}
            max={30}
            step={1}
            suffix="°"
            onChange={(v) => props.onShapeFieldChange('skewXDeg', v)}
          />
          <SliderField
            label="Skew Y"
            value={shape.skewYDeg}
            min={-30}
            max={30}
            step={1}
            suffix="°"
            onChange={(v) => props.onShapeFieldChange('skewYDeg', v)}
          />

          <div className="mt-1 flex items-center justify-between rounded-md border border-border-default bg-surface-2 px-2 py-1.5">
            <span className="text-[11px] text-slate-10">Wobble</span>
            <button
              type="button"
              role="switch"
              aria-checked={wobbleOn}
              onClick={() => {
                if (wobbleOn) {
                  props.onShapeFieldChange('radiusMode', 'round');
                  props.onShapeFieldChange('wobbleAmount', 0);
                } else {
                  props.onShapeFieldChange('radiusMode', 'morph');
                  if (shape.wobbleAmount === 0) {
                    props.onShapeFieldChange('wobbleAmount', WOBBLE_DEFAULT_AMOUNT);
                  }
                }
              }}
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong ${
                wobbleOn ? 'bg-accent-info' : 'bg-state-hover-strong'
              }`}
            >
              <span
                aria-hidden
                className={`inline-block size-3 rounded-full bg-surface-1 transition-transform ${
                  wobbleOn ? 'translate-x-3.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          <SliderField
            label="Amount"
            value={shape.wobbleAmount}
            min={0}
            max={1}
            step={0.05}
            disabled={!wobbleOn}
            onChange={(v) => props.onShapeFieldChange('wobbleAmount', v)}
          />
          <SliderField
            label="Period"
            value={shape.wobblePeriodSec}
            min={2}
            max={15}
            step={1}
            suffix="s"
            disabled={!wobbleOn}
            onChange={(v) => props.onShapeFieldChange('wobblePeriodSec', v)}
          />
        </Section>

        <Section title="Theme">
          <div className="grid grid-cols-2 gap-1 rounded-md bg-surface-2 p-1">
            {(
              [
                { id: false, label: 'Light', Icon: Sun },
                { id: true, label: 'Dark', Icon: Moon },
              ] as const
            ).map((opt) => {
              const active = opt.id === props.darkMode;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => props.onDarkModeChange(opt.id)}
                  aria-pressed={active}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-[5px] px-2 py-1.5 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong ${
                    active
                      ? 'bg-accent-info text-surface-1'
                      : 'text-slate-11 hover:bg-state-hover hover:text-slate-12'
                  }`}
                >
                  <opt.Icon className="size-3.5" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Section>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-9">
        {title}
      </h3>
      {children}
    </section>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="flex flex-1 items-center gap-2 rounded-md border border-border-default bg-surface-2 px-2 py-1.5">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="size-7 cursor-pointer rounded-md border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0"
        aria-label={`${label} color`}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[10px] uppercase tracking-wider text-slate-9">{label}</span>
        <span className="truncate font-mono text-[11px] text-slate-11">{value.toUpperCase()}</span>
      </div>
    </label>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  disabled,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  suffix?: string;
  onChange: (next: number) => void;
}) {
  const display = step < 1 ? value.toFixed(2) : Math.round(value).toString();
  return (
    <div className={`flex flex-col gap-1 ${disabled ? 'opacity-40' : ''}`}>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-10">{label}</span>
        <span className="font-mono text-slate-11">
          {display}
          {suffix ?? ''}
        </span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-state-hover-strong accent-accent-info disabled:cursor-not-allowed"
        aria-label={label}
      />
    </div>
  );
}
