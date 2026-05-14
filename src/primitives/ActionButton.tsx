import React from "react";
import { Loader2 } from "@/lib/icons/central";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/shared/components/ui/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/shared/components/ui/tooltip";

/*
 * Variant base colors all route through the substrate / state /
 * accent tokens in src/styles/palette.css so a global theme tweak
 * (or .light preview) cascades through every ActionButton without
 * editing this file. Soft accent variants paint --accent-N-soft
 * against --slate-12 type so we land in APCA-pass territory on
 * substrate 3 (the default panel surface).
 */
export const ACTION_BUTTON_VARIANTS = {
  fill: {
    base: 'bg-state-pressed',
    hover: 'hover:bg-state-selected',
    active: 'active:bg-state-hover-strong',
    text: 'text-slate-11',
  },
  ghost: {
    base: 'bg-surface-4',
    hover: 'hover:bg-surface-5',
    active: 'active:bg-surface-3',
    text: 'text-slate-12',
  },
  outline: {
    base: 'bg-state-hover shadow-[0_0_0_1px_var(--border-default)]',
    hover: 'hover:bg-state-hover-strong',
    active: 'active:bg-state-hover',
    text: 'text-slate-10',
  },
  danger: {
    base: 'bg-accent-danger-soft',
    hover: 'hover:bg-accent-danger',
    active: 'active:bg-[color-mix(in_oklch,var(--accent-danger-soft)_80%,black)]',
    text: 'text-slate-12',
  },
  warning: {
    base: 'bg-accent-warning-soft',
    hover: 'hover:bg-accent-warning',
    active: 'active:bg-[color-mix(in_oklch,var(--accent-warning-soft)_80%,black)]',
    text: 'text-slate-12',
  },
} as const;

export type ActionButtonVariant = keyof typeof ACTION_BUTTON_VARIANTS;

export const ACTION_BUTTON_SIZES = {
  sm: { height: 'min-h-[30px] h-[30px]', text: 'text-xs', icon: 11, font: 'font-medium' },
  md: { height: 'min-h-8 h-8', text: 'text-xs', icon: 14, font: 'font-medium' },
  lg: { height: 'min-h-9 h-9', text: 'text-[13px]', icon: 16, font: 'font-semibold' },
} as const;

export type ActionButtonSize = keyof typeof ACTION_BUTTON_SIZES;

export function ActionButton({
  label,
  icon: Icon,
  onClick,
  variant = "fill",
  size = "md",
  className = "",
  disabled = false,
  loading = false,
  title,
  dataTour,
}: {
  label: string;
  icon?: React.ElementType;
  onClick?: (e: React.MouseEvent) => void;
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  title?: string;
  dataTour?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const isDisabled = disabled || loading;
  const c = ACTION_BUTTON_VARIANTS[variant];
  const sz = ACTION_BUTTON_SIZES[size];

  const btn = (
    <button
      type="button"
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 px-3 rounded overflow-hidden',
        sz.height, sz.text, sz.font, c.text,
        c.base, c.hover, c.active,
        'transition-[background-color,transform] duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color-mix(in_oklch,var(--slate-12)_30%,transparent)]',
        !loading && 'active:scale-[0.98] will-change-transform',
        isDisabled && !loading && 'opacity-45 pointer-events-none',
        loading && 'cursor-wait',
        className,
      )}
      {...(dataTour ? { "data-tour": dataTour } : {})}
      {...(loading ? { "aria-live": "polite" as const } : {})}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={label}
          className="flex items-center gap-2"
          transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', duration: 0.3, bounce: 0 }}
          initial={prefersReducedMotion ? false : { opacity: 0, y: -25 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0, y: 25 }}
        >
          {loading ? (
            <Loader2
              size={sz.icon}
              className={cn('shrink-0', prefersReducedMotion ? 'opacity-90' : 'animate-spin opacity-90')}
              aria-hidden="true"
            />
          ) : (
            Icon && <Icon size={sz.icon} className="shrink-0 opacity-95" aria-hidden="true" />
          )}
          <span className="whitespace-nowrap">{label}</span>
        </motion.span>
      </AnimatePresence>
    </button>
  );

  if (!title) return btn;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {title}
      </TooltipContent>
    </Tooltip>
  );
}
