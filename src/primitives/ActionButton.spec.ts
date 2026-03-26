import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'ActionButton',
  filePath: 'src/primitives/ActionButton.tsx',
  purpose: 'Versatile action button with 4 visual variants (fill, ghost, danger, warning), 3 sizes, loading state, optional tooltip, and icon support — primary CTA in target cards and toolbars.',
  location: 'Primitives',
  status: 'prototype',

  props: [
    { name: 'label', type: 'string', required: true, description: 'Button text content' },
    { name: 'icon', type: 'React.ElementType', required: false, description: 'Lucide or custom icon component rendered before the label' },
    { name: 'onClick', type: '(e: React.MouseEvent) => void', required: false, description: 'Click handler — skipped when disabled or loading' },
    { name: 'variant', type: "'fill' | 'ghost' | 'danger' | 'warning'", required: false, defaultValue: "'fill'", description: 'Visual style variant controlling colors, background, and border' },
    { name: 'size', type: "'sm' | 'md' | 'lg'", required: false, defaultValue: "'md'", description: 'Button size: sm (30px), md (32px), lg (36px)' },
    { name: 'className', type: 'string', required: false, defaultValue: "''", description: 'Additional CSS classes merged onto the button element' },
    { name: 'disabled', type: 'boolean', required: false, defaultValue: 'false', description: 'Disables button interaction and applies dimmed styling' },
    { name: 'loading', type: 'boolean', required: false, defaultValue: 'false', description: 'Shows spinning Loader2 icon, prevents interaction, keeps full opacity' },
    { name: 'title', type: 'string', required: false, description: 'When set, wraps button in a Tooltip with this text' },
    { name: 'dataTour', type: 'string', required: false, description: 'Sets data-tour attribute for onboarding tour targeting' },
  ],

  states: [
    {
      name: 'default',
      trigger: 'Rendered with label and optional icon',
      description: 'Button in fill variant at md size, idle styling',
      implementedInPrototype: true,
      storyProps: { label: 'חקירה', variant: 'fill', icon: 'Eye' },
    },
    {
      name: 'fill variant',
      trigger: 'variant="fill"',
      description: 'Gray filled background, no border or ring, flex-1 width',
      implementedInPrototype: true,
      visualNotes: 'bg-white/10 border-0 text-zinc-200',
    },
    {
      name: 'ghost variant',
      trigger: 'variant="ghost"',
      description: 'No background, muted text, full width, hover reveals bg',
      implementedInPrototype: true,
      visualNotes: 'w-full instead of flex-1, #909296 → white on hover',
    },
    {
      name: 'danger variant',
      trigger: 'variant="danger"',
      description: 'Red oklch background with inset ring, white text, semibold',
      implementedInPrototype: true,
      visualNotes: 'oklch(0.348 0.111 17) bg with hover/active states',
    },
    {
      name: 'warning variant',
      trigger: 'variant="warning"',
      description: 'Amber oklch background with inset ring, semibold text',
      implementedInPrototype: true,
    },
    {
      name: 'disabled',
      trigger: 'disabled=true',
      description: 'Button at 40% opacity, cursor-not-allowed, pointer-events-none',
      implementedInPrototype: true,
      storyProps: { label: 'מושבת', disabled: true },
    },
    {
      name: 'loading',
      trigger: 'loading=true',
      description: 'Icon replaced with spinning Loader2, full opacity, cursor-wait, pointer-events-none',
      implementedInPrototype: true,
      visualNotes: 'animate-spin on Loader2 icon',
    },
    {
      name: 'with tooltip',
      trigger: 'title prop is provided',
      description: 'Button wrapped in Tooltip — shows content on hover above button',
      implementedInPrototype: true,
    },
    {
      name: 'error',
      trigger: 'Not implemented — no error variant exists',
      description: 'Would show error feedback (e.g. shake animation or red flash) after failed action',
      implementedInPrototype: false,
    },
    {
      name: 'empty (icon-only)',
      trigger: 'label="" with icon provided',
      description: 'Renders empty span — no icon-only mode implemented',
      implementedInPrototype: false,
    },
  ],

  interactions: [
    {
      trigger: 'click',
      element: 'Button',
      result: 'Fires onClick handler, active:scale-[0.98] press feedback',
      animation: { property: 'transform', from: 'scale(1)', to: 'scale(0.98)', duration: '150ms', easing: 'ease-out' },
      keyboard: 'Enter or Space (native button)',
    },
    {
      trigger: 'hover',
      element: 'Button',
      result: 'Background lightens per variant hover styles',
    },
    {
      trigger: 'focus',
      element: 'Button',
      result: 'Focus ring appears (ring-2, ring-white/25)',
      keyboard: 'Tab to focus',
    },
    {
      trigger: 'hover',
      element: 'Tooltip trigger',
      result: 'Tooltip appears above button with 6px offset',
    },
  ],

  tokens: {
    colors: [
      { name: 'fill-bg', value: 'white/0.08', usage: 'Fill variant background' },
      { name: 'fill-ring', value: 'white/0.12', usage: 'Fill variant border ring' },
      { name: 'fill-text', value: 'zinc-200', usage: 'Fill variant text' },
      { name: 'ghost-text', value: '#909296', usage: 'Ghost variant idle text' },
      { name: 'danger-bg', value: 'oklch(0.348 0.111 17)', usage: 'Danger variant background' },
      { name: 'danger-text', value: 'oklch(0.927 0.062 17)', usage: 'Danger variant text' },
      { name: 'warning-bg', value: 'oklch(0.348 0.111 70)', usage: 'Warning variant background' },
      { name: 'disabled-opacity', value: '0.40', usage: 'Disabled state opacity' },
      { name: 'focus-ring', value: 'rgba(255,255,255,0.25)', usage: 'Focus-visible ring' },
    ],
    typography: [
      { name: 'label-sm', fontFamily: 'inherit', fontSize: '12px (text-xs)', fontWeight: '500 (font-medium)', lineHeight: '16px', usage: 'Button label at sm/md size' },
      { name: 'label-lg', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600 (font-semibold)', lineHeight: '18px', usage: 'Button label at lg size' },
    ],
    spacing: [
      { name: 'height-sm', value: '30px', usage: 'Small button height' },
      { name: 'height-md', value: '32px (h-8)', usage: 'Medium button height' },
      { name: 'height-lg', value: '36px (h-9)', usage: 'Large button height' },
      { name: 'padding-x', value: '12px (px-3)', usage: 'Horizontal padding' },
      { name: 'icon-gap-sm', value: '4px (gap-1)', usage: 'Icon-label gap at sm size' },
      { name: 'icon-gap-md', value: '8px (gap-2)', usage: 'Icon-label gap at md/lg size' },
    ],
    borderRadius: [
      { name: 'button', value: 'rounded (4px)', usage: 'Button corner radius' },
    ],
    animations: [
      { name: 'press', property: 'transform', duration: '150ms', easing: 'ease-out', usage: 'Active press scale-down feedback' },
      { name: 'bg-transition', property: 'background-color, transform, box-shadow', duration: '150ms', easing: 'ease-out', usage: 'Hover/focus background transitions' },
      { name: 'loading-spin', property: 'rotate', duration: '1s (infinite)', easing: 'linear', usage: 'Loading spinner rotation' },
    ],
  },

  accessibility: {
    role: 'button (native)',
    ariaAttributes: ['disabled (native)', 'aria-hidden="true" on icons'],
    keyboardNav: ['Tab — focus button', 'Enter — activate', 'Space — activate'],
    focusManagement: 'Native button focus with focus-visible ring. Disabled state removes from interaction via pointer-events-none.',
    screenReaderNotes: 'Icons are aria-hidden. Label text provides accessible name. Tooltip provides additional context via title.',
  },

  tasks: [
    {
      id: 'AB-1',
      title: 'Add icon-only mode',
      priority: 'P1',
      estimate: 'S',
      description: 'Support rendering only an icon with aria-label for toolbars and compact layouts',
      files: [{ path: 'src/primitives/ActionButton.tsx', action: 'modify', description: 'Make label optional, add aria-label when icon-only' }],
      acceptanceCriteria: ['Icon-only button renders correctly at all sizes', 'aria-label is required when label is omitted', 'Tooltip auto-shows on hover for icon-only'],
    },
    {
      id: 'AB-2',
      title: 'Add error/success feedback states',
      priority: 'P2',
      estimate: 'M',
      description: 'Temporary visual feedback after action completes or fails (flash color, shake)',
      files: [{ path: 'src/primitives/ActionButton.tsx', action: 'modify', description: 'Add transient feedback animation system' }],
      acceptanceCriteria: ['Error state shows brief red flash', 'Success state shows brief green flash', 'Animations respect prefers-reduced-motion'],
    },
    {
      id: 'AB-3',
      title: 'Extract variant styles to tokens',
      priority: 'P2',
      estimate: 'M',
      description: 'Move hardcoded oklch and rgba values to shared token constants',
      files: [
        { path: 'src/primitives/tokens.ts', action: 'modify', description: 'Add ACTION_BUTTON_TOKENS with variant color map' },
        { path: 'src/primitives/ActionButton.tsx', action: 'modify', description: 'Import and use token constants' },
      ],
      acceptanceCriteria: ['All color values reference token constants', 'Variants still render identically', 'Tokens are importable by other components'],
    },
    {
      id: 'AB-4',
      title: 'Unify disabled + loading patterns',
      priority: 'P1',
      estimate: 'S',
      description: 'Loading currently overrides opacity to 100% with !important — clean up the isDisabled/loading logic',
      files: [{ path: 'src/primitives/ActionButton.tsx', action: 'modify', description: 'Refactor disabled/loading style composition' }],
      acceptanceCriteria: ['No !important used', 'Loading state visually distinct from disabled', 'Both states prevent interaction'],
    },
  ],

  hardcodedData: [
    { current: 'white/0.08', replaceWith: 'Token constant', location: 'Fill variant bg' },
    { current: 'oklch(0.348 0.111 17)', replaceWith: 'Token constant', location: 'Danger variant bg' },
    { current: 'oklch(0.348 0.111 70)', replaceWith: 'Token constant', location: 'Warning variant bg' },
    { current: '#909296', replaceWith: 'Token constant', location: 'Ghost variant text color' },
    { current: 'white/0.12', replaceWith: 'Token constant', location: 'Fill variant ring' },
  ],
};
