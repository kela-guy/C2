/**
 * Wifi-off corner badge for the device icon tile — the structural "offline"
 * cue chosen in the `/devices-lab` state-color audition. Rides the tile's
 * bottom-end corner so a disconnected asset reads at a glance even when the
 * dimmed tint is easy to miss in a long list.
 */

/**
 * The chosen wifi-off glyph (provided by design — not a Central icon).
 * `currentColor` fills so the surrounding chrome decides the tint.
 */
export function WifiOffGlyph({ size = 11, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M2.38477 7.28347C7.9954 2.90421 16.0047 2.90421 21.6153 7.28347L20.3848 8.86007C15.4974 5.04534 8.50271 5.04534 3.61535 8.86007L2.38477 7.28347Z"
        fill="currentColor"
      />
      <path
        d="M16.6351 14.103C13.9346 11.9969 10.0665 11.9969 7.36601 14.103L6.13606 12.5259C9.55957 9.85595 14.4415 9.85595 17.865 12.5259L16.6351 14.103Z"
        fill="currentColor"
      />
      <path
        d="M10.75 18.75C10.75 19.4404 11.3096 20 12 20C12.6904 20 13.25 19.4404 13.25 18.75C13.25 18.0596 12.6904 17.5 12 17.5C11.3096 17.5 10.75 18.0596 10.75 18.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Inline "offline" chip for the device row — the second half of the chosen
 * treatment (corner badge on the tile + this chip in the row). Rendered
 * immediately inline-start of the Show-on-map action, so it reads as part of
 * the row's persistent cluster in both LTR and RTL.
 */
export function OfflineChip({ label }: { label: string }) {
  return (
    <span
      data-handoff-component="device-offline-chip"
      className="inline-flex h-4 shrink-0 items-center gap-1 rounded-[2px] bg-state-hover-strong px-1.5 text-2xs font-medium leading-4 text-slate-10"
    >
      <WifiOffGlyph size={9} />
      {label}
    </span>
  );
}

/**
 * Wifi-off badge riding a map marker's top-end corner — the map-side half of
 * the offline treatment (dashed gray ring + this badge). Sized/positioned for
 * the standard 42px asset marker; callers wrap the marker in a relative box.
 */
export function MarkerOfflineBadge() {
  return (
    <div
      // Map-anchored chrome: the near-black well + white hairline are
      // intentionally physical (the badge floats over basemap imagery,
      // not an app surface), matching the marker ring language.
      className="pointer-events-none absolute z-[6] flex items-center justify-center rounded-full text-slate-11"
      style={{
        width: 18,
        height: 18,
        right: -4,
        top: -4,
        background: 'rgba(10,10,10,0.95)',
        border: '1px solid rgba(255,255,255,0.25)',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.9)',
      }}
    >
      <WifiOffGlyph size={11} />
    </div>
  );
}

export function OfflineBadge({ size = 20 }: { size?: number }) {
  const iconSize = Math.round(size * 0.64);
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-1 -end-1 flex items-center justify-center rounded-full border border-border-strong bg-surface-2/95 text-slate-10"
      style={{ width: size, height: size }}
    >
      <WifiOffGlyph size={iconSize} />
    </span>
  );
}
