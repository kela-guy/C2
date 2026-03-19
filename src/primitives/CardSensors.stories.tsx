import type { Meta, StoryObj } from '@storybook/react';
import { fn, expect } from 'storybook/test';
import { CardSensors } from './CardSensors';

/** Module-scoped so Chromatic/build never drops a function-only arg from `args`. */
const keyboardSensorClickSpy = fn();

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
    await expect(canvas.getByLabelText('Pixelsight — cam-north-01')).toBeVisible();
    await expect(canvas.getByLabelText('Regulus — regulus-02')).toBeVisible();
    await expect(canvas.getByLabelText('Radar — radar-main')).toBeVisible();
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
  },
  render: (args) => <CardSensors {...args} onSensorClick={keyboardSensorClickSpy} />,
  play: async ({ canvas, userEvent }) => {
    keyboardSensorClickSpy.mockClear();

    const row = canvas.getByLabelText('Pixelsight — cam-01');
    await expect(row.tagName).toBe('BUTTON');

    row.focus();
    await userEvent.keyboard('{Enter}');
    await expect(keyboardSensorClickSpy).toHaveBeenCalledWith('cam-01');
  },
};
