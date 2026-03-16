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
}

export function CardDetails({
  rows,
  classification,
  defaultOpen = true,
  className = '',
}: CardDetailsProps) {
  if (rows.length === 0 && !classification) return null;

  const copyAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = rows.map((r) => `${r.label}: ${r.value}`).join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <AccordionSection title="פרטים" defaultOpen={defaultOpen} icon={Eye} className={className}>
      <div className="py-1">
        {classification && (
          <div
            className="flex items-center justify-between px-1 pb-2 mb-2 border-b border-white/5"
            dir="rtl"
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-[13px] font-bold ${classification.colorClass ?? 'text-zinc-300'}`}
              >
                {classification.typeLabel}
              </span>
              <span className="text-[10px] text-zinc-400">מסווג</span>
            </div>
            {classification.confidence != null && (
              <span
                className={`text-[12px] font-bold font-mono tabular-nums ${
                  classification.confidence >= 80
                    ? (classification.colorClass ?? 'text-zinc-400')
                    : 'text-zinc-400'
                }`}
              >
                {classification.confidence}%
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 grid-rows-2 group/copy relative">
          {rows.map((row, idx) => (
            <TelemetryRow key={idx} label={row.label} value={row.value} icon={row.icon} />
          ))}
          <button
            onClick={copyAll}
            className="absolute top-0.5 left-0.5 opacity-0 group-hover/copy:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
            aria-label="העתק טלמטריה"
            title="העתק טלמטריה"
          >
            <Copy size={12} className="text-zinc-400" />
          </button>
        </div>
      </div>
    </AccordionSection>
  );
}
