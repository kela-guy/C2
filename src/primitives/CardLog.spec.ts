import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'CardLog',
  filePath: 'src/primitives/CardLog.tsx',
  purpose: 'Collapsible timeline log showing chronological event entries with a "show more" expansion for long lists.',
  location: 'TargetCard/Slots',
  status: 'prototype',

  props: [
    { name: 'entries', type: 'LogEntry[]', required: true, description: 'Array of { time, label } events — displayed in reverse chronological order (newest first)' },
    { name: 'maxVisible', type: 'number', required: false, defaultValue: '5', description: 'Maximum entries shown before "show more" truncation' },
    { name: 'defaultOpen', type: 'boolean', required: false, defaultValue: 'false', description: 'Whether the accordion section starts expanded' },
    { name: 'className', type: 'string', required: false, defaultValue: "''", description: 'Additional CSS classes on the AccordionSection wrapper' },
  ],

  states: [
    {
      name: 'default (collapsed)',
      trigger: 'entries[] provided, defaultOpen=false',
      description: 'Accordion header shows "לוג (N)" with entry count and History icon — content hidden',
      implementedInPrototype: true,
      storyProps: {
        entries: [
          { time: '00:10:22', label: 'זוהתה תנועה חשודה' },
          { time: '00:10:45', label: 'התחלת חקירה' },
        ],
      },
    },
    {
      name: 'expanded (short list)',
      trigger: 'Accordion opened, entries.length <= maxVisible',
      description: 'All entries visible in reverse order — no "show more" button',
      implementedInPrototype: true,
      storyProps: {
        entries: [
          { time: '00:10:22', label: 'זוהתה תנועה חשודה' },
          { time: '00:10:45', label: 'התחלת חקירה' },
          { time: '00:11:02', label: 'אימות ויזואלי' },
        ],
        defaultOpen: true,
      },
    },
    {
      name: 'truncated (show more)',
      trigger: 'Accordion opened, entries.length > maxVisible',
      description: 'First maxVisible entries shown with "עוד N רשומות" button at bottom',
      implementedInPrototype: true,
      storyProps: {
        entries: Array.from({ length: 12 }, (_, i) => ({
          time: `00:${String(10 + i).padStart(2, '0')}:00`,
          label: `אירוע ${i + 1}`,
        })),
        maxVisible: 5,
        defaultOpen: true,
      },
    },
    {
      name: 'fully expanded',
      trigger: 'User clicks "show more" button',
      description: 'All entries visible, "show more" button hidden',
      implementedInPrototype: true,
      visualNotes: 'One-way expansion — no "show less" to re-collapse',
    },
    {
      name: 'empty',
      trigger: 'entries[] is an empty array',
      description: 'Component returns null — renders nothing',
      implementedInPrototype: true,
      storyProps: { entries: [] },
    },
    {
      name: 'loading',
      trigger: 'Log data is being fetched',
      description: 'No loading state — should show skeleton timeline entries',
      implementedInPrototype: false,
      visualNotes: 'Should render pulsing placeholder rows matching timeline dot + label + time layout',
    },
    {
      name: 'error',
      trigger: 'Log data fetch fails',
      description: 'No error state — should show inline error with retry',
      implementedInPrototype: false,
    },
    {
      name: 'live update',
      trigger: 'New entry appended to entries[] while expanded',
      description: 'No animation for new entries — list re-renders instantly',
      implementedInPrototype: false,
      visualNotes: 'Should animate new entry sliding in at top with highlight flash',
    },
  ],

  interactions: [
    {
      trigger: 'click',
      element: 'Accordion header',
      result: 'Toggles log section open/closed (handled by AccordionSection)',
      keyboard: 'Enter/Space toggles accordion (native button)',
    },
    {
      trigger: 'click',
      element: '"Show more" button',
      result: 'Expands to show all entries; button disappears; stopPropagation prevents card toggle',
      keyboard: 'Enter/Space activates button (native)',
    },
  ],

  tokens: {
    colors: [
      { name: 'dot-bg', value: 'CARD_TOKENS.surface.level1', usage: 'Timeline dot background color' },
      { name: 'dot-ring', value: 'rgba(255,255,255,0.2)', usage: 'Timeline dot outline ring (box-shadow)' },
      { name: 'entry-text', value: 'text-zinc-300', usage: 'Log entry label text color' },
      { name: 'time-text', value: 'text-white/50', usage: 'Timestamp text color (50% opacity white)' },
      { name: 'show-more', value: 'text-zinc-400', usage: '"Show more" button default color' },
      { name: 'show-more-hover', value: 'text-zinc-300', usage: '"Show more" button hover color' },
    ],
    typography: [
      { name: 'entry-label', fontFamily: 'Heebo', fontSize: '11px', fontWeight: '400', lineHeight: '1.5', usage: 'Log entry text (text-[11px])' },
      { name: 'time', fontFamily: 'monospace', fontSize: '9px', fontWeight: '400', lineHeight: '24px', usage: 'Timestamp (text-[9px] font-mono tabular-nums)' },
      { name: 'show-more', fontFamily: 'Heebo', fontSize: '9px', fontWeight: '400', lineHeight: '1.5', usage: '"Show more" button text (text-[9px])' },
    ],
    spacing: [
      { name: 'content-py', value: '8px', usage: 'Timeline content vertical padding (py-2)' },
      { name: 'content-px', value: '4px', usage: 'Timeline content horizontal padding (px-1)' },
      { name: 'entry-gap', value: '10px', usage: 'Gap between dot and content (gap-2.5)' },
      { name: 'entry-mb', value: '8px', usage: 'Margin between entries (mb-2)' },
    ],
    borderRadius: [
      { name: 'dot', value: '50% (rounded-full)', usage: 'Timeline dot shape' },
    ],
    shadows: [
      { name: 'dot-ring', value: '0 0 0 1px rgba(255,255,255,0.2)', usage: 'Timeline dot outer ring' },
    ],
  },

  accessibility: {
    role: 'region (via AccordionSection)',
    ariaAttributes: [],
    keyboardNav: [
      'Tab: focuses accordion header, then "show more" button when visible',
      'Enter/Space: toggles accordion or expands truncated list',
    ],
    focusManagement: '"Show more" button disappears after click — focus is lost. Should move focus to first newly revealed entry or back to accordion.',
    screenReaderNotes: 'Entry count is announced in accordion title "לוג (N)". Individual entries have no semantic structure — consider using a list (ol/ul) for screen readers.',
  },

  flows: [
    {
      name: 'View full log',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'Clicks accordion header to expand', result: 'First 5 entries visible with "show more" button' },
        { actor: 'user', action: 'Clicks "show more" button', result: 'All entries visible, button disappears' },
      ],
    },
    {
      name: 'Short log (no truncation)',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'Clicks accordion header', result: 'All entries visible (≤ maxVisible), no "show more" button' },
      ],
    },
  ],

  tasks: [
    {
      id: 'CL-1',
      title: 'Add "show less" to re-collapse expanded log',
      priority: 'P1',
      estimate: 'S',
      description: 'Currently expansion is one-way — once expanded, user cannot re-truncate. Add a "show less" button to restore maxVisible truncation.',
      files: [{ path: 'src/primitives/CardLog.tsx', action: 'modify', description: 'Toggle expanded state and show "הצג פחות" when fully expanded' }],
      acceptanceCriteria: [
        '"Show less" button appears when expanded beyond maxVisible',
        'Clicking "show less" re-truncates to maxVisible entries',
        'Focus moves to "show more" button after collapse',
      ],
    },
    {
      id: 'CL-2',
      title: 'Animate new log entries',
      priority: 'P1',
      estimate: 'M',
      description: 'When a new entry is appended to the entries array, animate it sliding in at the top of the list with a brief highlight flash.',
      files: [{ path: 'src/primitives/CardLog.tsx', action: 'modify', description: 'Add AnimatePresence for entry list, highlight animation for newest entry' }],
      acceptanceCriteria: [
        'New entry slides in from top with opacity transition',
        'Entry background flashes briefly to indicate newness',
        'Animation respects prefers-reduced-motion',
      ],
    },
    {
      id: 'CL-3',
      title: 'Use semantic list markup',
      priority: 'P1',
      estimate: 'S',
      description: 'Replace div-based entry layout with an ordered list (ol) for better screen reader navigation and semantics.',
      files: [{ path: 'src/primitives/CardLog.tsx', action: 'modify', description: 'Replace outer div with ol, entry divs with li' }],
      acceptanceCriteria: [
        'Entries use ol > li markup',
        'Screen reader announces list length and position',
        'Visual appearance is unchanged',
      ],
    },
    {
      id: 'CL-4',
      title: 'Add loading skeleton state',
      priority: 'P2',
      estimate: 'S',
      description: 'Accept a loading prop and render skeleton timeline entries while data loads.',
      files: [{ path: 'src/primitives/CardLog.tsx', action: 'modify', description: 'Add loading prop, render 3 skeleton entries when true' }],
      acceptanceCriteria: [
        'Skeleton entries match dot + label + time layout',
        'Skeleton uses pulse animation',
        '"Show more" button is not rendered during loading',
      ],
    },
    {
      id: 'CL-5',
      title: 'Manage focus when "show more" disappears',
      priority: 'P2',
      estimate: 'S',
      description: 'When "show more" is clicked and disappears, focus is lost. Move focus to the first newly revealed entry.',
      files: [{ path: 'src/primitives/CardLog.tsx', action: 'modify', description: 'Add ref to first new entry, focus it after expansion' }],
      acceptanceCriteria: [
        'Focus moves to first new entry after clicking "show more"',
        'Focus ring is visible on the focused entry',
        'Screen reader announces the newly focused entry',
      ],
    },
  ],

  hardcodedData: [
    {
      current: "text-[11px] — arbitrary Tailwind value for entry label font size",
      replaceWith: 'Design token or Tailwind config extension (e.g. text-2xs)',
      location: 'CardLog.tsx line 45',
    },
    {
      current: "text-[9px] — arbitrary Tailwind value for timestamp and show-more font size",
      replaceWith: 'Design token or Tailwind config extension',
      location: 'CardLog.tsx lines 47, 60',
    },
    {
      current: "w-[11px] h-[11px] — arbitrary Tailwind values for timeline dot size",
      replaceWith: 'Design token (e.g. CARD_TOKENS.timeline.dotSize) already exists but not used here',
      location: 'CardLog.tsx line 43',
    },
    {
      current: "shadow-[0_0_0_1px_rgba(255,255,255,0.2)] — arbitrary box-shadow for dot ring",
      replaceWith: 'Tailwind ring utility or CSS custom property',
      location: 'CardLog.tsx line 43',
    },
  ],

  notes: [
    'Entries are reversed before display so newest entries appear first — the source array is assumed to be in chronological order.',
    'The expanded state is local (useState) — it resets if the component unmounts (e.g. when the accordion collapses and remounts).',
    'Timeline dots use CARD_TOKENS.surface.level1 background with a white ring shadow — creating a subtle indented dot effect.',
    'The "show more" button uses stopPropagation to prevent the parent card from toggling when expanding the log.',
    'tabular-nums on timestamps ensures consistent width alignment across entries.',
  ],
};
