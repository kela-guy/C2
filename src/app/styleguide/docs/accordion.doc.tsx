/**
 * Co-located doc module for the generic Accordion compound. Documents the
 * shadcn primitive (`@/shared/components/ui/accordion`) — a vertically stacked
 * set of collapsible sections — with neutral example content. Meta lives in
 * `registry/manifest.json`.
 */
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
import accordionSrc from '@/shared/components/ui/accordion.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

export const accordionDoc: ComponentDocModule = {
  id: 'accordion',
  source: accordionSrc,
  usage: `import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

<Accordion type="single" collapsible defaultValue="shipping" className="max-w-lg">
  <AccordionItem value="shipping">
    <AccordionTrigger>What are your shipping options?</AccordionTrigger>
    <AccordionContent>
      We offer standard (5-7 days), express (2-3 days), and overnight shipping.
    </AccordionContent>
  </AccordionItem>
</Accordion>`,
  examples: [
    {
      id: 'default',
      title: 'Single, collapsible',
      description:
        'A vertically stacked set of sections. With type="single" only one item opens at a time; collapsible lets the open item close again.',
      render: () => (
        <div dir="ltr" className="w-full max-w-lg">
          <Accordion type="single" collapsible defaultValue="shipping">
            <AccordionItem value="shipping">
              <AccordionTrigger>What are your shipping options?</AccordionTrigger>
              <AccordionContent>
                We offer standard (5-7 days), express (2-3 days), and overnight shipping. Free
                shipping on international orders.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="returns">
              <AccordionTrigger>What is your return policy?</AccordionTrigger>
              <AccordionContent>
                Returns accepted within 30 days. Items must be unused and in original packaging.
                Refunds processed within 5-7 business days.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="support">
              <AccordionTrigger>How can I contact customer support?</AccordionTrigger>
              <AccordionContent>
                Reach us via email, live chat, or phone. We respond within 24 hours during business
                days.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      ),
    },
    {
      id: 'multiple',
      title: 'Multiple open',
      description: 'With type="multiple" any number of sections can stay open at once.',
      code: `<Accordion type="multiple" defaultValue={["overview", "details"]}>
  <AccordionItem value="overview">
    <AccordionTrigger>Overview</AccordionTrigger>
    <AccordionContent>A high-level summary.</AccordionContent>
  </AccordionItem>
  <AccordionItem value="details">
    <AccordionTrigger>Details</AccordionTrigger>
    <AccordionContent>The specifics.</AccordionContent>
  </AccordionItem>
</Accordion>`,
      render: () => (
        <div dir="ltr" className="w-full max-w-lg">
          <Accordion type="multiple" defaultValue={['overview', 'details']}>
            <AccordionItem value="overview">
              <AccordionTrigger>Overview</AccordionTrigger>
              <AccordionContent>
                A high-level summary that stays open while you read the details below.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="details">
              <AccordionTrigger>Details</AccordionTrigger>
              <AccordionContent>
                The specifics — both sections are expanded at the same time.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="notes">
              <AccordionTrigger>Notes</AccordionTrigger>
              <AccordionContent>Optional extra context, collapsed by default.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      ),
    },
  ],
  edgeCases: [
    {
      id: 'long-trigger',
      label: 'Long trigger text',
      note: 'The trigger lays out as a flex row beside the chevron. Long text wraps and pushes the chevron to stay pinned at the inline-end, top-aligned.',
      render: () => (
        <div dir="ltr" className="w-[320px]">
          <Accordion type="single" collapsible defaultValue="q">
            <AccordionItem value="q">
              <AccordionTrigger>
                Do you offer discounts for bulk orders, educational institutions, or non-profit
                organizations?
              </AccordionTrigger>
              <AccordionContent>Yes — contact sales for a tailored quote.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      ),
    },
    {
      id: 'disabled-item',
      label: 'Disabled item',
      note: 'A disabled trigger drops to 50% opacity and ignores pointer + keyboard events; the others stay interactive.',
      render: () => (
        <div dir="ltr" className="w-[320px]">
          <Accordion type="single" collapsible>
            <AccordionItem value="open">
              <AccordionTrigger>Available section</AccordionTrigger>
              <AccordionContent>This one opens normally.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="locked" disabled>
              <AccordionTrigger>Locked section</AccordionTrigger>
              <AccordionContent>Unreachable while disabled.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      ),
    },
    {
      id: 'single-item',
      label: 'Single item',
      note: 'One item with last:border-b-0 — no trailing rule, so it reads as a standalone disclosure rather than a list.',
      render: () => (
        <div dir="ltr" className="w-[320px]">
          <Accordion type="single" collapsible defaultValue="only">
            <AccordionItem value="only">
              <AccordionTrigger>Show more</AccordionTrigger>
              <AccordionContent>A single collapsible disclosure.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      ),
    },
    {
      id: 'rich-content',
      label: 'Rich content',
      note: 'Content can hold any nodes — paragraphs, lists, links. The body animates its height open and closed regardless of what it contains.',
      render: () => (
        <div dir="ltr" className="w-[320px]">
          <Accordion type="single" collapsible defaultValue="r">
            <AccordionItem value="r">
              <AccordionTrigger>What's included?</AccordionTrigger>
              <AccordionContent>
                <ul className="list-inside list-disc space-y-1">
                  <li>Unlimited projects</li>
                  <li>Priority support</li>
                  <li>Custom integrations</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      ),
    },
  ],
};
