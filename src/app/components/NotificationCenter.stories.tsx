import type { Meta, StoryObj } from '@storybook/react-vite';
import { SpecDocs } from '@/specs/SpecDocs';
import { spec } from './NotificationCenter.spec';
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

export const Spec: StoryObj = {
  render: () => <SpecDocs spec={spec} />,
  parameters: { controls: { disable: true }, actions: { disable: true }, layout: 'fullscreen', a11y: { test: 'todo' }, specDocs: true },
};

export const Default: Story = {
  name: 'Bell Trigger',
};
