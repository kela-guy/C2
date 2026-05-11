import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'CameraControlBar',
  filePath: 'src/app/components/camera-v2/CameraControlBar.tsx',
  purpose:
    'YouTube-style hover/focus-revealed bottom bar for a camera feed. v2 cluster: lock (take/release), day/night, AI scan, designate-target (crosshair) on the left; settings (gear) and fullscreen on the right. Switch device, X (close) and Maximize were removed in v2.',
  location: 'Composition (camera-v2)',
  status: 'prototype',

  props: [
    { name: 'visible', type: 'boolean', required: true, description: 'Drives the fade in/out (hover, focus-within, or settings popover open)' },
    { name: 'mode', type: '"day" | "night"', required: true, description: 'Drives the day/night icon' },
    { name: 'status', type: 'CameraStatus', required: true, description: 'Bearing, ownership, request countdown, telemetry' },
    { name: 'detectionsOn', type: 'boolean', required: true, description: 'Drives the AI detection icon active state' },
    { name: 'designateMode', type: 'boolean', required: true, description: 'Drives the designate-target icon active state' },
    { name: 'isFullscreen', type: 'boolean', required: true, description: 'Drives fullscreen icon (Maximize2 vs Minimize2)' },
    { name: 'settingsOpen', type: 'boolean', required: true, description: 'Whether the settings popover is open' },
    { name: 'playbackEnabled', type: 'boolean', required: true, description: 'Whether the playback split is currently visible' },
    { name: 'onSettingsOpenChange', type: '(open: boolean) => void', required: true, description: 'Open/close the settings popover' },
    { name: 'onTakeRelease', type: '() => void', required: true, description: 'Take or release ownership (parent decides which based on status.controlOwner)' },
    { name: 'onModeToggle', type: '() => void', required: true, description: 'Day/Night toggle' },
    { name: 'onDetectionsToggle', type: '() => void', required: true, description: 'Toggle AI detection overlay' },
    { name: 'onDesignateModeToggle', type: '() => void', required: true, description: 'Enter / exit designate-target mode' },
    { name: 'onFullscreenToggle', type: '() => void', required: true, description: 'Toggle panel fullscreen' },
    { name: 'onPlaybackToggle', type: '() => void', required: true, description: 'Toggle the live-vs-playback split (hosted in the settings popover)' },
  ],

  states: [
    { name: 'free (no owner)', trigger: 'status.controlOwner === "none"', description: 'Lock icon white; click sends a take-control request', implementedInPrototype: true },
    { name: 'owned by self', trigger: 'status.controlOwner === "self"', description: 'LockOpen icon emerald; click releases', implementedInPrototype: true },
    { name: 'owned by other', trigger: 'status.controlOwner === "other"', description: 'Lock icon zinc, button disabled; mutating actions disabled (mode + detections still readable)', implementedInPrototype: true },
    { name: 'request pending', trigger: 'status.controlRequestPending', description: 'Lock icon pulses amber; tooltip carries the countdown', implementedInPrototype: true },
    { name: 'detections on', trigger: 'detectionsOn', description: 'ScanSearch + Sparkles icon glows emerald; aria-pressed=true', implementedInPrototype: true },
    { name: 'designate-target on', trigger: 'designateMode', description: 'Crosshair icon amber; aria-pressed=true; tooltip becomes "בטל סימון יעד"', implementedInPrototype: true },
    { name: 'settings open', trigger: 'settingsOpen', description: 'Gear button has the active style; popover is open', implementedInPrototype: true },
    { name: 'fullscreen', trigger: 'isFullscreen', description: 'Icon swaps to Minimize2', implementedInPrototype: true },
    { name: 'hidden', trigger: 'visible === false', description: 'Bar is opacity-0 + pointer-events-none; aria-hidden=true', implementedInPrototype: true },
    { name: 'loading', trigger: 'Stream connecting', description: 'Bar still shows; some actions could be disabled', implementedInPrototype: false },
    { name: 'error', trigger: 'Camera errored', description: 'Bar greyed out with explanatory tooltips', implementedInPrototype: false },
    { name: 'disabled', trigger: 'Camera offline', description: 'All buttons disabled', implementedInPrototype: false },
    { name: 'empty', trigger: 'No active feed', description: 'Bar is not rendered (caller responsibility)', implementedInPrototype: true },
  ],

  interactions: [
    { trigger: 'mouseenter / focus-within', element: 'parent tile', result: 'Bar fades in', animation: { property: 'opacity', from: '0', to: '1', duration: '200ms', easing: 'ease-out' } },
    { trigger: 'click', element: 'Lock icon', result: 'Calls onTakeRelease (parent picks take vs release based on owner)' },
    { trigger: 'click', element: 'Day/Night toggle', result: 'Calls onModeToggle' },
    { trigger: 'click', element: 'AI scan toggle', result: 'Calls onDetectionsToggle' },
    { trigger: 'click', element: 'Designate-target toggle (crosshair icon)', result: 'Calls onDesignateModeToggle - turns the cursor into a crosshair on the feed and arms the next click as a target designation' },
    { trigger: 'click', element: 'Settings (gear)', result: 'Opens the settings popover' },
    { trigger: 'click', element: 'Fullscreen button', result: 'Calls onFullscreenToggle' },
  ],

  tokens: {
    colors: [
      { name: 'gradient', value: 'linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0))', usage: 'Bottom legibility gradient' },
      { name: 'lock-self', value: 'rgba(16,185,129,0.20)', usage: 'Owned-by-self lock background' },
      { name: 'lock-locked', value: 'rgba(39,39,42,0.7)', usage: 'Foreign-locked lock background' },
      { name: 'lock-pending', value: 'rgba(245,158,11,0.15)', usage: 'Request-pending lock background' },
      { name: 'btn-active', value: 'rgba(255,255,255,0.15)', usage: 'Active/pressed icon button bg' },
      { name: 'ai-on', value: '#6ee7b7', usage: 'AI scan icon active tint' },
      { name: 'designate-on', value: '#fcd34d', usage: 'Designate-target icon active tint' },
    ],
    typography: [],
    spacing: [
      { name: 'bar-padding', value: '4px 8px 8px', usage: 'Padding inside the bar' },
      { name: 'btn-gap', value: '4px', usage: 'Gap between control buttons' },
    ],
  },

  accessibility: {
    ariaAttributes: ['aria-label on every icon button', 'aria-pressed on toggles (lock when self, detections, designate-target, settings)', 'aria-hidden on the bar when visible=false'],
    keyboardNav: ['Tab orders left -> right inside the bar', 'Tooltips show keyboard hints (T, D, X, S, F)'],
    focusManagement: 'focus-visible:ring-2 ring-white/25 on every button; bar stays open while focus is inside the tile',
  },

  tasks: [],

  notes: [
    'Lock state is conveyed through icon tint + tooltip only - no labels - so the bar stays compact across all 4 ownership states.',
    'AI scan icon is ScanSearch + tiny Sparkles badge to distinguish "smart detection" from a plain visibility toggle.',
    'Settings popover is owned by this component (CameraSettingsMenu) so the popover anchors directly to the gear button.',
    'Designate-target is a one-shot mode: clicking the crosshair icon arms it (cursor becomes crosshair, follow-cursor reticle + amber inset ring + hint banner appear over the feed); the next click on the feed designates that point and auto-exits the mode. Esc cancels.',
    'When the controlOwner is "other", we still allow read-only actions (detections / designate-target / fullscreen) - only mutating actions (mode swap) are disabled.',
  ],
};
