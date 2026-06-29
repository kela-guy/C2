/**
 * Pathfinder takeoff sequence model — the single source of truth for the
 * launch flow, shared by the production Dashboard wiring and the
 * `/pathfinder-sandbox` design surface.
 *
 * The launch has three operator-facing phases:
 *   1. `prepare`  — automatic pre-flight (steps 1–16), ends gated on a
 *                   "Takeoff" confirmation the operator must click.
 *   2. `takeoff`  — automatic deploy + departure (steps 17–23). The final
 *                   step is an open-ended loiter that stays active until the
 *                   operator commands return-to-base.
 *   3. `return`   — RTB back to the station.
 *
 * Strings ship both locales (HE + EN) inline so this stays self-contained.
 */

export type LaunchPhase = 'prepare' | 'takeoff' | 'return';

/**
 * Fixed per-step dwell for the launch simulation, in milliseconds. Locked so
 * the operator-facing pacing is identical everywhere the sequence runs.
 */
export const PATHFINDER_LAUNCH_SPEED_MS = 1500;

/**
 * `gate`     — a confirmation/verification checkpoint (system self-check).
 * `optional` — may be skipped depending on the mission/flow.
 * `check`    — a normal action step.
 */
export type StepKind = 'check' | 'gate' | 'optional';

export type StepStatus = 'pending' | 'active' | 'done' | 'error';

export interface LaunchStep {
  id: string;
  phase: LaunchPhase;
  kind: StepKind;
  /** Operator-facing label per locale. */
  label: { en: string; he: string };
}

/**
 * Steps 1–16. Runs automatically; the toast surfaces a "Takeoff" CTA once the
 * last step (`gps-ok`) resolves.
 */
export const PREPARE_STEPS: LaunchStep[] = [
  { id: 'validate-links', phase: 'prepare', kind: 'check', label: { en: 'Validate links', he: 'אימות קשר' } },
  { id: 'require-docked', phase: 'prepare', kind: 'check', label: { en: 'Require docked', he: 'דרישת עגינה' } },
  { id: 'unlock-wing-tail', phase: 'prepare', kind: 'check', label: { en: 'Unlock wing/tail mechanism', he: 'שחרור נעילת כנף/זנב' } },
  { id: 'gate-wing-tail-unlocked', phase: 'prepare', kind: 'gate', label: { en: 'Confirm wing/tail unlocked', he: 'אישור שחרור כנף/זנב' } },
  { id: 'open-hub-doors', phase: 'prepare', kind: 'check', label: { en: 'Open hub doors', he: 'פתיחת דלתות התא' } },
  { id: 'lower-pad', phase: 'prepare', kind: 'check', label: { en: 'Lower pad', he: 'הורדת משטח' } },
  { id: 'release-battery-latches', phase: 'prepare', kind: 'check', label: { en: 'Release battery latches', he: 'שחרור תפסי סוללה' } },
  { id: 'gate-battery-latches', phase: 'prepare', kind: 'gate', label: { en: 'Confirm battery latches released', he: 'אישור שחרור תפסי סוללה' } },
  { id: 'preflight-ok', phase: 'prepare', kind: 'check', label: { en: 'Preflight OK', he: 'בדיקת טרום־טיסה תקינה' } },
  { id: 'upload-mission', phase: 'prepare', kind: 'optional', label: { en: 'Upload mission', he: 'העלאת משימה' } },
  { id: 'pitot-cal', phase: 'prepare', kind: 'check', label: { en: 'Pitot calibration', he: 'כיול פיטו' } },
  { id: 'confirm-pitot', phase: 'prepare', kind: 'gate', label: { en: 'Confirm pitot calibration', he: 'אישור כיול פיטו' } },
  { id: 'prepare-takeoff', phase: 'prepare', kind: 'check', label: { en: 'Prepare takeoff (hub fault check)', he: 'הכנה להמראה (בדיקת תקלות תא)' } },
  { id: 'lock-wing-tail', phase: 'prepare', kind: 'check', label: { en: 'Lock wing/tail mechanism', he: 'נעילת כנף/זנב' } },
  { id: 'gate-wing-tail-locked', phase: 'prepare', kind: 'gate', label: { en: 'Confirm wing/tail locked', he: 'אישור נעילת כנף/זנב' } },
  { id: 'gps-ok', phase: 'prepare', kind: 'check', label: { en: 'GPS OK', he: 'GPS תקין' } },
];

/**
 * Steps 17–23. Runs automatically after the operator confirms takeoff. The
 * final `loiter` step is open-ended — it stays `active` until RTB is commanded.
 */
export const TAKEOFF_STEPS: LaunchStep[] = [
  { id: 'deploy-uav', phase: 'takeoff', kind: 'check', label: { en: 'Deploy UAV (hub)', he: 'שליפת כטב״ם' } },
  { id: 'wait-deploy-clear', phase: 'takeoff', kind: 'gate', label: { en: 'Wait deploy clear', he: 'המתנה לשחרור שליפה' } },
  { id: 'apply-guard-flags', phase: 'takeoff', kind: 'check', label: { en: 'Apply guard flags (flight allowed)', he: 'החלת דגלי בטיחות (טיסה מותרת)' } },
  { id: 'execute-takeoff', phase: 'takeoff', kind: 'check', label: { en: 'Execute takeoff and wait', he: 'ביצוע המראה והמתנה' } },
  { id: 'detect-departure', phase: 'takeoff', kind: 'gate', label: { en: 'Detect departure', he: 'זיהוי עזיבה' } },
  { id: 'close-station', phase: 'takeoff', kind: 'optional', label: { en: 'Close station', he: 'סגירת תחנה' } },
  { id: 'loiter', phase: 'takeoff', kind: 'check', label: { en: 'Waiting loiter', he: 'המתנה בהקפה' } },
];

/**
 * Return-to-base. Triggered from the open-ended loiter state.
 */
export const RETURN_STEPS: LaunchStep[] = [
  { id: 'return-station', phase: 'return', kind: 'check', label: { en: 'Return to station', he: 'חזרה לתחנה' } },
  { id: 'redock-secure', phase: 'return', kind: 'check', label: { en: 'Re-dock & secure', he: 'עגינה ואבטחה' } },
];

/** The id of the open-ended loiter step (active until RTB is commanded). */
export const LOITER_STEP_ID = 'loiter';

export type Locale = 'he' | 'en';

export const SEQUENCE_STRINGS = {
  title: { en: 'Pathfinder', he: 'פתפיינדר' },
  phaseLabel: {
    prepare: { en: 'Preparing for launch', he: 'מתכונן להמראה' },
    ready: { en: 'Ready for takeoff', he: 'מוכן להמראה' },
    takeoff: { en: 'Taking off', he: 'ממריא' },
    loiter: { en: 'On station · loiter', he: 'בתצפית · הקפה' },
    returning: { en: 'Returning to station', he: 'חוזר לתחנה' },
    done: { en: 'Docked', he: 'עוגן' },
    error: { en: 'Launch halted', he: 'ההמראה נעצרה' },
    aborted: { en: 'Launch aborted', he: 'ההמראה בוטלה' },
  },
  takeoff: { en: 'Takeoff', he: 'המראה' },
  returnToBase: { en: 'Return to dock', he: 'חזרה לעגינה' },
  retry: { en: 'Retry', he: 'נסה שוב' },
  abort: { en: 'Stop', he: 'עצור' },
  cancel: { en: 'Cancel', he: 'ביטול' },
  showSteps: { en: 'Show steps', he: 'הצגת שלבים' },
  hideSteps: { en: 'Hide steps', he: 'הסתרת שלבים' },
  gate: { en: 'GATE', he: 'שער' },
  optional: { en: 'OPTIONAL', he: 'רשות' },
  stepCounter: (n: number, total: number, locale: Locale) =>
    locale === 'he' ? `שלב ${n}/${total}` : `Step ${n}/${total}`,
  dismiss: { en: 'Dismiss', he: 'סגירה' },
} as const;
