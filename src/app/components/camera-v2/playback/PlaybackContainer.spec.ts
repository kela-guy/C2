import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'PlaybackContainer',
  filePath: 'src/app/components/camera-v2/playback/PlaybackContainer.tsx',
  purpose:
    'Playback investigation surface — a single bottom-half frame inside a tile. Owns the playback `<video>` ref, wires every media event (`loadedmetadata`, `error`, `waiting`, `playing`, `pause`, `ended`, autoplay rejection), renders the status chrome (loading / buffering / replay / error), and hosts the `PlaybackTimeline` transport.',
  location: 'Composition (camera-v2)',
  status: 'prototype',

  props: [
    { name: 'src', type: 'string', required: true, description: 'Recording archive URL for the playback `<video>`' },
    { name: 'state', type: 'PlaybackState', required: true, description: 'Full playback state for this feed' },
    { name: 'onPatch', type: '(patch: Partial<PlaybackState>) => void', required: true, description: 'Bubble a state patch up through `VideoPanel`' },
    { name: 'onExit', type: '() => void', required: true, description: 'Close playback (same as the `P` shortcut)' },
  ],

  states: [
    { name: 'idle', trigger: 'state.status === "idle" && durationSec === 0', description: 'Loading skeleton over the playback frame; transport disabled until metadata', implementedInPrototype: true },
    { name: 'loading', trigger: 'state.status === "loading"', description: 'Spinner overlay; aria-live="polite" announcement', implementedInPrototype: true },
    { name: 'paused', trigger: 'state.isPlaying === false', description: 'Frame visible; transport active', implementedInPrototype: true },
    { name: 'playing', trigger: 'state.isPlaying === true', description: 'Frame visible; transport active', implementedInPrototype: true },
    { name: 'buffering', trigger: 'state.status === "buffering"', description: 'Spinner overlay (after a 600ms grace timer so quick stalls don\'t flash); last frame stays visible', implementedInPrototype: true },
    { name: 'ended', trigger: 'state.status === "ended"', description: 'Replay overlay with a Play button; clicking it seeks to 0 and resumes', implementedInPrototype: true },
    { name: 'error', trigger: 'state.status === "error"', description: 'Error card with `errorMessage` + a Retry button that calls `<video>.load()`', implementedInPrototype: true },
    { name: 'autoplay-rejected', trigger: '`<video>.play()` promise rejected', description: 'Container catches the rejection, sets `status: "paused"` so the UI shows a Play button', implementedInPrototype: true },
    { name: 'scrubbing', trigger: 'state.isScrubbing === true', description: 'Media-time sync effect bows out so the pointer drives the slider; commit on release', implementedInPrototype: true },
    { name: 'disabled', trigger: 'durationSec <= 0 || error', description: 'Transport buttons + scrubber disabled', implementedInPrototype: true },
    { name: 'empty', trigger: 'No active feed', description: 'Component is not rendered (caller responsibility)', implementedInPrototype: true },
  ],

  interactions: [
    { trigger: 'media event', element: '`<video>` element', result: '`loadedmetadata` patches durationSec; `waiting` arms the buffering grace timer; `playing` clears it; `ended` patches `status: "ended"`; `error` patches `status: "error"` with a default errorMessage' },
    { trigger: 'click', element: 'Exit (X) in the chrome', result: 'Calls onExit — closes playback' },
    { trigger: 'click', element: 'Replay (ended state)', result: 'Seeks `<video>` to 0 and resumes' },
    { trigger: 'click', element: 'Retry (error state)', result: 'Calls `<video>.load()` and patches `status: "loading"`' },
  ],

  flows: [
    {
      name: 'Open playback for the first time on a camera',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'Toggle the Settings → playback row, or press `P` on a focused tile', result: '`VideoPanel` builds an open-state via `makeOpenPlaybackState` (rewinds 30s, paused)' },
        { actor: 'system', action: 'Container mounts the `<video>`', result: 'Status starts as `loading`; spinner overlay renders' },
        { actor: 'system', action: 'Media `loadedmetadata` fires', result: 'Duration is patched; status flips to `paused`; transport activates' },
        { actor: 'user', action: 'Press play', result: 'Status flips to `playing` once the media `playing` event fires' },
      ],
    },
    {
      name: 'Browser autoplay policy rejects play()',
      type: 'edge-case',
      steps: [
        { actor: 'user', action: 'Press play', result: '`<video>.play()` returns a rejected promise' },
        { actor: 'system', action: 'Container catches the rejection', result: 'Patches `isPlaying: false, status: "paused"` so the UI shows a Play button instead of failing silently' },
      ],
    },
    {
      name: 'Camera swap mid-investigation',
      type: 'edge-case',
      steps: [
        { actor: 'user', action: 'Drop a different device onto the tile', result: '`VideoPanel.handleSwapFeed` sets `playback: undefined` on the new feed' },
        { actor: 'system', action: 'Container unmounts cleanly', result: 'No stale `positionSec` / `sourceId` / `errorMessage` carries over to the new camera' },
      ],
    },
  ],

  tokens: {
    colors: [
      { name: 'split-divider', value: 'rgba(239,68,68,0.8)', usage: '2px red top border on the playback half' },
      { name: 'overlay-bg', value: 'rgba(0,0,0,0.6)', usage: 'Loading / replay / error overlay background' },
    ],
    typography: [
      { name: 'badge', fontFamily: 'IBM Plex Mono', fontSize: '9px', fontWeight: '600', lineHeight: '1', usage: 'PLAYBACK chrome badge' },
      { name: 'overlay-message', fontFamily: 'Heebo', fontSize: '11px', fontWeight: '400', lineHeight: '1.3', usage: 'Loading / error overlay copy' },
    ],
    spacing: [
      { name: 'split-height', value: '50%', usage: 'Bottom half of the tile' },
    ],
  },

  accessibility: {
    role: 'region',
    ariaAttributes: [
      'aria-live="polite" announcement for status transitions (loading / buffering / error)',
      'role="status" on the loading + ended overlays',
      'role="alert" on the error overlay',
      'aria-label on the exit, replay, and retry buttons',
    ],
    keyboardNav: [
      'Tile-level `Esc` exits playback before fullscreen — playback is always closer to the operator\'s current intent',
      'Tile-level `P` toggles playback',
    ],
    focusManagement: 'Tile retains focus on close so the operator can chain `P` → `Esc` → `T` (take control). The transport stops shortcut letters (P/F/S/T/D/X) from re-triggering the parent via `keyDownCapture`.',
  },

  tasks: [
    {
      id: 'PBC-1',
      title: 'Real archive backend',
      priority: 'P0',
      estimate: 'M',
      description: 'Replace the static `weapon-feed.mp4` placeholder with the camera\'s real recording archive (HLS / DASH).',
      files: [{ path: 'src/app/components/camera-v2/playback/PlaybackContainer.tsx', action: 'modify', description: 'Stream the recorded clip and populate state.durationSec from media metadata' }],
      acceptanceCriteria: ['Scrubber length matches clip duration', 'Buffering surfaces during network stalls', 'Cross-origin clips don\'t taint the page'],
    },
  ],

  hardcodedData: [
    { current: '`PLAYBACK_BUFFERING_GRACE_MS = 600`', replaceWith: 'Tuned per-environment', location: 'src/app/components/camera-v2/playback/playbackDefaults.ts' },
  ],

  notes: [
    'One layout: a vertical 50/50 split. Live keeps the top half (rendered by `CameraFeedTile`); this container fills the bottom half. PiP / Drawer / sync / snapshot were intentionally removed — playback is now a focused investigation surface, not a feature catalogue.',
    'Time always flows L→R: the entire transport is wrapped in `<DirIsland direction="ltr">` inside `PlaybackTimeline`. Hebrew labels still render correctly because the island only repositions chrome.',
    'Buffering has a 600ms grace timer so a momentary network burp doesn\'t flash a spinner. The grace timer is canceled on `playing` and `error` events.',
    'Camera swaps reset the playback object to `undefined` upstream (`VideoPanel.handleSwapFeed`, `PlaygroundPage.handlePinDevice`), so a stale `positionSec` / `errorMessage` from the outgoing camera can never bleed onto the incoming one.',
  ],
};
