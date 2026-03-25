import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'ListOfSystems',
  filePath: 'src/imports/ListOfSystems.tsx',
  purpose: 'Scrollable detection target list with active/completed tabs, filter bar, burst grouping, animated card layout, and full CUAS workflow actions (verify, engage, dismiss, drone ops, mission planning, mitigation, BDA).',
  location: 'CUAS',
  status: 'prototype',

  props: [
    { name: 'className', type: 'string', required: false, defaultValue: "''", description: 'Additional CSS classes on root container' },
    { name: 'targets', type: 'Detection[]', required: false, defaultValue: 'MOCK_TARGETS', description: 'Array of detection targets to display' },
    { name: 'activeTargetId', type: 'string | null', required: false, description: 'Currently expanded/selected target card ID' },
    { name: 'onTargetClick', type: '(target: Detection) => void', required: false, description: 'Called when a target card is toggled' },
    { name: 'onVerify', type: '(targetId, action) => void', required: false, description: 'Verify action: intercept, surveillance, or investigate' },
    { name: 'onEngage', type: '(targetId, type) => void', required: false, description: 'Engage action: jamming or attack' },
    { name: 'onDismiss', type: '(targetId, reason?) => void', required: false, description: 'Dismiss target with optional reason' },
    { name: 'onSensorHover', type: '(sensorId: string | null) => void', required: false, description: 'Hover callback for sensor highlighting on map' },
    { name: 'onMitigate', type: '(targetId, effectorId) => void', required: false, description: 'Initiate mitigation with specific effector' },
    { name: 'onMitigateAll', type: '(targetId) => void', required: false, description: 'Auto-assign best effector for mitigation' },
    { name: 'regulusEffectors', type: 'RegulusEffector[]', required: false, description: 'Available ECM effectors for mitigation' },
    { name: 'onClosureOutcome', type: '(targetId, outcome) => void', required: false, description: 'Incident closure outcome selection' },
    { name: 'onTargetFocus', type: '(targetId) => void', required: false, description: 'Focus/center map on target' },
    { name: 'onTargetHover', type: '(targetId: string | null) => void', required: false, description: 'Target hover for map highlight' },
    { name: 'thinMode', type: 'boolean', required: false, description: 'Compact mode hiding timeline and log sections' },
    { name: 'onSendDroneVerification', type: '(targetId) => void', required: false, description: 'Deploy drone for visual verification' },
    { name: 'onCameraLookAt', type: '(targetId, cameraId) => void', required: false, description: 'Point camera at target' },
    { name: 'onTakeControl', type: '(targetId) => void', required: false, description: 'Take manual control of camera' },
    { name: 'onReleaseControl', type: '(targetId) => void', required: false, description: 'Release manual camera control' },
    { name: 'onBdaOutcome', type: '(targetId, outcome) => void', required: false, description: 'Battle damage assessment outcome' },
    { name: 'onBdaCamera', type: '(targetId) => void', required: false, description: 'Request camera for BDA observation' },
  ],

  states: [
    {
      name: 'default (active tab)',
      trigger: 'Component mounts with targets',
      description: 'Active targets displayed in animated list with status chips, action buttons, and expandable cards',
      implementedInPrototype: true,
      storyProps: { targets: [] },
    },
    {
      name: 'completed tab',
      trigger: 'User clicks "הושלמו" tab',
      description: 'Shows completed/resolved/timed-out targets with muted styling',
      implementedInPrototype: true,
    },
    {
      name: 'card expanded',
      trigger: 'User clicks a target card',
      description: 'Card expands to show full details: media, actions, timeline, sensors, details, log, closure',
      implementedInPrototype: true,
    },
    {
      name: 'burst grouped',
      trigger: 'Multiple targets detected within short time/proximity',
      description: 'Targets grouped in StackedCard with expand/collapse and bulk mitigate',
      implementedInPrototype: true,
    },
    {
      name: 'new arrivals pill',
      trigger: 'New targets arrive while scrolled down',
      description: 'Floating "X איתורים חדשים" pill at top with entity type icons',
      implementedInPrototype: true,
    },
    {
      name: 'filter active',
      trigger: 'User applies filters via FilterBar',
      description: 'Target list filtered by activity status, sensor, or other criteria',
      implementedInPrototype: true,
    },
    {
      name: 'empty active',
      trigger: 'No active targets or all filtered out',
      description: '"אין מטרות פעילות" empty state text',
      implementedInPrototype: true,
      storyProps: { targets: [] },
    },
    {
      name: 'empty completed',
      trigger: 'No completed targets',
      description: '"אין אירועים שהושלמו" empty state text',
      implementedInPrototype: true,
    },
    {
      name: 'loading',
      trigger: 'Target data being fetched',
      description: 'Skeleton cards or spinner while targets load',
      implementedInPrototype: false,
      visualNotes: 'Skeleton TargetCard placeholders with shimmer',
    },
    {
      name: 'error',
      trigger: 'Target data API fails',
      description: 'Error state with retry option',
      implementedInPrototype: false,
    },
    {
      name: 'disabled',
      trigger: 'System in restricted mode',
      description: 'All action buttons disabled, list is read-only',
      implementedInPrototype: false,
    },
  ],

  interactions: [
    {
      trigger: 'click',
      element: 'Tab buttons (פעילות / הושלמו)',
      result: 'Switches between active and completed target lists',
      keyboard: 'Tab accessible, role="tab"',
    },
    {
      trigger: 'click',
      element: 'Target card header',
      result: 'Expands/collapses card, scrolls to view, clears from new arrivals',
    },
    {
      trigger: 'click',
      element: 'NewUpdatesPill',
      result: 'Clears new arrivals, scrolls list to top',
    },
    {
      trigger: 'click',
      element: 'Action buttons (verify, engage, dismiss, etc.)',
      result: 'Calls corresponding callback with target ID and action parameters',
    },
    {
      trigger: 'hover',
      element: 'Target card',
      result: 'Calls onTargetHover with target ID for map highlighting',
    },
    {
      trigger: 'scroll',
      element: 'Target list',
      result: 'Tracks scroll position for NewUpdatesPill visibility logic',
    },
  ],

  tokens: {
    colors: [
      { name: 'surface', value: '#141414', usage: 'List background and sticky header' },
      { name: 'tab-active', value: '#ffffff', usage: 'Active tab text and border-bottom' },
      { name: 'tab-inactive', value: '#a1a1aa', usage: 'Inactive tab text (zinc-400)' },
      { name: 'border', value: 'rgba(255,255,255,0.1)', usage: 'Tab bar border' },
    ],
    typography: [
      { name: 'tab-label', fontFamily: 'Heebo', fontSize: '12px', fontWeight: '600', lineHeight: '1.5', usage: 'Tab button text' },
      { name: 'tab-count', fontFamily: 'monospace', fontSize: '10px', fontWeight: '400', lineHeight: '1', usage: 'Active count badge in tab' },
      { name: 'empty-message', fontFamily: 'Heebo', fontSize: '12px', fontWeight: '400', lineHeight: '1.5', usage: 'Empty state text' },
    ],
    spacing: [
      { name: 'card-gap', value: '8px', usage: 'Gap between target cards (gap-3 ≈ 12px in list, space-y-2 = 8px in tabpanel)' },
      { name: 'list-px', value: '8px', usage: 'List horizontal padding (px-2)' },
    ],
    animations: [
      { name: 'card-enter', property: 'opacity, y, filter', duration: '250ms', easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)', usage: 'Card appearance animation via framer-motion' },
      { name: 'card-exit', property: 'opacity, y', duration: '250ms', easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)', usage: 'Card removal animation' },
    ],
  },

  flows: [
    {
      name: 'Detection to mitigation',
      type: 'happy',
      steps: [
        { actor: 'system', action: 'New target appears in active list', result: 'Card animates in with blur entrance, NewUpdatesPill may appear' },
        { actor: 'user', action: 'Clicks target card', result: 'Card expands showing details, sensors, actions' },
        { actor: 'user', action: 'Clicks verify action', result: 'onVerify fired, target status updates' },
        { actor: 'user', action: 'Clicks mitigate action', result: 'onMitigate fired with effector ID' },
        { actor: 'system', action: 'Target resolves', result: 'Card moves to completed tab' },
      ],
    },
    {
      name: 'Burst handling',
      type: 'happy',
      steps: [
        { actor: 'system', action: 'Multiple targets arrive within burst window', result: 'Targets grouped in StackedCard' },
        { actor: 'user', action: 'Expands burst stack', result: 'Individual cards shown within group' },
        { actor: 'user', action: 'Clicks bulk mitigate', result: 'onMitigateAll fired for each target in burst' },
      ],
    },
  ],

  accessibility: {
    role: 'tabpanel',
    ariaAttributes: ['role="tablist" on tab bar', 'role="tab" with aria-selected on tab buttons', 'role="tabpanel" with aria-labelledby on content areas'],
    keyboardNav: ['Tab to switch between tab buttons', 'Tab into target cards', 'data-tour attributes for onboarding'],
    focusManagement: 'Tab panel content scrollable, no focus trap. Sticky header stays visible.',
    screenReaderNotes: 'Tab buttons announce selected state. Target cards should announce status and available actions.',
  },

  tasks: [
    {
      id: 'LS-1',
      title: 'Remove debug fetch call',
      priority: 'P0',
      estimate: 'S',
      description: 'Remove the agent log fetch call to localhost:7712 that sends debug telemetry.',
      files: [
        { path: 'src/imports/ListOfSystems.tsx', action: 'modify', description: 'Remove fetch() call in render body (lines 762-763)' },
      ],
      acceptanceCriteria: [
        'No HTTP requests to localhost:7712 in render',
        'No side effects in render body',
      ],
    },
    {
      id: 'LS-2',
      title: 'Add loading and error states',
      priority: 'P1',
      estimate: 'M',
      description: 'Show skeleton cards while targets are loading and error state with retry on API failure.',
      files: [
        { path: 'src/imports/ListOfSystems.tsx', action: 'modify', description: 'Add loading/error props and corresponding UI' },
      ],
      acceptanceCriteria: [
        'Loading state shows 3-4 skeleton TargetCard placeholders',
        'Error state shows message with retry button',
        'Tabs and filters disabled during loading',
      ],
    },
    {
      id: 'LS-3',
      title: 'Extract callback builders to shared utility',
      priority: 'P2',
      estimate: 'M',
      description: 'buildCallbacks and buildCtx functions are verbose. Extract to a shared hook or utility.',
      files: [
        { path: 'src/imports/ListOfSystems.tsx', action: 'modify', description: 'Extract buildCallbacks/buildCtx to dedicated hook' },
      ],
      acceptanceCriteria: [
        'Callback builders are reusable across list contexts',
        'Props interface remains unchanged',
      ],
    },
    {
      id: 'LS-4',
      title: 'Add virtualization for large target lists',
      priority: 'P2',
      estimate: 'L',
      description: 'With many targets, rendering all cards degrades performance. Add virtualized scrolling.',
      files: [
        { path: 'src/imports/ListOfSystems.tsx', action: 'modify', description: 'Integrate react-window or @tanstack/virtual for list virtualization' },
      ],
      acceptanceCriteria: [
        'Only visible cards are rendered in DOM',
        'Scroll performance stays smooth with 100+ targets',
        'AnimatePresence animations still work for visible cards',
      ],
    },
  ],

  hardcodedData: [
    { current: 'MOCK_TARGETS empty array as default', replaceWith: 'Required prop or data hook', location: 'ListOfSystems.tsx line 189' },
    { current: 'Debug fetch() to localhost:7712', replaceWith: 'Remove entirely', location: 'ListOfSystems.tsx lines 762-763' },
    { current: 'Hebrew string literals', replaceWith: 'i18n translation keys', location: 'ListOfSystems.tsx throughout' },
  ],

  notes: [
    'Contains a debug fetch() call in the render body that should be removed before production.',
    'Uses framer-motion AnimatePresence with popLayout mode for smooth reorder animations.',
    'New arrivals logic uses refs (seenTargetIdsRef, hasHydratedTargetsRef) to avoid flash on initial mount.',
    'Component has ~60 props — strong candidate for a context-based approach to reduce prop drilling.',
    'Burst grouping via groupIntoBursts() from useTargetBursts hook.',
    'Reduced motion support via useReducedMotion() from framer-motion.',
  ],
};
