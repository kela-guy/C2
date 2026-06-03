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
 *
 * Source of truth: the design-system manifest now generates a base map
 * (`GENERATED_SECTION_BY_HINT`, emitted by `scripts/styleguide-manifest.mjs`).
 * The manual map below is layered on top so legacy `/styleguide`
 * granular sections (e.g. `device-row-actions`, `device-health`) keep their
 * precise targets until those parts finish migrating. As components move into
 * the manifest, entries can be deleted from the manual map and the generated
 * base takes over — kept honest by the manifest drift guard.
 */
import { GENERATED_SECTION_BY_HINT } from '@/app/styleguide/registry/styleguideSectionByHint.generated';

const MANUAL_SECTION_BY_HINT: Record<string, string> = {
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
  'new-updates': 'new-updates',

  // Device panel chrome → the DevicesPanel section.
  'devices-panel': 'devices-panel',
  'devices-panel-header': 'devices-panel',
  'device-type-group': 'devices-panel',

  // Device card primitives → the granular Device Card sections. Picking
  // any sub-part of a device row lands on its exact doc rather than the
  // generic panel section.
  'device-card': 'device-card',
  'device-row': 'device-row',
  'device-row-header': 'device-row',
  'device-row-details': 'device-row',
  'device-row-actions': 'device-row-actions',
  'device-icon': 'device-health',
  'device-detail-grid': 'device-detail-grid',
  'device-detail-row': 'device-detail-grid',
  'device-camera-preview': 'device-camera-preview',
  // Always-visible header primary cluster (Show-on-map + per-type On/Off,
  // now-playing readout, notify countdown echo).
  'device-header-cluster': 'device-header-cluster',
  'device-center-on-map': 'device-header-cluster',
  'device-floodlight-toggle': 'device-header-cluster',
  'device-speaker-play': 'device-header-cluster',
  'device-now-playing': 'device-header-cluster',
  'device-notify-indicator': 'device-overflow',
  // Footer 3-dot overflow — Logs error channel + timed Notifications.
  'device-overflow': 'device-overflow',
  'device-notifications': 'device-overflow',
  'device-logs': 'device-overflow',
  // Every other footer control is the same DeviceAction primitive.
  'device-action': 'device-action',
  'device-mute': 'device-action',
  'device-jam-button': 'device-action',
  'device-pin-button': 'device-action',
  'device-wipers': 'device-action',
  'device-calibrate': 'device-action',

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

/**
 * Merged resolver map: manifest-generated base, with the manual legacy map
 * winning on conflicts so granular `/styleguide` sections stay precise during
 * migration.
 */
const STYLEGUIDE_SECTION_BY_HINT: Record<string, string> = {
  ...GENERATED_SECTION_BY_HINT,
  ...MANUAL_SECTION_BY_HINT,
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
