import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Compass, Pause, Play } from '@/lib/icons/central';

const SWEEP_DEG_PER_SECOND = 5;

export interface SandboxCompassControlProps {
  bearingDeg: number;
  onBearingChange: (next: number) => void;
}

export function SandboxCompassControl({
  bearingDeg,
  onBearingChange,
}: SandboxCompassControlProps) {
  const sliderId = useId();
  const [playing, setPlaying] = useState(false);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const bearingRef = useRef(bearingDeg);
  const onChangeRef = useRef(onBearingChange);

  useEffect(() => {
    bearingRef.current = bearingDeg;
  }, [bearingDeg]);

  useEffect(() => {
    onChangeRef.current = onBearingChange;
  }, [onBearingChange]);

  useEffect(() => {
    if (!playing) {
      lastFrameRef.current = null;
      return;
    }
    const tick = (now: number) => {
      const last = lastFrameRef.current;
      lastFrameRef.current = now;
      if (last != null) {
        const dt = (now - last) / 1000;
        const next = (bearingRef.current + SWEEP_DEG_PER_SECOND * dt) % 360;
        onChangeRef.current(next);
      }
      rafIdRef.current = requestAnimationFrame(tick);
    };
    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      lastFrameRef.current = null;
    };
  }, [playing]);

  const togglePlay = useCallback(() => setPlaying((v) => !v), []);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onBearingChange(parseFloat(e.target.value));
    },
    [onBearingChange],
  );

  const display = Math.round(bearingDeg) % 360;

  return (
    <div className="flex items-center gap-2 rounded-md border border-border-default bg-surface-2 px-2 py-1">
      <Compass size={14} className="text-slate-11" aria-hidden />
      <label
        htmlFor={sliderId}
        className="font-mono text-2xs uppercase tracking-[0.18em] text-slate-9"
      >
        BRG
      </label>
      <input
        id={sliderId}
        type="range"
        min={0}
        max={359}
        step={1}
        value={display}
        onChange={handleSliderChange}
        aria-label="Bearing"
        className="h-1 w-32 cursor-pointer appearance-none rounded-full bg-state-hover-strong accent-accent-info [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-12"
      />
      <span className="min-w-[3ch] text-end font-mono text-xs-plus tabular-nums text-slate-12">
        {String(display).padStart(3, '0')}°
      </span>
      <button
        type="button"
        onClick={togglePlay}
        aria-pressed={playing}
        aria-label={playing ? 'Pause bearing sweep' : 'Play bearing sweep'}
        className={`flex size-6 items-center justify-center rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-strong ${
          playing
            ? 'bg-accent-info text-slate-1'
            : 'text-slate-11 hover:bg-state-hover hover:text-slate-12'
        }`}
      >
        {playing ? <Pause size={12} /> : <Play size={12} />}
      </button>
    </div>
  );
}
