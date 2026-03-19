import type { Meta, StoryObj } from '@storybook/react';
import { NotificationCenter } from './NotificationCenter';

const meta: Meta<typeof NotificationCenter> = {
  title: 'CUAS/NotificationCenter',
  component: NotificationCenter,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NotificationCenter>;

export const Default: Story = {
  name: 'Bell Trigger',
};
