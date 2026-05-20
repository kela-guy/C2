/**
 * Right-side detail panel for the Icon Library. Shows a large preview, the
 * import snippet, and the three export actions (copy SVG / download SVG /
 * download PNG with a size selector).
 *
 * Designed to slot into the styleguide layout where the table-of-contents
 * usually sits — same width, same surface tone — so opening / closing it
 * feels like flipping a tab rather than a modal.
 */

import { useState, useMemo } from 'react';
import { Copy, Download, Image as ImageIcon } from 'lucide-react';
import type { IconEntry } from '@/lib/iconRegistry';
import { type IconPreviewSize } from '@/lib/iconTokens';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { GridblockPanel } from '@/app/components/gridblock';
import type { RenderMode } from './IconLibrary';
import { useIconExportActions } from './useIconExportActions';

interface IconDetailPanelProps {
  entry: IconEntry;
  /** Active preview size carried in from the IconLibrary toolbar. */
  previewSize: IconPreviewSize;
  /** Active render style — drives `fill="currentColor"` on previews + exports. */
  renderMode: RenderMode;
  onClose: () => void;
}

const PNG_SIZES = [24, 64, 256, 512] as const;
type PngSize = (typeof PNG_SIZES)[number];

function buildImportSnippet(entry: IconEntry): string {
  if (entry.importPath && entry.importName) {
    return `import { ${entry.importName} } from '${entry.importPath}';`;
  }
  if (entry.assetUrl) {
    return `// Static asset — use the public URL directly\nconst src = '${entry.assetUrl}';`;
  }
  return `// ${entry.name}: no import metadata recorded`;
}

function buildUsageSnippet(
  entry: IconEntry,
  size: number,
  renderMode: RenderMode,
): string {
  if (entry.assetUrl) {
    return `<img src={src} alt="${entry.name}" width={${size}} height={${size}} />`;
  }
  // Mirror lucide's official filled-icon recipe: `fill="currentColor"` plus
  // `strokeWidth={0}`. Only emit the extra props when the icon is actually
  // fillable, so users can copy what they see in the preview.
  const useFill = renderMode === 'fill' && entry.fillable === true;
  const extras = useFill ? ' fill="currentColor" strokeWidth={0}' : '';
  return `<${entry.name} size={${size}}${extras} />`;
}

export function IconDetailPanel({ entry, previewSize, renderMode, onClose }: IconDetailPanelProps) {
  const [pngSize, setPngSize] = useState<PngSize>(256);

  const importSnippet = useMemo(() => buildImportSnippet(entry), [entry]);
  const usageSnippet = useMemo(
    () => buildUsageSnippet(entry, previewSize, renderMode),
    [entry, previewSize, renderMode],
  );

  const useFill = renderMode === 'fill' && entry.fillable === true;
  const { busy, copy: handleCopy, downloadSvg: handleDownloadSvg, downloadPng: handleDownloadPng } =
    useIconExportActions(entry, previewSize, renderMode, pngSize);

  const PreviewBody = entry.Component;

  // Inline meta — gridblock headers are a single 32px row, so source +
  // category live next to the icon name rather than stacked below it.
  // Keeps the panel chrome consistent with the rail panels (Targets,
  // Cameras, Devices, Tracks).
  const headerTitle = (
    <>
      <span className="truncate">{entry.name}</span>
      <span className="ms-2 font-normal text-[var(--gridblock-text-muted)]">
        <span className="uppercase tracking-wider">{entry.source}</span>
        <span className="mx-1.5">·</span>
        <span>{entry.category}</span>
      </span>
    </>
  );

  return (
    <GridblockPanel
      title={headerTitle}
      onClose={onClose}
      closeAriaLabel={`Close ${entry.name} details`}
      testId="icon-detail-panel"
    >
      <div className="space-y-5 p-5">
        <div className="flex items-center justify-center min-h-[140px] rounded-lg bg-black/30 shadow-[inset_0_0_0_1px_var(--border-default)] text-slate-12">
          {PreviewBody ? (
            <PreviewBody
              size={96}
              strokeWidth={useFill ? 0 : 1.75}
              color="currentColor"
              fill={useFill ? 'currentColor' : undefined}
            />
          ) : entry.assetUrl ? (
            <img
              src={entry.assetUrl}
              alt={entry.name}
              width={96}
              height={96}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="text-xs text-n-9">Preview unavailable</span>
          )}
        </div>

        {renderMode === 'fill' && entry.fillable !== true && (
          <p className="text-[11px] text-n-120 leading-snug">
            {entry.source === 'lucide'
              ? 'This lucide icon is line-only — its paths don\'t enclose a region, so the Fill toggle is a no-op here.'
              : entry.source === 'asset'
                ? 'Static SVG assets are exported from disk as-authored — the Fill toggle doesn\'t apply.'
                : 'This icon is authored as a fixed shape — the Fill toggle doesn\'t apply.'}
          </p>
        )}

        {entry.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entry.keywords.map((kw) => (
              <span
                key={kw}
                className="text-[11px] px-1.5 py-0.5 rounded bg-state-hover text-n-10"
              >
                {kw}
              </span>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-[11px] uppercase tracking-wider text-n-120">Import</h4>
          <pre className="text-[12px] leading-[1.65] font-mono text-accent-info/90 whitespace-pre-wrap break-all bg-black/30 rounded-md px-3 py-2 shadow-[inset_0_0_0_1px_var(--border-default)]">
            {importSnippet}
          </pre>
          <pre className="text-[12px] leading-[1.65] font-mono text-accent-success/90 whitespace-pre-wrap break-all bg-black/30 rounded-md px-3 py-2 shadow-[inset_0_0_0_1px_var(--border-default)]">
            {usageSnippet}
          </pre>
        </div>

        <div className="space-y-3">
          <h4 className="text-[11px] uppercase tracking-wider text-n-120">Export</h4>
          <div className="grid grid-cols-3 gap-2">
            <ActionButton
              label="SVG"
              tooltip="Copy SVG"
              icon={<Copy size={13} />}
              onClick={handleCopy}
              busy={busy === 'copy'}
            />
            <ActionButton
              label="SVG"
              tooltip="Download SVG"
              icon={<Download size={13} />}
              onClick={handleDownloadSvg}
              busy={busy === 'svg'}
            />
            <ActionButton
              label="PNG"
              tooltip="Download PNG"
              icon={<ImageIcon size={13} />}
              onClick={handleDownloadPng}
              busy={busy === 'png'}
            />
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-wider text-n-120 block mb-1.5">
              PNG size
            </span>
            <div role="radiogroup" aria-label="PNG export size" className="flex gap-1">
              {PNG_SIZES.map((s) => {
                const active = s === pngSize;
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setPngSize(s)}
                    className={`flex-1 px-2 py-1.5 text-[11px] font-mono rounded-md transition-[color,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong
                      ${active
                        ? 'bg-state-hover-strong text-n-12 shadow-[inset_0_0_0_1px_var(--border-default)]'
                        : 'bg-state-hover text-n-10 hover:bg-state-hover-strong'}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </GridblockPanel>
  );
}

interface ActionButtonProps {
  /** Short visible label — just the format ("SVG" / "PNG"). */
  label: string;
  /** Full action phrase shown in the hover tooltip and announced to AT. */
  tooltip: string;
  icon: React.ReactNode;
  onClick: () => void;
  busy: boolean;
}

function ActionButton({ label, tooltip, icon, onClick, busy }: ActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={busy}
          aria-label={tooltip}
          className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-md text-[12px] font-medium text-n-11 bg-state-hover hover:bg-state-pressed active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 transition-[color,background-color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong cursor-pointer"
        >
          {icon}
          <span>{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
