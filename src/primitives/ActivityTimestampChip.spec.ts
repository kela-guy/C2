import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'ActivityTimestampChip',
  filePath: 'src/primitives/ActivityTimestampChip.tsx',
  purpose:
    'Combined activity + timestamp element for the card-header status slot, styled from the ui/badge badgeVariants cva (ghost, flattened to dot + text). Merges the previously redundant timestamp subtitle and the textual activity StatusChip into one scannable element: a status-colored dot followed by the timestamp text. The activity status (active / recently active / timed out / handled / dismissed) is conveyed by the dot color; the status word is kept in the aria-label and the hover tooltip surfaces the relative time since detection.',
  location: 'Primitives',
  status: 'prototype',

  props: [
    { name: 'timestamp', type: 'string', required: false, description: 'Timestamp text to display (e.g. "00:14:10"). Falls back to the status label when absent.' },
    { name: 'color', type: "'green' | 'red' | 'orange' | 'gray'", required: true, description: 'Semantic color mapping to the activity status (reuses STATUS_CHIP_COLORS).' },
    { name: 'statusLabel', type: 'string', required: true, description: 'Localized status word (e.g. "פעיל לאחרונה") surfaced via aria-label so color is never the sole carrier of meaning.' },
    { name: 'hoverLabel', type: 'string', required: false, description: 'Optional tooltip text — used to surface the relative "time since detection" (e.g. "לפני פחות מדקה"). Falls back to statusLabel when absent.' },
    { name: 'className', type: 'string', required: false, description: 'Additional CSS classes for the trigger wrapper.' },
  ],

  states: [
    {
      name: 'default',
      trigger: 'Renders with timestamp + color + statusLabel',
      description: 'A 6px status-colored dot followed by the timestamp in white mono medium text.',
      implementedInPrototype: true,
      storyProps: { timestamp: '00:14:10', color: 'orange', statusLabel: 'פעיל לאחרונה' },
      visualNotes: 'flex items-center gap-1.5; dot = size-1.5 rounded-full backgroundColor STATUS_CHIP_COLORS[color].dot; text text-xs font-mono font-medium text-white',
    },
    {
      name: 'missing timestamp fallback',
      trigger: 'timestamp is empty / undefined',
      description: 'Falls back to rendering the status label as the visible text.',
      implementedInPrototype: true,
    },
  ],

  interactions: [
    {
      trigger: 'hover / focus',
      element: 'Chip or dot trigger',
      result: 'Tooltip surfaces the relative "time since detection" (hoverLabel, e.g. "לפני פחות מדקה"), or the status word when hoverLabel is absent. aria-label combines the status word and the relative time.',
      keyboard: 'Focusable trigger reveals the tooltip; status + elapsed time announced via aria-label.',
    },
  ],

  tokens: {
    colors: [
      { name: 'green', value: 'STATUS_CHIP_COLORS.green', usage: 'active / handled' },
      { name: 'orange', value: 'STATUS_CHIP_COLORS.orange', usage: 'recently active / warning' },
      { name: 'gray', value: 'STATUS_CHIP_COLORS.gray', usage: 'timed out / dismissed' },
      { name: 'red', value: 'STATUS_CHIP_COLORS.red', usage: 'threat / critical' },
    ],
    typography: [
      { name: 'timestamp', fontFamily: 'monospace', fontSize: '12px', fontWeight: '500', lineHeight: '1', usage: 'Timestamp text (text-xs font-mono font-medium text-white)' },
    ],
    spacing: [
      { name: 'dot-gap', value: '6px', usage: 'Gap between dot and timestamp (gap-1.5)' },
    ],
    borderRadius: [
      { name: 'dot-radius', value: 'full', usage: 'Status dot (rounded-full)' },
    ],
  },

  accessibility: {
    role: 'status',
    ariaAttributes: ['role="status" on trigger', 'aria-label = statusLabel (status word)', 'aria-hidden="true" on the decorative dot'],
    screenReaderNotes:
      'Color encodes the activity status visually; the status word is provided via aria-label and tooltip so it remains available to assistive tech and is not color-only.',
  },

  tasks: [],

  notes: [
    'Replaces the timestamp subtitle (removed from buildHeader in useCardSlots for non-mission targets) plus the textual activity StatusChip.',
    'Finalized as the dot treatment (status-colored dot + timestamp); the earlier chip/pill comparison variant was removed.',
    'Reuses STATUS_CHIP_COLORS (.dot hex) so the status→color mapping stays identical to StatusChip.',
  ],
};
