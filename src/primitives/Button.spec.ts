import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'Button',
  filePath: 'src/primitives/Button.tsx',
  purpose: 'The base button primitive — the "father" of the button family. A thin composition over the shadcn ui/button: the buttonVariants cva owns every surface + size treatment (buttonTokens.ts only aliases fill/ghost/outline/danger/warning and sm/md/lg onto it), while this layer adds the full state set, loading swap, and the animated icon+label. ActionButton and SplitActionButton are presets/composites built on top of it.',
  location: 'Primitives',
  status: 'prototype',

  props: [
    { name: 'label', type: 'string', required: true, description: 'Button text content. Cross-fades on change.' },
    { name: 'icon', type: 'React.ElementType', required: false, description: 'Leading icon component, swapped for a spinner while loading' },
    { name: 'onClick', type: '(e: React.MouseEvent) => void', required: false, description: 'Click handler — skipped when disabled or loading' },
    { name: 'variant', type: "'fill' | 'ghost' | 'outline' | 'danger' | 'warning'", required: false, defaultValue: "'fill'", description: 'Surface treatment. Danger/warning use oklch.' },
    { name: 'size', type: "'sm' | 'md' | 'lg'", required: false, defaultValue: "'md'", description: 'Height + type scale: sm (30px), md (32px), lg (36px)' },
    { name: 'className', type: 'string', required: false, defaultValue: "''", description: 'Classes merged onto the root element via cn()' },
    { name: 'disabled', type: 'boolean', required: false, defaultValue: 'false', description: 'Non-interactive, dimmed to 45% opacity' },
    { name: 'loading', type: 'boolean', required: false, defaultValue: 'false', description: 'Shows spinner, sets cursor-wait + aria-live polite, blocks input without dimming' },
    { name: 'pressed', type: 'boolean', required: false, description: 'Toggle state. When defined, exposes aria-pressed; when true, fills with a brighter white surface over the variant.' },
    { name: 'title', type: 'string', required: false, description: 'When set, wraps the button in a Tooltip with this text' },
    { name: 'asChild', type: 'boolean', required: false, defaultValue: 'false', description: 'Render the merged classes/handlers onto the child element (Radix Slot) instead of a native button. The child owns its content.' },
    { name: 'children', type: 'React.ReactNode', required: false, description: 'Child content rendered when asChild is true' },
    { name: 'dataHandoff', type: 'string', required: false, defaultValue: "'button'", description: 'data-handoff-component stamp for the picker / styleguide deep-link. Presets override it.' },
  ],

  states: [
    { name: 'default', trigger: 'Rendered with label and optional icon', description: 'Fill variant at md size, idle styling', implementedInPrototype: true, storyProps: { label: 'Track', variant: 'fill' } },
    { name: 'hover', trigger: 'Pointer over', description: 'Background lightens per variant hover token', implementedInPrototype: true },
    { name: 'active', trigger: 'Mouse down', description: 'Scale 0.98 press feedback + darker background', implementedInPrototype: true, visualNotes: 'active:scale-[0.98]' },
    { name: 'focus-visible', trigger: 'Tab focus', description: 'Inset white ring for keyboard nav', implementedInPrototype: true, visualNotes: 'ring-2 ring-inset ring-white/30' },
    { name: 'disabled', trigger: 'disabled=true', description: '45% opacity, pointer-events-none', implementedInPrototype: true, storyProps: { label: 'Disabled', disabled: true } },
    { name: 'loading', trigger: 'loading=true', description: 'Spinner replaces icon, cursor-wait, full opacity', implementedInPrototype: true },
    { name: 'pressed (toggle on)', trigger: 'pressed=true', description: 'Brighter white fill + inset ring, aria-pressed="true"', implementedInPrototype: true, visualNotes: 'bg-white/[0.20], shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]' },
  ],

  interactions: [
    { trigger: 'click', element: 'Button', result: 'Fires onClick, active:scale-[0.98] press feedback', animation: { property: 'transform', from: 'scale(1)', to: 'scale(0.98)', duration: '150ms', easing: 'ease-out' }, keyboard: 'Enter or Space (native button)' },
    { trigger: 'hover', element: 'Button', result: 'Background lightens per variant hover styles' },
    { trigger: 'focus', element: 'Button', result: 'Inset focus ring appears', keyboard: 'Tab to focus' },
  ],

  tokens: {
    colors: [
      { name: 'fill-bg', value: 'white/0.08', usage: 'Fill variant background' },
      { name: 'fill-text', value: 'zinc-200', usage: 'Fill variant text' },
      { name: 'danger-bg', value: 'oklch(0.435 0.151 25)', usage: 'Danger variant background' },
      { name: 'warning-bg', value: 'oklch(0.501 0.166 75)', usage: 'Warning variant background' },
      { name: 'pressed-bg', value: 'white/0.20', usage: 'Pressed (toggle on) fill' },
      { name: 'focus-ring', value: 'rgba(255,255,255,0.30)', usage: 'Focus-visible inset ring' },
    ],
    typography: [
      { name: 'label-sm', fontFamily: 'inherit', fontSize: '12px (text-xs)', fontWeight: '500 (font-medium)', lineHeight: '16px', usage: 'Button label at sm/md size' },
      { name: 'label-lg', fontFamily: 'inherit', fontSize: '14px (text-sm)', fontWeight: '600 (font-semibold)', lineHeight: '18px', usage: 'Button label at lg size' },
    ],
    spacing: [
      { name: 'height-sm', value: '30px', usage: 'Small button height' },
      { name: 'height-md', value: '32px (h-8)', usage: 'Medium button height' },
      { name: 'height-lg', value: '36px (h-9)', usage: 'Large button height' },
      { name: 'padding-x', value: '12px (px-3)', usage: 'Horizontal padding' },
    ],
    borderRadius: [{ name: 'button', value: 'rounded (4px)', usage: 'Button corner radius' }],
    animations: [
      { name: 'press', property: 'transform', duration: '150ms', easing: 'ease-out', usage: 'Active press scale-down feedback' },
      { name: 'label-swap', property: 'opacity, y', duration: '0.3s', easing: 'spring(bounce:0)', usage: 'Label cross-fade on prop change (respects prefers-reduced-motion)' },
    ],
  },

  accessibility: {
    role: 'button (native)',
    ariaAttributes: ['disabled (native)', 'aria-pressed (when pressed is defined)', 'aria-live="polite" (while loading)', 'aria-hidden="true" on icons'],
    keyboardNav: ['Tab — focus button', 'Enter — activate', 'Space — activate'],
    focusManagement: 'Native button focus with focus-visible inset ring. Disabled removes interaction via pointer-events-none.',
    screenReaderNotes: 'Icons are aria-hidden. Label text provides the accessible name. Tooltip (title) provides additional context.',
  },

  tasks: [],

  notes: [
    'Promoted from the former ActionButton — the canonical base of the button family. Renders the shadcn ui/button; buttonTokens.ts maps the domain variant/size vocabulary onto the buttonVariants cva (fill→default, ghost→secondary, outline→outline, danger→destructive, warning→warning; sm→sm, md→default, lg→lg).',
    'ActionButton is a back-compat preset (dataHandoff="action-button"); SplitActionButton composes ui Buttons directly; CameraToggleButton wears the same cva over the shadcn Toggle.',
    'asChild (Radix Slot) renders the styling onto a child element for links/polymorphism — the child owns its content, so the animated icon+label is not used in that mode.',
  ],
};
