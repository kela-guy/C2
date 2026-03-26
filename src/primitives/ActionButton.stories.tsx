import type { Meta, StoryObj } from '@storybook/react-vite';
import { ActionButton } from './ActionButton';
import { Eye, Crosshair, X, Rocket } from 'lucide-react';
import { SpecDocs } from '@/specs/SpecDocs';
import { spec } from './ActionButton.spec';

const meta = {
  title: 'Primitives/ActionButton',
  component: ActionButton,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['fill', 'ghost', 'danger', 'warning'],
      description: 'Visual style variant',
      table: { defaultValue: { summary: 'fill' } },
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
      description: 'Button size',
      table: { defaultValue: { summary: 'md' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
    label: { control: 'text' },
  },
} satisfies Meta<typeof ActionButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Spec: StoryObj = {
  render: () => <SpecDocs spec={spec} />,
  parameters: { controls: { disable: true }, actions: { disable: true }, layout: 'fullscreen', a11y: { test: 'todo' }, specDocs: true },
};

export const Default: Story = {
  args: { label: 'חקירה', variant: 'fill', size: 'md', disabled: false, icon: Eye },
};

export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-3" style={{ width: 400 }}>
      <ActionButton label="ראשי" variant="fill" icon={Eye} />
      <ActionButton label="שקוף" variant="ghost" icon={X} />
      <ActionButton label="סכנה" variant="danger" icon={Crosshair} />
      <ActionButton label="אזהרה" variant="warning" icon={Rocket} />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-3" style={{ width: 200 }}>
      <ActionButton label="קטן" size="sm" icon={Eye} />
      <ActionButton label="בינוני" size="md" icon={Eye} />
      <ActionButton label="גדול" size="lg" icon={Eye} />
    </div>
  ),
};

export const Disabled: Story = {
  args: { label: 'מושבת', disabled: true, icon: X },
};
