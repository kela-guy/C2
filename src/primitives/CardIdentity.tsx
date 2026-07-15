import React from 'react';
import { Info } from '@/lib/icons/central';
import { Bdi } from '@/lib/direction';
import { cn } from '@/shared/components/ui/utils';
import { AccordionSection } from './AccordionSection';
import { CopyButton } from './CopyButton';

export interface IdentityRow {
  label: string;
  value: string;
}

export interface CardIdentityProps {
  rows: IdentityRow[];
  /** Section header. Defaults to 'General info'. */
  title?: string;
  /** Verb label for the per-row copy affordance ("Copy"). Required for the
   * accessible name on the icon button — composed with the row label. */
  copyLabel: string;
  /** Post-success label ("Copied"). Used for both the icon button aria-label
   * and an aria-live announcement. */
  copiedLabel: string;
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Identity rows (drone name, model, serial, future "general info" fields) laid out
 * in a 2-col grid that matches CardDetails. Lives above CardDetails
 * because "what is this?" comes before "where is it?" in operator
 * scanning order.
 *
 * Layout:
 * - Outer wrapper is `grid grid-cols-2 gap-x-8 gap-y-2` (same rhythm as
 *   CardDetails / TelemetryRow grid) so all collapsible sections inside
 *   a TargetCard share one layout grammar.
 * - Each row is `group/copy` so the per-row copy reveal is scoped to the
 *   hovered/focused row only — never the whole section.
 * - Value sits in a `w-fit` wrapper anchored to the cell's inline-start
 *   edge, so the CopyButton rides immediately after the text instead of
 *   being pinned to the far end of the cell. The button is absolutely
 *   positioned at the wrapper's inline-end and rides on top of a
 *   linear-gradient fade (transparent → card surface) so values that do
 *   reach the cell edge dissolve smoothly under the icon instead of
 *   being abruptly truncated or pushing the icon out of view.
 * - Text selection still works — the gradient wrapper is
 *   `pointer-events-none`; only the button inside captures pointer events.
 *
 * Typography:
 * - `text-xs` for both label and value (uniform compact scale).
 * - `font-variant-numeric: slashed-zero` on the value so `0` vs `O` is
 *   unambiguous in dense alphanumeric IDs.
 * - `break-all` as a last-resort safety net for extremely long identifiers.
 */
export function CardIdentity({
  rows,
  title = 'General info',
  copyLabel,
  copiedLabel,
  defaultOpen = false,
  className = '',
}: CardIdentityProps) {
  if (rows.length === 0) return null;

  return (
    <AccordionSection title={title} defaultOpen={defaultOpen} icon={Info} className={className}>
      <div className="w-full py-1">
        {/*
          2-col grid matching CardDetails so the collapsible sections
          inside a TargetCard share one layout rhythm. Up to 3 identity
          fields (name, model, SN) each row gets its own column,
          and longer values still dissolve cleanly under the per-cell copy
          overlay rather than wrapping aggressively.
        */}
        <div className="w-full grid grid-cols-2 gap-x-8 gap-y-2">
          {rows.map((row, idx) => (
            <div
              key={idx}
              className="group/copy w-full flex flex-col items-start py-1 gap-1 min-w-0"
            >
              <span className="text-xs text-slate-10">{row.label}</span>
              <div className="relative w-fit">
                <Bdi
                  as="span"
                  className="block w-fit text-xs text-slate-11 font-sans tabular-nums break-all text-end"
                  style={{ fontVariantNumeric: 'tabular-nums slashed-zero' }}
                >
                  {row.value}
                </Bdi>
                <div
                  aria-hidden={undefined}
                  className={cn(
                    'pointer-events-none absolute inset-y-0 end-0 flex items-center justify-end',
                    // Gradient fade zone: transparent → card surface, so the
                    // text underneath dissolves smoothly into the icon. The
                    // overlay is 40px wide (24px icon + 16px ps-4 fade), with
                    // the solid region covering the icon and a short ~47%
                    // fade ramp at the text-facing edge.
                    'ps-4 pe-0',
                    'bg-gradient-to-r rtl:bg-gradient-to-l from-transparent to-[var(--card-fade-bg)] to-50%',
                    // Reveal in lockstep with the row, like the CopyButton itself.
                    // Use `has-[:focus-visible]` (keyboard-only) rather than
                    // `focus-within` (which also matches mouse-click focus and
                    // would leave the overlay stuck visible after a click).
                    'opacity-0 group-hover/copy:opacity-100 has-[:focus-visible]:opacity-100',
                    // Keep visible while the button is in copied state, even if
                    // the cursor has already left the row.
                    'has-[[data-copied]]:opacity-100',
                    // Touch devices have no hover — always visible.
                    '[@media(hover:none)]:opacity-100',
                    'transition-opacity duration-[var(--motion-fast)] ease-out',
                  )}
                  style={
                    {
                      // Match the effective surface behind the value: the
                      // AccordionSection content adds rgba(255,255,255,0.11)
                      // on top of the card content well (SURFACE.level1),
                      // which resolves to SURFACE.level3 (≈ #2e2e2e). Using
                      // a flat surface here would produce a visible dark
                      // wash instead of a clean dissolve into the card
                      // backdrop.
                      ['--card-fade-bg' as string]: 'var(--surface-4)',
                    } as React.CSSProperties
                  }
                >
                  <CopyButton
                    value={row.value}
                    copyLabel={`${copyLabel} ${row.label.toLowerCase()}`}
                    copiedLabel={copiedLabel}
                    alwaysVisible
                    className="pointer-events-auto"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AccordionSection>
  );
}
