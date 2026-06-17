/**
 * Spring motion tokens — the single source of truth for UI animation timing.
 *
 * Adapted from the Fluid Functionalism three-spring system
 * (https://www.fluidfunctionalism.com/docs/motion) to this codebase's existing
 * framer-motion `{ type:'spring', duration, bounce }` convention (see the label
 * cross-fade in `src/primitives/Button.tsx`).
 *
 * Three speeds, nothing invents its own timing:
 *   - `fast`     0.08s, no bounce  -> hover, focus rings, fades, small toggles,
 *                                     checkbox/radio, tooltip, table rows, slider
 *   - `moderate` 0.16s, light bounce -> dropdown, tabs indicator, switch thumb,
 *                                     accordion, chat bubbles, mobile drawer
 *   - `slow`     0.24s, more bounce -> dialog, ask-user questions, thinking steps
 *
 * Slow in, faster out: every exit runs one tier quicker and drops the bounce
 * (plain tween) so closes never drag. Pair `spring.x` (enter) with
 * `springExit.x` (exit).
 *
 * Reduced motion is handled app-wide by `<MotionConfig reducedMotion="user">`
 * in `src/app/App.tsx`; consumers generally no longer need to gate transitions
 * by hand. Use `reducedTransition` only where a component must hard-disable
 * motion outside framer-motion's reduced-motion handling.
 *
 * The `--motion-*` CSS custom properties in `src/styles/theme.css` mirror
 * `springMs` so the CSS/Radix-overlay layer animates on the same numbers.
 */

export type SpringToken = {
  type: 'spring';
  duration: number;
  bounce: number;
};

export type ExitToken = {
  type: 'tween';
  duration: number;
  ease: [number, number, number, number];
};

export type SpeedName = 'fast' | 'moderate' | 'slow';

/** Entrance springs. Durations are in seconds (framer-motion units). */
export const spring: Record<SpeedName, SpringToken> = {
  fast: { type: 'spring', duration: 0.08, bounce: 0 },
  moderate: { type: 'spring', duration: 0.16, bounce: 0.08 },
  slow: { type: 'spring', duration: 0.24, bounce: 0.12 },
};

/**
 * Exit tweens — one tier faster than the matching entrance, no bounce.
 * `ease` is an accelerating curve (slow start, fast finish) so the element
 * commits to leaving immediately.
 */
export const springExit: Record<SpeedName, ExitToken> = {
  fast: { type: 'tween', duration: 0.06, ease: [0.4, 0, 1, 1] },
  moderate: { type: 'tween', duration: 0.12, ease: [0.4, 0, 1, 1] },
  slow: { type: 'tween', duration: 0.16, ease: [0.4, 0, 1, 1] },
};

/**
 * Millisecond durations for the CSS-driven layer (Radix overlays styled with
 * tw-animate-css / Tailwind duration utilities). Mirrors `--motion-*` in
 * `theme.css`.
 */
export const springMs = {
  fast: 80,
  moderate: 160,
  slow: 240,
  fastExit: 60,
  moderateExit: 120,
  slowExit: 160,
} as const;

/** A transition that disables motion entirely (instant). */
export const reducedTransition = { duration: 0 } as const;

export type EntrancePreset = {
  initial: { opacity: number; y: number };
  animate: { opacity: number; y: number };
  exit: { opacity: number; y: number };
  transition: SpringToken;
};

/**
 * Build a ready-to-spread framer-motion preset for the common "fade + slide
 * in from a small offset" entrance, so components stop hand-writing
 * initial/animate/exit. Pair with `<AnimatePresence>` and supply
 * `transition={springExit[speed]}` on the element's `exit` when you need the
 * faster-out behaviour, or rely on the entrance transition for symmetric moves.
 *
 * @param speed   Which spring tier to use.
 * @param offset  Vertical travel in px for the enter/exit (default 8).
 */
export function entrance(speed: SpeedName, offset = 8): EntrancePreset {
  return {
    initial: { opacity: 0, y: -offset },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: offset },
    transition: spring[speed],
  };
}
