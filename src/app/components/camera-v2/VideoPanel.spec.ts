import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'VideoPanel',
  filePath: 'src/app/components/camera-v2/VideoPanel.tsx',
  purpose:
    'Multi-feed video panel for the rebuilt video feature. Shows up to 4 camera feeds in adaptive layouts (1 = fill, 2 = vertical stack, 3-4 = 2x2 grid). Drop on the panel appends; drop on a tile swaps. Maximize / PIP layout was removed in v2. Adding feeds is driven entirely by drag/drop or pin-from-devices.',
  location: 'Composition (camera-v2)',
  status: 'prototype',

  props: [
    { name: 'feeds', type: 'CameraFeed[]', required: true, description: 'Active feeds (max 4). Each: { cameraId, mode, showDetections?, designateMode?, playback? }' },
    { name: 'onFeedsChange', type: '(feeds: CameraFeed[]) => void', required: true, description: 'Called when feeds are added, removed, or modified' },
    { name: 'cameraLabelById', type: 'Record<string, string>', required: true, description: 'Display label per camera id' },
    { name: 'statusByCameraId', type: 'Record<string, CameraStatus>', required: true, description: 'Live telemetry + ownership per camera (and drone)' },
    { name: 'detectionsByCameraId', type: 'Record<string, DetectionBox[]>', required: true, description: 'Detection boxes per camera (mocked in playground)' },
    { name: 'videoSrcDay', type: 'string', required: true, description: 'Video src for day mode' },
    { name: 'videoSrcNight', type: 'string', required: false, description: 'Optional video src for night/IR mode; falls back to a CSS filter on the day src' },
    { name: 'videoSrcPlayback', type: 'string', required: false, description: 'Recorded clip used as the playback feed in the live-vs-playback split' },
    { name: 'fullscreen', type: 'boolean', required: true, description: 'True iff the panel itself is in fullscreen mode' },
    { name: 'onFullscreenToggle', type: '() => void', required: true, description: 'Toggle panel fullscreen' },
    { name: 'onTakeControl', type: '(cameraId: string) => void', required: true, description: 'User wants to take control of a camera' },
    { name: 'onReleaseControl', type: '(cameraId: string) => void', required: true, description: 'User releases an owned camera' },
    { name: 'onAssignmentClick', type: '(cameraId: string) => void', required: false, description: 'Click on the assignment pill in the top HUD (e.g. focus the target on the map)' },
    { name: 'onPinDevice', type: '(deviceId: string) => void', required: true, description: 'Pin a device id (camera or drone) into a feed slot. Used by the panel-level drop fallback.' },
    { name: 'onTileFocus', type: '(cameraId: string) => void', required: false, description: 'Bubbled when a tile gains focus, so the panel can track the LRU tile for pin-swap logic.' },
    { name: 'onZoomChange', type: '(cameraId: string, zoomLevel: number) => void', required: false, description: 'Bubbles zoom slider changes to the parent.' },
    { name: 'onDesignateTarget', type: '(cameraId: string, normX: number, normY: number) => void', required: false, description: 'Operator clicked a point on a feed in designate-target mode. Coords are normalised (0..1, top-left origin).' },
  ],

  states: [
    { name: 'single feed', trigger: 'feeds.length === 1', description: 'One feed fills the panel', implementedInPrototype: true },
    { name: 'two feeds (stacked)', trigger: 'feeds.length === 2', description: 'Vertical stack with 1px divider', implementedInPrototype: true },
    { name: 'three / four feeds (grid)', trigger: 'feeds.length === 3 || 4', description: '2x2 CSS grid; gaps shown as 1px white/10 lines', implementedInPrototype: true },
    { name: 'panel fullscreen', trigger: 'fullscreen === true', description: 'Panel grows to occupy the entire viewport (left nav hidden)', implementedInPrototype: true },
    { name: 'empty slot', trigger: 'feed.cameraId === ""', description: 'Slot shows a "drop or pin a device here" hint', implementedInPrototype: true },
    { name: 'panel drop hover', trigger: 'A device card is dragged over the panel background', description: 'Inset sky ring on the entire panel; drop appends or pins (LRU swap if full)', implementedInPrototype: true },
    { name: 'loading', trigger: 'Stream is connecting', description: 'Skeleton or spinner while RTSP/WebRTC negotiates', implementedInPrototype: false },
    { name: 'error', trigger: 'Stream connection fails', description: 'Per-feed error card with retry', implementedInPrototype: false },
    { name: 'disabled', trigger: 'Camera asset offline', description: 'Feed shows offline state; controls disabled', implementedInPrototype: false },
  ],

  interactions: [
    { trigger: 'click', element: 'Fullscreen button on a tile', result: 'Calls onFullscreenToggle; panel expands viewport-wide' },
    { trigger: 'drop', element: 'Tile body', result: 'Swaps the tile cameraId to the dropped device' },
    { trigger: 'drop', element: 'Panel background (not on a tile)', result: 'Calls onPinDevice with the device id' },
  ],

  tokens: {
    colors: [
      { name: 'panel-bg', value: '#0a0a0a', usage: 'Panel background' },
      { name: 'slot-bg', value: '#141414', usage: 'Empty slot background' },
      { name: 'grid-divider', value: 'rgba(255,255,255,0.1)', usage: 'Gaps in 2x2 grid + stack divider' },
      { name: 'drop-accent', value: 'rgba(56,189,248,0.6)', usage: 'Inset ring on a tile / panel during a valid drop' },
    ],
    typography: [],
    spacing: [
      { name: 'grid-gap', value: '1px', usage: 'Gap between feeds in 2x2 grid' },
    ],
  },

  flows: [
    {
      name: 'Pin a device from the devices panel',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'Opens the devices panel and clicks Pin on a camera card', result: 'PlaygroundPage.handlePinDevice fills an empty slot, appends a new feed, or swaps the LRU tile' },
        { actor: 'user', action: 'Drags another camera card onto an existing tile', result: 'Tile cameraId is replaced (swap-on-drop)' },
        { actor: 'user', action: 'Drags a card onto the panel whitespace', result: 'Same logic as click-to-pin (panel-level drop)' },
      ],
    },
  ],

  accessibility: {
    role: 'region',
    ariaAttributes: ['aria-label per tile', 'aria-pressed on toggle controls', 'aria-hidden on decorative gradients/icons'],
    keyboardNav: ['Tab to focus a tile', 'F = fullscreen', 'T = take/release control', 'D = day/night toggle', 'X = toggle designate-target mode', 'S = settings', 'P = playback', 'Esc = cancel designate / close settings / exit fullscreen'],
    focusManagement: 'Tile uses focus-visible inset ring; controls reveal on focus-within so keyboard users get the same affordance as mouse hover.',
  },

  tasks: [
    {
      id: 'VP-1',
      title: 'Replace static MP4s with live streams',
      priority: 'P0',
      estimate: 'L',
      description: 'Swap the placeholder /videos/*.mov + .mp4 for real RTSP/WebRTC streams from the camera backend.',
      files: [{ path: 'src/app/components/camera-v2/CameraFeedTile.tsx', action: 'modify', description: 'Use a streaming hook instead of <video src>' }],
      acceptanceCriteria: ['Feed shows the live stream for the selected camera', 'Reconnects automatically on transient drops', 'Loading + error states implemented'],
    },
    {
      id: 'VP-2',
      title: 'Promote into Dashboard',
      priority: 'P0',
      estimate: 'M',
      description: 'Replace the legacy CameraViewerPanel with the new VideoPanel and wire the existing onTakeControl / onReleaseControl / onSensorModeChange handlers in Dashboard.tsx.',
      files: [
        { path: 'src/app/components/Dashboard.tsx', action: 'modify', description: 'Swap import + props; add panel fullscreen to ResizablePanelGroup' },
        { path: 'src/app/components/CameraViewerPanel.tsx', action: 'modify', description: 'Delete' },
      ],
      acceptanceCriteria: ['Dashboard uses VideoPanel', 'Take/release control round-trips with the dashboard ownership state', 'Panel fullscreen collapses the map ResizablePanel'],
    },
  ],

  hardcodedData: [
    { current: '/videos/target-feed.mov, /videos/weapon-feed.mp4', replaceWith: 'Live RTSP/WebRTC URL per camera id', location: 'PlaygroundPage VIDEO_SRC_* constants' },
    { current: 'MOCK_DETECTIONS', replaceWith: 'Real-time detection feed', location: 'PlaygroundPage' },
    { current: 'Operator B as foreign owner', replaceWith: 'Real multi-operator presence', location: 'PlaygroundPage initial ownership' },
    { current: 'Synthetic drone telemetry tick', replaceWith: 'MAVLink / WebSocket feed', location: 'PlaygroundPage droneTelemetry interval' },
  ],

  notes: [
    'Panel is presentational - all state lives in PlaygroundPage. This keeps the component swap into Dashboard easy.',
    'YouTube-inspired hover affordance: top HUD always visible, bottom control bar fades in on hover/focus.',
    'Maximize / PIP was removed in v2 - empty slots and the pin-from-devices flow replace the use case.',
  ],
};
