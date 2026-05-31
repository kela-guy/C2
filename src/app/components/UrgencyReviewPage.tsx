/**
 * Urgency review surface — dedicated route for inspecting the
 * TargetCard ↔ MapMarker handshake against the unified `Severity` model
 * defined in `src/primitives/urgency.ts`.
 *
 * The page is intentionally minimal:
 *   - Four rows, one per severity tier.
 *   - Each row pairs the production card and marker for ONE Detection
 *     fixture, so if the colors disagree, the unification is broken.
 *   - An entity selector at the top swaps the glyph rendered inside
 *     both surfaces (Drone / Car / Tank / Truck). Severity stays
 *     driven by the underlying fixture — entity is orthogonal.
 *
 * Design intent — read alongside `docs/urgency-unification-plan.md`:
 *   - Quiet, tactical chrome. The page recedes; the components carry
 *     the signal.
 *   - Borders-only depth strategy. No shadows on page chrome.
 *   - Mono caps for labels (telemetry language the dashboard already
 *     speaks). Tabular numerals for any counts.
 *   - prefers-reduced-motion respected on tab transitions.
 *   - Layout properties never animated.
 */

import { useId, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import {
  CardHeader,
  MapMarker,
  StatusChip,
  TargetCard,
  resolveTargetMarkerStyle,
  hexToRgba,
  SEVERITY_COLOR,
  SEVERITY_SURFACE_OPACITY,
  SEVERITY_PULSE,
  DroneCardIcon,
  CarCardIcon,
  TankCardIcon,
  TruckCardIcon,
  CarIcon,
  TankIcon,
  TruckIcon,
  type Severity,
} from '@/primitives';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import type { Detection, ActivityStatus } from '@/imports/ListOfSystems';
import { DroneIcon } from './TacticalMap';
import { useCardSlots, type CardCallbacks } from '@/imports/useCardSlots';
import { getActivityStatus } from '@/imports/useActivityStatus';
import {
  cuas_possible_threat,
  cuas_classified,
  cuas_mitigating,
  cuas_bda_complete,
} from '@/test-utils/mockDetections';

const REVIEW_NOOP_CALLBACKS: CardCallbacks = {};

// Hebrew copy for this RTL review surface. Kept local so the shared
// English tokens (SEVERITY_LABEL, etc.) stay untouched for other views.
const SEVERITY_LABEL_HE: Record<Severity, string> = {
  LOW: 'נמוך',
  MEDIUM: 'בינוני',
  HIGH: 'גבוה',
  CRITICAL: 'קריטי',
};

// ── Severity fixtures ──────────────────────────────────────────────────
//
// One Detection per severity tier. The entity selector below swaps
// the *rendered* glyph on top of these fixtures, leaving the data
// (status, mitigation, lifecycle) untouched so `resolveTargetSeverity`
// keeps producing the intended tier regardless of what the operator
// selects.

interface SeverityFixture {
  key: string;
  severity: Severity;
  target: Detection;
}

const SEVERITY_FIXTURES: SeverityFixture[] = [
  { key: 'critical', severity: 'CRITICAL', target: cuas_mitigating },
  { key: 'high', severity: 'HIGH', target: cuas_classified },
  { key: 'medium', severity: 'MEDIUM', target: cuas_possible_threat },
  { key: 'low', severity: 'LOW', target: cuas_bda_complete },
];

// ── Entity selector ────────────────────────────────────────────────────
//
// The shape (drone / car / tank / truck) is orthogonal to severity —
// any entity can sit at any tier. The selector therefore swaps ONLY
// the rendered glyph and the card title, never the underlying fixture.

type EntityKey = 'drone' | 'car' | 'tank' | 'truck';

interface EntityOption {
  key: EntityKey;
  label: string;
  /** Card header glyph. Receives `size` and paints in `currentColor`. */
  cardIcon: ComponentType<{ size?: number }>;
  /** Marker glyph. Closes over the severity-driven color. */
  renderMarker: (color: string) => ReactNode;
  /** Card title — neutral entity label so the row reads as "entity at tier". */
  cardName: string;
}

const ENTITY_OPTIONS: Record<EntityKey, EntityOption> = {
  drone: {
    key: 'drone',
    label: 'רחפן',
    cardIcon: DroneCardIcon,
    renderMarker: (color) => <DroneIcon color={color} rotationDeg={0} />,
    cardName: 'רחפן',
  },
  car: {
    key: 'car',
    label: 'רכב',
    cardIcon: CarCardIcon,
    renderMarker: (color) => <CarIcon color={color} />,
    cardName: 'רכב',
  },
  tank: {
    key: 'tank',
    label: 'טנק',
    cardIcon: TankCardIcon,
    renderMarker: (color) => <TankIcon color={color} />,
    cardName: 'טנק',
  },
  truck: {
    key: 'truck',
    label: 'משאית',
    cardIcon: TruckCardIcon,
    renderMarker: (color) => <TruckIcon color={color} />,
    cardName: 'משאית',
  },
};

const ENTITY_ORDER: EntityKey[] = ['drone', 'car', 'tank', 'truck'];

// ── Visual atoms ───────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: Severity }) {
  const color = SEVERITY_COLOR[severity];
  const pulses = SEVERITY_PULSE[severity];
  return (
    <span
      className="inline-flex items-center gap-1.5 font-['Heebo'] text-[12px] font-semibold tracking-normal text-white/90"
      data-handoff-component="severity-badge"
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full${pulses ? ' motion-safe:animate-pulse' : ''}`}
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {SEVERITY_LABEL_HE[severity]}
    </span>
  );
}

// ── Status chip ────────────────────────────────────────────────────────
//
// Same derivation the dashboard uses (`getActivityStatus`) so the
// review surface stays faithful to the real card. The chip surfaces
// *how recently the target was seen / whether it's been handled* —
// Active / Recently active / Timed out / Handled / Dismissed. Urgency
// tier lives on a separate channel (the icon glyph + surface color).

const ACTIVITY_STATUS_CHIP_COLOR: Record<ActivityStatus, 'green' | 'red' | 'orange' | 'gray'> = {
  active: 'green',
  recently_active: 'orange',
  timeout: 'gray',
  dismissed: 'gray',
  mitigated: 'green',
};

const ACTIVITY_STATUS_LABEL: Record<ActivityStatus, string> = {
  active: 'פעיל',
  recently_active: 'פעיל לאחרונה',
  timeout: 'פג תוקף',
  dismissed: 'נדחה',
  mitigated: 'טופל',
};

function buildStatusChip(target: Detection) {
  const status = getActivityStatus(target);
  return (
    <StatusChip label={ACTIVITY_STATUS_LABEL[status]} color={ACTIVITY_STATUS_CHIP_COLOR[status]} />
  );
}

// ── Handshake row ──────────────────────────────────────────────────────
//
// The validation surface: each row is ONE Detection that fans out to
// BOTH the card and the marker using the production code paths
// (`useCardSlots` → TargetCard, `resolveTargetMarkerStyle` →
// MapMarker). If card and marker disagree visually here, the
// unification is broken.

function HandshakeRow({
  fixture,
  entity,
}: {
  fixture: SeverityFixture;
  entity: EntityOption;
}) {
  const { target } = fixture;
  const slots = useCardSlots(target, REVIEW_NOOP_CALLBACKS);
  const severity = slots.severity;

  // 'default' is the dashboard's resting state for a target marker.
  // Using the same interaction across rows isolates severity as the
  // only variable driving color differences.
  const markerStyle = useMemo(
    () => resolveTargetMarkerStyle(target, 'default'),
    [target],
  );

  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-6 rounded-[10px] border border-white/[0.06] bg-white/[0.015] p-4"
      data-handoff-component="urgency-handshake-row"
    >
      <div className="flex flex-col items-start justify-start gap-2">
        <div className="flex flex-col gap-1">
          <SeverityBadge severity={severity} />
          {severity !== fixture.severity && (
            <div className="font-['Heebo'] text-[11px] text-amber-400/90">
              ⚠ מסתכם ל־{SEVERITY_LABEL_HE[severity]}
            </div>
          )}
        </div>

        <div className="w-full max-w-[360px]">
          <TargetCard
            severity={severity}
            completed={slots.completed}
            open={false}
            onToggle={() => {
              /* review surface — open state intentionally inert */
            }}
            header={
              <CardHeader
                {...slots.header}
                icon={entity.cardIcon}
                iconColor={SEVERITY_COLOR[severity]}
                iconBgColor={hexToRgba(
                  SEVERITY_COLOR[severity],
                  SEVERITY_SURFACE_OPACITY[severity],
                )}
                title={entity.cardName}
                status={buildStatusChip(target)}
                open={false}
              />
            }
          />
        </div>
      </div>

      <div className="flex items-center justify-center">
        <MapMarker
          style={markerStyle}
          icon={entity.renderMarker(markerStyle.glyphColor)}
          surfaceSize={44}
          ringSize={36}
        />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────

export default function UrgencyReviewPage() {
  const [entityKey, setEntityKey] = useState<EntityKey>('drone');
  const entity = ENTITY_OPTIONS[entityKey];
  const headingId = useId();

  return (
    // RTL Hebrew review surface. Components inside still render their
    // own internal direction; the page chrome reads right-to-left.
    <main
      dir="rtl"
      lang="he"
      className="min-h-screen bg-[#0a0a0a] text-white font-['Heebo']"
      aria-labelledby={headingId}
    >
      <header className="border-b border-white/[0.06] px-6 py-5">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4">
          <h1
            id={headingId}
            className="font-['Heebo'] text-sm font-semibold text-white/80"
          >
            סקירת דחיפות
          </h1>

          <div className="flex items-center gap-2">
            <span className="font-['Heebo'] text-xs font-medium text-white/40">
              ישות
            </span>
            <Select
              dir="rtl"
              value={entityKey}
              onValueChange={(v) => setEntityKey(v as EntityKey)}
            >
              <SelectTrigger
                size="sm"
                className="w-[140px] border-white/10 bg-white/[0.03] text-xs text-white hover:bg-white/[0.06] focus-visible:ring-white/20"
              >
                <SelectValue placeholder="ישות" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-zinc-900 text-white">
                {ENTITY_ORDER.map((key) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    {ENTITY_OPTIONS[key].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-6 py-6">
        <div className="flex flex-col gap-3">
          {SEVERITY_FIXTURES.map((fixture) => (
            <HandshakeRow key={fixture.key} fixture={fixture} entity={entity} />
          ))}
        </div>
      </div>
    </main>
  );
}
