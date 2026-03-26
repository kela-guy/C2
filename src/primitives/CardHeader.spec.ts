import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'CardHeader',
  filePath: 'src/primitives/CardHeader.tsx',
  purpose: 'Card header row with icon, title, subtitle, status/badge slots, quick action, and animated chevron — serves as the clickable expand/collapse trigger for TargetCard.',
  location: 'TargetCard/Slots',
  status: 'prototype',

  props: [
    { name: 'icon', type: 'React.ElementType', required: false, description: 'Lucide icon component rendered inside the icon box' },
    { name: 'iconColor', type: 'string', required: false, description: 'Override color for the icon — defaults to gray when not active' },
    { name: 'iconBgActive', type: 'boolean', required: false, description: 'When true, icon box gets a tinted background using activeBg color at 20% opacity' },
    { name: 'title', type: 'string', required: true, description: 'Primary heading text (h2) — target name or incident description' },
    { name: 'subtitle', type: 'string', required: false, description: 'Secondary text below title — typically a target ID in mono font' },
    { name: 'status', type: 'React.ReactNode', required: false, description: 'Status slot — typically a StatusChip component' },
    { name: 'badge', type: 'React.ReactNode', required: false, description: 'Badge slot — optional badge element' },
    { name: 'quickAction', type: 'React.ReactNode', required: false, description: 'Quick action slot — shown only when card is collapsed (open=false), click events are stopped from propagating' },
    { name: 'open', type: 'boolean', required: false, description: 'Controls chevron rotation (180° when open) and quickAction visibility' },
  ],

  states: [
    {
      name: 'default (collapsed)',
      trigger: 'open=false or undefined',
      description: 'Header row with icon, title, optional subtitle, status/badge, quickAction visible, chevron pointing down',
      implementedInPrototype: true,
      storyProps: {
        title: 'חשד תנועה - גזרה צפונית',
        subtitle: 't-001',
        open: false,
      },
    },
    {
      name: 'expanded',
      trigger: 'open=true',
      description: 'Same as default but chevron rotated 180°, quickAction hidden',
      implementedInPrototype: true,
      storyProps: {
        title: 'רחפן מסווג',
        open: true,
      },
    },
    {
      name: 'with active icon',
      trigger: 'iconBgActive=true',
      description: 'Icon box background uses activeBg color (#ef4444) at 20% opacity, icon inherits activeBg color',
      implementedInPrototype: true,
      visualNotes: 'Hex opacity calculated dynamically: Math.round(0.2 * 255).toString(16)',
    },
    {
      name: 'with status and badge',
      trigger: 'status and/or badge props provided',
      description: 'Status and badge rendered in the right-side flex container alongside the chevron',
      implementedInPrototype: true,
    },
    {
      name: 'minimal (title only)',
      trigger: 'Only title provided, no icon/subtitle/status/badge',
      description: 'Simplified header with just the title text and chevron',
      implementedInPrototype: true,
      storyProps: { title: 'אירוע לא מוגדר' },
    },
    {
      name: 'loading',
      trigger: 'Target data is loading',
      description: 'No loading state — should show skeleton placeholder for title and subtitle',
      implementedInPrototype: false,
      visualNotes: 'Should render shimmering placeholder matching title/subtitle dimensions',
    },
    {
      name: 'error',
      trigger: 'Target data failed to load',
      description: 'No error state — should show fallback title with error indicator',
      implementedInPrototype: false,
    },
    {
      name: 'reduced motion',
      trigger: 'prefers-reduced-motion: reduce',
      description: 'Chevron rotation animation duration set to 0 via useReducedMotion hook',
      implementedInPrototype: true,
      visualNotes: 'framer-motion useReducedMotion sets transition duration to 0',
    },
  ],

  interactions: [
    {
      trigger: 'click',
      element: 'Header row (parent handles)',
      result: 'Parent TargetCard toggles open state — CardHeader itself has no onClick',
      keyboard: 'Enter/Space on parent trigger (native button or div with role)',
    },
    {
      trigger: 'click',
      element: 'quickAction slot',
      result: 'stopPropagation prevents card toggle; quickAction handles its own click',
      keyboard: 'Tab focuses quickAction independently',
    },
    {
      trigger: 'state change',
      element: 'Chevron icon',
      result: 'Rotates 0° → 180° when open transitions to true',
      animation: { property: 'rotate', from: '0deg', to: '180deg', duration: '200ms', easing: 'ease' },
    },
  ],

  tokens: {
    colors: [
      { name: 'title', value: 'CARD_TOKENS.title.color (#dee2e6)', usage: 'Primary heading text color' },
      { name: 'subtitle', value: 'CARD_TOKENS.subtitle.color (#999999)', usage: 'Secondary subtitle text color' },
      { name: 'icon-default', value: '#9ca3af (gray-400)', usage: 'Default icon color when not active' },
      { name: 'icon-box-bg', value: 'CARD_TOKENS.iconBox.defaultBg (SURFACE.level3)', usage: 'Icon box background when not active' },
      { name: 'icon-box-active-bg', value: 'CARD_TOKENS.iconBox.activeBg (#ef4444) at 20%', usage: 'Icon box tinted background when active' },
      { name: 'chevron', value: 'text-zinc-500', usage: 'Chevron icon color' },
    ],
    typography: [
      { name: 'title', fontFamily: 'Heebo', fontSize: '13px', fontWeight: '600', lineHeight: 'tight', usage: 'Primary heading (h2) via CARD_TOKENS.title' },
      { name: 'subtitle', fontFamily: 'monospace', fontSize: '10px', fontWeight: '400', lineHeight: 'normal', usage: 'Target ID label via CARD_TOKENS.subtitle' },
    ],
    spacing: [
      { name: 'header-gap', value: '6px', usage: 'Gap between left and right sections (CARD_TOKENS.header.gap)' },
      { name: 'icon-title-gap', value: '8px', usage: 'Gap between icon box and title (gap-2)' },
      { name: 'right-items-gap', value: '6px', usage: 'Gap between status, badge, and chevron (gap-1.5)' },
    ],
    borderRadius: [
      { name: 'icon-box', value: '4px', usage: 'Icon box border radius (CARD_TOKENS.iconBox.borderRadius)' },
    ],
    animations: [
      { name: 'chevron-rotate', property: 'rotate', duration: '200ms', easing: 'ease (framer-motion default)', usage: 'Chevron rotation on expand/collapse, disabled with reduced motion' },
    ],
  },

  accessibility: {
    role: 'heading (h2 for title)',
    ariaAttributes: [
      'aria-hidden="true" on icon element (decorative)',
      'aria-hidden="true" on ChevronDown (decorative indicator)',
    ],
    keyboardNav: [
      'Tab: focuses quickAction slot if present (native)',
      'Header click is handled by parent TargetCard — no direct keyboard role on CardHeader',
    ],
    focusManagement: 'quickAction click/keydown events stopPropagation to prevent card toggle. No focus indicator on the header itself — parent provides interactive wrapper.',
    screenReaderNotes: 'Title is an h2 — ensure proper heading hierarchy within the card. Chevron state (open/closed) is not announced — parent should use aria-expanded.',
  },

  flows: [
    {
      name: 'Expand card',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'Clicks card header area', result: 'Parent sets open=true' },
        { actor: 'system', action: 'CardHeader re-renders with open=true', result: 'Chevron rotates 180°, quickAction hides' },
      ],
    },
    {
      name: 'Quick action while collapsed',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'Clicks quickAction button (card collapsed)', result: 'quickAction handler fires, card stays collapsed' },
        { actor: 'system', action: 'stopPropagation prevents card toggle', result: 'Only the quick action executes' },
      ],
    },
  ],

  tasks: [
    {
      id: 'CH-1',
      title: 'Add aria-expanded communication',
      priority: 'P0',
      estimate: 'S',
      description: 'The header does not communicate expanded state to assistive technology. Either CardHeader should accept and apply aria-expanded, or document that parent must provide it.',
      files: [{ path: 'src/primitives/CardHeader.tsx', action: 'modify', description: 'Add aria-expanded={open} to the header container or document parent responsibility' }],
      acceptanceCriteria: [
        'Screen reader announces expanded/collapsed state',
        'aria-expanded attribute matches open prop',
      ],
    },
    {
      id: 'CH-2',
      title: 'Add loading skeleton state',
      priority: 'P1',
      estimate: 'S',
      description: 'Accept a loading prop and render skeleton placeholders for title and subtitle while data loads.',
      files: [{ path: 'src/primitives/CardHeader.tsx', action: 'modify', description: 'Add loading prop, render pulse-animated placeholders when true' }],
      acceptanceCriteria: [
        'Skeleton matches title/subtitle dimensions',
        'Icon box shows as a neutral placeholder',
        'Chevron remains visible during loading',
      ],
    },
    {
      id: 'CH-3',
      title: 'Extract icon box to reusable component',
      priority: 'P2',
      estimate: 'M',
      description: 'The icon box rendering logic (size, borderRadius, active bg calculation) is inline. Extract to an IconBox component for reuse in other card slots.',
      files: [
        { path: 'src/primitives/IconBox.tsx', action: 'create', description: 'Create reusable IconBox component' },
        { path: 'src/primitives/CardHeader.tsx', action: 'modify', description: 'Replace inline icon box with IconBox component' },
      ],
      acceptanceCriteria: [
        'IconBox renders identically to current inline implementation',
        'IconBox accepts icon, color, active, size props',
        'CardHeader uses IconBox without visual regression',
      ],
    },
    {
      id: 'CH-4',
      title: 'Replace inline style computations with CSS custom properties',
      priority: 'P2',
      estimate: 'M',
      description: 'Several styles (icon box bg, title font, header gap) are computed inline from CARD_TOKENS. Convert to CSS custom properties for better maintainability.',
      files: [{ path: 'src/primitives/CardHeader.tsx', action: 'modify', description: 'Replace inline style objects with CSS variables set on container' }],
      acceptanceCriteria: [
        'No inline style objects remain (except dynamic icon color)',
        'CSS custom properties defined in tokens.css or component-level style tag',
        'Visual output is identical',
      ],
    },
  ],

  hardcodedData: [
    {
      current: "Inline style objects for icon box dimensions, colors, and border radius",
      replaceWith: 'CSS custom properties from CARD_TOKENS or Tailwind config extension',
      location: 'CardHeader.tsx lines 38-46',
    },
    {
      current: "Hex opacity calculation: Math.round(opacity * 255).toString(16)",
      replaceWith: 'CSS color-mix() or rgba() with token values',
      location: 'CardHeader.tsx line 43',
    },
    {
      current: "#9ca3af hardcoded fallback color for inactive icon",
      replaceWith: 'Tailwind gray-400 token or CSS variable',
      location: 'CardHeader.tsx line 45',
    },
  ],

  notes: [
    'CardHeader is a controlled component — it does not manage open state. Parent TargetCard provides the open prop and handles toggling.',
    'useReducedMotion from framer-motion is used to disable the chevron animation for accessibility.',
    'quickAction is only rendered when the card is collapsed — this prevents action buttons from competing with expanded card content.',
    'The h2 title element should be considered in the page heading hierarchy — if cards are inside a section with an h2, this creates duplicate heading levels.',
    'iconBgActive opacity is calculated at render time via hex string manipulation — this could be simplified with CSS color-mix().',
  ],
};
