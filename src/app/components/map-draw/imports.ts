/**
 * Map-draw imports — KML + GeoJSON parser.
 *
 * Reads a user-picked file, sniffs the format (by extension first, then
 * by content), and turns each geometry into a normalized {@link ImportedShape}
 * whose points live in the drawing engine's `[0, 1]` coordinate space.
 *
 * ## Safe-area projection
 *
 * The engine's normalized `[0, 1]` space fills the whole map viewBox,
 * but the docked panel (see `MapDrawPanel` / `DockedPanel`) covers a
 * strip on the inline-start edge and `MapDrawOverlay` masks that
 * strip with a `clip-path: inset(...)`. Projecting a file into the
 * *full* viewBox therefore has two failure modes:
 *   1. Any vertex that lands under the panel's clip-path renders in
 *      the DOM but is hidden from the user *and* its drag handle sits
 *      behind the panel — the user can't grab it.
 *   2. Files whose bbox already fits inside `SANDBOX_BOUNDS` would
 *      otherwise clamp to the panel edge (or off-canvas entirely for
 *      files outside the sandbox AO).
 *
 * The parser sidesteps both by projecting into a "safe" sub-rectangle
 * of the viewBox:
 *   1. Extract every geometry as raw `lat/lng` tuples.
 *   2. Compute the file's own bbox.
 *   3. Extend the geographic bounds so that the bbox maps exactly to
 *      `[xLeft, xRight] × [yTop, yBottom]` in normalized viewBox
 *      space, where the sub-rectangle is chosen from the caller-
 *      supplied {@link ImportViewport} (panel width + RTL flag) with
 *      a fixed outer margin. See `pickProjectionBounds` for the
 *      derivation.
 *
 * The chosen (extended) bounds are surfaced on the {@link ImportResult}
 * so the caller can persist them on the shape as `sourceBounds` — the
 * panel's Coordinates section un-projects against them, which
 * algebraically recovers the file's original lat/lng at every
 * projected vertex.
 *
 * Scope: handles the common cases we care about — `Polygon`,
 * `LineString`, `Point`, and the `Multi*` variants — and skips anything
 * else with a soft warning. Nested `GeometryCollection`s and KML
 * `MultiGeometry` are flattened one level down. Altitudes are ignored.
 */

import { project, type Vec2 } from '../geo-entities-sandbox/drawTypes';
import type { GeoShapeKind, GeoToolId } from '../geo-entities-sandbox/drawTypes';
import type { GeoBounds } from '../geo-entities-sandbox/types';
import { SANDBOX_BOUNDS } from '../geo-entities-sandbox/fixtures';

/** A single geometry extracted from an imported file, ready to hand to
 *  the drawing engine. Points are already in `[0, 1]` normalized space. */
export interface ImportedShape {
  tool: GeoToolId;
  kind: GeoShapeKind;
  points: Vec2[];
  /** Optional label from the source file (KML `<name>` / GeoJSON `properties.name`). */
  name?: string;
}

export interface ImportResult {
  shapes: ImportedShape[];
  /**
   * Lat/lng bounds the file's raw coordinates were projected against.
   * These are the *extended* bounds computed by the parser so that the
   * file's own bbox lands inside a "safe" sub-rectangle of the map
   * viewBox (see {@link ImportViewport} + `pickProjectionBounds`). The
   * panel's Coordinates section un-projects normalized points back
   * against these bounds — algebraically that recovers the file's
   * original lat/lng at every projected vertex, so displayed values
   * still match the source file exactly.
   */
  bounds: GeoBounds;
  /** Non-fatal issues we skipped past (e.g. unsupported geometry types). */
  warnings: string[];
}

/**
 * Runtime viewport context passed by the upload handler so
 * {@link parseImportFile} can project the imported shape into the
 * portion of the map that isn't covered by the docked panel.
 *
 * Without this, a file whose bbox happens to project near the
 * inline-start edge would land underneath the panel's
 * `clip-path` — visible in the DOM but hidden from the user, and its
 * vertex handles would not be clickable.
 */
export interface ImportViewport {
  /**
   * Fraction (0..1) of the map's horizontal extent taken by the docked
   * panel on the inline-start edge. `0` when the panel is closed / no
   * panel. Typically ~0.25..0.4 for a ~400px sidebar on a laptop
   * viewport; clamped to `[0, 0.5]` internally.
   */
  panelInsetFraction?: number;
  /**
   * `true` when the document is in RTL layout — the panel then docks
   * on the right and the safe area sits on the left. Determines which
   * horizontal edge to reserve when computing the projection target.
   */
  isRtl?: boolean;
}

// ---------------------------------------------------------------------------
// Intermediate representation used between the raw-parse pass and the
// projection pass. Coordinates are lng/lat pairs straight from the file.
// ---------------------------------------------------------------------------

interface LatLng {
  lat: number;
  lng: number;
}

interface RawShape {
  tool: GeoToolId;
  kind: GeoShapeKind;
  /** Ordered lat/lng chain — polygon ring, polyline vertices, or a
   *  single point. */
  latLngs: LatLng[];
  name?: string;
}

/**
 * Read the given file and parse every supported geometry inside it.
 *
 * The optional {@link ImportViewport} lets the caller inform the
 * projection about the docked panel's current width so imported
 * shapes are placed in the visible ("safe") portion of the map, not
 * behind the panel's clip-path. When omitted, the parser falls back
 * to projecting into the full viewBox with a small margin.
 *
 * Throws when the file can't be classified or is structurally invalid
 * (unparseable JSON, malformed KML). Warnings collected inside the
 * result are non-fatal — the caller can surface them next to the
 * successful imports.
 */
export async function parseImportFile(
  file: File,
  viewport?: ImportViewport,
): Promise<ImportResult> {
  const text = await file.text();
  const format = detectFormat(file.name, text);

  let raw: { shapes: RawShape[]; warnings: string[] };
  if (format === 'geojson') raw = parseGeoJson(text);
  else if (format === 'kml') raw = parseKml(text);
  else throw new Error('Unsupported file. Expected .kml, .geojson, or .json.');

  const bounds = pickProjectionBounds(raw.shapes, viewport);
  const shapes = raw.shapes
    .map((r) => projectRaw(r, bounds))
    .filter((s): s is ImportedShape => s !== null);

  return { shapes, bounds, warnings: raw.warnings };
}

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

type Format = 'kml' | 'geojson' | null;

function detectFormat(filename: string, text: string): Format {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  if (ext === 'kml') return 'kml';
  if (ext === 'geojson' || ext === 'json') return 'geojson';

  // No conclusive extension — sniff the first meaningful character.
  const head = text.trim().slice(0, 200).toLowerCase();
  if (head.startsWith('<')) {
    if (head.includes('<kml')) return 'kml';
    return null;
  }
  if (head.startsWith('{') || head.startsWith('[')) return 'geojson';
  return null;
}

// ---------------------------------------------------------------------------
// Projection bounds selection + point projection
// ---------------------------------------------------------------------------

/**
 * Decide which geographic bounds to project every imported point
 * against. Instead of projecting into the full `[0, 1]` viewBox, we
 * target a "safe" sub-rectangle that steers clear of the docked
 * panel's clip-path (see `MapDrawOverlay`'s `clip-path: inset(...)`)
 * and leaves a small margin on the outer edges so the shape doesn't
 * kiss the canvas borders.
 *
 * Given a file bbox and a target sub-rectangle
 * `[xLeft, xRight] × [yTop, yBottom]` in normalized viewBox space, we
 * *extend* the geographic bounds so that
 *   project(fileMinLng) = xLeft, project(fileMaxLng) = xRight,
 *   project(fileMaxLat) = yTop,  project(fileMinLat) = yBottom.
 *
 * Since `project(v) = (v - min) / (max - min)` (with lat inverted), the
 * extended span is `fileSpan / (subRectSpan)` and the offset falls out
 * of the boundary conditions. The panel's Coordinates section
 * `unproject`s against these same extended bounds, which algebraically
 * recovers the file's original lat/lng for every projected vertex —
 * so the displayed coordinates still match the source file.
 *
 * Fallback: an empty file (no finite points) projects against
 * `SANDBOX_BOUNDS` so downstream `project()` calls never divide by
 * zero — but such a file also yields zero shapes, so nothing renders.
 */
function pickProjectionBounds(
  shapes: RawShape[],
  viewport?: ImportViewport,
): GeoBounds {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  let count = 0;
  for (const s of shapes) {
    for (const p of s.latLngs) {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
      count++;
    }
  }
  if (count === 0) return SANDBOX_BOUNDS;

  // Degenerate bboxes (single point or colinear points) get a hard
  // minimum span so the extended-bounds division doesn't blow up and
  // Point imports still land somewhere sensible.
  const dLng = maxLng - minLng > 0 ? maxLng - minLng : 0.02;
  const dLat = maxLat - minLat > 0 ? maxLat - minLat : 0.02;

  // Compute the target sub-rectangle in normalized viewBox space. The
  // panel occupies `panelInsetFraction` of the map's horizontal extent
  // on the inline-start edge; the outer margins give the shape some
  // visual breathing room (and keep hover-label chips off the canvas
  // edges). Clamp `panelInsetFraction` to `[0, 0.5]` so a
  // ridiculously wide panel doesn't collapse the safe area to zero.
  const marginX = 0.08;
  const marginY = 0.1;
  const inset = Math.min(
    0.5,
    Math.max(0, viewport?.panelInsetFraction ?? 0),
  );
  const isRtl = viewport?.isRtl === true;
  const xLeft = isRtl ? marginX : inset + marginX;
  const xRight = isRtl ? 1 - inset - marginX : 1 - marginX;
  const yTop = marginY;
  const yBottom = 1 - marginY;

  // Derived extended spans: `spanLng` is how wide the extended bounds
  // are so that `fileMin..fileMax` occupies exactly `xLeft..xRight` in
  // normalized space. Same for lat, with the flip baked into
  // `extMinLat` (lat grows northward, y grows southward).
  const spanLng = dLng / (xRight - xLeft);
  const spanLat = dLat / (yBottom - yTop);
  const extMinLng = minLng - xLeft * spanLng;
  const extMinLat = minLat - (1 - yBottom) * spanLat;

  return {
    minLng: extMinLng,
    maxLng: extMinLng + spanLng,
    minLat: extMinLat,
    maxLat: extMinLat + spanLat,
  };
}

function projectRaw(raw: RawShape, bounds: GeoBounds): ImportedShape | null {
  const projected: Vec2[] = [];
  for (const p of raw.latLngs) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    projected.push(project(p, bounds));
  }
  // Drop the trailing duplicate that closes a GeoJSON polygon ring or
  // KML LinearRing — the engine's polygons don't repeat the first
  // point at the end (the renderer closes the path automatically).
  if (
    (raw.kind === 'polygon' || raw.kind === 'freehand') &&
    projected.length >= 2
  ) {
    const first = projected[0];
    const last = projected[projected.length - 1];
    if (
      Math.abs(first.x - last.x) < 1e-9 &&
      Math.abs(first.y - last.y) < 1e-9
    ) {
      projected.pop();
    }
  }
  const deduped = dedupeAdjacent(projected);
  // Reject shapes that collapsed to fewer points than their geometry
  // needs to render — a 2-vertex polygon or a 1-vertex line would
  // render as an invisible artifact.
  if (raw.kind === 'polygon' && deduped.length < 3) return null;
  if (raw.kind === 'polyline' && deduped.length < 2) return null;
  if (raw.kind === 'point' && deduped.length < 1) return null;
  return {
    tool: raw.tool,
    kind: raw.kind,
    points: deduped,
    name: raw.name,
  };
}

// ---------------------------------------------------------------------------
// GeoJSON
// ---------------------------------------------------------------------------

interface GeoJsonGeometry {
  type: string;
  coordinates?: unknown;
  geometries?: GeoJsonGeometry[];
}

interface GeoJsonFeature {
  type?: string;
  geometry?: GeoJsonGeometry | null;
  properties?: Record<string, unknown> | null;
}

function parseGeoJson(text: string): { shapes: RawShape[]; warnings: string[] } {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch (err) {
    throw new Error(
      `Invalid GeoJSON — ${(err as Error).message.replace(/^JSON.parse:\s*/i, '')}`,
    );
  }

  const shapes: RawShape[] = [];
  const warnings: string[] = [];

  const visit = (node: unknown, defaultName?: string): void => {
    if (!node || typeof node !== 'object') return;
    const record = node as Record<string, unknown>;
    const type = record.type as string | undefined;

    if (type === 'FeatureCollection' && Array.isArray(record.features)) {
      for (const f of record.features as GeoJsonFeature[]) visit(f);
      return;
    }
    if (type === 'Feature') {
      const feature = record as unknown as GeoJsonFeature;
      const props = feature.properties ?? {};
      const name =
        (typeof props.name === 'string' && props.name) ||
        (typeof props.Name === 'string' && props.Name) ||
        (typeof props.title === 'string' && props.title) ||
        undefined;
      visit(feature.geometry, name || defaultName);
      return;
    }
    if (type === 'GeometryCollection' && Array.isArray(record.geometries)) {
      for (const g of record.geometries as GeoJsonGeometry[]) visit(g, defaultName);
      return;
    }

    const geom = record as unknown as GeoJsonGeometry;
    switch (geom.type) {
      case 'Polygon': {
        const rings = geom.coordinates as number[][][] | undefined;
        const outer = rings?.[0];
        if (!outer) return;
        shapes.push({
          tool: 'polygon',
          kind: 'polygon',
          latLngs: lngLatArrayToLatLngs(outer),
          name: defaultName,
        });
        return;
      }
      case 'MultiPolygon': {
        const polys = geom.coordinates as number[][][][] | undefined;
        if (!polys) return;
        polys.forEach((rings, i) => {
          const outer = rings?.[0];
          if (!outer) return;
          shapes.push({
            tool: 'polygon',
            kind: 'polygon',
            latLngs: lngLatArrayToLatLngs(outer),
            name: defaultName ? `${defaultName} ${i + 1}` : undefined,
          });
        });
        return;
      }
      case 'LineString': {
        const coords = geom.coordinates as number[][] | undefined;
        if (!coords) return;
        shapes.push({
          tool: 'line',
          kind: 'polyline',
          latLngs: lngLatArrayToLatLngs(coords),
          name: defaultName,
        });
        return;
      }
      case 'MultiLineString': {
        const lines = geom.coordinates as number[][][] | undefined;
        if (!lines) return;
        lines.forEach((line, i) => {
          shapes.push({
            tool: 'line',
            kind: 'polyline',
            latLngs: lngLatArrayToLatLngs(line),
            name: defaultName ? `${defaultName} ${i + 1}` : undefined,
          });
        });
        return;
      }
      case 'Point': {
        const c = geom.coordinates as number[] | undefined;
        if (!c || c.length < 2) return;
        shapes.push({
          tool: 'point',
          kind: 'point',
          latLngs: [{ lng: c[0], lat: c[1] }],
          name: defaultName,
        });
        return;
      }
      case 'MultiPoint': {
        const pts = geom.coordinates as number[][] | undefined;
        if (!pts) return;
        pts.forEach((c, i) => {
          if (c.length < 2) return;
          shapes.push({
            tool: 'point',
            kind: 'point',
            latLngs: [{ lng: c[0], lat: c[1] }],
            name: defaultName ? `${defaultName} ${i + 1}` : undefined,
          });
        });
        return;
      }
      case undefined:
        return;
      default:
        warnings.push(`Skipped unsupported geometry: ${geom.type}`);
    }
  };

  visit(doc);

  return { shapes, warnings };
}

// ---------------------------------------------------------------------------
// KML
// ---------------------------------------------------------------------------

function parseKml(text: string): { shapes: RawShape[]; warnings: string[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');
  const parserError = doc.getElementsByTagName('parsererror')[0];
  if (parserError) {
    throw new Error(
      `Invalid KML — ${parserError.textContent?.trim() || 'parse error'}`,
    );
  }

  const shapes: RawShape[] = [];
  const warnings: string[] = [];

  const placemarks = Array.from(doc.getElementsByTagName('Placemark'));
  for (const placemark of placemarks) {
    const name =
      firstChildTextByTag(placemark, 'name')?.trim() || undefined;
    collectFromKmlGeometry(placemark, name, shapes, warnings);
  }

  return { shapes, warnings };
}

function collectFromKmlGeometry(
  root: Element,
  name: string | undefined,
  out: RawShape[],
  warnings: string[],
): void {
  // MultiGeometry: recurse into each child geometry and STOP — the
  // per-tag lookups below would otherwise double-count children of a
  // MultiGeometry that also live inside the same Placemark.
  const mgs = Array.from(root.getElementsByTagName('MultiGeometry'));
  if (mgs.length > 0) {
    for (const mg of mgs) {
      for (const child of Array.from(mg.children)) {
        collectFromKmlGeometry(child, name, out, warnings);
      }
    }
    return;
  }

  for (const poly of Array.from(root.getElementsByTagName('Polygon'))) {
    const outer = poly.getElementsByTagName('outerBoundaryIs')[0];
    const ring = outer?.getElementsByTagName('LinearRing')[0];
    const coordsText = firstChildTextByTag(ring ?? poly, 'coordinates');
    if (!coordsText) continue;
    out.push({
      tool: 'polygon',
      kind: 'polygon',
      latLngs: parseKmlCoordinateList(coordsText),
      name,
    });
  }

  for (const line of Array.from(root.getElementsByTagName('LineString'))) {
    const coordsText = firstChildTextByTag(line, 'coordinates');
    if (!coordsText) continue;
    out.push({
      tool: 'line',
      kind: 'polyline',
      latLngs: parseKmlCoordinateList(coordsText),
      name,
    });
  }

  for (const pt of Array.from(root.getElementsByTagName('Point'))) {
    const coordsText = firstChildTextByTag(pt, 'coordinates');
    if (!coordsText) continue;
    const list = parseKmlCoordinateList(coordsText);
    if (list.length === 0) continue;
    out.push({
      tool: 'point',
      kind: 'point',
      latLngs: [list[0]],
      name,
    });
  }

  // Everything else (LinearRing outside a Polygon, Model, etc.) is
  // ignored quietly for now — surface as a soft warning so the user
  // knows we saw it.
  const seen = new Set<string>();
  for (const el of Array.from(root.children)) {
    if (
      el.tagName === 'name' ||
      el.tagName === 'description' ||
      el.tagName === 'Polygon' ||
      el.tagName === 'LineString' ||
      el.tagName === 'Point' ||
      el.tagName === 'MultiGeometry' ||
      el.tagName === 'ExtendedData' ||
      el.tagName === 'styleUrl' ||
      el.tagName === 'Style' ||
      el.tagName === 'TimeStamp' ||
      el.tagName === 'TimeSpan' ||
      el.tagName === 'visibility' ||
      el.tagName === 'open'
    ) {
      continue;
    }
    if (seen.has(el.tagName)) continue;
    seen.add(el.tagName);
    warnings.push(`Skipped unsupported KML element: <${el.tagName}>`);
  }
}

/** Direct child element with the given tag name (case-insensitive because
 *  KML tags are conventionally PascalCase but we've seen lowercase in the
 *  wild). Returns the child's text content, or `null`. */
function firstChildTextByTag(el: Element | null, tag: string): string | null {
  if (!el) return null;
  const lower = tag.toLowerCase();
  for (const child of Array.from(el.children)) {
    if (child.tagName.toLowerCase() === lower) {
      return child.textContent ?? null;
    }
  }
  return null;
}

/** Parse a KML `<coordinates>` block into `[lng, lat]` tuples. KML
 *  encodes tuples as `lng,lat[,alt]` separated by whitespace or newlines. */
function parseKmlCoordinateList(text: string): LatLng[] {
  const out: LatLng[] = [];
  for (const raw of text.trim().split(/\s+/)) {
    if (!raw) continue;
    const parts = raw.split(',').map((s) => parseFloat(s));
    if (
      parts.length < 2 ||
      !Number.isFinite(parts[0]) ||
      !Number.isFinite(parts[1])
    ) {
      continue;
    }
    out.push({ lng: parts[0], lat: parts[1] });
  }
  return out;
}

/** GeoJSON stores every ordered position as `[lng, lat, alt?]`. Convert
 *  a whole ring / line into our lat/lng shape, dropping altitude. */
function lngLatArrayToLatLngs(arr: number[][]): LatLng[] {
  const out: LatLng[] = [];
  for (const c of arr) {
    if (!c || c.length < 2) continue;
    const lng = c[0];
    const lat = c[1];
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    out.push({ lng, lat });
  }
  return out;
}

/** Remove exact-duplicate consecutive points that survived projection —
 *  a common artifact when two source coordinates round to the same
 *  normalized cell. Leaves distinct vertices untouched. */
function dedupeAdjacent(points: Vec2[]): Vec2[] {
  const out: Vec2[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || Math.abs(last.x - p.x) > 1e-9 || Math.abs(last.y - p.y) > 1e-9) {
      out.push(p);
    }
  }
  return out;
}
