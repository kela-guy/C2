import React from 'react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/shared/components/ui/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/shared/components/ui/dropdown-menu';

export interface SplitDropdownItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  disabled?: boolean;
  checked?: boolean;
  onClick: (e: React.MouseEvent) => void;
}

export interface SplitDropdownGroup {
  label?: string;
  items: SplitDropdownItem[];
}

export const SPLIT_BUTTON_VARIANTS = {
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
} as const;

export type SplitButtonVariant = keyof typeof SPLIT_BUTTON_VARIANTS;

export const SPLIT_BUTTON_SIZES = {
  sm: { height: 'min-h-[30px] h-[30px]', text: 'text-xs', icon: 11, chevronMin: 'min-w-[30px] w-[30px]', font: 'font-medium' },
  md: { height: 'min-h-8 h-8', text: 'text-xs', icon: 14, chevronMin: 'min-w-8 w-8', font: 'font-medium' },
  lg: { height: 'min-h-9 h-9', text: 'text-[13px]', icon: 16, chevronMin: 'min-w-9 w-9', font: 'font-semibold' },
} as const;

export type SplitButtonSize = keyof typeof SPLIT_BUTTON_SIZES;

export interface SplitActionButtonProps {
  label: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ElementType;
  variant?: SplitButtonVariant;
  size?: SplitButtonSize;
  disabled?: boolean;
  loading?: boolean;
  /** When false, a disabled (non-loading) control stays at full opacity -- e.g. completed jam. Default true. */
  dimDisabledShell?: boolean;
  onClick: (e: React.MouseEvent) => void;
  onHover?: (hovering: boolean) => void;
  dropdownItems: SplitDropdownItem[];
  dropdownGroups?: SplitDropdownGroup[];
  className?: string;
  dataTour?: string;
}

export function SplitActionButton({
  label,
  subtitle,
  badge,
  icon: Icon,
  variant = 'fill',
  size = 'sm',
  disabled = false,
  loading = false,
  dimDisabledShell = true,
  onClick,
  onHover,
  dropdownItems,
  dropdownGroups,
  className = '',
  dataTour,
}: SplitActionButtonProps) {
  const prefersReducedMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const isDisabled = disabled || loading;
  const c = SPLIT_BUTTON_VARIANTS[variant];
  const sz = SPLIT_BUTTON_SIZES[size];

  const hasSubtitle = !!subtitle && !loading;
  const hasBadge = !!badge && !loading;

  const segmentBase = cn(
    !hasSubtitle && sz.height, sz.text, sz.font, c.text,
    c.base, c.hover, c.active,
    'transition-[background-color,transform] duration-150 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30',
  );

  const shellDimmed = dimDisabledShell && !loading && isDisabled;
  const disabledCls = shellDimmed ? 'opacity-45 pointer-events-none' : '';

  const variantShells: Record<string, string> = {
    danger: '',
    warning: '',
  };
  const variantShell = variantShells[variant] ?? '';

  const chevronExtras =
    loading || isDisabled
      ? 'opacity-50 pointer-events-none cursor-default'
      : 'active:scale-[0.98] will-change-transform';

  return (
    <div
      className={cn(
        'flex w-full items-stretch gap-0.5 rounded',
        variantShell,
        disabledCls,
        className,
      )}
      {...(dataTour ? { 'data-tour': dataTour } : {})}
      {...(loading ? { 'aria-busy': true as const } : {})}
    >
      <button
        type="button"
        onClick={isDisabled ? undefined : (e) => { e.stopPropagation(); onClick(e); }}
        disabled={isDisabled}
        onMouseEnter={onHover ? () => onHover(true) : undefined}
        onMouseLeave={onHover ? () => onHover(false) : undefined}
        className={cn(
          segmentBase,
          'flex flex-1 items-center justify-center gap-2 px-3',
          'min-w-0 overflow-hidden rounded-s-[4px]',
          loading ? 'cursor-wait pointer-events-none' : 'active:scale-[0.98] will-change-transform',
        )}
        {...(loading ? { 'aria-live': 'polite' as const } : {})}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={label}
            className={cn('flex items-center gap-2', hasSubtitle && 'py-1')}
            transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', duration: 0.3, bounce: 0 }}
            initial={prefersReducedMotion ? false : { opacity: 0, y: -25 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: 25 }}
          >
            {loading ? (
              <Loader2 size={sz.icon} className={cn('shrink-0', prefersReducedMotion ? 'opacity-90' : 'animate-spin opacity-90')} aria-hidden="true" />
            ) : (
              Icon && <Icon size={sz.icon} className="shrink-0 opacity-95" aria-hidden="true" />
            )}
            {hasSubtitle ? (
              <span className="flex flex-col items-start leading-tight">
                <span>{label}</span>
                <span className="text-[10px] opacity-60 font-normal">{subtitle}</span>
              </span>
            ) : (
              <span>{label}</span>
            )}
            {hasBadge && (
              <span className="text-[10px] font-medium bg-white/[0.12] px-1.5 py-0.5 rounded leading-none whitespace-nowrap">
                {badge}
              </span>
            )}
          </motion.span>
        </AnimatePresence>
      </button>

      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild disabled={isDisabled}>
          <button
            type="button"
            className={cn(
              segmentBase,
              sz.chevronMin,
              'flex shrink-0 items-center justify-center px-2 rounded-e-[4px]',
              chevronExtras,
            )}
            aria-label="פעולות נוספות"
            aria-disabled={isDisabled}
            onClick={(e) => e.stopPropagation()}
          >
            <ChevronDown
              size={Math.max(sz.icon - 2, 10)}
              className={cn(
                'opacity-90 transition-transform duration-200',
                menuOpen && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side="bottom"
          align="end"
          sideOffset={6}
          dir="rtl"
          className={cn(
            'min-w-[140px] rounded-lg border-none p-1 origin-top-left',
            'bg-[#1c1c20] text-white',
            'shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_30px_rgba(0,0,0,0.5)]',
            prefersReducedMotion && 'data-[state=open]:animate-none data-[state=closed]:animate-none',
          )}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {dropdownGroups ? (
            dropdownGroups.map((group, gi) => (
              <React.Fragment key={group.label ?? gi}>
                {gi > 0 && <DropdownMenuSeparator className="my-1 bg-white/10" />}
                <DropdownMenuGroup>
                  {group.label && (
                    <DropdownMenuLabel className="px-2.5 py-1.5 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                      {group.label}
                    </DropdownMenuLabel>
                  )}
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <DropdownMenuItem
                        key={item.id}
                        disabled={item.disabled}
                        className="flex w-full flex-row items-center justify-start gap-2 rounded-md px-2.5 py-2 text-xs text-zinc-200 cursor-pointer transition-[background-color,color] duration-150 ease-out hover:bg-white/[0.08] hover:text-white focus:bg-white/[0.08] focus:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          item.onClick(e);
                        }}
                      >
                        {item.checked != null ? (
                          <span className="w-3.5 shrink-0 flex items-center justify-center">
                            {item.checked && <Check size={12} className="text-emerald-400" aria-hidden="true" />}
                          </span>
                        ) : (
                          ItemIcon && <ItemIcon size={14} className="shrink-0" aria-hidden="true" />
                        )}
                        <span className="min-w-0 flex-1 text-start">{item.label}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>
              </React.Fragment>
            ))
          ) : (
            dropdownItems.map((item) => {
              const ItemIcon = item.icon;
              return (
                <DropdownMenuItem
                  key={item.id}
                  disabled={item.disabled}
                  className="flex w-full flex-row items-center justify-start gap-2 rounded-md px-2.5 py-2 text-xs text-zinc-200 cursor-pointer transition-[background-color,color] duration-150 ease-out hover:bg-white/[0.08] hover:text-white focus:bg-white/[0.08] focus:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    item.onClick(e);
                  }}
                >
                  {ItemIcon && <ItemIcon size={14} className="shrink-0" aria-hidden="true" />}
                  <span className="min-w-0 flex-1 text-start">{item.label}</span>
                </DropdownMenuItem>
              );
            })
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
