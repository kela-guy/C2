/**
 * Circular hue picker. Drag the knob around the ring to set the
 * slate spine hue (0–360°). Arrow keys nudge ±5°. The center swatch
 * paints the current accent at a fixed L/C so the operator sees the
 * vividness their pick will produce.
 *
 * No vendor color-wheel dependency — the ring is a CSS conic-gradient
 * in OKLCH, which is what the rest of the palette is calibrated for.
 */

import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

interface HueDialProps {
  hue: number;
  size?: number;
  onChange: (hue: number) => void;
  ariaLabel: string;
}

const RING_OUTER_PAD = 14;
const KNOB_RADIUS = 9;

export function HueDial({ hue, size = 168, onChange, ariaLabel }: HueDialProps) {
  const ringRef = useRef<HTMLDivElement | null>(null);
  const activePointer = useRef<number | null>(null);

  const radius = size / 2;
  const knobOrbit = radius - RING_OUTER_PAD / 2;
  const angleRad = ((hue - 90) * Math.PI) / 180;
  const knobX = radius + knobOrbit * Math.cos(angleRad);
  const knobY = radius + knobOrbit * Math.sin(angleRad);

  const handleAt = useCallback(
    (clientX: number, clientY: number) => {
      const el = ringRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      onChange(((deg % 360) + 360) % 360);
    },
    [onChange],
  );

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      activePointer.current = e.pointerId;
      handleAt(e.clientX, e.clientY);
    },
    [handleAt],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (activePointer.current !== e.pointerId) return;
      handleAt(e.clientX, e.clientY);
    },
    [handleAt],
  );

  const onPointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (activePointer.current === e.pointerId) {
      activePointer.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 15 : 5;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        onChange((hue + step) % 360);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        onChange(((hue - step) % 360 + 360) % 360);
      } else if (e.key === "Home") {
        e.preventDefault();
        onChange(0);
      } else if (e.key === "End") {
        e.preventDefault();
        onChange(180);
      }
    },
    [hue, onChange],
  );

  useEffect(() => {
    return () => {
      activePointer.current = null;
    };
  }, []);

  const ringStyle: CSSProperties = {
    width: size,
    height: size,
    background: `conic-gradient(from 0deg,
      oklch(0.70 0.16 0),
      oklch(0.78 0.18 30),
      oklch(0.84 0.18 60),
      oklch(0.86 0.18 90),
      oklch(0.84 0.20 130),
      oklch(0.82 0.20 165),
      oklch(0.80 0.16 200),
      oklch(0.74 0.16 230),
      oklch(0.66 0.20 270),
      oklch(0.68 0.22 310),
      oklch(0.70 0.22 340),
      oklch(0.70 0.16 360))`,
  };

  const innerStyle: CSSProperties = {
    inset: RING_OUTER_PAD,
  };

  const knobStyle: CSSProperties = {
    left: knobX - KNOB_RADIUS,
    top: knobY - KNOB_RADIUS,
    width: KNOB_RADIUS * 2,
    height: KNOB_RADIUS * 2,
    backgroundColor: `oklch(0.70 0.16 ${hue})`,
  };

  const wellStyle: CSSProperties = {
    backgroundColor: `oklch(0.70 0.16 ${hue})`,
  };

  return (
    <div
      ref={ringRef}
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={360}
      aria-valuenow={Math.round(hue)}
      aria-valuetext={`${Math.round(hue)} degrees`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      className="relative shrink-0 cursor-pointer rounded-full shadow-[var(--shadow-3)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-focus-ring)]"
      style={ringStyle}
    >
      <div
        className="absolute rounded-full bg-surface-3"
        style={innerStyle}
        aria-hidden
      />
      <div
        className="absolute inset-[34px] rounded-full shadow-[var(--shadow-2)]"
        style={wellStyle}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute rounded-full border-2 border-slate-12 shadow-[var(--shadow-2)]"
        style={knobStyle}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-mono font-medium uppercase tracking-wide text-slate-12 mix-blend-difference">
        {Math.round(hue)}°
      </div>
    </div>
  );
}
