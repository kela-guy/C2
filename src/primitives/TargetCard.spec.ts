import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'TargetCard',
  filePath: 'src/primitives/TargetCard.tsx',
  purpose: 'Expandable card shell for individual target detections — provides accent-colored selection ring, header slot, animated expand/collapse content area, and auto-scroll-into-view behavior.',
  location: 'TargetCard',
  status: 'prototype',

  props: [
    { name: 'header', type: 'React.ReactNode', required: true, description: 'Slot for the card header content (typically CardHeader component)' },
    { name: 'children', type: 'React.ReactNode', required: false, description: 'Expandable content rendered below the header when open' },
    { name: 'open', type: 'boolean', required: true, description: 'Whether the card content is expanded (controlled)' },
    { name: 'onToggle', type: '() => void', required: true, description: 'Callback fired when the header is clicked to toggle open state' },
    { name: 'accent', type: 'ThreatAccent', required: false, defaultValue: "'idle'", description: 'Color accent — accepted for API compatibility but currently unused in JSX. Will drive spine color when TC-1 is implemented.' },
    { name: 'completed', type: 'boolean', required: false, description: 'When true, card is desaturated and dimmed (resolved/expired targets)' },
    { name: 'className', type: 'string', required: false, defaultValue: "''", description: 'Additional CSS classes on the outer container' },
    { name: 'onFocus', type: '() => void', required: false, description: 'Callback fired on first open when card gains focus (e.g. select on map)' },
  ],

  states: [
    {
      name: 'collapsed',
      trigger: 'open = false',
      description: 'Only header visible; content hidden. No selection ring.',
      implementedInPrototype: true,
      storyProps: { open: false },
    },
    {
      name: 'expanded',
      trigger: 'open = true',
      description: 'Header + children visible with animated height transition. Selection ring active.',
      implementedInPrototype: true,
      storyProps: { open: true },
      visualNotes: 'Box shadow includes selection ring + elevation shadow',
    },
    {
      name: 'completed',
      trigger: 'completed = true',
      description: 'Card rendered with reduced saturation and brightness',
      implementedInPrototype: true,
      storyProps: { completed: true },
      visualNotes: 'filter: saturate(0.4) brightness(0.85)',
    },
    {
      name: 'accent variants',
      trigger: 'accent prop set to any ThreatAccent value',
      description: 'Accent prop is accepted but has no visual effect yet — spine color rendering is planned in task TC-1',
      implementedInPrototype: false,
      visualNotes: 'Values: idle, suspicion, detection, tracking, mitigating, active, resolved, expired',
    },
    {
      name: 'auto-scroll on open',
      trigger: 'Card transitions from closed to open',
      description: 'Card scrolls into view within nearest scroll container, using smooth behavior unless reduced motion is preferred',
      implementedInPrototype: true,
    },
    {
      name: 'reduced motion',
      trigger: 'prefers-reduced-motion media query active',
      description: 'Expand animation uses instant opacity instead of height transition; scroll uses auto behavior',
      implementedInPrototype: true,
    },
    {
      name: 'no children',
      trigger: 'open = true but children is undefined/null',
      description: 'AnimatePresence condition prevents rendering — only header shows with expanded state',
      implementedInPrototype: true,
    },
  ],

  interactions: [
    {
      trigger: 'click',
      element: 'Header area',
      result: 'Calls onToggle; if !open and onFocus exists, also calls onFocus',
      animation: { property: 'height, opacity', from: '0, 0', to: 'auto, 1', duration: '0.2s', easing: 'easeOut' },
      keyboard: 'Enter, Space',
    },
    {
      trigger: 'focus',
      element: 'Header area',
      result: 'Focus ring appears (ring-2 ring-white/25)',
      keyboard: 'Tab',
    },
  ],

  tokens: {
    colors: [
      { name: 'container-bg', value: 'SURFACE.level1', usage: 'Card background color' },
      { name: 'header-hover', value: 'rgba(255,255,255,0.05)', usage: 'Header hover state background' },
      { name: 'header-selected', value: 'rgba(255,255,255,0.08)', usage: 'Header background when expanded' },
      { name: 'content-bg', value: 'SURFACE.level0', usage: 'Expanded content area background' },
      { name: 'content-border', value: 'SURFACE.level2', usage: 'Top border of expanded content (inset shadow)' },
      { name: 'selection-ring', value: 'rgba(0,0,0,0.15)', usage: 'Selection ring when card is open' },
    ],
    typography: [],
    spacing: [
      { name: 'header-px', value: '8px', usage: 'Header horizontal padding' },
      { name: 'header-py', value: '6px', usage: 'Header vertical padding' },
      { name: 'margin-bottom', value: '12px', usage: 'Card bottom margin (marginBottom + 2)' },
    ],
    borderRadius: [
      { name: 'card-radius', value: '8px', usage: 'Outer card border radius' },
    ],
    shadows: [
      { name: 'elevation', value: '0 2px 4px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4)', usage: 'Default card shadow' },
      { name: 'selection-ring', value: '0 0 0 1px rgba(0,0,0,0.15)', usage: 'Additional ring shadow when open' },
    ],
    animations: [
      { name: 'expand', property: 'height, opacity', duration: '0.2s', easing: 'easeOut', usage: 'Content expand/collapse transition' },
    ],
  },

  flows: [
    {
      name: 'Open and inspect target',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'Clicks target card header', result: 'Card expands with animated content reveal' },
        { actor: 'system', action: 'Card scrolls into view if near bottom of container', result: 'Card fully visible' },
        { actor: 'user', action: 'Reviews actions, timeline, and details in children', result: 'Content slots visible' },
      ],
    },
    {
      name: 'Focus callback on first open',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'Clicks closed card with onFocus handler', result: 'onFocus fires (map centers on target), then onToggle fires' },
      ],
    },
  ],

  accessibility: {
    role: 'button (header)',
    ariaAttributes: [
      'role="button" on header click area',
      'tabIndex="0" for keyboard focus',
      'aria-expanded="{open}" tracks open state',
      'aria-controls="{contentId}" links header to content (auto-generated via useId)',
    ],
    keyboardNav: [
      'Enter: toggle open/close',
      'Space: toggle open/close',
      'Tab: focus header, then into expanded children',
    ],
    focusManagement: 'Header is focusable via tabIndex=0. Content receives an auto-generated id via useId for aria-controls linkage.',
    screenReaderNotes: 'aria-expanded communicates state. Content is hidden from DOM when collapsed (AnimatePresence removes it).',
  },

  tasks: [
    {
      id: 'TC-1',
      title: 'Add accent spine visual',
      priority: 'P1',
      estimate: 'M',
      description: 'The accent prop is accepted but currently only affects the selection ring opacity. The spine color (left/right border bar) should render directly on the TargetCard shell using CARD_TOKENS.spine.colors.',
      files: [{ path: 'src/primitives/TargetCard.tsx', action: 'modify', description: 'Add colored spine bar based on accent prop' }],
      acceptanceCriteria: [
        'Each accent value renders a visible colored spine',
        'Spine uses CARD_TOKENS.spine.colors[accent]',
        'Spine appears on the inline-end side (right in LTR, left in RTL)',
      ],
    },
    {
      id: 'TC-2',
      title: 'Support onFocus + onToggle in correct order',
      priority: 'P1',
      estimate: 'S',
      description: 'Currently onFocus fires before onToggle on click. Verify and document that this is intentional (focus map before expanding card).',
      files: [{ path: 'src/primitives/TargetCard.tsx', action: 'modify', description: 'Add comment or reorder if needed' }],
      acceptanceCriteria: [
        'onFocus fires before onToggle when card opens',
        'onFocus does NOT fire when card is already open (closing)',
      ],
    },
    {
      id: 'TC-3',
      title: 'Add loading/skeleton state',
      priority: 'P2',
      estimate: 'M',
      description: 'Support a loading prop that shows a skeleton pulse in the header area while target data is being fetched.',
      files: [{ path: 'src/primitives/TargetCard.tsx', action: 'modify', description: 'Add loading prop and skeleton variant' }],
      acceptanceCriteria: [
        'loading=true shows shimmer in header slot',
        'Card is not interactive while loading',
      ],
    },
  ],

  hardcodedData: [
    {
      current: "Selection ring color: '#000000' with opacity 0.15",
      replaceWith: 'Use CARD_TOKENS.selectedRing values directly (already using but could use CSS var)',
      location: 'TargetCard.tsx line 63',
    },
  ],

  notes: [
    'The card shell is intentionally dumb — all content is injected via header and children slots.',
    'Auto-scroll logic has a special case for cards near the bottom of a scroll container (isNearBottom threshold: 200px).',
    'dir="rtl" is hardcoded on the root div.',
    'The accent prop is accepted for API compatibility (callers pass it) but currently has no visual effect in the JSX. Task TC-1 will wire it to a spine color bar.',
  ],
};
