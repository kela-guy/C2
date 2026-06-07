/**
 * ECM jam control — a destructive split button with a confirm step.
 *
 * Three states:
 *   - idle    — the shared `SplitActionButton` (danger variant) labelled
 *               "Jam". The body arms a single-jammer confirm; the caret
 *               opens a Radix dropdown to choose "this jammer" vs "all".
 *   - confirm — a Confirm / Cancel panel drops in below the button (same
 *               look as the target card) and the button blinks twice to
 *               draw focus. Confirm fires; Cancel backs out.
 *   - jamming — the active state. Pressing it stands the jammer down.
 *
 * Confirming fires the real `onJamActivate(deviceId)`. The button always
 * starts in `idle` — JAMMING is only ever reached through the operator's
 * click-and-confirm flow, never seeded from incoming device data. Offline /
 * malfunctioning jammers are disabled with a reason.
 */

import { useState } from 'react';
import { DotmSquare11 } from '@/app/components/ui/dotm-square-11';
import { JamIcon } from '@/primitives/ProductIcons';
import { SplitActionButton } from '@/primitives/SplitActionButton';
import { CARD_TOKENS } from '@/primitives/tokens';
import { DeviceAction } from '../DeviceAction';
import { ReasonTooltip } from './ReasonTooltip';
import type { Device, DevicesPanelStrings } from '../types';

type JamState = 'idle' | 'confirm' | 'jamming';
type JamScope = 'one' | 'all';

interface JamSplitButtonProps {
  device: Device;
  strings: DevicesPanelStrings;
  /** Header placement renders a compact icon-only ghost trigger. */
  iconOnly?: boolean;
  onJamActivate?: (jammerId: string) => void;
}

export function JamSplitButton({ device, strings: s, iconOnly, onJamActivate }: JamSplitButtonProps) {
  const offline = device.connectionState === 'offline';
  const malfunction = device.operationalStatus === 'malfunctioning';
  const disabled = offline || malfunction;
  const reason = offline ? s.jamDisabledOffline : malfunction ? s.jamDisabledMalfunction : null;

  const [state, setState] = useState<JamState>('idle');
  const [scope, setScope] = useState<JamScope>('one');

  const armConfirm = (next: JamScope) => {
    setScope(next);
    setState('confirm');
  };

  const confirm = () => {
    onJamActivate?.(device.id);
    setState('jamming');
  };

  if (iconOnly) {
    return (
      <DeviceAction
        dataHandoff="device-jam-button"
        icon={<JamIcon size={12} />}
        iconOnly
        ghost
        tone="danger"
        pressed={state === 'jamming'}
        tooltip={state === 'jamming' ? s.jamActive : s.jam}
        ariaLabel={state === 'jamming' ? s.jamActive : s.jam}
        disabled={disabled && state !== 'jamming'}
        disabledReason={reason}
        onClick={() => (state === 'jamming' ? setState('idle') : confirm())}
      />
    );
  }

  if (state === 'jamming') {
    return (
      <DeviceAction
        dataHandoff="device-jam-button"
        icon={
          <DotmSquare11
            size={108}
            dotSize={16}
            speed={1}
            pattern="full"
            colorPreset="solid-theme"
            animated
            opacityBase={0.09}
            opacityMid={0.09}
            opacityPeak={1}
          />
        }
        label={scope === 'all' ? s.jammingAll : s.jamActive}
        tone="danger"
        pressed
        ariaLabel={scope === 'all' ? s.jammingAll : s.jamActive}
        onClick={() => setState('idle')}
      />
    );
  }

  // idle | confirm — the target-card split button. When armed, a Confirm /
  // Cancel panel drops in below and the button blinks twice for focus.
  const armedTitle = scope === 'all' ? s.jamPromptAll : s.jamPromptOne;

  return (
    <div
      className="inline-flex w-fit flex-col items-stretch gap-1.5"
      data-handoff-component="device-jam-button"
      onClick={stop}
    >
      <ReasonTooltip reason={disabled ? reason : null}>
        <SplitActionButton
          label={s.jam}
          icon={JamIcon}
          variant="danger"
          size="sm"
          disabled={disabled}
          moreActionsLabel={s.jamMoreOptions}
          className={state === 'confirm' ? 'animate-jam-confirm-blink' : ''}
          onClick={() => armConfirm('one')}
          dropdownItems={[
            { id: 'one', label: s.jamThisJammer, icon: JamIcon, onClick: () => armConfirm('one') },
            { id: 'all', label: s.jamAllJammers, icon: JamIcon, onClick: () => armConfirm('all') },
          ]}
        />
      </ReasonTooltip>

      {state === 'confirm' && (
        <div
          role="alertdialog"
          aria-label={armedTitle}
          className="rounded p-3"
          style={{
            boxShadow: `0 0 0 1px ${CARD_TOKENS.surface.level2}`,
            backgroundColor: `rgba(255,255,255,${CARD_TOKENS.elevation.overlay.level2})`,
          }}
        >
          <div className="mb-2 text-xs font-semibold text-zinc-200">{armedTitle}</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                confirm();
              }}
              aria-label={s.jamConfirm}
              className="h-8 flex-1 rounded bg-[oklch(0.348_0.111_17)] text-xs font-semibold text-[oklch(0.927_0.062_17)] transition-[background-color,transform] duration-150 ease-out hover:bg-[oklch(0.445_0.151_17)] active:scale-[0.98] active:bg-[oklch(0.295_0.082_17)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
            >
              {s.jamConfirm}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setState('idle');
              }}
              aria-label={s.jamCancel}
              className="h-8 flex-1 rounded bg-[oklch(0.302_0_0)] text-xs font-medium text-white transition-[background-color,transform] duration-150 ease-out hover:bg-[oklch(0.388_0_0)] active:scale-[0.98] active:bg-[oklch(0.238_0_0)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
            >
              {s.jamCancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function stop(e: React.MouseEvent) {
  e.stopPropagation();
}
