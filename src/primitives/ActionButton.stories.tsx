import type { Meta, StoryObj } from '@storybook/react-vite';
import { ActionButton } from './ActionButton';
import { Eye, Crosshair, X, Check, Radio, Rocket } from 'lucide-react';

const meta = {
  title: 'Primitives/ActionButton',
  component: ActionButton,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'glass', 'danger', 'amber'],
      description: 'Visual style variant',
      table: { defaultValue: { summary: 'primary' } },
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

export const Default: Story = {
  args: { label: 'חקירה', variant: 'primary', size: 'md', disabled: false, icon: Eye },
};

export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-3" style={{ width: 400 }}>
      <ActionButton label="ראשי" variant="primary" icon={Eye} />
      <ActionButton label="משני" variant="secondary" icon={Check} />
      <ActionButton label="זכוכית" variant="glass" icon={Radio} />
      <ActionButton label="שקוף" variant="ghost" icon={X} />
      <ActionButton label="סכנה" variant="danger" icon={Crosshair} />
      <ActionButton label="אזהרה" variant="amber" icon={Rocket} />
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
