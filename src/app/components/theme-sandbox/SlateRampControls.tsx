/**
 * Advanced sliders for stretching the dark slate ramp.
 *
 * Disabled in light mode — the light curve in `palette.css` is
 * non-linear by design (the gap between L7 and L9 sets up the
 * background/text tier split) and a linear stretch destroys it.
 */

import { type ChangeEvent } from "react";

import type { EffectiveMode } from "./themeTokens";

interface SlateRampControlsProps {
  chromaScale: number;
  darkL1: number;
  darkL12: number;
  lightAccentTune: number;
  effectiveMode: EffectiveMode;
  onChromaScaleChange: (value: number) => void;
  onDarkL1Change: (value: number) => void;
  onDarkL12Change: (value: number) => void;
  onLightAccentTuneChange: (value: number) => void;
}

export function SlateRampControls({
  chromaScale,
  darkL1,
  darkL12,
  lightAccentTune,
  effectiveMode,
  onChromaScaleChange,
  onDarkL1Change,
  onDarkL12Change,
  onLightAccentTuneChange,
}: SlateRampControlsProps) {
  const isLight = effectiveMode === "light";

  return (
    <div className="grid grid-cols-1 gap-2">
      <RangeRow
        label="Chroma scale"
        value={chromaScale}
        min={0}
        max={2}
        step={0.05}
        unit="×"
        digits={2}
        onChange={onChromaScaleChange}
      />
      <RangeRow
        label="Deepest bg (L1)"
        value={darkL1}
        min={0.08}
        max={0.3}
        step={0.005}
        digits={3}
        disabled={isLight}
        onChange={onDarkL1Change}
      />
      <RangeRow
        label="Brightest fg (L12)"
        value={darkL12}
        min={0.85}
        max={1}
        step={0.005}
        digits={3}
        disabled={isLight}
        onChange={onDarkL12Change}
      />
      <RangeRow
        label="Tune for light"
        value={lightAccentTune}
        min={0}
        max={1}
        step={0.02}
        unit="%"
        digits={0}
        formatValue={(v) => Math.round(v * 100).toString()}
        disabled={!isLight}
        onChange={onLightAccentTuneChange}
      />
      {isLight ? (
        <p className="px-1 text-[10px] leading-snug text-slate-9">
          Bookend sliders apply to dark mode only.{" "}
          <span className="text-slate-10">Tune for light</span> darkens
          vivid accents and lightens soft chips for white substrates.
        </p>
      ) : (
        <p className="px-1 text-[10px] leading-snug text-slate-9">
          <span className="text-slate-10">Tune for light</span> is a
          light-mode-only adjustment.
        </p>
      )}
    </div>
  );
}

interface RangeRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  digits: number;
  disabled?: boolean;
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
}

function RangeRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  digits,
  disabled,
  formatValue,
  onChange,
}: RangeRowProps) {
  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };
  const display = formatValue ? formatValue(value) : value.toFixed(digits);
  return (
    <label
      className={`flex items-center gap-2 px-1 text-[11px] ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <span className="w-32 shrink-0 text-slate-10">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={handle}
        className="theme-sandbox-range flex-1"
      />
      <span className="w-12 shrink-0 text-end font-mono text-slate-12 tabular-nums">
        {display}
        {unit ?? ""}
      </span>
    </label>
  );
}
