/**
 * accentHex.ts
 *
 * JS-side mirror of the OKLCH tokens defined in src/styles/palette.css.
 *
 * Some consumers can't read CSS vars cheaply at the place they paint:
 *
 *   - Cesium Color.fromCssColorString primitives + scene materials
 *   - SVG fill="" / stroke="" attributes inside icon components
 *   - Canvas 2D ctx.fillStyle
 *   - DialKit theme objects that take literal strings
 *
 * Routing these through getComputedStyle() at runtime would force a
 * style-recalculation per paint. Instead we generate the hex values
 * once from the same oklch() source as palette.css and check them in.
 *
 * NEW CONSUMERS
 * ─────────────
 * Prefer CSS vars (var(--accent-danger)) in className / inline style.
 * Use this module only when the consumer literally needs a hex
 * string (Cesium, SVG attrs, Canvas).
 */

export const SLATE_HEX = {
  1:  '#0d0e11',
  2:  '#15171a',
  3:  '#1e2124',
  4:  '#282c30',
  5:  '#353a40',
  6:  '#454b52',
  7:  '#5b616a',
  8:  '#737b85',
  9:  '#8d949f',
  10: '#aab2bd',
  11: '#ced5de',
  12: '#eff4fa',
} as const satisfies Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12, string>;

export const SURFACE_HEX = {
  void: '#010101',
  1: SLATE_HEX[1],
  2: SLATE_HEX[2],
  3: SLATE_HEX[3],
  4: SLATE_HEX[4],
  5: SLATE_HEX[5],
  6: SLATE_HEX[6],
  7: SLATE_HEX[7],
  8: SLATE_HEX[8],
} as const;

export const ACCENT_HEX = {
  danger:     '#fc4540',
  warning:    '#f89d00',
  tracking:   '#f87a1d',
  success:    '#65d86d',
  info:       '#3fcaff',
  historical: '#9296ff',
  cyan:       '#20d3db',
  magenta:    '#eb63c5',

  dangerSoft:  '#762924',
  warningSoft: '#6c4302',
  successSoft: '#2c5c2f',
  infoSoft:    '#1e576f',
} as const;

export const DISPOSITION_HEX = {
  suspect:       '#fc8b00',
  assumedFriend: '#65d86d',
  neutral:       '#eb63c5',
} as const;

/*
 * Marker/tactical tier — the map + SVG icon layer's named colors.
 * Everything the marker system paints comes from here (or SLATE_HEX /
 * ACCENT_HEX above) so map code never re-declares raw hex. Values that
 * have a palette twin alias it; the rest are marker-only hues declared
 * exactly once.
 */
export const MARKER_HEX = {
  /** Hostile / CRITICAL / HIGH urgency — the palette danger red. */
  hostile: ACCENT_HEX.danger,
  /** MEDIUM / "ambiguous, review" orange (marker-only hue). */
  possibleThreat: '#ff9e3d',
  /** Friendly-adjacent green (neutral glyph, jammer ring). */
  friendly: ACCENT_HEX.success,
  /** Unclassified-identity yellow (marker-only hue). */
  unknownYellow: '#facc15',
  /** Weapon-pointing / asset-warning amber — the palette warning. */
  weaponWarning: ACCENT_HEX.warning,
  /** Raw-blip "no identity yet" gray. */
  unknownGray: SLATE_HEX[10],
  /** LOW severity / desaturated-complete gray. */
  lowGray: SLATE_HEX[8],
  /** Disabled / offline marker gray. */
  disabledGray: SLATE_HEX[9],
  /** Expired glyph / inner-glow gray. */
  expiredGlyph: SLATE_HEX[6],
  /** Expired ring gray. */
  expiredRing: SLATE_HEX[5],
  /** Resting ring on friendly/neutral/unknown markers (near-black). */
  ringResting: SLATE_HEX[3],
  /** Outline ink used by the SVG map glyphs (near-black stroke). */
  ink: '#0a0a0a',
  /** Pure white — glyphs / rings / surfaces on the dark map. */
  white: '#ffffff',
} as const;

export type AccentName = keyof typeof ACCENT_HEX;
export type MarkerColorName = keyof typeof MARKER_HEX;
export type SlateStep = keyof typeof SLATE_HEX;
export type SurfaceLevel = keyof typeof SURFACE_HEX;
export type DispositionName = keyof typeof DISPOSITION_HEX;

/** Hex for a named accent. */
export const accentHex = (name: AccentName): string => ACCENT_HEX[name];

/** Hex for a slate ramp step. */
export const slateHex = (step: SlateStep): string => SLATE_HEX[step];

/** Hex for a surface level (1..8 or 'void'). */
export const surfaceHex = (level: SurfaceLevel): string => SURFACE_HEX[level];

/** Hex for a disposition token. */
export const dispositionHex = (name: DispositionName): string => DISPOSITION_HEX[name];
