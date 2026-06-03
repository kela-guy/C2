/**
 * Co-located doc module for the AccordionSection primitive. Meta lives in
 * `registry/manifest.json`.
 */
import { Radar } from '@/lib/icons/central';
import { AccordionSection, TelemetryRow } from '@/primitives';
import accordionSectionSrc from '@/primitives/AccordionSection.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

export const accordionDoc: ComponentDocModule = {
  id: 'accordion',
  source: accordionSectionSrc,
  usage: `import { AccordionSection } from "@/primitives"

<AccordionSection title="חיישנים (3)" icon={Radar} defaultOpen>
  {/* content */}
</AccordionSection>`,
  examples: [
    {
      id: 'default',
      title: 'Collapsible section',
      description: 'Animated expand/collapse with an optional header icon. Used inside cards for details, logs, and sensors.',
      render: () => (
        <div className="w-[320px] overflow-hidden rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
          <AccordionSection title="חיישנים" icon={Radar} defaultOpen>
            <div className="grid w-full grid-cols-3 gap-x-4 py-2">
              <TelemetryRow label="RF" value="1.2 km" />
              <TelemetryRow label="Radar" value="0.8 km" />
              <TelemetryRow label="EO/IR" value="0.5 km" />
            </div>
          </AccordionSection>
        </div>
      ),
    },
  ],
  edgeCases: [
    {
      id: 'long-title',
      label: 'Long title',
      note: 'The title sits in a flex row beside the chevron. Long titles push the layout — the chevron stays pinned to the inline-end while the title takes the remaining width.',
      render: () => (
        <div className="w-[320px] overflow-hidden rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
          <AccordionSection title="חיישנים מזהים ויומן אירועים מלא" icon={Radar} defaultOpen>
            <div className="grid w-full grid-cols-3 gap-x-4 py-2">
              <TelemetryRow label="RF" value="1.2 km" />
            </div>
          </AccordionSection>
        </div>
      ),
    },
    {
      id: 'no-icon',
      label: 'No header icon',
      note: 'The icon is optional. Without it the title aligns to the trigger padding with no leading gap.',
      render: () => (
        <div className="w-[320px] overflow-hidden rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
          <AccordionSection title="פרטים" defaultOpen>
            <div className="grid w-full grid-cols-3 gap-x-4 py-2">
              <TelemetryRow label="גובה" value="120m" />
            </div>
          </AccordionSection>
        </div>
      ),
    },
    {
      id: 'empty-content',
      label: 'Empty content',
      note: 'With no children the open body collapses to its padding only — no min height. Gate rendering or show an empty-state message upstream.',
      render: () => (
        <div className="w-[320px] overflow-hidden rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
          <AccordionSection title="חיישנים (0)" icon={Radar} defaultOpen>
            {null}
          </AccordionSection>
        </div>
      ),
    },
    {
      id: 'many-rows',
      label: 'Many rows (overflow)',
      note: 'Dense data drops to a 2-column grid so each telemetry value keeps enough width and never overflows its cell. The content grows to fit rather than scrolling.',
      render: () => (
        <div className="w-[320px] overflow-hidden rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
          <AccordionSection title="חיישנים (9)" icon={Radar} defaultOpen>
            <div className="grid w-full grid-cols-2 gap-x-4 py-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <TelemetryRow key={i} label={`חיישן ${i + 1}`} value={`${((i + 1) * 0.3).toFixed(1)} km`} />
              ))}
            </div>
          </AccordionSection>
        </div>
      ),
    },
  ],
};
