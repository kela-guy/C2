import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { MissionTimeline } from './MissionTimeline';

const STEPS = ['נעילת מטרה', 'אישור ירי', 'שיגור', 'מעקב', 'אימות פגיעה'];

const meta = {
  title: 'Primitives/MissionTimeline',
  component: MissionTimeline,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    progress: { control: { type: 'range', min: 0, max: 5 }, description: 'Current step index' },
    missionType: {
      control: 'select',
      options: ['attack', 'jamming', 'intercept', 'surveillance'],
      description: 'Mission type',
    },
  },
} satisfies Meta<typeof MissionTimeline>;
export default meta;
type Story = StoryObj<typeof meta>;

export const InProgress: Story = {
  args: { steps: STEPS, progress: 2, missionType: 'attack', onCancel: () => {}, onComplete: () => {} },
  render: (args) => (
    <div style={{ width: 340 }}>
      <MissionTimeline {...args} />
    </div>
  ),
  play: async ({ canvas }) => {
    const list = canvas.getByRole('list');
    await expect(list.tagName).toBe('OL');

    const items = canvas.getAllByRole('listitem');
    await expect(items.length).toBe(STEPS.length);
  },
};

export const WaitingConfirmation: Story = {
  render: () => (
    <div style={{ width: 340 }}>
      <MissionTimeline
        steps={STEPS}
        progress={5}
        missionType="attack"
        onCancel={() => {}}
        onComplete={() => {}}
        onSendDroneVerification={() => {}}
      />
    </div>
  ),
};

export const DroneVerifying: Story = {
  render: () => (
    <div style={{ width: 340 }}>
      <MissionTimeline
        steps={STEPS}
        progress={5}
        missionType="attack"
        isDroneVerifying
        onCancel={() => {}}
        onComplete={() => {}}
      />
    </div>
  ),
};
