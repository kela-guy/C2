import type { Meta, StoryObj } from '@storybook/react-vite';
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
        <div className="text-xs text-zinc-400 py-2">תוכן המקטע</div>
      </AccordionSection>
    </div>
  ),
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
};
