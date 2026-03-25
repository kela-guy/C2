import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { SpecDocs } from '@/specs/SpecDocs';
import { spec } from './CameraViewerPanel.spec';
import { CameraViewerPanel, type CameraFeed } from './CameraViewerPanel';

const meta: Meta<typeof CameraViewerPanel> = {
  title: 'Composition/CameraViewerPanel',
  component: CameraViewerPanel,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <DndProvider backend={HTML5Backend}>
        <div style={{ width: 600, height: 500, background: '#0a0a0a', overflow: 'hidden' }}>
          <Story />
        </div>
      </DndProvider>
    ),
  ],
  parameters: {
    a11y: { test: 'todo' },
  },
  args: {
    onFeedsChange: fn(),
    onCameraHover: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof CameraViewerPanel>;

export const Spec: StoryObj = {
  render: () => <SpecDocs spec={spec} />,
  parameters: { controls: { disable: true }, actions: { disable: true }, layout: 'fullscreen', a11y: { test: 'todo' }, specDocs: true },
};

export const SingleFeed: Story = {
  name: 'Single Camera',
  args: {
    feeds: [{ cameraId: 'CAM-NVT-PTZ-N' }],
  },
};

export const DualFeed: Story = {
  name: 'Two Cameras',
  args: {
    feeds: [{ cameraId: 'CAM-NVT-PTZ-N' }, { cameraId: 'CAM-NVT-PIXELSIGHT' }],
  },
};

export const EmptySlot: Story = {
  name: 'With Empty Slot',
  args: {
    feeds: [{ cameraId: 'CAM-NVT-PTZ-N' }, { cameraId: '' }],
  },
};

export const NoFeeds: Story = {
  name: 'No Feeds',
  args: {
    feeds: [],
  },
};

export const Interactive: Story = {
  name: 'Interactive',
  render: (args) => {
    const [feeds, setFeeds] = useState<CameraFeed[]>([{ cameraId: 'CAM-NVT-PTZ-N' }]);
    return (
      <CameraViewerPanel
        {...args}
        feeds={feeds}
        onFeedsChange={setFeeds}
      />
    );
  },
};
