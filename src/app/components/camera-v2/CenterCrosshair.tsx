/**
 * Subtle sniper-scope reticle painted at the geometric center of a
 * live frame. Always visible (when mounted) — the parent
 * (`CameraFeedTile`) decides when to mount it (skipped on thumbs and
 * while designate-target is armed).
 *
 * Implementation — four 1px arms rendered as absolutely-positioned
 * `<span>`s inside a flex-centered container. Each arm starts at the
 * geometric center and is translated outward by a fixed rest offset
 * plus `bloom * MAX_BLOOM_PX`. Pixel-perfect, symmetric on every
 * aspect ratio, no SVG stretch quirks.
 *
 * `bloom` (0..1) widens the inner gap and pushes each arm further from
 * center via the `--reticle-bloom` CSS var. The hook
 * (`useCrosshairBloom`) eases this in/out — the component itself is
 * purely presentational.
 *
 * Pure decorative chrome — `aria-hidden`, `pointer-events-none`. The
 * camera feed under it remains fully interactable for designate /
 * drop / focus.
 */

import type { CSSProperties } from 'react';

const ARM_LEN_PX = 9;
const ARM_THICKNESS_PX = 2;
const REST_OFFSET_PX = 8;
const MAX_BLOOM_PX = 8;

interface CenterCrosshairProps {
  /** 0 = at rest (~7px inner gap, 9px arms, 2px thick), 1 = fully bloomed (+8px outward per arm). */
  bloom?: number;
}

const bloomCalc = (sign: 1 | -1) =>
  `calc(${sign * REST_OFFSET_PX}px + var(--reticle-bloom, 0) * ${sign * MAX_BLOOM_PX}px)`;

const armBase: CSSProperties = {
  position: 'absolute',
  backgroundColor: 'currentColor',
};

const vArmStyle = (sign: 1 | -1): CSSProperties => ({
  ...armBase,
  width: ARM_THICKNESS_PX,
  height: ARM_LEN_PX,
  transform: `translateY(${bloomCalc(sign)})`,
});

const hArmStyle = (sign: 1 | -1): CSSProperties => ({
  ...armBase,
  width: ARM_LEN_PX,
  height: ARM_THICKNESS_PX,
  transform: `translateX(${bloomCalc(sign)})`,
});

export function CenterCrosshair({ bloom = 0 }: CenterCrosshairProps) {
  const rootStyle = {
    ['--reticle-bloom' as string]: bloom,
  } satisfies CSSProperties;

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-12"
      style={rootStyle}
      data-testid="center-crosshair"
    >
      <span style={vArmStyle(-1)} />
      <span style={vArmStyle(1)} />
      <span style={hArmStyle(-1)} />
      <span style={hArmStyle(1)} />
    </div>
  );
}
