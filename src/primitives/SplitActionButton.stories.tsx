import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Zap, Eye, Radio, Crosshair, ScanLine } from 'lucide-react';
import { SplitActionButton, type SplitDropdownGroup } from './SplitActionButton';
import { JamWaveIcon } from './MapIcons';
import { SpecDocs } from '@/specs/SpecDocs';
import { spec } from './SplitActionButton.spec';

const defaultDropdownItems = [
  { id: 'option-1', label: 'מעקב מתמשך', icon: Eye, onClick: fn() },
  { id: 'option-2', label: 'שיגור רחפן', icon: Radio, onClick: fn() },
];

const jamDropdownGroups: SplitDropdownGroup[] = [
  {
    label: 'בחירת ג׳אמר',
    items: [
      { id: 'eff-north', label: 'Regulus North (1.2 ק״מ)', checked: true, onClick: fn() },
      { id: 'eff-east', label: 'Regulus East (2.4 ק״מ)', checked: false, onClick: fn() },
      { id: 'eff-south', label: 'Regulus South (3.1 ק״מ)', checked: false, onClick: fn() },
      { id: 'eff-west', label: 'Regulus West', checked: false, disabled: true, onClick: fn() },
    ],
  },
  {
    items: [
      { id: 'mitigate-all', label: 'שיבוש כללי', icon: Radio, onClick: fn() },
      { id: 'mitigate-dir', label: 'שיבוש ממוקד', icon: Crosshair, onClick: fn() },
      { id: 'mitigate-spec', label: 'שיבוש ספקטרום רחב', icon: ScanLine, onClick: fn() },
    ],
  },
];

const meta = {
  title: 'Primitives/SplitActionButton',
  component: SplitActionButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark', values: [{ name: 'dark', value: '#141414' }] },
  },
  decorators: [
    (Story, context) => context.parameters?.specDocs ? (
      <Story />
    ) : (
      <div style={{ width: 280, padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SplitActionButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Spec: StoryObj = {
  render: () => <SpecDocs spec={spec} />,
  parameters: { controls: { disable: true }, actions: { disable: true }, layout: 'fullscreen', a11y: { test: 'todo' }, specDocs: true },
};

export const Default: Story = {
  args: {
    label: 'שיבוש',
    icon: JamWaveIcon,
    variant: 'danger',
    size: 'sm',
    onClick: fn(),
    dropdownItems: defaultDropdownItems,
  },
};

export const AllVariants: Story = {
  name: 'All Variants',
  render: () => {
    const variants = ['fill', 'ghost', 'danger', 'warning'] as const;
    const icons = [Crosshair, Zap, JamWaveIcon, Eye];
    const labels = ['מעקב', 'שיגור', 'שיבוש', 'ניטור'];
    return (
      <div className="flex flex-col gap-3 w-full">
        {variants.map((v, i) => (
          <SplitActionButton
            key={v}
            label={labels[i]}
            icon={icons[i]}
            variant={v}
            onClick={() => {}}
            dropdownItems={defaultDropdownItems}
          />
        ))}
      </div>
    );
  },
};

export const Loading: Story = {
  name: 'Loading State',
  args: {
    label: 'משבש אות...',
    icon: JamWaveIcon,
    variant: 'danger',
    loading: true,
    onClick: fn(),
    dropdownItems: defaultDropdownItems,
  },
};

export const Disabled: Story = {
  name: 'Disabled',
  args: {
    label: 'שיבוש',
    icon: JamWaveIcon,
    variant: 'danger',
    disabled: true,
    onClick: fn(),
    dropdownItems: defaultDropdownItems,
  },
};

export const DisabledNoDim: Story = {
  name: 'Disabled — No Dim (Completed)',
  args: {
    label: 'שובש בהצלחה',
    icon: JamWaveIcon,
    variant: 'danger',
    disabled: true,
    dimDisabledShell: false,
    onClick: fn(),
    dropdownItems: defaultDropdownItems,
  },
};

export const Sizes: Story = {
  name: 'All Sizes',
  render: () => (
    <div className="flex flex-col gap-3 w-full">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <SplitActionButton
          key={size}
          label={`גודל ${size}`}
          icon={Zap}
          variant="fill"
          size={size}
          onClick={() => {}}
          dropdownItems={defaultDropdownItems}
        />
      ))}
    </div>
  ),
};

export const WithBadge: Story = {
  name: 'With Effector Badge',
  args: {
    label: 'שיבוש',
    badge: 'Regulus North',
    icon: JamWaveIcon,
    variant: 'danger',
    onClick: fn(),
    dropdownItems: defaultDropdownItems,
  },
};

export const WithGroupedDropdown: Story = {
  name: 'Grouped Dropdown — Effector + Modes',
  args: {
    label: 'שיבוש',
    badge: 'Regulus North',
    icon: JamWaveIcon,
    variant: 'danger',
    onClick: fn(),
    dropdownItems: defaultDropdownItems,
    dropdownGroups: jamDropdownGroups,
  },
};

export const LoadingWithBadge: Story = {
  name: 'Loading — With Effector',
  args: {
    label: 'משבש אות...',
    badge: 'Regulus North',
    icon: JamWaveIcon,
    variant: 'danger',
    loading: true,
    onClick: fn(),
    dropdownItems: defaultDropdownItems,
    dropdownGroups: jamDropdownGroups,
  },
};
