import React from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/app/components/ui/dropdown-menu';

export interface SplitDropdownItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  disabled?: boolean;
  onClick: (e: React.MouseEvent) => void;
}

export interface SplitActionButtonProps {
  label: string;
  icon?: React.ElementType;
  variant?: 'primary' | 'secondary' | 'danger' | 'amber' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  /** When false, a disabled (non-loading) control stays at full opacity — e.g. completed jam. Default true. */
  dimDisabledShell?: boolean;
  onClick: (e: React.MouseEvent) => void;
  dropdownItems: SplitDropdownItem[];
  className?: string;
  dataTour?: string;
}

/** Solid fills (not outline rings). Chevron uses same ramp for a single control read. */
const colorByVariant: Record<
  string,
  { base: string; hover: string; active: string; text: string }
> = {
  primary: {
    base: 'bg-[#1971c2]',
    hover: 'hover:bg-[#228be6]',
    active: 'active:bg-[#1864ab]',
    text: 'text-white',
  },
  /* Literal OKLCH so JIT always emits rules (matches :root tactical red scale, hue 17) */
  danger: {
    base: 'bg-[oklch(0.348_0.111_17)]',
    hover: 'hover:bg-[oklch(0.445_0.151_17)]',
    active: 'active:bg-[oklch(0.295_0.082_17)]',
    text: 'text-[oklch(0.927_0.062_17)]',
  },
  amber: {
    base: 'bg-[oklch(0.348_0.111_70)]',
    hover: 'hover:bg-[oklch(0.445_0.151_70)]',
    active: 'active:bg-[oklch(0.295_0.082_70)]',
    text: 'text-[oklch(0.927_0.062_70)]',
  },
  glass: {
    base: 'bg-zinc-600',
    hover: 'hover:bg-zinc-500',
    active: 'active:bg-zinc-700',
    text: 'text-white',
  },
  secondary: {
    base: 'bg-[oklch(0.302_0_0)]',
    hover: 'hover:bg-[oklch(0.388_0_0)]',
    active: 'active:bg-[oklch(0.238_0_0)]',
    text: 'text-white',
  },
};

const sizeConfig = {
  sm: { height: 'min-h-[30px] h-[30px]', text: 'text-xs', icon: 11, chevronMin: 'min-w-[30px] w-[30px]', font: 'font-medium' },
  md: { height: 'min-h-8 h-8', text: 'text-xs', icon: 14, chevronMin: 'min-w-8 w-8', font: 'font-medium' },
  lg: { height: 'min-h-10 h-10', text: 'text-[13px]', icon: 16, chevronMin: 'min-w-10 w-10', font: 'font-semibold' },
};

export function SplitActionButton({
  label,
  icon: Icon,
  variant = 'primary',
  size = 'sm',
  disabled = false,
  loading = false,
  dimDisabledShell = true,
  onClick,
  dropdownItems,
  className = '',
  dataTour,
}: SplitActionButtonProps) {
  const prefersReducedMotion = useReducedMotion();
  const isDisabled = disabled || loading;
  const c = colorByVariant[variant] ?? colorByVariant.primary;
  const sz = sizeConfig[size];

  const segmentBase = `
    ${sz.height} ${sz.text} ${sz.font} ${c.text}
    ${c.base} ${c.hover} ${c.active}
    transition-[background-color,transform] duration-150 ease-out
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30
  `;

  const shellDimmed = dimDisabledShell && !loading && isDisabled;
  const disabledCls = shellDimmed ? 'opacity-45 pointer-events-none' : '';
  const spinnerCls = prefersReducedMotion ? 'opacity-90' : 'animate-spin opacity-90';

  const variantShells: Record<string, string> = {
    danger: 'rounded-[6px] ring-1 ring-inset ring-[oklch(0.348_0.111_17_/_0.45)]',
    amber: 'rounded-[6px] ring-1 ring-inset ring-[oklch(0.348_0.111_70_/_0.45)]',
  };
  const variantShell = variantShells[variant] ?? '';

  const chevronExtras =
    loading || isDisabled
      ? 'opacity-50 pointer-events-none cursor-default'
      : 'active:scale-[0.98] will-change-transform';

  return (
    <div
      className={`flex w-full items-stretch gap-0.5 ${variantShell} ${disabledCls} ${className}`}
      {...(dataTour ? { 'data-tour': dataTour } : {})}
      {...(loading ? { 'aria-busy': true as const } : {})}
    >
      {/* Primary — logical start (right in RTL) */}
      <button
        type="button"
        onClick={isDisabled ? undefined : (e) => { e.stopPropagation(); onClick(e); }}
        disabled={isDisabled}
        className={`
          flex-1 flex items-center justify-center gap-2 px-3
          rounded-s-[4px] overflow-hidden
          ${loading ? 'cursor-wait pointer-events-none' : 'active:scale-[0.98] will-change-transform'}
          ${segmentBase}
        `}
        {...(loading ? { 'aria-live': 'polite' as const } : {})}
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
              <Loader2 size={sz.icon} className={spinnerCls} aria-hidden="true" />
            ) : (
              Icon && <Icon size={sz.icon} className="shrink-0 opacity-95" aria-hidden="true" />
            )}
            <span>{label}</span>
          </motion.span>
        </AnimatePresence>
      </button>

      {/* Chevron — gap-0.5 (2px) mocks divider; shows card surface behind */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={isDisabled}>
          <button
            type="button"
            className={`
              ${sz.chevronMin} px-2
              flex items-center justify-center shrink-0
              rounded-e-[4px]
              ${segmentBase}
              ${chevronExtras}
            `}
            aria-label="פעולות נוספות"
            aria-disabled={isDisabled}
            onClick={(e) => e.stopPropagation()}
          >
            <ChevronDown size={Math.max(sz.icon - 2, 10)} className="opacity-90" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          dir="rtl"
          side="bottom"
          align="start"
          sideOffset={6}
          className={`
            min-w-[140px] p-1 rounded-lg
            bg-[#1c1c20] text-white
            shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_30px_rgba(0,0,0,0.5)]
            border-none
            ${prefersReducedMotion
              ? 'data-[state=open]:animate-none data-[state=closed]:animate-none'
              : ''}
          `}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {dropdownItems.map((item) => {
            const ItemIcon = item.icon;
            return (
              <DropdownMenuItem
                key={item.id}
                disabled={item.disabled}
                className="flex w-full flex-row items-center justify-start gap-2 px-2.5 py-2 rounded-md text-xs text-zinc-200 cursor-pointer transition-[background-color,color] duration-150 ease-out hover:bg-white/[0.08] hover:text-white focus:bg-white/[0.08] focus:text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  item.onClick(e);
                }}
              >
                {ItemIcon && <ItemIcon size={14} className="shrink-0" aria-hidden="true" />}
                <span className="min-w-0 flex-1 text-start">{item.label}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
