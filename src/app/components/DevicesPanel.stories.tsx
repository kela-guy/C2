import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import { DevicesPanel } from './DevicesPanel';

const meta: Meta<typeof DevicesPanel> = {
  title: 'CUAS/DevicesPanel',
  component: DevicesPanel,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', width: 400, height: 700, background: '#0b0d10', overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    a11y: { test: 'todo' },
  },
  args: {
    open: true,
    onClose: fn(),
    onFlyTo: fn(),
    onDeviceHover: fn(),
    onJamActivate: fn(),
    noTransition: true,
  },
};

export default meta;
type Story = StoryObj<typeof DevicesPanel>;

export const Default: Story = {
  name: 'All Devices',
};

export const Closed: Story = {
  name: 'Panel Closed',
  args: {
    open: false,
  },
};
