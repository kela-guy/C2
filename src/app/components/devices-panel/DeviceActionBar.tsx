/**
 * Expanded-card footer. Concatenates the registry's `footerActions` and
 * `overflowActions` into one ordered list, then splits it positionally: the
 * first `MAX_INLINE_FOOTER_ACTIONS` resolve to inline pills through the
 * resolver — no per-type conditionals — and the remainder collapses into the
 * 3-dot overflow pinned to the inline-end. The 3-dot only appears when the
 * list is longer than fits inline. Items can request to be pushed to the
 * inline-end (calibrate).
 */

import { Fragment, memo } from 'react';
import { resolveDeviceAction, type DeviceActionContext } from './deviceActions';
import { DeviceOverflowMenu } from './controls/DeviceOverflowMenu';
import type { DeviceTypeConfig } from './deviceRegistry';
import { splitFooterActions } from './footerOverflow';

interface DeviceActionBarProps {
  cfg: DeviceTypeConfig;
  ctx: DeviceActionContext;
}

export const DeviceActionBar = memo(function DeviceActionBar({ cfg, ctx }: DeviceActionBarProps) {
  const { inline, overflow, hasOverflow } = splitFooterActions([
    ...cfg.footerActions,
    ...cfg.overflowActions,
  ]);

  const items = inline
    .map((kind) => resolveDeviceAction(kind, ctx, 'footer'))
    .filter((item): item is NonNullable<typeof item> => item !== null);

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
          <DeviceOverflowMenu kinds={overflow} ctx={ctx} />
        </div>
      )}
    </div>
  );
});