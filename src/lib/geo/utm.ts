/**
 * WGS84 → UTM conversion.
 *
 * Operators in this app live in tactical readouts where horizontal
 * space is scarce. UTM packs a fix into two integers (easting,
 * northing in metres) instead of two long decimal-degree strings, so
 * a 5-decimal `32.48300, 35.02600` becomes `687985 / 3594214` — same
 * precision, ~25% less width, and avoids the float-vs-DMS ambiguity
 * operators have to mentally parse.
 *
 * No proj4 / geodesy dep: WGS84 → UTM is fixed math (Snyder, USGS
 * PP 1395, §8). Inlining keeps the bundle slim and avoids a runtime
 * dependency for a 30-line transform.
 *
 * Polar regions (|lat| ≥ 84°) fall outside UTM; callers shouldn't
 * be feeding those — this app's coverage is tactical mid-latitude.
 */

const A = 6378137; // WGS84 semi-major axis (m)
const F = 1 / 298.257223563; // flattening
const E2 = F * (2 - F); // first eccentricity²
const EP2 = E2 / (1 - E2); // second eccentricity²
const K0 = 0.9996; // UTM central-meridian scale

export interface UtmFix {
  easting: number;
  northing: number;
  zone: number;
  hemisphere: 'N' | 'S';
}

export function latLonToUtm(lat: number, lon: number): UtmFix {
  const zone = Math.floor((lon + 180) / 6) + 1;
  const lon0 = (zone - 1) * 6 - 180 + 3;

  const φ = (lat * Math.PI) / 180;
  const λ = (lon * Math.PI) / 180;
  const λ0 = (lon0 * Math.PI) / 180;

  const sinφ = Math.sin(φ);
  const cosφ = Math.cos(φ);
  const tanφ = Math.tan(φ);

  const N = A / Math.sqrt(1 - E2 * sinφ * sinφ);
  const T = tanφ * tanφ;
  const C = EP2 * cosφ * cosφ;
  const Aa = cosφ * (λ - λ0);

  const M =
    A *
    ((1 - E2 / 4 - (3 * E2 * E2) / 64 - (5 * E2 ** 3) / 256) * φ -
      ((3 * E2) / 8 + (3 * E2 * E2) / 32 + (45 * E2 ** 3) / 1024) *
        Math.sin(2 * φ) +
      ((15 * E2 * E2) / 256 + (45 * E2 ** 3) / 1024) * Math.sin(4 * φ) -
      ((35 * E2 ** 3) / 3072) * Math.sin(6 * φ));

  const easting =
    K0 *
      N *
      (Aa +
        ((1 - T + C) * Aa ** 3) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * EP2) * Aa ** 5) / 120) +
    500000;

  let northing =
    K0 *
    (M +
      N *
        tanφ *
        ((Aa * Aa) / 2 +
          ((5 - T + 9 * C + 4 * C * C) * Aa ** 4) / 24 +
          ((61 - 58 * T + T * T + 600 * C - 330 * EP2) * Aa ** 6) / 720));

  if (lat < 0) northing += 10_000_000;

  return { easting, northing, zone, hemisphere: lat >= 0 ? 'N' : 'S' };
}

/** Format a fix as `<easting>/<northing>` (integers, metre precision). */
export function formatUtm(lat: number, lon: number): string {
  const { easting, northing } = latLonToUtm(lat, lon);
  return `${Math.round(easting)}/${Math.round(northing)}`;
}
