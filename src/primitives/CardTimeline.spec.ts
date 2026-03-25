import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'CardTimeline',
  filePath: 'src/primitives/CardTimeline.tsx',
  purpose: 'Renders a mission progress timeline for target cards — supports both a full vertical step list with status icons and a compact horizontal dot indicator. Visualizes steps as pending, active, complete, or error.',
  location: 'TargetCard/Slots',
  status: 'prototype',

  props: [
    { name: 'steps', type: 'TimelineStep[]', required: true, description: 'Ordered array of timeline steps with label and status (pending | active | complete | error)' },
    { name: 'compact', type: 'boolean', required: false, defaultValue: 'false', description: 'When true, renders as a horizontal row of colored dots instead of the full vertical list' },
    { name: 'className', type: 'string', required: false, defaultValue: "''", description: 'Additional CSS classes on outer container' },
  ],

  states: [
    {
      name: 'default (full vertical)',
      trigger: 'steps[] provided, compact=false',
      description: 'Vertical list of steps with status icons: checkmark for complete, red dot for active, spinner for error, empty circle for pending',
      implementedInPrototype: true,
      storyProps: {
        steps: [
          { label: 'נעילת מטרה', status: 'complete' },
          { label: 'אישור ירי', status: 'complete' },
          { label: 'שיגור', status: 'active' },
          { label: 'פגיעה', status: 'pending' },
          { label: 'אימות', status: 'pending' },
        ],
      },
    },
    {
      name: 'compact dots',
      trigger: 'compact=true',
      description: 'Horizontal row of small colored dots connected by lines — complete=emerald, active=white+pulse, error=red, pending=zinc-600',
      implementedInPrototype: true,
      storyProps: {
        steps: [
          { label: 'נעילת מטרה', status: 'complete' },
          { label: 'אישור ירי', status: 'complete' },
          { label: 'שיגור', status: 'active' },
          { label: 'פגיעה', status: 'pending' },
        ],
        compact: true,
      },
      visualNotes: 'Active dot is larger (activeDotSize vs dotSize from CARD_TOKENS.timeline), pulsing white',
    },
    {
      name: 'active step',
      trigger: 'step.status === "active"',
      description: 'Full: white text with red dot indicator and blinking cursor. Compact: larger pulsing white dot.',
      implementedInPrototype: true,
      visualNotes: 'Full mode has animate-blink cursor span (w-1 h-3 bg-white/60)',
    },
    {
      name: 'complete step',
      trigger: 'step.status === "complete"',
      description: 'Full: green checkmark in circle with 50% opacity text. Compact: emerald-400 dot with emerald connector line.',
      implementedInPrototype: true,
      visualNotes: 'Check icon color is #12b886 from CARD_TOKENS, strokeWidth 2.5',
    },
    {
      name: 'error step',
      trigger: 'step.status === "error"',
      description: 'Full: spinning Loader2 icon in red ring with red text. Compact: red-500 dot.',
      implementedInPrototype: true,
      visualNotes: 'animate-spin on Loader2 icon, red-400 text, red ring shadow',
    },
    {
      name: 'pending step',
      trigger: 'step.status === "pending"',
      description: 'Full: empty circle outline with 50% opacity text. Compact: zinc-600 dot.',
      implementedInPrototype: true,
    },
    {
      name: 'loading',
      trigger: 'Steps data is still being fetched',
      description: 'No loading state — parent must provide skeleton',
      implementedInPrototype: false,
      visualNotes: 'Should show 3-4 skeleton rows with placeholder dots and shimmer text',
    },
    {
      name: 'error (component-level)',
      trigger: 'Invalid step data or render failure',
      description: 'No error boundary — errors propagate to parent',
      implementedInPrototype: false,
    },
    {
      name: 'empty',
      trigger: 'steps[] is empty array',
      description: 'Component returns null — renders nothing',
      implementedInPrototype: true,
    },
    {
      name: 'all complete',
      trigger: 'Every step has status "complete"',
      description: 'All steps show green checkmarks, all connector lines are emerald — mission complete state',
      implementedInPrototype: true,
      visualNotes: 'No special "all done" visual — just all green',
    },
  ],

  interactions: [
    {
      trigger: 'none',
      element: 'Timeline steps',
      result: 'Purely presentational — no direct user interaction. Steps are read-only status indicators.',
      keyboard: 'N/A (not focusable)',
    },
    {
      trigger: 'hover',
      element: 'Compact dot (title attribute)',
      result: 'Browser tooltip shows step label on hover',
    },
  ],

  tokens: {
    colors: [
      { name: 'complete-dot', value: '#34d399 (emerald-400)', usage: 'Compact dot color for complete steps' },
      { name: 'complete-line', value: 'rgba(16,185,129,0.4) (emerald-500/40)', usage: 'Connector line after complete step' },
      { name: 'complete-check', value: '#12b886', usage: 'Full-mode checkmark icon color' },
      { name: 'active-dot', value: 'white', usage: 'Compact active dot (pulsing)' },
      { name: 'active-text', value: 'white', usage: 'Full-mode active step text' },
      { name: 'active-indicator', value: '#ef4444 (red-500)', usage: 'Red dot inside active step circle (full mode)' },
      { name: 'error-icon', value: '#f87171 (red-400)', usage: 'Error step spinner and text color' },
      { name: 'error-ring', value: 'rgba(239,68,68,0.5)', usage: 'Error step circle ring shadow' },
      { name: 'pending-dot', value: '#52525b (zinc-600)', usage: 'Compact pending dot color' },
      { name: 'pending-line', value: '#3f3f46 (zinc-700)', usage: 'Connector line after non-complete step' },
      { name: 'pending-text', value: 'rgba(255,255,255,0.5)', usage: 'Full-mode pending/complete step text opacity' },
      { name: 'blink-cursor', value: 'rgba(255,255,255,0.6)', usage: 'Blinking cursor indicator on active step' },
    ],
    typography: [
      { name: 'step-label', fontFamily: 'monospace', fontSize: '12px', fontWeight: '400', lineHeight: '1.4', usage: 'Step label text (text-xs font-mono)' },
    ],
    spacing: [
      { name: 'dot-size', value: '8px', usage: 'Compact dot diameter (CARD_TOKENS.timeline.dotSize)' },
      { name: 'active-dot-size', value: '10px', usage: 'Compact active dot diameter (CARD_TOKENS.timeline.activeDotSize)' },
      { name: 'icon-size', value: '16px (size-4)', usage: 'Full-mode status circle diameter' },
      { name: 'step-gap', value: '10px', usage: 'Gap between icon and label in full mode (gap-2.5)' },
      { name: 'list-gap', value: '6px', usage: 'Gap between steps in full mode (gap-1.5)' },
      { name: 'compact-gap', value: '4px', usage: 'Gap between dots in compact mode (gap-1)' },
      { name: 'connector-min-w', value: '6px', usage: 'Minimum connector line width between compact dots' },
      { name: 'list-py', value: '8px', usage: 'Vertical padding on full list container (py-2)' },
    ],
    borderRadius: [
      { name: 'dot', value: '9999px', usage: 'All dots and status circles are fully round (rounded-full)' },
    ],
    animations: [
      { name: 'active-pulse', property: 'opacity', duration: 'infinite', easing: 'ease-in-out', usage: 'Pulsing animation on compact active dot (animate-pulse)' },
      { name: 'error-spin', property: 'transform', duration: 'infinite', easing: 'linear', usage: 'Spinning Loader2 icon on error step (animate-spin)' },
      { name: 'blink-cursor', property: 'opacity', duration: 'infinite', easing: 'step-end', usage: 'Blinking cursor on active step in full mode (animate-blink)' },
      { name: 'step-transition', property: 'all', duration: '300ms', easing: 'ease', usage: 'Color and opacity transition on step status change' },
    ],
  },

  flows: [
    {
      name: 'Mission lifecycle progression',
      type: 'happy',
      steps: [
        { actor: 'system', action: 'Target detected, timeline initialized with first step active', result: 'Timeline shows first step active, rest pending' },
        { actor: 'system', action: 'Step completes, next step becomes active', result: 'Completed step gets checkmark, next step gets red dot indicator' },
        { actor: 'system', action: 'All steps complete', result: 'Full green timeline — mission complete' },
      ],
    },
    {
      name: 'Step failure',
      type: 'error',
      steps: [
        { actor: 'system', action: 'A step encounters an error during execution', result: 'Step shows spinning loader with red ring' },
        { actor: 'user', action: 'Sees error indicator on timeline', result: 'User knows which step failed and can take corrective action' },
      ],
    },
  ],

  accessibility: {
    role: 'img (compact dots only)',
    ariaAttributes: [
      'role="img" on each compact dot with descriptive aria-label',
      'aria-label="${label}: ${hebrewStatus}" on compact dots (e.g. "שיגור: פעיל")',
      'aria-hidden="true" on all full-mode status icons (Check, Loader2, decorative circles)',
      'title="${label}" on compact dots for browser tooltip',
      'aria-hidden="true" on blinking cursor span',
    ],
    keyboardNav: [
      'No keyboard interaction — component is purely presentational',
    ],
    focusManagement: 'No focusable elements. Timeline is a visual status indicator, not interactive.',
    screenReaderNotes: 'Compact mode uses role="img" with Hebrew aria-labels for each dot. Full mode relies on text content only — status icons are aria-hidden. The overall timeline has no landmark role or aria-label, so a screen reader may not announce it as a cohesive unit.',
  },

  tasks: [
    {
      id: 'CT-1',
      title: 'Add group role and label for timeline container',
      priority: 'P1',
      estimate: 'S',
      description: 'Wrap the timeline in a role="group" with an aria-label like "תהליך משימה" so screen readers announce the steps as a related set.',
      files: [{ path: 'src/primitives/CardTimeline.tsx', action: 'modify', description: 'Add role="group" and aria-label to outer container' }],
      acceptanceCriteria: [
        'Screen reader announces timeline as a named group',
        'Each step within the group has proper status announcement',
        'Works for both compact and full variants',
      ],
    },
    {
      id: 'CT-2',
      title: 'Add loading skeleton',
      priority: 'P1',
      estimate: 'S',
      description: 'Support a loading prop that renders 3-4 placeholder skeleton rows (full) or dots (compact) while step data is being fetched.',
      files: [{ path: 'src/primitives/CardTimeline.tsx', action: 'modify', description: 'Add loading prop with skeleton rendering' }],
      acceptanceCriteria: [
        'Loading state shows skeleton at matching layout (vertical or horizontal)',
        'Skeleton has pulse animation',
        'Transitions smoothly to real data',
      ],
    },
    {
      id: 'CT-3',
      title: 'Add completion celebration state',
      priority: 'P2',
      estimate: 'M',
      description: 'When all steps are complete, optionally show a subtle success visual (e.g. green glow, checkmark badge, or brief animation) to reinforce mission completion.',
      files: [{ path: 'src/primitives/CardTimeline.tsx', action: 'modify', description: 'Detect all-complete state and add success visual' }],
      acceptanceCriteria: [
        'All-complete state has distinct visual vs. partially complete',
        'Animation respects prefers-reduced-motion',
        'Works in both compact and full modes',
      ],
    },
    {
      id: 'CT-4',
      title: 'Add reduced-motion support',
      priority: 'P2',
      estimate: 'S',
      description: 'The component uses animate-pulse, animate-spin, and animate-blink. These should be disabled or reduced when prefers-reduced-motion is active.',
      files: [{ path: 'src/primitives/CardTimeline.tsx', action: 'modify', description: 'Conditionally apply animation classes based on media query' }],
      acceptanceCriteria: [
        'Pulsing dot becomes static when reduced motion is preferred',
        'Spinner either stops or reduces to a static error icon',
        'Blinking cursor becomes static or hidden',
      ],
    },
    {
      id: 'CT-5',
      title: 'Use stable keys instead of array index',
      priority: 'P1',
      estimate: 'S',
      description: 'Steps are keyed by array index (key={idx}) which can cause incorrect reconciliation if steps are reordered or inserted. Use step.label or a dedicated id field.',
      files: [{ path: 'src/primitives/CardTimeline.tsx', action: 'modify', description: 'Add id field to TimelineStep or use label as key' }],
      acceptanceCriteria: [
        'Steps re-render correctly when order changes',
        'No React key warnings in console',
        'Animations transition correctly on status change',
      ],
    },
  ],

  hardcodedData: [
    {
      current: "Connector line height: h-[1px] and min-width: min-w-[6px]",
      replaceWith: 'CARD_TOKENS.timeline.lineWidth and connectorMinWidth',
      location: 'CardTimeline.tsx line 48',
    },
    {
      current: "Check icon color #12b886 (hardcoded hex)",
      replaceWith: 'CARD_TOKENS.spine.colors.resolved or CSS variable',
      location: 'CardTimeline.tsx line 77',
    },
  ],

  notes: [
    'The component has two entirely separate render paths for compact (horizontal dots) and full (vertical list) modes — they share no internal JSX.',
    'CARD_TOKENS.timeline provides dotSize, activeDotSize, lineWidth, and gap — but only dotSize and activeDotSize are actually used. lineWidth and gap are ignored in favor of Tailwind classes.',
    'Status text in compact dot aria-labels is translated to Hebrew: הושלם, פעיל, שגיאה, ממתין.',
    'The animate-blink class is custom (not standard Tailwind) and must be defined in tailwind config or index.css.',
    'Full mode uses font-mono for all step labels, giving the timeline a technical/operational feel.',
    'The error state uses a spinning Loader2 icon which may be confusing — it suggests loading rather than failure. Consider using an X or AlertCircle icon instead.',
  ],
};
