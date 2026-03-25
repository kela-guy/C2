import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { SpecDocs } from '@/specs/SpecDocs';
import { spec } from './DevicesPanel.spec';
import { DevicesPanel } from './DevicesPanel';

const meta: Meta<typeof DevicesPanel> = {
  title: 'CUAS/DevicesPanel',
  component: DevicesPanel,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <DndProvider backend={HTML5Backend}>
        <div style={{ position: 'relative', width: 400, height: 700, background: '#0b0d10', overflow: 'hidden' }}>
          <Story />
        </div>
      </DndProvider>
    ),
  ],
  parameters: {
    a11y: { test: 'todo' },
  },
  args: {
    open: true,
    onClose: fn(),
    onFlyTo: fn(),
    onDeviceHover: fn(),
    onJamActivate: fn(),
    noTransition: true,
  },
};

export default meta;
type Story = StoryObj<typeof DevicesPanel>;

export const Spec: StoryObj = {
  render: () => <SpecDocs spec={spec} />,
  parameters: { controls: { disable: true }, actions: { disable: true }, layout: 'fullscreen', a11y: { test: 'todo' }, specDocs: true },
};

export const Default: Story = {
  name: 'All Devices',
};

export const Closed: Story = {
  name: 'Panel Closed',
  args: {
    open: false,
  },
};
