/**
 * Expanded-card footer. Renders the registry's `footerActions` inline
 * through the resolver — no per-type conditionals — then collapses the
 * `overflowActions` (Logs / Notifications) into a 3-dot overflow pinned to
 * the inline-end. Items can request to be pushed to the inline-end
 * (calibrate).
 */

import { Fragment } from 'react';
import { resolveDeviceAction, type DeviceActionContext } from './deviceActions';
import { DeviceOverflowMenu } from './controls/DeviceOverflowMenu';
import type { DeviceTypeConfig } from './deviceRegistry';

interface DeviceActionBarProps {
  cfg: DeviceTypeConfig;
  ctx: DeviceActionContext;
}

export function DeviceActionBar({ cfg, ctx }: DeviceActionBarProps) {
  const items = cfg.footerActions
    .map((kind) => resolveDeviceAction(kind, ctx, 'footer'))
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const hasOverflow = cfg.overflowActions.length > 0;
  if (items.length === 0 && !hasOverflow) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-2 px-2 py-1.5 border-t border-white/[0.06] overflow-visible"
      data-handoff-component="device-row-actions"
    >
      {items.map((item) => (
        <Fragment key={item.key}>
          {item.pushEnd ? <div className="ms-auto mr-0 flex items-center">{item.node}</div> : item.node}
        </Fragment>
      ))}
      {hasOverflow && (
        <div className="ms-auto flex items-center">
          <DeviceOverflowMenu kinds={cfg.overflowActions} ctx={ctx} />
        </div>
      )}
    </div>
  );
}