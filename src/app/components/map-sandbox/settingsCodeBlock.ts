/**
 * Serialise a `MapSettings` snapshot to a paste-ready TS object literal.
 *
 * The string is intentionally diff-friendly: stable key ordering, two-space
 * indent, trailing commas. The body matches the shape declared in
 * `mapSettingsTypes.ts` so the operator can paste it straight into source
 * (or a future `DEFAULT_MAP_SETTINGS` override) without reshaping.
 */

import { DEFAULT_MAP_SETTINGS, type MapSettings } from './mapSettingsTypes';

const INDENT = '  ';

export function serializeMapSettings(settings: MapSettings): string {
  const lines: string[] = [];
  lines.push('export const MAP_SETTINGS: MapSettings = {');
  lines.push(`${INDENT}sceneMode: ${quote(settings.sceneMode)},`);
  lines.push(`${INDENT}mapStyle: ${quote(settings.mapStyle)},`);
  lines.push(serializeGroup('terrain', settings.terrain, 1));
  lines.push(serializeGroup('sky', settings.sky, 1));
  lines.push(serializeGroup('fog', settings.fog, 1));
  lines.push(serializeGroup('lighting', settings.lighting, 1));
  lines.push(serializeGroup('imagery', settings.imagery, 1));
  lines.push(serializeGroup('camera', settings.camera, 1));
  lines.push(serializeGroup('space', settings.space, 1));
  lines.push('};');
  return lines.join('\n');
}

function serializeGroup(name: string, group: Record<string, unknown>, depth: number): string {
  const pad = INDENT.repeat(depth);
  const childPad = INDENT.repeat(depth + 1);
  const rows: string[] = [`${pad}${name}: {`];
  for (const key of Object.keys(group)) {
    const value = group[key];
    if (isPlainObject(value)) {
      rows.push(serializeGroup(key, value, depth + 1));
    } else {
      rows.push(`${childPad}${key}: ${formatValue(value)},`);
    }
  }
  rows.push(`${pad}},`);
  return rows.join('\n');
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '0';
    if (Number.isInteger(value)) return String(value);
    // Preserve scientific notation for very small / large magnitudes —
    // 0.0002 reads as `2e-4` which keeps fog density legible.
    if (Math.abs(value) < 1e-3 || Math.abs(value) >= 1e5) return value.toExponential(2);
    return Number(value.toFixed(6)).toString();
  }
  return JSON.stringify(value);
}

function quote(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/**
 * Diff summary — list of `path: value` lines for keys that differ from
 * `DEFAULT_MAP_SETTINGS`. Useful when the operator wants to know what
 * they've actually changed before copying back.
 */
export function diffFromDefaults(settings: MapSettings): string[] {
  const diffs: string[] = [];
  walk(settings, DEFAULT_MAP_SETTINGS, '', diffs);
  return diffs;
}

function walk(
  next: Record<string, unknown>,
  base: Record<string, unknown>,
  prefix: string,
  out: string[],
): void {
  for (const key of Object.keys(next)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const a = next[key];
    const b = base[key];
    if (isPlainObject(a) && isPlainObject(b)) {
      walk(a, b, path, out);
    } else if (a !== b) {
      out.push(`${path}: ${formatValue(a)}`);
    }
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
