import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'NewUpdatesPill',
  filePath: 'src/primitives/NewUpdatesPill.tsx',
  purpose: 'Floating pill button that appears when new detections arrive — shows count, entity type icons, and scrolls the list to top on click.',
  location: 'Primitives',
  status: 'prototype',

  props: [
    { name: 'count', type: 'number', required: true, description: 'Number of new updates to display' },
    { name: 'entityTypes', type: 'DetectionType[]', required: true, description: 'Array of entity types for the new detections — unique types shown as icons (max 3)' },
    { name: 'onClick', type: '() => void', required: true, description: 'Callback when pill is clicked (typically scrolls list to top)' },
  ],

  states: [
    {
      name: 'default',
      trigger: 'count > 0 and component mounted',
      description: 'Pill animates in with count, arrow-up icon, and up to 3 entity type icons',
      implementedInPrototype: true,
      storyProps: { count: 5, entityTypes: ['uav', 'missile'] },
      visualNotes: 'Sky-500 bg with glow shadow, spring enter animation',
    },
    {
      name: 'single type',
      trigger: 'All new detections are the same type',
      description: 'Single entity icon shown in dark circle',
      implementedInPrototype: true,
      storyProps: { count: 3, entityTypes: ['uav'] },
    },
    {
      name: 'multiple types',
      trigger: 'Mixed detection types',
      description: 'Up to 3 unique type icons shown with overlapping circles',
      implementedInPrototype: true,
      storyProps: { count: 12, entityTypes: ['uav', 'missile', 'aircraft'] },
      visualNotes: 'Icons in -space-x-1 overlapping layout',
    },
    {
      name: 'exit animation',
      trigger: 'Component unmounts (AnimatePresence)',
      description: 'Pill fades out and scales down',
      implementedInPrototype: true,
      visualNotes: 'opacity: 0, y: -6, scale: 0.96',
    },
    {
      name: 'hover',
      trigger: 'Mouse enters pill',
      description: 'Background lightens to sky-400',
      implementedInPrototype: true,
      visualNotes: 'hover:bg-sky-400',
    },
    {
      name: 'active press',
      trigger: 'Mouse down on pill',
      description: 'Slight scale-down for tactile feedback',
      implementedInPrototype: true,
      visualNotes: 'active:scale-[0.97]',
    },
    {
      name: 'reduced motion',
      trigger: 'prefers-reduced-motion media query active',
      description: 'Enter/exit animations disabled — pill appears/disappears instantly',
      implementedInPrototype: true,
    },
  ],

  interactions: [
    {
      trigger: 'click',
      element: 'Pill button',
      result: 'Calls onClick — scrolls detection list to top to reveal new items',
      animation: { property: 'opacity, y, scale', from: '0, -8, 0.96', to: '1, 0, 1', duration: '0.2s', easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' },
    },
  ],

  tokens: {
    colors: [
      { name: 'pill-bg', value: 'sky-500 (rgb(14, 165, 233))', usage: 'Pill background color' },
      { name: 'pill-bg-hover', value: 'sky-400 (rgb(56, 189, 248))', usage: 'Pill hover background' },
      { name: 'pill-text', value: '#ffffff', usage: 'Pill text and icon color' },
      { name: 'icon-circle-bg', value: 'rgba(0,0,0,0.6)', usage: 'Entity type icon circle background' },
      { name: 'pill-glow', value: 'rgba(29,155,240,0.35)', usage: 'Outer glow shadow color' },
    ],
    typography: [
      { name: 'count', fontFamily: 'Heebo', fontSize: '12px', fontWeight: '600', lineHeight: '1', usage: 'Update count text (tabular-nums)' },
    ],
    spacing: [
      { name: 'pill-px', value: '10px', usage: 'Horizontal padding (px-2.5)' },
      { name: 'pill-height', value: '32px', usage: 'Fixed height (h-8)' },
      { name: 'pill-gap', value: '6px', usage: 'Gap between icon, count, and entity types (gap-1.5)' },
      { name: 'icon-overlap', value: '-4px', usage: 'Entity icon overlap (-space-x-1)' },
    ],
    borderRadius: [
      { name: 'pill-radius', value: '9999px', usage: 'Fully rounded pill (rounded-full)' },
      { name: 'icon-circle', value: '9999px', usage: 'Entity type icon circles (rounded-full)' },
    ],
    shadows: [
      { name: 'pill-shadow', value: '0 8px 24px rgba(29,155,240,0.35), 0 0 0 1px rgba(255,255,255,0.1)', usage: 'Glow + subtle ring' },
    ],
    animations: [
      { name: 'enter', property: 'opacity, y, scale', duration: '0.2s', easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)', usage: 'Pill entrance animation' },
      { name: 'exit', property: 'opacity, y, scale', duration: '0.2s', easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)', usage: 'Pill exit animation' },
      { name: 'press', property: 'transform', duration: '150ms', easing: 'ease-out', usage: 'Active press scale feedback' },
    ],
  },

  accessibility: {
    role: 'button',
    ariaAttributes: [
      'aria-label="X עדכונים חדשים" (Hebrew, dynamic count)',
      'aria-hidden="true" on ArrowUp icon',
      'aria-label="{type}" on each entity icon circle',
    ],
    keyboardNav: [
      'Enter/Space: activates click (native button)',
      'Tab: focusable in tab order',
    ],
    focusManagement: 'Focus ring via focus-visible:ring-2 ring-white/30.',
    screenReaderNotes: 'Button announces count in Hebrew. Entity type labels provide type context.',
  },

  tasks: [
    {
      id: 'NUP-1',
      title: 'Add AnimatePresence wrapper at usage site',
      priority: 'P1',
      estimate: 'S',
      description: 'The component defines exit animations but AnimatePresence must wrap it at the parent level for exit animations to fire.',
      files: [{ path: 'src/imports/ListOfSystems.tsx', action: 'modify', description: 'Ensure AnimatePresence wraps NewUpdatesPill' }],
      acceptanceCriteria: [
        'Exit animation plays when pill disappears',
        'Enter animation plays when pill appears',
      ],
    },
    {
      id: 'NUP-2',
      title: 'Handle count = 0 edge case',
      priority: 'P1',
      estimate: 'S',
      description: 'If count is 0, the pill should not render. Currently no guard against count ≤ 0.',
      files: [{ path: 'src/primitives/NewUpdatesPill.tsx', action: 'modify', description: 'Add early return for count ≤ 0' }],
      acceptanceCriteria: [
        'count=0 returns null',
        'Negative count returns null',
      ],
    },
    {
      id: 'NUP-3',
      title: 'Add large count formatting',
      priority: 'P2',
      estimate: 'S',
      description: 'For counts > 99, display "99+" to prevent pill from growing too wide.',
      files: [{ path: 'src/primitives/NewUpdatesPill.tsx', action: 'modify', description: 'Cap displayed count at 99+' }],
      acceptanceCriteria: [
        'count=150 displays "99+"',
        'Pill width remains consistent',
      ],
    },
  ],

  notes: [
    'Entity type icons use custom SVG components (DroneCardIcon, MissileCardIcon) for uav and missile, lucide icons for the rest.',
    'Only 3 unique types are shown — excess types are silently dropped.',
    'The pill is typically positioned absolutely above the detection list by the parent layout.',
  ],
};
