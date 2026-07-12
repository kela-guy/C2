/**
 * Typed component manifest — the single source of truth for the C2 Hub
 * design system. The drift-sensitive *data* lives in `manifest.json` (plain
 * JSON so both the app and the node build script in
 * `scripts/styleguide-manifest.mjs` can read it without extra tooling). The
 * app types that JSON with {@link ComponentMeta} and joins it with co-located
 * doc modules (JSX examples + raw source) keyed by `id`.
 *
 * One manifest -> docs, nav, the handoff hint map, the registry cross-check,
 * and the `llms.txt` component index. When these go through the manifest they
 * cannot silently drift apart.
 */

/**
 * Composition depth / entry kind. Foundations are the token + governance +
 * system layers (not components); Primitives are atomic; Blocks compose 2-3+
 * primitives.
 */
export type ComponentTier = 'foundation' | 'primitive' | 'block';

/** A single row in a component's API reference table. */
export interface PropDef {
  name: string;
  type: string;
  default?: string;
  description: string;
}

/**
 * One named state a component must document, modelling the ui-craft rule that
 * the full state set is mandatory (default / hover / active / focus-visible /
 * disabled, plus loading / empty / error for data displays).
 */
export interface StateDef {
  id: string;
  label: string;
  /** Optional note describing what the state looks like / when it applies. */
  note?: string;
}

/**
 * Pure-data manifest entry. JSON-serializable on purpose: this is exactly the
 * shape stored in `manifest.json` and consumed by the node build script.
 */
export interface ComponentMeta {
  /** Stable id — also the styleguide section anchor and handoff section. */
  id: string;
  /** Display name, e.g. `ActionButton`. */
  name: string;
  tier: ComponentTier;
  /** Sub-group label within a tier, e.g. `Actions`, `Card slots`. */
  group: string;
  description: string;
  /**
   * Id of the family parent this entry is a child of, e.g. `button`. Children
   * nest under the parent in the nav and are surfaced in the parent's Family
   * section; the parent links back to each child. Top-level entries omit it.
   */
  parentId?: string;
  /** Import specifier consumers use, e.g. `@/primitives`. */
  importPath: string;
  /** Matching `registry.json` item name, when published. */
  registryName?: string;
  /** Ids of constituent primitives — Blocks only. Drives the Anatomy section. */
  anatomy?: string[];
  /** Documented states (the ui-craft full-state-set gate). */
  states?: StateDef[];
  /** `data-handoff-component` values that should deep-link to this entry. */
  handoffHints?: string[];
  /** API reference rows. */
  props?: PropDef[];
}

/** A single runnable example inside a doc module. */
export interface ComponentExample {
  id: string;
  title: string;
  description?: string;
  /** Copyable snippet shown under the preview. Falls back to none. */
  code?: string;
  /** Live render. */
  render: () => React.ReactNode;
}

/**
 * One live-rendered edge case for a component — the content/state boundaries
 * that happy-path examples don't cover (long text, truncation, empty,
 * overflow, extreme values, forced visual states). Rendered as a labeled
 * gallery so every primitive's failure modes are visible, per the ui-craft
 * full-state-set gate. Lives in the doc module (a live-render concern), not
 * in the drift-guarded `manifest.json`.
 */
export interface EdgeCase {
  id: string;
  /** Short caption, e.g. `Long label`, `Empty`, `Overflow`. */
  label: string;
  /** Optional one-liner on what to watch for. */
  note?: string;
  /** Live render. */
  render: () => React.ReactNode;
}

/**
 * App-side doc module, co-located at `src/app/styleguide/docs/<id>.doc.tsx`.
 * Holds the JSX examples and raw source; references its {@link ComponentMeta}
 * by `id`. Never shipped in the registry.
 */
export interface ComponentDocModule {
  /** Must match a {@link ComponentMeta.id}. */
  id: string;
  /** Import + minimal usage snippet shown in the Usage block. */
  usage?: string;
  /**
   * Keep comments in the hero usage snippet. Set when the comments ARE the
   * content — e.g. a self-contained handoff starter whose comments carry the
   * layer-by-layer instructions.
   */
  usageKeepComments?: boolean;
  /** Raw component source (via Vite `?raw`) for the Source tab. */
  source?: string;
  /** Extra related files for the Files tab. */
  relatedFiles?: { file: string; code: string }[];
  examples: ComponentExample[];
  /** Live-rendered edge cases shown in the Edge cases gallery. */
  edgeCases?: EdgeCase[];
}

/** Meta joined with its (optional) doc module — what the renderer consumes. */
export interface ResolvedComponent extends ComponentMeta {
  doc?: ComponentDocModule;
}

/** A tier-grouped slice of the manifest, ready for nav rendering. */
export interface ManifestGroup {
  /** Sub-group label. */
  label: string;
  items: ResolvedComponent[];
}
