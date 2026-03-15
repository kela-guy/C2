import type { Meta, StoryObj } from '@storybook/react';
import { CardTimeline, type TimelineStep } from './CardTimeline';

const meta: Meta<typeof CardTimeline> = {
  title: 'TargetCard/Slots/CardTimeline',
  component: CardTimeline,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 380, background: '#1A1A1A', padding: 12, borderRadius: 8 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CardTimeline>;

const missionSteps: TimelineStep[] = [
  { label: 'נעילת מטרה', status: 'complete' },
  { label: 'אישור ירי', status: 'complete' },
  { label: 'שיגור', status: 'active' },
  { label: 'פגיעה', status: 'pending' },
  { label: 'אימות', status: 'pending' },
];

export const MissionProgress: Story = {
  args: { steps: missionSteps },
};

export const CompactDots: Story = {
  args: { steps: missionSteps, compact: true },
};

const cuasSteps: TimelineStep[] = [
  { label: 'זיהוי ראשוני', status: 'complete' },
  { label: 'סיווג', status: 'complete' },
  { label: 'שיבוש פעיל', status: 'active' },
];

export const CuasLifecycle: Story = {
  args: { steps: cuasSteps },
};

const investigationSteps: TimelineStep[] = [
  { label: 'זיהוי', status: 'complete' },
  { label: 'הפניה', status: 'complete' },
  { label: 'חקירה', status: 'active' },
  { label: 'החלטה', status: 'pending' },
  { label: 'ביצוע', status: 'pending' },
  { label: 'סגירה', status: 'pending' },
];

export const InvestigationFlow: Story = {
  args: { steps: investigationSteps },
};

const droneSteps: TimelineStep[] = [
  { label: 'בחר רחפן', status: 'complete' },
  { label: 'המראה', status: 'complete' },
  { label: 'בדרך לאיתור', status: 'active' },
  { label: 'תצפית פעילה', status: 'pending' },
  { label: 'חוזר לבסיס', status: 'pending' },
  { label: 'נחת', status: 'pending' },
];

export const DroneDeployment: Story = {
  args: { steps: droneSteps },
};
