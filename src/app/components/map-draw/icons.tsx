/**
 * Map-draw glyph set — bespoke SVGs supplied by design that don't have a
 * direct Central match (the polygon-with-vertices, the dashed circle, the
 * 45° line). They live alongside the feature instead of in the central
 * icon wrapper because they're feature-specific and are sized at 24px in
 * the rail / flyout, identical to the lucide/Central glyphs around them.
 *
 * All three accept the standard `size` / `className` props and inherit
 * the parent text color (`fill="currentColor"` / `stroke="currentColor"`)
 * so the rail's pressed/hover styles light them up the same way the
 * sibling Toggle buttons treat their icons.
 */

import type { SVGProps } from 'react';

export interface DrawIconProps extends Omit<SVGProps<SVGSVGElement>, 'fill' | 'stroke'> {
  size?: number;
}

/**
 * "Polygon with handles" rail glyph — 4 small squares pinned at the
 * corners of an irregular pentagon outline. Used as the rail trigger that
 * opens the draw flyout.
 */
export function PolygonDrawIcon({ size = 20, ...rest }: DrawIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...rest}
    >
      <rect x="3" y="10" width="4" height="4" fill="currentColor" />
      <rect x="9" y="1" width="4" height="4" fill="currentColor" />
      <rect x="18" y="6" width="4" height="4" fill="currentColor" />
      <rect x="12" y="19" width="4" height="4" fill="currentColor" />
      <path d="M11 3.5L5 12L14 20.5L20 8.5L11 3.5Z" stroke="currentColor" />
    </svg>
  );
}

/**
 * "Stacked layers" — two overlaid open diamond outlines. Rail glyph for
 * the Geo Entities panel trigger; the layered-stack semantic reads
 * better than the polygon-with-handles when the button's job is "open
 * the list of drawn layers" rather than "arm a draw tool". Stroke-only
 * so the glyph inherits the rail's color states (`currentColor`).
 */
export function LayersStackIcon({ size = 20, ...rest }: DrawIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...rest}
    >
      <path
        d="M8 12.2222L3 15L12 20L21 15L16 12.2222M12 4L3 9L12 14L21 9L12 4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
      />
    </svg>
  );
}

/**
 * "Dashed circle" — represents the freehand / curve drawing tool in the
 * map-draw flyout.
 */
export function CurveDrawIcon({ size = 20, ...rest }: DrawIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...rest}
    >
      <path
        d="M14.9316 21.6152L13.9502 21.8096C13.3186 21.9345 12.6665 22 12 22C11.3335 22 10.6814 21.9345 10.0498 21.8096L9.06836 21.6152L9.45703 19.6533L10.4375 19.8477C10.942 19.9475 11.4644 20 12 20C12.5356 20 13.058 19.9475 13.5625 19.8477L14.543 19.6533L14.9316 21.6152ZM5.34668 16.4443C5.93103 17.3172 6.68282 18.069 7.55566 18.6533L8.38672 19.209L7.27441 20.8711L6.44336 20.3154C5.35328 19.5856 4.41436 18.6467 3.68457 17.5566L3.12891 16.7256L4.79102 15.6133L5.34668 16.4443ZM20.8711 16.7256L20.3154 17.5566C19.5856 18.6467 18.6467 19.5856 17.5566 20.3154L16.7256 20.8711L15.6133 19.209L16.4443 18.6533C17.3172 18.069 18.069 17.3172 18.6533 16.4443L19.209 15.6133L20.8711 16.7256ZM2 12C2 11.3335 2.06551 10.6814 2.19043 10.0498L2.38477 9.06836L4.34668 9.45703L4.15234 10.4375C4.05254 10.942 4 11.4644 4 12C4 12.5356 4.05254 13.058 4.15234 13.5625L4.34668 14.543L2.38477 14.9316L2.19043 13.9502C2.06551 13.3186 2 12.6665 2 12ZM20 12C20 11.3139 19.8942 10.7349 19.7178 10.248L19.377 9.30762L21.2568 8.62598L21.5977 9.56641C21.8614 10.2939 22 11.1063 22 12C22 12.6665 21.9345 13.3186 21.8096 13.9502L21.6152 14.9316L19.6533 14.543L19.8477 13.5625C19.9475 13.058 20 12.5356 20 12ZM11.1084 8.36133L10.3574 9.02246C9.90425 9.42148 9.60023 9.86046 9.44824 10.3164L9.13281 11.2646L7.23535 10.6328L7.55176 9.68359C7.83676 8.82879 8.37296 8.10536 9.03613 7.52148L9.78711 6.86035L11.1084 8.36133ZM8.38672 4.79102L7.55566 5.34668C6.68282 5.93103 5.93103 6.68282 5.34668 7.55566L4.79102 8.38672L3.12891 7.27441L3.68457 6.44336C4.41436 5.35328 5.35328 4.41436 6.44336 3.68457L7.27441 3.12891L8.38672 4.79102ZM13.3994 5.61133C14.9592 5.37078 16.6396 5.482 18.1104 6.06641L19.0391 6.43555L18.3008 8.29395L17.3711 7.9248C16.2908 7.49563 14.9807 7.391 13.7041 7.58789L12.7158 7.74023L12.4111 5.76367L13.3994 5.61133ZM13 2V4H12C11.4644 4 10.942 4.05254 10.4375 4.15234L9.45703 4.34668L9.06836 2.38477L10.0498 2.19043C10.6814 2.06551 11.3335 2 12 2H13Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Circle outline with a center dot + radius tick — the circle drawing
 * tool glyph (center-out radius zone).
 */
export function CircleDrawIcon({ size = 20, ...rest }: DrawIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...rest}
    >
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <line x1="12" y1="12" x2="20.5" y2="12" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" />
    </svg>
  );
}

/**
 * Upload glyph — a tray with an upward arrow. Used by the Coordinates
 * section's "Upload file" button. Central Icons doesn't ship a matching
 * neutral upload glyph, so we keep this bespoke SVG alongside the rest
 * of the map-draw icon set.
 */
export function UploadIcon({ size = 14, ...rest }: DrawIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...rest}
    >
      <path
        d="M12 4L12 15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M7 9L12 4L17 9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 15V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Diagonal stroke — the straight-line drawing tool glyph.
 */
export function LineDrawIcon({ size = 20, ...rest }: DrawIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...rest}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M21.4144 4.00015L4.00015 21.4143L2.58594 20.0001L20.0002 2.58594L21.4144 4.00015Z"
        fill="currentColor"
      />
    </svg>
  );
}
