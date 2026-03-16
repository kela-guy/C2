import type { Meta, StoryObj } from '@storybook/react';
import { fn, expect } from 'storybook/test';
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
  play: async ({ canvas }) => {
    const buttons = canvas.getAllByRole('button');
    await expect(buttons).toHaveLength(3);

    for (const btn of buttons) {
      await expect(btn).toHaveAttribute('aria-label');
    }
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

export const KeyboardClick: Story = {
  name: 'Keyboard — Sensor Click',
  args: {
    sensors: [
      { id: 'cam-01', typeLabel: 'Pixelsight', distanceLabel: '450m' },
    ],
    onSensorClick: fn(),
  },
  play: async ({ args, canvas, userEvent }) => {
    const button = canvas.getByRole('button');
    await expect(button.tagName).toBe('BUTTON');

    button.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onSensorClick).toHaveBeenCalledWith('cam-01');
  },
};
