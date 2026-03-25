import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { SpecDocs } from '@/specs/SpecDocs';
import { spec } from './NotificationSystem.spec';
import { NotificationSystem, showTacticalNotification, MOCK_NOTIFICATIONS } from './NotificationSystem';

const meta: Meta<typeof NotificationSystem> = {
  title: 'CUAS/NotificationSystem',
  component: NotificationSystem,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    a11y: { test: 'todo' },
  },
};

export default meta;
type Story = StoryObj<typeof NotificationSystem>;

export const Spec: StoryObj = {
  render: () => <SpecDocs spec={spec} />,
  parameters: { controls: { disable: true }, actions: { disable: true }, layout: 'fullscreen', a11y: { test: 'todo' }, specDocs: true },
};

function DemoWrapper() {
  useEffect(() => () => { toast.dismiss(); }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', position: 'relative' }}>
      <NotificationSystem />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: 40,
        }}
        dir="rtl"
      >
        <h2 style={{ color: '#e4e4e7', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          Notification System Demo
        </h2>
        <p style={{ color: '#71717a', fontSize: 13, marginBottom: 16 }}>
          Click buttons to trigger notifications at different threat levels
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => showTacticalNotification(MOCK_NOTIFICATIONS[0])}
            style={{
              padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: '#dc2626', color: 'white', fontSize: 13, fontWeight: 500,
            }}
          >
            Critical
          </button>
          <button
            type="button"
            onClick={() => showTacticalNotification(MOCK_NOTIFICATIONS[1])}
            style={{
              padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: '#eab308', color: 'black', fontSize: 13, fontWeight: 500,
            }}
          >
            Suspect
          </button>
          <button
            type="button"
            onClick={() => showTacticalNotification(MOCK_NOTIFICATIONS[3])}
            style={{
              padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: '#f97316', color: 'white', fontSize: 13, fontWeight: 500,
            }}
          >
            High
          </button>
          <button
            type="button"
            onClick={() => showTacticalNotification(MOCK_NOTIFICATIONS[5])}
            style={{
              padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: '#eab308', color: 'black', fontSize: 13, fontWeight: 500,
            }}
          >
            Medium
          </button>
          <button
            type="button"
            onClick={() => showTacticalNotification(MOCK_NOTIFICATIONS[7])}
            style={{
              padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: '#52525b', color: 'white', fontSize: 13, fontWeight: 500,
            }}
          >
            Info
          </button>
          <button
            type="button"
            onClick={() => showTacticalNotification(MOCK_NOTIFICATIONS[9])}
            style={{
              padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: '#22c55e', color: 'white', fontSize: 13, fontWeight: 500,
            }}
          >
            Success
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button
            type="button"
            onClick={() => {
              MOCK_NOTIFICATIONS.slice(0, 5).forEach((n, i) => {
                setTimeout(() => showTacticalNotification(n), i * 200);
              });
            }}
            style={{
              padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
              background: 'transparent', color: '#a1a1aa', fontSize: 12,
              border: '1px solid #333',
            }}
          >
            Burst (5 notifications)
          </button>
          <button
            type="button"
            onClick={() => toast.dismiss()}
            style={{
              padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
              background: 'transparent', color: '#a1a1aa', fontSize: 12,
              border: '1px solid #333',
            }}
          >
            Dismiss All
          </button>
        </div>
      </div>
    </div>
  );
}

export const Default: Story = {
  render: () => <DemoWrapper />,
};
