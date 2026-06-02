/**
 * Expanded-card footer. Renders the registry's `footerActions` in order
 * through the resolver — no per-type conditionals. Items can request a
 * divider before/after themselves (speaker track, drone wipers) or be
 * pushed to the inline-end (calibrate).
 */

import { Fragment } from 'react';
import { resolveDeviceAction, type DeviceActionContext } from './deviceActions';
import type { DeviceTypeConfig } from './deviceRegistry';

interface DeviceActionBarProps {
  cfg: DeviceTypeConfig;
  ctx: DeviceActionContext;
}

export function DeviceActionBar({ cfg, ctx }: DeviceActionBarProps) {
  const items = cfg.footerActions
    .map((kind) => resolveDeviceAction(kind, ctx))
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (items.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-2 px-2 py-1.5 border-t border-white/[0.06]"
      data-handoff-component="device-row-actions"
    >
      {items.map((item) => (
        <Fragment key={item.key}>
          {item.dividerBefore && <Divider />}
          {item.pushEnd ? <div className="ms-auto flex items-center">{item.node}</div> : item.node}
          {item.dividerAfter && <Divider />}
        </Fragment>
      ))}
    </div>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-white/[0.08] mx-0.5" />;
}
