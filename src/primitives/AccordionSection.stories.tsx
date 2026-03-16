import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { AccordionSection } from './AccordionSection';
import { Activity } from 'lucide-react';

const meta = {
  title: 'Primitives/AccordionSection',
  component: AccordionSection,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    title: { control: 'text', description: 'Section title' },
    defaultOpen: { control: 'boolean', description: 'Initial open state' },
  },
} satisfies Meta<typeof AccordionSection>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { title: 'נתוני טלמטריה', defaultOpen: true, icon: Activity },
  render: (args) => (
    <div style={{ width: 340 }}>
      <AccordionSection {...args}>
        <div className="text-xs text-zinc-400 py-2" data-testid="section-content">תוכן המקטע</div>
      </AccordionSection>
    </div>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(trigger).toHaveAttribute('tabindex', '0');

    const panelId = trigger.getAttribute('aria-controls');
    await expect(panelId).toBeTruthy();
    await expect(document.getElementById(panelId!)).toBeInTheDocument();

    await expect(canvas.getByTestId('section-content')).toBeInTheDocument();
  },
};

export const ToggleOpenClose: Story = {
  name: 'Toggle Open → Close',
  args: { title: 'נתונים', defaultOpen: true, icon: Activity },
  render: (args) => (
    <div style={{ width: 340 }}>
      <AccordionSection {...args}>
        <div className="text-xs text-zinc-400 py-2" data-testid="toggle-content">תוכן פנימי</div>
      </AccordionSection>
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button');

    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByTestId('toggle-content')).toBeInTheDocument();

    await userEvent.click(trigger);

    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  },
};

export const KeyboardToggle: Story = {
  name: 'Keyboard — Enter/Space Toggle',
  args: { title: 'מקלדת', defaultOpen: false, icon: Activity },
  render: (args) => (
    <div style={{ width: 340 }}>
      <AccordionSection {...args}>
        <div className="text-xs text-zinc-400 py-2" data-testid="kbd-content">תוכן</div>
      </AccordionSection>
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    trigger.focus();
    await userEvent.keyboard('{Enter}');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByTestId('kbd-content')).toBeInTheDocument();

    await userEvent.keyboard(' ');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  },
};

export const StartsCollapsed: Story = {
  name: 'Starts Collapsed → Expand',
  args: { title: 'מידע נוסף', defaultOpen: false },
  render: (args) => (
    <div style={{ width: 340 }}>
      <AccordionSection {...args}>
        <div className="text-xs text-zinc-400 py-2" data-testid="collapsed-content">מידע מוסתר</div>
      </AccordionSection>
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button');

    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(canvas.queryByTestId('collapsed-content')).not.toBeInTheDocument();

    await userEvent.click(trigger);

    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByTestId('collapsed-content')).toBeInTheDocument();
  },
};

export const Multiple: Story = {
  render: () => (
    <div style={{ width: 340 }} className="border border-[#333] rounded">
      <AccordionSection title="מקטע ראשון" defaultOpen>
        <div className="text-xs text-zinc-400 py-2">תוכן ראשון</div>
      </AccordionSection>
      <AccordionSection title="מקטע שני">
        <div className="text-xs text-zinc-400 py-2">תוכן שני</div>
      </AccordionSection>
      <AccordionSection title="מקטע שלישי">
        <div className="text-xs text-zinc-400 py-2">תוכן שלישי</div>
      </AccordionSection>
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    const triggers = canvas.getAllByRole('button');
    await expect(triggers).toHaveLength(3);

    await expect(triggers[0]).toHaveAttribute('aria-expanded', 'true');
    await expect(triggers[1]).toHaveAttribute('aria-expanded', 'false');
    await expect(triggers[2]).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(triggers[1]);
    await expect(triggers[1]).toHaveAttribute('aria-expanded', 'true');
  },
};
