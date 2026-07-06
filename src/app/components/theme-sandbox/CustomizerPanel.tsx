import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, ChevronsRight, RotateCcw } from 'lucide-react';
import {
  ACCENT_SWATCHES,
  BG_HUE_PRESETS,
  hexToOkLch,
  okStr,
  okToHex,
  parseOklchString,
  parseTweakcnCss,
  PRODUCTION_DEFAULT,
  type OkLch,
  type ThemeConfig,
} from './tokens';

/**
 * Customizer panel — the "pick a color" surface:
 *
 *   - Background section: neutral ramp hue / chroma / lightness sliders.
 *   - Color section: single accent driving both `--primary-color` and
 *     `--secondary-color`. Four canonical swatches (Cyan / Orange /
 *     Blue / Green), OKLCH sliders whose tracks paint live gradients,
 *     and a manual hex input for operators pasting a design's exact swatch.
 *   - Import palette: paste a tweakcn / shadcn theme CSS block; the
 *     matching-mode block is layered over the sandbox tokens so the
 *     whole platform reskins to the imported palette while Color
 *     section picks keep overriding the accent.
 *
 * Built on native inputs + local tiles rather than the shadcn primitives
 * because those primitives hardcode colors that wouldn't respond to the
 * tokens the customizer is actively writing.
 */
export function CustomizerPanel({
  config,
  onChange,
  onReset,
  onCollapse,
  paletteOverride,
  onApplyPalette,
  onClearPalette,
}: {
  config: ThemeConfig;
  onChange: (next: ThemeConfig) => void;
  onReset: () => void;
  /**
   * Optional collapse callback. When provided, a chevron button appears in
   * the header so the operator has an obvious in-panel way to hide the
   * customizer in addition to the seam tab on the panel's inline-start edge.
   */
  onCollapse?: () => void;
  /**
   * The imported tweakcn / shadcn palette layered over the sandbox tokens,
   * or `null` when no palette is applied. Drives the Import palette
   * section's "Applied" indicator and enables its Clear button.
   */
  paletteOverride?: Record<string, string> | null;
  /** Apply a parsed tweakcn palette; layered on top of `deriveTokens`. */
  onApplyPalette?: (parsed: Record<string, string>) => void;
  /** Drop the applied palette and return to the config-derived tokens. */
  onClearPalette?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 w-80 flex-shrink-0 flex-col overflow-hidden border-s border-border-default bg-surface-2">
      <header className="flex items-center gap-2 border-b border-border-subtle px-3 py-2.5">
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            className="flex size-6 items-center justify-center rounded border border-border-default bg-surface-3 text-slate-11 transition-colors hover:border-border-strong hover:text-slate-12"
            title="Collapse customizer"
            aria-label="Collapse customizer"
          >
            <ChevronsRight size={12} />
          </button>
        )}
        <span className="flex-1 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-9">
          Customizer
        </span>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 rounded border border-border-default bg-surface-3 px-2 py-1 text-[10px] font-medium text-slate-11 transition-colors hover:border-border-strong hover:text-slate-12"
          title="Reset to production defaults"
        >
          <RotateCcw size={11} />
          Reset
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
        <BackgroundSection config={config} onChange={onChange} />
        <ColorSection
          title="Color"
          hint="Buttons, focus rings, active states, badges, historical accents — the single accent driving the whole platform."
          color={config.primary}
          onColorChange={(next) =>
            onChange({ ...config, primary: next, secondary: next })
          }
        />
        {onApplyPalette && onClearPalette && (
          <ImportPaletteSection
            mode={config.mode}
            active={paletteOverride != null}
            onApply={(parsed) => {
              const primary = parseOklchString(parsed['--primary'] ?? '');
              const secondary = parseOklchString(parsed['--secondary'] ?? '');
              if (primary || secondary) {
                // Sync the Color section's active swatch/sliders/hex to
                // the imported accent so the UI reflects what's live.
                // If only one of the two parses, still sync both to the
                // one that did (keeps primary === secondary).
                const nextPrimary = primary ?? secondary ?? config.primary;
                const nextSecondary = secondary ?? primary ?? config.secondary;
                onChange({
                  ...config,
                  primary: nextPrimary,
                  secondary: nextSecondary,
                });
              }
              onApplyPalette(parsed);
            }}
            onClear={onClearPalette}
          />
        )}
      </div>
    </div>
  );
}

function sameColor(a: OkLch, b: OkLch): boolean {
  return (
    Math.abs(a.l - b.l) < 0.005 &&
    Math.abs(a.c - b.c) < 0.005 &&
    Math.abs(a.h - b.h) < 0.5
  );
}

// ── Background section ────────────────────────────────────────────────────

function BackgroundSection({
  config,
  onChange,
}: {
  config: ThemeConfig;
  onChange: (next: ThemeConfig) => void;
}) {
  const rampC = 0.03 * config.bgChroma;
  const hueTrack = hueGradient(config.mode === 'dark' ? 0.35 : 0.85, Math.max(rampC, 0.02));
  const chromaTrack = `linear-gradient(to right in oklch, ${okStr({ l: 0.5, c: 0, h: config.bgHue })}, ${okStr({ l: 0.5, c: 0.09, h: config.bgHue })})`;

  return (
    <section className="flex flex-col gap-2 rounded border border-border-subtle bg-surface-3 p-3">
      <SectionHeader
        title="Background"
        hint="Neutral ramp — the substrate under every surface."
        swatch={
          <div className="grid size-6 grid-cols-2 grid-rows-2 gap-px overflow-hidden rounded">
            <span className="bg-surface-1" />
            <span className="bg-surface-3" />
            <span className="bg-surface-5" />
            <span className="bg-surface-8" />
          </div>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {BG_HUE_PRESETS.map((p) => {
          const active = config.bgHue === p.hue;
          return (
            <button
              key={p.hue}
              type="button"
              onClick={() => onChange({ ...config, bgHue: p.hue })}
              className={
                'flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] font-medium transition-colors ' +
                (active
                  ? 'border-primary bg-primary-tint text-slate-12'
                  : 'border-border-subtle bg-surface-2 text-slate-11 hover:border-border-strong hover:text-slate-12')
              }
              title={`Hue ${p.hue}°`}
            >
              <span
                className="size-3 rounded-full ring-1 ring-inset ring-border-default"
                style={{ background: okStr({ l: 0.5, c: 0.05, h: p.hue }) }}
              />
              {p.label}
            </button>
          );
        })}
      </div>

      <SliderRow
        label="Hue"
        value={config.bgHue}
        min={0}
        max={360}
        step={1}
        onChange={(v) => onChange({ ...config, bgHue: v })}
        format={(v) => `${v.toFixed(0)}°`}
        track={hueTrack}
      />
      <SliderRow
        label="Chroma"
        value={config.bgChroma}
        min={0}
        max={3}
        step={0.05}
        onChange={(v) => onChange({ ...config, bgChroma: v })}
        format={(v) => `${(v * 100).toFixed(0)}%`}
        track={chromaTrack}
      />
      <SliderRow
        label="Lightness"
        value={config.bgLightnessOffset}
        min={-0.05}
        max={0.05}
        step={0.005}
        onChange={(v) => onChange({ ...config, bgLightnessOffset: v })}
        format={(v) => (v >= 0 ? `+${v.toFixed(3)}` : v.toFixed(3))}
      />
    </section>
  );
}

// ── Color section (primary / secondary) ───────────────────────────────────

function ColorSection({
  title,
  hint,
  color,
  onColorChange,
}: {
  title: string;
  hint: string;
  color: OkLch;
  onColorChange: (next: OkLch) => void;
}) {
  const lightnessTrack = `linear-gradient(to right in oklch, ${okStr({ ...color, l: 0.15 })}, ${okStr({ ...color, l: 0.95 })})`;
  const chromaTrack = `linear-gradient(to right in oklch, ${okStr({ ...color, c: 0 })}, ${okStr({ ...color, c: 0.4 })})`;
  const hueTrack = hueGradient(color.l, color.c);

  return (
    <section className="flex flex-col gap-2 rounded border border-border-subtle bg-surface-3 p-3">
      <SectionHeader
        title={title}
        hint={hint}
        swatch={
          <span
            className="size-6 rounded ring-1 ring-inset ring-border-strong"
            style={{ background: okStr(color) }}
          />
        }
      />

      <div className="grid grid-cols-6 gap-1.5">
        {ACCENT_SWATCHES.map((s, i) => {
          const active = sameColor(s.color, color);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onColorChange(s.color)}
              className={
                'flex aspect-square items-center justify-center rounded transition-transform hover:scale-105 ' +
                (active
                  ? 'ring-2 ring-slate-12 ring-offset-2 ring-offset-surface-3'
                  : 'ring-1 ring-inset ring-border-default')
              }
              title={s.label}
              style={{ background: okStr(s.color) }}
            >
              <span className="sr-only">{s.label}</span>
            </button>
          );
        })}
      </div>

      <SliderRow
        label="Lightness"
        value={color.l}
        min={0.15}
        max={0.95}
        step={0.005}
        onChange={(v) => onColorChange({ ...color, l: v })}
        format={(v) => v.toFixed(3)}
        track={lightnessTrack}
      />
      <SliderRow
        label="Chroma"
        value={color.c}
        min={0}
        max={0.4}
        step={0.005}
        onChange={(v) => onColorChange({ ...color, c: v })}
        format={(v) => v.toFixed(3)}
        track={chromaTrack}
      />
      <SliderRow
        label="Hue"
        value={color.h}
        min={0}
        max={360}
        step={1}
        onChange={(v) => onColorChange({ ...color, h: v })}
        format={(v) => `${v.toFixed(0)}°`}
        track={hueTrack}
      />

      <HexInput color={color} onColorChange={onColorChange} />
    </section>
  );
}

/**
 * Manual hex entry — commit-on-blur / Enter. Keeps its own local buffer so
 * the operator can type freely without every intermediate keystroke
 * being parsed (and rejected). Blur / Enter parses; a valid parse fires
 * `onColorChange`, an invalid one snaps the buffer back to the current
 * color's hex so the field never lies about the applied value.
 */
function HexInput({
  color,
  onColorChange,
}: {
  color: OkLch;
  onColorChange: (next: OkLch) => void;
}) {
  const currentHex = okToHex(color).toUpperCase();
  const [draft, setDraft] = useState(currentHex);
  const [invalid, setInvalid] = useState(false);

  // Keep the visible hex in sync when the color changes from any other
  // input (swatch, sliders, presets, Reset). Only overwrite when the
  // field isn't being actively edited (draft matches the previous hex
  // or has the same normalized value), so an in-progress edit isn't
  // clobbered by a swatch update triggered by something else.
  useEffect(() => {
    setDraft((prev) => {
      const normalized = prev.trim().replace(/^#/, '').toUpperCase();
      const canonical = currentHex.replace(/^#/, '');
      return normalized === canonical ? prev : currentHex;
    });
    setInvalid(false);
  }, [currentHex]);

  const commit = () => {
    const parsed = hexToOkLch(draft);
    if (parsed) {
      setInvalid(false);
      onColorChange(parsed);
      setDraft(okToHex(parsed).toUpperCase());
    } else {
      setInvalid(true);
      setDraft(currentHex);
    }
  };

  return (
    <label className="flex items-center justify-between gap-2 pt-1">
      <span className="text-[10px] uppercase tracking-[0.14em] text-slate-10">
        Hex
      </span>
      <input
        type="text"
        value={draft}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => {
          setDraft(e.target.value);
          if (invalid) setInvalid(false);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setDraft(currentHex);
            setInvalid(false);
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        placeholder="#RRGGBB"
        aria-label="Hex color"
        aria-invalid={invalid || undefined}
        className={
          'w-28 rounded border bg-surface-2 px-2 py-1 text-right font-mono text-[11px] uppercase tracking-wider text-slate-12 outline-none transition-colors ' +
          (invalid
            ? 'border-accent-danger focus:border-accent-danger'
            : 'border-border-subtle focus:border-primary')
        }
      />
    </label>
  );
}

function hueGradient(l: number, c: number): string {
  // Stops every 60° so default (shorter-arc) hue interpolation between
  // adjacent stops walks the wheel in order.
  const stops = [0, 60, 120, 180, 240, 300, 360]
    .map((h) => okStr({ l, c, h }))
    .join(', ');
  return `linear-gradient(to right in oklch, ${stops})`;
}

// ── Import palette (tweakcn / shadcn CSS paste) ───────────────────────────

type ImportStatus =
  | { kind: 'idle' }
  | { kind: 'ok'; count: number }
  | { kind: 'error'; message: string };

/**
 * Collapsible section that lets the operator paste a tweakcn / shadcn
 * theme CSS block (`:root { ... }` + `.dark { ... }`), parse it, and
 * apply the matching-mode block over the sandbox tokens. Clear drops
 * the imported layer and returns to the config-derived tokens.
 *
 * The status readout tells the operator what happened on the last
 * Apply (`Applied — 32 tokens` in success, red error message when the
 * paste didn't contain a usable block).
 */
function ImportPaletteSection({
  mode,
  active,
  onApply,
  onClear,
}: {
  mode: ThemeConfig['mode'];
  active: boolean;
  onApply: (parsed: Record<string, string>) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<ImportStatus>({ kind: 'idle' });

  const handleApply = () => {
    if (!text.trim()) {
      setStatus({
        kind: 'error',
        message: 'Paste a CSS block first.',
      });
      return;
    }
    const parsed = parseTweakcnCss(text, mode);
    if (!parsed) {
      setStatus({
        kind: 'error',
        message:
          "Couldn't find a :root or .dark block with usable color tokens.",
      });
      return;
    }
    onApply(parsed);
    setStatus({ kind: 'ok', count: Object.keys(parsed).length });
  };

  const handleClear = () => {
    onClear();
    setStatus({ kind: 'idle' });
  };

  return (
    <section className="flex flex-col gap-2 rounded border border-border-subtle bg-surface-3 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-2 text-start"
        aria-expanded={open}
      >
        <div className="flex items-center gap-1.5">
          {open ? (
            <ChevronDown size={12} className="text-slate-10" />
          ) : (
            <ChevronRight size={12} className="text-slate-10" />
          )}
          <span className="text-[13px] font-semibold text-slate-12">
            Import palette
          </span>
        </div>
        {active && (
          <span className="rounded-full bg-primary-tint px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-12">
            Applied
          </span>
        )}
      </button>

      {open && (
        <>
          <p className="text-[11px] text-slate-10">
            Paste a tweakcn / shadcn theme CSS block. Font, radius, shadow
            and tracking values are ignored — only colors are layered over
            the platform. The block matching the current mode ({mode}) is
            used.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            placeholder={`:root {\n  --background: oklch(...);\n  --primary: oklch(...);\n  ...\n}\n\n.dark {\n  --background: oklch(...);\n  ...\n}`}
            className="min-h-[10rem] w-full resize-y rounded border border-border-subtle bg-surface-2 p-2 font-mono text-[10px] leading-relaxed text-slate-11 outline-none focus:border-primary"
          />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 rounded border border-border-default bg-surface-4 px-2 py-1 text-[11px] font-medium text-slate-12 transition-colors hover:border-border-strong"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={!active}
              className="rounded border border-border-default bg-surface-3 px-2 py-1 text-[11px] font-medium text-slate-11 transition-colors hover:border-border-strong hover:text-slate-12 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear
            </button>
          </div>
          {status.kind === 'ok' && (
            <div className="rounded bg-accent-success-tint px-2 py-1 text-[10px] text-accent-success">
              Applied — {status.count} tokens layered over the platform.
            </div>
          )}
          {status.kind === 'error' && (
            <div className="rounded bg-accent-danger-tint px-2 py-1 text-[10px] text-accent-danger">
              {status.message}
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ── Reusable pieces ───────────────────────────────────────────────────────

function SectionHeader({
  title,
  hint,
  swatch,
}: {
  title: string;
  hint: string;
  swatch: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      {swatch}
      <div className="flex-1">
        <div className="text-[13px] font-semibold text-slate-12">{title}</div>
        <div className="text-[11px] text-slate-10">{hint}</div>
      </div>
    </div>
  );
}

/**
 * Native range input styled to sit inside the panel. Native so we don't
 * pull in a component whose colors would compete with the tokens the
 * customizer is actively writing. `track` paints a live gradient under
 * the thumb (hue rainbow / chroma ramp / lightness ramp). Forced LTR so
 * min stays on the left and the gradients read correctly under RTL.
 */
function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  track,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
  format: (v: number) => string;
  track?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="uppercase tracking-[0.14em] text-slate-10">{label}</span>
        <span className="font-mono text-slate-11">{format(value)}</span>
      </div>
      <input
        type="range"
        dir="ltr"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="theme-sandbox-slider h-4 w-full appearance-none bg-transparent"
        style={track ? ({ '--track-bg': track } as React.CSSProperties) : undefined}
      />
    </label>
  );
}

// PRODUCTION_DEFAULT re-export so ThemeSandbox.tsx doesn't need to import
// tokens.ts twice.
export { PRODUCTION_DEFAULT };
