/**
 * Pathfinder takeoff toast — minimal single-row design.
 *
 * Three elements, nothing else:
 *   1. Icon / loader   — reflects the current state (spinner while working).
 *   2. Task label      — the current step; switches with a snappy slide/fade.
 *   3. Context CTA      — only the action that matters right now for the current
 *                         state (Stop / Takeoff / Return to dock / Retry).
 *
 * Deliberately near-monochrome: the surface matches the app's sonner card, and
 * color is reserved for the two destructive/fault signals — the Stop action and
 * the fault state both use the same danger red as the video HUD. Everything else
 * is the neutral zinc ramp so the toast reads as calm system status, not an alert.
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, SquareFilled } from '@/lib/icons/central';
import { DockIcon } from '@/app/components/devices-panel/icons';
import { DroneDeviceIcon } from '@/primitives/ProductIcons';
import { DotmSquare12 } from '@/app/components/ui/dotm-square-12';
import { spring } from '@/lib/springs';
import {
  SEQUENCE_STRINGS as S,
  PREPARE_STEPS,
  TAKEOFF_STEPS,
  type Locale,
} from './launchSequence';
import type { PathfinderSim } from './usePathfinderLaunchSim';

const ERROR = '#f87171';

/**
 * Total launch steps shown in the counter — prepare + takeoff run as one
 * continuous count toward airborne, so the number climbs smoothly across the
 * phase boundary (e.g. "16/23" → "17/23") instead of resetting to "1/7".
 */
const LAUNCH_TOTAL = PREPARE_STEPS.length + TAKEOFF_STEPS.length;

/**
 * Compact `n/total` for the step currently in progress, or null when no step is
 * actively running (ready / loiter / docked / aborted have nothing to count).
 */
function stepCounter(sim: PathfinderSim): string | null {
  if (sim.runState === 'loiter') return null;
  const idx = sim.steps.findIndex((s) => s.id === sim.activeId);
  if (idx < 0) return null;
  if (sim.phase === 'return') return `${idx + 1}/${sim.total}`;
  const base = sim.phase === 'takeoff' ? PREPARE_STEPS.length : 0;
  return `${base + idx + 1}/${LAUNCH_TOTAL}`;
}

/** The single line of text shown for the current state. */
function currentLabel(sim: PathfinderSim, locale: Locale): string {
  switch (sim.runState) {
    case 'awaiting-takeoff':
      return S.phaseLabel.ready[locale];
    case 'loiter':
      return S.phaseLabel.loiter[locale];
    case 'done':
      return S.phaseLabel.done[locale];
    case 'aborted':
      return S.phaseLabel.aborted[locale];
    default: {
      const active = sim.steps.find((s) => s.id === sim.activeId);
      return active ? active.label[locale] : S.phaseLabel.prepare[locale];
    }
  }
}

function StateIcon({ sim }: { sim: PathfinderSim }) {
  switch (sim.runState) {
    case 'error':
      return <AlertTriangle size={16} style={{ color: ERROR }} />;
    // Active work → "Origin Wave" dot-matrix loader (ripple from center) stands
    // in for the identity glyph. Explicit light color (not the theme-coupled
    // preset) so it stays legible on this deliberately fixed-dark monochrome card.
    case 'running':
      return (
        <DotmSquare12
          size={18}
          dotSize={3}
          speed={1.31}
          pattern="full"
          color="#d4d4d8"
          animated
          opacityBase={0.12}
          opacityMid={0.25}
          opacityPeak={1}
          ariaLabel="Working"
        />
      );
    // Aborted reads as parked/inert — same drone glyph, dimmed.
    case 'aborted':
      return <DroneDeviceIcon size={15} fill="#71717a" />;
    // Idle / ready / airborne / docked → the Pathfinder drone glyph.
    default:
      return <DroneDeviceIcon size={15} fill="#d4d4d8" />;
  }
}

export interface PathfinderLaunchToastProps {
  sim: PathfinderSim;
  locale: Locale;
  onDismiss?: () => void;
}

export function PathfinderLaunchToast({ sim, locale, onDismiss }: PathfinderLaunchToastProps) {
  const reduce = useReducedMotion();
  const isHe = locale === 'he';
  const label = currentLabel(sim, locale);
  const isError = sim.runState === 'error';
  const counter = stepCounter(sim);

  return (
    <div
      dir={isHe ? 'rtl' : 'ltr'}
      className="group flex w-[340px] items-center gap-3 rounded-[2px] bg-[#1c1c20] px-3.5 py-3 text-start shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_12px_40px_-8px_rgba(0,0,0,0.7)]"
    >
      {/* 1 · Icon / loader */}
      <span className="grid size-5 shrink-0 place-items-center">
        <StateIcon sim={sim} />
      </span>

      {/* 2 · Task label — clipped row so the swap never shifts layout. */}
      <div className="relative h-5 min-w-0 flex-1">
        <AnimatePresence initial={false}>
          <motion.span
            key={label}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -7 }}
            transition={reduce ? { duration: 0 } : spring.moderate}
            className="absolute inset-0 flex items-center truncate text-[13px] font-medium"
            style={{ color: isError ? ERROR : '#fafafa' }}
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Step counter — quiet progress marker for the in-flight step. */}
      <AnimatePresence initial={false}>
        {counter && (
          <motion.span
            key={counter}
            dir="ltr"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={reduce ? { duration: 0 } : spring.fast}
            className="shrink-0 font-mono text-[11px] tabular-nums text-zinc-500"
            style={{ color: isError ? ERROR : undefined }}
          >
            {counter}
          </motion.span>
        )}
      </AnimatePresence>

      {/* 3 · Context CTA */}
      <div className="flex shrink-0 items-center gap-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={sim.runState}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
            transition={reduce ? { duration: 0 } : spring.fast}
            className="flex items-center gap-1.5"
          >
            {/* Auto-running: the only command is to call it off. */}
            {sim.runState === 'running' && (
              <StopButton onClick={sim.abort}>{S.abort[locale]}</StopButton>
            )}
            {sim.runState === 'awaiting-takeoff' && (
              <>
                <StopButton onClick={sim.abort}>{S.abort[locale]}</StopButton>
                <PrimaryButton onClick={sim.takeoff}>{S.takeoff[locale]}</PrimaryButton>
              </>
            )}
            {sim.runState === 'loiter' && (
              <PrimaryButton onClick={sim.returnToBase} icon={<DockIcon size={14} />}>
                {S.returnToBase[locale]}
              </PrimaryButton>
            )}
            {sim.runState === 'error' && (
              <>
                <StopButton onClick={sim.abort}>{S.abort[locale]}</StopButton>
                <PrimaryButton onClick={sim.retry}>{S.retry[locale]}</PrimaryButton>
              </>
            )}
            {/* Terminal states — nothing to do but dismiss. */}
            {(sim.runState === 'done' || sim.runState === 'aborted') && onDismiss && (
              <GhostDismiss onClick={onDismiss} label={S.dismiss[locale]} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function PrimaryButton({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-7 items-center justify-center gap-1.5 rounded-[1px] bg-zinc-100 px-3 text-xs font-semibold text-zinc-900 transition-[background-color,transform] duration-150 hover:bg-white active:scale-95"
    >
      {icon}
      {children}
    </button>
  );
}

/**
 * Stop / abort — matches the video HUD's pathfinder "עצור": the filled-square
 * glyph in danger red. The lone splash of colour besides the fault state, kept
 * low-weight (ghost) so it never competes with the primary CTA.
 */
function StopButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-7 items-center justify-center gap-1.5 rounded-[1px] px-2.5 text-xs font-medium text-accent-danger/80 transition-[background-color,color] duration-150 hover:bg-accent-danger/10 hover:text-accent-danger active:scale-95"
    >
      <SquareFilled size={12} aria-hidden />
      {children}
    </button>
  );
}

function GhostDismiss({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-6 place-items-center rounded-[1px] text-zinc-600 opacity-0 transition-[color,opacity] duration-150 hover:text-zinc-300 focus-visible:opacity-100 group-hover:opacity-100"
    >
      <span className="text-[15px] leading-none">×</span>
    </button>
  );
}
