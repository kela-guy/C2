/**
 * Two-tier detection alert overlay for a `CameraFeedTile`.
 *
 *   1. State ring (always-on while detections are present): a red
 *      gradient frame inset into the tile. This is the persistent
 *      "this tile has activity right now" channel.
 *   2. Pulse overlay (one-shot, ~600ms): mounted on the rising edge
 *      of a new detection id. Used to draw the operator's eye to a
 *      thumb that just lit up.
 *
 * Both layers are `pointer-events-none` so they never block clicks
 * inside the tile (designate, control bar, the promote-to-hero
 * button). All animations are opacity-only — no scale, no layout
 * properties — so they are cheap and degrade gracefully under
 * `prefers-reduced-motion: reduce` (the pulse mounts as a flat fade
 * instead of the keyframed sweep).
 *
 * The ring uses a 2px inset shadow to match the existing focus / drop
 * accents on `CameraFeedTile`, plus a thin gradient border drawn via a
 * masked `::before`-style child so the visual reads as a "ring with a
 * glow" rather than a flat band.
 */

import { motion, useReducedMotion } from 'motion/react';
import { useStrings } from '@/lib/intl';
import { useDetectionPulse } from './useDetectionPulse';
import type { DetectionBox } from './types';

interface TileDetectionAlertProps {
  detections: DetectionBox[];
}

// Constants kept here so the spec/handoff can pull a single source of
// truth and other surfaces (notification center, map ping) can reuse
// the same red ramp later.
const ALERT_RED_STRONG = 'rgba(239, 68, 68, 0.85)';
const ALERT_RED_MID = 'rgba(239, 68, 68, 0.55)';
const ALERT_RED_SOFT = 'rgba(239, 68, 68, 0.18)';

export function TileDetectionAlert({ detections }: TileDetectionAlertProps) {
  const t = useStrings().camera.feedTile;
  const { hasActive, pulseKey } = useDetectionPulse(detections);
  const reduceMotion = useReducedMotion();

  if (!hasActive) return null;

  return (
    <div
      // The alert frames the entire tile and is purely visual. We give
      // it `aria-live="polite"` so screen readers learn that the tile
      // has activity, with a localized label.
      aria-live="polite"
      aria-label={t.detectionAlertAriaLabel}
      className="absolute inset-0 z-20 pointer-events-none"
      data-testid="tile-detection-alert"
    >
      {/* Layer 1: state ring. Always rendered while `hasActive`. */}
      <div
        className="absolute inset-0 transition-opacity duration-200 ease-out"
        style={{
          boxShadow: `inset 0 0 0 2px ${ALERT_RED_MID}, inset 0 0 18px ${ALERT_RED_SOFT}`,
          // The gradient border tilts the red top-bright → bottom-dim
          // so the ring reads as illumination, not a flat band.
          backgroundImage: `linear-gradient(180deg, ${ALERT_RED_SOFT} 0%, transparent 28%, transparent 72%, ${ALERT_RED_SOFT} 100%)`,
        }}
      />

      {/* Layer 2: one-shot pulse keyed by `pulseKey`. Re-mounting the
          motion node forces a fresh enter animation each time a new
          detection id appears. Under `prefers-reduced-motion` the
          pulse degrades to a brief flat fade. */}
      {pulseKey > 0 && (
        <motion.div
          key={pulseKey}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={
            reduceMotion
              ? { opacity: [0, 0.6, 0] }
              : { opacity: [0, 0.95, 0.6, 0] }
          }
          transition={{
            duration: reduceMotion ? 0.4 : 0.65,
            ease: 'easeOut',
            times: reduceMotion ? [0, 0.5, 1] : [0, 0.18, 0.5, 1],
          }}
          style={{
            boxShadow: `inset 0 0 0 2px ${ALERT_RED_STRONG}, inset 0 0 26px ${ALERT_RED_MID}`,
          }}
          data-testid="tile-detection-alert-pulse"
        />
      )}
    </div>
  );
}
