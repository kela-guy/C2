import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'TileDetectionAlert',
  filePath: 'src/app/components/camera-v2/TileDetectionAlert.tsx',
  purpose:
    'Two-tier visual signal mounted inside CameraFeedTile that flags AI-detection activity on a feed. Tier 1 is a state-based red gradient ring that frames the tile while detections[] is non-empty. Tier 2 is a one-shot opacity pulse that fires when a *new* detection id is observed (so an off-screen filmstrip thumb can grab the operator\'s eye even if they aren\'t looking at it). Both layers are pointer-events-none and use opacity-only animations so they degrade gracefully under prefers-reduced-motion.',
  location: 'Composition (camera-v2)',
  status: 'prototype',

  props: [
    { name: 'detections', type: 'DetectionBox[]', required: true, description: 'Current detection set on the feed. The component derives both tiers from this — `hasActive` from length, `pulseKey` from id-set diffs maintained by the useDetectionPulse hook.' },
  ],

  states: [
    { name: 'inactive', trigger: 'detections.length === 0', description: 'Component returns null — no DOM, no animation.', implementedInPrototype: true, storyProps: { detections: [] } },
    { name: 'active (state ring)', trigger: 'detections.length > 0', description: 'Inset red gradient ring frames the tile (2px inset shadow + soft inner glow + top→bottom gradient overlay). Mounts with a 200ms opacity transition.', implementedInPrototype: true, storyProps: { detections: [{ id: 'd1', x: 0.4, y: 0.4, w: 0.1, h: 0.1, label: 'UAV', confidence: 0.9 }] } },
    { name: 'pulse (new detection)', trigger: 'A detection id appears that was not in the previous render', description: 'A second motion overlay mounts keyed by the bumped pulseKey, animating opacity 0 → 0.95 → 0.6 → 0 over ~650ms (ease-out). Forces a fresh enter on every new id arrival.', implementedInPrototype: true },
    { name: 'reduced motion', trigger: 'prefers-reduced-motion: reduce', description: 'Pulse degrades to a flat 0 → 0.6 → 0 fade over 400ms; the state ring still mounts unchanged (it has no animation, only a transition on opacity).', implementedInPrototype: true },
    { name: 'loading', trigger: 'never', description: 'No async behaviour.', implementedInPrototype: false },
    { name: 'error', trigger: 'never', description: 'No error path.', implementedInPrototype: false },
    { name: 'disabled', trigger: 'CameraFeedTile sets suppressDetectionAlert = true (hero variant + showDetections on)', description: 'Parent does not mount the component — the boxes already convey the same information.', implementedInPrototype: true },
  ],

  interactions: [
    { trigger: 'detections.length transitions 0 → N', result: 'State ring fades in (200ms). If any of the new ids was unseen, the pulse layer also fires.', element: 'tile' },
    { trigger: 'detections add a previously-unseen id', result: 'Pulse layer re-mounts (keyed) and replays the enter animation.', element: 'tile' },
    { trigger: 'detections.length transitions to 0', result: 'Component unmounts; no exit animation (intentional — the absence of activity should read instantly).', element: 'tile' },
  ],

  tokens: {
    colors: [
      { name: 'alert-strong', value: 'rgba(239,68,68,0.85)', usage: 'Pulse inset shadow' },
      { name: 'alert-mid', value: 'rgba(239,68,68,0.55)', usage: 'State ring inset shadow' },
      { name: 'alert-soft', value: 'rgba(239,68,68,0.18)', usage: 'Top/bottom gradient stops + inner glow' },
    ],
    typography: [],
    spacing: [
      { name: 'ring-thickness', value: '2px', usage: 'Inset shadow width for both layers' },
      { name: 'ring-glow', value: '18px (state) / 26px (pulse)', usage: 'Inner glow radius' },
    ],
    animations: [
      { name: 'ring-fade', property: 'opacity', duration: '200ms', easing: 'ease-out', usage: 'State ring mount/unmount' },
      { name: 'pulse-default', property: 'opacity', duration: '650ms', easing: 'ease-out', usage: 'One-shot pulse (keyframes 0 / 0.18 / 0.5 / 1 → 0 / 0.95 / 0.6 / 0)' },
      { name: 'pulse-reduced-motion', property: 'opacity', duration: '400ms', easing: 'ease-out', usage: 'One-shot pulse under prefers-reduced-motion (keyframes 0 / 0.5 / 1 → 0 / 0.6 / 0)' },
    ],
  },

  accessibility: {
    ariaAttributes: ['aria-live="polite"', 'aria-label="Detection alert" (localized)'],
    screenReaderNotes: 'Live region announces detection activity politely so operators using AT learn that a feed has activity even if they cannot see the visual ring.',
  },

  tasks: [
    {
      id: 'TDA-1',
      title: 'Wire severity into the alert ramp',
      priority: 'P1',
      estimate: 'S',
      description: 'Once detections carry a severity (e.g. confidence-derived or backend-classified), tilt the red ramp accordingly: low = current soft, high = saturated red + faster pulse cycle.',
      files: [{ path: 'src/app/components/camera-v2/TileDetectionAlert.tsx', action: 'modify', description: 'Pick max severity across detections; map to a ramp constant.' }],
      acceptanceCriteria: ['Severity drives both ring intensity and pulse duration', 'No alert is louder than current high severity'],
    },
    {
      id: 'TDA-2',
      title: 'Use detection.firstSeenAt when present',
      priority: 'P2',
      estimate: 'S',
      description: 'Prefer the backend-supplied firstSeenAt timestamp over id-set diffing inside useDetectionPulse so the pulse fires consistently across re-mounts (e.g. when a thumb is promoted to hero).',
      files: [{ path: 'src/app/components/camera-v2/useDetectionPulse.ts', action: 'modify', description: 'Track the max firstSeenAt seen so far and bump pulseKey when a higher value arrives.' }],
      acceptanceCriteria: ['Promoting a thumb to hero does not retrigger the pulse for already-seen detections', 'New detections still pulse exactly once'],
    },
  ],

  hardcodedData: [
    { current: 'Red ramp constants ALERT_RED_STRONG / MID / SOFT inline in the component', replaceWith: 'Theme tokens once the design system exposes a "danger pulse" ramp', location: 'TileDetectionAlert.tsx' },
  ],

  notes: [
    'Animations are opacity-only on purpose. Animating layout properties (scale, position) on a shadow-and-gradient overlay is wasteful and ruins reduced-motion behaviour.',
    'The state ring uses CSS transition, not framer-motion — it has only two states (mounted/unmounted) and the transition is cheaper than a motion component for that case.',
    'Two tiles showing the same cameraId end up with independent pulse counters because each useDetectionPulse hook instance owns its own seenIds Set. That is intentional: each tile is a separate operator surface.',
  ],
};
