/**
 * Co-located doc module for the Design Tokens foundation. Renders the resolved
 * token graph straight from the generated source (`@/primitives/tokens.generated`)
 * so the styleguide always mirrors tokens/core.json + tokens/c2-domain.json.
 * Meta lives in `registry/manifest.json`.
 */
import { DESIGN_TOKENS, type DesignTokenMeta } from '@/primitives/tokens.generated';
import type { ComponentDocModule } from '../registry/types';

const TIER_LABEL: Record<string, string> = {
  primitive: 'Primitive (raw values)',
  semantic: 'Semantic (intent aliases)',
  dimension: 'Dimension',
  domain: 'Domain (tactical)',
};

function isColor(t: DesignTokenMeta) {
  return t.type === 'color';
}

function Swatch({ value }: { value: string }) {
  return (
    <span
      className="inline-block size-6 shrink-0 rounded shadow-[0_0_0_1px_rgba(255,255,255,0.12)]"
      style={{ backgroundColor: value }}
      aria-hidden="true"
    />
  );
}

function TokenRows({ tokens }: { tokens: DesignTokenMeta[] }) {
  return (
    <div className="flex flex-col divide-y divide-white/[0.06]">
      {tokens.map((t) => (
        <div key={t.id} className="flex items-center gap-3 py-2">
          {isColor(t) ? (
            <Swatch value={t.value} />
          ) : (
            <span className="flex size-6 shrink-0 items-center justify-center rounded bg-white/[0.06] text-[10px] font-medium text-white/70">
              {t.value}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <code className="font-mono text-[13px] text-sky-300/90">{t.cssVar}</code>
              <code className="font-mono text-xs text-white/40 tabular-nums">{t.value}</code>
            </div>
            <p className="text-xs leading-relaxed text-white/55">{t.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Token reference for one layer, split into tier sub-sections. */
function TokenReference({ layer }: { layer: 'core' | 'domain' }) {
  const tokens = DESIGN_TOKENS.filter((t) => t.layer === layer);
  const tiers = [...new Set(tokens.map((t) => t.tier))];
  return (
    <div dir="ltr" className="w-full max-w-2xl space-y-6 text-left">
      {tiers.map((tier) => (
        <div key={tier} className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">
            {TIER_LABEL[tier] ?? tier}
          </h4>
          <TokenRows tokens={tokens.filter((t) => t.tier === tier)} />
        </div>
      ))}
    </div>
  );
}

export const tokensDoc: ComponentDocModule = {
  id: 'tokens',
  usage: `/* CSS — consume the custom property, never the raw value */
.panel { background: var(--c2-color-surface-raised); }
.alert { background: var(--c2-color-action-danger-bg); }
.spine { background: var(--c2-threat-detection); }

/* TS / TSX — the typed compatibility surface */
import { SURFACE, CARD_TOKENS } from "@/primitives"
<div style={{ background: SURFACE.level1 }} />

/* Theming: change a Tier-1 primitive in tokens/core.json, then */
//   pnpm tokens:build   (regenerates tokens.generated.* + CSS vars)`,
  examples: [
    {
      id: 'core-tokens',
      title: 'CORE — brand-agnostic',
      description:
        'Primitive raw values, their semantic intent aliases, and the 4px interactive radius. Swap a primitive to re-theme everything that references it; CORE never points at a C2 domain value.',
      render: () => <TokenReference layer="core" />,
    },
    {
      id: 'domain-tokens',
      title: 'C2 DOMAIN — tactical',
      description:
        'Threat-lifecycle accents specific to the C2 Hub (detect → track → mitigate → resolve). Another product would replace this layer wholesale; the CORE travels unchanged.',
      render: () => <TokenReference layer="domain" />,
    },
  ],
};
