/**
 * Co-located doc module for the Conventions foundation. Renders the governance
 * ruleset straight from the generated source
 * (`registry/designRules.generated.ts`, built from governance/rules.json) so
 * humans read exactly what `pnpm design:check` and agents enforce. Meta lives
 * in `registry/manifest.json`.
 */
import { DESIGN_RULES, type DesignRule } from '../registry/designRules.generated';
import type { ComponentDocModule } from '../registry/types';

const SEVERITY_STYLE: Record<string, string> = {
  error: 'bg-rose-500/15 text-rose-300',
  warn: 'bg-amber-500/15 text-amber-300',
  info: 'bg-sky-500/15 text-sky-300',
};

const ENFORCEMENT_LABEL: Record<string, string> = {
  eslint: 'eslint',
  'design-lint': 'design-lint',
  manual: 'review',
};

function RuleCard({ rule }: { rule: DesignRule }) {
  return (
    <div className="space-y-2 rounded-lg p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded px-2 py-0.5 text-xs-plus font-semibold uppercase tracking-wide ${
            SEVERITY_STYLE[rule.severity] ?? 'bg-white/10 text-white/70'
          }`}
        >
          {rule.severity}
        </span>
        <code className="font-mono text-sm-minus font-medium text-white/90">{rule.id}</code>
        <span className="ml-auto rounded bg-white/[0.06] px-2 py-0.5 text-xs-plus text-white/55">
          {ENFORCEMENT_LABEL[rule.enforcement] ?? rule.enforcement}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-white/75">{rule.message}</p>
      {rule.replacement && (
        <p className="text-xs leading-relaxed text-emerald-300/80">
          <span className="font-medium text-emerald-300">Fix:</span> {rule.replacement}
        </p>
      )}
      <code className="block font-mono text-xs-plus text-white/35">{rule.target}</code>
    </div>
  );
}

function RuleList() {
  return (
    <div dir="ltr" className="w-full max-w-2xl space-y-3 text-left">
      {DESIGN_RULES.map((rule) => (
        <RuleCard key={rule.id} rule={rule} />
      ))}
    </div>
  );
}

export const conventionsDoc: ComponentDocModule = {
  id: 'conventions',
  usage: `# Run the single governance gate (drift guard + ratchet + eslint):
pnpm design:check

# Regenerate the rule artifacts after editing governance/rules.json:
pnpm tokens:build

# Rules are also emitted for agents at:
#   public/DESIGN_CONTEXT.md   (read before generating UI)`,
  examples: [
    {
      id: 'rules',
      title: 'Governance rules',
      description:
        'Each rule is data in governance/rules.json — id, severity, target, enforcement, message, and a suggested fix. error/warn rules with an enforcement of eslint or design-lint are machine-checked; manual rules are review-time invariants.',
      render: () => <RuleList />,
    },
  ],
};
