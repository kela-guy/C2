/**
 * Resolve a `componentHint` (shadcn `data-slot` or explicit
 * `data-handoff-component`) to a deep-link into the project styleguide.
 *
 * Two-step lookup:
 * 1. Explicit opt-in via `data-handoff-component="<section-id>"` — already
 *    promoted to `componentHint` by `captureElement.ts` (preferred over
 *    `data-slot`), so it resolves 1:1 here.
 * 2. Static dictionary mapping shadcn primitive slot names → the closest
 *    project section in `/styleguide`. Misses fall through to the
 *    `/styleguide#top` general entry rather than disabling the button —
 *    friendlier than a dead-end UI.
 *
 * Section IDs come from the `<ComponentSection id="…">` calls in
 * [`StyleguidePage.tsx`](src/app/components/StyleguidePage.tsx). When new
 * sections land there, add the mapping here.
 */

const STYLEGUIDE_SECTION_BY_HINT: Record<string, string> = {
  // Project-specific opt-ins map 1:1.
  'status-chip': 'status-chip',
  'action-button': 'action-button',
  'split-action': 'split-action',
  accordion: 'accordion',
  telemetry: 'telemetry',
  'copy-button': 'copy-button',
  'card-header': 'card-header',
  'card-media': 'card-media',
  'card-actions': 'card-actions',
  'card-details': 'card-details',
  'card-identity': 'card-identity',
  'card-sensors': 'card-sensors',
  'card-log': 'card-log',
  'card-closure': 'card-closure',
  'card-states': 'card-states',
  'target-card': 'target-card',
  'filter-bar': 'filter-bar',
  'devices-panel': 'devices-panel',
  'new-updates': 'new-updates',

  // shadcn `data-slot` values → closest project analog. Conservative — only
  // map when a project section semantically owns the primitive; otherwise
  // leave it to the `/styleguide#top` fallback so we don't ship a
  // misleading link.
  card: 'target-card',
  badge: 'status-chip',
  button: 'action-button',
  'accordion-item': 'accordion',
  'accordion-trigger': 'accordion',
  'accordion-content': 'accordion',
};

export interface StyleguideLink {
  /** SPA-relative URI to open. Always defined — falls back to `#top`. */
  uri: string;
  /** Resolved section ID, or `null` when only the generic top is available. */
  section: string | null;
}

/**
 * Resolve a styleguide deep-link from a `componentHint` chain walking
 * up the DOM tree (leaf → root). Picks the first hint that has a known
 * styleguide section so inner primitives without a section (e.g.
 * `tooltip-trigger`) fall through to the nearest documented owner
 * (e.g. the target panel).
 *
 * Empty / unresolved chains fall back to `/styleguide#top` rather than
 * disabling the button — a friendlier dead-end.
 */
export function buildStyleguideLink(
  chain: ReadonlyArray<string> | string | null,
): StyleguideLink {
  const hints =
    chain == null ? [] : typeof chain === 'string' ? [chain] : chain;
  for (const hint of hints) {
    const section = STYLEGUIDE_SECTION_BY_HINT[hint];
    if (section) return { uri: `/styleguide#${section}`, section };
  }
  return { uri: '/styleguide#top', section: null };
}
