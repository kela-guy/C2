import type { Meta, StoryObj } from '@storybook/react-vite';
import { CardHeader } from './CardHeader';
import { StatusChip } from './StatusChip';
import { Plane, Target, Rocket, Ship, ScanLine } from 'lucide-react';
import { SpecDocs } from '@/specs/SpecDocs';
import { spec } from './CardHeader.spec';

const meta: Meta<typeof CardHeader> = {
  title: 'TargetCard/Slots/CardHeader',
  component: CardHeader,
  tags: ['autodocs'],
  decorators: [
    (Story, context) => context.parameters?.specDocs ? (
      <Story />
    ) : (
      <div style={{ maxWidth: 380, background: '#1A1A1A', padding: 8, borderRadius: 8 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CardHeader>;

export const Spec: StoryObj = {
  render: () => <SpecDocs spec={spec} />,
  parameters: { controls: { disable: true }, actions: { disable: true }, layout: 'fullscreen', a11y: { test: 'todo' }, specDocs: true },
};

export const Default: Story = {
  args: {
    icon: Target,
    title: 'חשד תנועה - גזרה צפונית',
    subtitle: 't-001',
    open: false,
  },
};

export const WithStatus: Story = {
  args: {
    icon: Plane,
    iconBgActive: true,
    iconColor: '#ef4444',
    title: 'רחפן מסווג',
    status: <StatusChip label="איתור" color="red" />,
    open: true,
  },
};

export const MissionHeader: Story = {
  args: {
    icon: ScanLine,
    iconColor: '#a78bfa',
    title: 'סריקת מצלמה',
    subtitle: 't-030',
    open: false,
  },
};

export const AllIcons: Story = {
  name: 'All Icon Types',
  render: () => (
    <div className="flex flex-col gap-3">
      {[
        { icon: Plane, title: 'כלי טיס', color: '#ef4444', active: true },
        { icon: Rocket, title: 'טיל', color: '#9ca3af', active: false },
        { icon: Ship, title: 'כלי שיט', color: '#9ca3af', active: false },
        { icon: Target, title: 'לא מזוהה', color: '#71717a', active: false },
        { icon: ScanLine, title: 'סריקת PTZ', color: '#a78bfa', active: false },
      ].map((cfg) => (
        <CardHeader
          key={cfg.title}
          icon={cfg.icon}
          iconColor={cfg.color}
          iconBgActive={cfg.active}
          title={cfg.title}
          open={false}
        />
      ))}
    </div>
  ),
};
