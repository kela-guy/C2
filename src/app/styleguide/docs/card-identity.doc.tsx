/**
 * Co-located doc module for the CardIdentity block — identity rows with a
 * per-row copy affordance. Meta + anatomy live in `registry/manifest.json`.
 */
import { CardIdentity, type IdentityRow } from '@/primitives';
import cardIdentitySrc from '@/primitives/CardIdentity.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

const ROWS: IdentityRow[] = [
  { label: 'שם', value: 'DJI Mavic 3' },
  { label: 'דגם', value: 'Mavic 3 Pro' },
  { label: 'מס׳ סידורי', value: '4X92-AA17-0042' },
];

export const cardIdentityDoc: ComponentDocModule = {
  id: 'card-identity',
  source: cardIdentitySrc,
  usage: `import { CardIdentity, type IdentityRow } from "@/primitives"

const rows: IdentityRow[] = [
  { label: "שם", value: "DJI Mavic 3" },
  { label: "דגם", value: "Mavic 3 Pro" },
  { label: "מס׳ סידורי", value: "4X92-AA17-0042" },
]

<CardIdentity rows={rows} title="מידע כללי" copyLabel="העתק" copiedLabel="הועתק" defaultOpen />`,
  examples: [
    {
      id: 'default',
      title: 'Default',
      description:
        'The 2-col grid mirrors CardDetails so a TargetCard\'s sections share one layout rhythm. Hover a row to reveal its CopyButton — the value dissolves under a gradient fade instead of truncating abruptly.',
      code: `<CardIdentity
  rows={rows}
  title="מידע כללי"
  copyLabel="העתק"
  copiedLabel="הועתק"
  defaultOpen
/>`,
      render: () => (
        <div className="w-[320px]">
          <CardIdentity rows={ROWS} title="מידע כללי" copyLabel="העתק" copiedLabel="הועתק" defaultOpen />
        </div>
      ),
    },
    {
      id: 'collapsed',
      title: 'Collapsed',
      description: 'Resting state inside a card — identity comes before telemetry in operator scanning order ("what is this?" before "where is it?").',
      code: `<CardIdentity rows={rows} title="מידע כללי" copyLabel="העתק" copiedLabel="הועתק" />`,
      render: () => (
        <div className="w-[320px]">
          <CardIdentity rows={ROWS} title="מידע כללי" copyLabel="העתק" copiedLabel="הועתק" />
        </div>
      ),
    },
  ],
  edgeCases: [
    {
      id: 'long-id',
      label: 'Long identifier',
      note: 'break-all is the last-resort safety net; the copy overlay still copies the full value regardless of visual wrapping.',
      render: () => (
        <div className="w-[280px]">
          <CardIdentity
            rows={[{ label: 'מזהה', value: '4X92-AA17-0042-BB83-CC71-DD05-EE96' }]}
            title="מידע כללי"
            copyLabel="העתק"
            copiedLabel="הועתק"
            defaultOpen
          />
        </div>
      ),
    },
    {
      id: 'empty',
      label: 'Empty rows',
      note: 'With rows=[] the section renders nothing at all.',
      render: () => (
        <div className="flex w-[240px] items-center justify-center text-xs text-slate-9">
          <CardIdentity rows={[]} copyLabel="העתק" copiedLabel="הועתק" />
          <span>rows=[] → renders null</span>
        </div>
      ),
    },
  ],
};
