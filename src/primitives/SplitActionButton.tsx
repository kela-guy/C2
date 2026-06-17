import React from 'react';
import { ChevronDown } from '@/lib/icons/central';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { spring, springExit } from '@/lib/springs';
import { useIsRtl } from '@/lib/direction';
import { cn } from '@/shared/components/ui/utils';
import { AppLoader } from '@/shared/components/ui/app-loader';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/shared/components/ui/dropdown-menu';
import {
  BUTTON_VARIANTS,
  BUTTON_SIZES,
  type ButtonVariant,
  type ButtonSize,
} from './buttonTokens';

export interface SplitDropdownItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  disabled?: boolean;
  active?: boolean;
  onClick: (e: React.MouseEvent) => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
}

export interface SplitDropdownGroup {
  label?: string;
  items: SplitDropdownItem[];
}

// SplitActionButton shares the base Button's variant + size tokens so the
// two-segment shell stays visually unified with every other button. The
// `SPLIT_BUTTON_*` names are kept as aliases for back-compat.
export const SPLIT_BUTTON_VARIANTS = BUTTON_VARIANTS;
export type SplitButtonVariant = ButtonVariant;

export const SPLIT_BUTTON_SIZES = BUTTON_SIZES;
export type SplitButtonSize = ButtonSize;

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
  /** aria-label for the dropdown trigger chevron. Defaults to 'More actions'. */
  moreActionsLabel?: string;
  /** Placeholder shown for grouped dropdowns when no item is selected. Defaults to 'Select'. */
  placeholder?: string;
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
  moreActionsLabel = 'More actions',
  placeholder = 'Select',
}: SplitActionButtonProps) {
  const prefersReducedMotion = useReducedMotion();
  const isRtl = useIsRtl();
  const dir = isRtl ? 'rtl' : 'ltr';
  const [menuOpen, setMenuOpen] = React.useState(false);
  const shellRef = React.useRef<HTMLDivElement>(null);
  const [shellWidth, setShellWidth] = React.useState(0);
  const isDisabled = disabled || loading;

  React.useEffect(() => {
    if (menuOpen && shellRef.current) setShellWidth(shellRef.current.offsetWidth);
  }, [menuOpen]);
  const c = SPLIT_BUTTON_VARIANTS[variant];
  const sz = SPLIT_BUTTON_SIZES[size];

  const hasSubtitle = !!subtitle && !loading;
  const hasBadge = !!badge && !loading;

  const segmentBase = cn(
    !hasSubtitle && sz.height, sz.text, sz.font, c.text,
    c.base, c.hover, c.active,
    'transition-[background-color,transform] duration-[var(--motion-fast)] ease-out',
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
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} dir={dir}>
      {/*
        Make the *whole shell* the trigger so the popper anchors to the
        full button width — not just the small chevron — keeping the
        dropdown directly under the visible button instead of extending
        sideways and bleeding off the dashboard panel.
        Click handling: the primary button calls `e.stopPropagation()`
        before invoking its own onClick, so primary clicks don't toggle
        the menu. Clicks on the chevron (a span, not a button) bubble
        up to the trigger element and toggle the menu the way Radix
        expects. Keyboard activation lands on the trigger as a unit,
        which is fine — Enter/Space at the shell-level opens the menu.
      */}
      <DropdownMenuTrigger asChild disabled={isDisabled}>
        <div
          ref={shellRef}
          role="button"
          tabIndex={isDisabled ? -1 : 0}
          aria-disabled={isDisabled}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={moreActionsLabel}
          className={cn(
            'flex w-full items-stretch gap-0.5 rounded',
            variantShell,
            disabledCls,
            className,
          )}
          {...(loading ? { 'aria-busy': true as const } : {})}
        >
          <button
            type="button"
            // The shell is the Radix dropdown trigger, and Radix opens the
            // menu on `pointerdown`. Stop pointerdown here so a press on the
            // primary segment never bubbles up to open the menu — the main
            // button performs its action only; the chevron opens the menu.
            onPointerDown={isDisabled ? undefined : (e) => e.stopPropagation()}
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
                {hasSubtitle ? (
                  <span className="flex flex-col items-start leading-tight">
                    <span>{label}</span>
                    <span className="text-xs opacity-60 font-normal">{subtitle}</span>
                  </span>
                ) : (
                  <span>{label}</span>
                )}
                {hasBadge && (
                  <span className="text-xs font-medium bg-white/[0.12] px-1.5 py-0.5 rounded leading-none whitespace-nowrap">
                    {badge}
                  </span>
                )}
              </motion.span>
            </AnimatePresence>
          </button>

          {/*
            Chevron is now a styled span (not a button) — the parent
            shell is the actual interactive trigger. Keeps the visual
            layout identical without nesting a button inside a button.
          */}
          <span
            className={cn(
              segmentBase,
              sz.chevronMin,
              'flex shrink-0 items-center justify-center px-2 rounded-e-[4px]',
              chevronExtras,
            )}
            aria-hidden="true"
          >
            <ChevronDown
              size={Math.max(sz.icon - 2, 10)}
              className={cn(
                'opacity-90 transition-transform duration-200',
                menuOpen && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </span>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        dir={dir}
        side="bottom"
        align="end"
        sideOffset={6}
        style={shellWidth ? { minWidth: shellWidth } : undefined}
        className={cn(
          // `align="end"` already anchors the popover to the inline-end
          // corner; keep the transform origin matching the trigger
          // (Radix's CSS variable handles direction internally).
          'rounded-lg border-none p-1 [transform-origin:var(--radix-dropdown-menu-content-transform-origin)]',
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
                    <DropdownMenuLabel className="px-2.5 py-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      {group.label}
                    </DropdownMenuLabel>
                  )}
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <DropdownMenuItem
                        key={item.id}
                        disabled={item.disabled}
                        className="group flex w-full flex-row items-center justify-start gap-2 rounded-md px-2.5 py-2 text-xs text-zinc-200 cursor-pointer transition-[background-color,color] duration-150 ease-out hover:bg-white/[0.08] hover:text-white focus:bg-white/[0.08] focus:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          item.onClick(e);
                        }}
                        onMouseEnter={item.onHoverStart}
                        onMouseLeave={item.onHoverEnd}
                        onFocus={item.onHoverStart}
                        onBlur={item.onHoverEnd}
                      >
                        <span className={cn(
                          'w-0.5 self-stretch rounded-full shrink-0',
                          item.active ? 'bg-white' : 'bg-transparent',
                        )} />
                        {ItemIcon && <ItemIcon size={14} className="shrink-0" aria-hidden="true" />}
                        <span className="min-w-0 flex-1 text-start">{item.label}</span>
                        <span className="text-xs text-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          {placeholder}
                        </span>
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
  );
}
