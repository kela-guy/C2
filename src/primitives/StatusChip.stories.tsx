import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { StatusChip } from './StatusChip';
import { SpecDocs } from '@/specs/SpecDocs';
import { spec } from './StatusChip.spec';

const meta = {
  title: 'Primitives/StatusChip',
  component: StatusChip,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    color: {
      control: 'radio',
      options: ['green', 'gray', 'red', 'orange'],
      description: 'Semantic color variant',
      table: { defaultValue: { summary: 'green' } },
    },
    label: {
      control: 'text',
      description: 'Display text',
    },
  },
} satisfies Meta<typeof StatusChip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Spec: StoryObj = {
  render: () => <SpecDocs spec={spec} />,
  parameters: { controls: { disable: true }, actions: { disable: true }, layout: 'fullscreen', a11y: { test: 'todo' }, specDocs: true },
};

export const Default: Story = {
  args: { label: 'איתור', color: 'green' },
  play: async ({ canvas }) => {
    const chip = canvas.getByRole('status');
    await expect(chip).toBeInTheDocument();
    await expect(chip).toHaveTextContent('איתור');
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <StatusChip label="איתור" color="green" />
      <StatusChip label="לא ידוע" color="gray" />
      <StatusChip label="איום" color="red" />
      <StatusChip label="חשד" color="orange" />
    </div>
  ),
};
