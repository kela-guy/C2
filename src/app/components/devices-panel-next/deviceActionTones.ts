/**
 * Semantic tones for the unified `DeviceAction`.
 *
 * Color carries meaning, consistently, across every device control:
 *   - neutral : idle utility actions (center on map, calibrate, off states)
 *   - engaged : a destination-style "this is now wired in" state (speaker playing)
 *   - caution : a deliberately-altered local state (mute, floodlight on)
 *   - danger  : irreversible / effector actions (ECM jam)
 *
 * Each tone exposes three surfaces so one primitive covers both the
 * filled footer bar and the ghost header cluster:
 *   - base      : solid idle (footer action bar)
 *   - ghostBase : transparent idle (inline header cluster)
 *   - pressed   : active / toggled-on
 */

export type DeviceActionTone = 'neutral' | 'engaged' | 'caution' | 'danger';

export interface DeviceActionToneClasses {
  base: string;
  ghostBase: string;
  pressed: string;
}

const NEUTRAL_GHOST = 'text-white/70 hover:bg-white/10 hover:text-white/90';

export const DEVICE_ACTION_TONES: Record<DeviceActionTone, DeviceActionToneClasses> = {
  neutral: {
    base: 'text-white/70 bg-white/[0.06] hover:bg-white/10 hover:text-white/90',
    ghostBase: NEUTRAL_GHOST,
    pressed: 'text-white bg-white/15 hover:bg-white/20',
  },
  engaged: {
    base: 'text-sky-200 bg-sky-500/15 hover:bg-sky-500/25',
    ghostBase: 'text-white/70 hover:bg-white/10 hover:text-white',
    pressed: 'text-sky-100 bg-sky-500/30 ring-1 ring-inset ring-sky-300/45 hover:bg-sky-500/40',
  },
  caution: {
    base: 'text-white/70 bg-white/[0.06] hover:bg-white/10 hover:text-white/90',
    ghostBase: NEUTRAL_GHOST,
    pressed: 'text-amber-400 bg-amber-500/15 hover:bg-amber-500/25',
  },
  danger: {
    base: 'text-[oklch(0.927_0.062_17)] bg-[oklch(0.348_0.111_17)] ring-1 ring-inset ring-[oklch(0.348_0.111_17_/_0.4)] hover:bg-[oklch(0.445_0.151_17)]',
    ghostBase: 'text-[oklch(0.85_0.09_17)] hover:bg-[oklch(0.348_0.111_17_/_0.5)]',
    pressed: 'text-[oklch(0.927_0.062_17)] bg-[oklch(0.445_0.151_17)] ring-1 ring-inset ring-[oklch(0.5_0.18_17_/_0.5)]',
  },
};
