import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { TargetCard } from './TargetCard';
import { CardHeader } from './CardHeader';
import { StatusChip } from './StatusChip';
import { Target } from 'lucide-react';

const meta: Meta<typeof TargetCard> = {
  title: 'TargetCard/Shell',
  component: TargetCard,
  tags: ['autodocs'],
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

function InteractiveCard(props: Partial<React.ComponentProps<typeof TargetCard>>) {
  const [open, setOpen] = useState(props.open ?? false);
  return (
    <div style={{ maxWidth: 380 }}>
      <TargetCard
        {...props}
        open={open}
        onToggle={() => setOpen(!open)}
        header={
          props.header ?? (
            <CardHeader
              icon={Target}
              title="יעד לדוגמה"
              subtitle="t-001"
              status={<StatusChip label="איתור" color="red" />}
              open={open}
            />
          )
        }
      >
        {props.children ?? (
          <div className="p-3 text-xs text-zinc-400">תוכן מורחב</div>
        )}
      </TargetCard>
    </div>
  );
}

export const Default: Story = {
  render: () => <InteractiveCard accent="idle" />,
};

export const Detection: Story = {
  render: () => <InteractiveCard accent="detection" open />,
};

export const Resolved: Story = {
  render: () => <InteractiveCard accent="resolved" completed />,
};

export const AllAccents: Story = {
  name: 'All Accent Colors',
  render: () => {
    const accents = ['idle', 'suspicion', 'detection', 'tracking', 'mitigating', 'active', 'resolved', 'expired'] as const;
    return (
      <div style={{ maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 8 }}>
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
