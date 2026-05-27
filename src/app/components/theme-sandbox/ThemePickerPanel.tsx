/**
 * Arc-style floating picker. Three rows, top to bottom:
 *
 *   1. Mode segment (auto / light / dark)
 *   2. Hue dial + chroma stepper + active-preset label
 *   3. "My presets" row — operator-saved swatches + save chip
 *
 * A collapsible "Advanced" section reveals the slate bookend
 * sliders and the "Copy CSS" / "Reset" export controls.
 *
 * The panel itself paints with the sandbox's overridden tokens
 * (it sits inside the wrapper that scopes them), so changing the
 * theme also restyles the picker — a constant tactile loop.
 */

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";

import {
  ChevronDown,
  Check,
  Copy,
  Moon,
  Plus,
  RotateCcw,
  Sparkles,
  Sun,
  X,
} from "@/lib/icons/central";
import { HueDial } from "./HueDial";
import { SlateRampControls } from "./SlateRampControls";
import type {
  ThemeMode,
  UseThemeStateApi,
  UserPreset,
} from "./useThemeState";

const USER_PRESET_LABEL_MAX = 32;

interface ThemePickerPanelProps {
  api: UseThemeStateApi;
  cssBlock: string;
}

const MODE_OPTIONS: ReadonlyArray<{
  id: ThemeMode;
  label: string;
  Icon: typeof Sparkles;
}> = [
  { id: "auto", label: "Auto", Icon: Sparkles },
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
];

export function ThemePickerPanel({ api, cssBlock }: ThemePickerPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  const handleCopy = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    void navigator.clipboard.writeText(cssBlock).then(() => {
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1400);
    });
  };

  return (
    <div
      dir="ltr"
      className="theme-sandbox-picker pointer-events-auto fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-2xl border border-border-default bg-surface-5 p-3 text-slate-12 shadow-[var(--shadow-6)] backdrop-blur"
      style={{ width: 440 }}
      role="region"
      aria-label="Theme picker"
    >
      <ModeSegment value={api.state.mode} onChange={api.setMode} />

      <div className="mt-3 flex items-center gap-3">
        <HueDial
          hue={api.state.slateHue}
          onChange={api.setSlateHue}
          ariaLabel="Slate spine hue"
        />
        <div className="flex flex-col gap-2">
          <Stepper
            label="Chroma"
            value={api.state.slateChromaScale}
            digits={2}
            min={0}
            max={2}
            step={0.1}
            onChange={api.setSlateChromaScale}
          />
          <ActivePresetLabel
            presetId={api.state.presetId}
            hue={api.state.slateHue}
            userPresets={api.state.userPresets}
          />
        </div>
      </div>

      <MyPresetsRow
        userPresets={api.state.userPresets}
        activeId={api.state.presetId}
        onSave={api.saveCurrentAsPreset}
        onSelect={api.selectUserPreset}
        onDelete={api.deleteUserPreset}
      />

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="mt-3 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-10 hover:bg-state-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-focus-ring)]"
      >
        <span>Advanced</span>
        <ChevronDown
          size={12}
          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="mt-2 space-y-3 rounded-md bg-surface-3 p-2">
          <SlateRampControls
            chromaScale={api.state.slateChromaScale}
            darkL1={api.state.darkL1}
            darkL12={api.state.darkL12}
            lightAccentTune={api.state.lightAccentTune}
            effectiveMode={api.effectiveMode}
            onChromaScaleChange={api.setSlateChromaScale}
            onDarkL1Change={api.setDarkL1}
            onDarkL12Change={api.setDarkL12}
            onLightAccentTuneChange={api.setLightAccentTune}
          />

          <div className="flex items-center gap-2 border-t border-border-subtle pt-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md border border-border-default bg-state-hover px-2 text-[11px] font-medium text-slate-12 transition-colors hover:bg-state-hover-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-focus-ring)]"
            >
              <Copy size={12} />
              {copyState === "copied" ? "Copied" : "Copy CSS"}
            </button>
            <button
              type="button"
              onClick={api.reset}
              className="flex h-7 items-center justify-center gap-1.5 rounded-md border border-border-default bg-state-hover px-2 text-[11px] font-medium text-slate-12 transition-colors hover:bg-state-hover-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-focus-ring)]"
              aria-label="Reset theme"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ModeSegmentProps {
  value: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}

function ModeSegment({ value, onChange }: ModeSegmentProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Color scheme"
      className="flex items-center justify-center gap-0.5 rounded-md border border-border-default bg-state-hover p-0.5"
    >
      {MODE_OPTIONS.map((opt) => {
        const active = value === opt.id;
        const Icon = opt.Icon;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => onChange(opt.id)}
            className={`flex h-7 flex-1 items-center justify-center gap-1.5 rounded-sm text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-focus-ring)] ${
              active
                ? "bg-state-selected text-slate-12"
                : "text-slate-10 hover:bg-state-hover-strong hover:text-slate-12"
            }`}
          >
            <Icon size={14} />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

interface StepperProps {
  label: string;
  value: number;
  digits: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function Stepper({ label, value, digits, min, max, step, onChange }: StepperProps) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-border-default bg-state-hover px-1 py-0.5">
      <span className="px-1 text-[10px] uppercase tracking-wide text-slate-10">
        {label}
      </span>
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}
        disabled={value <= min}
        className="grid h-6 w-6 place-items-center rounded text-slate-11 transition-colors hover:bg-state-hover-strong hover:text-slate-12 disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-focus-ring)]"
      >
        <MinusGlyph />
      </button>
      <span className="w-10 text-center font-mono text-[11px] tabular-nums text-slate-12">
        {value.toFixed(digits)}
      </span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))}
        disabled={value >= max}
        className="grid h-6 w-6 place-items-center rounded text-slate-11 transition-colors hover:bg-state-hover-strong hover:text-slate-12 disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-focus-ring)]"
      >
        <PlusGlyph />
      </button>
    </div>
  );
}

function ActivePresetLabel({
  presetId,
  hue,
  userPresets,
}: {
  presetId: string | null;
  hue: number;
  userPresets: ReadonlyArray<UserPreset>;
}) {
  const userPreset =
    presetId == null ? null : userPresets.find((p) => p.id === presetId) ?? null;
  if (userPreset) {
    return (
      <div className="px-1 text-[10px] leading-tight text-slate-9">
        <span className="font-semibold uppercase tracking-wide text-slate-12">
          {userPreset.label}
        </span>
        <br />
        <span className="font-mono">{Math.round(userPreset.slateHue)}°</span>
      </div>
    );
  }
  return (
    <div className="px-1 text-[10px] leading-tight text-slate-9">
      <span className="font-semibold uppercase tracking-wide text-slate-10">
        Custom
      </span>
      <br />
      <span className="font-mono">{Math.round(hue)}°</span>
    </div>
  );
}

interface MyPresetsRowProps {
  userPresets: ReadonlyArray<UserPreset>;
  activeId: string | null;
  onSave: (label: string) => UserPreset | null;
  onSelect: (preset: UserPreset) => void;
  onDelete: (id: string) => void;
}

function MyPresetsRow({
  userPresets,
  activeId,
  onSave,
  onSelect,
  onDelete,
}: MyPresetsRowProps) {
  const [naming, setNaming] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (naming) inputRef.current?.focus();
  }, [naming]);

  const startNaming = () => {
    setDraft("");
    setNaming(true);
  };

  const cancelNaming = () => {
    setDraft("");
    setNaming(false);
  };

  const commitNaming = () => {
    const created = onSave(draft);
    if (created) {
      setDraft("");
      setNaming(false);
    }
  };

  const handleKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitNaming();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelNaming();
    }
  };

  const isEmpty = userPresets.length === 0;

  return (
    <div className="mt-3 flex items-center gap-1.5 rounded-md bg-surface-3 p-1.5">
      {!isEmpty && (
        <div
          role="radiogroup"
          aria-label="Saved presets"
          className="flex min-w-0 flex-1 items-start justify-start gap-1.5 overflow-x-auto pl-2"
        >
          {userPresets.map((preset) => (
            <UserPresetSwatch
              key={preset.id}
              preset={preset}
              active={preset.id === activeId}
              onSelect={() => onSelect(preset)}
              onDelete={() => onDelete(preset.id)}
            />
          ))}
        </div>
      )}

      {naming ? (
        <div className="flex h-7 items-center gap-1 rounded-full border border-border-default bg-surface-1 px-1.5">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            maxLength={USER_PRESET_LABEL_MAX}
            placeholder="Name"
            aria-label="Preset name"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            onBlur={cancelNaming}
            className="h-5 w-24 bg-transparent text-[11px] text-slate-12 placeholder:text-slate-9 focus:outline-none"
          />
          <button
            type="button"
            aria-label="Save preset"
            onMouseDown={(e) => e.preventDefault()}
            onClick={commitNaming}
            disabled={draft.trim().length === 0}
            className="grid h-5 w-5 place-items-center rounded-full text-slate-11 transition-colors hover:bg-state-hover-strong hover:text-slate-12 disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-focus-ring)]"
          >
            <Check size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={startNaming}
          aria-label="Save current as preset"
          title="Save current as preset"
          className={`flex h-7 shrink-0 items-center gap-1 rounded-full border border-border-default bg-state-hover px-2 text-[11px] font-medium text-slate-11 transition-colors hover:bg-state-hover-strong hover:text-slate-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-focus-ring)] ${isEmpty ? "flex-1 justify-center" : ""}`}
        >
          <Plus size={12} />
          {isEmpty && <span>Save current</span>}
        </button>
      )}
    </div>
  );
}

interface UserPresetSwatchProps {
  preset: UserPreset;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function UserPresetSwatch({
  preset,
  active,
  onSelect,
  onDelete,
}: UserPresetSwatchProps) {
  const handleDelete = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onDelete();
  };
  return (
    <div className="group relative shrink-0 pt-2">
      <button
        type="button"
        role="radio"
        aria-checked={active}
        aria-label={preset.label}
        title={preset.label}
        onClick={onSelect}
        className={`relative h-7 w-7 rounded-full transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-focus-ring)] ${
          active ? "scale-110 ring-2 ring-[var(--border-strong)]" : "hover:scale-105"
        }`}
        style={swatchStyle(preset)}
      />
      <button
        type="button"
        aria-label={`Delete ${preset.label}`}
        onClick={handleDelete}
        tabIndex={-1}
        className="absolute -right-1 -top-1 hidden h-3.5 w-3.5 place-items-center rounded-full bg-surface-1 text-slate-12 shadow-[var(--shadow-2)] ring-1 ring-border-default transition-colors hover:bg-state-hover-strong focus-visible:grid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-focus-ring)] group-hover:grid"
      >
        <X size={8} />
      </button>
    </div>
  );
}

interface Swatchable {
  slateHue: number;
  slateChromaScale: number;
  darkL1: number;
  accentInfoHue: number | null;
}

function swatchStyle(preset: Swatchable): CSSProperties {
  const infoHue = preset.accentInfoHue ?? preset.slateHue;
  const swatchColor = `oklch(0.70 ${(0.16 * Math.max(preset.slateChromaScale, 0.3)).toFixed(3)} ${infoHue})`;
  const bg = `oklch(${preset.darkL1.toFixed(3)} ${(0.005 * preset.slateChromaScale).toFixed(4)} ${preset.slateHue})`;
  return {
    background: `radial-gradient(circle at 30% 30%, ${swatchColor} 0%, ${swatchColor} 38%, ${bg} 60%, ${bg} 100%)`,
    boxShadow: "var(--shadow-2)",
  };
}

function PlusGlyph() {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 10 10"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    >
      <path d="M5 1.5v7M1.5 5h7" />
    </svg>
  );
}

function MinusGlyph() {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 10 10"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    >
      <path d="M1.5 5h7" />
    </svg>
  );
}
