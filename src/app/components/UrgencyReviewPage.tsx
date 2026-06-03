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
  ActivityTimestampChip,
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
  UnknownIcon,
  HumanIcon,
  HumanCardIcon,
  UNKNOWN_GRAY,
  type Severity,
} from '@/primitives';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import type { Detection } from '@/imports/ListOfSystems';
import { DroneIcon } from './TacticalMap';
import { useCardSlots, type CardCallbacks } from '@/imports/useCardSlots';
import { getCreatedAtMs } from '@/imports/useActivityStatus';
import {
  cuas_possible_threat,
  cuas_classified,
  cuas_mitigating,
  cuas_bda_complete,
  cuas_raw,
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
  /**
   * Synthetic "seconds since detection" for the recency dot. The mock
   * timestamps are hours old (everything would land in the stale/gray bucket),
   * so the review surface assigns ages that exercise each color tier.
   */
  dotAgeSec: number;
}

const SEVERITY_FIXTURES: SeverityFixture[] = [
  { key: 'critical', severity: 'CRITICAL', target: cuas_mitigating, dotAgeSec: 5 },
  { key: 'high', severity: 'HIGH', target: cuas_classified, dotAgeSec: 60 },
  { key: 'medium', severity: 'MEDIUM', target: cuas_possible_threat, dotAgeSec: 200 },
  { key: 'low', severity: 'LOW', target: cuas_bda_complete, dotAgeSec: 600 },
];

// ── Entity selector ────────────────────────────────────────────────────
//
// The shape (drone / car / tank / truck) is orthogonal to severity —
// any entity can sit at any tier. The selector therefore swaps ONLY
// the rendered glyph and the card title, never the underlying fixture.

type EntityKey = 'drone' | 'car' | 'tank' | 'truck' | 'human';

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
  human: {
    key: 'human',
    label: 'אדם',
    cardIcon: HumanCardIcon,
    renderMarker: (color) => <HumanIcon color={color} />,
    cardName: 'אדם',
  },
};

const ENTITY_ORDER: EntityKey[] = ['drone', 'car', 'tank', 'truck', 'human'];

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

// ── Friendly affiliation ───────────────────────────────────────────────
//
// Friendly entities aren't threats — they sit on the affiliation axis, not
// the severity axis. The friendly row paints the icon, badge, and marker in a
// cyan/teal accent so it reads as "friendly / own forces" at a glance.

const FRIENDLY_TEAL = '#2dd4bf';

function FriendlyBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 font-['Heebo'] text-[12px] font-semibold tracking-normal text-white/90"
      data-handoff-component="affiliation-badge"
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: FRIENDLY_TEAL }}
        aria-hidden="true"
      />
      ידידותי
    </span>
  );
}

// ── Unidentified (sensor-only) ─────────────────────────────────────────
//
// A bare sensor blip a radar/EO sensor has localized but no camera has
// classified yet. It carries no identity and no urgency color — both card
// and marker render gray with the question-mark glyph until classification
// lands. This is the affiliation-axis "unknown" tier.

function UnknownBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 font-['Heebo'] text-[12px] font-semibold tracking-normal text-white/90"
      data-handoff-component="affiliation-badge"
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: UNKNOWN_GRAY }}
        aria-hidden="true"
      />
      לא מזוהה
    </span>
  );
}

// ── Status chip ────────────────────────────────────────────────────────
//
// Recency-driven dot: the color AND the text vary by how long ago the target
// was detected.
//   red    — less than 10 seconds   (just detected)
//   yellow — more than 10 seconds   (recently active)
//   gray   — more than 5 minutes    (stale)
// The timestamp stays the visible text; the bucket phrase is the tooltip /
// aria-label.

const RECENT_THRESHOLD_SEC = 10;
const STALE_THRESHOLD_SEC = 5 * 60;

function recencyDotFromAgeSec(ageSec: number): { color: 'red' | 'orange' | 'gray'; label: string } {
  if (ageSec < RECENT_THRESHOLD_SEC) return { color: 'red', label: 'פחות מ-10 שניות' };
  if (ageSec < STALE_THRESHOLD_SEC) return { color: 'orange', label: 'יותר מ-10 שניות' };
  return { color: 'gray', label: 'יותר מ-5 דקות' };
}

function buildStatusChip(target: Detection, ageSec?: number) {
  // Use the explicit demo age when provided; otherwise fall back to the real
  // elapsed time since detection.
  const effectiveAge = ageSec ?? Math.max(0, (Date.now() - getCreatedAtMs(target)) / 1000);
  const { color, label } = recencyDotFromAgeSec(effectiveAge);
  return (
    <ActivityTimestampChip
      timestamp={target.timestamp}
      color={color}
      statusLabel={label}
    />
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
                status={buildStatusChip(target, fixture.dotAgeSec)}
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

// ── Friendly row ───────────────────────────────────────────────────────
//
// A friendly entity rendered on the cyan/teal accent (icon + badge + marker),
// plus a multi-color activity-dot showcase demonstrating one dot per status
// color with distinct text.

function FriendlyRow({ entity }: { entity: EntityOption }) {
  const slots = useCardSlots(cuas_classified, REVIEW_NOOP_CALLBACKS);

  // Teal marker — friendly affiliation rendered on the cyan/teal accent
  // rather than a severity color.
  const markerStyle = useMemo(() => {
    const base = resolveTargetMarkerStyle(cuas_classified, 'default');
    return {
      ...base,
      surfaceFill: FRIENDLY_TEAL,
      innerGlowColor: FRIENDLY_TEAL,
      ringColor: FRIENDLY_TEAL,
      glyphColor: FRIENDLY_TEAL,
    };
  }, []);

  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-6 rounded-[10px] border border-white/[0.06] bg-white/[0.015] p-4"
      data-handoff-component="urgency-friendly-row"
    >
      <div className="flex flex-col items-start justify-start gap-2">
        <FriendlyBadge />

        <div className="w-full max-w-[360px]">
          <TargetCard
            severity="LOW"
            completed={slots.completed}
            open={false}
            onToggle={() => {
              /* review surface — open state intentionally inert */
            }}
            header={
              <CardHeader
                {...slots.header}
                icon={entity.cardIcon}
                iconColor={FRIENDLY_TEAL}
                iconBgColor={hexToRgba(FRIENDLY_TEAL, 0.12)}
                title={entity.cardName}
                status={buildStatusChip(cuas_classified, 30)}
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

// ── Unidentified row ───────────────────────────────────────────────────
//
// The sensor-only blip (`cuas_raw`: raw_detection, no classifiedType).
// Renders through the same production paths as every other row, so the
// gray question-mark glyph shows up identically in the card header
// (`UnknownCardIcon`, stroke-free) and the map marker (`UnknownIcon`,
// black stroke for legibility). Entity-independent — an unidentified
// track has no shape yet — so it ignores the entity selector.

function UnknownRow() {
  const slots = useCardSlots(cuas_raw, REVIEW_NOOP_CALLBACKS);

  const markerStyle = useMemo(
    () => resolveTargetMarkerStyle(cuas_raw, 'default'),
    [],
  );

  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-6 rounded-[10px] border border-white/[0.06] bg-white/[0.015] p-4"
      data-handoff-component="urgency-unknown-row"
    >
      <div className="flex flex-col items-start justify-start gap-2">
        <UnknownBadge />

        <div className="w-full max-w-[360px]">
          <TargetCard
            severity="LOW"
            completed={slots.completed}
            open={false}
            onToggle={() => {
              /* review surface — open state intentionally inert */
            }}
            header={
              <CardHeader
                {...slots.header}
                iconColor={UNKNOWN_GRAY}
                iconBgColor={hexToRgba(UNKNOWN_GRAY, 0.12)}
                title="לא מזוהה"
                status={buildStatusChip(cuas_raw, 8)}
                open={false}
              />
            }
          />
        </div>
      </div>

      <div className="flex items-center justify-center">
        <MapMarker
          style={markerStyle}
          icon={<UnknownIcon color={markerStyle.glyphColor} />}
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
          <FriendlyRow entity={entity} />
          <UnknownRow />
        </div>
      </div>
    </main>
  );
}
