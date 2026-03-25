import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'AccordionSection',
  filePath: 'src/primitives/AccordionSection.tsx',
  purpose: 'Collapsible section with animated expand/collapse — used to group related content in sidebars and card slots with RTL support.',
  location: 'Primitives',
  status: 'prototype',

  props: [
    { name: 'title', type: 'string', required: true, description: 'Section heading text displayed in the trigger bar' },
    { name: 'children', type: 'React.ReactNode', required: true, description: 'Content rendered inside the collapsible panel' },
    { name: 'defaultOpen', type: 'boolean', required: false, defaultValue: 'false', description: 'Whether the section starts in its expanded state' },
    { name: 'className', type: 'string', required: false, defaultValue: "''", description: 'Additional CSS classes on the root wrapper' },
    { name: 'headerAction', type: 'React.ReactNode', required: false, defaultValue: 'null', description: 'Slot for action elements (buttons, badges) rendered at the end of the header bar' },
    { name: 'icon', type: 'React.ElementType | null', required: false, defaultValue: 'null', description: 'Optional icon component rendered before the title text' },
  ],

  states: [
    {
      name: 'default (collapsed)',
      trigger: 'Component mounts with defaultOpen=false or unset',
      description: 'Header bar visible, content panel hidden, chevron pointing down',
      implementedInPrototype: true,
      storyProps: { title: 'נתוני טלמטריה', defaultOpen: false },
    },
    {
      name: 'expanded',
      trigger: 'User clicks header or presses Enter/Space',
      description: 'Content panel slides open with height + opacity animation, chevron rotates 180°',
      implementedInPrototype: true,
      storyProps: { title: 'נתוני טלמטריה', defaultOpen: true },
      visualNotes: 'AnimatePresence with height: 0→auto, opacity: 0→1, duration 200ms easeOut',
    },
    {
      name: 'with header icon',
      trigger: 'icon prop is provided',
      description: 'Icon rendered at 14px before title text in zinc-500 color',
      implementedInPrototype: true,
    },
    {
      name: 'with header action',
      trigger: 'headerAction prop is provided',
      description: 'Action slot rendered between title and chevron in the header',
      implementedInPrototype: true,
    },
    {
      name: 'reduced motion',
      trigger: 'User has prefers-reduced-motion enabled',
      description: 'All animations disabled — expand/collapse is instant, chevron rotation duration set to 0',
      implementedInPrototype: true,
      visualNotes: 'Uses useReducedMotion() from framer-motion',
    },
    {
      name: 'loading',
      trigger: 'Children contain loading skeleton',
      description: 'Panel expanded with skeleton content — no special loading state in the accordion itself',
      implementedInPrototype: false,
    },
    {
      name: 'error',
      trigger: 'Children contain error state',
      description: 'Panel expanded with error content — accordion wrapper has no built-in error UI',
      implementedInPrototype: false,
    },
    {
      name: 'empty',
      trigger: 'Children are empty or null',
      description: 'Panel expands but shows empty area — no empty-state illustration built in',
      implementedInPrototype: false,
    },
    {
      name: 'disabled',
      trigger: 'Not yet implemented — no disabled prop exists',
      description: 'Header bar would be non-interactive, chevron hidden or dimmed',
      implementedInPrototype: false,
    },
  ],

  interactions: [
    {
      trigger: 'click',
      element: 'Header bar',
      result: 'Toggles isOpen state — expands or collapses the content panel',
      animation: { property: 'height + opacity', from: '0 / 0', to: 'auto / 1', duration: '200ms', easing: 'easeOut' },
      keyboard: 'Enter or Space',
    },
    {
      trigger: 'click',
      element: 'Chevron icon',
      result: 'Same as header click — chevron rotates 180° on toggle',
      animation: { property: 'rotate', from: '0deg', to: '180deg', duration: '200ms', easing: 'default' },
    },
    {
      trigger: 'hover',
      element: 'Header bar',
      result: 'Background transitions from white/5% to white/8%',
    },
    {
      trigger: 'focus',
      element: 'Header bar',
      result: 'Focus ring appears (ring-2, ring-white/25)',
      keyboard: 'Tab to focus, Enter/Space to toggle',
    },
  ],

  tokens: {
    colors: [
      { name: 'header-bg', value: 'rgba(255,255,255,0.05)', usage: 'Header bar background' },
      { name: 'header-bg-hover', value: 'rgba(255,255,255,0.08)', usage: 'Header bar hover state' },
      { name: 'title-color', value: 'text-zinc-300', usage: 'Section title text' },
      { name: 'icon-color', value: 'text-zinc-500', usage: 'Header icon and chevron color' },
      { name: 'content-bg', value: `rgba(255,255,255,${0.08})`, usage: 'Content panel background via CARD_TOKENS.elevation.overlay.level2' },
      { name: 'focus-ring', value: 'rgba(255,255,255,0.25)', usage: 'Focus-visible ring color' },
    ],
    typography: [
      { name: 'title', fontFamily: 'inherit', fontSize: '14px (text-sm)', fontWeight: '400 (font-normal)', lineHeight: '20px', usage: 'Section heading' },
    ],
    spacing: [
      { name: 'header-padding', value: '8px', usage: 'Header bar internal padding' },
      { name: 'header-gap', value: '8px (gap-2)', usage: 'Gap between icon, title, and actions in header' },
      { name: 'content-px', value: '8px', usage: 'Content panel horizontal padding' },
      { name: 'content-py', value: '0px', usage: 'Content panel vertical padding' },
    ],
    borderRadius: [
      { name: 'header', value: 'rounded-none', usage: 'Header bar has no border radius for stacking' },
    ],
    animations: [
      { name: 'expand', property: 'height + opacity', duration: '200ms', easing: 'easeOut', usage: 'Content panel expand/collapse' },
      { name: 'chevron-rotate', property: 'rotate', duration: '200ms', easing: 'default', usage: 'Chevron rotation on toggle' },
    ],
  },

  accessibility: {
    role: 'button (header trigger)',
    ariaAttributes: ['aria-expanded', 'aria-controls (links to panel id)'],
    keyboardNav: ['Tab — focus header', 'Enter — toggle panel', 'Space — toggle panel'],
    focusManagement: 'Header bar is focusable via tabIndex=0, focus-visible ring on keyboard focus',
    screenReaderNotes: 'Chevron and header icon are aria-hidden="true". Dynamic panel id generated via counter.',
  },

  tasks: [
    {
      id: 'AS-1',
      title: 'Add disabled prop',
      priority: 'P2',
      estimate: 'S',
      description: 'Add optional disabled prop that prevents toggle and applies dimmed styling',
      files: [{ path: 'src/primitives/AccordionSection.tsx', action: 'modify', description: 'Add disabled prop, conditional pointer-events-none + opacity' }],
      acceptanceCriteria: ['Header click does nothing when disabled', 'Keyboard toggle prevented', 'Visual opacity reduced to ~40%'],
    },
    {
      id: 'AS-2',
      title: 'Extract hardcoded Hebrew text',
      priority: 'P1',
      estimate: 'S',
      description: 'Title is passed as prop but dir="rtl" is hardcoded — make direction configurable',
      files: [{ path: 'src/primitives/AccordionSection.tsx', action: 'modify', description: 'Add optional dir prop defaulting to rtl' }],
      acceptanceCriteria: ['dir prop overrides hardcoded rtl', 'LTR layout works correctly'],
    },
    {
      id: 'AS-3',
      title: 'Replace global counter with useId',
      priority: 'P1',
      estimate: 'S',
      description: 'Replace module-level accordionIdCounter with React.useId() for SSR safety',
      files: [{ path: 'src/primitives/AccordionSection.tsx', action: 'modify', description: 'Replace accordionIdCounter with useId()' }],
      acceptanceCriteria: ['Panel id is stable across re-renders', 'No module-level mutable state', 'aria-controls still links correctly'],
    },
  ],

  hardcodedData: [
    { current: 'dir="rtl"', replaceWith: 'Configurable dir prop', location: 'Root div' },
    { current: 'accordionIdCounter (module-level mutable)', replaceWith: 'React.useId()', location: 'Component body' },
  ],
};
