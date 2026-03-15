import type { Meta, StoryObj } from '@storybook/react';
import { CardSensors } from './CardSensors';

const meta: Meta<typeof CardSensors> = {
  title: 'TargetCard/Slots/CardSensors',
  component: CardSensors,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 380, background: '#141414', padding: 8, borderRadius: 8 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CardSensors>;

export const Default: Story = {
  args: {
    sensors: [
      { id: 'cam-north-01', typeLabel: 'Pixelsight', distanceLabel: '450m' },
      { id: 'regulus-02', typeLabel: 'Regulus', distanceLabel: '1.2km' },
      { id: 'radar-main', typeLabel: 'Radar', distanceLabel: '800m' },
    ],
  },
};

export const SingleSensor: Story = {
  args: {
    sensors: [
      { id: 'cam-01', typeLabel: 'PTZ Camera', distanceLabel: '200m' },
    ],
    label: 'חיישנים תורמים',
  },
};
