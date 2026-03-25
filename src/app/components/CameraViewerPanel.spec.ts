import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'CameraViewerPanel',
  filePath: 'src/app/components/CameraViewerPanel.tsx',
  purpose: 'Multi-feed camera viewer panel supporting up to 4 simultaneous camera feeds with drag-and-drop from DevicesPanel, camera picker dropdown, split-screen controls, and hover-to-highlight on map.',
  location: 'Composition',
  status: 'prototype',

  props: [
    { name: 'feeds', type: 'CameraFeed[]', required: true, description: 'Array of active camera feeds (max 4). Each has a cameraId string.' },
    { name: 'onFeedsChange', type: '(feeds: CameraFeed[]) => void', required: true, description: 'Called whenever feeds array changes (add, remove, swap camera)' },
    { name: 'onCameraHover', type: '(cameraId: string | null) => void', required: false, description: 'Called on mouse enter/leave of a feed slot for map highlighting' },
  ],

  states: [
    {
      name: 'default (single feed)',
      trigger: 'feeds=[{ cameraId: "CAM-NVT-PTZ-N" }]',
      description: 'Single camera feed fills the panel with live video, LIVE badge, hover controls for picker and remove',
      implementedInPrototype: true,
      storyProps: { feeds: [{ cameraId: 'CAM-NVT-PTZ-N' }] },
    },
    {
      name: 'multi feed (2-4)',
      trigger: 'feeds has 2-4 entries',
      description: 'Feeds stacked vertically with 1px dividers, each with independent controls',
      implementedInPrototype: true,
      storyProps: { feeds: [{ cameraId: 'CAM-NVT-PTZ-N' }, { cameraId: 'CAM-NVT-PIXELSIGHT' }] },
    },
    {
      name: 'empty slot (picker)',
      trigger: 'Feed entry has empty cameraId',
      description: 'Dashed-border placeholder with "בחר תוכן" dropdown to select camera or map',
      implementedInPrototype: true,
    },
    {
      name: 'no feeds',
      trigger: 'feeds=[]',
      description: 'Empty panel with no content',
      implementedInPrototype: true,
      storyProps: { feeds: [] },
    },
    {
      name: 'at max capacity',
      trigger: 'feeds.length === 4',
      description: 'Split-screen button hidden, no more feeds can be added',
      implementedInPrototype: true,
    },
    {
      name: 'drag over panel',
      trigger: 'User drags a camera from DevicesPanel over the panel',
      description: 'Panel gets ring-2 ring-white/20 highlight; individual slots get inset shadow',
      implementedInPrototype: true,
      visualNotes: 'ring-2 ring-inset ring-white/20 on panel, inset box-shadow on slots',
    },
    {
      name: 'split-screen hover',
      trigger: 'User hovers bottom edge of panel',
      description: 'Split-screen button slides up with spring animation',
      implementedInPrototype: true,
    },
    {
      name: 'loading',
      trigger: 'Camera feed is connecting/buffering',
      description: 'Loading spinner or skeleton in feed slot while stream connects',
      implementedInPrototype: false,
      visualNotes: 'Centered spinner over black background',
    },
    {
      name: 'error',
      trigger: 'Camera feed connection fails',
      description: 'Error state in feed slot with retry option',
      implementedInPrototype: false,
    },
    {
      name: 'disabled',
      trigger: 'Camera system offline',
      description: 'Panel shows disabled state with message',
      implementedInPrototype: false,
    },
  ],

  interactions: [
    {
      trigger: 'drop',
      element: 'Feed slot or panel',
      result: 'Camera from DevicesPanel dropped into slot — updates feeds array',
    },
    {
      trigger: 'click',
      element: 'Camera picker dropdown',
      result: 'Opens dropdown with available cameras; disabled cameras already in use',
    },
    {
      trigger: 'click',
      element: 'Remove button (X)',
      result: 'Removes feed from slot; if last feed, clears all feeds',
    },
    {
      trigger: 'click',
      element: 'Split-screen button',
      result: 'Adds empty feed slot and auto-opens camera picker',
    },
    {
      trigger: 'hover',
      element: 'Feed slot with active camera',
      result: 'Shows camera picker and remove controls; calls onCameraHover with cameraId',
      animation: { property: 'opacity', from: '0', to: '1', duration: '200ms', easing: 'ease-out' },
    },
    {
      trigger: 'hover',
      element: 'Bottom edge of panel',
      result: 'Split-screen button slides up',
      animation: { property: 'transform', from: 'translateY(100%)', to: 'translateY(0)', duration: '350ms', easing: 'spring(1, 80, 10, 0)' },
    },
  ],

  tokens: {
    colors: [
      { name: 'panel-bg', value: '#0a0a0a', usage: 'Panel background' },
      { name: 'slot-bg', value: '#141414', usage: 'Empty slot background' },
      { name: 'divider', value: 'rgba(255,255,255,0.1)', usage: 'Feed slot dividers' },
      { name: 'live-badge-dot', value: '#ef4444', usage: 'Pulsing red LIVE indicator dot' },
      { name: 'dnd-highlight', value: 'rgba(255,255,255,0.25)', usage: 'Drop target inset shadow on drag-over' },
    ],
    typography: [
      { name: 'camera-label', fontFamily: 'Heebo', fontSize: '10px', fontWeight: '500', lineHeight: '1', usage: 'Camera name in picker button' },
      { name: 'live-badge', fontFamily: 'Heebo', fontSize: '9px', fontWeight: '500', lineHeight: '1', usage: 'LIVE badge text (uppercase, tracked)' },
      { name: 'picker-item', fontFamily: 'Heebo', fontSize: '12px', fontWeight: '400', lineHeight: '1.5', usage: 'Dropdown menu item text' },
      { name: 'split-label', fontFamily: 'Heebo', fontSize: '12px', fontWeight: '400', lineHeight: '1.5', usage: 'Split-screen button text' },
    ],
    spacing: [
      { name: 'slot-divider', value: '1px', usage: 'Height of divider between feed slots' },
      { name: 'overlay-padding', value: '10px', usage: 'Padding in top overlay area (px-2.5 pt-2)' },
    ],
  },

  flows: [
    {
      name: 'Add camera via drag-and-drop',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'Drags camera row from DevicesPanel', result: 'DnD preview appears' },
        { actor: 'user', action: 'Drops onto CameraViewerPanel', result: 'New feed slot appears with camera video' },
        { actor: 'system', action: 'Updates feeds array', result: 'onFeedsChange called with new feed' },
      ],
    },
    {
      name: 'Split screen flow',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'Hovers bottom edge of panel', result: 'Split-screen button slides up' },
        { actor: 'user', action: 'Clicks split-screen button', result: 'New empty slot added, camera picker auto-opens' },
        { actor: 'user', action: 'Selects camera from picker', result: 'Camera feed appears in new slot' },
      ],
    },
    {
      name: 'Attempt to add duplicate camera',
      type: 'edge-case',
      steps: [
        { actor: 'user', action: 'Drags camera already in a feed slot', result: 'Drop is rejected (canDrop returns false)' },
        { actor: 'user', action: 'Opens picker on another slot', result: 'Already-used cameras shown as disabled in dropdown' },
      ],
    },
  ],

  accessibility: {
    ariaAttributes: ['aria-label="הסר חלון" on remove buttons', 'aria-label="הסר מצלמה" on camera remove', 'aria-label="פצל מסך" on split button', 'aria-hidden on decorative icons'],
    keyboardNav: ['Tab to picker button, remove button, split-screen button', 'Enter/Space to activate buttons'],
    focusManagement: 'Focus ring (ring-white/25) on all interactive elements. Split button gains focus on hover via onFocus.',
    screenReaderNotes: 'Video elements have empty <track kind="captions" /> — needs real captions for accessibility. Dropdown items announce camera name and disabled state.',
  },

  tasks: [
    {
      id: 'CVP-1',
      title: 'Connect to real camera streams',
      priority: 'P0',
      estimate: 'L',
      description: 'Replace static video src="/videos/target-feed.mov" with real RTSP/WebRTC camera streams.',
      files: [
        { path: 'src/app/components/CameraViewerPanel.tsx', action: 'modify', description: 'Integrate real camera stream URLs based on cameraId' },
      ],
      acceptanceCriteria: [
        'Each feed slot shows live stream from selected camera',
        'Stream reconnects on temporary disconnection',
        'Loading state shown while stream connects',
      ],
    },
    {
      id: 'CVP-2',
      title: 'Add feed loading and error states',
      priority: 'P1',
      estimate: 'M',
      description: 'Show loading spinner when stream is connecting and error state with retry on failure.',
      files: [
        { path: 'src/app/components/CameraViewerPanel.tsx', action: 'modify', description: 'Add connection state tracking per feed slot' },
      ],
      acceptanceCriteria: [
        'Loading spinner shown during stream connection',
        'Error state with retry button on stream failure',
        'Timeout after configurable period shows error',
      ],
      dependencies: ['CVP-1'],
    },
    {
      id: 'CVP-3',
      title: 'Add PTZ camera controls overlay',
      priority: 'P1',
      estimate: 'L',
      description: 'For PTZ cameras, add pan/tilt/zoom controls as an overlay on the feed slot.',
      files: [
        { path: 'src/app/components/CameraViewerPanel.tsx', action: 'modify', description: 'Add PTZ control overlay for capable cameras' },
      ],
      acceptanceCriteria: [
        'PTZ-capable feeds show directional controls on hover',
        'Zoom slider or buttons available',
        'Controls send commands to camera backend',
      ],
    },
    {
      id: 'CVP-4',
      title: 'Add video captions track',
      priority: 'P2',
      estimate: 'S',
      description: 'Video elements have empty captions track — need to provide real captions or descriptive metadata.',
      files: [
        { path: 'src/app/components/CameraViewerPanel.tsx', action: 'modify', description: 'Add meaningful track content or aria description' },
      ],
      acceptanceCriteria: [
        'Video elements have descriptive captions or aria-label',
        'Accessibility linters pass without warnings',
      ],
    },
  ],

  hardcodedData: [
    { current: 'Video src="/videos/target-feed.mov"', replaceWith: 'Real camera stream URL from API', location: 'CameraViewerPanel.tsx FeedSlot component' },
    { current: 'CAMERA_ASSETS imported from TacticalMap', replaceWith: 'Shared camera data hook or API', location: 'CameraViewerPanel.tsx imports' },
    { current: 'MAX_FEEDS = 4 constant', replaceWith: 'Configurable via prop or system config', location: 'CameraViewerPanel.tsx line 239' },
    { current: 'Hebrew string literals', replaceWith: 'i18n translation keys', location: 'CameraViewerPanel.tsx throughout' },
  ],

  notes: [
    'Uses react-dnd useDrop for both individual slots and the panel container — panel acts as fallback drop target.',
    'FeedSlot has complex auto-open picker logic via autoOpenSlot state for split-screen flow.',
    'Slot deduplication: same camera cannot appear in two slots (usedIds filtering).',
    'Framer Motion useReducedMotion for accessible split-screen button animation.',
    'The "מפה" option in the picker is disabled — future feature to show map in a slot.',
  ],
};
