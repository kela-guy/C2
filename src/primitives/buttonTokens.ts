/**
 * Single source of truth for the button family's surface + size tokens.
 *
 * The base `Button` and every composite/preset built on it (ActionButton,
 * SplitActionButton, CameraToggleButton, …) read their variant treatments and
 * size scale from here, so the family can never drift apart the way the old
 * parallel `ACTION_BUTTON_VARIANTS` / `SPLIT_BUTTON_VARIANTS` copies did.
 *
 * `danger` / `warning` use oklch so they read correctly on the dark
 * control-room surface; the others are layered white opacities (one depth
 * strategy, no harsh borders).
 */

export const BUTTON_VARIANTS = {
  fill: {
    base: 'bg-white/[0.08]',
    hover: 'hover:bg-white/[0.14]',
    active: 'active:bg-white/[0.06]',
    text: 'text-zinc-200',
  },
  ghost: {
    base: 'bg-zinc-800',
    hover: 'hover:bg-zinc-700',
    active: 'active:bg-zinc-900',
    text: 'text-white',
  },
  outline: {
    base: 'bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]',
    hover: 'hover:bg-white/[0.06]',
    active: 'active:bg-white/[0.02]',
    text: 'text-zinc-400',
  },
  danger: {
    base: 'bg-[oklch(0.435_0.151_25)]',
    hover: 'hover:bg-[oklch(0.485_0.151_25)]',
    active: 'active:bg-[oklch(0.385_0.151_25)]',
    text: 'text-white',
  },
  warning: {
    base: 'bg-[oklch(0.501_0.166_75)]',
    hover: 'hover:bg-[oklch(0.551_0.166_75)]',
    active: 'active:bg-[oklch(0.451_0.166_75)]',
    text: 'text-white',
  },
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;

/**
 * Height + type scale. `chevronMin` reserves a square trailing slot for the
 * SplitActionButton dropdown chevron so the two-segment shell keeps a stable
 * footprint across sizes.
 */
export const BUTTON_SIZES = {
  sm: { height: 'min-h-[30px] h-[30px]', text: 'text-xs', icon: 11, font: 'font-medium', chevronMin: 'min-w-[30px] w-[30px]' },
  md: { height: 'min-h-8 h-8', text: 'text-xs', icon: 14, font: 'font-medium', chevronMin: 'min-w-8 w-8' },
  lg: { height: 'min-h-9 h-9', text: 'text-sm', icon: 16, font: 'font-semibold', chevronMin: 'min-w-9 w-9' },
} as const;

export type ButtonSize = keyof typeof BUTTON_SIZES;
