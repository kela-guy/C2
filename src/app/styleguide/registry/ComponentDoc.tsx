/**
 * Generic, manifest-driven component documentation page. One renderer for
 * every primitive and block — the per-component content comes from the
 * {@link ResolvedComponent} (meta from `manifest.json`) joined with its
 * co-located doc module (examples + source).
 *
 * Section order mirrors the reverse-engineered shadcn/base-ui anatomy:
 * header -> stacked Preview+Code hero -> Examples -> Edge cases ->
 * Anatomy (Blocks). The live Preview is the single focal point per the
 * ui-craft surface model.
 */
import { Boxes, Component as ComponentIcon } from 'lucide-react';
import { getComponent, resolveAnatomy } from './manifest';
import type { ResolvedComponent } from './types';
import {
  ComponentPreview,
  DocSectionHeading,
  DocSectionLead,
  EdgeCaseGrid,
  RING,
} from './docPrimitives';
import { cn } from '@/shared/components/ui/utils';
import { SURFACE } from '@/primitives';

function TierChip({ tier }: { tier: ResolvedComponent['tier'] }) {
  const isBlock = tier === 'block';
  const Icon = isBlock ? Boxes : ComponentIcon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium',
        isBlock ? 'bg-violet-500/15 text-violet-300' : 'bg-sky-500/15 text-sky-300',
      )}
    >
      <Icon size={12} aria-hidden="true" />
      {isBlock ? 'Block' : 'Primitive'}
    </span>
  );
}

function Hero({ c }: { c: ResolvedComponent }) {
  const hero = c.doc?.examples[0];
  if (!hero) return null;
  return <ComponentPreview render={hero.render} code={c.doc?.usage ?? hero.code} />;
}

function AnatomySection({
  c,
  onNavigate,
}: {
  c: ResolvedComponent;
  onNavigate?: (id: string) => void;
}) {
  const parts = resolveAnatomy(c);
  if (parts.length === 0) return null;
  return (
    <section>
      <DocSectionHeading id="anatomy">Anatomy</DocSectionHeading>
      <DocSectionLead>
        This block composes the following primitives and blocks. Each links to its own doc.
      </DocSectionLead>
      <div className="flex flex-wrap gap-2">
        {parts.map((part) => (
          <button
            key={part.id}
            type="button"
            onClick={() => onNavigate?.(part.id)}
            className={cn(
              'group inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25',
              RING,
            )}
            style={{ backgroundColor: SURFACE.level1 }}
          >
            <span className="font-medium text-n-11 group-hover:text-n-12">{part.name}</span>
            <span className="text-xs text-n-120">{part.tier}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ParentBacklink({
  c,
  onNavigate,
}: {
  c: ResolvedComponent;
  onNavigate?: (id: string) => void;
}) {
  if (!c.parentId) return null;
  const parent = getComponent(c.parentId);
  if (!parent) return null;
  return (
    <button
      type="button"
      onClick={() => onNavigate?.(parent.id)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs text-n-9 transition-colors duration-150 hover:text-n-11 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25',
        RING,
      )}
    >
      <ComponentIcon size={12} aria-hidden="true" />
      Built on {parent.name}
    </button>
  );
}

function ExamplesSection({ c }: { c: ResolvedComponent }) {
  // First example is the hero (shown above with its usage); list the rest as
  // preview-only tiles — examples don't carry their own code block.
  const examples = (c.doc?.examples ?? []).slice(1);
  if (examples.length === 0) return null;
  return (
    <section>
      <DocSectionHeading id="examples">Examples</DocSectionHeading>
      <div className="space-y-10">
        {examples.map((ex) => (
          <div key={ex.id} id={ex.id} className="scroll-mt-20 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-medium text-n-12" style={{ textWrap: 'balance' }}>
                {ex.title}
              </h3>
              {ex.description && (
                <p className="max-w-[68ch] text-sm leading-relaxed text-n-9" style={{ textWrap: 'pretty' }}>
                  {ex.description}
                </p>
              )}
            </div>
            <ComponentPreview render={ex.render} />
          </div>
        ))}
      </div>
    </section>
  );
}

function EdgeCasesSection({ c }: { c: ResolvedComponent }) {
  const cases = c.doc?.edgeCases ?? [];
  if (cases.length === 0) return null;
  return (
    <section>
      <DocSectionHeading id="edge-cases">Edge cases</DocSectionHeading>
      <DocSectionLead>
        Content and state boundaries the happy-path examples don't show — long text, truncation,
        empty, overflow, extreme values, and forced visual states.
      </DocSectionLead>
      <EdgeCaseGrid cases={cases} />
    </section>
  );
}

function NotMigratedStub({ c }: { c: ResolvedComponent }) {
  return (
    <div
      className={cn('rounded-xl p-10 text-center', RING)}
      style={{ backgroundColor: SURFACE.level0 }}
    >
      <p className="text-sm text-n-9">
        Doc not yet migrated. Reference{' '}
        <code className="rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-sky-300/80">
          {c.importPath}
        </code>{' '}
        and the legacy <code className="font-mono text-n-10">/styleguide#{c.id}</code> section.
      </p>
    </div>
  );
}

export function ComponentDoc({
  component,
  onNavigate,
}: {
  component: ResolvedComponent;
  onNavigate?: (id: string) => void;
}) {
  const c = component;
  return (
    <article className="mx-auto max-w-[880px] space-y-12">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-n-12" style={{ textWrap: 'balance' }}>
            {c.name}
          </h1>
          <TierChip tier={c.tier} />
        </div>
        <p className="max-w-[68ch] text-base leading-7 text-n-9" style={{ textWrap: 'pretty' }}>
          {c.description}
        </p>
        {c.parentId && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <ParentBacklink c={c} onNavigate={onNavigate} />
          </div>
        )}
      </header>

      {c.doc ? <Hero c={c} /> : <NotMigratedStub c={c} />}

      <ExamplesSection c={c} />
      <EdgeCasesSection c={c} />
      <AnatomySection c={c} onNavigate={onNavigate} />
    </article>
  );
}
