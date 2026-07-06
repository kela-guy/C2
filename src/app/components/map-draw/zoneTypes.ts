/**
 * Zone Type registry — the semantic presets every drawn shape can be
 * tagged with. Picking a type stamps both the fill and the stroke color
 * of the shape to the type's signature hue, so on the map a shape's
 * color always reads as its type.
 *
 * Every new shape defaults to `general` (grey) — a catch-all "General
 * Annotation" type for shapes that don't need to declare a specific
 * airspace meaning. The panel still enforces that a type is always
 * picked. Adding a new type is a one-line entry here; the panel, the
 * on-map type chip, and the layer list all iterate this list.
 */

export type GeoZoneType =
  | 'general'
  | 'noFly'
  | 'restricted'
  | 'alarm'
  | 'silent';

export interface ZoneTypeMeta {
  id: GeoZoneType;
  label: string;
  /** Signature hex color for fill + stroke. */
  color: string;
  /** One-liner shown under the type label in the picker. */
  description: string;
}

// Ordered so `general` (the new default) is first — matches the order
// in the panel's Type dropdown. Palette: general grey, noFly blue,
// alarm red, silent yellow, restricted purple.
export const ZONE_TYPES: ZoneTypeMeta[] = [
  {
    id: 'general',
    label: 'General',
    color: '#9ca3af',
    description: 'Generic annotation — no specific meaning',
  },
  {
    id: 'noFly',
    label: 'No Fly Zone',
    color: '#3b82f6',
    description: 'Restricted airspace — flight blocked',
  },
  {
    id: 'alarm',
    label: 'Alarm Zone',
    color: '#ef4444',
    description: 'Triggers an alert when entered',
  },
  {
    id: 'silent',
    label: 'Silent Zone',
    color: '#eab308',
    description: 'No-emission / radio-silent area',
  },
  {
    id: 'restricted',
    label: 'Restricted Fly Zone',
    color: '#a855f7',
    description: 'Limited / conditional access airspace',
  },
];

export const ZONE_TYPE_BY_ID: Record<GeoZoneType, ZoneTypeMeta> =
  ZONE_TYPES.reduce<Record<GeoZoneType, ZoneTypeMeta>>((acc, t) => {
    acc[t.id] = t;
    return acc;
  }, {} as Record<GeoZoneType, ZoneTypeMeta>);

/**
 * The default type applied to every freshly-committed shape. Kept as a
 * single exported constant so the engine's `commitDraft`, the panel's
 * Type picker, and any downstream consumers all agree on the same
 * default without re-hardcoding the id.
 */
export const DEFAULT_ZONE_TYPE: GeoZoneType = 'general';

/**
 * Convenience: the type colors as a flat array — used as the Color &
 * Line palettes in the inspector so the only colors available are the
 * type colors.
 */
export const ZONE_TYPE_PALETTE: string[] = ZONE_TYPES.map((t) => t.color);

/**
 * Look up the signature color for a zone type. Falls back to the default
 * type's color when the id is unknown so callers never have to deal with
 * an undefined color mid-render.
 */
export function getZoneColor(id: GeoZoneType | undefined | null): string {
  if (id && ZONE_TYPE_BY_ID[id]) return ZONE_TYPE_BY_ID[id].color;
  return ZONE_TYPE_BY_ID[DEFAULT_ZONE_TYPE].color;
}
