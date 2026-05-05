/**
 * Icon export helpers for the styleguide Icon Library.
 *
 * Three pure functions sit on top of `iconToSvgString`:
 *
 *  - `copyIconSvg`     — write the SVG markup to the clipboard.
 *  - `downloadIconSvg` — trigger a browser download as `.svg`.
 *  - `downloadIconPng` — raster the SVG into a transparent PNG via canvas.
 *
 * For React-component entries we use `react-dom/server`'s
 * `renderToStaticMarkup` (synchronous, no DOM mount, no client renderer
 * overhead). For static asset entries we `fetch` the SVG file directly.
 *
 * Every export goes through `normalizeSvg` so the resulting markup always
 * carries an explicit `xmlns`, `width`, and `height` — required for the
 * file to render correctly when opened standalone.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { IconEntry } from '@/lib/iconRegistry';

export interface ExportOptions {
  /** Pixel size for the bounding box. Default 24. */
  size?: number;
  /** Stroke width for line icons. Defaults to lucide's default of 2. */
  strokeWidth?: number;
  /** Color used for lucide / stroked product icons. Defaults to currentColor. */
  color?: string;
  /**
   * Optional fill applied to the icon. When omitted the component renders
   * with its native default (lucide stays unfilled, custom glyphs use
   * whatever fill they author). Pass `'currentColor'` to render lucide
   * icons as filled silhouettes.
   */
  fill?: string;
}

interface ResolvedExportOptions {
  size: number;
  strokeWidth: number;
  color: string;
  fill: string | undefined;
}

const DEFAULT_OPTS: ResolvedExportOptions = {
  size: 24,
  strokeWidth: 2,
  color: 'currentColor',
  fill: undefined,
};

function withDefaults(opts: ExportOptions = {}): ResolvedExportOptions {
  return { ...DEFAULT_OPTS, ...opts };
}

/**
 * Force the resulting markup to carry the attributes required for it to
 * render in isolation. lucide already does this; first-party glyphs and
 * fetched assets sometimes don't.
 */
function normalizeSvg(svg: string, size: number): string {
  let out = svg.trim();

  if (!out.includes('xmlns=')) {
    out = out.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  if (!/\swidth=/.test(out)) {
    out = out.replace('<svg', `<svg width="${size}"`);
  }
  if (!/\sheight=/.test(out)) {
    out = out.replace('<svg', `<svg height="${size}"`);
  }
  return out;
}

/**
 * Render the icon to a normalized SVG string.
 *
 * React entries are rendered synchronously via `renderToStaticMarkup`; the
 * promise is purely for API symmetry with the asset case (which has to
 * `fetch`).
 */
export async function iconToSvgString(
  entry: IconEntry,
  opts?: ExportOptions,
): Promise<string> {
  const { size, strokeWidth, color, fill } = withDefaults(opts);

  if (entry.Component) {
    const html = renderToStaticMarkup(
      createElement(entry.Component, {
        size,
        strokeWidth,
        color,
        // Only pass `fill` when explicitly requested. React drops undefined
        // props, so the underlying component falls back to its native default
        // (lucide → "none", first-party glyphs → whatever they author).
        fill,
      }),
    );
    return normalizeSvg(html, size);
  }

  if (entry.assetUrl) {
    const res = await fetch(entry.assetUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${entry.assetUrl}: ${res.status}`);
    }
    const text = await res.text();
    if (!text.includes('<svg')) {
      throw new Error(`Asset ${entry.assetUrl} did not contain an <svg> root`);
    }
    return normalizeSvg(text, size);
  }

  throw new Error(`IconEntry ${entry.id} has neither Component nor assetUrl`);
}

function kebab(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function exportFileName(entry: IconEntry, ext: 'svg' | 'png'): string {
  return `${entry.source}-${kebab(entry.name)}.${ext}`;
}

/** Trigger a Blob download via a transient anchor. */
function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // The revoke can race in some browsers if called immediately on the same
  // task — defer it past the click. 0ms is enough.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function copyIconSvg(entry: IconEntry, opts?: ExportOptions): Promise<void> {
  const svg = await iconToSvgString(entry, opts);
  await navigator.clipboard.writeText(svg);
}

export async function downloadIconSvg(entry: IconEntry, opts?: ExportOptions): Promise<void> {
  const svg = await iconToSvgString(entry, opts);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  triggerBlobDownload(blob, exportFileName(entry, 'svg'));
}

/**
 * Raster `entry` into a PNG of `pngSize`x`pngSize` and download it. The
 * background is left transparent.
 *
 * Implementation note: we draw the SVG into a `<canvas>` via an `<Image>`
 * loaded from a Blob URL. CSP-wise this is the cleanest path that doesn't
 * require enabling `data:` URIs in the image-src directive.
 */
export async function downloadIconPng(
  entry: IconEntry,
  opts?: ExportOptions,
  pngSize = 256,
): Promise<void> {
  // Render the SVG sized to the PNG output so stroke widths scale 1:1.
  const svg = await iconToSvgString(entry, { ...opts, size: pngSize });

  // Some lucide icons render with `currentColor` and inherit from the
  // surrounding text colour. Detached from the DOM that resolves to black,
  // which is fine on a transparent background but unreadable when previewed
  // on a dark surface — replace it with white to keep parity with how the
  // styleguide previews icons.
  const inkColor = opts?.color && opts.color !== 'currentColor' ? opts.color : '#FFFFFF';
  const inked = svg.replace(/currentColor/g, inkColor);

  const svgBlob = new Blob([inked], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const png = await rasterizeSvg(svgUrl, pngSize);
    triggerBlobDownload(png, exportFileName(entry, 'png'));
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function rasterizeSvg(svgUrl: string, pngSize: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = pngSize;
      canvas.height = pngSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('canvas: failed to acquire 2D context'));
        return;
      }
      ctx.clearRect(0, 0, pngSize, pngSize);
      ctx.drawImage(img, 0, 0, pngSize, pngSize);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('canvas.toBlob returned null'));
          return;
        }
        resolve(blob);
      }, 'image/png');
    };
    img.onerror = () => reject(new Error('Image: failed to decode SVG'));
    img.src = svgUrl;
  });
}
