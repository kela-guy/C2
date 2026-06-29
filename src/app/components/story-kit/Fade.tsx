/**
 * Blur + mask scroll fader — the reference's `<Fade>` component.
 *
 * Softens content that scrolls under fixed chrome: a gradient to the canvas
 * colour plus a masked `backdrop-blur` so the clipped edge dissolves instead of
 * hard-cutting. Positioning (fixed/absolute, which edge of which container) is
 * left to the caller via `className`.
 */

import type { CSSProperties } from 'react';
import { cn } from '@/app/components/ui/utils';

interface FadeProps {
  side: 'top' | 'bottom';
  /** Height of the fade band in px. */
  height?: number;
  /** Backdrop blur radius in px. */
  blur?: number;
  /** Mask stop — how far the band stays fully opaque before dissolving. */
  stop?: string;
  className?: string;
  style?: CSSProperties;
}

export function Fade({ side, height = 120, blur = 4, stop = '45%', className, style }: FadeProps) {
  const toCanvas =
    side === 'top'
      ? 'linear-gradient(to top, transparent, var(--story-bg))'
      : 'linear-gradient(to bottom, transparent, var(--story-bg))';
  const mask =
    side === 'top'
      ? `linear-gradient(to bottom, #000 ${stop}, transparent)`
      : `linear-gradient(to top, #000 ${stop}, transparent)`;

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none', className)}
      style={{
        height,
        backgroundImage: toCanvas,
        backdropFilter: `blur(${blur}px)`,
        WebkitBackdropFilter: `blur(${blur}px)`,
        maskImage: mask,
        WebkitMaskImage: mask,
        ...style,
      }}
    />
  );
}
