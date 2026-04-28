import React from 'react';
import { Copy, Eye } from 'lucide-react';
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
  /** aria-label / tooltip for the copy-all button. Defaults to 'Copy'. */
  copyLabel?: string;
}

export function CardDetails({
  rows,
  defaultOpen = false,
  className = '',
  title = 'Telemetry',
  copyLabel = 'Copy',
}: CardDetailsProps) {
  if (rows.length === 0) return null;

  const copyAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = rows.map((r) => `${r.label}: ${r.value}`).join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <AccordionSection title={title} defaultOpen={defaultOpen} icon={Eye} className={className}>
      <div className="w-full py-1">
        <div className="w-full grid grid-cols-3 gap-x-8 gap-y-2 group/copy relative">
          {rows.map((row, idx) => (
            <TelemetryRow key={idx} label={row.label} value={row.value} icon={row.icon} />
          ))}
          <button
            onClick={copyAll}
            className="absolute top-0.5 end-0.5 opacity-0 group-hover/copy:opacity-100 transition-opacity p-1 rounded hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
            aria-label={copyLabel}
            title={copyLabel}
          >
            <Copy size={12} className="text-zinc-400" />
          </button>
        </div>
      </div>
    </AccordionSection>
  );
}
