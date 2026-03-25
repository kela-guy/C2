import type { Meta, StoryObj } from '@storybook/react-vite';
import { MissionPhaseChip } from './MissionPhaseChip';
import { SpecDocs } from '@/specs/SpecDocs';
import { spec } from './MissionPhaseChip.spec';

const meta = {
  title: 'Primitives/MissionPhaseChip',
  component: MissionPhaseChip,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    phase: {
      control: 'select',
      options: ['planning', 'active', 'paused', 'override', 'completed'],
      description: 'Mission phase state',
    },
  },
} satisfies Meta<typeof MissionPhaseChip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Spec: StoryObj = {
  render: () => <SpecDocs spec={spec} />,
  parameters: { controls: { disable: true }, actions: { disable: true }, layout: 'fullscreen', a11y: { test: 'todo' }, specDocs: true },
};

export const Default: Story = {
  args: { phase: 'active' },
};

export const AllPhases: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <MissionPhaseChip phase="planning" />
      <MissionPhaseChip phase="active" />
      <MissionPhaseChip phase="paused" />
      <MissionPhaseChip phase="override" />
      <MissionPhaseChip phase="completed" />
    </div>
  ),
};
