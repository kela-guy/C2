/**
 * Drops a live mini component inline inside a sentence — the reference renders
 * the actual badge within the prose ("…the component becomes [live badge]
 * immediately…"). Keeps the demo baseline-aligned with the surrounding text.
 */

import type { ReactNode } from 'react';
import { cn } from '@/app/components/ui/utils';

export function InlineDemo({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'relative mx-1 inline-flex translate-y-[0.18em] select-none align-baseline',
        className,
      )}
    >
      {children}
    </span>
  );
}
