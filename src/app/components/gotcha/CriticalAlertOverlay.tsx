/**
 * Top-critical "drone detected" takeover — a SEPARATE lane from the
 * batched tactical notifications.
 *
 * Unlike `showTacticalNotification` (which pools into `pendingBatch` in
 * `NotificationSystem.tsx`), `showCriticalDroneAlert` bypasses the pool
 * entirely and drives this interactive full-screen overlay directly via a
 * window event. The normal notification pool is left untouched so routine
 * traffic never competes with a genuine takeover, and the takeover never
 * gets batched/coalesced away.
 *
 * The overlay is interactive (`pointer-events` on, z-50 above the vignette
 * z-40): it shows the threat direction, a snapshot + live video, a one-click
 * PA broadcast (כריזה), and a default action that auto-applies on timeout.
 * It also plays a critical audio cue (not present elsewhere in the app).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Radio, Navigation, MapPin, X, BellOff, Bell } from '@/lib/icons/central';
import { CardMedia } from '@/primitives/CardMedia';
import { DEFAULT_SPEAKER_TRACKS } from '../devices-panel/constants';

export interface CriticalDroneAlert {
  id: string;
  /** Headline, e.g. "Drone detected". */
  title: string;
  /** Sub-line detail (sector, classification, etc.). */
  message?: string;
  /** Compass bearing (0 = N, 90 = E) from the site to the threat. */
  bearingDeg?: number;
  /** Range to threat in metres. */
  distanceM?: number;
  /** Still image shown immediately. */
  snapshotUrl?: string;
  /** Live video stream shown when available (camera was down in the demo). */
  streamUrl?: string;
  /** Owning Gotcha unit + the sector/sensor that detected it. */
  unitId?: string;
  sensorId?: string;
  /** PA track broadcast on one-click כריזה. Defaults to the first track. */
  broadcastTrackId?: string;
}

const ALERT_EVENT = 'gotcha-critical-alert';
const DISMISS_EVENT = 'gotcha-critical-alert-dismiss';

/**
 * Fire a top-critical drone takeover. Bypasses the batched notification
 * pool — this is the highest-severity lane and must never be coalesced.
 */
export function showCriticalDroneAlert(alert: Omit<CriticalDroneAlert, 'id'> & { id?: string }) {
  const payload: CriticalDroneAlert = {
    ...alert,
    id: alert.id ?? `gotcha-${Date.now()}`,
  };
  window.dispatchEvent(new CustomEvent<CriticalDroneAlert>(ALERT_EVENT, { detail: payload }));
}

/** Imperatively dismiss the active takeover (e.g. on engagement). */
export function dismissCriticalDroneAlert() {
  window.dispatchEvent(new Event(DISMISS_EVENT));
}

export interface CriticalAlertStrings {
  detected: string;
  direction: string;
  range: string;
  broadcast: string;
  locate: string;
  dismiss: string;
  autoDismissIn: (s: number) => string;
  mute: string;
  unmute: string;
}

const DEFAULT_STRINGS: CriticalAlertStrings = {
  detected: 'Drone detected',
  direction: 'Direction',
  range: 'Range',
  broadcast: 'Broadcast PA (כריזה)',
  locate: 'Show on map',
  dismiss: 'Dismiss',
  autoDismissIn: (s) => `Auto-dismiss in ${s}s`,
  mute: 'Mute alarm',
  unmute: 'Unmute alarm',
};

export interface CriticalAlertOverlayProps {
  /** Fire the PA broadcast for the given track id. */
  onBroadcast?: (trackId: string) => void;
  /** Focus the map on the threat / its sector. */
  onLocate?: (alert: CriticalDroneAlert) => void;
  /**
   * Seconds before the default action fires. MVP default action = dismiss
   * (do nothing destructive); a future config can auto-broadcast instead.
   */
  timeoutSeconds?: number;
  strings?: Partial<CriticalAlertStrings>;
}

export function CriticalAlertOverlay({
  onBroadcast,
  onLocate,
  timeoutSeconds = 20,
  strings,
}: CriticalAlertOverlayProps) {
  const s: CriticalAlertStrings = { ...DEFAULT_STRINGS, ...strings };
  const [alert, setAlert] = useState<CriticalDroneAlert | null>(null);
  const [remaining, setRemaining] = useState(timeoutSeconds);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<{ ctx: AudioContext; timer: number } | null>(null);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      window.clearInterval(audioRef.current.timer);
      audioRef.current.ctx.close().catch(() => {});
      audioRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    setAlert(null);
    stopAudio();
  }, [stopAudio]);

  // Listen for the imperative trigger / dismiss.
  useEffect(() => {
    const onAlert = (e: Event) => {
      const detail = (e as CustomEvent<CriticalDroneAlert>).detail;
      if (!detail) return;
      setAlert(detail);
      setRemaining(timeoutSeconds);
    };
    const onDismiss = () => close();
    window.addEventListener(ALERT_EVENT, onAlert);
    window.addEventListener(DISMISS_EVENT, onDismiss);
    return () => {
      window.removeEventListener(ALERT_EVENT, onAlert);
      window.removeEventListener(DISMISS_EVENT, onDismiss);
    };
  }, [timeoutSeconds, close]);

  // Countdown → default action (dismiss) on expiry.
  useEffect(() => {
    if (!alert) return;
    const iv = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(iv);
          close();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(iv);
  }, [alert, close]);

  // Critical audio cue — a repeating two-tone beep via WebAudio (no asset
  // dependency, degrades silently if the context can't start).
  useEffect(() => {
    if (!alert || muted) {
      stopAudio();
      return;
    }
    try {
      const AudioCtor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      const ctx = new AudioCtor();
      const beep = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = 880;
        gain.gain.value = 0.0001;
        osc.connect(gain).connect(ctx.destination);
        const now = ctx.currentTime;
        gain.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.24);
      };
      beep();
      const timer = window.setInterval(beep, 1100);
      audioRef.current = { ctx, timer };
    } catch {
      /* audio unavailable — visual takeover still stands */
    }
    return stopAudio;
  }, [alert, muted, stopAudio]);

  // Escape closes the takeover.
  useEffect(() => {
    if (!alert) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [alert, close]);

  if (!alert) return null;

  const trackId = alert.broadcastTrackId ?? DEFAULT_SPEAKER_TRACKS[0]?.id ?? 'air-raid';
  const hasMedia = !!alert.streamUrl || !!alert.snapshotUrl;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={alert.title}
      data-handoff-component="gotcha-critical-alert"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Interactive red scrim (distinct from the pointer-events-none vignette). */}
      <button
        type="button"
        aria-label={s.dismiss}
        onClick={close}
        className="absolute inset-0 bg-red-950/70 backdrop-blur-[2px] cursor-default"
        style={{ boxShadow: 'inset 0 0 120px 40px rgba(220,38,38,0.55)' }}
      />

      <div
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-red-500/60 bg-[#1a0e0f] shadow-[0_0_0_1px_rgba(239,68,68,0.5),0_24px_80px_rgba(0,0,0,0.7)] motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:fade-in"
        style={{ animationDuration: '160ms' }}
      >
        <div className="flex items-start gap-3 px-4 pt-4 pb-3 bg-red-600/15 border-b border-red-500/30">
          <span className="relative mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-red-600/30">
            <span className="absolute inset-0 rounded-md bg-red-500/40 animate-ping motion-reduce:hidden" />
            <AlertTriangle size={20} className="relative text-red-300" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold text-red-50">{alert.title || s.detected}</div>
            {alert.message && <div className="mt-0.5 text-sm text-red-200/80">{alert.message}</div>}
          </div>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? s.unmute : s.mute}
            className="shrink-0 rounded p-1.5 text-red-200/70 hover:bg-state-hover-overlay hover:text-red-100 transition-colors"
          >
            {muted ? <BellOff size={16} /> : <Bell size={16} />}
          </button>
          <button
            type="button"
            onClick={close}
            aria-label={s.dismiss}
            className="shrink-0 rounded p-1.5 text-red-200/70 hover:bg-state-hover-overlay hover:text-red-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Direction + range readout. */}
        <div className="flex items-center gap-4 px-4 py-3">
          {alert.bearingDeg != null && (
            <div className="flex items-center gap-2">
              <span className="flex size-10 items-center justify-center rounded-full border border-red-500/40 bg-black/30">
                <Navigation
                  size={20}
                  className="text-red-300"
                  style={{ transform: `rotate(${alert.bearingDeg}deg)` }}
                />
              </span>
              <div className="leading-tight">
                <div className="text-2xs uppercase tracking-wider text-red-200/60">{s.direction}</div>
                <div className="text-sm font-mono font-semibold text-red-50 tabular-nums">
                  {Math.round(alert.bearingDeg)}°
                </div>
              </div>
            </div>
          )}
          {alert.distanceM != null && (
            <div className="leading-tight">
              <div className="text-2xs uppercase tracking-wider text-red-200/60">{s.range}</div>
              <div className="text-sm font-mono font-semibold text-red-50 tabular-nums">
                {alert.distanceM >= 1000
                  ? `${(alert.distanceM / 1000).toFixed(1)} km`
                  : `${Math.round(alert.distanceM)} m`}
              </div>
            </div>
          )}
        </div>

        {/* Snapshot / live video. */}
        {hasMedia && (
          <div className="px-4 pb-3">
            <div className="overflow-hidden rounded-lg border border-red-500/20">
              <CardMedia
                src={alert.streamUrl ?? alert.snapshotUrl}
                type={alert.streamUrl ? 'video' : 'image'}
                alt={alert.title}
              />
            </div>
          </div>
        )}

        {/* Actions. */}
        <div className="flex items-center gap-2 px-4 pb-4">
          <button
            type="button"
            onClick={() => onBroadcast?.(trackId)}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-red-600 px-3 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(220,38,38,0.4)] hover:bg-red-500 active:scale-[0.99] transition-[background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/60"
          >
            <Radio size={16} />
            {s.broadcast}
          </button>
          {onLocate && (
            <button
              type="button"
              onClick={() => {
                onLocate(alert);
              }}
              aria-label={s.locate}
              className="flex items-center justify-center gap-2 rounded-md border border-red-500/40 bg-black/30 px-3 py-2.5 text-sm font-medium text-red-100 hover:bg-black/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/40"
            >
              <MapPin size={16} />
            </button>
          )}
        </div>

        <div className="px-4 pb-3 -mt-1 text-center text-xs-plus font-mono tabular-nums text-red-200/50">
          {s.autoDismissIn(remaining)}
        </div>
      </div>
    </div>
  );
}
