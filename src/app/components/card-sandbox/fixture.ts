/**
 * Sandbox fixtures for the card-design tuning route.
 *
 * `history` is the seed Track History card composition — same data
 * the live `<TrackHistoryCard>` consumes, just frozen against a
 * fixed `now` so the surface ladder stays the focus.
 *
 * `live` mocks a mid-engagement target with the full slot stack
 * (`CardHeader` + `CardDetails` + `CardSensors` + `CardLog` +
 * `CardActions` + `CardClosure`). Built inline so the sandbox does
 * not have to drag in `useCardSlots`, the simulation, or any
 * production data wiring.
 */

import {
  Ban,
  Eye,
  Radar,
  Send,
  Shield,
  Zap,
} from '@/lib/icons/central';
import { DroneCardIcon } from '@/primitives/MapIcons';
import { accentHex } from '@/primitives/accentHex';
import type {
  CardAction,
  CardSensor,
  ClosureOutcome,
  DetailRow,
  LogEntry,
  ThreatAccent,
} from '@/primitives';
import {
  buildSeedHistoricalTrack,
  type HistoricalTrack,
} from '@/app/components/track-history/historicalTracksFixture';

export type SandboxVariant = 'history' | 'live';

/**
 * Materialize the seed historical track at the supplied `now` epoch.
 * Pure — caller decides when to refresh (e.g. once per mount via
 * `useMemo`). The track's `startedAt` lands ~18 minutes before
 * `now`, mirroring the seed used in the real Track History panel.
 */
export function historyTrack(now: number): HistoricalTrack {
  return buildSeedHistoricalTrack(now);
}

const HOSTILE = accentHex('danger');

export interface LiveFixture {
  accent: ThreatAccent;
  header: {
    icon: typeof DroneCardIcon;
    iconColor: string;
    title: string;
    subtitle: string;
    statusLabel: string;
  };
  summaryRows: DetailRow[];
  sensors: CardSensor[];
  log: LogEntry[];
  actions: CardAction[];
  closure: ClosureOutcome[];
}

export const liveFixture: LiveFixture = {
  accent: 'active',
  header: {
    icon: DroneCardIcon,
    iconColor: HOSTILE,
    title: 'רחפן חשוד',
    subtitle: 'DJI Mavic 3 · T-014',
    statusLabel: 'active',
  },
  summaryRows: [
    { label: 'מיקום', value: '687985 / 3594214', copyValue: '32.48300, 35.02600' },
    { label: 'גובה', value: '198 m' },
    { label: 'מהירות', value: '32 m/s' },
    { label: 'ביטחון', value: '87%' },
  ],
  sensors: [
    { id: 'SENS-N', typeLabel: 'Radar — North', distanceLabel: '4.2 km', detectedAt: '13:32' },
    { id: 'RAD-A',  typeLabel: 'RF spectrum',    distanceLabel: '1.9 km', detectedAt: '13:33' },
    { id: 'CAM-N',  typeLabel: 'EO/IR camera',   distanceLabel: '1.4 km', detectedAt: '13:35' },
  ],
  log: [
    { time: '13:32', label: 'זוהה — מכ"ם צפון' },
    { time: '13:33', label: 'סווג כרחפן' },
    { time: '13:34', label: 'סווג כרחפן ארבע-להב' },
    { time: '13:35', label: 'מבצע נדרש — שיבוש' },
  ],
  actions: [
    {
      id: 'jam',
      label: 'שבש',
      icon: Zap,
      variant: 'danger',
      group: 'primary',
      onClick: () => {},
    },
    {
      id: 'investigate',
      label: 'חקירה',
      icon: Eye,
      group: 'secondary',
      onClick: () => {},
    },
    {
      id: 'send-drone',
      label: 'שלח רחפן',
      icon: Send,
      group: 'secondary',
      onClick: () => {},
    },
  ],
  closure: [
    { id: 'neutralized', label: 'נוטרל',  icon: Shield },
    { id: 'lost',        label: 'אבד',    icon: Radar },
    { id: 'false',       label: 'התראת שווא', icon: Ban },
  ],
};
