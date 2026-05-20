import { Eye } from '@/lib/icons/central';
import { AccordionSection } from './AccordionSection';
import { TelemetryRow } from './TelemetryRow';

export interface DetailRow {
  label: string;
  value: string;
  /**
   * Optional payload for click-to-copy on this row. When set, the
   * row's value becomes a button — display stays as `value` (e.g.
   * compact UTM), clipboard receives `copyValue` (e.g. raw lat/lon).
   */
  copyValue?: string;
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
  /**
   * Grid column count for the rows. Defaults to 2 — long Hebrew labels
   * and full-precision values both need more horizontal room than a
   * 3-up grid leaves, so the 2-column form is the standard density.
   * Pick 3 only for sections where values are guaranteed short (e.g.
   * one-glyph status flags).
   */
  cols?: 1 | 2 | 3;
}

const GRID_COLS_CLASS: Record<NonNullable<CardDetailsProps['cols']>, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
};

export function CardDetails({
  rows,
  defaultOpen = false,
  className = '',
  title = 'Telemetry',
  copyLabel = 'Copy',
  cols = 2,
}: CardDetailsProps) {
  if (rows.length === 0) return null;

  return (
    <AccordionSection title={title} defaultOpen={defaultOpen} icon={Eye} className={className}>
      <div className="w-full py-1">
        <div className={`w-full grid ${GRID_COLS_CLASS[cols]} gap-x-8 gap-y-2`}>
          {rows.map((row, idx) => (
            <TelemetryRow
              key={idx}
              label={row.label}
              value={row.value}
              copyValue={row.copyValue}
              copyLabel={copyLabel}
            />
          ))}
        </div>
      </div>
    </AccordionSection>
  );
}
