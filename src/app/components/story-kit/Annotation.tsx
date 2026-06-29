/**
 * Hand-drawn annotation — a handwritten (Caveat) label plus a small curved
 * arrow, absolutely positioned over the stage to point at part of a live demo
 * (the reference's "outer ring" / "anchored fader" callouts).
 *
 * Positioning is the caller's job via `style` (top/left/right/bottom). `arrow`
 * picks which way the little arrow points; `none` renders the label alone.
 */

import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/app/components/ui/utils';

type ArrowDir = 'up' | 'down' | 'left' | 'right' | 'none';

const ROTATION: Record<Exclude<ArrowDir, 'none'>, number> = {
  down: 0,
  up: 180,
  left: 90,
  right: -90,
};

function ArrowGlyph({ dir }: { dir: Exclude<ArrowDir, 'none'> }) {
  return (
    <svg
      width="22"
      height="28"
      viewBox="0 0 22 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: `rotate(${ROTATION[dir]}deg)` }}
      aria-hidden
    >
      <path d="M5 2 C 3 11, 6 19, 11 25" />
      <path d="M6 20 L11 26 L16 20" />
    </svg>
  );
}

interface AnnotationProps {
  children: ReactNode;
  arrow?: ArrowDir;
  className?: string;
  style?: CSSProperties;
}

export function Annotation({ children, arrow = 'down', className, style }: AnnotationProps) {
  const horizontal = arrow === 'left' || arrow === 'right';
  const label = (
    <span className="whitespace-nowrap font-[family:var(--font-handwriting)] text-[19px] font-bold leading-none">
      {children}
    </span>
  );
  const glyph = arrow !== 'none' ? <ArrowGlyph dir={arrow} /> : null;

  return (
    <div
      className={cn(
        'pointer-events-none absolute z-20 flex select-none items-center gap-1 text-[color:var(--story-annot)]',
        horizontal ? 'flex-row' : 'flex-col',
        className,
      )}
      style={style}
    >
      {/* For up/left the arrow leads; for down/right the label leads. */}
      {arrow === 'up' || arrow === 'left' ? (
        <>
          {glyph}
          {label}
        </>
      ) : (
        <>
          {label}
          {glyph}
        </>
      )}
    </div>
  );
}
