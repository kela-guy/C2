/**
 * Co-located doc module for the SplitActionButton primitive. Meta lives in
 * `registry/manifest.json`.
 */
import { Radio, Crosshair, Zap } from '@/lib/icons/central';
import { SplitActionButton } from '@/primitives';
import splitActionButtonSrc from '@/primitives/SplitActionButton.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

export const splitActionDoc: ComponentDocModule = {
  id: 'split-action',
  source: splitActionButtonSrc,
  usage: `import { SplitActionButton } from "@/primitives"

<SplitActionButton
  label="הפעל ג׳אמר"
  icon={Zap}
  variant="danger"
  onClick={onJam}
  dropdownItems={[
    { id: "rf", label: "ג׳אמר RF", icon: Radio, onClick: selectRf },
    { id: "gps", label: "ג׳אמר GPS", icon: Crosshair, onClick: selectGps },
  ]}
/>`,
  examples: [
    {
      id: 'default',
      title: 'Primary action + dropdown',
      description: 'Left segment fires the primary action; the chevron opens effector sub-options. RTL-aware.',
      render: () => (
        <SplitActionButton
          label="הפעל ג׳אמר"
          icon={Zap}
          variant="danger"
          onClick={() => {}}
          dropdownItems={[
            { id: 'rf', label: 'ג׳אמר RF', icon: Radio, onClick: () => {} },
            { id: 'gps', label: 'ג׳אמר GPS', icon: Crosshair, onClick: () => {} },
          ]}
        />
      ),
    },
  ],
  edgeCases: [
    {
      id: 'long-label',
      label: 'Long primary label',
      note: 'The primary segment is min-w-0 + overflow-hidden, so a long label truncates while the chevron segment keeps its fixed hit target.',
      render: () => (
        <div className="w-[200px]">
          <SplitActionButton
            label="הפעל ג׳אמר רב-תדרי מיידי"
            icon={Zap}
            variant="danger"
            onClick={() => {}}
            dropdownItems={[{ id: 'rf', label: 'ג׳אמר RF', icon: Radio, onClick: () => {} }]}
          />
        </div>
      ),
    },
    {
      id: 'single-item',
      label: 'Single dropdown item',
      note: 'Still renders the chevron + menu even with one option. Open it to confirm the popper anchors to the full shell width.',
      render: () => (
        <SplitActionButton
          label="עקוב"
          icon={Crosshair}
          onClick={() => {}}
          dropdownItems={[{ id: 'lock', label: 'נעל מטרה', icon: Crosshair, onClick: () => {} }]}
        />
      ),
    },
    {
      id: 'many-items',
      label: 'Many dropdown items',
      note: 'Open the menu: a long item list extends downward. Items wrap text; keep the menu scoped or group items for long lists.',
      render: () => (
        <SplitActionButton
          label="הפעל ג׳אמר"
          icon={Zap}
          variant="danger"
          onClick={() => {}}
          dropdownItems={[
            { id: 'rf', label: 'ג׳אמר RF', icon: Radio, onClick: () => {} },
            { id: 'gps', label: 'ג׳אמר GPS', icon: Crosshair, onClick: () => {} },
            { id: 'gnss', label: 'ג׳אמר GNSS', icon: Radio, onClick: () => {} },
            { id: 'wifi', label: 'ג׳אמר Wi-Fi', icon: Radio, onClick: () => {} },
            { id: 'cell', label: 'ג׳אמר סלולרי', icon: Radio, onClick: () => {} },
            { id: 'all', label: 'ג׳אמר רב-תדרי', icon: Zap, onClick: () => {} },
          ]}
        />
      ),
    },
    {
      id: 'disabled',
      label: 'Disabled',
      note: 'Both segments dim to 45% and drop pointer events; the dropdown trigger is removed from the tab order.',
      render: () => (
        <SplitActionButton
          label="הפעל ג׳אמר"
          icon={Zap}
          variant="danger"
          disabled
          onClick={() => {}}
          dropdownItems={[{ id: 'rf', label: 'ג׳אמר RF', icon: Radio, onClick: () => {} }]}
        />
      ),
    },
  ],
};
