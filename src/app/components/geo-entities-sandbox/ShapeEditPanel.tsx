/**
 * Geo Drawing Sandbox — selection edit popover.
 *
 * Anchored to the selected shape's bbox in the canvas (the host passes a
 * client-coords `DOMRect`), the panel exposes everything the spec asks for
 * once a shape is created: rename, description, fill color, fill opacity, a
 * read-only coordinates listing, and a Delete button. Move/rotate/scale are
 * already covered by the on-shape handles, so this panel sticks to the
 * meta-edits the handles can't do.
 *
 * Built on the platform design system: shadcn `Input` / `Textarea` /
 * `Slider` / `Popover` chrome via tokenized surface + border classes.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Slider } from '@/app/components/ui/slider';
import { Trash2, X } from '@/lib/icons/central';
import { SANDBOX_BOUNDS } from './fixtures';
import { FILL_PALETTE, toolById } from './drawTools';
import { formatLatLng, type GeoShape } from './drawTypes';

export interface ShapeEditPanelProps {
  shape: GeoShape;
  /** Client-space rect of the selected shape (anchor point for the panel). */
  anchorRect: DOMRect | null;
  onPatch: (patch: Partial<GeoShape>) => void;
  onDelete: () => void;
  onClose: () => void;
}

const PANEL_GAP_PX = 12;
const PANEL_WIDTH_PX = 280;

export function ShapeEditPanel({
  shape,
  anchorRect,
  onPatch,
  onDelete,
  onClose,
}: ShapeEditPanelProps) {
  const meta = toolById(shape.tool);
  const ref = useRef<HTMLDivElement | null>(null);
  // Local state mirrors so typing feels snappy even though we propagate on every keystroke.
  const [name, setName] = useState(shape.name);
  const [description, setDescription] = useState(shape.description);

  useEffect(() => setName(shape.name), [shape.id, shape.name]);
  useEffect(() => setDescription(shape.description), [shape.id, shape.description]);

  // Anchor: place to the right of the bbox; flip below if there's no room
  // above. Falls back to a centered position if the rect is missing.
  const style = useMemo<React.CSSProperties>(() => {
    if (!anchorRect) {
      return {
        position: 'fixed',
        right: 24,
        top: 96,
        width: PANEL_WIDTH_PX,
      };
    }
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const preferredLeft = anchorRect.right + PANEL_GAP_PX;
    const left =
      preferredLeft + PANEL_WIDTH_PX > viewportW - 16
        ? Math.max(16, anchorRect.left - PANEL_WIDTH_PX - PANEL_GAP_PX)
        : preferredLeft;
    const top = Math.min(
      Math.max(16, anchorRect.top),
      Math.max(16, viewportH - 320),
    );
    return {
      position: 'fixed',
      left,
      top,
      width: PANEL_WIDTH_PX,
    };
  }, [anchorRect]);

  const coords = shape.kind === 'point'
    ? [formatLatLng(shape.points[0] ?? { x: 0.5, y: 0.5 }, SANDBOX_BOUNDS)]
    : shape.points.slice(0, 6).map((p) => formatLatLng(p, SANDBOX_BOUNDS));
  const coordsRemaining = shape.kind !== 'point' && shape.points.length > 6 ? shape.points.length - 6 : 0;

  return (
    <div
      ref={ref}
      style={style}
      role="dialog"
      aria-label={`Edit ${meta.label}`}
      className="z-30 rounded-lg border border-border-strong bg-surface-2/95 p-3 text-xs text-slate-12 shadow-xl backdrop-blur-md"
    >
      <header className="mb-3 flex items-center gap-2">
        <span
          aria-hidden
          className="grid size-6 place-items-center rounded"
          style={{ background: shape.color, color: '#0b0f14' }}
        >
          <meta.Icon size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-12">{meta.label}</p>
          <p className="truncate font-mono text-2xs uppercase tracking-[0.16em] text-slate-9">
            {shape.id}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-6 place-items-center rounded text-slate-9 transition-colors hover:bg-state-hover-strong hover:text-slate-12"
        >
          <X size={14} />
        </button>
      </header>

      <Section label="Name">
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            onPatch({ name: e.target.value });
          }}
          placeholder={meta.label}
          className="h-8 text-xs"
        />
      </Section>

      <Section label="Description">
        <Textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            onPatch({ description: e.target.value });
          }}
          placeholder="Add notes…"
          rows={2}
          className="min-h-[52px] text-xs"
        />
      </Section>

      <Section label="Fill color">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILL_PALETTE.map((c) => {
            const active = c.toLowerCase() === shape.color.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                onClick={() => onPatch({ color: c })}
                aria-label={`Color ${c}`}
                aria-pressed={active}
                className={`size-5 rounded-full border transition-transform ${
                  active
                    ? 'scale-110 border-white'
                    : 'border-border-default hover:scale-105'
                }`}
                style={{ background: c }}
              />
            );
          })}
        </div>
      </Section>

      {(shape.kind === 'polygon' || shape.kind === 'freehand') && (
        <Section label={`Fill opacity · ${Math.round(shape.fillOpacity * 100)}%`}>
          <Slider
            value={[Math.round(shape.fillOpacity * 100)]}
            min={0}
            max={80}
            step={1}
            onValueChange={(v) => onPatch({ fillOpacity: (v[0] ?? 0) / 100 })}
          />
        </Section>
      )}

      <Section label={`Coordinates · ${shape.points.length}`}>
        <ul className="space-y-0.5 font-mono text-xs-plus tabular-nums text-slate-11">
          {coords.map((c, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <span className="text-slate-9">{i + 1}.</span>
              <span>{c}</span>
            </li>
          ))}
          {coordsRemaining > 0 && (
            <li className="text-slate-9">+ {coordsRemaining} more…</li>
          )}
        </ul>
      </Section>

      <footer className="mt-3 flex items-center justify-between gap-2 border-t border-border-subtle pt-2.5">
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center gap-1.5 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs-plus font-medium text-rose-300 transition-colors hover:border-rose-500/50 hover:bg-rose-500/20"
        >
          <Trash2 size={12} /> Delete
        </button>
        <span className="font-mono text-2xs uppercase tracking-[0.16em] text-slate-9">
          drag handles to move · scale · rotate
        </span>
      </footer>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2.5">
      <label className="mb-1 block font-mono text-2xs uppercase tracking-[0.16em] text-slate-9">
        {label}
      </label>
      {children}
    </div>
  );
}
