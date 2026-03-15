import type { Meta, StoryObj } from '@storybook/react';
import { CardClosure } from './CardClosure';
import { INCIDENT_OUTCOMES } from '@/imports/ListOfSystems';

const meta: Meta<typeof CardClosure> = {
  title: 'TargetCard/Slots/CardClosure',
  component: CardClosure,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 380, background: '#141414', borderRadius: 8 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CardClosure>;

export const Default: Story = {
  args: {
    outcomes: INCIDENT_OUTCOMES.map((o) => ({ id: o.value, label: o.label })),
    onSelect: (id: string) => console.log('Selected:', id),
  },
};
