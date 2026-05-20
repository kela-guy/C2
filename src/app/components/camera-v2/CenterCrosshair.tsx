/**
 * Subtle sniper-scope reticle painted at the geometric center of a
 * live frame. Always visible (when mounted) — the parent
 * (`CameraFeedTile`) decides when to mount it (skipped on thumbs and
 * while designate-target is armed).
 *
 * Implementation choice — single inline `<svg viewBox="0 0 100 100"
 * preserveAspectRatio="none">` with `vectorEffect="non-scaling-stroke"`
 * on every line. That gives us:
 *   - the cross sits at the exact pixel center regardless of the
 *     tile's aspect ratio (the viewBox stretches with the parent),
 *   - the strokes stay 1px regardless of the stretch, so the cross
 *     never thins on a wide hero or thickens on a narrow thumb.
 *
 * Pure decorative chrome — `aria-hidden`, `pointer-events-none`. The
 * camera feed under it remains fully interactable for designate /
 * drop / focus.
 */
export function CenterCrosshair() {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none text-slate-12/35"
      data-testid="center-crosshair"
    >
      {/* Vertical arms (top + bottom of a 6-unit gap around centre). */}
      <line
        x1="50"
        y1="42"
        x2="50"
        y2="48"
        stroke="currentColor"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1="50"
        y1="52"
        x2="50"
        y2="58"
        stroke="currentColor"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      {/* Horizontal arms. */}
      <line
        x1="42"
        y1="50"
        x2="48"
        y2="50"
        stroke="currentColor"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1="52"
        y1="50"
        x2="58"
        y2="50"
        stroke="currentColor"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
