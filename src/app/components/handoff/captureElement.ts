/**
 * Pure capture pipeline. Returns the minimal structured snapshot the
 * popover needs at click time: the element's identity (tag + component
 * hints), its class string for the Copy action, and its rect for the
 * dashed pin overlay.
 *
 * No React, no DOM mutation — safe to call from any handler.
 */

export interface CapturedElement {
  /** Lower-case tag (`div`, `button`, `svg`, …). */
  tag: string;
  /** Nearest `data-handoff-component` / shadcn `data-slot` value. */
  componentHint: string | null;
  /**
   * All `data-handoff-component` and `data-slot` values found on the
   * element and its ancestors, ordered leaf → root. Lets the styleguide
   * link walk past inner primitives (e.g. `tooltip-trigger`) to find a
   * higher-level component that actually has a styleguide section.
   * Deduped so a repeated ancestor hint never costs an extra lookup.
   */
  componentHintChain: string[];
  /** `classList` joined with spaces — one-shot Copy payload. */
  className: string;
  /** Same list as an array (used for the `N cls` header count). */
  classes: string[];
  /** Live `getBoundingClientRect()` snapshot. Drives the pin overlay. */
  rect: { x: number; y: number; width: number; height: number };
}

/** Read `dataset.handoffComponent` first, then `dataset.slot`. */
export function hintFor(el: Element): string | null {
  if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) return null;
  const ds = (el as HTMLElement).dataset;
  return ds?.handoffComponent ?? ds?.slot ?? null;
}

/**
 * An element is a component boundary if it carries an explicit
 * `data-handoff-component` stamp or a shadcn `data-slot`. The picker's
 * ancestor-walk uses this to soft-cap `Arrow Up`, so the developer
 * doesn't accidentally bubble from FilterBar all the way out to
 * DevicesPanel.
 */
export function isComponentBoundary(el: Element): boolean {
  return hintFor(el) !== null;
}

function deriveComponentHint(el: Element): string | null {
  // `.closest('[data-handoff-component]')` would only see opt-in stamps;
  // walking once gives us both attribute types in source-order priority.
  for (let cur: Element | null = el; cur && cur !== document.body; cur = cur.parentElement) {
    const h = hintFor(cur);
    if (h) return h;
  }
  return null;
}

/**
 * Walk leaf → root collecting every hint, deduped. Bounded depth keeps
 * the cost flat even on absurdly deep trees.
 */
function deriveComponentHintChain(el: Element): string[] {
  const chain: string[] = [];
  const seen = new Set<string>();
  let cur: Element | null = el;
  for (let depth = 0; cur && cur !== document.body && depth < 32; depth += 1) {
    const h = hintFor(cur);
    if (h && !seen.has(h)) {
      seen.add(h);
      chain.push(h);
    }
    cur = cur.parentElement;
  }
  return chain;
}

function getClassList(el: Element): string[] {
  // SVG's `className` is an `SVGAnimatedString` — `classList` is the
  // safe path for both HTML and SVG.
  const list: string[] = [];
  el.classList.forEach((c) => list.push(c));
  return list;
}

export function captureElement(el: Element): CapturedElement {
  const rect = el.getBoundingClientRect();
  const classes = getClassList(el);
  return {
    tag: el.tagName.toLowerCase(),
    componentHint: deriveComponentHint(el),
    componentHintChain: deriveComponentHintChain(el),
    className: classes.join(' '),
    classes,
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
  };
}
