import React from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/components/ui/utils';
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

const colorByVariant: Record<
  string,
  { base: string; hover: string; active: string; text: string }
> = {
  primary: {
    base: 'bg-sky-500/15',
    hover: 'hover:bg-sky-500/25',
    active: 'active:bg-sky-500/35',
    text: 'text-sky-300',
  },
  danger: {
    base: 'bg-red-950/80',
    hover: 'hover:bg-red-900/85',
    active: 'active:bg-red-950',
    text: 'text-red-200',
  },
  amber: {
    base: 'bg-amber-950/60',
    hover: 'hover:bg-amber-900/70',
    active: 'active:bg-amber-950/80',
    text: 'text-amber-200',
  },
  glass: {
    base: 'bg-white/10',
    hover: 'hover:bg-white/15',
    active: 'active:bg-white/20',
    text: 'text-white',
  },
  secondary: {
    base: 'bg-zinc-800',
    hover: 'hover:bg-zinc-700',
    active: 'active:bg-zinc-900',
    text: 'text-white',
  },
};

const sizeConfig = {
  sm: {
    height: 'min-h-[30px] h-[30px]',
    text: 'text-xs',
    icon: 11,
    chevronMin: 'min-w-[30px] w-[30px]',
    font: 'font-medium',
    svgOverride: '[&_svg]:!size-[11px]',
    chevronSvg: '[&_svg]:!size-[10px]',
  },
  md: {
    height: 'min-h-8 h-8',
    text: 'text-xs',
    icon: 14,
    chevronMin: 'min-w-8 w-8',
    font: 'font-medium',
    svgOverride: '[&_svg]:!size-3.5',
    chevronSvg: '[&_svg]:!size-3',
  },
  lg: {
    height: 'min-h-9 h-9',
    text: 'text-[13px]',
    icon: 16,
    chevronMin: 'min-w-9 w-9',
    font: 'font-semibold',
    svgOverride: '[&_svg]:!size-4',
    chevronSvg: '[&_svg]:!size-3.5',
  },
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
  const [menuOpen, setMenuOpen] = React.useState(false);
  const isDisabled = disabled || loading;
  const c = colorByVariant[variant] ?? colorByVariant.primary;
  const sz = sizeConfig[size];

  const segmentClassName = cn(
    sz.height,
    sz.text,
    sz.font,
    c.text,
    c.base,
    c.hover,
    c.active,
    'rounded-none shadow-none transition-[background-color,transform] duration-150 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30 focus-visible:ring-offset-0',
    'border-0 disabled:opacity-100',
  );

  const shellDimmed = dimDisabledShell && !loading && isDisabled;
  const disabledCls = shellDimmed ? 'opacity-45 pointer-events-none' : '';

  const variantShells: Record<string, string> = {
    danger: 'ring-1 ring-inset ring-red-600/45',
    amber: 'ring-1 ring-inset ring-amber-600/45',
  };
  const variantShell = variantShells[variant] ?? '';

  const chevronExtras =
    loading || isDisabled
      ? 'opacity-50 pointer-events-none cursor-default'
      : 'active:scale-[0.98] will-change-transform';

  return (
    <div
      className={cn(
        'flex w-full items-stretch gap-0.5 rounded-[6px]',
        variantShell,
        disabledCls,
        className,
      )}
      {...(dataTour ? { 'data-tour': dataTour } : {})}
      {...(loading ? { 'aria-busy': true as const } : {})}
    >
      <Button
        type="button"
        variant="ghost"
        disabled={isDisabled}
        onClick={isDisabled ? undefined : (e) => { e.stopPropagation(); onClick(e); }}
        className={cn(
          segmentClassName,
          sz.svgOverride,
          'flex-1 min-w-0 justify-center gap-2 px-3 overflow-hidden rounded-s-[4px]',
          loading ? 'cursor-wait pointer-events-none' : 'active:scale-[0.98] will-change-transform',
        )}
        {...(loading ? { 'aria-live': 'polite' as const } : {})}
      >
        <span className="flex items-center gap-2">
          {loading ? (
            <Loader2 size={sz.icon} className="shrink-0 animate-spin opacity-90" aria-hidden="true" />
          ) : (
            Icon && <Icon size={sz.icon} className="shrink-0 opacity-95" aria-hidden="true" />
          )}
          <span>{label}</span>
        </span>
      </Button>

      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild disabled={isDisabled}>
          <Button
            type="button"
            variant="ghost"
            className={cn(
              segmentClassName,
              sz.chevronSvg,
              sz.chevronMin,
              'px-2 shrink-0 justify-center rounded-e-[4px]',
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
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          dir="rtl"
          side="bottom"
          align="start"
          sideOffset={6}
          className={cn(
            'min-w-[140px] rounded-lg p-1 bg-popover text-popover-foreground border-border shadow-lg',
          )}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {dropdownItems.map((item) => {
            const ItemIcon = item.icon;
            return (
              <DropdownMenuItem
                key={item.id}
                disabled={item.disabled}
                className="flex w-full flex-row items-center justify-start gap-2 rounded-md px-2.5 py-2 text-xs text-popover-foreground cursor-pointer transition-[background-color,color] duration-150 ease-out hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
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
