import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'CopyButton',
  filePath: 'src/primitives/CopyButton.tsx',
  purpose:
    'Quiet, hover-revealed icon button that copies a single string to the clipboard. Designed to live inside a row marked `group/copy` so it only appears for the row the operator is pointing at — never as always-on chrome that competes with the value.',
  location: 'Primitives',
  status: 'prototype',

  props: [
    { name: 'value', type: 'string', required: true, description: 'Text written to the clipboard. Empty string disables the button.' },
    { name: 'copyLabel', type: 'string', required: true, description: 'Accessible label + tooltip in the idle state. Typically composed at the call site, e.g. "Copy serial number".' },
    { name: 'copiedLabel', type: 'string', required: true, description: 'Accessible label in the success state. Also announced via aria-live="polite".' },
    { name: 'size', type: "'sm' | 'md'", required: false, defaultValue: "'sm'", description: '`sm` = 14px Copy / 16px Check in a 24px box. `md` = 16px Copy / 18px Check in a 28px box. Check is rendered ~2px larger than Copy because Lucide\'s Check has more negative space than the two-rectangle Copy glyph; equal sizes make the success state read as smaller than the dormant state.' },
    { name: 'className', type: 'string', required: false, defaultValue: "''", description: 'Additional classes on the button element.' },
    { name: 'alwaysVisible', type: 'boolean', required: false, defaultValue: 'false', description: 'Force the button to skip the hover-reveal (used by the styleguide preview).' },
  ],

  states: [
    {
      name: 'default (hidden)',
      trigger: 'Mounted inside a `group/copy` parent, no hover/focus',
      description: 'opacity-0 — the button does not contribute visual noise to the row. Layout slot is still reserved (shrink-0 + fixed size) so no shift occurs on reveal.',
      implementedInPrototype: true,
      visualNotes: 'Only `opacity` and `color` transition — never width/height.',
    },
    {
      name: 'row hover',
      trigger: 'Pointer enters the parent `group/copy` row on a hover-capable device',
      description: 'opacity fades 0 → 1 in 150ms ease-out. Icon color zinc-500 → zinc-200 on direct hover of the button.',
      implementedInPrototype: true,
    },
    {
      name: 'focus-visible',
      trigger: 'Keyboard tab lands on the button',
      description: 'Button revealed at opacity 1 with a subtle ring-1 ring-white/30 focus ring. Keyboard users get full parity with hover users.',
      implementedInPrototype: true,
    },
    {
      name: 'touch (no hover)',
      trigger: '@media (hover: none) matches — touch device',
      description: 'Button is always visible because there is no hover to reveal it. Tap area is still 40×40 via the `before:inset-[-8px]` pseudo-element.',
      implementedInPrototype: true,
    },
    {
      name: 'copied',
      trigger: 'Click succeeds in writing to clipboard',
      description: 'Icon swaps Copy → Check. The Check entry uses an overshoot scale (0.85 → 1.06 → 1, 0.22s, custom easing) so the confirmation lands rather than fading in flat; Copy → Check still uses ease-out for the exit. Button stays visible for 1500ms regardless of hover/focus so the success state is never hidden mid-fade. aria-label and tooltip switch to copiedLabel. sr-only aria-live region announces copiedLabel once.',
      implementedInPrototype: true,
      visualNotes: 'Three coordinated lifts give the Check real presence inside the neutral palette: ~2px larger glyph than Copy (Lucide Check has more negative space), heavier stroke (3 vs 2), and one zinc step brighter than the hover tint (zinc-50 vs zinc-200). Still no green — the glyph + the lift carry the semantics, matching the "one motivated accent" rule used by the neutralized confidence badge.',
    },
    {
      name: 'disabled (empty value)',
      trigger: 'value prop is an empty string',
      description: 'Button rendered as native disabled. opacity-30, cursor-not-allowed. Hover color does not change.',
      implementedInPrototype: true,
    },
    {
      name: 'reduced motion',
      trigger: 'prefers-reduced-motion: reduce',
      description: 'Icon swap collapses to an instant swap (no scale, no fade transform). Opacity reveal still uses the 150ms transition because it is below the perceptual-motion threshold.',
      implementedInPrototype: true,
    },
    {
      name: 'clipboard failure',
      trigger: 'navigator.clipboard rejects AND the textarea fallback fails',
      description: 'Silent no-op — the button never flips to the copied state. No toast, no error UI (intentional: the operator can retry; a transient toast in a tactical sidebar would be more noise than signal).',
      implementedInPrototype: true,
    },
  ],

  interactions: [
    {
      trigger: 'click',
      element: 'Button',
      result: 'Writes `value` to clipboard via navigator.clipboard.writeText. Falls back to a hidden textarea + document.execCommand("copy") for legacy/insecure contexts. On success: flips to copied state for 1500ms. event.stopPropagation prevents the parent card from toggling expand/collapse.',
      keyboard: 'Enter, Space (native button)',
      animation: { property: 'opacity, transform: scale', from: '0, 0.85', to: '1, 1', duration: '0.18s', easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' },
    },
    {
      trigger: 'hover (parent row)',
      element: 'Group ancestor with class `group/copy`',
      result: 'opacity 0 → 1 via Tailwind group-hover/copy variant. Reveal is row-scoped; sibling rows in the same section stay quiet.',
      animation: { property: 'opacity', from: '0', to: '1', duration: '150ms', easing: 'ease-out' },
    },
  ],

  tokens: {
    colors: [
      { name: 'icon-default', value: 'text-zinc-500 (#71717a)', usage: 'Icon color at rest' },
      { name: 'icon-hover', value: 'text-zinc-200 (#e4e4e7)', usage: 'Icon color on hover / focus-visible' },
      { name: 'icon-copied', value: 'text-zinc-50 (#fafafa)', usage: 'Icon color while the copied state is held — one zinc step brighter than the hover tint, so the Check has presence without leaving the neutral palette' },
      { name: 'focus-ring', value: 'ring-white/30', usage: 'Subtle 1px focus ring' },
    ],
    typography: [
      { name: 'copy-sm', fontFamily: 'lucide', fontSize: '14px', fontWeight: '400', lineHeight: '1', usage: 'sm Copy glyph (stroke 2)' },
      { name: 'check-sm', fontFamily: 'lucide', fontSize: '16px', fontWeight: '400', lineHeight: '1', usage: 'sm Check glyph (stroke 3) — bumped vs. Copy to compensate for Lucide Check\'s extra negative space' },
      { name: 'copy-md', fontFamily: 'lucide', fontSize: '16px', fontWeight: '400', lineHeight: '1', usage: 'md Copy glyph (stroke 2)' },
      { name: 'check-md', fontFamily: 'lucide', fontSize: '18px', fontWeight: '400', lineHeight: '1', usage: 'md Check glyph (stroke 3)' },
    ],
    spacing: [
      { name: 'box-sm', value: '24px (size-6)', usage: 'sm visible button square' },
      { name: 'box-md', value: '28px (size-7)', usage: 'md visible button square' },
      { name: 'hit-area-expand', value: '-8px on all sides (~40px hit target)', usage: 'before:inset-[-8px] pseudo-element' },
    ],
    borderRadius: [
      { name: 'button', value: '6px (rounded-md)', usage: 'Visible button corner radius' },
    ],
    animations: [
      { name: 'reveal', property: 'opacity, color', duration: '150ms', easing: 'ease-out', usage: 'Hover/focus reveal' },
      { name: 'copy-swap', property: 'opacity, transform: scale', duration: '180ms', easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)', usage: 'Check → Copy revert swap (and Copy entry on first mount)' },
      { name: 'check-land', property: 'opacity, transform: scale', duration: '220ms', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', usage: 'Copy → Check success entry — overshoot keyframes 0.85 → 1.06 → 1 so the confirmation lands instead of fading in flat' },
      { name: 'copied-hold', property: 'state', duration: '1500ms', easing: 'linear', usage: 'How long the copied state stays before reverting' },
    ],
  },

  accessibility: {
    role: 'button',
    ariaAttributes: [
      'aria-label switches between copyLabel and copiedLabel so the state change is announced on re-focus',
      'title mirrors aria-label so sighted hover users get the same tooltip',
      'aria-live="polite" sr-only span announces copiedLabel once on success without moving focus',
      'aria-hidden="true" on the animated icon spans (the label carries semantics)',
    ],
    keyboardNav: [
      'Tab focuses the button',
      'Enter / Space activates copy',
      'focus-visible reveals the button even when the parent row is not hovered',
    ],
    focusManagement: 'No focus is moved on success — the button stays focused, screen reader receives the polite announcement.',
    screenReaderNotes: 'Compose copyLabel at the call site to include the field name (e.g. "Copy serial number") so the announcement is unambiguous across stacked rows.',
  },

  tasks: [],

  notes: [
    'Hover-reveal is intentionally scoped to the parent `group/copy` row, not the whole section. A section-level group would draw the eye to a sibling row the operator is not pointing at.',
    'Single-accent neutral palette (zinc) by design — no green-on-success tint. Presence on success comes from three stacked neutral lifts: glyph ~2px larger, stroke 3 vs 2, and color zinc-50 vs zinc-200/500. Matches the neutralized confidence-badge decision.',
    'Hit area is 40×40 via a `before:` pseudo-element, so the visible 24×24 glyph never has to inflate to be tappable.',
    'event.stopPropagation on click prevents the wrapping TargetCard from toggling collapse/expand when the operator copies a value.',
    'Clipboard fallback (hidden textarea + execCommand) keeps the button working in non-secure contexts (e.g. local IP without HTTPS) where navigator.clipboard is unavailable.',
  ],
};
