import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'DevicesPanel',
  filePath: 'src/app/components/DevicesPanel.tsx',
  purpose: 'Side panel listing all CUAS devices (cameras, radars, docks, drones, ECM, launchers, LiDAR, weapon systems) with filtering, search, expandable detail rows, drag-to-camera-viewer, and device-specific controls.',
  location: 'CUAS',
  status: 'prototype',

  props: [
    { name: 'open', type: 'boolean', required: true, description: 'Controls panel visibility with slide-in/out transition' },
    { name: 'onClose', type: '() => void', required: true, description: 'Called when the close button is clicked' },
    { name: 'onFlyTo', type: '(lat: number, lon: number) => void', required: true, description: 'Called when "center on map" is clicked for a device' },
    { name: 'onDeviceHover', type: '(id: string | null) => void', required: false, description: 'Called on mouse enter/leave of a device row for map highlighting' },
    { name: 'onJamActivate', type: '(jammerId: string) => void', required: false, description: 'Called when ECM jam button is clicked' },
    { name: 'noTransition', type: 'boolean', required: false, description: 'Disables slide transition (used in Storybook)' },
    { name: 'width', type: 'number', required: false, description: 'Override panel width in pixels (defaults to LAYOUT_TOKENS.sidebarWidthPx)' },
  ],

  states: [
    {
      name: 'default',
      trigger: 'Panel opens with open=true',
      description: 'All devices listed, grouped by type, sorted offline-first. Filter bar shows all types active.',
      implementedInPrototype: true,
      storyProps: { open: true },
    },
    {
      name: 'closed',
      trigger: 'open=false',
      description: 'Panel slides off-screen to the right with translate-x transform',
      implementedInPrototype: true,
      storyProps: { open: false },
    },
    {
      name: 'filtered by type',
      trigger: 'User clicks a device-type icon in filter bar',
      description: 'Only devices of selected type(s) are shown; active filter has ring highlight',
      implementedInPrototype: true,
    },
    {
      name: 'search active',
      trigger: 'User types in search input',
      description: 'Devices filtered by name or ID match; clear button appears',
      implementedInPrototype: true,
    },
    {
      name: 'device expanded',
      trigger: 'User clicks a device row',
      description: 'Row expands to show stats grid, action bar, and camera-specific preview/controls',
      implementedInPrototype: true,
    },
    {
      name: 'camera dragging',
      trigger: 'User starts dragging a camera row',
      description: 'Row opacity reduces to 0.4 while dragging via react-dnd',
      implementedInPrototype: true,
      visualNotes: 'opacity: 0.4 on the row container',
    },
    {
      name: 'device muted',
      trigger: 'User clicks mute button in expanded row',
      description: 'BellOff icon + 30-minute countdown timer shown on row; amber highlight on mute button',
      implementedInPrototype: true,
    },
    {
      name: 'ECM jam active',
      trigger: 'ECM device with status "active"',
      description: 'Jam button shows "שיבוש פעיל" and is disabled',
      implementedInPrototype: true,
    },
    {
      name: 'malfunctioning device',
      trigger: 'Device operationalStatus = "malfunctioning"',
      description: 'Orange icon tint, orange name text, AlertTriangle icon, jam button disabled with tooltip',
      implementedInPrototype: true,
    },
    {
      name: 'calibration flow (drone)',
      trigger: 'User clicks calibration button on a drone row',
      description: '3-state button: idle→running (Loader2 spinner)→done (Check icon)→idle',
      implementedInPrototype: true,
    },
    {
      name: 'empty results',
      trigger: 'Filter/search combination yields no matching devices',
      description: '"אין מכשירים תואמים" empty state message',
      implementedInPrototype: true,
    },
    {
      name: 'loading',
      trigger: 'Device data is being fetched from API',
      description: 'Skeleton rows or spinner while devices load',
      implementedInPrototype: false,
      visualNotes: 'Shimmer skeleton rows matching device row height',
    },
    {
      name: 'error',
      trigger: 'Device API request fails',
      description: 'Error state with retry option',
      implementedInPrototype: false,
    },
    {
      name: 'disabled',
      trigger: 'Panel rendered while system is in restricted mode',
      description: 'Interactions disabled, reduced opacity overlay',
      implementedInPrototype: false,
    },
  ],

  interactions: [
    {
      trigger: 'click',
      element: 'Close button (X)',
      result: 'Calls onClose callback',
      keyboard: 'Focusable via tab',
    },
    {
      trigger: 'input',
      element: 'Search field',
      result: 'Filters device list by name/ID in real time',
      keyboard: 'Standard text input; clear button appears when non-empty',
    },
    {
      trigger: 'click',
      element: 'Type filter icon',
      result: 'Toggles single-type filter. Click when all active → isolate type. Click isolated → show all.',
    },
    {
      trigger: 'click',
      element: 'Device row',
      result: 'Expands/collapses device details with grid-template-rows animation',
      animation: { property: 'grid-template-rows', from: '0fr', to: '1fr', duration: '200ms', easing: 'ease-out' },
      keyboard: 'Enter or Space to toggle',
    },
    {
      trigger: 'drag',
      element: 'Camera device row',
      result: 'Initiates react-dnd drag with DEVICE_CAMERA type for drop into CameraViewerPanel',
    },
    {
      trigger: 'click',
      element: '"מרכז במפה" button',
      result: 'Calls onFlyTo with device lat/lon',
    },
    {
      trigger: 'click',
      element: 'Mute button',
      result: 'Toggles 30-minute mute timer with countdown display',
    },
    {
      trigger: 'click',
      element: 'ECM "הפעל" button',
      result: 'Calls onJamActivate with device ID',
    },
    {
      trigger: 'click',
      element: 'Camera preset tabs',
      result: 'Switches active camera mode (רגיל/לילה/זום/תרמי)',
    },
    {
      trigger: 'click',
      element: 'Wipers toggle (drone)',
      result: 'Toggles wipers switch on/off',
      animation: { property: 'transform', from: 'translateX(0)', to: 'translateX(14px)', duration: '200ms', easing: 'ease-out' },
    },
    {
      trigger: 'click',
      element: 'Calibration button (drone)',
      result: 'Starts calibration: idle → running (2s) → done (1.5s) → idle',
    },
    {
      trigger: 'hover',
      element: 'Device row',
      result: 'Calls onDeviceHover with device ID; bg-white/[0.04] highlight',
      animation: { property: 'background-color', from: 'transparent', to: 'rgba(255,255,255,0.04)', duration: '150ms', easing: 'ease-out' },
    },
  ],

  tokens: {
    colors: [
      { name: 'panel-bg', value: '#141414', usage: 'Panel background' },
      { name: 'border', value: 'rgba(255,255,255,0.1)', usage: 'Panel border and dividers' },
      { name: 'row-hover', value: 'rgba(255,255,255,0.04)', usage: 'Device row hover background' },
      { name: 'status-online', value: '#34d399', usage: 'Online connection dot (emerald-400)' },
      { name: 'status-offline', value: '#71717a', usage: 'Offline connection dot (zinc-500)' },
      { name: 'status-error', value: '#f87171', usage: 'Error connection dot (red-400)' },
      { name: 'status-warning', value: '#fbbf24', usage: 'Warning connection dot (amber-400)' },
      { name: 'malfunction-icon', value: '#f97316', usage: 'Orange tint for malfunctioning devices' },
      { name: 'jam-btn-bg', value: 'oklch(0.348 0.111 17)', usage: 'ECM jam button background' },
    ],
    typography: [
      { name: 'panel-title', fontFamily: 'Heebo', fontSize: '12px', fontWeight: '500', lineHeight: '1.5', usage: 'Panel header "מכשירים"' },
      { name: 'device-name', fontFamily: 'Heebo', fontSize: '13px', fontWeight: '500', lineHeight: '1.5', usage: 'Device row name text' },
      { name: 'device-metric', fontFamily: 'monospace', fontSize: '11px', fontWeight: '400', lineHeight: '1.5', usage: 'Coverage/metric text' },
      { name: 'group-label', fontFamily: 'Heebo', fontSize: '12px', fontWeight: '400', lineHeight: '1.5', usage: 'Device type group header' },
    ],
    spacing: [
      { name: 'row-px', value: '16px', usage: 'Row horizontal padding (px-4)' },
      { name: 'row-py', value: '10px', usage: 'Row vertical padding (py-2.5)' },
      { name: 'header-px', value: '16px', usage: 'Header horizontal padding' },
    ],
  },

  flows: [
    {
      name: 'Drag camera to viewer',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'Opens DevicesPanel', result: 'Panel slides in showing all devices' },
        { actor: 'user', action: 'Drags a camera row', result: 'Row opacity drops, DnD preview appears' },
        { actor: 'user', action: 'Drops onto CameraViewerPanel slot', result: 'Camera feed appears in slot' },
      ],
    },
    {
      name: 'Activate ECM jamming',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'Clicks "הפעל" on an ECM device', result: 'onJamActivate called' },
        { actor: 'system', action: 'Updates device status to "active"', result: 'Button changes to "שיבוש פעיל" (disabled)' },
      ],
    },
  ],

  accessibility: {
    role: 'complementary',
    ariaAttributes: ['aria-label="סגור" on close button', 'role="button" on device rows', 'role="switch" on wipers toggle', 'aria-pressed on mute button'],
    keyboardNav: ['Tab through filter icons, search, device rows', 'Enter/Space to expand device row', 'Enter to activate buttons'],
    focusManagement: 'Focus ring (ring-white/25) on all interactive elements',
    screenReaderNotes: 'Tooltips on connection status dots provide state labels. Disabled jam buttons have tooltip with reason.',
  },

  tasks: [
    {
      id: 'DP-1',
      title: 'Replace hardcoded ALL_DEVICES with API data',
      priority: 'P0',
      estimate: 'L',
      description: 'Replace the static ALL_DEVICES array and all hardcoded lookup maps (SENSOR_BATTERY, CAMERA_CAPS, DEVICE_HEALTH, DEVICE_CONNECTION) with real API data source.',
      files: [
        { path: 'src/app/components/DevicesPanel.tsx', action: 'modify', description: 'Accept devices via props or data hook instead of module-level constant' },
      ],
      acceptanceCriteria: [
        'DevicesPanel receives device data via props or a data hook',
        'All hardcoded maps (SENSOR_BATTERY, CAMERA_CAPS, etc.) are removed',
        'Devices reflect live operational state from backend',
      ],
    },
    {
      id: 'DP-2',
      title: 'Add loading skeleton state',
      priority: 'P1',
      estimate: 'M',
      description: 'Show skeleton placeholder rows while device data is loading.',
      files: [
        { path: 'src/app/components/DevicesPanel.tsx', action: 'modify', description: 'Add loading prop and skeleton rows' },
      ],
      acceptanceCriteria: [
        'Loading state shows 6-8 shimmer skeleton rows',
        'Skeleton matches device row dimensions',
        'Filter bar is disabled during loading',
      ],
      dependencies: ['DP-1'],
    },
    {
      id: 'DP-3',
      title: 'Add error state with retry',
      priority: 'P1',
      estimate: 'S',
      description: 'Display error message with retry button when device data fails to load.',
      files: [
        { path: 'src/app/components/DevicesPanel.tsx', action: 'modify', description: 'Add error prop and error state UI' },
      ],
      acceptanceCriteria: [
        'Error state shows message and retry button',
        'Retry button triggers data refetch',
      ],
      dependencies: ['DP-1'],
    },
    {
      id: 'DP-4',
      title: 'Persist mute state across sessions',
      priority: 'P2',
      estimate: 'M',
      description: 'Mute state is currently in-memory only. Persist to backend or localStorage.',
      files: [
        { path: 'src/app/components/DevicesPanel.tsx', action: 'modify', description: 'Persist muted devices map' },
      ],
      acceptanceCriteria: [
        'Muted devices survive page refresh',
        'Countdown resumes correctly from persisted expiry time',
      ],
    },
  ],

  hardcodedData: [
    { current: 'ALL_DEVICES array built from CAMERA_ASSETS, RADAR_ASSETS, etc.', replaceWith: 'API endpoint or real-time data feed', location: 'DevicesPanel.tsx lines 130-196' },
    { current: 'SENSOR_BATTERY lookup map', replaceWith: 'Device telemetry API field', location: 'DevicesPanel.tsx lines 100-106' },
    { current: 'CAMERA_CAPS lookup map', replaceWith: 'Device capabilities API field', location: 'DevicesPanel.tsx lines 108-111' },
    { current: 'DEVICE_HEALTH lookup map', replaceWith: 'Device health API field', location: 'DevicesPanel.tsx lines 113-116' },
    { current: 'DEVICE_CONNECTION lookup map', replaceWith: 'Device connection state API field', location: 'DevicesPanel.tsx lines 118-123' },
    { current: 'CAMERA_PRESETS lookup map', replaceWith: 'Camera configuration API', location: 'DevicesPanel.tsx lines 125-128' },
    { current: 'Hebrew string literals (TYPE_LABELS, button labels)', replaceWith: 'i18n translation keys', location: 'DevicesPanel.tsx throughout' },
  ],

  notes: [
    'Panel uses react-dnd useDrag for camera rows — must be wrapped in DndProvider in Storybook.',
    'Mute timer runs a 1s interval shared across all muted devices — efficient but could drift on heavy loads.',
    'Type filter uses exclusive toggle logic: clicking when all active isolates that type; clicking the isolated type restores all.',
    'Camera rows are the only draggable rows (canDrag: isCamera).',
    'The panel uses absolute positioning within a relative parent — not standalone.',
  ],
};
