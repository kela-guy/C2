import type { ComponentSpec } from './types';

export function specToNotionMarkdown(spec: ComponentSpec) {
  const today = new Date().toISOString().split('T')[0];
  const missing = spec.states.filter(s => !s.implementedInPrototype);

  return {
    title: `${spec.name} — Dev Handoff — ${today}`,
    sections: [
      {
        heading: 'Overview',
        content: [
          `**Purpose:** ${spec.purpose}`,
          `**File:** \`${spec.filePath}\``,
          `**Location:** ${spec.location}`,
          `**Status:** ${spec.status}`,
          ...(spec.notes?.length
            ? ['', '**Notes:**', ...spec.notes.map(n => `- ${n}`)]
            : []),
        ].join('\n'),
      },
      {
        heading: 'Props',
        content: [
          '| Prop | Type | Required | Default | Description |',
          '|------|------|----------|---------|-------------|',
          ...spec.props.map(p =>
            `| \`${p.name}\` | \`${p.type}\` | ${p.required ? 'Yes' : '—'} | ${p.defaultValue ? `\`${p.defaultValue}\`` : '—'} | ${p.description} |`,
          ),
        ].join('\n'),
      },
      {
        heading: 'States',
        content: [
          `> **${missing.length} states not in prototype**`,
          '',
          '| State | Trigger | Description | Status |',
          '|-------|---------|-------------|--------|',
          ...spec.states.map(s =>
            `| **${s.name}** | ${s.trigger} | ${s.description} | ${s.implementedInPrototype ? 'Implemented' : 'Missing'} |`,
          ),
        ].join('\n'),
      },
      {
        heading: 'Interactions',
        content: [
          '| Trigger | Element | Result | Keyboard |',
          '|---------|---------|--------|----------|',
          ...spec.interactions.map(i =>
            `| ${i.trigger} | ${i.element} | ${i.result} | ${i.keyboard || '—'} |`,
          ),
        ].join('\n'),
      },
      {
        heading: 'Flows',
        content: (spec.flows || [])
          .map(fl =>
            `### ${fl.name} (${fl.type})\n${fl.steps.map((s, i) => `${i + 1}. **${s.actor}:** ${s.action} → ${s.result}`).join('\n')}`,
          )
          .join('\n\n'),
      },
      {
        heading: 'Tasks',
        content: spec.tasks
          .map(t =>
            [
              `### ${t.id}: ${t.title}`,
              `**${t.priority}** | **${t.estimate}**${t.dependencies?.length ? ` | Depends: ${t.dependencies.join(', ')}` : ''}`,
              '',
              t.description,
              '',
              '**Files:**',
              ...t.files.map(fl => `- \`${fl.path}\` (${fl.action})`),
              '',
              '**AC:**',
              ...t.acceptanceCriteria.map(ac => `- [ ] ${ac}`),
            ].join('\n'),
          )
          .join('\n\n---\n\n'),
      },
    ],
  };
}

const ptMap: Record<string, number> = { S: 1, M: 2, L: 3, XL: 5 };
const prMap: Record<string, number> = { P0: 1, P1: 2, P2: 3 };

export function specToLinearIssues(spec: ComponentSpec) {
  const missingCount = spec.states.filter(s => !s.implementedInPrototype).length;
  const totalPoints = spec.tasks.reduce((s, t) => s + (ptMap[t.estimate] || 2), 0);

  return {
    parent: {
      title: `${spec.name} — Implementation`,
      description: [
        `## Overview`,
        spec.purpose,
        '',
        `**Source:** \`${spec.filePath}\``,
        `**${missingCount}** states need implementing · **${spec.tasks.length}** tasks · **~${totalPoints}** points`,
      ].join('\n'),
      priority: 2,
      estimate: totalPoints,
      labels: ['feature', 'handoff'],
    },
    children: spec.tasks.map(t => ({
      title: `[${t.id}] ${t.title}`,
      description: [
        t.description,
        '',
        '## Files',
        ...t.files.map(fl => `- \`${fl.path}\` (${fl.action}) — ${fl.description}`),
        '',
        '## AC',
        ...t.acceptanceCriteria.map(ac => `- [ ] ${ac}`),
      ].join('\n'),
      priority: prMap[t.priority] || 3,
      estimate: ptMap[t.estimate] || 2,
      labels: ['implementation'],
      dependsOn: t.dependencies || [],
    })),
  };
}
