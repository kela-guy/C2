import type { Meta, StoryObj } from '@storybook/react';
import { fn, expect } from 'storybook/test';
import { TargetCard } from './TargetCard';
import { CardHeader } from './CardHeader';
import { StatusChip } from './StatusChip';
import { Target } from 'lucide-react';

const meta: Meta<typeof TargetCard> = {
  title: 'TargetCard/Shell',
  component: TargetCard,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 380 }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    accent: {
      control: 'select',
      options: ['idle', 'suspicion', 'detection', 'tracking', 'mitigating', 'active', 'resolved', 'expired'],
    },
    open: { control: 'boolean' },
    completed: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof TargetCard>;

export const ExpandCollapse: Story = {
  name: 'Expand / Collapse',
  args: {
    accent: 'detection',
    open: false,
    completed: false,
    onToggle: fn(),
    header: (
      <CardHeader
        icon={Target}
        title="יעד לדוגמה"
        subtitle="t-001"
        status={<StatusChip label="איתור" color="red" />}
        open={false}
      />
    ),
    children: (
      <div className="p-3 text-xs text-zinc-400" data-testid="expanded-content">
        תוכן מורחב
      </div>
    ),
  },
  play: async ({ args, canvas, userEvent }) => {
    expect(canvas.queryByTestId('expanded-content')).not.toBeInTheDocument();

    await userEvent.click(canvas.getByText('יעד לדוגמה'));

    await expect(args.onToggle).toHaveBeenCalledOnce();
  },
};

export const ExpandedContent: Story = {
  name: 'Expanded — Content Visible',
  args: {
    accent: 'tracking',
    open: true,
    completed: false,
    onToggle: fn(),
    header: (
      <CardHeader
        icon={Target}
        title="מטרה במעקב"
        status={<StatusChip label="מעקב" color="orange" />}
        open={true}
      />
    ),
    children: (
      <div className="p-3 text-xs text-zinc-400" data-testid="expanded-content">
        נתוני טלמטריה מפורטים
      </div>
    ),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('expanded-content')).toBeInTheDocument();
    await expect(canvas.getByText('נתוני טלמטריה מפורטים')).toBeVisible();
  },
};

export const CompletedState: Story = {
  name: 'Completed — Reduced Opacity',
  args: {
    accent: 'resolved',
    open: false,
    completed: true,
    onToggle: fn(),
    header: (
      <CardHeader
        icon={Target}
        title="אירוע הושלם"
        status={<StatusChip label="הושלם" color="green" />}
        open={false}
      />
    ),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('אירוע הושלם')).toBeInTheDocument();
    await expect(canvas.getByText('הושלם')).toBeInTheDocument();
  },
};

export const AllAccents: Story = {
  name: 'All Accent Colors',
  render: () => {
    const accents = ['idle', 'suspicion', 'detection', 'tracking', 'mitigating', 'active', 'resolved', 'expired'] as const;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {accents.map((a) => (
          <TargetCard
            key={a}
            accent={a}
            open={false}
            onToggle={() => {}}
            header={
              <CardHeader
                icon={Target}
                title={`Accent: ${a}`}
                open={false}
              />
            }
          />
        ))}
      </div>
    );
  },
};
