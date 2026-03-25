import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn, expect } from 'storybook/test';
import { CardClosure } from './CardClosure';
import { INCIDENT_OUTCOMES } from '@/imports/ListOfSystems';
import { SpecDocs } from '@/specs/SpecDocs';
import { spec } from './CardClosure.spec';

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

export const Spec: StoryObj = {
  render: () => <SpecDocs spec={spec} />,
  parameters: { controls: { disable: true }, actions: { disable: true }, layout: 'fullscreen', a11y: { test: 'todo' }, specDocs: true },
};

export const Default: Story = {
  args: {
    outcomes: INCIDENT_OUTCOMES.map((o) => ({ id: o.value, label: o.label })),
    onSelect: fn(),
  },
  play: async ({ args, canvas, userEvent }) => {
    const buttons = canvas.getAllByRole('button');
    await expect(buttons.length).toBeGreaterThan(0);

    await userEvent.click(buttons[0]);
    await expect(args.onSelect).toHaveBeenCalledOnce();
    await expect(args.onSelect).toHaveBeenCalledWith(INCIDENT_OUTCOMES[0].value);
  },
};

export const SelectSecondOutcome: Story = {
  name: 'Select Second Outcome',
  args: {
    outcomes: INCIDENT_OUTCOMES.map((o) => ({ id: o.value, label: o.label })),
    onSelect: fn(),
  },
  play: async ({ args, canvas, userEvent }) => {
    const buttons = canvas.getAllByRole('button');

    await userEvent.click(buttons[1]);
    await expect(args.onSelect).toHaveBeenCalledWith(INCIDENT_OUTCOMES[1].value);
  },
};

export const EmptyClosure: Story = {
  name: 'Empty — Renders Nothing',
  args: {
    outcomes: [],
    onSelect: fn(),
  },
  play: async ({ args, canvas }) => {
    expect(canvas.queryByText(/סגירת אירוע/)).not.toBeInTheDocument();
    await expect(args.onSelect).not.toHaveBeenCalled();
  },
};
