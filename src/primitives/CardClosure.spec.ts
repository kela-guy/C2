import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'CardClosure',
  filePath: 'src/primitives/CardClosure.tsx',
  purpose: 'Renders a grid of closure-outcome buttons for ending an incident — user picks a reason and the card closes.',
  location: 'TargetCard/Slots',
  status: 'prototype',

  props: [
    { name: 'title', type: 'string', required: false, defaultValue: "'סגירת אירוע — בחר סיבה'", description: 'Section heading displayed above the outcome buttons' },
    { name: 'outcomes', type: 'ClosureOutcome[]', required: true, description: 'Array of { id, label, icon? } items rendered as buttons in a 2-column grid' },
    { name: 'onSelect', type: '(outcomeId: string) => void', required: true, description: 'Callback fired with the selected outcome id when a button is clicked' },
    { name: 'className', type: 'string', required: false, defaultValue: "''", description: 'Additional CSS classes on the outer wrapper' },
  ],

  states: [
    {
      name: 'default',
      trigger: 'outcomes[] has at least one item',
      description: '2-column grid of outcome buttons with optional icons, RTL layout',
      implementedInPrototype: true,
      storyProps: {
        outcomes: [
          { id: 'false-alarm', label: 'התרעת שווא' },
          { id: 'bird', label: 'ציפור' },
          { id: 'resolved', label: 'טופל' },
          { id: 'other', label: 'אחר' },
        ],
      },
    },
    {
      name: 'with icons',
      trigger: 'outcome.icon is provided',
      description: 'Each button shows a 12px icon before the label',
      implementedInPrototype: true,
      visualNotes: 'Icon rendered at 12px in text-zinc-500, shrink-0',
    },
    {
      name: 'hover',
      trigger: 'User hovers an outcome button',
      description: 'Button brightness increases via hover:brightness-125',
      implementedInPrototype: true,
      visualNotes: 'CSS filter brightness transition',
    },
    {
      name: 'empty',
      trigger: 'outcomes[] is an empty array',
      description: 'Component returns null — renders nothing',
      implementedInPrototype: true,
      storyProps: { outcomes: [] },
    },
    {
      name: 'loading',
      trigger: 'Async closure in progress',
      description: 'No loading state — buttons remain interactive during async operations',
      implementedInPrototype: false,
      visualNotes: 'Should disable buttons and show spinner on selected outcome while closure processes',
    },
    {
      name: 'error',
      trigger: 'Closure API call fails',
      description: 'No error feedback — failure propagates silently to parent',
      implementedInPrototype: false,
      visualNotes: 'Should show inline error message or re-enable buttons with error styling',
    },
    {
      name: 'disabled',
      trigger: 'Component should be non-interactive',
      description: 'No disabled prop — buttons are always clickable when rendered',
      implementedInPrototype: false,
      visualNotes: 'Should accept a disabled prop to grey out all buttons and prevent clicks',
    },
  ],

  interactions: [
    {
      trigger: 'click',
      element: 'Outcome button',
      result: 'Calls onSelect(outcome.id); event.stopPropagation() prevents card toggle',
      keyboard: 'Enter/Space activates button (native)',
    },
    {
      trigger: 'hover',
      element: 'Outcome button',
      result: 'brightness-125 filter applied via CSS transition',
      animation: { property: 'filter', from: 'brightness(1)', to: 'brightness(1.25)', duration: '150ms', easing: 'ease' },
    },
  ],

  tokens: {
    colors: [
      { name: 'title-icon', value: 'text-zinc-400', usage: 'CheckCircle2 icon color in section header' },
      { name: 'title-text', value: 'text-zinc-300', usage: 'Section title text color' },
      { name: 'button-text', value: 'text-zinc-300', usage: 'Outcome button label color' },
      { name: 'button-icon', value: 'text-zinc-500', usage: 'Optional outcome icon color' },
      { name: 'button-bg', value: 'CARD_TOKENS.surface.level3', usage: 'Outcome button background' },
      { name: 'button-ring', value: 'CARD_TOKENS.surface.level3', usage: 'Outcome button box-shadow ring' },
      { name: 'divider', value: 'CARD_TOKENS.surface.level2', usage: 'Inset top box-shadow separator' },
    ],
    typography: [
      { name: 'title', fontFamily: 'Heebo', fontSize: '12px', fontWeight: '700', lineHeight: '1.5', usage: 'Section title (text-xs font-bold)' },
      { name: 'button-label', fontFamily: 'Heebo', fontSize: '11px', fontWeight: '500', lineHeight: '1.5', usage: 'Outcome button text (text-[11px] font-medium)' },
    ],
    spacing: [
      { name: 'container-padding', value: '12px', usage: 'Outer padding (p-3)' },
      { name: 'section-gap', value: '8px', usage: 'Vertical gap between title and grid (space-y-2)' },
      { name: 'header-gap', value: '8px', usage: 'Gap between header icon and title (gap-2)' },
      { name: 'grid-gap', value: '6px', usage: 'Gap between grid buttons (gap-1.5)' },
      { name: 'button-px', value: '10px', usage: 'Button horizontal padding (px-2.5)' },
      { name: 'button-py', value: '8px', usage: 'Button vertical padding (py-2)' },
    ],
    borderRadius: [
      { name: 'button', value: '4px', usage: 'Outcome button border radius (rounded)' },
    ],
  },

  accessibility: {
    role: 'group (implicit — set of buttons)',
    ariaAttributes: [
      'aria-hidden="true" on CheckCircle2 decorative icon',
      'aria-hidden="true" on optional outcome icons',
    ],
    keyboardNav: [
      'Tab: cycles through outcome buttons (native)',
      'Enter/Space: activates focused button (native)',
    ],
    focusManagement: 'No explicit focus management — relies on native button focus. Consider adding aria-label to section container.',
    screenReaderNotes: 'Buttons announce their label text. No group label or live region for selection confirmation.',
  },

  tasks: [
    {
      id: 'CC-1',
      title: 'Add loading state after selection',
      priority: 'P0',
      estimate: 'S',
      description: 'Disable all buttons and show a spinner on the selected outcome while the closure API processes. Prevents double submission.',
      files: [{ path: 'src/primitives/CardClosure.tsx', action: 'modify', description: 'Add selectedId state, disable buttons when set, show spinner on active button' }],
      acceptanceCriteria: [
        'Clicking an outcome disables all buttons immediately',
        'Selected button shows a loading spinner',
        'Buttons re-enable if onSelect rejects or parent resets',
      ],
    },
    {
      id: 'CC-2',
      title: 'Add error feedback on failed closure',
      priority: 'P1',
      estimate: 'S',
      description: 'If onSelect returns a rejected promise, show an error state on the section (e.g. red border flash or error text).',
      files: [{ path: 'src/primitives/CardClosure.tsx', action: 'modify', description: 'Wrap onSelect in try/catch, set error state on failure' }],
      acceptanceCriteria: [
        'Failed closure shows visible error indicator',
        'Error auto-clears after 3 seconds',
        'Buttons become interactive again after error',
      ],
      dependencies: ['CC-1'],
    },
    {
      id: 'CC-3',
      title: 'Add confirmation step before closure',
      priority: 'P1',
      estimate: 'M',
      description: 'Closing an incident is irreversible — add an optional confirm prop that shows a confirmation prompt before calling onSelect.',
      files: [{ path: 'src/primitives/CardClosure.tsx', action: 'modify', description: 'Add confirm?: boolean prop and inline confirmation UI' }],
      acceptanceCriteria: [
        'When confirm=true, clicking an outcome shows "Are you sure?" prompt',
        'Confirming calls onSelect, cancelling returns to button grid',
        'Escape key closes the confirmation prompt',
      ],
    },
    {
      id: 'CC-4',
      title: 'Add aria-label to section container',
      priority: 'P2',
      estimate: 'S',
      description: 'Wrap outcome buttons in a group with an accessible label so screen readers announce the section purpose.',
      files: [{ path: 'src/primitives/CardClosure.tsx', action: 'modify', description: 'Add role="group" and aria-label to outer div' }],
      acceptanceCriteria: [
        'Screen reader announces "סגירת אירוע" when entering the section',
        'role="group" is present on the outer container',
      ],
    },
  ],

  hardcodedData: [
    {
      current: "text-[11px] — arbitrary Tailwind value for button font size",
      replaceWith: 'Design token or Tailwind config extension (e.g. text-2xs)',
      location: 'CardClosure.tsx line 40',
    },
    {
      current: "Inline boxShadow styles using CARD_TOKENS.surface values",
      replaceWith: 'Tailwind ring utilities or CSS custom properties',
      location: 'CardClosure.tsx lines 27, 41',
    },
  ],

  notes: [
    'RTL layout via dir="rtl" on the container — buttons text-align right with flex items-center.',
    'stopPropagation on button clicks prevents the parent card from toggling when selecting a closure reason.',
    'CheckCircle2 icon at 14px serves as a visual section marker — purely decorative.',
    'The 2-column grid layout works well for 4-6 outcomes but may need scrolling for larger sets.',
  ],
};
