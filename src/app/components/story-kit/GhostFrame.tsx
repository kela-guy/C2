/**
 * Dashed "ghost" overlay for visualising the invisible — hit areas, an RTL
 * mirror axis, a drag projected-position target. Mirrors the reference's dashed
 * outlines that make abstract concepts physically visible on the stage.
 */

import type { CSSProperties } from 'react';
import { cn } from '@/app/components/ui/utils';

interface GhostFrameProps {
  className?: string;
  style?: CSSProperties;
  /** Optional handwritten caption pinned above the frame. */
  label?: string;
}

export function GhostFrame({ className, style, label }: GhostFrameProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute rounded-md border border-dashed',
        className,
      )}
      style={{ borderColor: 'var(--story-annot)', ...style }}
    >
      {label && (
        <span className="absolute -top-5 start-0 whitespace-nowrap font-[family:var(--font-handwriting)] text-base text-[color:var(--story-annot)]">
          {label}
        </span>
      )}
    </div>
  );
}
