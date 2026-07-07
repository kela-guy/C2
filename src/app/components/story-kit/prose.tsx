/**
 * Story prose primitives. Sizes/spacing are lifted verbatim from the reference
 * (prose 20px / 38px, weight 500; eyebrow mono 14px / 20px uppercase). Colours
 * come from the `--story-*` palette. Every reading block carries `data-prose`
 * so `useScrollOpacity` can drive its focus dimming.
 */

import type { ReactNode } from 'react';
import { cn } from '@/app/components/ui/utils';

/** Small uppercase mono section label, optionally numbered. */
export function Eyebrow({
  children,
  index,
  className,
}: {
  children: ReactNode;
  index?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'font-[family:var(--font-mono)] text-sm uppercase leading-5 tracking-[0.08em] text-[color:var(--story-muted)]',
        className,
      )}
    >
      {index != null && (
        <span className="opacity-50">{String(index).padStart(2, '0')} · </span>
      )}
      {children}
    </div>
  );
}

/** A reading paragraph. */
export function P({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      data-prose
      className={cn(
        'text-start text-xl font-medium leading-[38px] text-[color:var(--story-ink)]',
        className,
      )}
    >
      {children}
    </p>
  );
}

/** A heavier opening line for chapter intros. */
export function Lead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      data-prose
      className={cn(
        'text-start text-2xl font-semibold leading-[40px] tracking-[-0.01em] text-[color:var(--story-ink)]',
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Inline monospace token (prop names, values, identifiers in prose). */
export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <code
      className={cn(
        'rounded-[3px] bg-[var(--story-band)] px-1 py-0.5 font-[family:var(--font-code)] text-[0.82em] text-[color:var(--story-ink)]',
        className,
      )}
    >
      {children}
    </code>
  );
}

/** A closing "takeaway" note with a tactical accent rule. */
export function Takeaway({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      data-prose
      className={cn(
        'mt-10 border-s-2 ps-4 text-base leading-[28px] text-[color:var(--story-muted)]',
        className,
      )}
      style={{ borderColor: 'var(--story-accent)' }}
    >
      <span className="font-[family:var(--font-mono)] text-xs-plus uppercase tracking-[0.14em] text-[color:var(--story-accent)]">
        Takeaway
      </span>
      <div className="mt-1">{children}</div>
    </div>
  );
}
