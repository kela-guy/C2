/**
 * Day/Night view-mode control — the chosen direction from the
 * `/video-hud-sandbox` toggle studies.
 *
 * A spring-driven thumb that slides between the Day and Night stops; the
 * pressed segment scales on tap and the whole control is reduced-motion safe.
 * Filled Sun/Moon glyphs match the lab's locked filled icon set.
 */

import { motion, useReducedMotion } from 'framer-motion';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { MoonFilled, SunFilled, type IconComponent } from '@/lib/icons/central';
import type { DayNightMode } from '@/app/components/camera-v2/types';
import { cn } from '@/app/components/ui/utils';
import { TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip';
import { glassStyle } from './SandboxDeviceSelect';

const MODES: { id: DayNightMode; label: string; Icon: IconComponent }[] = [
  { id: 'day', label: 'Day', Icon: SunFilled },
  { id: 'night', label: 'Night', Icon: MoonFilled },
];

const STOP = 28; // px stride per stop (matches the size-7 thumb)

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong focus-visible:ring-offset-1 focus-visible:ring-offset-black';

// Base UI-style grouping: the first tooltip waits `OPEN_DELAY`, then sweeping
// across adjacent segments opens instantly (no entrance animation) while within
// `SKIP_DELAY` of the last close.
const OPEN_DELAY = 600;
const SKIP_DELAY = 300;

export interface DayNightSpringToggleProps {
  mode: DayNightMode;
  /** Fired when the inactive segment is chosen (binary flip). */
  onToggle: () => void;
  disabled?: boolean;
  /** Glass background opacity, 0..1 (black overlay alpha). Default 0.4. */
  bgOpacity?: number;
  /** Backdrop blur in px. Default 4 (matches `backdrop-blur-sm`). */
  blurPx?: number;
}

export function DayNightSpringToggle({
  mode,
  onToggle,
  disabled,
  bgOpacity = 0.4,
  blurPx = 4,
}: DayNightSpringToggleProps) {
  const reduce = useReducedMotion();
  const idx = Math.max(0, MODES.findIndex((m) => m.id === mode));
  const ThumbIcon = MODES[idx].Icon;
  return (
    <div
      role="radiogroup"
      aria-label="Day/night view mode"
      aria-disabled={disabled}
      style={glassStyle(bgOpacity, blurPx)}
      className={cn(
        'relative inline-flex h-9 items-center rounded-full border border-border-default/45 p-0.5',
        disabled && 'pointer-events-none opacity-40',
      )}
    >
      <motion.span
        aria-hidden
        className="absolute left-0.5 top-0.5 flex size-[30px] items-center justify-center rounded-full bg-state-selected text-slate-12"
        animate={{ x: idx * STOP }}
        whileTap={disabled ? undefined : { scale: 0.9 }}
        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 30 }}
      >
        <ThumbIcon size={13} aria-hidden />
      </motion.span>
      <TooltipProvider delayDuration={OPEN_DELAY} skipDelayDuration={SKIP_DELAY}>
        {MODES.map((m) => {
          const active = m.id === mode;
          const Icon = m.Icon;
          return (
            <TooltipPrimitive.Root key={m.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={m.label}
                  disabled={disabled}
                  onClick={() => {
                    if (!active) onToggle();
                  }}
                  className={cn(
                    'relative z-10 flex size-7 items-center justify-center rounded-full transition-colors duration-150',
                    FOCUS_RING,
                    active ? 'text-transparent' : 'text-slate-12/40 hover:text-slate-12/70',
                  )}
                >
                  <Icon size={13} aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={6}
                className="rounded-md text-xs data-[state=instant-open]:animate-none"
              >
                {m.label}
              </TooltipContent>
            </TooltipPrimitive.Root>
          );
        })}
      </TooltipProvider>
    </div>
  );
}

export default DayNightSpringToggle;
