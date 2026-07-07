import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { spring, springExit } from "@/lib/springs";
import { cn } from "@/shared/components/ui/utils";
import { Button as UiButton } from "@/shared/components/ui/button";
import { AppLoader } from "@/shared/components/ui/app-loader";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/shared/components/ui/tooltip";
import {
  BUTTON_VARIANTS,
  BUTTON_SIZES,
  BUTTON_PRESSED_CLASSES,
  type ButtonVariant,
  type ButtonSize,
} from "./buttonTokens";

export { BUTTON_VARIANTS, BUTTON_SIZES, type ButtonVariant, type ButtonSize };

export interface ButtonProps {
  /** Visible text. Animates (cross-fades) on change. */
  label: string;
  /** Optional leading icon component. Swapped for a spinner while `loading`. */
  icon?: React.ElementType;
  /** Optional trailing pill rendered after the label (e.g. a selected-track name). Hidden while `loading`. */
  badge?: string;
  onClick?: (e: React.MouseEvent) => void;
  /** Surface treatment, aliased onto the ui/button cva. Defaults to `fill`. */
  variant?: ButtonVariant;
  /** Height + type scale, aliased onto the ui/button cva. Defaults to `md`. */
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
  /** Show a spinner and block interaction without reading as "unavailable". */
  loading?: boolean;
  /**
   * Toggle "on" state. When defined, the button advertises `aria-pressed`
   * and — when `true` — fills with a brighter white surface (inset ring +
   * higher-opacity background) over the chosen variant. Leave undefined for
   * plain (non-toggle) buttons.
   */
  pressed?: boolean;
  /** When set, wraps the button in a tooltip with this text. */
  title?: string;
  /**
   * Render the merged classes/handlers onto the child element instead of a
   * native `<button>` (Radix Slot). The child owns its own content, so the
   * animated icon/label is not rendered in this mode. Use for links etc.
   */
  asChild?: boolean;
  children?: React.ReactNode;
  /**
   * `data-handoff-component` stamp used by the picker / styleguide deep-link.
   * Defaults to `button`; presets override it (e.g. ActionButton → `action-button`).
   */
  dataHandoff?: string;
}

/**
 * The base button primitive — the "father" of the button family.
 *
 * A thin composition over the ONE shadcn Button (`ui/button.tsx`): the cva
 * there owns every surface + size treatment; this layer only maps the domain
 * vocabulary (`fill/ghost/outline/danger/warning`, `sm/md/lg`) onto the cva
 * via `buttonTokens.ts` and adds the domain behavior — the animated
 * icon+label crossfade, the loading spinner swap, the badge pill, the tooltip
 * wrapper, and the pressed (toggle-on) surface. ActionButton and
 * SplitActionButton are presets/composites of the same foundation.
 */
export function Button({
  label,
  icon: Icon,
  badge,
  onClick,
  variant = "fill",
  size = "md",
  className = "",
  disabled = false,
  loading = false,
  pressed,
  title,
  asChild = false,
  children,
  dataHandoff = "button",
}: ButtonProps) {
  const prefersReducedMotion = useReducedMotion();
  const isDisabled = disabled || loading;
  const sz = BUTTON_SIZES[size];

  const btn = (
    <UiButton
      asChild={asChild}
      {...(asChild ? {} : { type: "button" as const })}
      data-handoff-component={dataHandoff}
      onClick={isDisabled ? undefined : onClick}
      disabled={asChild ? undefined : isDisabled}
      aria-pressed={pressed}
      variant={BUTTON_VARIANTS[variant]}
      size={BUTTON_SIZES[size].ui}
      className={cn(
        'px-3 overflow-hidden',
        'duration-[var(--motion-fast)]',
        !loading && 'will-change-transform',
        // asChild renders onto a non-button element, so the cva's disabled:
        // pseudo-class styles never apply — mirror them as plain classes.
        isDisabled && !loading && 'opacity-45 pointer-events-none',
        // Loading blocks input via the native disabled attribute but must not
        // read as "unavailable": keep full opacity and show the wait cursor.
        loading && 'cursor-wait disabled:pointer-events-auto disabled:opacity-100',
        pressed && BUTTON_PRESSED_CLASSES,
        className,
      )}
      {...(loading ? { "aria-live": "polite" as const } : {})}
    >
      {asChild ? (
        children
      ) : (
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={label}
            className="flex items-center gap-2"
            transition={prefersReducedMotion ? { duration: 0 } : spring.moderate}
            initial={prefersReducedMotion ? false : { opacity: 0, y: -25 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: 25, transition: springExit.moderate }}
          >
            {loading ? (
              <AppLoader size={sz.icon} label={label} className="shrink-0 opacity-90" />
            ) : (
              // The explicit size-* class keeps the glyph at the family's
              // per-size scale (the cva would otherwise force svgs to size-4).
              Icon && <Icon size={sz.icon} className={cn('shrink-0 opacity-95', sz.iconCls)} aria-hidden="true" />
            )}
            <span className="whitespace-nowrap">{label}</span>
            {badge && !loading && (
              <span className="text-xs font-medium bg-white/[0.12] px-1.5 py-0.5 rounded leading-none whitespace-nowrap">
                {badge}
              </span>
            )}
          </motion.span>
        </AnimatePresence>
      )}
    </UiButton>
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
