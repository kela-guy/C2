import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Toggle } from '@/shared/components/ui/toggle';
import { buttonVariants } from '@/shared/components/ui/button';
import { AppLoader } from '@/shared/components/ui/app-loader';
import { cn } from '@/shared/components/ui/utils';
import { spring, springExit } from '@/lib/springs';
import { BUTTON_VARIANTS, BUTTON_SIZES, type ButtonSize } from './buttonTokens';

export interface CameraToggleButtonProps {
  /** Whether the camera is currently live/locked on the target. */
  on: boolean;
  /** Transient slew phase between off and on; shows a spinner and is non-interactive. */
  pending?: boolean;
  size?: ButtonSize;
  /** Label shown in the off (idle) state, e.g. "Point camera". */
  offLabel: string;
  /** Label shown in the on (live) state, e.g. "Release camera". */
  onLabel: string;
  /** Label shown while slewing. Falls back to `onLabel`. */
  pendingLabel?: string;
  offIcon?: React.ElementType;
  onIcon?: React.ElementType;
  /** Optional trailing pill rendered after the label (e.g. a selected-track name). */
  badge?: string;
  onToggle: (e: React.MouseEvent) => void;
  className?: string;
}

/**
 * Single on/off camera control. Off invites "point the camera"; pressing it
 * slews (pending) and settles into a brighter "on" state. Pressing again
 * stops the camera. The on state reads the same idle or hovered.
 *
 * Built on the vendored shadcn {@link Toggle} (Radix Toggle) so the on/off
 * semantics are real toggle semantics — `aria-pressed` + `data-state=on/off`
 * come from Radix — while the surface stays in the button family: the shell
 * wears the ONE `buttonVariants` cva from `ui/button.tsx` (via the
 * `buttonTokens` alias maps) so it can never drift from Button/ActionButton
 * visuals.
 */
export function CameraToggleButton({
  on,
  pending = false,
  size = 'sm',
  offLabel,
  onLabel,
  pendingLabel,
  offIcon,
  onIcon,
  badge,
  onToggle,
  className = '',
}: CameraToggleButtonProps) {
  const prefersReducedMotion = useReducedMotion();
  const sz = BUTTON_SIZES[size];

  // Pending counts as "on" for pressed semantics — the slew is already
  // committed — matching the previous Button-based behavior.
  const isOn = pending || on;
  const label = pending ? (pendingLabel ?? onLabel) : on ? onLabel : offLabel;
  const Icon = on ? onIcon : offIcon;

  return (
    <Toggle
      pressed={isOn}
      onClick={pending ? undefined : onToggle}
      data-handoff-component="camera-toggle"
      aria-busy={pending || undefined}
      className={cn(
        // The button family's fill surface + size scale come from the ONE
        // buttonVariants cva; layered over the Toggle's own classes they win
        // via cn/twMerge, so the shell stays visually a Button.
        buttonVariants({ variant: BUTTON_VARIANTS.fill, size: sz.ui }),
        'w-full gap-2 rounded px-3 overflow-hidden',
        'hover:text-slate-11',
        'duration-[var(--motion-fast)]',
        // The live state: brighter white fill + inset ring (same treatment as
        // Button's `pressed`), keyed off Radix's data-state.
        'data-[state=on]:bg-white/[0.20] data-[state=on]:hover:bg-white/[0.24] data-[state=on]:active:bg-white/[0.16]',
        'data-[state=on]:text-white data-[state=on]:hover:text-white',
        'data-[state=on]:ring-1 data-[state=on]:ring-inset data-[state=on]:ring-white/20',
        pending ? 'cursor-wait active:scale-100' : 'will-change-transform',
        className,
      )}
      {...(pending ? { 'aria-live': 'polite' as const } : {})}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={label}
          className="flex items-center gap-2"
          transition={prefersReducedMotion ? { duration: 0 } : spring.moderate}
          initial={prefersReducedMotion ? false : { opacity: 0, y: -25 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0, y: 25, transition: springExit.moderate }}
        >
          {pending ? (
            <AppLoader size={sz.icon} label={label} className="shrink-0 opacity-90" />
          ) : (
            Icon && <Icon size={sz.icon} className="shrink-0 opacity-95" aria-hidden="true" />
          )}
          <span className="whitespace-nowrap">{label}</span>
          {badge && !pending && (
            <span className="text-xs font-medium bg-white/[0.12] px-1.5 py-0.5 rounded leading-none whitespace-nowrap">
              {badge}
            </span>
          )}
        </motion.span>
      </AnimatePresence>
    </Toggle>
  );
}
