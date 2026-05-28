import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'CameraControlBar',
  filePath: 'src/app/components/camera-v2/CameraControlBar.tsx',
  purpose:
    'YouTube-style hover/focus-revealed bottom bar for a camera feed. v2 cluster: lock (take/release), day/night, AI scan, designate-target (crosshair), zoom (icon -> hover-reveal vertical slider, YouTube-volume style) on the left; settings (gear) and fullscreen on the right. Switch device, X (close) and Maximize were removed in v2.',
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
    { name: 'onZoomChange', type: '(zoom: number) => void', required: true, description: 'Bubbles the new zoom (clamped 1.0..30.0, 1 decimal). Slider lives inside the bar as a hover-revealed popover above the zoom icon.' },
  ],

  states: [
    { name: 'free (no owner)', trigger: 'status.controlOwner === "none"', description: 'Lock icon white; click sends a take-control request', implementedInPrototype: true },
    { name: 'owned by self', trigger: 'status.controlOwner === "self"', description: 'LockOpen icon emerald; click releases', implementedInPrototype: true },
    { name: 'owned by other', trigger: 'status.controlOwner === "other"', description: 'Lock icon zinc, button disabled; mutating actions disabled (mode + detections still readable)', implementedInPrototype: true },
    { name: 'request pending', trigger: 'status.controlRequestPending', description: 'Lock icon pulses amber; tooltip carries the countdown', implementedInPrototype: true },
    { name: 'detections on', trigger: 'detectionsOn', description: 'ScanSearch + Sparkles icon glows emerald; aria-pressed=true', implementedInPrototype: true },
    { name: 'designate-target on', trigger: 'designateMode', description: 'Crosshair icon amber; aria-pressed=true; tooltip becomes "בטל סימון יעד"', implementedInPrototype: true },
    { name: 'zoom-collapsed', trigger: 'No hover/focus on the zoom trigger', description: 'Trigger renders the Search icon next to a small amber zoom-value readout (e.g. "5.0x") so the operator can scan the current value without opening the popover.', implementedInPrototype: true },
    { name: 'zoom-popover-open', trigger: 'pointer or focus on the zoom icon', description: 'Vertical zoom slider + (redundant) value readout fade in above the icon. Stays open while pointer is anywhere over the trigger, the bridge, or the popover; closes after a 200ms grace timeout on mouseleave/blur. The trigger has no Tooltip wrapper - the popover IS the affordance.', implementedInPrototype: true },
    { name: 'zoom-disabled', trigger: 'status.controlOwner === "other"', description: 'Trigger still opens the popover so the operator can read the value, but the slider inside is non-interactive (foreign-locked)', implementedInPrototype: true },
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
    { trigger: 'hover / focus', element: 'Zoom icon (Search)', result: 'Reveals the vertical zoom slider popover above the icon (with hover bridge + 200ms close grace)' },
    { trigger: 'input', element: 'Vertical zoom slider', result: 'Calls onZoomChange with the parsed (clamped 1.0..30.0) value; Arrow keys move by 0.1x' },
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
      { name: 'zoom-popover-bg', value: 'rgba(0,0,0,0.75)', usage: 'Zoom popover background (slightly more opaque than the gradient so the slider reads against any video frame)' },
      { name: 'zoom-slider-accent', value: '#fcd34d', usage: 'Zoom slider thumb (amber)' },
    ],
    typography: [
      { name: 'zoom-readout', fontFamily: 'IBM Plex Mono', fontSize: '12px', fontWeight: '500', lineHeight: '1', usage: 'Zoom value - shown both inline next to the trigger icon AND below the vertical slider' },
    ],
    spacing: [
      { name: 'bar-padding', value: '4px 8px 8px', usage: 'Padding inside the bar' },
      { name: 'btn-gap', value: '4px', usage: 'Gap between control buttons' },
      { name: 'zoom-popover-bridge', value: '8px', usage: 'Transparent hover bridge between the zoom trigger and the popover (deadzone protection)' },
    ],
  },

  accessibility: {
    ariaAttributes: [
      'aria-label on every icon button (zoom label includes the current value)',
      'aria-pressed on toggles (lock when self, detections, designate-target, settings)',
      'aria-expanded + aria-controls on the zoom trigger',
      'aria-label="Zoom level" on the slider',
      'aria-hidden on the bar when visible=false and on the zoom popover when collapsed',
    ],
    keyboardNav: [
      'Tab orders left -> right inside the bar',
      'Tabbing into the zoom trigger opens the popover; another Tab focuses the slider; Arrow keys move it by 0.1x',
      'Tooltips show keyboard hints (T, D, X, S, F)',
    ],
    focusManagement: 'focus-visible:ring-2 ring-white/25 on every button; bar stays open while focus is inside the tile; zoom popover uses focus-capture/blur-capture to keep itself open while focus is anywhere in its wrapper',
  },

  tasks: [],

  notes: [
    'Bar layout is pinned to LTR via `<DirIsland direction="ltr">` so the primary cluster always sits on the physical left and Settings/Fullscreen on the physical right, regardless of app direction. Operators learn the spatial layout once; mirroring it in RTL would undermine recall during high-stakes operations — same convention as the other camera HUD chrome.',
    'Lock state is conveyed through icon tint + tooltip only - no labels - so the bar stays compact across all 4 ownership states.',
    'AI scan icon is ScanSearch + tiny Sparkles badge to distinguish "smart detection" from a plain visibility toggle.',
    'Settings popover is owned by this component (CameraSettingsMenu) so the popover anchors directly to the gear button.',
    'Designate-target is a one-shot mode: clicking the crosshair icon arms it (cursor becomes crosshair, follow-cursor reticle + amber inset ring + hint banner appear over the feed); the next click on the feed designates that point and auto-exits the mode. Esc cancels.',
    'When the controlOwner is "other", we still allow read-only actions (detections / designate-target / fullscreen) - only mutating actions (mode swap, zoom slider) are disabled.',
    'Zoom uses a YouTube-volume hover-reveal pattern: a Search icon at rest, vertical slider on hover/focus. Three layered defences keep the cursor from falling into a deadzone when travelling between the icon and the slider thumb: a single hover wrapper around both elements, a transparent bridge spanning the gap, and a 200ms grace timeout before close. The trigger deliberately has NO Tooltip wrapper - the popover IS the affordance.',
    'Zoom slider uses the modern `writing-mode: vertical-lr; direction: rtl` syntax (Chrome 124+, Safari 17.4+, Firefox 113+) for true vertical orientation. No CSS rotate hack, so the hit-target stays correct.',
  ],
};
