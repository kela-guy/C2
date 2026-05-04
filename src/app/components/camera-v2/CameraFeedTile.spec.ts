import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'CameraFeedTile',
  filePath: 'src/app/components/camera-v2/CameraFeedTile.tsx',
  purpose:
    'Single feed tile that composes the <video> element with all overlays (top HUD, bottom control bar, detections, designate-target overlay, telemetry, drone HUD, playback split, context menu). Owns hover/focus state and handles tile-level keyboard shortcuts (T, D, F, X, S, P, Esc).',
  location: 'Composition (camera-v2)',
  status: 'prototype',

  props: [
    { name: 'feed', type: 'CameraFeed | null', required: true, description: 'Active feed; null shows the empty drop-target state' },
    { name: 'cameraLabel', type: 'string', required: true, description: 'Display label for the active camera' },
    { name: 'status', type: 'CameraStatus', required: true, description: 'Bearing, FOV, ownership, assignment, deviceType, telemetry' },
    { name: 'detections', type: 'DetectionBox[]', required: true, description: 'Boxes to render when feed.showDetections is true' },
    { name: 'videoSrcDay', type: 'string', required: true, description: 'Static src for day mode' },
    { name: 'videoSrcNight', type: 'string', required: false, description: 'Static src for night mode; falls back to a CSS filter' },
    { name: 'videoSrcPlayback', type: 'string', required: false, description: 'Recorded clip used for the playback half of the split' },
    { name: 'isFullscreen', type: 'boolean', required: true, description: 'True when the panel is in fullscreen' },
    { name: 'emptySlotHint', type: 'string', required: false, description: 'Hint label rendered in the empty drop-target' },
    { name: 'onTakeControl', type: '() => void', required: true, description: 'Take ownership of this camera' },
    { name: 'onReleaseControl', type: '() => void', required: true, description: 'Release ownership' },
    { name: 'onModeToggle', type: '() => void', required: true, description: 'Toggle day/night mode' },
    { name: 'onDetectionsToggle', type: '() => void', required: true, description: 'Toggle AI detection overlay' },
    { name: 'onDesignateModeToggle', type: '() => void', required: true, description: 'Enter / exit designate-target mode (cursor becomes crosshair, follow-cursor reticle + hint banner appear)' },
    { name: 'onPlaybackToggle', type: '() => void', required: true, description: 'Open / close the live-vs-playback split inside the tile' },
    { name: 'onPlaybackChange', type: '(patch: Partial<PlaybackState>) => void', required: true, description: 'Mutate the playback substate (position, isPlaying, ...)' },
    { name: 'onZoomChange', type: '(zoomLevel: number) => void', required: true, description: 'Bubble zoom slider changes to the parent' },
    { name: 'onFullscreenToggle', type: '() => void', required: true, description: 'Toggle panel fullscreen' },
    { name: 'onAssignmentClick', type: '() => void', required: false, description: 'Click on the assignment pill (e.g. focus target)' },
    { name: 'onDropDevice', type: '(item: DeviceCameraDragItem) => void', required: true, description: 'A device card was dropped on this tile - swap the cameraId' },
    { name: 'onFocus', type: '() => void', required: false, description: 'Tile gained focus; used by the parent to maintain an LRU stack of cameras for pin-swap behavior' },
    { name: 'onResetView', type: '() => void', required: false, description: 'Reset overlays (designate mode off, detections off)' },
    { name: 'onDesignateTarget', type: '(normX: number, normY: number) => void', required: false, description: 'Operator clicked a point on the feed in designate-target mode. Coords are normalised (0..1, top-left origin). Tile auto-exits designate mode after firing.' },
  ],

  states: [
    { name: 'default (live feed)', trigger: 'feed has cameraId', description: 'Video plays; LIVE pill + compass strip visible; controls fade in on hover/focus', implementedInPrototype: true },
    { name: 'empty slot', trigger: 'feed is null or cameraId === ""', description: 'Empty drop target with hint text; accepts dropped device cards', implementedInPrototype: true },
    { name: 'owned by self', trigger: 'status.controlOwner === "self"', description: 'Lock-open icon (emerald) on the bottom bar', implementedInPrototype: true },
    { name: 'owned by other', trigger: 'status.controlOwner === "other"', description: 'Lock icon (zinc) with tooltip "נעול ע״י <name>"; mutating actions disabled', implementedInPrototype: true },
    { name: 'control request pending', trigger: 'status.controlRequestPending === true', description: 'Lock icon pulses in amber; tooltip carries the countdown', implementedInPrototype: true },
    { name: 'night mode', trigger: 'feed.mode === "night"', description: 'Top HUD shows IR pill; video either swaps src or applies a CSS night filter', implementedInPrototype: true },
    { name: 'detections on', trigger: 'feed.showDetections === true', description: 'Bounding boxes rendered over the video; control bar AI icon glows emerald', implementedInPrototype: true },
    { name: 'designate-target armed', trigger: 'feed.designateMode === true', description: 'Cursor becomes crosshair, follow-cursor reticle is drawn, amber inset ring + RTL hint banner ("לחץ כדי לסמן יעד · Esc לביטול") appear over the feed. The next click designates that point and auto-exits the mode (showing a brief amber ping at the chosen point).', implementedInPrototype: true },
    { name: 'live + playback split', trigger: 'feed.playback?.enabled === true', description: 'Tile splits vertically: top = live with LIVE badge, bottom = recorded clip with PLAYBACK badge + scrubber', implementedInPrototype: true },
    { name: 'drone HUD', trigger: 'status.deviceType === "drone"', description: 'Right-edge telemetry column (battery, signal, distance, relative bearing); telemetry strip switches to drone mode (zoom + alt + vel)', implementedInPrototype: true },
    { name: 'drop target highlighted', trigger: 'A device card is dragged over the tile', description: 'Inset sky ring; on drop the cameraId is replaced', implementedInPrototype: true },
    { name: 'context menu open', trigger: 'right-click on the tile', description: 'Take/Release, Day/Night, AI, Designate target, Reset view, Open settings', implementedInPrototype: true },
    { name: 'loading', trigger: 'Stream is connecting', description: 'Skeleton/spinner instead of <video>', implementedInPrototype: false },
    { name: 'error', trigger: 'Stream failed', description: 'Error card with retry', implementedInPrototype: false },
    { name: 'disabled', trigger: 'Camera asset offline', description: 'Greyed-out tile; controls disabled with explanatory tooltip', implementedInPrototype: false },
  ],

  interactions: [
    { trigger: 'hover/focus', element: 'tile', result: 'Bottom control bar + telemetry strip fade in', animation: { property: 'opacity', from: '0', to: '1', duration: '200ms', easing: 'ease-out' } },
    { trigger: 'keydown', element: 'tile (focused)', result: 'Tile-level shortcut', keyboard: 'F = fullscreen, T = take/release, D = day/night, X = toggle designate-target, S = settings, P = playback, Esc = cancel designate / close settings / exit fullscreen' },
    { trigger: 'right-click', element: 'tile', result: 'Opens the context menu' },
    { trigger: 'drop', element: 'tile body', result: 'Replaces feed.cameraId with the dropped device id' },
    { trigger: 'click', element: 'feed body (in designate mode)', result: 'Calls onDesignateTarget(normX, normY); shows a brief amber "ping" at the chosen point; auto-exits designate mode' },
  ],

  tokens: {
    colors: [
      { name: 'tile-bg', value: '#000000', usage: 'Active tile background' },
      { name: 'empty-bg', value: '#141414', usage: 'Empty slot background' },
      { name: 'focus-ring', value: 'rgba(255,255,255,0.3)', usage: 'Inset focus ring' },
      { name: 'drop-accent', value: 'rgba(56,189,248,0.6)', usage: 'Inset ring during a valid drop' },
    ],
    typography: [
      { name: 'live-badge', fontFamily: 'Heebo', fontSize: '9px', fontWeight: '600', lineHeight: '1', usage: 'LIVE / PLAYBACK badge inside the playback split' },
    ],
    spacing: [],
  },

  accessibility: {
    role: 'region',
    ariaAttributes: ['aria-label="Camera feed: <name>"', 'aria-pressed on the lock / detections / designate-target buttons', 'aria-hidden on the gradient overlays'],
    keyboardNav: ['Tab focuses the tile', 'F/T/D/X/S/P/Esc shortcuts when focused'],
    focusManagement: 'Tile is tabbable (tabIndex=0) so the keyboard shortcuts have a target. focus-within keeps the control bar visible while a child control has focus.',
    screenReaderNotes: 'Empty <track kind="captions" /> on the video - needs real captions when streams come from real backends.',
  },

  tasks: [
    {
      id: 'CFT-1',
      title: 'Wire real stream src',
      priority: 'P0',
      estimate: 'M',
      description: 'Replace static videoSrcDay/Night with a per-camera stream URL provided by the backend.',
      files: [{ path: 'src/app/components/camera-v2/CameraFeedTile.tsx', action: 'modify', description: 'Pull stream src from a camera-status hook' }],
      acceptanceCriteria: ['Real stream renders', 'Loading + error states are handled'],
    },
    {
      id: 'CFT-2',
      title: 'Real playback investigation source',
      priority: 'P1',
      estimate: 'M',
      description: 'Replace /videos/weapon-feed.mp4 with the real recording archive endpoint and use durationSec from metadata.',
      files: [{ path: 'src/app/components/camera-v2/CameraFeedTile.tsx', action: 'modify', description: 'Stream the recorded clip; set durationSec from metadata' }],
      acceptanceCriteria: ['Playback shows the actual recorded clip', 'Scrubber length matches clip duration'],
    },
  ],

  hardcodedData: [
    { current: 'Static <video src>', replaceWith: 'Per-camera live stream URL', location: 'CameraFeedTile.tsx' },
    { current: '/videos/weapon-feed.mp4 used as playback', replaceWith: 'Recording archive URL', location: 'CameraFeedTile playbackSrc' },
  ],

  notes: [
    'Hover detection uses both onMouseEnter/Leave and focus-within so keyboard users get the same affordance.',
    'Night mode prefers a dedicated IR src; falls back to a stack of CSS filters when the IR asset is missing (still recognisable as "thermal" visually).',
    'Cursor stays at the platform default when the operator is just inspecting the feed; it only switches to crosshair while designate-target mode is armed - so the cursor change itself is a clear "the next click designates a target" affordance.',
    'The DroneHud, telemetry strip, and DesignateTargetOverlay are skipped while the playback split is active to keep the two halves uncluttered.',
  ],
};
