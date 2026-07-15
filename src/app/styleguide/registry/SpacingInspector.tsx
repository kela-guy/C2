/**
 * Figma-dev-mode-style spacing inspector for the design system pages.
 *
 * A floating "Inspect spacing" button (mounted once by the DesignSystem
 * shell) arms a full-viewport hit-test layer: hovering ANY element on the
 * page draws measurement overlays (padding bands, flex/grid gap bands, a
 * W × H badge) and clicking selects it, opening a floating "Layer properties"
 * panel — the nested Border → Padding box-model diagram plus a copyable,
 * layout-only CSS readout. Every value is read live from
 * `getBoundingClientRect()` + `getComputedStyle()`, so the annotations always
 * describe the real rendered page — nothing is hand-maintained.
 *
 * While inspecting, pointer events are intercepted (like Figma), so the page
 * underneath doesn't react to clicks. Escape clears the selection, then
 * exits inspect mode.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Ruler, X } from '@/lib/icons/central';
import { SURFACE } from '@/primitives';
import { cn } from '@/shared/components/ui/utils';
import { CopyButton, RING } from './docPrimitives';

/** Figma dev-mode palette: blue selection, green padding, magenta gaps. */
const SELECT_BLUE = '#0D99FF';
const PADDING_GREEN = 'rgba(10, 207, 131, 0.28)';
const PADDING_GREEN_TEXT = '#7ce7bb';
const GAP_MAGENTA = 'rgba(255, 36, 189, 0.24)';
const GAP_MAGENTA_TEXT = '#ff8adf';

/** Marks the inspector's own chrome so it never inspects itself. */
const SELF_ATTR = 'data-spacing-inspector';

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface LabeledBox extends Box {
  label: string;
}

interface Measurement {
  outline: Box;
  pads: LabeledBox[];
  gaps: LabeledBox[];
  dims: string;
}

const px = (v: string) => Number.parseFloat(v) || 0;
const round = (v: number) => Math.round(v * 10) / 10;

/** Overlays live in a `fixed inset-0` layer, so viewport coords ARE layer coords. */
function viewportBox(rect: DOMRect): Box {
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

function measure(el: HTMLElement): Measurement {
  const rect = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const box = viewportBox(rect);

  const pt = px(cs.paddingTop);
  const pr = px(cs.paddingRight);
  const pb = px(cs.paddingBottom);
  const pl = px(cs.paddingLeft);
  const bt = px(cs.borderTopWidth);
  const br = px(cs.borderRightWidth);
  const bb = px(cs.borderBottomWidth);
  const bl = px(cs.borderLeftWidth);

  // Padding bands: top/bottom span the full content width, left/right slot
  // between them — the same L-shaped carve-up Figma draws.
  const innerLeft = box.left + bl;
  const innerTop = box.top + bt;
  const innerWidth = box.width - bl - br;
  const innerHeight = box.height - bt - bb;
  const pads: LabeledBox[] = [];
  if (pt >= 0.5) pads.push({ top: innerTop, left: innerLeft, width: innerWidth, height: pt, label: `${round(pt)}` });
  if (pb >= 0.5) pads.push({ top: innerTop + innerHeight - pb, left: innerLeft, width: innerWidth, height: pb, label: `${round(pb)}` });
  const sideTop = innerTop + pt;
  const sideHeight = innerHeight - pt - pb;
  if (pl >= 0.5) pads.push({ top: sideTop, left: innerLeft, width: pl, height: sideHeight, label: `${round(pl)}` });
  if (pr >= 0.5) pads.push({ top: sideTop, left: innerLeft + innerWidth - pr, width: pr, height: sideHeight, label: `${round(pr)}` });

  const gaps = measureGaps(el, cs);

  return {
    outline: box,
    pads,
    gaps,
    dims: `${round(rect.width)} × ${round(rect.height)}`,
  };
}

/**
 * Bands between adjacent flex/grid children. Derived from the children's
 * actual rects (not the `gap` value alone), so `justify-content` distribution
 * and grid tracks measure correctly too.
 */
function measureGaps(el: HTMLElement, cs: CSSStyleDeclaration): LabeledBox[] {
  const display = cs.display;
  const isFlex = display.includes('flex');
  const isGrid = display.includes('grid');
  if (!isFlex && !isGrid) return [];

  const children = Array.from(el.children)
    .map((c) => c.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0);
  if (children.length < 2) return [];

  const column = isFlex && cs.flexDirection.startsWith('column');
  const axes: ('x' | 'y')[] = isGrid ? ['x', 'y'] : [column ? 'y' : 'x'];
  const out: LabeledBox[] = [];

  for (const axis of axes) {
    const sorted = [...children].sort((a, b) => (axis === 'x' ? a.left - b.left : a.top - b.top));
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (axis === 'x') {
        const gap = b.left - a.right;
        const overlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (gap >= 0.5 && overlap > 0) {
          out.push({
            left: a.right,
            top: Math.max(a.top, b.top),
            width: gap,
            height: overlap,
            label: `${round(gap)}`,
          });
        }
      } else {
        const gap = b.top - a.bottom;
        const overlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        if (gap >= 0.5 && overlap > 0) {
          out.push({
            left: Math.max(a.left, b.left),
            top: a.bottom,
            width: overlap,
            height: gap,
            label: `${round(gap)}`,
          });
        }
      }
    }
  }
  return out;
}

/** The default Tailwind spacing scale (token → px = token × 4). */
const TW_SPACING = new Set([
  0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24,
  28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96,
]);

/** px → Tailwind spacing suffix: `10` → `2.5`, `1` → `px`, off-scale → `[18px]`. */
function twSpace(v: number): string {
  if (v === 0) return '0';
  if (v === 1) return 'px';
  const scale = v / 4;
  if (TW_SPACING.has(scale)) return String(scale);
  return `[${round(v)}px]`;
}

const TW_DISPLAY: Record<string, string> = {
  block: 'block', 'inline-block': 'inline-block', inline: 'inline',
  flex: 'flex', 'inline-flex': 'inline-flex',
  grid: 'grid', 'inline-grid': 'inline-grid',
  'flow-root': 'flow-root', contents: 'contents', none: 'hidden',
  table: 'table', 'table-row': 'table-row', 'table-cell': 'table-cell',
  'list-item': 'list-item',
};

const TW_ALIGN_ITEMS: Record<string, string> = {
  'flex-start': 'items-start', start: 'items-start',
  'flex-end': 'items-end', end: 'items-end',
  center: 'items-center', baseline: 'items-baseline', stretch: 'items-stretch',
};

const TW_JUSTIFY: Record<string, string> = {
  'flex-start': 'justify-start', start: 'justify-start',
  'flex-end': 'justify-end', end: 'justify-end',
  center: 'justify-center', 'space-between': 'justify-between',
  'space-around': 'justify-around', 'space-evenly': 'justify-evenly',
};

const TW_ALIGN_SELF: Record<string, string> = {
  'flex-start': 'self-start', start: 'self-start',
  'flex-end': 'self-end', end: 'self-end',
  center: 'self-center', stretch: 'self-stretch', baseline: 'self-baseline',
};

/**
 * Layout-only readout as Tailwind utilities — the same properties Figma dev
 * mode surfaces, phrased the way this codebase authors them. Values that
 * don't sit on the default scale fall back to arbitrary-value classes.
 */
function buildTailwindClasses(cs: CSSStyleDeclaration): string[] {
  const out: string[] = [];
  const isFlex = cs.display.includes('flex');
  const isGrid = cs.display.includes('grid');

  out.push(TW_DISPLAY[cs.display] ?? `[display:${cs.display}]`);

  // Padding, collapsed the way it's authored: p → px/py → per-side.
  const pt = px(cs.paddingTop);
  const pr = px(cs.paddingRight);
  const pb = px(cs.paddingBottom);
  const pl = px(cs.paddingLeft);
  if (pt || pr || pb || pl) {
    if (pt === pr && pr === pb && pb === pl) {
      out.push(`p-${twSpace(pt)}`);
    } else if (pt === pb && pl === pr) {
      if (pl) out.push(`px-${twSpace(pl)}`);
      if (pt) out.push(`py-${twSpace(pt)}`);
    } else {
      if (pt) out.push(`pt-${twSpace(pt)}`);
      if (pr) out.push(`pr-${twSpace(pr)}`);
      if (pb) out.push(`pb-${twSpace(pb)}`);
      if (pl) out.push(`pl-${twSpace(pl)}`);
    }
  }

  if (isFlex && cs.flexDirection !== 'row') {
    const dir: Record<string, string> = {
      column: 'flex-col', 'column-reverse': 'flex-col-reverse', 'row-reverse': 'flex-row-reverse',
    };
    out.push(dir[cs.flexDirection] ?? `[flex-direction:${cs.flexDirection}]`);
  }
  if ((isFlex || isGrid) && cs.alignItems !== 'normal' && cs.alignItems !== 'stretch') {
    out.push(TW_ALIGN_ITEMS[cs.alignItems] ?? `[align-items:${cs.alignItems}]`);
  }
  if ((isFlex || isGrid) && cs.justifyContent !== 'normal' && cs.justifyContent !== 'flex-start') {
    out.push(TW_JUSTIFY[cs.justifyContent] ?? `[justify-content:${cs.justifyContent}]`);
  }

  const rowGap = px(cs.rowGap);
  const colGap = px(cs.columnGap);
  if (rowGap || colGap) {
    if (rowGap === colGap) out.push(`gap-${twSpace(rowGap)}`);
    else {
      if (colGap) out.push(`gap-x-${twSpace(colGap)}`);
      if (rowGap) out.push(`gap-y-${twSpace(rowGap)}`);
    }
  }

  const grow = cs.flexGrow;
  const shrink = cs.flexShrink;
  const basis = cs.flexBasis;
  if (grow !== '0' || shrink !== '1' || (basis !== 'auto' && basis !== '0%')) {
    if (grow === '1' && shrink === '1' && (basis === '0%' || basis === '0px')) out.push('flex-1');
    else if (grow === '1' && shrink === '1' && basis === 'auto') out.push('flex-auto');
    else if (grow === '0' && shrink === '0' && basis === 'auto') out.push('flex-none');
    else if (grow === '1' && shrink === '0' && (basis === '0%' || basis === '0px')) out.push('flex-[1_0_0]');
    else if (shrink === '0' && grow === '0' && (basis === 'auto' || basis === '0%')) out.push('shrink-0');
    else {
      const basisOut = basis === '0%' || basis === '0px' ? '0' : basis;
      out.push(`flex-[${grow}_${shrink}_${basisOut}]`);
    }
  }
  if (cs.alignSelf !== 'auto' && cs.alignSelf !== 'normal') {
    out.push(TW_ALIGN_SELF[cs.alignSelf] ?? `[align-self:${cs.alignSelf}]`);
  }

  return out;
}

function boxStyle(b: Box): React.CSSProperties {
  return { top: b.top, left: b.left, width: b.width, height: b.height };
}

/** Small floating px chip centered inside (or beside) a measurement band. */
function BandLabel({ box, color, text }: { box: Box; color: string; text: string }) {
  // Tiny bands can't fit the chip — float it just outside instead.
  const fitsInside = box.width >= 22 && box.height >= 14;
  return (
    <span
      className="absolute z-10 rounded-sm px-1 font-mono text-[10px] leading-4 tabular-nums"
      style={{
        left: box.left + box.width / 2,
        top: box.top + box.height / 2,
        transform: 'translate(-50%, -50%)',
        backgroundColor: fitsInside ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.85)',
        color,
      }}
    >
      {text}
    </span>
  );
}

function OverlayLayer({ m, selected }: { m: Measurement; selected: boolean }) {
  return (
    <div aria-hidden {...{ [SELF_ATTR]: true }} className="pointer-events-none fixed inset-0 z-[96]" dir="ltr">
      {m.pads.map((p, i) => (
        <div key={`p${i}`} className="absolute" style={{ ...boxStyle(p), backgroundColor: PADDING_GREEN }} />
      ))}
      {m.gaps.map((g, i) => (
        <div key={`g${i}`} className="absolute" style={{ ...boxStyle(g), backgroundColor: GAP_MAGENTA }} />
      ))}
      {m.pads.map((p, i) => (
        <BandLabel key={`pl${i}`} box={p} color={PADDING_GREEN_TEXT} text={p.label} />
      ))}
      {m.gaps.map((g, i) => (
        <BandLabel key={`gl${i}`} box={g} color={GAP_MAGENTA_TEXT} text={g.label} />
      ))}
      <div
        className="absolute"
        style={{
          ...boxStyle(m.outline),
          boxShadow: `inset 0 0 0 1px ${SELECT_BLUE}${selected ? ', inset 0 0 0 2px ' + SELECT_BLUE : ''}`,
        }}
      />
      <span
        className="absolute z-20 whitespace-nowrap rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-medium leading-4 text-white tabular-nums"
        style={{
          left: m.outline.left + m.outline.width / 2,
          top: m.outline.top + m.outline.height + 4,
          transform: 'translateX(-50%)',
          backgroundColor: SELECT_BLUE,
        }}
      >
        {m.dims}
      </span>
    </div>
  );
}

/** The nested Border → Padding → content diagram from Figma's Layer properties. */
function BoxModelDiagram({ el }: { el: HTMLElement }) {
  const cs = getComputedStyle(el);
  const f = (v: number) => (v === 0 ? '-' : `${round(v)}`);
  const bt = px(cs.borderTopWidth);
  const br = px(cs.borderRightWidth);
  const bb = px(cs.borderBottomWidth);
  const bl = px(cs.borderLeftWidth);
  const pt = px(cs.paddingTop);
  const pr = px(cs.paddingRight);
  const pb = px(cs.paddingBottom);
  const pl = px(cs.paddingLeft);
  const contentW = round(el.clientWidth - pl - pr);
  const contentH = round(el.clientHeight - pt - pb);

  const valueCls = 'font-mono text-[11px] tabular-nums text-n-11';
  return (
    <div className={cn('rounded-lg p-3', RING)} style={{ backgroundColor: SURFACE.level1 }}>
      {/* Border ring */}
      <div className="rounded border border-white/15 px-2 pb-1.5 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-n-9">Border</span>
          <span className={valueCls}>{f(bt)}</span>
          <span className="w-6" />
        </div>
        <div className="flex items-center gap-2">
          <span className={valueCls}>{f(bl)}</span>
          {/* Padding ring */}
          <div className="my-1 flex-1 rounded border border-sky-400/40 bg-sky-400/15 px-2 pb-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-sky-200/80">Padding</span>
              <span className={valueCls}>{f(pt)}</span>
              <span className="w-6" />
            </div>
            <div className="flex items-center gap-2">
              <span className={valueCls}>{f(pl)}</span>
              <div className="my-1 flex h-10 flex-1 items-center justify-center rounded-sm border border-dashed border-white/40">
                <span className="font-mono text-[11px] font-medium tabular-nums text-n-12">
                  {contentW} × {contentH}
                </span>
              </div>
              <span className={valueCls}>{f(pr)}</span>
            </div>
            <div className="text-center">
              <span className={valueCls}>{f(pb)}</span>
            </div>
          </div>
          <span className={valueCls}>{f(br)}</span>
        </div>
        <div className="text-center">
          <span className={valueCls}>{f(bb)}</span>
        </div>
      </div>
      <div className="mt-1.5 text-right text-[10px] text-n-120">{cs.boxSizing}</div>
    </div>
  );
}

/** Tailwind-class layout readout with a copy affordance (copies one class string). */
function LayoutTwBlock({ classes }: { classes: string[] }) {
  const classText = classes.join(' ');
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-n-10">Layout</span>
        <CopyButton text={classText} label="Copy Tailwind classes" />
      </div>
      <div className={cn('rounded-lg px-3 py-2.5', RING)} style={{ backgroundColor: SURFACE.level1 }} dir="ltr">
        <div className="flex flex-wrap gap-x-1.5 gap-y-1 font-mono text-[11px] leading-5">
          {classes.map((c) => (
            <span key={c} className="rounded bg-white/[0.05] px-1 text-pink-400">
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function LayerPropertiesPanel({ el, onClear }: { el: HTMLElement; onClear: () => void }) {
  const tag = el.tagName.toLowerCase();
  return (
    <div
      {...{ [SELF_ATTR]: true }}
      className={cn(
        'fixed bottom-20 right-5 z-[97] max-h-[70vh] w-[250px] space-y-3 overflow-y-auto rounded-xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
        RING,
      )}
      style={{ backgroundColor: SURFACE.level0 }}
      dir="ltr"
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-n-12">Layer properties</div>
          <div className="truncate font-mono text-[10px] text-n-9">&lt;{tag}&gt;</div>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selection"
          className="flex size-7 items-center justify-center rounded-md text-white/50 transition-[color,background-color,transform] duration-150 ease-out hover:bg-state-hover-overlay hover:text-white/90 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring"
        >
          <X size={13} aria-hidden="true" />
        </button>
      </div>
      <BoxModelDiagram el={el} />
      <LayoutTwBlock classes={buildTailwindClasses(getComputedStyle(el))} />
    </div>
  );
}

interface OverlaySnapshot {
  m: Measurement | null;
  isSelected: boolean;
  /** The still-mounted selected element the Layer properties panel describes. */
  panelEl: HTMLElement | null;
}

/**
 * Floating page-level inspector. Mount once per page (the DesignSystem shell
 * does); everything rendered on the page becomes inspectable.
 */
export function SpacingInspector() {
  const [active, setActive] = useState(false);
  const [snapshot, setSnapshot] = useState<OverlaySnapshot | null>(null);
  // Hover/selection live in refs: they're DOM handles only read by event
  // callbacks, and every visual update flows through `refresh()` below.
  const hoverRef = useRef<HTMLElement | null>(null);
  const selectedRef = useRef<HTMLElement | null>(null);

  // Re-derives the overlay geometry from the current hover/selection. Called
  // from event callbacks only (pointer, scroll, resize, ResizeObserver), with
  // stale-element guards — the page may unmount nodes while they're held.
  const refresh = useCallback(() => {
    const liveHover = hoverRef.current && document.contains(hoverRef.current) ? hoverRef.current : null;
    const liveSelected =
      selectedRef.current && document.contains(selectedRef.current) ? selectedRef.current : null;
    const measuredEl = liveHover ?? liveSelected;
    setSnapshot({
      m: measuredEl ? measure(measuredEl) : null,
      isSelected: measuredEl !== null && measuredEl === liveSelected,
      panelEl: liveSelected,
    });
  }, []);

  const deactivate = useCallback(() => {
    hoverRef.current = null;
    selectedRef.current = null;
    setActive(false);
    setSnapshot(null);
  }, []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (selectedRef.current) {
        selectedRef.current = null;
        refresh();
      } else {
        deactivate();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, deactivate, refresh]);

  // Keep the overlays glued to the page while it scrolls, resizes, or
  // reflows under the frozen pointer state.
  useEffect(() => {
    if (!active) return;
    const ro = new ResizeObserver(refresh);
    ro.observe(document.body);
    window.addEventListener('resize', refresh);
    window.addEventListener('scroll', refresh, true);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', refresh);
      window.removeEventListener('scroll', refresh, true);
    };
  }, [active, refresh]);

  // The capture layer covers the viewport and owns hit-testing, so the page
  // never sees clicks while inspecting (Figma behavior). The inspector's own
  // chrome (button, panel, overlays) is excluded via SELF_ATTR.
  const pick = useCallback((clientX: number, clientY: number): HTMLElement | null => {
    for (const el of document.elementsFromPoint(clientX, clientY)) {
      if (!(el instanceof HTMLElement)) continue;
      if (el.closest(`[${SELF_ATTR}]`)) continue;
      if (el === document.body || el === document.documentElement) continue;
      return el;
    }
    return null;
  }, []);

  return (
    <>
      {active && (
        <div
          {...{ [SELF_ATTR]: true }}
          className="fixed inset-0 z-[95] cursor-crosshair"
          onMouseMove={(e) => {
            hoverRef.current = pick(e.clientX, e.clientY);
            refresh();
          }}
          onMouseLeave={() => {
            hoverRef.current = null;
            refresh();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            selectedRef.current = pick(e.clientX, e.clientY);
            refresh();
          }}
        />
      )}

      {active && snapshot?.m && <OverlayLayer m={snapshot.m} selected={snapshot.isSelected} />}

      {active && snapshot?.panelEl && (
        <LayerPropertiesPanel
          el={snapshot.panelEl}
          onClear={() => {
            selectedRef.current = null;
            refresh();
          }}
        />
      )}

      <div
        {...{ [SELF_ATTR]: true }}
        className="fixed bottom-5 right-5 z-[98] flex items-center gap-3"
        dir="ltr"
      >
        {active && (
          <span
            className={cn('rounded-lg px-3 py-1.5 text-xs text-n-9', RING)}
            style={{ backgroundColor: SURFACE.level0 }}
          >
            Hover to measure · click to select · Esc to exit
          </span>
        )}
        <button
          type="button"
          onClick={() => (active ? deactivate() : setActive(true))}
          aria-pressed={active}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-[filter,box-shadow,transform] duration-150 ease-out hover:brightness-110 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring',
            active && 'ring-2 ring-sky-300/60',
          )}
          style={{ backgroundColor: SELECT_BLUE, boxShadow: '0 4px 16px rgba(0,0,0,0.45)' }}
        >
          <Ruler size={15} aria-hidden="true" />
          {active ? 'Done inspecting' : 'Inspect spacing'}
        </button>
      </div>
    </>
  );
}
