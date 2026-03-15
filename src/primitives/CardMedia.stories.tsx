import type { Meta, StoryObj } from '@storybook/react';
import { CardMedia } from './CardMedia';

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

export const StaticImage: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&q=80&w=400&h=240',
    type: 'image',
    badge: 'threat',
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
