/**
 * Zone Type registry — the 4 semantic presets every drawn shape can be
 * tagged with. Picking a type sets both the fill and the line color of
 * the shape to the type's signature hue, so on the map a shape's color
 * always reads as its type.
 *
 * Adding a 5th type is a one-line entry here; the panel, the Color and
 * Line palettes, and the on-map type chip all iterate this list.
 */

export type GeoZoneType = 'noFly' | 'restricted' | 'alarm' | 'silent';

export interface ZoneTypeMeta {
  id: GeoZoneType;
  label: string;
  /** Signature hex color for fill + stroke. */
  color: string;
  /** One-liner shown under the type label in the picker. */
  description: string;
}

export const ZONE_TYPES: ZoneTypeMeta[] = [
  {
    id: 'noFly',
    label: 'No Fly Zone',
    color: '#3b82f6',
    description: 'Restricted airspace — flight blocked',
  },
  {
    id: 'restricted',
    label: 'Restricted Fly Zone',
    color: '#f43f5e',
    description: 'Limited / conditional access airspace',
  },
  {
    id: 'alarm',
    label: 'Alarm Zone',
    color: '#f59e0b',
    description: 'Triggers an alert when entered',
  },
  {
    id: 'silent',
    label: 'Silent Zone',
    color: '#10b981',
    description: 'No-emission / radio-silent area',
  },
];

export const ZONE_TYPE_BY_ID: Record<GeoZoneType, ZoneTypeMeta> =
  ZONE_TYPES.reduce<Record<GeoZoneType, ZoneTypeMeta>>((acc, t) => {
    acc[t.id] = t;
    return acc;
  }, {} as Record<GeoZoneType, ZoneTypeMeta>);

/**
 * Convenience: the 4 type colors as a flat array — used as the Color &
 * Line palettes in the inspector so the only colors available are the
 * type colors.
 */
export const ZONE_TYPE_PALETTE: string[] = ZONE_TYPES.map((t) => t.color);
