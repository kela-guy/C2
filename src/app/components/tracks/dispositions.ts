import type { Detection, DetectionType } from '@/imports/ListOfSystems';
import { dispositionHex } from '@/primitives/accentHex';

export type DispositionKey = 'suspect' | 'assumedFriend' | 'neutral';

export interface DispositionDef {
  key: DispositionKey;
  label: string;
  /**
   * Disposition color for SVG fill/stroke attrs (Triangle marker)
   * and inline `color` styles. Sourced from accentHex.ts so the
   * JS-side palette stays in lockstep with the --disposition-*
   * tokens in src/styles/palette.css (which CSS-context consumers
   * — bg-disposition-* utilities, etc. — read directly).
   *
   * Why hex rather than `var(--disposition-...)`? SVG presentation
   * attributes set via XML (`<svg fill="...">`) do NOT resolve CSS
   * custom properties — they only do so when applied via CSS rules.
   * Components that take `disposition.color` as a `fill` / `stroke`
   * prop need a literal color value.
   */
  color: string;
}

/*
 * Disposition is an OPERATOR LABEL (suspect / assumed-friend /
 * neutral) — semantically distinct from severity accents. Keeping
 * --disposition-* tokens independent of --accent-* means a severity
 * tone change (e.g. softening --accent-warning) doesn't drift the
 * suspect color and vice versa.
 */
export const DISPOSITIONS: Record<DispositionKey, DispositionDef> = {
  suspect: { key: 'suspect', label: 'Suspect', color: dispositionHex('suspect') },
  assumedFriend: { key: 'assumedFriend', label: 'Assumed Friend', color: dispositionHex('assumedFriend') },
  neutral: { key: 'neutral', label: 'Neutral', color: dispositionHex('neutral') },
};

/** Iteration order for rendering disposition groups top-to-bottom. */
export const DISPOSITION_ORDER: readonly DispositionKey[] = [
  'suspect',
  'assumedFriend',
  'neutral',
] as const;

/**
 * PLACEHOLDER mapping until the Detection model gains a real `disposition`
 * field. CUAS detections are bucketed by their `type` so that all three
 * group headers populate during the mock pass — combat-class types read as
 * Suspect, civil-airspace types as Assumed Friend, and ambiguous ground /
 * unknown contacts as Neutral. Replace once the backend ships
 * disposition.
 */
export function dispositionForTarget(target: Detection): DispositionKey {
  return dispositionForType(target.type);
}

function dispositionForType(type: DetectionType): DispositionKey {
  switch (type) {
    case 'uav':
    case 'missile':
      return 'suspect';
    case 'aircraft':
    case 'naval':
      return 'assumedFriend';
    case 'ground_vehicle':
    case 'unknown':
      return 'neutral';
  }
}

/** Uppercase type label rendered above the title (e.g. "UAV", "GROUND VEHICLE"). */
export function typeLabelForTarget(target: Detection): string {
  switch (target.type) {
    case 'uav':
      return 'UAV';
    case 'missile':
      return 'MISSILE';
    case 'aircraft':
      return 'AIRCRAFT';
    case 'naval':
      return 'NAVAL';
    case 'ground_vehicle':
      return 'GROUND VEHICLE';
    case 'unknown':
      return 'UNKNOWN';
  }
}

/**
 * "08:13" formatted from the most recent action log entry, falling back to
 * the detection timestamp. Mirrors the design's "08:13 - Live" status row.
 */
export function statusTimeForTarget(target: Detection): string {
  const lastLog = target.actionLog?.[target.actionLog.length - 1];
  const raw = lastLog?.time ?? target.timestamp;
  const match = raw.match(/(\d{1,2}:\d{2})/);
  return match ? match[1].padStart(5, '0') : raw;
}
