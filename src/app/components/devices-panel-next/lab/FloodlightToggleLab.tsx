/**
 * `/devices-lab` floodlight-toggle study — the chosen icon-led segmented
 * direction (Power off / glowing Sun on) on a solid filled surface with
 * square (0) corners, shown at the default size and a compact size. Both
 * share the same animated indicator that slides between Off and On, amber
 * while lit.
 *
 * The compact control also ships in CardLayoutLab on `lightProjector` rows
 * (see `FloodlightSegmentedToggle.tsx`). Sandbox-only for production.
 */

import { useState, type ReactNode } from 'react';
import {
  FloodlightSegmentedCompact,
  FloodlightSegmentedDefault,
  type FloodlightSegmentedProps,
} from '../../devices-panel/controls/FloodlightSegmentedToggle';

function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-xs font-medium text-white/80">{title}</div>
        {note && <div className="mt-0.5 text-xs-plus leading-snug text-white/40">{note}</div>}
      </div>
      <div className="flex flex-wrap items-center gap-x-10 gap-y-6 rounded-md border border-white/[0.06] bg-surface-2 p-4">
        {children}
      </div>
    </div>
  );
}

function Cell({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2">
      {children}
      <span className="text-2xs leading-tight text-white/45">{caption}</span>
    </div>
  );
}

type Variant = (props: FloodlightSegmentedProps) => ReactNode;

const OPTIONS: { id: string; title: string; note: string; render: Variant }[] = [
  {
    id: 'icon-filled-sharp',
    title: 'Icon-led — filled · 0 radius',
    note: 'The chosen form: a power symbol off, a glowing sun on. Solid filled surface, square corners, no outline ring.',
    render: (p) => <FloodlightSegmentedDefault {...p} />,
  },
  {
    id: 'icon-filled-sharp-compact',
    title: 'Icon-led — filled · 0 radius · compact',
    note: 'The same control, tightened: 1px padding/insets, smaller glyphs and a denser segment box (less padding, smaller text). Used in CardLayoutLab.',
    render: (p) => <FloodlightSegmentedCompact {...p} />,
  },
];

function OptionRow({ render }: { render: Variant }) {
  const [aOn, setAOn] = useState(false);
  const [bOn, setBOn] = useState(true);
  return (
    <>
      <Cell caption="Default off">{render({ on: aOn, onToggle: () => setAOn((v) => !v) })}</Cell>
      <Cell caption="Default on">{render({ on: bOn, onToggle: () => setBOn((v) => !v) })}</Cell>
    </>
  );
}

export function FloodlightToggleLab() {
  return (
    <section className="flex flex-col gap-8">
      <div>
        <h2 className="text-sm font-semibold text-white/90">Floodlight toggle — filled · 0 radius</h2>
        <p className="mt-1 text-xs text-white/45">
          The chosen icon-led direction (Power off / glowing Sun on) on a solid filled surface with square corners,
          shown at the default size and a compact size. The indicator slides between states (transform-only,
          reduced-motion safe) with a full set of interaction states. Click either segment; use the LTR/RTL switch
          above to verify the slide tracks the active side both ways.
        </p>
      </div>

      {OPTIONS.map((opt) => (
        <Group key={opt.id} title={opt.title} note={opt.note}>
          <OptionRow render={opt.render} />
        </Group>
      ))}

      <Group title="Disabled" note="The chosen form when the device is offline — non-interactive and dimmed, in both states.">
        <Cell caption="Off · disabled">
          <FloodlightSegmentedDefault on={false} onToggle={() => {}} disabled />
        </Cell>
        <Cell caption="On · disabled">
          <FloodlightSegmentedDefault on onToggle={() => {}} disabled />
        </Cell>
      </Group>
    </section>
  );
}
