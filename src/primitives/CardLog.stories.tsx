import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { CardLog } from './CardLog';
import { SpecDocs } from '@/specs/SpecDocs';
import { spec } from './CardLog.spec';

const meta: Meta<typeof CardLog> = {
  title: 'TargetCard/Slots/CardLog',
  component: CardLog,
  tags: ['autodocs'],
  decorators: [
    (Story, context) => context.parameters?.specDocs ? (
      <Story />
    ) : (
      <div style={{ maxWidth: 380, background: '#141414', borderRadius: 8 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CardLog>;

export const Spec: StoryObj = {
  render: () => <SpecDocs spec={spec} />,
  parameters: { controls: { disable: true }, actions: { disable: true }, layout: 'fullscreen', a11y: { test: 'todo' }, specDocs: true },
};

export const ShortLog: Story = {
  args: {
    entries: [
      { time: '00:10:22', label: 'זוהתה תנועה חשודה' },
      { time: '00:10:45', label: 'התחלת חקירה' },
      { time: '00:11:02', label: 'אימות ויזואלי' },
    ],
    defaultOpen: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('זוהתה תנועה חשודה')).toBeInTheDocument();
    await expect(canvas.getByText('התחלת חקירה')).toBeInTheDocument();
    await expect(canvas.getByText('אימות ויזואלי')).toBeInTheDocument();
  },
};

export const LongLogTruncated: Story = {
  name: 'Long Log — Show More',
  args: {
    entries: Array.from({ length: 12 }, (_, i) => ({
      time: `00:${String(10 + i).padStart(2, '0')}:00`,
      label: `אירוע ${i + 1} — פעולה בוצעה`,
    })),
    maxVisible: 5,
    defaultOpen: true,
  },
  play: async ({ canvas, userEvent }) => {
    const visibleEntries = canvas.getAllByText(/אירוע \d+ — פעולה בוצעה/);
    await expect(visibleEntries).toHaveLength(5);

    const showMoreBtn = canvas.getByText(/עוד \d+ רשומות/);
    await expect(showMoreBtn).toBeInTheDocument();

    await userEvent.click(showMoreBtn);

    const allEntries = canvas.getAllByText(/אירוע \d+ — פעולה בוצעה/);
    await expect(allEntries).toHaveLength(12);

    expect(canvas.queryByText(/עוד \d+ רשומות/)).not.toBeInTheDocument();
  },
};

export const EmptyLog: Story = {
  name: 'Empty — Renders Nothing',
  args: {
    entries: [],
    defaultOpen: true,
  },
  play: async ({ canvas }) => {
    expect(canvas.queryByText(/לוג/)).not.toBeInTheDocument();
  },
};
