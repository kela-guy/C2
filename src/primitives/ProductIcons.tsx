/**
 * Product-specific glyphs that aren't part of the lucide library and aren't
 * tied to the tactical map. Lifted out of the original host files
 * (Dashboard, DevicesPanel, useDevicesFromAssets) so the styleguide's icon
 * library can render them and so any other consumer can re-use them
 * without copy/paste.
 *
 * Each icon accepts the same minimal prop surface — `size`, `className`,
 * and an icon-specific colour knob (`color` for stroke-based icons,
 * `fill` for the solid drone glyph). All shapes use `currentColor` so they
 * inherit the surrounding text colour by default.
 */

interface StrokeIconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

interface SimpleIconProps {
  size?: number;
  className?: string;
}

/** App brand mark — abstract drone/sensor pair used as the dashboard logo + brand chip. */
export function CuasIcon({ size = 20, strokeWidth = 2, className = '' }: StrokeIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9.5 5.398C7.093 6.19 5.19 8.093 4.398 10.5M19.86 14.5c.092-.486.14-.987.14-1.5 0-2.01-.742-3.848-1.966-5.253M6.708 19c1.41 1.245 3.263 2 5.292 2 .513 0 1.014-.048 1.5-.14" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="5" r="2.5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.82 14.835c1.196-.69 2.725-.28 3.415.915.69 1.196.28 2.724-.915 3.415-1.196.69-2.725.28-3.415-.915-.69-1.196-.28-2.725.916-3.415Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.672 19.165c-1.196-.69-1.605-2.22-.915-3.415.69-1.196 2.219-1.605 3.415-.915 1.195.69 1.605 2.219.915 3.415-.69 1.195-2.22 1.605-3.415.915Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Two-tone "C2" wordmark used in the dashboard sidebar. */
export function C2Logo({ size = 32, className = '' }: SimpleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.1483 17.565L20.7437 27.1604L20.8479 27.2601C22.623 28.9401 25.4215 28.9084 27.1603 27.1695L27.183 27.1468L36.7649 17.565L43.1679 23.968L23.9543 43.1816L4.74072 23.968L11.1437 17.565H11.1483ZM28.4373 23.3295C28.306 22.3921 27.8758 21.491 27.1558 20.7665C25.3853 18.9959 22.5188 18.9959 20.7528 20.7665C20.0328 21.4865 19.6071 22.3921 19.4713 23.3295L12.4253 16.2835L23.9543 4.75439L35.4834 16.2835L28.4373 23.3295Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Two-pane layout glyph used in the SplitDropZone affordance. The left pane
 * is filled to indicate it's the drop target.
 */
export function SplitLeftIcon({ size = 28, className = '' }: SimpleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="3" width="8" height="18" rx="2" fill="currentColor" fillOpacity="0.15" />
      <line x1="10" y1="3" x2="10" y2="21" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** ECM jam waveform glyph used inside DevicesPanel's ECM rows. */
export function JamIcon({ size = 16, className = '' }: SimpleIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width={size} height={size} className={className}>
      <path d="M22 12C19.5 10.5 19.5 5 17.5 5C15.5 5 15.5 10 13 10C10.5 10 10.5 2 8 2C5.5 2 5 10.5 2 12C5 13.5 5.5 22 8 22C10.5 22 10.5 14 13 14C15.5 14 15.5 19 17.5 19C19.5 19 19 13.5 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface BatteryIconProps {
  /** Charge percentage 0-100. Drives both the fill width and the colour. */
  pct: number;
  size?: number;
  className?: string;
}

/**
 * Battery glyph with a fill bar proportional to `pct` and a status colour
 * threshold. Used per-device in the DevicesPanel battery readout.
 */
export function BatteryIcon({ pct, size = 16, className = '' }: BatteryIconProps) {
  const colorClass = pct > 60 ? 'text-emerald-400' : pct > 30 ? 'text-amber-400' : pct >= 20 ? 'text-orange-400' : 'text-red-400';
  const fillWidth = Math.max(1, (pct / 100) * 17);
  return (
    <svg className={`${colorClass} ${className}`.trim()} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width={size} height={size}>
      <rect x="1" y="5" width="19" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="2.5" y="6.5" width={fillWidth} height="11" rx="1" fill="currentColor" />
      <rect x="20" y="10" width="3" height="4" rx="1" fill="currentColor" />
    </svg>
  );
}

interface DroneDeviceIconProps {
  size?: number;
  /** Solid fill colour. Defaults to white to match the original device-row chip. */
  fill?: string;
  className?: string;
}

/**
 * Solid arrow-shaped drone glyph used in the device list rows. Distinct
 * from the tactical-map `DroneIcon` which is rotated by heading.
 */
export function DroneDeviceIcon({ size = 28, fill = 'white', className = '' }: DroneDeviceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M23.334 15.7502L9.33696 0.583495L5.86139 4.0835L10.5007 11.0835L9.32456 15.7502L10.5007 20.4168L5.86139 27.4168L9.32456 30.6801L23.334 15.7502Z"
        fill={fill}
        stroke="#0a0a0a"
        strokeWidth="1"
      />
    </svg>
  );
}
