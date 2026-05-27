import { useCallback, useId, useState, type FocusEvent } from 'react';
import { DirIsland } from '@/lib/direction';
import { Slider } from '@/app/components/ui/slider';

const ALT_MIN = 80;
const ALT_MAX = 200;
const SPD_MIN = 0;
const SPD_MAX = 20;

const IDLE_WIDTH = 'w-[64px]';
const LANE_WIDTH = 'w-[76px]';
const RAIL_MIN_W = 'min-w-[168px]';
const RAIL_MIN_H = 'min-h-[124px]';

const LANE_SHELL =
  'rounded-md bg-surface-1/70 px-2.5 py-2 backdrop-blur-sm ring-1 ring-inset ring-border-default';

const TRACK_PX = 52;
const THUMB_PX = 20;
const THUMB_INSET_PX = THUMB_PX / 2;

const VERTICAL_SLIDER =
  'h-full min-h-0 w-7 shrink-0 [&_[data-slot=slider-range]]:bg-slate-12/25 [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:border-border-default [&_[data-slot=slider-thumb]]:bg-slate-12 [&_[data-slot=slider-thumb]]:shadow-none [&_[data-slot=slider-thumb]]:focus-visible:ring-2 [&_[data-slot=slider-thumb]]:focus-visible:ring-border-strong [&_[data-slot=slider-track]]:h-full [&_[data-slot=slider-track]]:min-h-0 [&_[data-slot=slider-track]]:w-1 [&_[data-slot=slider-track]]:bg-state-hover-strong';

const REVEAL_TRANSITION =
  'transition-[opacity,clip-path,transform] duration-200 ease-out motion-reduce:transition-none';

const SETPOINT_LABELS = {
  ALT: { short: 'ALT', long: 'Altitude' },
  SPD: { short: 'SPD', long: 'Speed' },
} as const;

export interface SandboxSetpointRailProps {
  altitudeM: number;
  velocityMps: number;
  targetAltitudeM: number;
  targetVelocityMps: number;
  disabled: boolean;
  forceExpanded?: boolean;
  onTargetAltitudeChange: (next: number) => void;
  onTargetVelocityChange: (next: number) => void;
}

export function SandboxSetpointRail({
  altitudeM,
  velocityMps,
  targetAltitudeM,
  targetVelocityMps,
  disabled,
  forceExpanded = false,
  onTargetAltitudeChange,
  onTargetVelocityChange,
}: SandboxSetpointRailProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const expanded = !disabled && (forceExpanded || hovered || focused || scrubbing);

  const handleScrubStart = useCallback(() => setScrubbing(true), []);
  const handleScrubEnd = useCallback(() => setScrubbing(false), []);

  const handleBlurCapture = useCallback(
    (e: FocusEvent<HTMLDivElement>) => {
      if (!scrubbing && !e.currentTarget.contains(e.relatedTarget as Node | null)) {
        setFocused(false);
        setHovered(false);
      }
    },
    [scrubbing],
  );

  return (
    <div
      role="group"
      aria-label="Altitude and speed setpoints"
      aria-disabled={disabled || undefined}
      className={`absolute z-20 left-3 top-1/2 -translate-y-1/2 transition-opacity duration-150
        ${disabled ? 'opacity-45 pointer-events-none' : 'pointer-events-auto'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        if (!scrubbing) setHovered(false);
      }}
      onFocusCapture={() => {
        if (!disabled) setFocused(true);
      }}
      onBlurCapture={handleBlurCapture}
    >
      <DirIsland direction="ltr">
        <div className={`relative ${RAIL_MIN_W} ${RAIL_MIN_H}`}>
          <div
            className={`flex flex-col justify-center gap-1 ${REVEAL_TRANSITION}
              ${expanded
                ? 'pointer-events-none absolute inset-0 opacity-0 scale-[0.98]'
                : 'opacity-100 scale-100'}`}
            aria-hidden={expanded}
          >
            <IdleRow
              shortLabel={SETPOINT_LABELS.ALT.short}
              longLabel={SETPOINT_LABELS.ALT.long}
              current={`${Math.round(altitudeM)} m`}
            />
            <IdleRow
              shortLabel={SETPOINT_LABELS.SPD.short}
              longLabel={SETPOINT_LABELS.SPD.long}
              current={`${velocityMps.toFixed(1)} m/s`}
            />
          </div>

          <div
            className={`absolute inset-0 flex items-center justify-center ${REVEAL_TRANSITION}
              ${expanded
                ? 'opacity-100 [clip-path:inset(0_0_0_0)] translate-x-0'
                : 'pointer-events-none opacity-0 [clip-path:inset(0_10%_0_0)] -translate-x-0.5'}`}
            aria-hidden={!expanded}
          >
            <div className="flex gap-2">
              <SetpointLane
                shortLabel={SETPOINT_LABELS.ALT.short}
                longLabel={SETPOINT_LABELS.ALT.long}
                current={altitudeM}
                target={targetAltitudeM}
                min={ALT_MIN}
                max={ALT_MAX}
                step={1}
                unit="m"
                format={(v) => `${Math.round(v)}`}
                disabled={disabled}
                onChange={onTargetAltitudeChange}
                onScrubStart={handleScrubStart}
                onScrubEnd={handleScrubEnd}
              />
              <SetpointLane
                shortLabel={SETPOINT_LABELS.SPD.short}
                longLabel={SETPOINT_LABELS.SPD.long}
                current={velocityMps}
                target={targetVelocityMps}
                min={SPD_MIN}
                max={SPD_MAX}
                step={0.5}
                unit="m/s"
                format={(v) => v.toFixed(1)}
                disabled={disabled}
                onChange={onTargetVelocityChange}
                onScrubStart={handleScrubStart}
                onScrubEnd={handleScrubEnd}
              />
            </div>
          </div>
        </div>
      </DirIsland>
    </div>
  );
}

function IdleRow({
  shortLabel,
  longLabel,
  current,
}: {
  shortLabel: string;
  longLabel: string;
  current: string;
}) {
  const labelId = useId();
  const valueId = useId();

  return (
    <div
      role="group"
      aria-labelledby={`${labelId} ${valueId}`}
      className={`flex ${IDLE_WIDTH} items-stretch gap-1.5`}
    >
      <span className="mt-0.5 w-px shrink-0 bg-slate-12/25" aria-hidden />
      <div>
        <div id={labelId} className="text-[12px] font-medium uppercase leading-none tracking-[0.1em] text-slate-10">
          <span aria-hidden>{shortLabel}</span>
          <span className="sr-only">{longLabel}</span>
        </div>
        <span id={valueId} className="font-mono text-[16px] leading-none tabular-nums text-slate-12 -mt-px">
          {current}
        </span>
      </div>
    </div>
  );
}

function SetpointLane({
  shortLabel,
  longLabel,
  current,
  target,
  min,
  max,
  step,
  unit,
  format,
  disabled,
  onChange,
  onScrubStart,
  onScrubEnd,
}: {
  shortLabel: string;
  longLabel: string;
  current: number;
  target: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  format: (v: number) => string;
  disabled: boolean;
  onChange: (next: number) => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
}) {
  const labelId = useId();
  const valueId = useId();
  const range = max - min;
  const livePct =
    range <= 0 ? 0 : Math.min(100, Math.max(0, ((current - min) / range) * 100));
  const travelPx = TRACK_PX - THUMB_PX;
  const liveBottomPx = THUMB_INSET_PX + (livePct / 100) * travelPx;
  const targetText = unit ? `${format(target)} ${unit}` : format(target);
  const liveText = unit ? `${format(current)} ${unit}` : format(current);
  const pending =
    unit === 'm'
      ? Math.round(target) !== Math.round(current)
      : Math.abs(target - current) > 0.05;

  return (
    <div className={`${LANE_SHELL} flex ${LANE_WIDTH} shrink-0 flex-col items-center gap-2`}>
      <div id={labelId} className="py-0.5 text-center text-[12px] font-medium uppercase leading-none tracking-[0.1em] text-slate-9">
        <span aria-hidden>{shortLabel}</span>
        <span className="sr-only">{longLabel}</span>
      </div>

      <div
        className="relative w-7 shrink-0 overflow-hidden"
        style={{ height: TRACK_PX }}
      >
        <div
          className="pointer-events-none absolute start-1/2 z-0 h-px w-4 -translate-x-1/2 bg-slate-12/35"
          style={{ bottom: liveBottomPx }}
          aria-hidden
        />
        <Slider
          orientation="vertical"
          min={min}
          max={max}
          step={step}
          value={[target]}
          disabled={disabled}
          onValueChange={([v]) => onChange(v)}
          onPointerDown={onScrubStart}
          onPointerUp={onScrubEnd}
          onPointerCancel={onScrubEnd}
          aria-labelledby={`${labelId} ${valueId}`}
          getAriaValueText={() =>
            pending ? `${targetText}, live ${liveText}` : targetText
          }
          className={VERTICAL_SLIDER}
        />
      </div>

      <div
        id={valueId}
        aria-live="polite"
        aria-atomic="true"
        className="whitespace-nowrap font-mono text-[14px] leading-tight tabular-nums text-slate-12"
      >
        {targetText}
      </div>
    </div>
  );
}
