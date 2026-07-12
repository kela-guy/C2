/**
 * Shared, self-contained doc UI for the manifest-driven design system. Holds
 * the visual language of the styleguide (layered shadow rings, level-0
 * surface, tabular numerics) without depending on the legacy
 * `StyleguidePage.tsx` monolith — so the new surface can grow and the old one
 * can be deleted in waves.
 *
 * Every control here honours the ui-craft invariants: focus-visible rings,
 * `active:scale` press feedback, transform/opacity-only animation, reduced
 * motion, and `aria-label` on icon-only buttons.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { Check, ChevronsDownUp, Code2, Copy } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { SURFACE } from '@/primitives';
import { cn } from '@/shared/components/ui/utils';
import type { EdgeCase, PropDef } from './types';
import { useShikiHtml, type ShikiLang } from './useShiki';
import { stripCodeComments } from './stripCodeComments';

/** Layered ring — the single depth strategy used across docs. */
export const RING = 'shadow-[0_0_0_1px_rgba(255,255,255,0.06)]';

/** Quiet, accessible copy-to-clipboard icon button. */
export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const onCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={copied ? 'Copied' : label}
      className="flex size-8 items-center justify-center rounded-md text-white/50 transition-[color,background-color,transform] duration-150 ease-out hover:bg-state-hover-overlay hover:text-white/90 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copied ? 'check' : 'copy'}
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
          transition={{ type: 'spring', duration: 0.2, bounce: 0 }}
          className="flex items-center justify-center"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

/**
 * Shiki-highlighted code surface. Renders the dual-theme HTML (defaulting to
 * the dark `--shiki-dark` palette via {@link useShikiHtml}); falls back to a
 * plain monospace `<pre>` until the highlighter loads. The global `.shiki`
 * rule in `styles/theme.css` neutralises shiki's inline background so the doc
 * surface shows through.
 */
export function Code({
  code,
  lang = 'tsx',
  stripComments = true,
}: {
  code: string;
  lang?: ShikiLang;
  stripComments?: boolean;
}) {
  // Styleguide previews show comment-free code so the snippet reads as the
  // API shape, not its inline narration.
  const clean = useMemo(
    () => (stripComments ? stripCodeComments(code, lang) : code),
    [code, lang, stripComments],
  );
  const html = useShikiHtml(clean, lang);
  if (html) {
    return (
      <div
        dir="ltr"
        className="text-sm leading-relaxed [&_pre]:min-w-0 [&_pre]:overflow-x-auto [&_pre]:overscroll-x-contain [&_pre]:px-4 [&_pre]:py-3.5 [&_pre]:outline-none [&_code]:font-mono [&_code]:tabular-nums"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return (
    <pre dir="ltr" className="overflow-x-auto px-4 py-3.5 text-sm leading-relaxed">
      <code className="font-mono text-white/80 tabular-nums">{clean}</code>
    </pre>
  );
}

/** Read-only code surface with a hover-stable copy affordance. */
export function CodeBlock({
  code,
  className,
  lang = 'tsx',
}: {
  code: string;
  className?: string;
  lang?: ShikiLang;
}) {
  const clean = useMemo(() => stripCodeComments(code, lang), [code, lang]);
  return (
    <div className={cn('relative rounded-lg overflow-hidden', RING, className)} style={{ backgroundColor: SURFACE.level0 }}>
      <div className="absolute right-2 top-2 z-10">
        <CopyButton text={clean} />
      </div>
      <Code code={code} lang={lang} />
    </div>
  );
}

/**
 * shadcn-style stacked preview container: a single card with the live preview
 * region on top and the source snippet below. The code region is clipped to a
 * max height with a fade + "View Code" toggle, mirroring the shadcn docs
 * `data-slot="component-preview"` anatomy (we use the C2 depth `RING` in place
 * of a hard border to honour the single-depth invariant).
 */
export function ComponentPreview({
  render,
  code,
  lang = 'tsx',
  align = 'center',
  height,
  stripComments = true,
}: {
  render: () => React.ReactNode;
  code?: string;
  lang?: ShikiLang;
  align?: 'start' | 'center' | 'end';
  height?: number | string;
  /**
   * Styleguide docs strip comments so snippets read as the API shape. Pass
   * `false` when the comments ARE the content (e.g. a handoff starter file
   * whose comments carry the replace/keep instructions).
   */
  stripComments?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const cleanCode = useMemo(
    () => (code && stripComments ? stripCodeComments(code, lang) : code),
    [code, lang, stripComments],
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  // Collapsing while the code is scrolled would otherwise leave the container's
  // retained scrollTop showing a mid-snippet slice under the "View Code" fade —
  // reset to the top before switching back to the clipped state.
  const handleCollapse = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setExpanded(false);
  }, []);
  return (
    <div
      className={cn('group relative flex flex-col overflow-hidden rounded-xl', RING)}
      style={{ backgroundColor: SURFACE.level0 }}
    >
      <div
        dir="ltr"
        data-align={align}
        className={cn(
          'flex w-full justify-center p-10',
          align === 'center' && 'items-center',
          align === 'end' && 'items-end',
          align === 'start' && 'items-start',
        )}
        style={height ? { height: typeof height === 'number' ? `${height}px` : height } : undefined}
      >
        {render()}
      </div>

      {code && (
        <div className="relative border-t border-white/[0.06]" style={{ backgroundColor: SURFACE.level1 }}>
          {/* Pinned control cluster — lives outside the scroll container so the
              Collapse affordance stays clickable no matter how far the code has
              been scrolled. Copy reveals on hover; Collapse only exists (and is
              always visible) once expanded. */}
          <div
            className={cn(
              'absolute right-2 top-3 z-20 flex items-center gap-1 transition-opacity duration-150',
              expanded
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
            )}
          >
            {expanded && (
              <button
                type="button"
                onClick={handleCollapse}
                aria-label="Collapse"
                className="flex size-8 items-center justify-center rounded-md text-white/50 transition-[color,background-color,transform] duration-150 ease-out hover:bg-state-hover-overlay hover:text-white/90 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring"
              >
                <ChevronsDownUp size={14} aria-hidden="true" />
              </button>
            )}
            <CopyButton text={cleanCode ?? code} />
          </div>
          <div ref={scrollRef} className={cn('relative overflow-hidden', expanded ? 'max-h-[640px] overflow-auto' : 'max-h-40')}>
            <Code code={code} lang={lang} stripComments={stripComments} />
            {!expanded && (
              <div className="absolute inset-0 flex items-center justify-center pb-4">
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to top, ${SURFACE.level1}, color-mix(in oklab, ${SURFACE.level1} 60%, transparent), transparent)`,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className={cn(
                    'relative z-10 inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-n-12 transition-[background-color,transform] duration-150 ease-out hover:bg-state-hover-strong active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring',
                    RING,
                  )}
                  style={{ backgroundColor: SURFACE.level0 }}
                >
                  <Code2 size={14} aria-hidden="true" />
                  View Code
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * A single doc "section" — one focal preview tile plus an optional copyable
 * snippet underneath. Concentric radius: outer tile is `rounded-xl`, code
 * block is `rounded-lg`.
 */
export function PreviewTile({
  children,
  tight = false,
  grid = false,
  align = 'center',
}: {
  children: React.ReactNode;
  tight?: boolean;
  grid?: boolean;
  align?: 'center' | 'stretch';
}) {
  const gridStyle = grid
    ? {
        backgroundImage:
          'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }
    : undefined;
  return (
    <div
      dir="ltr"
      className={cn(
        'rounded-xl',
        RING,
        tight ? 'p-6' : 'p-10',
        align === 'center' && 'flex min-h-[200px] items-center justify-center',
      )}
      style={{ backgroundColor: SURFACE.level0, ...gridStyle }}
    >
      {children}
    </div>
  );
}

/**
 * Labeled gallery of live-rendered edge cases. Each cell carries a caption
 * above a mini preview tile, so a component's content and state boundaries
 * (truncation, empty, overflow, extremes, forced visual states) are all
 * visible at a glance.
 *
 * Craft: concentric radius (`rounded-lg` tiles inside the `rounded-xl`
 * canvas), the single layered-shadow `RING` depth strategy, `tabular-nums`
 * so numeric edge cases align, and an explicit `dir="ltr"` — the styleguide
 * page is always LTR (components document their own RTL support) — like
 * {@link PreviewTile}.
 */
export function EdgeCaseGrid({ cases }: { cases: EdgeCase[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {cases.map((ec) => (
        <div key={ec.id} className="flex flex-col">
          <h3 className="mb-2 text-sm font-medium text-n-11" style={{ textWrap: 'balance' }}>
            {ec.label}
          </h3>
          <div
            dir="ltr"
            className={cn(
              'flex min-h-[120px] flex-1 items-center justify-center overflow-hidden rounded-lg p-6 tabular-nums',
              RING,
            )}
            style={{ backgroundColor: SURFACE.level0 }}
          >
            {ec.render()}
          </div>
        </div>
      ))}
    </div>
  );
}

/** shadcn-style API reference table. */
export function PropsTable({ items }: { items: PropDef[] }) {
  return (
    <div className={cn('overflow-x-auto rounded-lg', RING)} dir="ltr">
      <table className="w-full text-sm" dir="ltr">
        <thead>
          <tr className="border-b border-white/5" style={{ backgroundColor: SURFACE.level1 }}>
            <th className="px-4 py-2.5 text-left font-medium text-n-10">Prop</th>
            <th className="px-4 py-2.5 text-left font-medium text-n-10">Type</th>
            <th className="px-4 py-2.5 text-left font-medium text-n-10">Default</th>
            <th className="px-4 py-2.5 text-left font-medium text-n-10">Description</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.name} className="border-b border-white/[0.03] last:border-0">
              <td className="px-4 py-3 font-mono text-sm font-medium text-sky-300/90">{p.name}</td>
              <td className="px-4 py-3 font-mono text-n-9">{p.type}</td>
              <td className="px-4 py-3 font-mono text-n-9">{p.default ?? '—'}</td>
              <td className="px-4 py-3 text-n-9">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Section heading — the second tier below the page title. Carries a hairline
 * rule (shadcn pattern) so sections read as distinct bands, sized a clear step
 * under the `text-3xl` page title and a step above subheads / captions.
 */
export function DocSectionHeading({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2
      id={id}
      className="mb-6 mt-12 scroll-mt-20 border-b border-white/[0.06] pb-2 text-2xl font-semibold tracking-tight text-n-12 first:mt-0"
      style={{ textWrap: 'balance' }}
    >
      {children}
    </h2>
  );
}

/**
 * Muted lead paragraph that sits directly under a {@link DocSectionHeading}.
 * Deliberately a step smaller and quieter than the heading and than the
 * subheads/labels it precedes, so it never out-weighs the hierarchy.
 */
export function DocSectionLead({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-6 max-w-[68ch] text-sm leading-relaxed text-n-9" style={{ textWrap: 'pretty' }}>
      {children}
    </p>
  );
}
