import React from 'react';
import { Eye } from '@/lib/icons/central';
import { AccordionSection } from './AccordionSection';
import { TelemetryRow } from './TelemetryRow';

export interface DetailRow {
  label: string;
  value: string;
  icon?: React.ElementType;
}

export interface CardDetailsClassification {
  type: string;
  typeLabel: string;
  confidence?: number;
  colorClass?: string;
}

export interface CardDetailsProps {
  rows: DetailRow[];
  classification?: CardDetailsClassification;
  defaultOpen?: boolean;
  className?: string;
  /** Section header. Defaults to 'Telemetry'. */
  title?: string;
}

export function CardDetails({
  rows,
  defaultOpen = false,
  className = '',
  title = 'Telemetry',
}: CardDetailsProps) {
  if (rows.length === 0) return null;

  return (
    <AccordionSection title={title} defaultOpen={defaultOpen} icon={Eye} className={className}>
      <div className="w-full py-1">
        {/*
          Fixed 2-col grid. The previous 3-col layout consistently left a
          short trailing cell empty (most detection cards expose 2-3 metrics)
          and the wider columns let long values like "32.46356, 35.00042"
          breathe without wrapping. Per-field copy lives in CardIdentity;
          there is no copy-all affordance here.
        */}
        <div className="w-full grid grid-cols-2 gap-x-8 gap-y-2">
          {rows.map((row, idx) => (
            <TelemetryRow key={idx} label={row.label} value={row.value} icon={row.icon} />
          ))}
        </div>
      </div>
    </AccordionSection>
  );
}
