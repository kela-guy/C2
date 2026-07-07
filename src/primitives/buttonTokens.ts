/**
 * Alias layer between the button family's domain vocabulary and the ONE
 * shadcn `buttonVariants` cva in `@/shared/components/ui/button`.
 *
 * The cva is the single source of truth for every surface + size treatment.
 * This module only maps the primitives' public prop vocabulary
 * (`fill | ghost | outline | danger | warning`, `sm | md | lg`) onto the cva
 * variant/size names, and carries the little layout data the cva has no home
 * for (icon pixel sizes, the SplitActionButton chevron slot). No classes for
 * surfaces live here anymore — restyle `ui/button.tsx` to retheme the family.
 */

import type { VariantProps } from 'class-variance-authority';
import type { buttonVariants } from '@/shared/components/ui/button';

type UiButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;
type UiButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;

/**
 * Domain variant → cva variant. The keys are the public API of the button
 * family (`<Button variant="fill">` etc.); the values are the cva variants
 * of `ui/button.tsx` that actually own the styling.
 */
export const BUTTON_VARIANTS = {
  fill: 'default',
  ghost: 'secondary',
  outline: 'outline',
  danger: 'destructive',
  warning: 'warning',
} as const satisfies Record<string, UiButtonVariant>;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;

/**
 * The brighter white "pressed / on" surface shared by toggle-capable members
 * of the family — Button's `pressed` state and CameraToggleButton's live
 * state render this same treatment so "on" always reads identically.
 */
export const BUTTON_PRESSED_CLASSES =
  'bg-white/[0.20] hover:bg-white/[0.24] active:bg-white/[0.16] text-white ring-1 ring-inset ring-white/20';

/**
 * Domain size → cva size, plus per-size layout data the cva doesn't carry:
 * `icon` is the icon glyph pixel size (`iconCls` is the same size as a class,
 * which also opts the glyph out of the cva's default `svg → size-4` rule) and
 * `chevronMin` reserves a square trailing slot for the SplitActionButton
 * dropdown chevron so the two-segment shell keeps a stable footprint across
 * sizes (`chevronCls` sizes the chevron glyph itself).
 */
export const BUTTON_SIZES = {
  sm: { ui: 'sm', icon: 11, iconCls: 'size-[11px]', chevronCls: 'size-2.5', chevronMin: 'min-w-[30px] w-[30px]' },
  md: { ui: 'default', icon: 14, iconCls: 'size-3.5', chevronCls: 'size-3', chevronMin: 'min-w-8 w-8' },
  lg: { ui: 'lg', icon: 16, iconCls: 'size-4', chevronCls: 'size-3.5', chevronMin: 'min-w-9 w-9' },
} as const satisfies Record<
  string,
  { ui: UiButtonSize; icon: number; iconCls: string; chevronCls: string; chevronMin: string }
>;

export type ButtonSize = keyof typeof BUTTON_SIZES;
