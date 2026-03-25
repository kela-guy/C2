import React from 'react';
import type { ComponentSpec } from './types';

function StatusDot({ implemented }: { implemented: boolean }) {
  return (
    <span
      className={`inline-block w-[9px] h-[9px] rounded-full shrink-0 ${
        implemented ? 'bg-emerald-500' : 'bg-red-400'
      }`}
    />
  );
}

function Checkbox() {
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-[4px] border-[1.5px] border-gray-300 shrink-0 mt-[3px]"
      style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
    />
  );
}

function Tag({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'green' | 'red' | 'amber' | 'blue' | 'purple' }) {
  const styles: Record<string, string> = {
    neutral: 'text-gray-600 bg-gray-100 border-gray-200/80',
    green:   'text-emerald-700 bg-emerald-50 border-emerald-200/80',
    red:     'text-red-700 bg-red-50 border-red-200/80',
    amber:   'text-amber-700 bg-amber-50 border-amber-200/80',
    blue:    'text-blue-700 bg-blue-50 border-blue-200/80',
    purple:  'text-purple-700 bg-purple-50 border-purple-200/80',
  };
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-[7px] py-[2px] rounded-[5px] border leading-none ${styles[tone]}`}>
      {children}
    </span>
  );
}

function SectionHeading({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div className="flex items-baseline gap-2.5 mb-5 pb-3 border-b border-gray-200">
      <h2 className="text-[18px] font-semibold text-gray-900 tracking-[-0.02em]">
        {children}
      </h2>
      {count !== undefined && (
        <span className="text-[13px] font-medium text-gray-400 tabular-nums">{count}</span>
      )}
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11.5px] font-semibold text-gray-500 uppercase tracking-[0.06em] mb-2">{children}</h3>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[10px] bg-white border border-gray-200/80 ${className}`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)' }}
    >
      {children}
    </div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; tone: 'amber' | 'blue' | 'green' | 'purple' }> = {
  'prototype':     { label: 'Prototype',     tone: 'amber' },
  'in-progress':   { label: 'In Progress',   tone: 'blue' },
  'ready-for-dev': { label: 'Ready for Dev', tone: 'green' },
  'in-review':     { label: 'In Review',     tone: 'purple' },
  'production':    { label: 'Production',    tone: 'green' },
};

export function SpecDocs({ spec }: { spec: ComponentSpec }) {
  const status = STATUS_CONFIG[spec.status] ?? STATUS_CONFIG.prototype;
  const missing = spec.states.filter(s => !s.implementedInPrototype);
  return (
    <div
      className="antialiased text-[14px] leading-[1.6] text-gray-700 text-left"
      dir="ltr"
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
        direction: 'ltr',
        unicodeBidi: 'isolate',
        background: '#f7f7f8',
        minHeight: '100%',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ padding: '56px 40px', maxWidth: 1400, boxSizing: 'border-box' }}>

        {/* ── Header ── */}
        <header className="mb-14">
          <div className="flex items-baseline gap-3 mb-3">
            <h1 className="text-[30px] font-bold text-gray-950 tracking-[-0.025em]">
              {spec.name}
            </h1>
            <Tag tone={status.tone}>{status.label}</Tag>
          </div>
          <p className="text-[16px] text-gray-500 leading-[1.7] max-w-[800px]">{spec.purpose}</p>
          <div className="flex items-center gap-2.5 mt-4">
            <code className="font-mono text-[12px] text-gray-600 bg-gray-100 border border-gray-200/80 px-2.5 py-[3px] rounded-md">{spec.filePath}</code>
            <span className="text-gray-300">·</span>
            <span className="text-[13px] text-gray-400">{spec.location}</span>
          </div>
        </header>

        {/* ── Missing States Alert ── */}
        {missing.length > 0 && (
          <div className="mb-10 rounded-[10px] bg-red-50 border border-red-200/60 px-5 py-4">
            <div className="text-[14px] font-semibold text-red-800 mb-2">
              {missing.length} state{missing.length > 1 ? 's' : ''} not implemented in prototype
            </div>
            <div className="flex flex-wrap gap-1.5">
              {missing.map((s, i) => (
                <Tag key={i} tone="red">{s.name}</Tag>
              ))}
            </div>
          </div>
        )}

        {/* ── Props ── */}
        <section className="mb-14">
          <SectionHeading count={spec.props.length}>Props</SectionHeading>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-[13.5px] text-left">
                <thead>
                  <tr className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-[0.06em] border-b border-gray-100">
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Type</th>
                    <th className="px-5 py-3 font-semibold">Required</th>
                    <th className="px-5 py-3 font-semibold">Default</th>
                    <th className="px-5 py-3 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {spec.props.map((p, i) => (
                    <tr key={i} className={`border-b border-gray-100/80 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                      <td className="px-5 py-3.5 align-top">
                        <code className="font-mono text-[13px] font-semibold text-indigo-600">{p.name}</code>
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <code className="font-mono text-[12px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{p.type}</code>
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        {p.required
                          ? <Tag tone="red">required</Tag>
                          : <span className="text-gray-400 text-[12px]">optional</span>}
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        {p.defaultValue
                          ? <code className="font-mono text-[12px] text-gray-600">{p.defaultValue}</code>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 align-top">{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        {/* ── States ── */}
        <section className="mb-14">
          <SectionHeading count={spec.states.length}>States</SectionHeading>
          <div className="grid gap-2.5">
            {spec.states.map((s, i) => (
              <Card key={i} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <StatusDot implemented={s.implementedInPrototype} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2.5 mb-1">
                      <span className="font-semibold text-gray-900 text-[14px]">{s.name}</span>
                      {!s.implementedInPrototype && (
                        <span className="text-[11px] text-red-500 font-semibold">needs implementation</span>
                      )}
                    </div>
                    <p className="text-[13.5px] text-gray-600 mb-2">{s.description}</p>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px]">
                      <span className="text-gray-500">
                        <span className="font-semibold text-gray-400">Trigger:</span> {s.trigger}
                      </span>
                      {s.visualNotes && (
                        <span className="text-gray-500">
                          <span className="font-semibold text-gray-400">Visual:</span>{' '}
                          <code className="font-mono text-amber-600 text-[11.5px] bg-amber-50 px-1.5 py-0.5 rounded">{s.visualNotes}</code>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* ── Interactions ── */}
        <section className="mb-14">
          <SectionHeading count={spec.interactions.length}>Interactions</SectionHeading>
          <Card>
            <div className="divide-y divide-gray-100">
              {spec.interactions.map((ix, i) => (
                <div key={i} className="px-5 py-4 flex items-start gap-4">
                  <Tag tone="blue">{ix.trigger}</Tag>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-[14px] mb-0.5">{ix.element}</div>
                    <p className="text-[13.5px] text-gray-600">{ix.result}</p>
                    {ix.animation && (
                      <div className="mt-2 text-[12px] text-gray-400 font-mono bg-gray-50 px-2.5 py-1.5 rounded-md inline-block">
                        {ix.animation.property}: {ix.animation.from} → {ix.animation.to} · {ix.animation.duration} {ix.animation.easing}
                      </div>
                    )}
                  </div>
                  {ix.keyboard && (
                    <kbd
                      className="shrink-0 bg-white text-gray-700 px-2 py-[3px] rounded-[5px] text-[11px] font-mono font-medium border border-gray-200"
                      style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 1px 0 rgba(0,0,0,0.08)' }}
                    >
                      {ix.keyboard}
                    </kbd>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ── Flows ── */}
        {spec.flows && spec.flows.length > 0 && (
          <section className="mb-14">
            <SectionHeading count={spec.flows.length}>Flows</SectionHeading>
            <div className="grid gap-3">
              {spec.flows.map((flow, fi) => (
                <Card key={fi} className="px-5 py-5">
                  <div className="flex items-center gap-2.5 mb-5">
                    <span className="font-semibold text-gray-900 text-[15px]">{flow.name}</span>
                    <Tag tone={flow.type === 'happy' ? 'green' : flow.type === 'error' ? 'red' : 'amber'}>{flow.type}</Tag>
                  </div>
                  <div className="relative ml-1">
                    {flow.steps.map((step, si) => {
                      const actorColor = step.actor === 'user' ? 'bg-blue-500' : step.actor === 'api' ? 'bg-purple-500' : 'bg-emerald-500';
                      return (
                        <div key={si} className="flex items-start gap-4 pb-5 last:pb-0 relative">
                          {si < flow.steps.length - 1 && (
                            <div className="absolute left-[5px] top-[16px] bottom-0 w-px bg-gray-200" />
                          )}
                          <div className={`w-[11px] h-[11px] rounded-full ${actorColor} mt-[5px] shrink-0 relative z-10 ring-2 ring-white`} />
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.06em] mb-0.5">{step.actor}</div>
                            <div className="text-[14px] text-gray-800">{step.action}</div>
                            <div className="text-[13px] text-gray-500 mt-0.5">→ {step.result}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ── Design Tokens ── */}
        <section className="mb-14">
          <SectionHeading>Design Tokens</SectionHeading>

          {spec.tokens.colors.length > 0 && (
            <div className="mb-8">
              <SubHeading>Colors</SubHeading>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
                {spec.tokens.colors.map((t, i) => (
                  <Card key={i} className="px-4 py-3 flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-[6px] shrink-0 border border-black/[0.08]"
                      style={{ background: t.value }}
                    />
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-gray-800 truncate">{t.name}</div>
                      <div className="text-[11.5px] text-gray-400 font-mono truncate">{t.value}</div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {spec.tokens.typography.length > 0 && (
            <div className="mb-8">
              <SubHeading>Typography</SubHeading>
              <Card>
                <div className="divide-y divide-gray-100">
                  {spec.tokens.typography.map((t, i) => (
                    <div key={i} className="px-5 py-3.5 flex items-baseline gap-6 text-[13.5px]">
                      <span className="font-semibold text-gray-800 w-36 shrink-0">{t.name}</span>
                      <code className="font-mono text-[12px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">{t.fontFamily}</code>
                      <span className="text-gray-600 tabular-nums">{t.fontSize} / {t.fontWeight}</span>
                      <span className="text-gray-400 text-[12px] ml-auto">{t.usage}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {spec.tokens.spacing.length > 0 && (
            <div className="mb-8">
              <SubHeading>Spacing</SubHeading>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
                {spec.tokens.spacing.map((s, i) => (
                  <Card key={i} className="px-4 py-3 flex items-center gap-3">
                    <div
                      className="h-3.5 rounded-sm bg-blue-200 shrink-0"
                      style={{ width: Math.max(Math.min(parseInt(s.value) || 8, 48), 6) }}
                    />
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-gray-800">{s.name}</div>
                      <div className="text-[11.5px] text-gray-400 font-mono">{s.value}</div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {spec.tokens.borderRadius && spec.tokens.borderRadius.length > 0 && (
            <div>
              <SubHeading>Border Radius</SubHeading>
              <div className="flex flex-wrap gap-2">
                {spec.tokens.borderRadius.map((r, i) => (
                  <Card key={i} className="px-4 py-3 flex items-center gap-3">
                    <div
                      className="w-7 h-7 bg-gray-200 shrink-0"
                      style={{ borderRadius: r.value }}
                    />
                    <div>
                      <div className="text-[13px] font-medium text-gray-800">{r.name}</div>
                      <div className="text-[11.5px] text-gray-400 font-mono">{r.value}</div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Accessibility ── */}
        <section className="mb-14">
          <SectionHeading>Accessibility</SectionHeading>
          <Card className="p-6">
            <div className="grid grid-cols-2 gap-x-14 gap-y-7">
              {spec.accessibility.role && (
                <div>
                  <SubHeading>Role</SubHeading>
                  <code className="font-mono text-indigo-600 text-[13px] bg-indigo-50 px-2 py-0.5 rounded">{spec.accessibility.role}</code>
                </div>
              )}
              {spec.accessibility.ariaAttributes && spec.accessibility.ariaAttributes.length > 0 && (
                <div>
                  <SubHeading>ARIA Attributes</SubHeading>
                  <div className="space-y-1.5">
                    {spec.accessibility.ariaAttributes.map((a, i) => (
                      <code key={i} className="font-mono text-purple-600 text-[12px] bg-purple-50 px-2 py-0.5 rounded block w-fit">{a}</code>
                    ))}
                  </div>
                </div>
              )}
              {spec.accessibility.keyboardNav && spec.accessibility.keyboardNav.length > 0 && (
                <div>
                  <SubHeading>Keyboard Navigation</SubHeading>
                  <div className="space-y-2">
                    {spec.accessibility.keyboardNav.map((k, i) => (
                      <div key={i} className="text-[13.5px] text-gray-700">{k}</div>
                    ))}
                  </div>
                </div>
              )}
              {spec.accessibility.focusManagement && (
                <div>
                  <SubHeading>Focus Management</SubHeading>
                  <div className="text-[13.5px] text-gray-700">{spec.accessibility.focusManagement}</div>
                </div>
              )}
              {spec.accessibility.screenReaderNotes && (
                <div className="col-span-2">
                  <SubHeading>Screen Reader</SubHeading>
                  <div className="text-[13.5px] text-gray-600">{spec.accessibility.screenReaderNotes}</div>
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* ── Hardcoded Data ── */}
        {spec.hardcodedData && spec.hardcodedData.length > 0 && (
          <section className="mb-14">
            <SectionHeading count={spec.hardcodedData.length}>Hardcoded Data</SectionHeading>
            <div className="grid gap-2.5">
              {spec.hardcodedData.map((h, i) => (
                <Card key={i} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-[0.06em]">
                    <span>Current</span>
                    <span className="text-gray-300">→</span>
                    <span>Replace with</span>
                  </div>
                  <div className="flex items-baseline gap-3 mb-2">
                    <code className="font-mono text-red-600 text-[12.5px] line-through decoration-red-300">{h.current}</code>
                    <span className="text-gray-300 text-[14px]">→</span>
                    <code className="font-mono text-emerald-600 text-[12.5px]">{h.replaceWith}</code>
                  </div>
                  <div className="text-[12px] text-gray-400 font-mono">{h.location}</div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ── Implementation Tasks ── */}
        <section className="mb-14">
          <SectionHeading count={spec.tasks.length}>Implementation Tasks</SectionHeading>
          <div className="grid gap-3">
            {spec.tasks.map((task, taskIndex) => {
              const priorityTone = task.priority === 'P0' ? 'red' : task.priority === 'P1' ? 'amber' : 'neutral';
              const accentColor = task.priority === 'P0'
                ? '#ef4444'
                : task.priority === 'P1'
                  ? '#f59e0b'
                  : '#d1d5db';

              return (
                <Card key={task.id} className="overflow-hidden" style={{ borderLeftWidth: '3px', borderLeftColor: accentColor }}>
                  <div className="px-5 py-5">
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-gray-100 text-[11px] font-bold text-gray-500 shrink-0 tabular-nums">
                        {taskIndex + 1}
                      </span>
                      <span className="font-bold text-gray-900 text-[15px] tracking-[-0.01em]">{task.title}</span>
                      <Tag tone={priorityTone}>{task.priority}</Tag>
                      <Tag>{task.estimate}</Tag>
                      <code className="ml-auto font-mono text-[11px] text-gray-400">{task.id}</code>
                    </div>
                    <p className="text-[14px] text-gray-600 mb-4 leading-relaxed ml-[34px]">{task.description}</p>

                    {task.files && task.files.length > 0 && (
                      <div className="mb-4 ml-[34px] flex flex-wrap gap-1.5">
                        {task.files.map((f, fi) => (
                          <code key={fi} className="font-mono text-[11.5px] text-gray-500 bg-gray-100 px-2.5 py-[3px] rounded-md border border-gray-200/60">
                            {f.path}
                          </code>
                        ))}
                      </div>
                    )}

                    <div className="ml-[34px]">
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.06em] mb-3">Acceptance Criteria</div>
                      <div className="space-y-3">
                        {task.acceptanceCriteria.map((ac, ai) => (
                          <div key={ai} className="flex items-start gap-3 text-[13.5px]">
                            <Checkbox />
                            <span className="text-gray-700 leading-snug">{ac}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* ── Notes ── */}
        {spec.notes && spec.notes.length > 0 && (
          <section className="mb-14">
            <SectionHeading count={spec.notes.length}>Notes</SectionHeading>
            <div className="space-y-2.5">
              {spec.notes.map((note, i) => (
                <div key={i} className="text-[14px] text-gray-600 pl-4 border-l-[3px] border-blue-300 py-1.5 leading-relaxed">
                  {note}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default SpecDocs;
