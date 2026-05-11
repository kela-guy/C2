/**
 * Click-to-designate-target overlay for a camera feed.
 *
 * Anatomy:
 *   - When `active` is true, an absolute layer covers the feed and forces
 *     `cursor-crosshair`. A reticle follows the pointer and a top hint
 *     banner explains the action ("לחץ כדי לסמן יעד · Esc לביטול").
 *   - On click, fires `onDesignate(normX, normY)` with normalised
 *     coordinates (0..1) and renders a brief "ping" flash at the chosen
 *     point so the user gets a visual receipt before the parent exits
 *     the mode.
 *   - Stacked at z-10 so the bottom control bar (z-20) stays clickable —
 *     this lets the user press the crosshair button again to cancel even
 *     while the overlay is active.
 *
 * Stateless w.r.t. the surrounding tile: the parent owns the boolean
 * `active` flag and fully controls when designate mode enters/exits.
 */

import { useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react';

interface DesignateTargetOverlayProps {
  active: boolean;
  onDesignate: (normX: number, normY: number) => void;
}

const RETICLE_SIZE = 56;
const FLASH_DURATION_MS = 1100;

export function DesignateTargetOverlay({ active, onDesignate }: DesignateTargetOverlayProps) {
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [flash, setFlash] = useState<{ x: number; y: number; key: number } | null>(null);

  // Reset the follow-cursor reticle whenever the mode is exited so we
  // don't show a stale position the next time it re-opens.
  useEffect(() => {
    if (!active) setCursorPos(null);
  }, [active]);

  // Auto-clear the flash so the marker doesn't linger past the next
  // designation (or unmount).
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), FLASH_DURATION_MS);
    return () => clearTimeout(id);
  }, [flash?.key]);

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseLeave = () => {
    setCursorPos(null);
  };

  const handleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const normX = Math.max(0, Math.min(1, x / rect.width));
    const normY = Math.max(0, Math.min(1, y / rect.height));
    setFlash({ x, y, key: Date.now() });
    onDesignate(normX, normY);
  };

  if (!active && !flash) return null;

  return (
    <>
      {active && (
        <div
          className="absolute inset-0 z-10 pointer-events-auto cursor-crosshair select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          role="button"
          tabIndex={-1}
          aria-label="לחץ כדי לסמן יעד"
        >
          <div
            className="absolute inset-0 pointer-events-none shadow-[inset_0_0_0_2px_rgba(252,211,77,0.55)]"
            aria-hidden="true"
          />

          <div
            className="absolute inset-x-0 top-12 flex justify-center pointer-events-none"
            aria-hidden="true"
          >
            <div
              className="px-2.5 py-1 bg-amber-400/95 text-black text-[10px] font-semibold uppercase tracking-[0.18em] shadow-[0_0_0_1px_rgba(0,0,0,0.45),0_6px_18px_rgba(0,0,0,0.5)]"
              dir="rtl"
            >
              לחץ כדי לסמן יעד · Esc לביטול
            </div>
          </div>

          {cursorPos && <FollowReticle x={cursorPos.x} y={cursorPos.y} />}
        </div>
      )}

      {flash && (
        <div className="absolute inset-0 z-10 pointer-events-none" aria-hidden="true">
          <DesignationFlash x={flash.x} y={flash.y} />
        </div>
      )}
    </>
  );
}

function FollowReticle({ x, y }: { x: number; y: number }) {
  const half = RETICLE_SIZE / 2;
  const armOuter = half * 0.85;
  const armInner = half * 0.28;
  const cornerLen = half * 0.28;
  const cornerOffset = half * 0.95;

  return (
    <svg
      width={RETICLE_SIZE}
      height={RETICLE_SIZE}
      viewBox={`0 0 ${RETICLE_SIZE} ${RETICLE_SIZE}`}
      className="absolute pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]"
      style={{
        left: x - half,
        top: y - half,
      }}
      aria-hidden="true"
    >
      <line x1={half - armOuter} y1={half} x2={half - armInner} y2={half} stroke="#fde047" strokeWidth={1.25} strokeLinecap="round" />
      <line x1={half + armInner} y1={half} x2={half + armOuter} y2={half} stroke="#fde047" strokeWidth={1.25} strokeLinecap="round" />
      <line x1={half} y1={half - armOuter} x2={half} y2={half - armInner} stroke="#fde047" strokeWidth={1.25} strokeLinecap="round" />
      <line x1={half} y1={half + armInner} x2={half} y2={half + armOuter} stroke="#fde047" strokeWidth={1.25} strokeLinecap="round" />

      <g stroke="#fde047" strokeWidth={1} opacity={0.7} strokeLinecap="round">
        <line x1={half - cornerOffset} y1={half - cornerOffset} x2={half - cornerOffset + cornerLen} y2={half - cornerOffset} />
        <line x1={half - cornerOffset} y1={half - cornerOffset} x2={half - cornerOffset} y2={half - cornerOffset + cornerLen} />
        <line x1={half + cornerOffset} y1={half - cornerOffset} x2={half + cornerOffset - cornerLen} y2={half - cornerOffset} />
        <line x1={half + cornerOffset} y1={half - cornerOffset} x2={half + cornerOffset} y2={half - cornerOffset + cornerLen} />
        <line x1={half - cornerOffset} y1={half + cornerOffset} x2={half - cornerOffset + cornerLen} y2={half + cornerOffset} />
        <line x1={half - cornerOffset} y1={half + cornerOffset} x2={half - cornerOffset} y2={half + cornerOffset - cornerLen} />
        <line x1={half + cornerOffset} y1={half + cornerOffset} x2={half + cornerOffset - cornerLen} y2={half + cornerOffset} />
        <line x1={half + cornerOffset} y1={half + cornerOffset} x2={half + cornerOffset} y2={half + cornerOffset - cornerLen} />
      </g>

      <circle cx={half} cy={half} r={1.25} fill="#fde047" />
    </svg>
  );
}

function DesignationFlash({ x, y }: { x: number; y: number }) {
  const size = 44;
  const half = size / 2;
  return (
    <div
      className="absolute"
      style={{ left: x - half, top: y - half, width: size, height: size }}
    >
      <span className="absolute inset-0 rounded-full ring-2 ring-amber-300/80 animate-ping motion-reduce:animate-none" />
      <span className="absolute inset-[35%] rounded-full bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.7)]" />
    </div>
  );
}
