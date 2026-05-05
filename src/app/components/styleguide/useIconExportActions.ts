/**
 * Shared export-action hook for the Icon Library.
 *
 * Both `IconTile`'s right-click context menu and `IconDetailPanel`'s explicit
 * export buttons go through this hook so that:
 *
 * - The render-mode → export-options recipe lives in exactly one place
 *   (lucide's official "filled" recipe is `fill="currentColor"` +
 *   `strokeWidth={0}`, gated on `entry.fillable === true`).
 * - Toast wording is consistent regardless of which surface triggered the
 *   action.
 * - Per-entry busy state (so exports can dim their own button without
 *   spinning the entire panel) is managed once.
 */

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  copyIconSvg,
  downloadIconSvg,
  downloadIconPng,
  type ExportOptions,
} from '@/lib/iconExport';
import type { IconEntry } from '@/lib/iconRegistry';
import type { RenderMode } from './IconLibrary';

export type IconExportAction = 'copy' | 'svg' | 'png';

interface IconExportHandlers {
  /** Which action is currently in flight, if any. */
  busy: IconExportAction | null;
  /** Resolved options derived from previewSize + renderMode + entry.fillable. */
  exportOpts: ExportOptions;
  copy: () => Promise<void>;
  downloadSvg: () => Promise<void>;
  downloadPng: () => Promise<void>;
}

export function useIconExportActions(
  entry: IconEntry,
  previewSize: number,
  renderMode: RenderMode,
  pngSize: number,
): IconExportHandlers {
  const [busy, setBusy] = useState<IconExportAction | null>(null);

  const useFill = renderMode === 'fill' && entry.fillable === true;
  const exportOpts = useMemo<ExportOptions>(
    () => ({
      size: previewSize,
      color: 'currentColor',
      fill: useFill ? 'currentColor' : undefined,
      strokeWidth: useFill ? 0 : undefined,
    }),
    [previewSize, useFill],
  );

  const copy = useCallback(async () => {
    setBusy('copy');
    try {
      await copyIconSvg(entry, exportOpts);
      toast.success(`Copied ${entry.name} SVG to clipboard`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to copy SVG');
    } finally {
      setBusy(null);
    }
  }, [entry, exportOpts]);

  const downloadSvg = useCallback(async () => {
    setBusy('svg');
    try {
      await downloadIconSvg(entry, exportOpts);
      toast.success(`Downloaded ${entry.name}.svg`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download SVG');
    } finally {
      setBusy(null);
    }
  }, [entry, exportOpts]);

  const downloadPng = useCallback(async () => {
    setBusy('png');
    try {
      await downloadIconPng(entry, exportOpts, pngSize);
      toast.success(`Downloaded ${entry.name} as ${pngSize}px PNG`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download PNG');
    } finally {
      setBusy(null);
    }
  }, [entry, exportOpts, pngSize]);

  return { busy, exportOpts, copy, downloadSvg, downloadPng };
}
