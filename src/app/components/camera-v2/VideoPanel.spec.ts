import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'VideoPanel',
  filePath: 'src/app/components/camera-v2/VideoPanel.tsx',
  purpose:
    'Multi-feed video panel for the rebuilt video feature. Shows up to 5 camera feeds in one of four operator-chosen layouts via the panel-level VideoLayoutPicker: Single (1 fills), Stack-2 (2 vertical), Grid 2x2 (up to 4), Hero+Filmstrip (1 hero + up to 4 thumbs). When the chosen layout cannot fit the current feed count, the panel falls back deterministically (hero-filmstrip → grid-2x2 → stack-2 → single). Drop on the panel appends; drop on a tile swaps. Adding feeds is driven entirely by drag/drop or pin-from-devices.',
  location: 'Composition (camera-v2)',
  status: 'prototype',

  props: [
    { name: 'feeds', type: 'CameraFeed[]', required: true, description: 'Active feeds (max 5). Each: { cameraId, mode, showDetections?, designateMode?, playback? }' },
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
    { name: 'onTileHover', type: '(cameraId: string | null) => void', required: false, description: 'Pointer enter/leave on a mounted feed tile. Fires the feed cameraId on enter and null on leave so the host can drive map marker hover.' },
    { name: 'onZoomChange', type: '(cameraId: string, zoomLevel: number) => void', required: false, description: 'Bubbles zoom slider changes to the parent.' },
    { name: 'onDesignateTarget', type: '(cameraId: string, normX: number, normY: number) => void', required: false, description: 'Operator clicked a point on a feed in designate-target mode. Coords are normalised (0..1, top-left origin).' },
    { name: 'layout', type: "LayoutKind ('single' | 'stack-2' | 'grid-2x2' | 'hero-filmstrip')", required: true, description: 'Operator-chosen layout preset. The panel never auto-overrides this — invalid combinations fall back at render time but the prop value is preserved so the picker keeps showing the operator intent.' },
    { name: 'onLayoutChange', type: '(next: LayoutKind) => void', required: true, description: 'Picker change callback. Wired to the parent state (PlaygroundPage / Dashboard).' },
    { name: 'activeFeedIndex', type: 'number', required: true, description: "Index into feeds[] of the operator's focal feed. Drives the rendered feed in `single`, the hero in `hero-filmstrip`, and the focus / keyboard-shortcut target in the multi-tile layouts. Clamped to [0, feeds.length-1] internally. Replaces the legacy `heroIndex` — the persisted JSON still reads `heroIndex` for one-shot migration." },
    { name: 'onActiveFeedChange', type: '(next: number) => void', required: true, description: 'Operator promoted a tile (via tab click, thumb promote, or `onFocus`). Used by the parent to update `activeFeedIndex`.' },
    { name: 'showLayoutPicker', type: 'boolean', required: false, description: 'Defaults to `true`. Pass `false` when the host renders the `VideoLayoutPicker` in its own chrome (e.g. the Gridblock cameras panel header).' },
    { name: 'showTileAssetPicker', type: 'boolean', required: false, description: "Defaults to `true`. Pass `false` when the host exposes asset selection elsewhere (e.g. the Gridblock cameras panel header tab strip) so the per-tile `CameraAssetPicker` doesn't duplicate the affordance." },
  ],

  states: [
    { name: 'layout: single', trigger: "layout === 'single' (or fallback when feeds.length <= 1)", description: 'feeds[activeFeedIndex] fills the panel; layout picker hidden', implementedInPrototype: true, storyProps: { layout: 'single' } },
    { name: 'layout: stack-2', trigger: "layout === 'stack-2' && feeds.length >= 2", description: 'Two feeds vertically split 50/50 with 1px divider', implementedInPrototype: true, storyProps: { layout: 'stack-2' } },
    { name: 'layout: grid-2x2', trigger: "layout === 'grid-2x2'", description: '2x2 CSS grid; gaps shown as 1px white/10 lines (renders any number of feeds 1-4)', implementedInPrototype: true, storyProps: { layout: 'grid-2x2' } },
    { name: 'layout: hero-filmstrip', trigger: "layout === 'hero-filmstrip' && feeds.length >= 2", description: 'feeds[activeFeedIndex] takes the top ~78% of height; remaining feeds render as a horizontal filmstrip in the bottom ~22%. Each thumb gets a hover "Use as main" button and double-click promotion.', implementedInPrototype: true, storyProps: { layout: 'hero-filmstrip', activeFeedIndex: 0 } },
    { name: 'layout fallback', trigger: 'chosen layout cannot fit feed count', description: 'Falls back deterministically: hero-filmstrip → grid-2x2 → stack-2 → single. The chosen value persists in props so the picker reflects intent.', implementedInPrototype: true },
    { name: 'panel fullscreen', trigger: 'fullscreen === true', description: 'Panel grows to occupy the entire viewport (left nav hidden)', implementedInPrototype: true },
    { name: 'panel empty', trigger: 'feeds.length === 0', description: 'Centered VideoPanelEmptyState: video icon, "No video selected" title, hint with inline pin glyph pointing operators to the devices list', implementedInPrototype: true },
    { name: 'empty slot', trigger: 'feed.cameraId === ""', description: 'Slot shows a "drop or pin a device here" hint', implementedInPrototype: true },
    { name: 'panel drop hover', trigger: 'A device card is dragged over the panel background', description: 'Inset sky ring on the entire panel; drop appends or pins (LRU swap if full)', implementedInPrototype: true },
    { name: 'loading', trigger: 'Stream is connecting', description: 'Skeleton or spinner while RTSP/WebRTC negotiates', implementedInPrototype: false },
    { name: 'error', trigger: 'Stream connection fails', description: 'Per-feed error card with retry', implementedInPrototype: false },
    { name: 'disabled', trigger: 'Camera asset offline', description: 'Feed shows offline state; controls disabled', implementedInPrototype: false },
  ],

  interactions: [
    { trigger: 'click', element: 'Fullscreen button on a tile', result: 'Calls onFullscreenToggle; panel expands viewport-wide' },
    { trigger: 'click', element: 'Layout picker icon (top inline-end corner)', result: 'Calls onLayoutChange with the chosen LayoutKind. Disabled options (those that cannot fit current feed count) are not selectable.' },
    { trigger: 'click', element: 'Promote-to-hero button on a thumb (hero-filmstrip layout only)', result: 'Calls onActiveFeedChange with the thumb index; thumb swaps into the hero slot, the previous hero falls into the filmstrip.' },
    { trigger: 'dblclick', element: 'Filmstrip thumb body', result: 'Same as the promote button — swaps the tile into the hero slot. Inner interactive elements (control bar, designate overlay) are excluded so the gesture does not interfere with them.' },
    { trigger: 'focus', element: 'Tile body', result: 'Bubbles `onTileFocus` and also fires `onActiveFeedChange(index)` so panel-level chrome (e.g. the cameras header tab strip) reflects the focused tile.' },
    { trigger: 'hover', element: 'Tile body (mounted feed)', result: 'Bubbles `onTileHover(cameraId)` on enter and `onTileHover(null)` on leave. Empty slots do not fire. Dashboard uses this to highlight the matching map asset.' },
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
    {
      name: 'Switch to Hero+Filmstrip and promote a thumb',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'With 3+ feeds open, clicks the LayoutPanelTop icon in the picker', result: 'onLayoutChange("hero-filmstrip"); panel re-renders with feeds[activeFeedIndex] as hero and the rest as a horizontal strip below.' },
        { actor: 'user', action: 'Hovers a filmstrip thumb', result: 'Centered "Use as main" button fades in (opacity, 150ms)' },
        { actor: 'user', action: 'Clicks the button (or double-clicks the thumb body)', result: 'onActiveFeedChange(thumbIndex); the thumb takes the hero slot, the previous hero drops into the filmstrip.' },
      ],
    },
    {
      name: 'Detection alert lights up an off-screen feed',
      type: 'happy',
      steps: [
        { actor: 'system', action: 'Detection backend emits a new DetectionBox for a feed currently rendered as a filmstrip thumb', result: 'TileDetectionAlert ring appears on the thumb (200ms opacity in) and fires a one-shot pulse keyed by the new id (~600ms).' },
        { actor: 'user', action: 'Notices the pulse and promotes that thumb to hero', result: 'Hero swap exposes the full HUD + detection boxes for investigation.' },
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
    'Panel is presentational — all state (feeds, layout, activeFeedIndex) lives in the parent (PlaygroundPage / Dashboard via useVideoFeeds). This keeps the component swap into Dashboard easy.',
    'Layout is operator-controlled (manual picker), not derived from feed count. The picker is hidden when feeds.length <= 1 because there is no meaningful choice, and also when the host passes `showLayoutPicker={false}` (it then renders the picker in its own chrome). When the chosen layout cannot fit the current feed count, the panel falls back deterministically (hero-filmstrip → grid-2x2 → stack-2 → single) but preserves the chosen value so the picker reflects intent.',
    'YouTube-inspired hover affordance: top HUD always visible, bottom control bar fades in on hover/focus. Filmstrip thumbs additionally get a centered "Use as main" overlay on hover.',
    'Persistence: feeds (cameraId + mode), layout, and activeFeedIndex are stored in localStorage (key `c2.video-layout.v1`) by `useVideoFeeds`. The legacy `{ layout, heroIndex }` shape is read once and re-saved under the new schema.',
    "Active-feed model: `activeFeedIndex` is the operator's focal selection. `single` renders feeds[activeFeedIndex]; `hero-filmstrip` puts it in the hero; `stack-2` / `grid-2x2` highlight it as the focused/keyboard-target tile. Tile focus writes back into it via `onActiveFeedChange`.",
  ],
};
