import type { Meta, StoryObj } from '@storybook/react';
import { CardLog } from './CardLog';

const meta: Meta<typeof CardLog> = {
  title: 'TargetCard/Slots/CardLog',
  component: CardLog,
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
type Story = StoryObj<typeof CardLog>;

export const ShortLog: Story = {
  args: {
    entries: [
      { time: '00:10:22', label: 'זוהתה תנועה חשודה' },
      { time: '00:10:45', label: 'התחלת חקירה' },
      { time: '00:11:02', label: 'אימות ויזואלי' },
    ],
    defaultOpen: true,
  },
};

export const LongLogTruncated: Story = {
  args: {
    entries: Array.from({ length: 12 }, (_, i) => ({
      time: `00:${String(10 + i).padStart(2, '0')}:00`,
      label: `אירוע ${i + 1} — פעולה בוצעה`,
    })),
    maxVisible: 5,
    defaultOpen: true,
  },
};
