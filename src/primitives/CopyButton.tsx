import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Copy, Check } from '@/lib/icons/central';
import { cn } from '@/shared/components/ui/utils';

export type CopyButtonSize = 'sm' | 'md';

export interface CopyButtonProps {
  /** Text to copy to clipboard. Empty string disables the button. */
  value: string;
  /** Accessible label for the idle state ("Copy serial number"). */
  copyLabel: string;
  /** Accessible label + sr-only announcement after success ("Copied"). */
  copiedLabel: string;
  /**
   * sm = 14px Copy / 16px Check in a 24px square (default).
   * md = 16px Copy / 18px Check in a 28px square.
   *
   * The Check glyph is rendered ~2px larger and at a heavier stroke than the
   * Copy glyph; see the SIZES table for the rationale.
   */
  size?: CopyButtonSize;
  className?: string;
  /** Force the button visible even without hover/focus. Useful for the styleguide. */
  alwaysVisible?: boolean;
}

// Check is intentionally rendered ~2px larger than Copy. Lucide's Check has
// more negative space than the Copy glyph (one stroke vs. two stacked
// rectangles), so equal pixel-size makes the success state read as smaller
// than the dormant state. Bumping it gives the confirmation visual weight
// without changing the button's box (which would shift layout).
const SIZES: Record<
  CopyButtonSize,
  {
    box: string;
    copyClass: string;
    copyPx: number;
    checkClass: string;
    checkPx: number;
  }
> = {
  sm: {
    box: 'size-6',
    copyClass: 'size-3.5',
    copyPx: 14,
    checkClass: 'size-4',
    checkPx: 16,
  },
  md: {
    box: 'size-7',
    copyClass: 'size-4',
    copyPx: 16,
    checkClass: 'size-[18px]',
    checkPx: 18,
  },
};

/**
 * Quiet, hover-revealed copy affordance for a single value.
 *
 * Visibility model:
 *  - Hidden by default (`opacity-0`) so it never competes with the value.
 *  - The parent row must apply Tailwind's named group `group/copy`; we
 *    reveal on `group-hover/copy` and `focus-visible` (keyboard parity).
 *  - On touch devices (`@media (hover: none)`) the button is always visible
 *    because there is no hover to reveal it.
 *  - While `copied=true` the button stays visible so the success state
 *    isn't hidden mid-fade if the cursor leaves the row.
 *
 * Feedback: Copy → Check icon swap (0.18s ease-out for Copy; 0.22s
 * overshoot 0.85 → 1.06 → 1 for Check, opacity + scale only). Check is
 * also rendered ~2px larger, one stroke heavier (3 vs 2), and one zinc
 * step brighter (zinc-50) than Copy so the confirmation has real
 * presence instead of reading as a passive icon swap. Honors
 * `prefers-reduced-motion` (instant swap). Announces "Copied" via an
 * `aria-live="polite"` sr-only region — no focus movement, no toast.
 *
 * Failure: writes via `navigator.clipboard.writeText` with a hidden-textarea
 * fallback for legacy/insecure contexts. Silent on failure (no UI flip).
 */
export function CopyButton({
  value,
  copyLabel,
  copiedLabel,
  size = 'sm',
  className = '',
  alwaysVisible = false,
}: CopyButtonProps) {
  const prefersReducedMotion = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    },
    [],
  );

  const handleCopy = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!value) return;

      const ok = await writeToClipboard(value);
      if (!ok) return;

      setCopied(true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setCopied(false);
        timerRef.current = null;
      }, 1500);
    },
    [value],
  );

  const sz = SIZES[size];
  // Copy → Check uses ease-out (arrive fast, settle). The Check entry uses a
  // keyframed scale with a small overshoot (0.85 → 1.06 → 1) so the
  // confirmation "lands" instead of fading in flat — same total duration,
  // collapses to a hard swap under prefers-reduced-motion.
  const motionTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.18, ease: [0.25, 0.1, 0.25, 1] as const };
  const checkEnterScale = prefersReducedMotion ? 1 : [0.85, 1.06, 1];
  const checkEnterTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.22, ease: [0.34, 1.56, 0.64, 1] as const };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!value}
      aria-label={copied ? copiedLabel : copyLabel}
      title={copied ? copiedLabel : copyLabel}
      data-copied={copied || undefined}
      className={cn(
        'relative shrink-0 inline-flex items-center justify-center',
        sz.box,
        'rounded-md',
        'cursor-pointer',
        'text-zinc-500 hover:text-zinc-200 focus-visible:text-zinc-200',
        // Confirmation lift: brighten one full step beyond the hover tint so
        // the Check reads as an active state, not just a passive icon swap.
        // Stays in the zinc family — semantic green is explicitly off the
        // table per the CardIdentity spec ("no green").
        'data-[copied]:text-zinc-50',
        'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-zinc-500',
        // Expand hit target to ~40x40 without inflating the visible glyph.
        "before:absolute before:inset-[-8px] before:content-['']",
        // Reveal on row hover / keyboard focus only on hover-capable devices.
        'opacity-0 group-hover/copy:opacity-100 focus-visible:opacity-100',
        // No-hover devices: always visible (there is no hover affordance).
        '[@media(hover:none)]:opacity-100',
        // Keep success state visible even if the cursor wanders off.
        'data-[copied]:opacity-100',
        // Force visible (styleguide).
        alwaysVisible && 'opacity-100',
        // Focus ring stays subtle — single neutral accent.
        'outline-none focus-visible:ring-1 focus-visible:ring-white/30',
        'transition-[opacity,color] duration-150 ease-out',
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="check"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: checkEnterScale }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
            transition={checkEnterTransition}
            className="inline-flex"
            aria-hidden="true"
          >
            <Check className={sz.checkClass} size={sz.checkPx} strokeWidth={3} />
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
            transition={motionTransition}
            className="inline-flex"
            aria-hidden="true"
          >
            <Copy className={sz.copyClass} size={sz.copyPx} strokeWidth={2} />
          </motion.span>
        )}
      </AnimatePresence>
      <span className="sr-only" aria-live="polite">
        {copied ? copiedLabel : ''}
      </span>
    </button>
  );
}

async function writeToClipboard(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through to legacy path
  }

  try {
    if (typeof document === 'undefined') return false;
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
