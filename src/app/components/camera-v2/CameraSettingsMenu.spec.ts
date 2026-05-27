import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'CameraSettingsMenu',
  filePath: 'src/app/components/camera-v2/CameraSettingsMenu.tsx',
  purpose:
    'Settings popover triggered by the gear button on the bottom control bar. Hosts Playback investigation and Display toggles (AI detections).',
  location: 'Composition (camera-v2)',
  status: 'prototype',

  props: [
    { name: 'open', type: 'boolean', required: true, description: 'Popover open state' },
    { name: 'onOpenChange', type: '(open: boolean) => void', required: true, description: 'Open / close handler' },
    { name: 'detectionsOn', type: 'boolean', required: true, description: 'Drives the AI detection switch' },
    { name: 'playbackEnabled', type: 'boolean', required: true, description: 'Drives the playback investigation switch' },
    { name: 'onDetectionsToggle', type: '() => void', required: true, description: 'AI detection toggle' },
    { name: 'onPlaybackToggle', type: '() => void', required: true, description: 'Playback investigation toggle' },
  ],

  states: [
    { name: 'closed', trigger: 'open === false', description: 'Just the gear trigger button, popover not in DOM (Radix portal)', implementedInPrototype: true },
    { name: 'open', trigger: 'open === true', description: 'Popover renders two sections (Playback, Display)', implementedInPrototype: true },
    { name: 'playback enabled', trigger: 'playbackEnabled === true', description: 'Playback row text switches to "מפוצל: שידור חי + פלייבק"', implementedInPrototype: true },
    { name: 'P shortcut hint', trigger: 'always', description: 'A small (P) `kbd` chip is rendered next to the playback row label', implementedInPrototype: true },
    { name: 'loading', trigger: 'N/A', description: '-', implementedInPrototype: true },
    { name: 'error', trigger: 'N/A', description: '-', implementedInPrototype: true },
    { name: 'disabled', trigger: 'N/A', description: '-', implementedInPrototype: true },
    { name: 'empty', trigger: 'N/A', description: '-', implementedInPrototype: true },
  ],

  interactions: [
    { trigger: 'click', element: 'Gear trigger', result: 'Toggles open state' },
    { trigger: 'click', element: 'Switch in Playback row', result: 'Calls onPlaybackToggle - tile re-renders into the live-vs-playback split' },
    { trigger: 'click', element: 'Switch in Display rows', result: 'Calls onDetectionsToggle' },
    { trigger: 'keydown', element: 'Trigger', result: 'S keyboard shortcut (handled by parent tile) toggles open' },
  ],

  tokens: {
    colors: [
      { name: 'popover-bg', value: 'rgba(26,26,26,0.95)', usage: 'Popover background (matches the project glass style)' },
      { name: 'popover-shadow', value: '0_0_0_1px_rgba(255,255,255,0.15)', usage: 'Inset hairline + drop shadow' },
      { name: 'section-divider', value: 'rgba(255,255,255,0.10)', usage: '1px between the three sections' },
      { name: 'section-title', value: 'rgba(255,255,255,0.55)', usage: 'Uppercase section heading' },
      { name: 'switch-track-off', value: 'rgba(255,255,255,0.15)', usage: 'Tactical-readable Switch off-state track (against `bg-[#1a1a1a]/95` popover)' },
      { name: 'switch-track-on', value: 'rgba(16,185,129,0.8)', usage: 'Emerald Switch on-state track' },
    ],
    typography: [
      { name: 'section-title', fontFamily: 'Heebo', fontSize: '10px', fontWeight: '600', lineHeight: '1', usage: 'Uppercase tracked-out section title' },
      { name: 'row-label', fontFamily: 'Heebo', fontSize: '12px', fontWeight: '400', lineHeight: '1.2', usage: 'Row main text' },
      { name: 'row-description', fontFamily: 'Heebo', fontSize: '10px', fontWeight: '400', lineHeight: '1.3', usage: 'Row helper text' },
      { name: 'detail-mono', fontFamily: 'IBM Plex Mono', fontSize: '11px', fontWeight: '400', lineHeight: '1', usage: 'Detail values (id, FOV, bearing)' },
    ],
    spacing: [
      { name: 'popover-width', value: '280px', usage: 'Fixed width of the popover' },
      { name: 'section-padding', value: '10px 12px', usage: 'Section inner padding' },
    ],
  },

  accessibility: {
    role: 'dialog',
    ariaAttributes: ['Popover handles aria-controls / aria-expanded via Radix', 'Switches expose aria-checked', 'Trigger has aria-label="הגדרות"'],
    keyboardNav: ['Esc closes', 'S toggles open (delegated through CameraFeedTile)'],
    focusManagement: 'Radix focus-trap inside the popover; focus returns to the gear trigger on close.',
  },

  tasks: [
    {
      id: 'CSM-1',
      title: 'Persist preferences per camera',
      priority: 'P1',
      estimate: 'S',
      description: 'Persist crosshair / detection preferences per camera id in local storage so they survive a refresh.',
      files: [{ path: 'src/app/components/PlaygroundPage.tsx', action: 'modify', description: 'Hydrate feed display state from local storage' }],
      acceptanceCriteria: ['Preferences round-trip across refreshes'],
    },
  ],

  hardcodedData: [],

  notes: [
    'About section is intentionally text-only - no edit handles - so the popover stays a fast settings switcher rather than a properties editor.',
    'When playbackEnabled flips on, `VideoPanel.handlePlaybackToggle` builds an open-state via `makeOpenPlaybackState` (rewinds 30s, paused).',
    'The Switch primitive was retuned for this popover specifically: the off-state uses `bg-state-selected` with an inset border-default ring so it stays visible against `bg-[#1a1a1a]/95`, and both the track and thumb animate over 200ms ease-out so the flip never feels instant. The shadcn defaults read as invisible in our dark theme.',
    'The toggle is always enabled when a feed is mounted. There is no archive-availability gate; the previous "disabled with reason" copy was over-engineered for a prototype playground.',
    'The (P) shortcut hint next to the row label matches the tile-level `P` shortcut wired in `CameraFeedTile`.',
  ],
};
