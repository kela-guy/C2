import type { Meta, StoryObj } from '@storybook/react-vite';
import { TelemetryRow } from './TelemetryRow';
import { MapPin, Ruler, Mountain, Activity, Clock } from 'lucide-react';
import { SpecDocs } from '@/specs/SpecDocs';
import { spec } from './TelemetryRow.spec';

const meta = {
  title: 'Primitives/TelemetryRow',
  component: TelemetryRow,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    label: { control: 'text', description: 'Row label' },
    value: { control: 'text', description: 'Row value' },
  },
} satisfies Meta<typeof TelemetryRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Spec: StoryObj = {
  render: () => <SpecDocs spec={spec} />,
  parameters: { controls: { disable: true }, actions: { disable: true }, layout: 'fullscreen', a11y: { test: 'todo' }, specDocs: true },
};

export const Default: Story = {
  args: { label: 'מיקום', value: '32.0853° N, 34.7818° E', icon: MapPin },
  render: (args) => (
    <div style={{ width: 300 }}>
      <TelemetryRow {...args} />
    </div>
  ),
};

export const AllRows: Story = {
  render: () => (
    <div style={{ width: 300 }} className="flex flex-col">
      <TelemetryRow label="מיקום" value="32.0853° N, 34.7818° E" icon={MapPin} />
      <TelemetryRow label="מרחק" value="2.4 ק״מ" icon={Ruler} />
      <TelemetryRow label="גובה" value="120 מ׳" icon={Mountain} />
      <TelemetryRow label="מהירות" value="45 קמ״ש" icon={Activity} />
      <TelemetryRow label="זמן" value="00:10:22" icon={Clock} />
    </div>
  ),
};
