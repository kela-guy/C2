/**
 * Geo Drawing Sandbox — tool registry.
 *
 * A single source of truth for the drawing tools the toolbar variants render
 * and the controller wires up. Each tool declares its underlying geometry,
 * label, central icon, and default colors; the tool id is the key the rest of
 * the surface keys off (active tool, default name prefix, etc.).
 *
 * Adding a tool is a one-line entry here — every toolbar variant iterates
 * {@link DRAW_TOOLS} so they stay in lockstep.
 */

import type { ComponentType } from 'react';
import type { IconProps } from '@/lib/icons/central';
import {
  Ban,
  Circle,
  Crosshair,
  Curve,
  LineSegment,
  MapPin,
  Pencil,
  Polygon,
  Route,
  Ruler,
} from '@/lib/icons/central';
import type { GeoShapeKind, GeoToolId } from './drawTypes';

export interface ToolDescriptor {
  id: GeoToolId;
  /** Underlying geometry the tool draws. `select` has no geometry. */
  kind: GeoShapeKind | 'select';
  label: string;
  /** Short helper shown in tooltips / dropdown subtitles. */
  description: string;
  Icon: ComponentType<IconProps>;
  /** Hex stroke color. */
  color: string;
  /** Default fill opacity for area tools. */
  fillOpacity: number;
  /** Coarse grouping for the segmented variant (and any future grouping). */
  group: 'cursor' | 'areas' | 'lines' | 'points' | 'free' | 'geometry';
}

export const DRAW_TOOLS: ToolDescriptor[] = [
  {
    id: 'select',
    kind: 'select',
    label: 'Select',
    description: 'Pick & transform existing shapes',
    Icon: Crosshair,
    color: '#94a3b8',
    fillOpacity: 0,
    group: 'cursor',
  },
  {
    id: 'noFlyZone',
    kind: 'polygon',
    label: 'No Fly Zone',
    description: 'Polygon — restricted airspace',
    Icon: Ban,
    color: '#f43f5e',
    fillOpacity: 0.18,
    group: 'areas',
  },
  {
    id: 'patrolArea',
    kind: 'polygon',
    label: 'Patrol Area',
    description: 'Polygon — area to sweep',
    Icon: Route,
    color: '#38bdf8',
    fillOpacity: 0.16,
    group: 'areas',
  },
  {
    id: 'virtualWall',
    kind: 'polyline',
    label: 'Virtual Wall',
    description: 'Polyline — barrier / fence',
    Icon: Ruler,
    color: '#a78bfa',
    fillOpacity: 0,
    group: 'lines',
  },
  {
    id: 'criticalPoint',
    kind: 'point',
    label: 'Critical Point',
    description: 'Single point of interest',
    Icon: MapPin,
    color: '#facc15',
    fillOpacity: 0,
    group: 'points',
  },
  {
    id: 'freeDraw',
    kind: 'freehand',
    label: 'Free Drawing',
    description: 'Freehand path / area',
    Icon: Pencil,
    color: '#34d399',
    fillOpacity: 0.14,
    group: 'free',
  },
  // ---------------------------------------------------------------------
  // Geometric tools — used by the "For Cursor" toolbar where the picker
  // surfaces the underlying shape (polygon / line / curve) instead of a
  // semantic role. The drawing engine treats them like any other tool;
  // their entries here let `toolById()` resolve labels, icons and default
  // colors for shapes the user commits via the geometry picker.
  // ---------------------------------------------------------------------
  {
    id: 'polygon',
    kind: 'polygon',
    label: 'Polygon',
    description: 'Closed multi-vertex shape',
    Icon: Polygon,
    color: '#f43f5e',
    fillOpacity: 0.18,
    group: 'geometry',
  },
  {
    id: 'line',
    kind: 'polyline',
    label: 'Line',
    description: 'Straight segments / polyline',
    Icon: LineSegment,
    color: '#a78bfa',
    fillOpacity: 0,
    group: 'geometry',
  },
  {
    id: 'curve',
    kind: 'freehand',
    label: 'Curve',
    description: 'Freehand curved path',
    Icon: Curve,
    color: '#34d399',
    fillOpacity: 0.14,
    group: 'geometry',
  },
  {
    id: 'circle',
    kind: 'circle',
    label: 'Circle',
    description: 'Center-out circle / radius zone',
    Icon: Circle,
    color: '#38bdf8',
    fillOpacity: 0.16,
    group: 'geometry',
  },
];

/**
 * Tools the user can draw with via the legacy "semantic" toolbar variants
 * (everything except `select` and the geometric `polygon` / `line` / `curve`
 * triplet — those are picked through the dedicated For Cursor toolbar).
 */
export const DRAWABLE_TOOLS: ToolDescriptor[] = DRAW_TOOLS.filter(
  (t) => t.id !== 'select' && t.group !== 'geometry',
);

/**
 * Three geometric tools the For Cursor toolbar surfaces in its expand-row.
 * Order matters — it's the visual order in the picker.
 */
export const GEOMETRY_TOOLS: ToolDescriptor[] = DRAW_TOOLS.filter(
  (t) => t.group === 'geometry',
);

export function toolById(id: GeoToolId): ToolDescriptor {
  const t = DRAW_TOOLS.find((d) => d.id === id);
  if (!t) throw new Error(`Unknown tool id: ${id}`);
  return t;
}

/** Curated palette for the fill-color picker in the edit panel. */
export const FILL_PALETTE: string[] = [
  '#f43f5e', // rose / no-fly
  '#fb923c', // orange / caution
  '#facc15', // amber / critical
  '#34d399', // emerald / patrol
  '#38bdf8', // sky
  '#a78bfa', // violet
  '#f472b6', // pink
  '#94a3b8', // slate
];
