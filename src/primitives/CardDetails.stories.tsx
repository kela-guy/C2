import type { Meta, StoryObj } from '@storybook/react';
import { CardDetails } from './CardDetails';
import { MapPin, Ruler, Scan, Mountain, Clock } from 'lucide-react';

const meta: Meta<typeof CardDetails> = {
  title: 'TargetCard/Slots/CardDetails',
  component: CardDetails,
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
type Story = StoryObj<typeof CardDetails>;

export const BasicTelemetry: Story = {
  args: {
    rows: [
      { label: 'מיקום', value: '32.0853° N, 34.7818° E', icon: MapPin },
      { label: 'גובה', value: '85 מ׳', icon: Mountain },
      { label: 'מרחק', value: '2.4 ק״מ', icon: Ruler },
      { label: 'זמן זיהוי', value: '00:10:22', icon: Scan },
      { label: 'נצפה לאחרונה', value: '00:12:05', icon: Clock },
    ],
  },
};

export const WithClassification: Story = {
  args: {
    rows: [
      { label: 'מיקום', value: '32.1120° N, 34.8050° E', icon: MapPin },
      { label: 'גובה', value: '85 מ׳', icon: Mountain },
      { label: 'מרחק', value: '1.8 ק״מ', icon: Ruler },
      { label: 'זמן זיהוי', value: '00:08:15', icon: Scan },
    ],
    classification: {
      type: 'drone',
      typeLabel: 'רחפן',
      confidence: 92,
      colorClass: 'text-red-400',
    },
  },
};

export const BirdClassification: Story = {
  args: {
    rows: [
      { label: 'מיקום', value: '32.0900° N, 34.7800° E', icon: MapPin },
      { label: 'מרחק', value: '1.2 ק״מ', icon: Ruler },
    ],
    classification: {
      type: 'bird',
      typeLabel: 'ציפור',
      confidence: 78,
      colorClass: 'text-amber-400',
    },
  },
};

export const RawDetection: Story = {
  args: {
    rows: [
      { label: 'מיקום', value: '32.0800° N, 34.7700° E', icon: MapPin },
      { label: 'מרחק', value: '3.5 ק״מ', icon: Ruler },
    ],
    classification: {
      type: 'unknown',
      typeLabel: 'זיהוי לא ידוע',
      confidence: 45,
      colorClass: 'text-zinc-400',
    },
  },
};
