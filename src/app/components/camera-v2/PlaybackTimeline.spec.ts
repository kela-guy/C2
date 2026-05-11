import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'PlaybackTimeline',
  filePath: 'src/app/components/camera-v2/PlaybackTimeline.tsx',
  purpose:
    'Scrubber + transport row for the playback half of a Live-vs-Playback split tile. Drives currentTime on the playback <video> via onScrub. Hosts play/pause and +/-10s jump.',
  location: 'Composition (camera-v2)',
  status: 'prototype',

  props: [
    { name: 'state', type: 'PlaybackState', required: true, description: '{ enabled, positionSec, durationSec, isPlaying }' },
    { name: 'onScrub', type: '(positionSec: number) => void', required: true, description: 'Bubble a new position when the user drags the scrubber' },
    { name: 'onPlayPause', type: '() => void', required: true, description: 'Toggle play / pause' },
    { name: 'onJumpRelative', type: '(deltaSec: number) => void', required: true, description: 'Jump +/-N seconds' },
  ],

  states: [
    { name: 'paused', trigger: 'state.isPlaying === false', description: 'Play icon shown', implementedInPrototype: true },
    { name: 'playing', trigger: 'state.isPlaying === true', description: 'Pause icon shown', implementedInPrototype: true },
    { name: 'at start', trigger: 'state.positionSec === 0', description: 'Step-back button is still enabled (no-ops at clamp)', implementedInPrototype: true },
    { name: 'at end', trigger: 'state.positionSec >= state.durationSec', description: 'Step-forward button is still enabled', implementedInPrototype: true },
    { name: 'loading', trigger: 'N/A', description: '-', implementedInPrototype: true },
    { name: 'error', trigger: 'N/A', description: '-', implementedInPrototype: true },
    { name: 'disabled', trigger: 'N/A', description: '-', implementedInPrototype: true },
    { name: 'empty', trigger: 'N/A', description: '-', implementedInPrototype: true },
  ],

  interactions: [
    { trigger: 'click', element: 'Play / pause button', result: 'Calls onPlayPause' },
    { trigger: 'click', element: '+/-10s buttons', result: 'Calls onJumpRelative(-10) or onJumpRelative(+10)' },
    { trigger: 'input', element: 'Scrubber', result: 'Calls onScrub with the parsed position' },
  ],

  tokens: {
    colors: [
      { name: 'gradient', value: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0))', usage: 'Bottom legibility gradient' },
      { name: 'scrub-accent', value: '#fca5a5', usage: 'Scrubber thumb (red, for playback context)' },
    ],
    typography: [
      { name: 'time-code', fontFamily: 'IBM Plex Mono', fontSize: '10px', fontWeight: '400', lineHeight: '1', usage: 'mm:ss timecodes' },
    ],
    spacing: [
      { name: 'transport-padding', value: '4px 8px 8px', usage: 'Outer padding' },
    ],
  },

  accessibility: {
    ariaAttributes: ['aria-label on every transport button', 'aria-label="Playback position" on the scrubber'],
    keyboardNav: ['Arrow keys move the scrubber when focused', 'Tab orders left -> right'],
    focusManagement: 'focus-visible:ring-2 ring-white/25 on every button + scrubber',
  },

  tasks: [
    {
      id: 'PBT-1',
      title: 'Real recording archive',
      priority: 'P0',
      estimate: 'M',
      description: 'Replace the static weapon-feed.mp4 placeholder with the camera\'s real recording archive (HLS / DASH).',
      files: [{ path: 'src/app/components/camera-v2/CameraFeedTile.tsx', action: 'modify', description: 'Stream the recorded clip; populate state.durationSec from media metadata' }],
      acceptanceCriteria: ['Scrubber length matches clip duration', 'Scrubbing seeks the live media element'],
    },
  ],

  hardcodedData: [
    { current: 'duration defaults to 60s', replaceWith: 'Real clip duration from media metadata', location: 'CameraFeedTile playback init' },
  ],

  notes: [
    'Color hierarchy uses red rather than the live-feed amber so the operator never confuses live and playback halves.',
    'Step buttons use ChevronsLeft/ChevronsRight (double chevron) to read as "jump", not "previous frame".',
  ],
};
