/**
 * The one place that maps an abstract `DeviceActionKind` (+ live context
 * + a placement hint) to a concrete rendered control. The row never
 * branches on `device.type` — it maps the registry's `headerActions` /
 * `footerActions` through `resolveDeviceAction` and drops the nulls.
 *
 * Placement decides the treatment, not the meaning:
 *   - `'header'` — compact icon-only ghost glyph in the always-visible
 *     primary cluster (Show-on-map, speaker On/Off, floodlight segmented).
 *   - `'footer'` — solid pill in the expanded action bar.
 *
 * Logs + Notifications are not resolved here — they live in the footer
 * 3-dot overflow (`DeviceOverflowMenu`).
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Check, List, Plane, Square, SquareFilled, Sun, Video, Wrench } from '@/lib/icons/central';
import { DockIcon, MapPinIcon, PauseIcon, PlayFilledIcon, WatchStreamIcon, WipeIcon } from './icons';
import { DotmSquare1 } from '@/app/components/ui/dotm-square-1';
import { SpeakerTrackSelect } from './controls/SpeakerTrackSelect';
import { JamSplitButton } from './controls/JamSplitButton';
import { FloodlightSegmentedCompact } from './controls/FloodlightSegmentedToggle';
import { NotifyBellIcon, NotifyCountdown } from './controls/notify';
import type { Device, DevicesPanelStrings, SpeakerTrack } from './types';
import { DeviceAction } from './DeviceAction';
import type { DeviceActionKind } from './deviceRegistry';

/** Where the resolved control renders. Drives the visual treatment. */
export type DeviceActionPlacement = 'header' | 'footer';

/** Everything an action needs to render and fire. Built once per row. */
export interface DeviceActionContext {
  device: Device;
  strings: DevicesPanelStrings;
  isFloodlightOn: boolean;
  isSpeakerPlaying: boolean;
  isPinnedToFeed: boolean;
  speakerTracks: SpeakerTrack[];
  /** Currently selected speaker track id (lifted so the header now-playing readout can name it). */
  selectedTrackId: string;
  onSelectTrack: (trackId: string) => void;
  /** Open error count — drives the Logs error channel + tile count badge. */
  errorCount: number;
  /** Armed-notifications state + live countdown (seconds), shared header <-> overflow. */
  isNotifyOn: boolean;
  notifyRemaining: number;
  onToggleNotify: () => void;
  onOpenLogs: () => void;
  /** Open the device's errors modal (the header error button). */
  onOpenErrors: () => void;
  onFlyTo: (lat: number, lon: number) => void;
  onFloodlightToggle?: (floodlightId: string, next: boolean) => void;
  onSpeakerToggle?: (speakerId: string, next: boolean) => void;
  onJamActivate?: (jammerId: string) => void;
  onPinToFeed?: (deviceId: string) => void;
  onUnpinFromFeed?: (deviceId: string) => void;
  /** Pathfinder flight state — drives the state-aware `launchControl` + `launchAbort` actions. */
  pathfinderFlightState?: 'docked' | 'launching' | 'airborne';
  /** Fire the Pathfinder takeoff sequence (docked -> launching). */
  onLaunch?: (deviceId: string) => void;
  /** Abort an in-progress launch sequence (launching -> docked). */
  onAbort?: (deviceId: string) => void;
  /** Command the Pathfinder back to base (airborne -> docked). */
  onReturnToBase?: (deviceId: string) => void;
}

export interface ResolvedAction {
  key: string;
  node: ReactNode;
  /** Push this item (and the rest) to the inline-end of the bar. */
  pushEnd?: boolean;
}

const isOffline = (d: Device) => d.connectionState === 'offline';

export function resolveDeviceAction(
  kind: DeviceActionKind,
  ctx: DeviceActionContext,
  placement: DeviceActionPlacement = 'footer',
): ResolvedAction | null {
  const { device: d, strings: s } = ctx;
  const offline = isOffline(d);

  switch (kind) {
    case 'center':
      // Show-on-map stays enabled offline (you can still recenter the map).
      return placement === 'header'
        ? {
            key: 'center',
            node: (
              <DeviceAction
                dataHandoff="device-center-on-map"
                icon={<MapPinIcon size={12} />}
                iconOnly
                ghost
                tooltip={s.showOnMap}
                ariaLabel={s.showOnMap}
                onClick={() => ctx.onFlyTo(d.lat, d.lon)}
              />
            ),
          }
        : {
            key: 'center',
            node: (
              <DeviceAction
                dataHandoff="device-center-on-map"
                icon={<MapPinIcon size={12} />}
                label={s.centerOnMap}
                ariaLabel={s.centerOnMap}
                onClick={() => ctx.onFlyTo(d.lat, d.lon)}
              />
            ),
          };

    case 'floodlight':
      // Header: the icon-led segmented Off/On toggle (matches the lab).
      if (placement === 'header') {
        return {
          key: 'floodlight',
          node: (
            <span data-handoff-component="device-floodlight-toggle">
              <FloodlightSegmentedCompact
                on={ctx.isFloodlightOn}
                disabled={offline}
                onToggle={() => ctx.onFloodlightToggle?.(d.id, !ctx.isFloodlightOn)}
              />
            </span>
          ),
        };
      }
      return {
        key: 'floodlight',
        node: (
          <DeviceAction
            dataHandoff="device-floodlight-toggle"
            tone="caution"
            pressed={ctx.isFloodlightOn}
            icon={<Sun size={12} />}
            label={ctx.isFloodlightOn ? s.floodlightOn : s.floodlightOff}
            ariaLabel={s.floodlightToggleAriaLabel}
            disabled={offline}
            disabledReason={offline ? s.jamDisabledOffline : null}
            onClick={() => ctx.onFloodlightToggle?.(d.id, !ctx.isFloodlightOn)}
          />
        ),
      };

    case 'jam':
      return {
        key: 'jam',
        node: (
          <JamSplitButton
            device={d}
            strings={s}
            iconOnly={placement === 'header'}
            onJamActivate={ctx.onJamActivate}
          />
        ),
      };

    case 'speaker': {
      const reason = offline ? s.speakerDisabledOffline : null;
      const track = ctx.speakerTracks.find((t) => t.id === ctx.selectedTrackId);
      // Header: icon-only Play/Pause that names the queued track on hover.
      if (placement === 'header') {
        const label = ctx.isSpeakerPlaying ? s.speakerStop : s.speakerPlay;
        const tooltip = track ? `${label} · ${track.label}` : label;
        return {
          key: 'speaker',
          node: (
            <DeviceAction
              dataHandoff="device-speaker-play"
              tone="neutral"
              pressed={ctx.isSpeakerPlaying}
              iconOnly
              ghost
              icon={ctx.isSpeakerPlaying ? <PauseIcon size={12} /> : <PlayFilledIcon size={12} />}
              tooltip={tooltip}
              ariaLabel={track ? `${label} — ${track.label}` : label}
              disabled={offline}
              disabledReason={reason}
              onClick={() => ctx.onSpeakerToggle?.(d.id, !ctx.isSpeakerPlaying)}
            />
          ),
        };
      }
      return {
        key: 'speaker',
        node: (
          <DeviceAction
            dataHandoff="device-speaker-play"
            tone="neutral"
            pressed={ctx.isSpeakerPlaying}
            icon={ctx.isSpeakerPlaying ? <Square size={12} /> : <PlayFilledIcon size={12} />}
            label={ctx.isSpeakerPlaying ? s.speakerStop : s.speakerPlay}
            ariaLabel={ctx.isSpeakerPlaying ? s.speakerStop : s.speakerPlay}
            disabled={offline}
            disabledReason={reason}
            onClick={() => ctx.onSpeakerToggle?.(d.id, !ctx.isSpeakerPlaying)}
          />
        ),
      };
    }

    case 'audio':
      if (ctx.speakerTracks.length === 0) return null;
      return {
        key: 'audio',
        node: (
          <SpeakerTrackSelect
            tracks={ctx.speakerTracks}
            value={ctx.selectedTrackId}
            onChange={ctx.onSelectTrack}
            strings={s}
          />
        ),
      };

    case 'watchVideo':
    case 'pin': {
      const canPin = !!ctx.onPinToFeed;
      const canUnpin = !!ctx.onUnpinFromFeed;
      const disabled = offline || (ctx.isPinnedToFeed ? !canUnpin : !canPin);
      const reason = offline ? s.jamDisabledOffline : null;
      const toggle = () => {
        if (ctx.isPinnedToFeed) ctx.onUnpinFromFeed?.(d.id);
        else ctx.onPinToFeed?.(d.id);
      };
      // `watchVideo` uses the monitor+play glyph; `pin` keeps the camera
      // glyph for back-compat. Both drive the same pin-to-feed wiring.
      const icon = kind === 'watchVideo' ? <WatchStreamIcon size={12} /> : <Video size={12} />;
      return {
        key: kind,
        node: (
          <DeviceAction
            dataHandoff="device-pin-button"
            tone="neutral"
            pressed={ctx.isPinnedToFeed}
            icon={icon}
            label={ctx.isPinnedToFeed ? s.unpinFromFeed : s.pinToFeed}
            ariaLabel={ctx.isPinnedToFeed ? s.unpinFromFeedAriaLabel : s.pinToFeedAriaLabel}
            disabled={disabled}
            disabledReason={reason}
            className="w-fit"
            onClick={toggle}
          />
        ),
      };
    }

    // Pathfinder takeoff primary. State-aware: airborne shows Return-to-base,
    // launching shows Stop (abort), otherwise the Launch go-action (disabled
    // while offline / malfunctioning).
    case 'launchControl': {
      if (ctx.pathfinderFlightState === 'airborne') {
        return {
          key: 'launchControl',
          node: (
            <DeviceAction
              dataHandoff="device-return-to-base"
              tone="neutral"
              icon={<DockIcon size={12} />}
              label={s.returnToBase}
              ariaLabel={s.returnToBaseAriaLabel}
              disabled={offline}
              disabledReason={offline ? s.jamDisabledOffline : null}
              onClick={() => ctx.onReturnToBase?.(d.id)}
            />
          ),
        };
      }
      if (ctx.pathfinderFlightState === 'launching') {
        return {
          key: 'launchControl',
          node: (
            <DeviceAction
              dataHandoff="device-launch-abort"
              tone="danger"
              icon={<SquareFilled size={12} />}
              label={s.abort}
              ariaLabel={s.abortAriaLabel}
              onClick={() => ctx.onAbort?.(d.id)}
            />
          ),
        };
      }
      const malfunction = d.operationalStatus === 'malfunctioning';
      return {
        key: 'launchControl',
        node: (
          <DeviceAction
            dataHandoff="device-launch"
            tone="neutral"
            icon={<Plane size={12} />}
            label={s.launch}
            ariaLabel={s.launchAriaLabel}
            disabled={offline || malfunction}
            disabledReason={offline ? s.jamDisabledOffline : malfunction ? s.jamDisabledMalfunction : null}
            onClick={() => ctx.onLaunch?.(d.id)}
          />
        ),
      };
    }

    // Pathfinder header abort. Resolves to a compact Stop glyph only while the
    // launch sequence is running; otherwise it contributes nothing to the
    // always-visible header cluster.
    case 'launchAbort': {
      if (ctx.pathfinderFlightState !== 'launching') return null;
      return {
        key: 'launchAbort',
        node: (
          <DeviceAction
            dataHandoff="device-launch-abort"
            tone="danger"
            iconOnly
            ghost
            icon={<SquareFilled size={12} />}
            tooltip={s.abort}
            ariaLabel={s.abortAriaLabel}
            onClick={() => ctx.onAbort?.(d.id)}
          />
        ),
      };
    }

    case 'wipers':
      return {
        key: 'wipers',
        node: <WipersControl device={d} strings={s} />,
      };

    case 'calibrate':
      return {
        key: 'calibrate',
        pushEnd: true,
        node: <CalibrateControl device={d} strings={s} />,
      };

    // Notifications: a timed toggle. When it lands inline (footer has room for
    // it), it renders as a pressable pill that arms the attention window and
    // swaps its label for the live countdown; otherwise it tucks into the
    // overflow as a menu row.
    case 'notifications': {
      const on = ctx.isNotifyOn;
      return {
        key: 'notifications',
        node: (
          <DeviceAction
            dataHandoff="device-notifications"
            tone="neutral"
            pressed={on}
            icon={<NotifyBellIcon armed={on} />}
            label={on ? <NotifyCountdown remaining={ctx.notifyRemaining} /> : s.notifications}
            ariaLabel={s.notifications}
            disabled={offline}
            disabledReason={offline ? s.jamDisabledOffline : null}
            onClick={() => ctx.onToggleNotify()}
          />
        ),
      };
    }

    // Logs: the error channel. Low-signal until something breaks — the pill
    // turns red and grows a count badge when the device has errors, so there
    // is no separate "Errors" control.
    case 'logs': {
      const count = ctx.errorCount;
      const hasErrors = count > 0;
      const label = hasErrors ? `${s.logs} · ${s.errors}` : s.logs;
      return {
        key: 'logs',
        node: (
          <DeviceAction
            dataHandoff="device-logs"
            tone="neutral"
            icon={<List size={12} />}
            label={
              <span className="inline-flex items-center gap-1.5">
                {label}
                {hasErrors && (
                  <span className="flex h-fit w-fit flex-col items-center justify-center bg-red-500/20 px-1.5 py-0.5 text-[10px] font-medium text-red-300 tabular-nums">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </span>
            }
            ariaLabel={label}
            className={
              hasErrors ? 'text-red-300 bg-red-500/10 hover:bg-red-500/15 hover:text-red-200' : undefined
            }
            onClick={() => ctx.onOpenLogs()}
          />
        ),
      };
    }

    default:
      return null;
  }
}

function WipersControl({ device, strings }: { device: Device; strings: DevicesPanelStrings }) {
  const [on, setOn] = useState(false);
  const offline = isOffline(device);

  // Wipers run continuously while on, so the lit state swaps the glyph for a
  // dot-matrix spinner. It stays a normal (non-`loading`) button so the second
  // click stops it. The label flips Wipers -> Wiping…, and both states share a
  // single grid cell so the pill never resizes mid-toggle.
  const glyph = on ? (
    <DotmSquare1
      size={20}
      dotSize={2}
      speed={1.1}
      pattern="full"
      colorPreset="solid-theme"
      animated
      opacityBase={0.12}
      opacityMid={0.42}
      opacityPeak={1}
      ariaLabel={strings.wiping}
    />
  ) : (
    <WipeIcon size={12} />
  );

  return (
    <DeviceAction
      dataHandoff="device-wipers"
      tone="neutral"
      pressed={on}
      icon={
        <span className="inline-flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">
          {glyph}
        </span>
      }
      label={
        <span className="grid">
          <span
            aria-hidden="true"
            className={`col-start-1 row-start-1 whitespace-nowrap ${on ? '' : 'invisible'}`}
          >
            {strings.wiping}
          </span>
          <span
            aria-hidden="true"
            className={`col-start-1 row-start-1 whitespace-nowrap ${on ? 'invisible' : ''}`}
          >
            {strings.wipers}
          </span>
        </span>
      }
      ariaLabel={on ? strings.wiping : strings.wipersAriaLabel}
      disabled={offline}
      disabledReason={offline ? strings.jamDisabledOffline : null}
      onClick={() => setOn((v) => !v)}
    />
  );
}

type CalibState = 'idle' | 'running' | 'done';

function CalibrateControl({ device, strings }: { device: Device; strings: DevicesPanelStrings }) {
  const [state, setState] = useState<CalibState>('idle');

  useEffect(() => {
    if (state !== 'running') return;
    const t = setTimeout(() => setState('done'), 2000);
    return () => clearTimeout(t);
  }, [state]);

  useEffect(() => {
    if (state !== 'done') return;
    const t = setTimeout(() => setState('idle'), 1500);
    return () => clearTimeout(t);
  }, [state]);

  const offline = isOffline(device);
  const label = state === 'running' ? strings.calibrating : state === 'done' ? strings.calibrated : strings.calibrate;

  return (
    <DeviceAction
      dataHandoff="device-calibrate"
      icon={state === 'done' ? <Check size={12} className="text-emerald-400" /> : <Wrench size={12} />}
      label={label}
      ariaLabel={strings.calibrateAriaLabel}
      loading={state === 'running'}
      disabled={offline || state !== 'idle'}
      disabledReason={offline ? strings.jamDisabledOffline : null}
      onClick={() => setState('running')}
    />
  );
}
