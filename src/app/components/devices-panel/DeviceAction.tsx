/**
 * The single device control primitive.
 *
 * Every footer + inline action in the device card renders through this
 * one component, so sizing, focus rings, press feedback, loading, and
 * disabled-reason tooltips are identical everywhere. Color/meaning comes
 * from `tone`; the fill treatment (solid footer pill vs ghost header
 * glyph) comes from `ghost`.
 */

import type { ReactNode } from 'react';
import { cn } from '../ui/utils';
import { AppLoader } from '../ui/app-loader';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { ReasonTooltip } from './controls/ReasonTooltip';
import { DEVICE_ACTION_TONES, type DeviceActionTone } from './deviceActionTones';

export interface DeviceActionProps {
  /** Leading glyph. Swapped for a spinner while `loading`. */
  icon: ReactNode;
  /**
   * Visible text. Omitted for `iconOnly` controls. Accepts a node so callers
   * can reserve a stable width across toggle states (e.g. a grid-stacked
   * on/off label) without the button resizing.
   */
  label?: ReactNode;
  /** Render as a compact square glyph button (header cluster). */
  iconOnly?: boolean;
  /** Semantic color. Defaults to `neutral`. */
  tone?: DeviceActionTone;
  /** Transparent idle surface (header) instead of the solid footer pill. */
  ghost?: boolean;
  /** Toggled-on visual + `aria-pressed`. */
  pressed?: boolean;
  /** Show a spinner and block interaction without dimming as "disabled". */
  loading?: boolean;
  disabled?: boolean;
  /** When disabled, the reason shown in a tooltip (operator clarity). */
  disabledReason?: string | null;
  /** Hint tooltip shown in the enabled state (e.g. pin/unpin). */
  tooltip?: string;
  ariaLabel?: string;
  onClick?: () => void;
  className?: string;
  dataHandoff?: string;
}

export function DeviceAction({
  icon,
  label,
  iconOnly = false,
  tone = 'neutral',
  ghost = false,
  pressed = false,
  loading = false,
  disabled = false,
  disabledReason,
  tooltip,
  ariaLabel,
  onClick,
  className,
  dataHandoff,
}: DeviceActionProps) {
  const tones = DEVICE_ACTION_TONES[tone];
  const toneClass = pressed ? tones.pressed : ghost ? tones.ghostBase : tones.base;
  const isDisabled = disabled || loading;

  const button = (
    <button
      type="button"
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-pressed={pressed}
      aria-busy={loading || undefined}
      data-handoff-component={dataHandoff}
      onClick={(e) => {
        // The row container is itself a button; never let an action
        // press bubble up into expand/collapse.
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded text-xs font-medium',
        'transition-[background-color,color,transform] duration-[var(--motion-fast)] ease-out',
        'active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring',
        'disabled:cursor-not-allowed',
        // `loading` blocks input but should not read as "unavailable",
        // so only dim for a true disabled state.
        disabled && !loading ? 'disabled:opacity-50' : '',
        iconOnly ? 'size-6 p-0 [&_svg]:size-3' : 'px-2.5 py-1.5',
        toneClass,
        className,
      )}
    >
      {loading ? (
        <AppLoader
          size={12}
          label={ariaLabel ?? (typeof label === 'string' ? label : undefined) ?? 'Loading'}
        />
      ) : (
        icon
      )}
      {!iconOnly && label ? <span>{label}</span> : null}
    </button>
  );

  if (isDisabled && disabledReason) {
    return <ReasonTooltip reason={disabledReason}>{button}</ReasonTooltip>;
  }

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
            {button}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6} className="whitespace-nowrap">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}
