import type { Meta, StoryObj } from '@storybook/react';
import { fn, expect } from 'storybook/test';
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

export const PrimaryWithSecondary: Story = {
  args: {
    actions: [
      { id: 'attack', label: 'ירי', icon: Crosshair, variant: 'danger', size: 'lg', onClick: fn() },
      { id: 'jam', label: 'שיבוש', icon: Radio, variant: 'secondary', size: 'sm', onClick: fn() },
      { id: 'surveil', label: 'מעקב', icon: Eye, variant: 'secondary', size: 'sm', onClick: fn() },
      { id: 'drone', label: 'רחפן', icon: Plane, variant: 'secondary', size: 'sm', onClick: fn() },
      { id: 'dismiss', label: 'ביטול', icon: X, variant: 'ghost', size: 'sm', onClick: fn() },
    ],
  },
  play: async ({ args, canvas, userEvent }) => {
    const buttons = canvas.getAllByRole('button');
    await userEvent.click(buttons[0]);
    await expect(args.actions[0].onClick).toHaveBeenCalled();

    await userEvent.click(buttons[2]);
    await expect(args.actions[2].onClick).toHaveBeenCalled();
  },
};

export const ConfirmFlow: Story = {
  name: 'Confirm Dialog Flow',
  args: {
    actions: [
      {
        id: 'mitigate',
        label: 'שיבוש',
        icon: Zap,
        variant: 'danger',
        size: 'lg',
        onClick: fn(),
        confirm: { title: 'הפעלת שיבוש', description: 'האם אתה בטוח?', confirmLabel: 'אישור' },
      },
    ],
  },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /שיבוש/ }));

    const dialog = canvas.getByRole('alertdialog');
    await expect(dialog).toBeInTheDocument();
    await expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-title');
    await expect(dialog).toHaveAttribute('aria-describedby', 'confirm-desc');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    await expect(canvas.getByText('הפעלת שיבוש')).toBeInTheDocument();
    await expect(canvas.getByText('האם אתה בטוח?')).toBeInTheDocument();

    await expect(args.actions[0].onClick).not.toHaveBeenCalled();

    await userEvent.click(canvas.getByRole('button', { name: /אישור/ }));

    await expect(args.actions[0].onClick).toHaveBeenCalledOnce();
  },
};

export const ConfirmCancel: Story = {
  name: 'Confirm → Cancel',
  args: {
    actions: [
      {
        id: 'mitigate',
        label: 'שיבוש',
        icon: Zap,
        variant: 'danger',
        size: 'lg',
        onClick: fn(),
        confirm: { title: 'הפעלת שיבוש', description: 'בטוח?' },
      },
    ],
  },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /שיבוש/ }));

    await expect(canvas.getByText('הפעלת שיבוש')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: /ביטול/ }));

    expect(canvas.queryByText('הפעלת שיבוש')).not.toBeInTheDocument();

    await expect(args.actions[0].onClick).not.toHaveBeenCalled();
  },
};

export const DoubleConfirmFlow: Story = {
  name: 'Double Confirm Flow',
  args: {
    actions: [
      {
        id: 'mitigate',
        label: 'שיבוש',
        icon: Zap,
        variant: 'danger',
        size: 'lg',
        onClick: fn(),
        confirm: {
          title: 'הפעלת שיבוש',
          description: 'האם אתה בטוח?',
          doubleConfirm: true,
        },
      },
    ],
  },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /שיבוש/ }));

    await expect(canvas.getByText('הפעלת שיבוש')).toBeInTheDocument();
    await expect(args.actions[0].onClick).not.toHaveBeenCalled();

    await userEvent.click(canvas.getByRole('button', { name: /אישור/ }));

    await expect(canvas.getByText('אישור סופי')).toBeInTheDocument();
    await expect(args.actions[0].onClick).not.toHaveBeenCalled();

    await userEvent.click(canvas.getByRole('button', { name: /הפעל/ }));

    await expect(args.actions[0].onClick).toHaveBeenCalledOnce();
  },
};

export const PlaybookSelection: Story = {
  name: 'Playbook Selection (Flow 1 Decide)',
  args: {
    actions: [
      { id: 'pb-fast-inspect', label: 'חקירה מהירה', icon: Plane, variant: 'primary', size: 'md', onClick: fn() },
      { id: 'pb-full-response', label: 'תגובה מלאה', icon: Zap, variant: 'danger', size: 'sm', onClick: fn() },
      { id: 'pb-transfer', label: 'העבר אחריות', icon: Radio, variant: 'secondary', size: 'sm', onClick: fn() },
      { id: 'close-event', label: 'סגור', icon: X, variant: 'ghost', size: 'sm', onClick: fn() },
    ],
  },
};

export const InvestigationActions: Story = {
  name: 'Investigation Actions (Flow 2)',
  args: {
    actions: [
      { id: 'send-drone', label: 'שגר רחפן', icon: Plane, variant: 'primary', size: 'md', onClick: fn() },
      { id: 'mark-poi', label: 'סמן נ.ע', icon: Crosshair, variant: 'secondary', size: 'sm', onClick: fn() },
      { id: 'close-event', label: 'סגור אירוע', icon: X, variant: 'ghost', size: 'sm', onClick: fn() },
    ],
  },
};

export const Disabled: Story = {
  args: {
    actions: [
      { id: 'mitigate', label: 'שיבוש', icon: Zap, variant: 'danger', size: 'lg', onClick: fn(), disabled: true },
      { id: 'regional', label: 'מרחבי', icon: Radio, variant: 'secondary', size: 'sm', onClick: fn(), disabled: true },
    ],
  },
  play: async ({ args, canvas }) => {
    const buttons = canvas.getAllByRole('button');
    for (const btn of buttons) {
      await expect(btn).toBeDisabled();
    }
    await expect(args.actions[0].onClick).not.toHaveBeenCalled();
  },
};
