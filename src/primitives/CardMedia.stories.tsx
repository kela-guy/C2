import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { CardMedia } from './CardMedia';
import { SpecDocs } from '@/specs/SpecDocs';
import { spec } from './CardMedia.spec';

const meta: Meta<typeof CardMedia> = {
  title: 'TargetCard/Slots/CardMedia',
  component: CardMedia,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 380, background: '#1A1A1A', borderRadius: 8, overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CardMedia>;

export const Spec: StoryObj = {
  render: () => <SpecDocs spec={spec} />,
  parameters: { controls: { disable: true }, actions: { disable: true }, layout: 'fullscreen', a11y: { test: 'todo' }, specDocs: true },
};

export const StaticImage: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&q=80&w=400&h=240',
    type: 'image',
    badge: 'threat',
    alt: 'תצפית אווירית — רחפן מסווג',
  },
  play: async ({ canvas }) => {
    const img = canvas.getByRole('img');
    await expect(img).toHaveAttribute('alt', 'תצפית אווירית — רחפן מסווג');
  },
};

export const VideoFeed: Story = {
  args: {
    src: '/videos/target-feed.mov',
    type: 'video',
    badge: 'threat',
  },
};

export const BirdBadge: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&q=80&w=400&h=240',
    type: 'image',
    badge: 'bird',
  },
};

export const WarningBadge: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?auto=format&fit=crop&q=80&w=400&h=200',
    type: 'image',
    badge: 'warning',
  },
};

export const VideoWithControls: Story = {
  name: 'Video — With Controls',
  args: {
    src: '/videos/target-feed.mov',
    type: 'video',
    badge: 'threat',
    showControls: true,
  },
  play: async ({ canvas }) => {
    const scrubber = canvas.getByRole('slider');
    await expect(scrubber).toHaveAttribute('aria-label', 'מיקום בסרטון');
    await expect(scrubber).toHaveAttribute('tabindex', '0');

    const skipBack = canvas.getByLabelText('הרצה אחורה 5 שניות');
    await expect(skipBack).toBeInTheDocument();

    const playPause = canvas.getByLabelText('הפעל');
    await expect(playPause).toBeInTheDocument();

    const skipForward = canvas.getByLabelText('הרצה קדימה 5 שניות');
    await expect(skipForward).toBeInTheDocument();
  },
};
