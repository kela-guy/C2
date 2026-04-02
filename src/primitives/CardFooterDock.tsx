import React from 'react';
import { cn } from '@/shared/components/ui/utils';
import { CARD_TOKENS } from './tokens';

export interface FooterDockAction {
  id: string;
  label: string;
  icon?: React.ElementType;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  loading?: boolean;
}

export interface CardFooterDockProps {
  actions: FooterDockAction[];
  className?: string;
}

export function CardFooterDock({ actions, className }: CardFooterDockProps) {
  if (actions.length === 0) return null;

  return (
    <div
      className={cn('flex gap-1.5 px-2 py-2', className)}
      style={{
        backgroundColor: `rgba(255,255,255,0.06)`,
        borderTop: `1px solid ${CARD_TOKENS.surface.level2}`,
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)',
        borderBottomLeftRadius: `${CARD_TOKENS.container.borderRadius}px`,
        borderBottomRightRadius: `${CARD_TOKENS.container.borderRadius}px`,
      }}
    >
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            type="button"
            disabled={action.disabled || action.loading}
            onClick={action.disabled || action.loading ? undefined : action.onClick}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5',
              'h-8 rounded-[5px] px-3',
              'text-xs font-medium text-zinc-300',
              'bg-white/[0.08] border border-white/[0.06]',
              'transition-[background-color,border-color] duration-150 ease-out',
              'hover:bg-white/[0.12] hover:border-white/[0.10]',
              'active:bg-white/[0.06] active:scale-[0.98]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25',
              'disabled:opacity-40 disabled:pointer-events-none',
            )}
          >
            {action.loading ? (
              <span className="w-3.5 h-3.5 border-2 border-zinc-500 border-t-zinc-200 rounded-full animate-spin" />
            ) : Icon ? (
              <Icon size={14} className="shrink-0" aria-hidden="true" />
            ) : null}
            <span>{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}
