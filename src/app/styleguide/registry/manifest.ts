/**
 * App-side manifest: types the JSON single source ({@link ComponentMeta}) and
 * joins each entry with its co-located doc module (JSX examples + raw source)
 * by `id`. Everything downstream — nav, the ComponentDoc renderer, search —
 * reads from here, so there is one place that defines the design system.
 *
 * The node build script (`scripts/styleguide-manifest.mjs`) reads the same
 * `manifest.json` directly to generate the handoff hint map and the llms.txt
 * component index, which is why the drift-sensitive data lives in JSON.
 */
import manifestJson from './manifest.json';
import { DOC_MODULES } from '../docs';
import type {
  ComponentMeta,
  ManifestGroup,
  ResolvedComponent,
  ComponentTier,
} from './types';

interface ManifestFile {
  components: ComponentMeta[];
}

const META: ComponentMeta[] = (manifestJson as ManifestFile).components;

/** All components, meta joined with any co-located doc module. */
export const COMPONENTS: ResolvedComponent[] = META.map((meta) => ({
  ...meta,
  doc: DOC_MODULES[meta.id],
}));

const BY_ID = new Map<string, ResolvedComponent>(
  COMPONENTS.map((c) => [c.id, c]),
);

export function getComponent(id: string): ResolvedComponent | undefined {
  return BY_ID.get(id);
}

export function componentsForTier(tier: ComponentTier): ResolvedComponent[] {
  return COMPONENTS.filter((c) => c.tier === tier);
}

/**
 * Tier sliced into ordered sub-groups, preserving first-seen group order so
 * the nav reads in the same sequence the manifest is authored in. Children
 * (entries with a `parentId`) are omitted from the top level — they render
 * nested under their parent via {@link childrenOf}.
 */
export function groupsForTier(tier: ComponentTier): ManifestGroup[] {
  const order: string[] = [];
  const byGroup = new Map<string, ResolvedComponent[]>();
  for (const c of componentsForTier(tier)) {
    if (c.parentId) continue;
    if (!byGroup.has(c.group)) {
      byGroup.set(c.group, []);
      order.push(c.group);
    }
    byGroup.get(c.group)!.push(c);
  }
  return order.map((label) => ({ label, items: byGroup.get(label)! }));
}

/** Resolve the family children of a parent entry, in manifest order. */
export function childrenOf(id: string): ResolvedComponent[] {
  return COMPONENTS.filter((c) => c.parentId === id);
}

/** Resolve a component's anatomy ids into their resolved entries (Blocks). */
export function resolveAnatomy(c: ResolvedComponent): ResolvedComponent[] {
  return (c.anatomy ?? [])
    .map((id) => BY_ID.get(id))
    .filter((x): x is ResolvedComponent => x != null);
}

export const TIER_LABEL: Record<ComponentTier, string> = {
  primitive: 'Primitives',
  block: 'Blocks',
};
