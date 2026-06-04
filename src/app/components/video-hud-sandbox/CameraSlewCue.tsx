/**
 * Slew visualization for left/right camera movement.
 *
 * `deltaDeg` is the signed angular gap between the commanded bearing and
 * the camera's current (eased) bearing. While the camera is catching up,
 * a dashed guide line is drawn from frame center toward the commanded
 * direction and the center crosshair rides along it, returning to the
 * fixed home reticle once the two bearings align.
 */

import { CenterCrosshair } from '@/app/components/camera-v2/CenterCrosshair';
import { accentHex } from '@/primitives/accentHex';

const PX_PER_DEG = 14;
const MAX_OFFSET_PX = 240;
const ACTIVE_THRESHOLD_DEG = 0.5;

// HUD amber. Inline rather than a `border-accent-warning` utility because
// this project's build emits a 0px width / wrong color for the dashed
// border utilities; the SVG/inline-color path is what the rest of the HUD uses.
const HUD = accentHex('warning');

interface CameraSlewCueProps {
  deltaDeg: number;
  bloom?: number;
}

export function CameraSlewCue({ deltaDeg, bloom = 0 }: CameraSlewCueProps) {
  const offset = Math.max(
    -MAX_OFFSET_PX,
    Math.min(MAX_OFFSET_PX, deltaDeg * PX_PER_DEG),
  );
  const len = Math.abs(offset);
  const active = Math.abs(deltaDeg) > ACTIVE_THRESHOLD_DEG;

  return (
    <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none">
      <div
        className="absolute left-1/2 top-1/2 transition-opacity duration-150 ease-out motion-reduce:transition-none"
        style={{
          opacity: active ? 1 : 0,
          transformOrigin: 'left center',
          transform: `translateY(-50%) ${offset < 0 ? 'rotate(180deg)' : ''}`,
        }}
        aria-hidden
      >
        <span
          className="block"
          style={{
            width: len,
            height: 0,
            borderTop: `2px dashed ${HUD}`,
            opacity: 0.85,
          }}
        />
        <span
          className="absolute left-0 top-0 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: HUD }}
        />
      </div>

      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ transform: `translateX(${offset}px)` }}
      >
        <CenterCrosshair bloom={bloom} scale={1.8} />
      </div>
    </div>
  );
}
