/**
 * The one place that maps an abstract `DeviceActionKind` (+ live context)
 * to a concrete rendered control. The row never branches on
 * `device.type` — it maps the registry's `footerActions` through
 * `resolveDeviceAction` and drops the nulls. Every control lives in the
 * expanded footer; the collapsed header is purely informational.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Square, Droplets } from 'lucide-react';
import { BellOff, Check, MapPin, Sun, Video, Wrench } from '@/lib/icons/central';
import { JamIcon } from '@/primitives/ProductIcons';
import { PlayFilledIcon } from '../devices-panel/icons';
import { getJamDisabledReason } from '../devices-panel/utils';
import { SpeakerTrackSelect } from '../devices-panel/controls/SpeakerTrackSelect';
import type { Device, DevicesPanelStrings, SpeakerTrack } from '../devices-panel/types';
import { DeviceAction } from './DeviceAction';
import type { DeviceActionKind } from './deviceRegistry';

/** Everything an action needs to render and fire. Built once per row. */
export interface DeviceActionContext {
  device: Device;
  strings: DevicesPanelStrings;
  isMuted: boolean;
  muteRemaining: string | null;
  isFloodlightOn: boolean;
  isSpeakerPlaying: boolean;
  isPinnedToFeed: boolean;
  speakerTracks: SpeakerTrack[];
  onFlyTo: (lat: number, lon: number) => void;
  onToggleMute: (deviceId: string) => void;
  onFloodlightToggle?: (floodlightId: string, next: boolean) => void;
  onSpeakerToggle?: (speakerId: string, next: boolean) => void;
  onJamActivate?: (jammerId: string) => void;
  onPinToFeed?: (deviceId: string) => void;
  onUnpinFromFeed?: (deviceId: string) => void;
}

export interface ResolvedAction {
  key: string;
  node: ReactNode;
  /** Push this item (and the rest) to the inline-end of the bar. */
  pushEnd?: boolean;
  dividerBefore?: boolean;
  dividerAfter?: boolean;
}

const isOffline = (d: Device) => d.connectionState === 'offline';

export function resolveDeviceAction(
  kind: DeviceActionKind,
  ctx: DeviceActionContext,
): ResolvedAction | null {
  const { device: d, strings: s } = ctx;
  const offline = isOffline(d);

  switch (kind) {
    case 'center':
      return {
        key: 'center',
        node: (
          <DeviceAction
            dataHandoff="device-center-on-map"
            icon={<MapPin size={12} />}
            label={s.centerOnMap}
            ariaLabel={s.centerOnMap}
            onClick={() => ctx.onFlyTo(d.lat, d.lon)}
          />
        ),
      };

    case 'mute':
      return {
        key: 'mute',
        node: (
          <DeviceAction
            dataHandoff="device-mute"
            tone="caution"
            pressed={ctx.isMuted}
            icon={<BellOff size={12} />}
            label={ctx.isMuted ? s.unmute : s.mute}
            ariaLabel={ctx.isMuted ? s.unmute : s.mute}
            disabled={offline}
            disabledReason={offline ? s.jamDisabledOffline : null}
            onClick={() => ctx.onToggleMute(d.id)}
          />
        ),
      };

    case 'floodlight':
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

    case 'jam': {
      const reason = getJamDisabledReason(d, s);
      return {
        key: 'jam',
        node: (
          <DeviceAction
            dataHandoff="device-jam-button"
            tone="danger"
            icon={<JamIcon size={12} />}
            label={d.status === 'active' ? s.jamActive : s.jam}
            ariaLabel={d.status === 'active' ? s.jamActive : s.jam}
            disabled={reason !== null}
            disabledReason={reason}
            onClick={() => ctx.onJamActivate?.(d.id)}
          />
        ),
      };
    }

    case 'speaker': {
      const reason = offline ? s.speakerDisabledOffline : null;
      return {
        key: 'speaker',
        dividerAfter: true,
        node: (
          <div className="flex items-center gap-2">
            <DeviceAction
              dataHandoff="device-speaker-play"
              tone={ctx.isSpeakerPlaying ? 'engaged' : 'neutral'}
              pressed={ctx.isSpeakerPlaying}
              icon={ctx.isSpeakerPlaying ? <Square size={12} /> : <PlayFilledIcon size={12} />}
              label={ctx.isSpeakerPlaying ? s.speakerStop : s.speakerPlay}
              ariaLabel={ctx.isSpeakerPlaying ? s.speakerStop : s.speakerPlay}
              disabled={offline}
              disabledReason={reason}
              onClick={() => ctx.onSpeakerToggle?.(d.id, !ctx.isSpeakerPlaying)}
            />
            {ctx.speakerTracks.length > 0 && (
              <SpeakerTrackSelect tracks={ctx.speakerTracks} strings={s} />
            )}
          </div>
        ),
      };
    }

    case 'pin': {
      const canPin = !!ctx.onPinToFeed;
      const canUnpin = !!ctx.onUnpinFromFeed;
      const disabled = offline || (ctx.isPinnedToFeed ? !canUnpin : !canPin);
      const reason = offline ? s.jamDisabledOffline : null;
      const toggle = () => {
        if (ctx.isPinnedToFeed) ctx.onUnpinFromFeed?.(d.id);
        else ctx.onPinToFeed?.(d.id);
      };

      return {
        key: 'pin',
        node: (
          <DeviceAction
            dataHandoff="device-pin-button"
            tone="neutral"
            pressed={ctx.isPinnedToFeed}
            icon={<Video size={12} />}
            label={ctx.isPinnedToFeed ? s.unpinFromFeed : s.pinToFeed}
            ariaLabel={ctx.isPinnedToFeed ? s.unpinFromFeedAriaLabel : s.pinToFeedAriaLabel}
            disabled={disabled}
            disabledReason={reason}
            onClick={toggle}
          />
        ),
      };
    }

    case 'wipers':
      return {
        key: 'wipers',
        dividerBefore: true,
        node: <WipersControl device={d} strings={s} />,
      };

    case 'calibrate':
      return {
        key: 'calibrate',
        pushEnd: true,
        node: <CalibrateControl device={d} strings={s} />,
      };

    default:
      return null;
  }
}

function WipersControl({ device, strings }: { device: Device; strings: DevicesPanelStrings }) {
  const [on, setOn] = useState(false);
  const offline = isOffline(device);
  return (
    <DeviceAction
      dataHandoff="device-wipers"
      tone="caution"
      pressed={on}
      icon={<Droplets size={12} />}
      label={strings.wipers}
      ariaLabel={strings.wipersAriaLabel}
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
