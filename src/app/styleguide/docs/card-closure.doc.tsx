/**
 * Co-located doc module for the CardClosure block — the outcome-selection
 * grid for closing a detection event. Meta lives in `registry/manifest.json`.
 */
import { CheckCircle2, Ban, Zap, EyeOff } from '@/lib/icons/central';
import { CardClosure, type ClosureOutcome } from '@/primitives';
import cardClosureSrc from '@/primitives/CardClosure.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

const OUTCOMES: ClosureOutcome[] = [
  { id: 'neutralized', label: 'נוטרל', icon: Zap },
  { id: 'left-area', label: 'עזב את הגזרה', icon: Ban },
  { id: 'false-alarm', label: 'התרעת שווא', icon: EyeOff },
  { id: 'handled', label: 'טופל ידנית', icon: CheckCircle2 },
];

export const cardClosureDoc: ComponentDocModule = {
  id: 'card-closure',
  source: cardClosureSrc,
  usage: `import { CardClosure, type ClosureOutcome } from "@/primitives"
import { Zap, Ban } from "@/lib/icons/central"

const outcomes: ClosureOutcome[] = [
  { id: "neutralized", label: "נוטרל", icon: Zap },
  { id: "left-area", label: "עזב את הגזרה", icon: Ban },
]

<CardClosure title="סגירת אירוע — בחר סיבה" outcomes={outcomes} onSelect={closeEvent} />`,
  examples: [
    {
      id: 'default',
      title: 'Default',
      description:
        'A 2-col grid of quiet outcome buttons under a titled strip. Selecting an outcome is the terminal action of a detection card — the card then flips to its completed state.',
      code: `<CardClosure
  title="סגירת אירוע — בחר סיבה"
  outcomes={outcomes}
  onSelect={(id) => closeEvent(id)}
/>`,
      render: () => (
        <div className="w-[320px] rounded bg-surface-2">
          <CardClosure title="סגירת אירוע — בחר סיבה" outcomes={OUTCOMES} onSelect={() => {}} />
        </div>
      ),
    },
    {
      id: 'two-outcomes',
      title: 'Two outcomes',
      description: 'The grid keeps two columns; a pair of outcomes fills one row.',
      code: `<CardClosure outcomes={outcomes.slice(0, 2)} onSelect={closeEvent} />`,
      render: () => (
        <div className="w-[320px] rounded bg-surface-2">
          <CardClosure title="סגירת אירוע" outcomes={OUTCOMES.slice(0, 2)} onSelect={() => {}} />
        </div>
      ),
    },
  ],
  edgeCases: [
    {
      id: 'odd-count',
      label: 'Odd outcome count',
      note: 'An odd list leaves the final cell empty — acceptable; keep outcome sets short and mutually exclusive.',
      render: () => (
        <div className="w-[280px] rounded bg-surface-2">
          <CardClosure title="סגירת אירוע" outcomes={OUTCOMES.slice(0, 3)} onSelect={() => {}} />
        </div>
      ),
    },
    {
      id: 'empty',
      label: 'Empty outcomes',
      note: 'With outcomes=[] the block renders nothing at all.',
      render: () => (
        <div className="flex w-[240px] items-center justify-center text-xs text-slate-9">
          <CardClosure outcomes={[]} onSelect={() => {}} />
          <span>outcomes=[] → renders null</span>
        </div>
      ),
    },
  ],
};
