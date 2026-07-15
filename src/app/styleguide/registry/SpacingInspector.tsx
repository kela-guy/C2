/**
 * Figma-dev-mode-style spacing inspector for styleguide docs.
 *
 * Wraps a live preview; toggling "Inspect spacing" arms a hit-test layer so
 * hovering any element inside the preview draws measurement overlays (padding
 * bands, flex/grid gap bands, a W × H badge) and clicking selects it, opening
 * a "Layer properties" panel: the nested Border → Padding box-model diagram
 * plus a copyable, layout-only CSS readout. Every value is read live from
 * `getBoundingClientRect()` + `getComputedStyle()`, so the annotations always
 * describe the real rendered component — nothing is hand-maintained.
 *
 * While inspecting, pointer events are intercepted (like Figma), so the
 * component underneath doesn't react to clicks. Escape clears the selection,
 * then exits inspect mode.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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

function relBox(rect: DOMRect, root: DOMRect): Box {
  return {
    top: rect.top - root.top,
    left: rect.left - root.left,
    width: rect.width,
    height: rect.height,
  };
}

function measure(el: HTMLElement, rootEl: HTMLElement): Measurement {
  const root = rootEl.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const box = relBox(rect, root);

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

  const gaps = measureGaps(el, cs, root);

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
function measureGaps(el: HTMLElement, cs: CSSStyleDeclaration, root: DOMRect): LabeledBox[] {
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
            left: a.right - root.left,
            top: Math.max(a.top, b.top) - root.top,
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
            left: Math.max(a.left, b.left) - root.left,
            top: a.bottom - root.top,
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

/** `4px 8px 4px 0`-style shorthand, collapsing equal sides like the CSS cascade. */
function shorthand(t: number, r: number, b: number, l: number): string {
  const f = (v: number) => (v === 0 ? '0' : `${round(v)}px`);
  if (t === r && r === b && b === l) return f(t);
  if (t === b && r === l) return `${f(t)} ${f(r)}`;
  return `${f(t)} ${f(r)} ${f(b)} ${f(l)}`;
}

interface CssLine {
  prop: string;
  value: string;
}

/** Layout-only readout, mirroring the properties Figma dev mode surfaces. */
function buildLayoutLines(cs: CSSStyleDeclaration): CssLine[] {
  const lines: CssLine[] = [{ prop: 'display', value: cs.display }];
  const isFlex = cs.display.includes('flex');
  const isGrid = cs.display.includes('grid');

  const pt = px(cs.paddingTop);
  const pr = px(cs.paddingRight);
  const pb = px(cs.paddingBottom);
  const pl = px(cs.paddingLeft);
  if (pt || pr || pb || pl) lines.push({ prop: 'padding', value: shorthand(pt, pr, pb, pl) });

  if (isFlex && cs.flexDirection !== 'row') lines.push({ prop: 'flex-direction', value: cs.flexDirection });
  if ((isFlex || isGrid) && cs.alignItems !== 'normal' && cs.alignItems !== 'stretch') {
    lines.push({ prop: 'align-items', value: cs.alignItems });
  }
  if ((isFlex || isGrid) && cs.justifyContent !== 'normal' && cs.justifyContent !== 'flex-start') {
    lines.push({ prop: 'justify-content', value: cs.justifyContent });
  }

  const rowGap = px(cs.rowGap);
  const colGap = px(cs.columnGap);
  if (rowGap || colGap) {
    lines.push({ prop: 'gap', value: rowGap === colGap ? `${round(rowGap)}px` : `${round(rowGap)}px ${round(colGap)}px` });
  }

  const grow = cs.flexGrow;
  const shrink = cs.flexShrink;
  const basis = cs.flexBasis;
  if (grow !== '0' || shrink !== '1' || (basis !== 'auto' && basis !== '0%')) {
    const basisOut = basis === '0%' || basis === '0px' ? '0' : basis;
    lines.push({ prop: 'flex', value: `${grow} ${shrink} ${basisOut}` });
  }
  if (cs.alignSelf !== 'auto' && cs.alignSelf !== 'normal') lines.push({ prop: 'align-self', value: cs.alignSelf });

  return lines;
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
    <div aria-hidden className="pointer-events-none absolute inset-0 z-40" dir="ltr">
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

/** Numbered, syntax-tinted layout readout with a copy affordance. */
function LayoutCssBlock({ lines }: { lines: CssLine[] }) {
  const cssText = lines.map((l) => `${l.prop}: ${l.value};`).join('\n');
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-n-10">Layout</span>
        <CopyButton text={cssText} label="Copy layout CSS" />
      </div>
      <div className={cn('overflow-x-auto rounded-lg px-3 py-2.5', RING)} style={{ backgroundColor: SURFACE.level1 }} dir="ltr">
        <ol className="font-mono text-[11px] leading-5">
          {lines.map((l, i) => (
            <li key={l.prop} className="flex gap-2 whitespace-nowrap">
              <span className="w-4 select-none text-right text-n-7 tabular-nums">{i + 1}</span>
              <span>
                <span className="text-n-10">{l.prop}</span>
                <span className="text-n-8">: </span>
                <span className="text-pink-400">{l.value}</span>
                <span className="text-n-8">;</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function LayerPropertiesPanel({ el, onClear }: { el: HTMLElement; onClear: () => void }) {
  const tag = el.tagName.toLowerCase();
  return (
    <div
      className={cn('w-[240px] shrink-0 space-y-3 rounded-xl p-3', RING)}
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
      <LayoutCssBlock lines={buildLayoutLines(getComputedStyle(el))} />
    </div>
  );
}

interface OverlaySnapshot {
  m: Measurement | null;
  isSelected: boolean;
  /** The still-mounted selected element the Layer properties panel describes. */
  panelEl: HTMLElement | null;
}

export function SpacingInspector({ children }: { children: React.ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [hoverEl, setHoverEl] = useState<HTMLElement | null>(null);
  const [selectedEl, setSelectedEl] = useState<HTMLElement | null>(null);
  // Bumped by the ResizeObserver so overlay geometry re-derives after the
  // wrapped component animates or reflows.
  const [measureTick, setMeasureTick] = useState(0);
  const [snapshot, setSnapshot] = useState<OverlaySnapshot | null>(null);

  const deactivate = useCallback(() => {
    setActive(false);
    setHoverEl(null);
    setSelectedEl(null);
  }, []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (selectedEl) setSelectedEl(null);
      else deactivate();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, selectedEl, deactivate]);

  useEffect(() => {
    if (!active || !contentRef.current) return;
    const bump = () => setMeasureTick((t) => t + 1);
    const ro = new ResizeObserver(bump);
    ro.observe(contentRef.current);
    if (hoverEl) ro.observe(hoverEl);
    if (selectedEl) ro.observe(selectedEl);
    window.addEventListener('resize', bump);
    window.addEventListener('scroll', bump, true);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', bump);
      window.removeEventListener('scroll', bump, true);
    };
  }, [active, hoverEl, selectedEl]);

  // The capture layer sits on top of the preview and owns hit-testing, so the
  // wrapped component never sees clicks while inspecting (Figma behavior).
  const pick = useCallback((clientX: number, clientY: number): HTMLElement | null => {
    const root = contentRef.current;
    if (!root) return null;
    for (const el of document.elementsFromPoint(clientX, clientY)) {
      if (el === captureRef.current) continue;
      if (el !== root && root.contains(el)) return el as HTMLElement;
    }
    return null;
  }, []);

  // All DOM reads happen here (never in render): derive the overlay geometry
  // after layout, with stale-element guards — the wrapped demo may unmount
  // nodes (collapse, conditional rendering) while they're hovered/selected.
  useLayoutEffect(() => {
    if (!active || !contentRef.current) {
      setSnapshot(null);
      return;
    }
    const root = contentRef.current;
    const liveHover = hoverEl && root.contains(hoverEl) ? hoverEl : null;
    const liveSelected = selectedEl && root.contains(selectedEl) ? selectedEl : null;
    const measuredEl = liveHover ?? liveSelected;
    setSnapshot({
      m: measuredEl ? measure(measuredEl, root) : null,
      isSelected: measuredEl !== null && measuredEl === liveSelected,
      panelEl: liveSelected,
    });
  }, [active, hoverEl, selectedEl, measureTick]);

  return (
    <div className="w-full space-y-3" dir="ltr">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => (active ? deactivate() : setActive(true))}
          aria-pressed={active}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring',
            RING,
            active ? 'text-white' : 'text-n-11 hover:text-n-12',
          )}
          style={{ backgroundColor: active ? SELECT_BLUE : SURFACE.level1 }}
        >
          <Ruler size={14} aria-hidden="true" />
          Inspect spacing
        </button>
        <span className="text-xs text-n-9">
          {active ? 'Hover to measure · click to select · Esc to exit' : 'Toggle to measure padding, gaps, and sizes like Figma dev mode.'}
        </span>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div
          className={cn('relative min-w-0 flex-1 rounded-xl p-8', RING)}
          style={{ backgroundColor: SURFACE.level0 }}
        >
          <div ref={contentRef} className="relative">
            {children}
            {snapshot?.m && <OverlayLayer m={snapshot.m} selected={snapshot.isSelected} />}
          </div>
          {active && (
            <div
              ref={captureRef}
              className="absolute inset-0 z-50 cursor-crosshair"
              onMouseMove={(e) => setHoverEl(pick(e.clientX, e.clientY))}
              onMouseLeave={() => setHoverEl(null)}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedEl(pick(e.clientX, e.clientY));
              }}
            />
          )}
        </div>
        {active && snapshot?.panelEl && (
          <LayerPropertiesPanel el={snapshot.panelEl} onClear={() => setSelectedEl(null)} />
        )}
      </div>
    </div>
  );
}
