import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'CardIdentity',
  filePath: 'src/primitives/CardIdentity.tsx',
  purpose: 'Collapsible "General info" accordion section that surfaces drone identity (model, serial number, and future identity fields) in a 2-column grid that matches CardDetails. Sits above CardDetails because identity ("what is this?") precedes telemetry ("where is it?") in operator scanning order.',
  location: 'TargetCard/Slots',
  status: 'prototype',

  props: [
    { name: 'rows', type: 'IdentityRow[]', required: true, description: 'Array of { label, value } entries. Rows flow into a 2-column grid; within each cell the label sits above the value with a per-row copy button.' },
    { name: 'title', type: 'string', required: false, defaultValue: "'General info'", description: 'Section header title' },
    { name: 'copyLabel', type: 'string', required: true, description: 'Verb label for the per-row copy button. Composed with each row\'s label to form the aria-label (e.g. "Copy serial number").' },
    { name: 'copiedLabel', type: 'string', required: true, description: 'Post-success label ("Copied"). Used for the icon button aria-label and the aria-live announcement.' },
    { name: 'defaultOpen', type: 'boolean', required: false, defaultValue: 'false', description: 'Whether the accordion section starts expanded' },
    { name: 'className', type: 'string', required: false, defaultValue: "''", description: 'Additional CSS classes on the AccordionSection wrapper' },
  ],

  states: [
    {
      name: 'default (collapsed)',
      trigger: 'rows[] provided, defaultOpen=false',
      description: 'Accordion header visible with "General info" / "מידע כללי" title and Info icon — content hidden',
      implementedInPrototype: true,
      storyProps: {
        rows: [
          { label: 'Model', value: 'DJI Matrice 4 T/E' },
          { label: 'Serial Number', value: 'f7k3c251f00cx623' },
        ],
      },
    },
    {
      name: 'expanded',
      trigger: 'User clicks accordion header or defaultOpen=true',
      description: 'Identity rows displayed in a 2-column grid (`grid-cols-2 gap-x-8 gap-y-2`) matching CardDetails. Within each cell the label sits above the value; the value is wrapped in a `w-fit` container anchored to the cell\'s inline-start edge so the copy button rides immediately after the text (not pinned to the far end of the cell). The button sits on top of a gradient-faded overlay at the wrapper\'s inline-end so long values dissolve smoothly under the icon instead of being truncated or pushing the icon out of view.',
      implementedInPrototype: true,
      visualNotes: 'Both label and value use `text-xs` (12px) for a uniform compact scale. Values use Heebo + tabular-nums + slashed-zero (`0` vs `O` disambiguation). `break-all` is the last-resort wrap for extremely long identifiers. With one row, the second grid cell stays empty (matches CardDetails behavior).',
    },
    {
      name: 'empty',
      trigger: 'rows[] is an empty array',
      description: 'Component returns null — renders nothing. Callers can safely pass an unconditional component as the empty case is handled internally.',
      implementedInPrototype: true,
      storyProps: { rows: [] },
    },
    {
      name: 'partial identity',
      trigger: 'Only model present, or only serial present',
      description: 'Renders just the available row(s). Useful for raw detections that have model from classifier but no serial yet.',
      implementedInPrototype: true,
    },
    {
      name: 'row hover (copy reveal)',
      trigger: 'Pointer enters one of the identity rows on a hover-capable device',
      description: 'Gradient-fade overlay + CopyButton at the inline-end fade in together (opacity 0 → 1, 150ms ease-out). Sibling rows stay quiet — reveal is scoped via Tailwind `group/copy` on the row, not the whole section.',
      implementedInPrototype: true,
    },
    {
      name: 'long value overflow',
      trigger: 'value is longer than the row width',
      description: 'Value text continues to the inline-end edge. The gradient mask (transparent → card surface bg) makes the tail dissolve under the copy icon. No truncation, no ellipsis, no push of the icon out of view.',
      implementedInPrototype: true,
      visualNotes: 'Gradient ramps from transparent at the inside edge to solid card bg by 50% of the overlay zone, leaving the icon-facing half fully solid so the icon is on a clean backdrop.',
    },
    {
      name: 'row copied',
      trigger: 'User clicks the per-row copy button',
      description: 'Value is written to the clipboard. The button\'s icon swaps Copy → Check (0.18s opacity + scale) and the aria-label flips to `copiedLabel`. Button stays visible for 1500ms, then reverts.',
      implementedInPrototype: true,
      visualNotes: 'Neutral zinc tint on success — no green. The Check glyph alone carries the semantic.',
    },
    {
      name: 'touch (copy always visible)',
      trigger: '@media (hover: none) — touch device',
      description: 'CopyButton is always visible on every row because there is no hover to reveal it. Hit area remains 40×40.',
      implementedInPrototype: true,
    },
    {
      name: 'reduced motion',
      trigger: 'prefers-reduced-motion: reduce',
      description: 'Copy ↔ Check icon swap collapses to an instant swap (no scale). Reveal opacity transition is unaffected (below perceptual threshold).',
      implementedInPrototype: true,
    },
  ],

  interactions: [
    {
      trigger: 'click',
      element: 'Accordion header',
      result: 'Toggles open/closed via AccordionSection (Radix Collapsible)',
      keyboard: 'Enter, Space',
    },
    {
      trigger: 'click',
      element: 'Per-row CopyButton',
      result: 'Writes the row\'s `value` to the clipboard, swaps Copy → Check for 1500ms, then reverts. event.stopPropagation prevents the parent card from collapsing.',
      keyboard: 'Enter, Space (native button)',
    },
    {
      trigger: 'hover',
      element: 'Identity row (group/copy)',
      result: 'CopyButton at the end of the hovered row fades in (opacity 0 → 1). Reveal is scoped to the single hovered row.',
      animation: { property: 'opacity', from: '0', to: '1', duration: '150ms', easing: 'ease-out' },
    },
  ],

  tokens: {
    colors: [
      { name: 'label', value: 'text-slate-10 (#a1a1aa)', usage: 'Row label color' },
      { name: 'value', value: 'text-slate-11 (#e4e4e7)', usage: 'Row value color' },
      { name: 'fade-bg', value: 'SURFACE.level3 (≈ #2e2e2e)', usage: 'Gradient mask end-color behind the copy icon — matches the effective AccordionSection content surface (card content well SURFACE.level1 + rgba(255,255,255,0.11) overlay) so the tail of long values dissolves smoothly into the card backdrop' },
    ],
    typography: [
      { name: 'label', fontSize: '12px (text-xs)', usage: 'Row label' },
      { name: 'value', fontFamily: 'Heebo', fontSize: '12px (text-xs)', usage: 'Row value with tabular-nums + slashed-zero so 0 vs O is unambiguous' },
    ],
    spacing: [
      { name: 'col-gap', value: '32px (gap-x-8)', usage: 'Horizontal gap between grid columns — matches CardDetails' },
      { name: 'row-gap', value: '8px (gap-y-2)', usage: 'Vertical gap between grid rows' },
      { name: 'cell-internal', value: '4px (gap-1)', usage: 'Gap between label and value within a cell' },
      { name: 'fade-zone-inset-start', value: '16px (ps-4)', usage: 'How far the gradient overlay extends to the inside before reaching the icon — combined with the 24px icon this gives a 40px overlay' },
    ],
  },

  accessibility: {
    role: 'region (accordion content)',
    ariaAttributes: [
      'AccordionSection handles aria-expanded on the trigger via Radix Collapsible',
      'Each CopyButton has aria-label that switches between copyLabel+row.label and copiedLabel',
      'Each CopyButton renders an sr-only aria-live="polite" span that announces copiedLabel on success',
    ],
    keyboardNav: [
      'Tab focuses the accordion trigger',
      'Enter/Space toggles the section',
      'Once expanded, Tab focuses each row\'s copy button in order; focus-visible reveals the otherwise hidden button',
      'Enter/Space on a focused copy button copies the row value',
    ],
    focusManagement: 'Standard Radix Collapsible focus management for the header. Copy buttons do not steal focus on success.',
    screenReaderNotes: 'Bdi wrapper preserves LTR reading order for serial numbers and model strings inside RTL contexts. Copy aria-labels are composed at the call site (`${copy} ${row.label.toLowerCase()}`) so each button announces the field it copies, not just "Copy".',
  },

  notes: [
    'Why a separate primitive instead of reusing CardDetails: identity values are alphanumeric IDs (model strings, serial numbers) that benefit from the per-row copy affordance and slashed-zero numerals. CardDetails is the read-only telemetry surface (no per-row copy). Both share the same 2-col grid rhythm so they read as one consistent stack inside the card.',
    'Identity values use `font-variant-numeric: tabular-nums slashed-zero` (polish.md) so 0 vs O is unambiguous in dense alphanumeric IDs.',
    'Section is extensible: any future identity-style field (manufacturer, firmware, operator, …) is one entry in the rows array.',
    'Lives above CardDetails in UnifiedCard: identity ("what is this?") comes before telemetry ("where is it?") in operator scanning order.',
    'Per-row copy reveal is scoped via Tailwind `group/copy` on each row — only the hovered or focused row shows its button, not the whole section. This avoids drawing the operator\'s eye to rows they aren\'t pointing at.',
    'Copy interaction itself is delegated to the `CopyButton` primitive (handles success feedback, reduced motion, touch fallback, clipboard fallback, hit-area expansion). The CardIdentity row passes `alwaysVisible` because the gradient overlay around the button manages reveal at the row level.',
    'Gradient overlay is `pointer-events-none` so it does not interfere with text selection — only the button inside captures pointer events. RTL: `rtl:bg-gradient-to-l` flips the gradient so it always fades toward the inline-end edge regardless of writing direction.',
    'The overlay stays visible while the button is in the copied state via `has-[[data-copied]]:opacity-100`, so the success feedback is never hidden mid-fade if the cursor leaves the row.',
  ],
};
