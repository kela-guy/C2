import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { CardTimeline, type TimelineStep } from './CardTimeline';
import { SpecDocs } from '@/specs/SpecDocs';
import { spec } from './CardTimeline.spec';

const meta: Meta<typeof CardTimeline> = {
  title: 'TargetCard/Slots/CardTimeline',
  component: CardTimeline,
  tags: ['autodocs'],
  decorators: [
    (Story, context) => context.parameters?.specDocs ? (
      <Story />
    ) : (
      <div style={{ maxWidth: 380, background: '#1A1A1A', padding: 12, borderRadius: 8 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CardTimeline>;

export const Spec: StoryObj = {
  render: () => <SpecDocs spec={spec} />,
  parameters: { controls: { disable: true }, actions: { disable: true }, layout: 'fullscreen', a11y: { test: 'todo' }, specDocs: true },
};

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
  play: async ({ canvas }) => {
    const dots = canvas.getAllByRole('img');
    await expect(dots.length).toBe(missionSteps.length);

    await expect(dots[0]).toHaveAttribute('aria-label', 'נעילת מטרה: הושלם');
    await expect(dots[2]).toHaveAttribute('aria-label', 'שיגור: פעיל');
    await expect(dots[3]).toHaveAttribute('aria-label', 'פגיעה: ממתין');
  },
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

const decidePhaseSteps: TimelineStep[] = [
  { label: 'זיהוי', status: 'complete' },
  { label: 'הפניה', status: 'complete' },
  { label: 'חקירה', status: 'complete' },
  { label: 'החלטה', status: 'active' },
  { label: 'ביצוע', status: 'pending' },
  { label: 'סגירה', status: 'pending' },
];

export const DecidePhase: Story = {
  name: 'Decide Phase (Flow 1)',
  args: { steps: decidePhaseSteps },
};

const actPhaseSteps: TimelineStep[] = [
  { label: 'זיהוי', status: 'complete' },
  { label: 'הפניה', status: 'complete' },
  { label: 'חקירה', status: 'complete' },
  { label: 'החלטה', status: 'complete' },
  { label: 'ביצוע', status: 'active' },
  { label: 'סגירה', status: 'pending' },
];

export const ActPhase: Story = {
  name: 'Act Phase (Flow 1)',
  args: { steps: actPhaseSteps },
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
