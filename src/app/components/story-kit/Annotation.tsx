/**
 * Hand-drawn annotation — a handwritten (Caveat) label plus a small curved
 * arrow, absolutely positioned over the stage to point at part of a live demo
 * (the reference's "outer ring" / "anchored fader" callouts).
 *
 * The ARROW is the anchor: the positioned box is the arrow glyph itself, and the
 * label is hung off it (above for `down`, below for `up`, beside for left/right).
 * So callers position the arrow tip directly via `style` — the tip sits at
 * roughly `left + 11px` horizontally, and the glyph's pointing edge sits at the
 * `top`/`bottom` you give. This keeps the tip precise regardless of label width.
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

/** Where the label sits relative to the (anchored) arrow glyph. */
const LABEL_POS: Record<Exclude<ArrowDir, 'none'>, string> = {
  down: 'bottom-full mb-1',
  up: 'top-full mt-1',
  left: 'left-full top-1/2 -translate-y-1/2 ms-1',
  right: 'right-full top-1/2 -translate-y-1/2 me-1',
};

/**
 * Horizontal placement of an up/down label relative to its arrow: centered over
 * the tip (default), or hung to one side so neighbouring callouts don't collide.
 * `start` extends the label to the right of the tip; `end` to the left.
 */
type LabelAlign = 'center' | 'start' | 'end';

const LABEL_ALIGN: Record<LabelAlign, string> = {
  center: 'left-1/2 -translate-x-1/2',
  start: 'left-1/2',
  end: 'right-1/2',
};

function ArrowGlyph({ dir }: { dir: Exclude<ArrowDir, 'none'> }) {
  return (
    <svg
      width="22"
      height="36"
      viewBox="0 0 22 36"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: `rotate(${ROTATION[dir]}deg)`, display: 'block' }}
      aria-hidden
    >
      {/* A long, marker-style shaft: leans in from the top and settles into a
          vertical tangent at the tip so the symmetric head sits flush on it.
          Tip is at (11,32) — the glyph's horizontal centre. */}
      <path d="M8 3 C 5 13, 11 20, 11 32" />
      <path d="M6.5 26 L11 32 L15.5 26" />
    </svg>
  );
}

interface AnnotationProps {
  children: ReactNode;
  arrow?: ArrowDir;
  /** Horizontal label placement for up/down arrows (ignored for left/right). */
  labelAlign?: LabelAlign;
  className?: string;
  style?: CSSProperties;
}

export function Annotation({
  children,
  arrow = 'down',
  labelAlign = 'center',
  className,
  style,
}: AnnotationProps) {
  const label = (
    <span className="whitespace-nowrap font-[family:var(--font-handwriting)] text-[19px] font-bold leading-none">
      {children}
    </span>
  );

  if (arrow === 'none') {
    return (
      <div
        className={cn(
          'pointer-events-none absolute z-20 select-none text-[color:var(--story-annot)]',
          className,
        )}
        style={style}
      >
        {label}
      </div>
    );
  }

  const vertical = arrow === 'up' || arrow === 'down';

  return (
    <div
      className={cn(
        'pointer-events-none absolute z-20 select-none text-[color:var(--story-annot)]',
        className,
      )}
      style={style}
    >
      <ArrowGlyph dir={arrow} />
      <span className={cn('absolute', LABEL_POS[arrow], vertical && LABEL_ALIGN[labelAlign])}>
        {label}
      </span>
    </div>
  );
}
