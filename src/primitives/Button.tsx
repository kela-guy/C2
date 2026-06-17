import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { spring, springExit } from "@/lib/springs";
import { cn } from "@/shared/components/ui/utils";
import { AppLoader } from "@/shared/components/ui/app-loader";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/shared/components/ui/tooltip";
import {
  BUTTON_VARIANTS,
  BUTTON_SIZES,
  type ButtonVariant,
  type ButtonSize,
} from "./buttonTokens";

export { BUTTON_VARIANTS, BUTTON_SIZES, type ButtonVariant, type ButtonSize };

export interface ButtonProps {
  /** Visible text. Animates (cross-fades) on change. */
  label: string;
  /** Optional leading icon component. Swapped for a spinner while `loading`. */
  icon?: React.ElementType;
  onClick?: (e: React.MouseEvent) => void;
  /** Surface treatment. Danger/warning use oklch. Defaults to `fill`. */
  variant?: ButtonVariant;
  /** Height + type scale. Defaults to `md`. */
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
 * Owns the shared button DNA: the variant + size token system, the full state
 * set (default / hover / active / focus-visible / disabled / loading /
 * pressed), the focus ring, press feedback, the loading spinner swap, and the
 * animated icon+label. Every other button (ActionButton, CameraToggleButton,
 * SplitActionButton, …) is a preset or composite built on top of this or its
 * tokens, so the family stays visually unified.
 */
export function Button({
  label,
  icon: Icon,
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
  const c = BUTTON_VARIANTS[variant];
  const sz = BUTTON_SIZES[size];

  const Comp = asChild ? Slot : "button";

  const btn = (
    <Comp
      {...(asChild ? {} : { type: "button" as const })}
      data-handoff-component={dataHandoff}
      onClick={isDisabled ? undefined : onClick}
      disabled={asChild ? undefined : isDisabled}
      aria-pressed={pressed}
      className={cn(
        'inline-flex items-center justify-center gap-2 px-3 rounded overflow-hidden',
        sz.height, sz.text, sz.font, c.text,
        c.base, c.hover, c.active,
        'transition-[background-color,box-shadow,transform] duration-[var(--motion-fast)] ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30',
        !loading && 'active:scale-[0.98] will-change-transform',
        isDisabled && !loading && 'opacity-45 pointer-events-none',
        loading && 'cursor-wait',
        pressed &&
          'bg-white/[0.20] hover:bg-white/[0.24] active:bg-white/[0.16] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]',
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
              Icon && <Icon size={sz.icon} className="shrink-0 opacity-95" aria-hidden="true" />
            )}
            <span className="whitespace-nowrap">{label}</span>
          </motion.span>
        </AnimatePresence>
      )}
    </Comp>
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
