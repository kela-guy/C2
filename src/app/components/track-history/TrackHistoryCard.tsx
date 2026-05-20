/**
 * Expandable card for one closed `HistoricalTrack` in the Track
 * History panel. Wraps `TargetCard` so the chrome matches live
 * targets, but skips `CardActions` / `CardClosure` / `CardMedia` /
 * `CardTimeline` — closed tracks have nothing to act on.
 *
 * Two telemetry blocks live inside:
 *   - "Track summary": invariant — peak confidence, start/end
 *     telemetry, Phase-1 PRD must-haves that don't change as the
 *     scrubber moves.
 *   - "Telemetry — at this moment": sampled at `viewedAtMs`. This
 *     is the read-out the operator scrubs against.
 *
 * Edge ribbon appears when the scrubber is parked outside the
 * track's `[startedAt, endedAt]` window so the card never looks
 * frozen for unexplained reasons.
 *
 * Header click toggles the card AND rewinds the global scrubber to
 * the track's start (single source of "selection" — consumer wires
 * `onToggle` to the same handler that drives the time machine).
 */

import {
  TargetCard,
  CardHeader,
  CardDetails,
  CardSensors,
  CardLog,
  StatusChip,
  AccordionSection,
  type ThreatAccent,
  type DetailRow,
  type CardSensor,
  type LogEntry,
  type StatusChipColor,
} from '@/primitives';
import {
  Plane,
  Ship,
  Target,
  Radar,
} from '@/lib/icons/central';
import { DroneCardIcon, MissileCardIcon, CarCardIcon } from '@/primitives/MapIcons';
import { accentHex, slateHex } from '@/primitives/accentHex';
import { useStrings } from '@/lib/intl';
import { formatUtm } from '@/lib/geo/utm';
import { useViewedAt } from '@/app/state/ViewedAtContext';
import {
  sampleAt,
  peakConfidence,
  firstSnapshot,
  lastSnapshot,
} from './types';
import { formatClock, formatDuration, formatRelativeMs } from './time';
import type { HistoricalTrack, KillReason, TrackClassification } from './types';
import type { Affiliation } from '@/primitives/markerStyles';

interface TrackHistoryCardProps {
  track: HistoricalTrack;
  open: boolean;
  onToggle: () => void;
}

const KILL_CHIP_COLOR: Record<KillReason, StatusChipColor> = {
  mitigated: 'green',
  no_more_detections: 'red',
  dropped: 'orange',
  timeout: 'gray',
};

const KILL_ACCENT: Record<KillReason, ThreatAccent> = {
  mitigated: 'resolved',
  no_more_detections: 'expired',
  dropped: 'expired',
  timeout: 'idle',
};

const AFFILIATION_ICON_COLOR: Record<Affiliation, string> = {
  hostile: accentHex('danger'),
  friendly: accentHex('success'),
  possibleThreat: accentHex('warning'),
  neutral: slateHex(9),
  unknown: slateHex(9),
};

function classificationIcon(cls: TrackClassification) {
  switch (cls) {
    case 'uav': return DroneCardIcon;
    case 'missile': return MissileCardIcon;
    case 'ground_vehicle': return CarCardIcon;
    case 'naval': return Ship;
    case 'aircraft': return Plane;
    case 'unknown': return Target;
  }
}

function formatFix(lat: number, lon: number, altitude: number): string {
  return `${formatUtm(lat, lon)} | ${Math.round(altitude)} m`;
}

function rawLatLon(lat: number, lon: number): string {
  return `${lat}, ${lon}`;
}

export function TrackHistoryCard({ track, open, onToggle }: TrackHistoryCardProps) {
  const strings = useStrings().trackHistory;
  const viewedAt = useViewedAt();
  const tMs = Math.max(
    0,
    Math.min(track.durationMs, viewedAt.viewedAtMs - track.startedAt),
  );
  const snap = sampleAt(track, tMs);

  const typeLabel = strings.classification[track.classification];
  const killLabel = strings.killReason[track.killReason];
  const startTime = formatClock(track.startedAt);
  const duration = formatDuration(track.durationMs);

  const peak = peakConfidence(track);
  const start = firstSnapshot(track);
  const end = lastSnapshot(track);

  const summaryRows: DetailRow[] = [
    {
      label: strings.card.summary.startTelemetry,
      value: formatFix(start.position.lat, start.position.lon, start.altitude),
      copyValue: rawLatLon(start.position.lat, start.position.lon),
    },
    {
      label: strings.card.summary.endTelemetry,
      value: formatFix(end.position.lat, end.position.lon, end.altitude),
      copyValue: rawLatLon(end.position.lat, end.position.lon),
    },
    {
      label: strings.card.summary.peakConfidence,
      value: `${Math.round(peak * 100)}%`,
    },
  ];

  // Surface the scrubber's offset against the track window as an
  // extra summary row instead of a separate ribbon — operators
  // scanning the card don't need to context-switch between two
  // different chrome shapes to learn "why is this frozen".
  const edgeRow = computeEdgeRow(track, viewedAt.viewedAtMs, strings);
  if (edgeRow) summaryRows.push(edgeRow);

  const liveRows: DetailRow[] = [
    {
      label: strings.card.details.position,
      value: formatFix(snap.position.lat, snap.position.lon, snap.altitude),
      copyValue: rawLatLon(snap.position.lat, snap.position.lon),
    },
    {
      label: strings.card.details.classification,
      value: typeLabel,
    },
    {
      label: strings.card.details.confidence,
      value: `${Math.round(snap.confidence * 100)}%`,
    },
  ];

  const sensors: CardSensor[] = snap.sensors.map((s) => ({
    id: s.id,
    typeLabel: s.typeLabel,
    distanceLabel: `${Math.round(s.distanceMeters)} m`,
    detectedAt: formatClock(track.startedAt + s.firstDetectedAtMs),
  }));

  const log: LogEntry[] = track.actionLog
    .filter((entry) => entry.tMs <= tMs)
    .map((entry) => ({
      time: formatClock(track.startedAt + entry.tMs),
      label: entry.label,
    }));

  return (
    <TargetCard
      accent={KILL_ACCENT[track.killReason]}
      open={open}
      onToggle={onToggle}
      header={
        <CardHeader
          icon={classificationIcon(track.classification)}
          iconColor={AFFILIATION_ICON_COLOR[track.affiliation]}
          iconBgActive={track.affiliation === 'hostile'}
          title={track.callsign}
          subtitle={`${startTime} · ${duration}`}
          status={<StatusChip label={killLabel} color={KILL_CHIP_COLOR[track.killReason]} />}
          open={open}
        />
      }
    >
      <CardDetails
        rows={summaryRows}
        title={strings.card.summaryTitle}
        copyLabel={strings.card.copyTelemetry}
        defaultOpen
        cols={2}
      />

      <CardDetails
        rows={liveRows}
        title={strings.card.liveTelemetryTitle}
        copyLabel={strings.card.copyTelemetry}
        cols={2}
      />

      {sensors.length > 0 && (
        <AccordionSection title={strings.card.sensorsTitle(sensors.length)} icon={Radar}>
          <div className="px-0 pb-2 w-full pt-2">
            <CardSensors sensors={sensors} label="" />
          </div>
        </AccordionSection>
      )}

      <CardLog
        entries={log}
        title={strings.card.logTitle}
        moreLabel={strings.card.logMore}
      />
    </TargetCard>
  );
}

type TrackHistoryStrings = ReturnType<typeof useStrings>['trackHistory'];

function computeEdgeRow(
  track: HistoricalTrack,
  viewedAtMs: number,
  strings: TrackHistoryStrings,
): DetailRow | null {
  if (viewedAtMs < track.startedAt) {
    return {
      label: strings.card.summary.trackStartsIn,
      value: formatRelativeMs(track.startedAt - viewedAtMs),
    };
  }
  if (viewedAtMs > track.endedAt) {
    return {
      label: strings.card.summary.trackEnded,
      value: formatClock(track.endedAt),
    };
  }
  return null;
}
