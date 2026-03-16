import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { CollapsibleGroup } from './CollapsibleGroup';
import { Camera, Radio, Satellite } from 'lucide-react';

const meta = {
  title: 'Primitives/CollapsibleGroup',
  component: CollapsibleGroup,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    title: { control: 'text', description: 'Group title' },
    count: { control: { type: 'range', min: 0, max: 10 }, description: 'Item count badge' },
    defaultOpen: { control: 'boolean', description: 'Initial open state' },
  },
} satisfies Meta<typeof CollapsibleGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { title: 'מצלמות', count: 3, defaultOpen: true, icon: Camera },
  render: (args) => (
    <div style={{ width: 340 }}>
      <CollapsibleGroup {...args}>
        <div className="text-xs text-zinc-400 space-y-1" data-testid="group-content">
          <div>פריט 1</div>
          <div>פריט 2</div>
          <div>פריט 3</div>
        </div>
      </CollapsibleGroup>
    </div>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const panelId = trigger.getAttribute('aria-controls');
    await expect(panelId).toBeTruthy();
    await expect(document.getElementById(panelId!)).toBeInTheDocument();
  },
};

export const ToggleCollapse: Story = {
  name: 'Toggle — Expand/Collapse',
  args: { title: 'חיישנים', count: 2, defaultOpen: false, icon: Radio },
  render: (args) => (
    <div style={{ width: 340 }}>
      <CollapsibleGroup {...args}>
        <div className="text-xs text-zinc-400" data-testid="toggle-content">תוכן</div>
      </CollapsibleGroup>
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByTestId('toggle-content')).toBeInTheDocument();

    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  },
};

export const MultipleGroups: Story = {
  render: () => (
    <div style={{ width: 340 }}>
      <CollapsibleGroup title="מצלמות" count={3} icon={Camera} defaultOpen>
        <div className="text-xs text-zinc-400">3 מצלמות פעילות</div>
      </CollapsibleGroup>
      <CollapsibleGroup title="חיישנים" count={2} icon={Radio}>
        <div className="text-xs text-zinc-400">2 חיישנים פעילים</div>
      </CollapsibleGroup>
      <CollapsibleGroup title="לוויינים" count={1} icon={Satellite}>
        <div className="text-xs text-zinc-400">לוויין 1 פעיל</div>
      </CollapsibleGroup>
    </div>
  ),
};
