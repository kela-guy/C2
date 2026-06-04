/**
 * Pathfinder camera-angle control — segmented spring-thumb toggle.
 *
 * Three framing presets aim the camera at a real elevation, symmetric around
 * the horizon:
 *   - Front    -> +45° (up / ahead)
 *   - Straight ->   0° (horizon)
 *   - Down     -> -45° (down)
 *
 * Segments show only the degree; hovering (or focusing) a segment reveals a
 * tooltip with the matching arrow and the verbal direction. Dark-glass chrome
 * matches the device select / connectivity badge so the HUD reads as one
 * family. Sandbox-only.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from '@/lib/icons/central';
import { cn } from '@/app/components/ui/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { glassStyle } from './SandboxDeviceSelect';

export type CameraAngle = 'front' | 'straight' | 'down';

interface AngleMeta {
  id: CameraAngle;
  label: string;
  /** Camera elevation, degrees off horizon (up positive). */
  aim: number;
}

export const ANGLE_META: Record<CameraAngle, AngleMeta> = {
  front: { id: 'front', label: 'Front', aim: 45 },
  straight: { id: 'straight', label: 'Straight', aim: 0 },
  down: { id: 'down', label: 'Down', aim: -45 },
};

export const ANGLES: CameraAngle[] = ['front', 'straight', 'down'];

/** Signed degree readout, e.g. "+45°", "0°", "−45°" (true minus glyph). */
export function fmtAngleDeg(a: CameraAngle): string {
  const { aim } = ANGLE_META[a];
  if (aim === 0) return '0°';
  return `${aim > 0 ? '+' : '−'}${Math.abs(aim)}°`;
}

/**
 * Base arrow points forward (right). CSS rotation is clockwise-positive, so to
 * tilt the arrowhead toward an upward aim we rotate by the negated aim.
 */
const rotateFor = (a: CameraAngle) => -ANGLE_META[a].aim;

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong focus-visible:ring-offset-1 focus-visible:ring-offset-black';

const SEG = 40; // px per segment (degree readout only)

export interface SandboxAngleToggleProps {
  value: CameraAngle;
  onChange: (next: CameraAngle) => void;
  disabled?: boolean;
  /** Glass background opacity, 0..1 (black overlay alpha). Default 0.4. */
  bgOpacity?: number;
  /** Backdrop blur in px. Default 4 (matches `backdrop-blur-sm`). */
  blurPx?: number;
}

/**
 * Segmented spring-thumb toggle. Segments show only the degree; hover/focus
 * reveals a tooltip with the matching arrow + verbal direction. Keyboard focus
 * per segment; reduced-motion safe.
 */
export function SandboxAngleToggle({
  value,
  onChange,
  disabled,
  bgOpacity = 0.4,
  blurPx = 4,
}: SandboxAngleToggleProps) {
  const reduce = useReducedMotion();
  const idx = Math.max(0, ANGLES.indexOf(value));
  return (
    <div
      role="radiogroup"
      aria-label="Camera angle"
      aria-disabled={disabled}
      style={glassStyle(bgOpacity, blurPx)}
      className={cn(
        'relative inline-flex h-9 items-center justify-start rounded-full border border-border-default/45 p-0.5',
        disabled && 'pointer-events-none opacity-40',
      )}
    >
      <motion.span
        aria-hidden
        className="absolute left-0.5 top-0.5 flex h-[30px] items-center justify-center rounded-full bg-state-selected font-sans text-[12px] font-semibold tabular-nums text-slate-12"
        style={{ width: SEG }}
        animate={{ x: idx * SEG }}
        whileTap={disabled ? undefined : { scale: 0.94 }}
        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 30 }}
      >
        {fmtAngleDeg(value)}
      </motion.span>
      {ANGLES.map((a) => {
        const active = a === value;
        return (
          <Tooltip key={a}>
            <TooltipTrigger asChild>
              <button
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`${ANGLE_META[a].label} (${fmtAngleDeg(a)})`}
                disabled={disabled}
                onClick={() => onChange(a)}
                style={{ width: SEG }}
                className={cn(
                  'relative z-10 flex h-7 items-center justify-center rounded-full font-sans text-[12px] font-semibold tabular-nums transition-colors duration-150',
                  FOCUS_RING,
                  active ? 'text-transparent' : 'text-slate-12/45 hover:text-slate-12/70',
                )}
              >
                {fmtAngleDeg(a)}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              <span className="inline-flex items-center gap-1.5">
                <ArrowRight
                  size={12}
                  aria-hidden
                  className="shrink-0"
                  style={{ transform: `rotate(${rotateFor(a)}deg)` }}
                />
                <span>{ANGLE_META[a].label}</span>
              </span>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

export default SandboxAngleToggle;
