/**
 * Co-located doc module for the CardFooterDock block — the recessed action
 * dock pinned to a TargetCard's bottom edge. Meta lives in
 * `registry/manifest.json`.
 */
import { Camera, CheckCircle2, MapPin } from '@/lib/icons/central';
import { CardFooterDock, type FooterDockAction } from '@/primitives';
import cardFooterDockSrc from '@/primitives/CardFooterDock.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

const noop = () => {};

const ACTIONS: FooterDockAction[] = [
  { id: 'camera', label: 'מצלמה', icon: Camera, onClick: noop },
  { id: 'fly-to', label: 'מיקום', icon: MapPin, onClick: noop },
  { id: 'close', label: 'סגירה', icon: CheckCircle2, onClick: noop },
];

export const cardFooterDockDoc: ComponentDocModule = {
  id: 'card-footer-dock',
  source: cardFooterDockSrc,
  usage: `import { CardFooterDock, type FooterDockAction } from "@/primitives"
import { Camera, MapPin } from "@/lib/icons/central"

const actions: FooterDockAction[] = [
  { id: "camera", label: "מצלמה", icon: Camera, onClick: pointCamera },
  { id: "fly-to", label: "מיקום", icon: MapPin, onClick: flyTo },
]

<TargetCard footer={<CardFooterDock actions={actions} />} …>…</TargetCard>`,
  examples: [
    {
      id: 'default',
      title: 'Default',
      description:
        'Equal-width quiet buttons on an inset-shadow strip that reads as recessed below the card body — the home for secondary whole-card actions.',
      code: `<CardFooterDock actions={actions} />`,
      render: () => (
        <div className="w-[320px] rounded-b-lg bg-surface-2">
          <CardFooterDock actions={ACTIONS} />
        </div>
      ),
    },
    {
      id: 'states',
      title: 'Disabled + loading',
      description: 'disabled dims a button to 40% and blocks pointer events; loading swaps the icon for a spinner while keeping the label.',
      code: `<CardFooterDock actions={[
  { id: "camera", label: "מצלמה", icon: Camera, onClick: noop, disabled: true },
  { id: "fly-to", label: "מיקום", icon: MapPin, onClick: noop, loading: true },
]} />`,
      render: () => (
        <div className="w-[320px] rounded-b-lg bg-surface-2">
          <CardFooterDock
            actions={[
              { id: 'camera', label: 'מצלמה', icon: Camera, onClick: noop, disabled: true },
              { id: 'fly-to', label: 'מיקום', icon: MapPin, onClick: noop, loading: true },
            ]}
          />
        </div>
      ),
    },
  ],
  edgeCases: [
    {
      id: 'single',
      label: 'Single action',
      note: 'flex-1 stretches a lone action across the full dock width.',
      render: () => (
        <div className="w-[260px] rounded-b-lg bg-surface-2">
          <CardFooterDock actions={[{ id: 'close', label: 'סגירת אירוע', icon: CheckCircle2, onClick: noop }]} />
        </div>
      ),
    },
    {
      id: 'empty',
      label: 'Empty actions',
      note: 'With actions=[] the dock renders nothing at all.',
      render: () => (
        <div className="flex w-[240px] items-center justify-center text-xs text-slate-9">
          <CardFooterDock actions={[]} />
          <span>actions=[] → renders null</span>
        </div>
      ),
    },
  ],
};
