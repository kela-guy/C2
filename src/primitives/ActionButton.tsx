import React from "react";
import { Loader2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/shared/components/ui/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/shared/components/ui/tooltip";

const colorByVariant: Record<
  string,
  { base: string; hover: string; active: string; text: string }
> = {
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
};

const sizeConfig = {
  sm: { height: 'min-h-[30px] h-[30px]', text: 'text-xs', icon: 11, font: 'font-medium' },
  md: { height: 'min-h-8 h-8', text: 'text-xs', icon: 14, font: 'font-medium' },
  lg: { height: 'min-h-9 h-9', text: 'text-[13px]', icon: 16, font: 'font-semibold' },
};

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
  variant?: "fill" | "ghost" | "danger" | "warning";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  title?: string;
  dataTour?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const isDisabled = disabled || loading;
  const c = colorByVariant[variant] ?? colorByVariant.fill;
  const sz = sizeConfig[size];

  const btn = (
    <button
      type="button"
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={cn(
        'inline-flex flex-1 items-center justify-center gap-2 px-3 rounded overflow-hidden',
        sz.height, sz.text, sz.font, c.text,
        c.base, c.hover, c.active,
        'transition-[background-color,transform] duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30',
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
          <span>{label}</span>
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
