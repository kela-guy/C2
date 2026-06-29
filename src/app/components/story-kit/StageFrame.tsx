/**
 * The demo surface a chapter's live component sits on. A relatively-positioned
 * box (so `Annotation` / `GhostFrame` children can be absolutely placed over it)
 * with an optional dot-grid texture and hairline border — the honest backdrop
 * that lets a card's shadow and glow read truthfully.
 */

import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/app/components/ui/utils';

interface StageFrameProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Dot-grid texture. */
  dots?: boolean;
  /** Hairline border. */
  bordered?: boolean;
}

export function StageFrame({
  children,
  className,
  style,
  dots = true,
  bordered = true,
}: StageFrameProps) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-2xl p-12',
        bordered && 'border border-[color:var(--story-border)]',
        className,
      )}
      style={{
        ...(dots
          ? {
              backgroundImage: 'radial-gradient(var(--story-dot) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }
          : null),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
