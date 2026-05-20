import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'PlaybackTimeline',
  filePath: 'src/app/components/camera-v2/PlaybackTimeline.tsx',
  purpose:
    'Minimal playback transport for the Live-vs-Playback investigation surface. Exposes only the controls an operator actually needs while inspecting a clip: a Radix scrubber, play/pause, and the clip+remaining clocks. Exit is intentionally absent — operators leave playback by toggling the feature off from the live half (Settings → playback row, `P`, or `Esc`). Pinned LTR via `<DirIsland direction="ltr">` so time always flows L→R.',
  location: 'Composition (camera-v2)',
  status: 'prototype',

  props: [
    { name: 'state', type: 'PlaybackState', required: true, description: 'Position, duration, isPlaying, status, isScrubbing, errorMessage' },
    { name: 'onScrub', type: '(positionSec: number) => void', required: true, description: 'Bubble a new position when the user moves the scrubber' },
    { name: 'onScrubbingChange', type: '(isScrubbing: boolean) => void', required: false, description: 'Container uses this to suspend the media-time sync effect while the operator drags' },
    { name: 'onPlayPause', type: '() => void', required: true, description: 'Toggle play / pause' },
  ],

  states: [
    { name: 'idle', trigger: 'state.status === "idle"', description: 'Open before metadata; transport disabled', implementedInPrototype: true },
    { name: 'loading', trigger: 'state.status === "loading"', description: 'Spinner overlay (rendered by `PlaybackContainer`); transport disabled', implementedInPrototype: true },
    { name: 'paused', trigger: 'state.isPlaying === false && status === "paused"', description: 'Play icon shown; scrubber active', implementedInPrototype: true },
    { name: 'playing', trigger: 'state.isPlaying === true && status === "playing"', description: 'Pause icon shown; scrubber tracks media-time', implementedInPrototype: true },
    { name: 'buffering', trigger: 'state.status === "buffering"', description: 'Spinner overlay rendered by `PlaybackContainer`; scrubber stays active', implementedInPrototype: true },
    { name: 'ended', trigger: 'state.status === "ended"', description: '"Replay" overlay rendered by `PlaybackContainer`; scrubber returns to 0 on replay', implementedInPrototype: true },
    { name: 'error', trigger: 'state.status === "error"', description: 'Error card with retry button; transport disabled', implementedInPrototype: true },
    { name: 'foreign-locked', trigger: 'controlOwner === "other"', description: 'Transport stays usable — playback is read-only investigation, not a control op', implementedInPrototype: true },
    { name: 'disabled', trigger: 'state.durationSec <= 0 || status === "loading" / "error"', description: 'Transport buttons + scrubber dimmed', implementedInPrototype: true },
    { name: 'empty', trigger: 'No active feed', description: 'Component is not rendered (caller responsibility)', implementedInPrototype: true },
  ],

  interactions: [
    { trigger: 'pointer drag', element: 'Scrubber thumb', result: 'Calls onScrub on every change + onScrubbingChange(true); onScrubbingChange(false) fires on release' },
    { trigger: 'click', element: 'Play / pause', result: 'Calls onPlayPause' },
    { trigger: 'keydown', element: 'Transport wrapper', result: 'Captures tile-level letter shortcuts (P/F/S/T/D/X) so they never re-trigger the parent. Arrow keys move the scrubber via Radix.' },
  ],

  tokens: {
    colors: [
      { name: 'gradient', value: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0))', usage: 'Bottom legibility gradient' },
      { name: 'scrub-range', value: '#f87171', usage: 'Red range fill (already-played portion)' },
      { name: 'scrub-thumb', value: '#fca5a5 / ring #ef4444', usage: 'Scrubber thumb (red, for playback context)' },
    ],
    typography: [
      { name: 'time-code', fontFamily: 'IBM Plex Mono', fontSize: '10px', fontWeight: '400', lineHeight: '1', usage: 'mm:ss timecodes' },
    ],
    spacing: [
      { name: 'transport-padding', value: '6px 8px', usage: 'Outer padding' },
      { name: 'btn-size', value: '36px', usage: 'Square hit-area for transport buttons' },
      { name: 'thumb-size', value: '16px', usage: 'Scrubber thumb (chosen so an operator can grab it on a 4-up tile)' },
    ],
  },

  accessibility: {
    ariaAttributes: [
      'aria-label on every transport button',
      'aria-label="מיקום פלייבק" on the Radix slider',
      'aria-live="polite" announcement for status transitions (loading / buffering / error) — emitted from the container',
    ],
    keyboardNav: [
      'Tab orders L→R inside the LTR DirIsland',
      'Arrow keys move the scrubber when focused',
      '`Esc` exits the slider focus before bubbling to tile-level Esc',
    ],
    focusManagement: 'focus-visible:ring-2 ring-border-strong on every button + scrubber thumb. `keyDownCapture` filters tile-level shortcut letters (P/F/S/T/D/X) so they never re-trigger the parent.',
  },

  tasks: [
    {
      id: 'PBT-1',
      title: 'Real recording archive',
      priority: 'P0',
      estimate: 'M',
      description: "Replace the static weapon-feed.mp4 placeholder with the camera's real recording archive (HLS / DASH).",
      files: [
        { path: 'src/app/components/camera-v2/playback/PlaybackContainer.tsx', action: 'modify', description: 'Stream the recorded clip and populate state.durationSec from media metadata' },
      ],
      acceptanceCriteria: ['Scrubber length matches clip duration', 'Scrubbing seeks the live media element', 'Buffering state surfaces while the network stalls'],
    },
  ],

  hardcodedData: [
    { current: '`PLAYBACK_REWIND_OPEN_SEC = 30`', replaceWith: 'Operator preference', location: 'src/app/components/camera-v2/playback/playbackDefaults.ts' },
    { current: '`PLAYBACK_BUFFERING_GRACE_MS = 600`', replaceWith: 'Tuned per-environment', location: 'src/app/components/camera-v2/playback/playbackDefaults.ts' },
  ],

  notes: [
    'Pinned to LTR via `<DirIsland direction="ltr">` so time always flows left-to-right regardless of app direction. Hebrew tooltip labels still render correctly because the island only repositions chrome, not text — same convention as the live `CameraControlBar`.',
    'Scrubber backed by the Radix Slider primitive, not the native `<input type="range">`, so we get a real accessible thumb + keyboard support out of the box. The thumb hit-area is 16px (larger than the visual size) so an operator can grab it on dense 4-up tile grids.',
    'Color hierarchy uses red rather than the live-feed amber so the operator never confuses live and playback halves.',
    'Deliberately stripped: speed, loop, frame-step, bookmarks, snapshot, multi-feed sync, layout cycler, event markers, idle auto-hide — and an inline Exit button — were all removed in the simplification pass. Exit lives on the live half so the playback transport stays focused on inspecting the clip. Reintroduce only with explicit operator demand.',
  ],
};
