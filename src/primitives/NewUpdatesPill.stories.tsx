import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AnimatePresence } from 'framer-motion';
import { NewUpdatesPill } from './NewUpdatesPill';
import { SpecDocs } from '@/specs/SpecDocs';
import { spec } from './NewUpdatesPill.spec';

const meta = {
  title: 'Primitives/NewUpdatesPill',
  component: NewUpdatesPill,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark', values: [{ name: 'dark', value: '#141414' }] },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 40 }}>
        <AnimatePresence>
          <Story />
        </AnimatePresence>
      </div>
    ),
  ],
} satisfies Meta<typeof NewUpdatesPill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Spec: StoryObj = {
  render: () => <SpecDocs spec={spec} />,
  parameters: { controls: { disable: true }, actions: { disable: true }, layout: 'fullscreen', a11y: { test: 'todo' }, specDocs: true },
};

export const Default: Story = {
  args: {
    count: 5,
    entityTypes: ['uav', 'missile'],
    onClick: fn(),
  },
};

export const SingleType: Story = {
  name: 'Single Entity Type',
  args: {
    count: 3,
    entityTypes: ['uav'],
    onClick: fn(),
  },
};

export const MultipleTypes: Story = {
  name: 'Multiple Entity Types',
  args: {
    count: 12,
    entityTypes: ['uav', 'missile', 'aircraft', 'naval'],
    onClick: fn(),
  },
};

export const LargeCount: Story = {
  name: 'Large Count',
  args: {
    count: 147,
    entityTypes: ['uav', 'unknown'],
    onClick: fn(),
  },
};
