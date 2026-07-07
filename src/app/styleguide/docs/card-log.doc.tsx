/**
 * Co-located doc module for the CardLog block — the chronological event log
 * of a TargetCard. Meta + anatomy live in `registry/manifest.json`.
 */
import { CardLog, type LogEntry } from '@/primitives';
import cardLogSrc from '@/primitives/CardLog.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

const ENTRIES: LogEntry[] = [
  { time: '00:14:10', label: 'זיהוי ראשוני — מכ״ם' },
  { time: '00:14:32', label: 'אימות מצלמה צפונית' },
  { time: '00:15:01', label: 'סיווג: רחפן מסחרי' },
  { time: '00:16:44', label: 'הפניית מצלמה' },
  { time: '00:18:02', label: 'שיבוש GPS הופעל' },
  { time: '00:19:15', label: 'הכלי החל לסגת' },
  { time: '00:21:40', label: 'אבדן מגע' },
];

export const cardLogDoc: ComponentDocModule = {
  id: 'card-log',
  source: cardLogSrc,
  usage: `import { CardLog, type LogEntry } from "@/primitives"

const entries: LogEntry[] = [
  { time: "00:14:10", label: "זיהוי ראשוני — מכ״ם" },
  { time: "00:14:32", label: "אימות מצלמה צפונית" },
]

<CardLog entries={entries} title="יומן" moreLabel={(n) => \`+\${n} נוספים\`} defaultOpen />`,
  examples: [
    {
      id: 'default',
      title: 'Default',
      description:
        'An AccordionSection titled with the total count. Entries render newest-first; beyond maxVisible (default 5) a "+n more" button expands the rest.',
      code: `<CardLog entries={entries} title="יומן" moreLabel={(n) => \`+\${n} נוספים\`} defaultOpen />`,
      render: () => (
        <div className="w-[320px]">
          <CardLog entries={ENTRIES} title="יומן" moreLabel={(n) => `+${n} נוספים`} defaultOpen />
        </div>
      ),
    },
    {
      id: 'short',
      title: 'Short log',
      description: 'At or under maxVisible entries there is no expand affordance.',
      code: `<CardLog entries={entries.slice(0, 3)} title="יומן" defaultOpen />`,
      render: () => (
        <div className="w-[320px]">
          <CardLog entries={ENTRIES.slice(0, 3)} title="יומן" defaultOpen />
        </div>
      ),
    },
  ],
  edgeCases: [
    {
      id: 'long-label',
      label: 'Long entry label',
      note: 'The label column is min-w-0 — long event text wraps while the monospace timestamp stays pinned at the row end.',
      render: () => (
        <div className="w-[260px]">
          <CardLog
            entries={[{ time: '00:14:10', label: 'אירוע עם תיאור ארוך במיוחד שנפרס על פני מספר שורות בתוך הכרטיס' }]}
            title="יומן"
            defaultOpen
          />
        </div>
      ),
    },
    {
      id: 'empty',
      label: 'Empty log',
      note: 'With entries=[] the block renders nothing at all.',
      render: () => (
        <div className="flex w-[240px] items-center justify-center text-xs text-slate-9">
          <CardLog entries={[]} />
          <span>entries=[] → renders null</span>
        </div>
      ),
    },
  ],
};
