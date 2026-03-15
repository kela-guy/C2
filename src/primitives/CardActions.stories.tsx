import type { Meta, StoryObj } from '@storybook/react';
import { CardActions, type CardAction } from './CardActions';
import { Crosshair, Radio, Eye, Plane, X, Zap } from 'lucide-react';

const meta: Meta<typeof CardActions> = {
  title: 'TargetCard/Slots/CardActions',
  component: CardActions,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 380, background: '#1A1A1A', borderRadius: 8 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CardActions>;

const noop = (e: React.MouseEvent) => e.stopPropagation();

export const PrimaryWithSecondary: Story = {
  args: {
    actions: [
      { id: 'attack', label: 'ירי', icon: Crosshair, variant: 'danger', size: 'lg', onClick: noop },
      { id: 'jam', label: 'שיבוש', icon: Radio, variant: 'secondary', size: 'sm', onClick: noop },
      { id: 'surveil', label: 'מעקב', icon: Eye, variant: 'secondary', size: 'sm', onClick: noop },
      { id: 'drone', label: 'רחפן', icon: Plane, variant: 'secondary', size: 'sm', onClick: noop },
      { id: 'dismiss', label: 'ביטול', icon: X, variant: 'ghost', size: 'sm', onClick: noop },
    ],
  },
};

export const CuasMitigation: Story = {
  args: {
    actions: [
      { id: 'mitigate', label: 'שיבוש', icon: Zap, variant: 'danger', size: 'lg', onClick: noop,
        confirm: { title: 'הפעלת שיבוש', description: 'האם אתה בטוח?', doubleConfirm: true } },
      { id: 'regional', label: 'מרחבי', icon: Radio, variant: 'secondary', size: 'sm', onClick: noop },
      { id: 'lock', label: 'נעילה', icon: Crosshair, variant: 'secondary', size: 'sm', onClick: noop },
    ],
  },
};

export const Disabled: Story = {
  args: {
    actions: [
      { id: 'mitigate', label: 'שיבוש', icon: Zap, variant: 'danger', size: 'lg', onClick: noop, disabled: true },
      { id: 'regional', label: 'מרחבי', icon: Radio, variant: 'secondary', size: 'sm', onClick: noop, disabled: true },
    ],
  },
};
