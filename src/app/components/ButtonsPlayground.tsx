import { useState } from 'react';
import { Eye, Radio, ShieldAlert, Zap, Crosshair, Ban, CheckCircle2, AlertTriangle, Trash2, Send } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { ActionButton } from '@/primitives/ActionButton';
import { SplitActionButton } from '@/primitives/SplitActionButton';
import { NewUpdatesPill } from '@/primitives/NewUpdatesPill';
import { TooltipProvider } from '@/app/components/ui/tooltip';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="text-[11px] text-zinc-500 font-mono">{label}</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export default function ButtonsPlayground() {
  const [loading, setLoading] = useState<string | null>(null);

  const simulateLoading = (id: string) => {
    setLoading(id);
    setTimeout(() => setLoading(null), 2000);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#0e0e0e] text-white p-8 font-sans">
        <div className="mx-auto max-w-[400px] space-y-12">
          <div>
            <h1 className="text-lg font-bold text-white">Button Playground</h1>
            <p className="text-sm text-zinc-500 mt-1">כל סוגי הכפתורים במקום אחד</p>
          </div>

          {/* ── Base shadcn Button variants ── */}
          <Section title="Base Button (shadcn)">
            <Row label="variant">
              <Button variant="default">default</Button>
              <Button variant="outline">outline</Button>
              <Button variant="secondary">secondary</Button>
              <Button variant="destructive">destructive</Button>
              <Button variant="ghost">ghost</Button>
              <Button variant="link">link</Button>
            </Row>
            <Row label="size">
              <Button variant="outline" size="sm">sm</Button>
              <Button variant="outline" size="default">default</Button>
              <Button variant="outline" size="lg">lg</Button>
              <Button variant="outline" size="icon"><Eye size={16} /></Button>
            </Row>
            <Row label="disabled">
              <Button variant="default" disabled>default</Button>
              <Button variant="outline" disabled>outline</Button>
              <Button variant="destructive" disabled>destructive</Button>
            </Row>
          </Section>

          {/* ── ActionButton variants ── */}
          <Section title="ActionButton">
            <Row label="variant × size=sm">
              <ActionButton label="הפנה מצלמה" icon={Eye} variant="fill" size="sm" />
              <ActionButton label="ביטול" icon={Ban} variant="ghost" size="sm" />
              <ActionButton label="מחק" icon={Trash2} variant="danger" size="sm" />
              <ActionButton label="אזהרה" icon={AlertTriangle} variant="warning" size="sm" />
            </Row>
            <Row label="variant × size=md">
              <ActionButton label="הפנה מצלמה" icon={Eye} variant="fill" size="md" />
              <ActionButton label="ביטול" icon={Ban} variant="ghost" size="md" />
              <ActionButton label="מחק" icon={Trash2} variant="danger" size="md" />
              <ActionButton label="אזהרה" icon={AlertTriangle} variant="warning" size="md" />
            </Row>
            <Row label="variant × size=lg">
              <ActionButton label="הפנה מצלמה" icon={Eye} variant="fill" size="lg" />
              <ActionButton label="ביטול" icon={Ban} variant="ghost" size="lg" />
              <ActionButton label="מחק" icon={Trash2} variant="danger" size="lg" />
              <ActionButton label="אזהרה" icon={AlertTriangle} variant="warning" size="lg" />
            </Row>
            <Row label="no icon">
              <ActionButton label="fill" variant="fill" size="sm" />
              <ActionButton label="ghost" variant="ghost" size="sm" />
              <ActionButton label="danger" variant="danger" size="sm" />
              <ActionButton label="warning" variant="warning" size="sm" />
            </Row>
            <Row label="disabled">
              <ActionButton label="fill" icon={Eye} variant="fill" size="sm" disabled />
              <ActionButton label="danger" icon={Trash2} variant="danger" size="sm" disabled />
            </Row>
            <Row label="loading">
              <ActionButton label="שולח..." icon={Send} variant="fill" size="sm" loading={loading === 'ab-fill'} onClick={() => simulateLoading('ab-fill')} />
              <ActionButton label="מוחק..." icon={Trash2} variant="danger" size="sm" loading={loading === 'ab-danger'} onClick={() => simulateLoading('ab-danger')} />
            </Row>
          </Section>

          {/* ── SplitActionButton ── */}
          <Section title="SplitActionButton">
            <Row label="variant × size=sm">
              <div className="w-48">
                <SplitActionButton
                  label="שיגור" icon={Zap} variant="fill" size="sm"
                  onClick={() => {}} dropdownItems={[
                    { id: '1', label: 'אפשרות א׳', icon: Radio, onClick: () => {} },
                    { id: '2', label: 'אפשרות ב׳', icon: Crosshair, onClick: () => {} },
                  ]}
                />
              </div>
              <div className="w-48">
                <SplitActionButton
                  label="מחק" icon={Trash2} variant="danger" size="sm"
                  onClick={() => {}} dropdownItems={[
                    { id: '1', label: 'מחק לצמיתות', icon: Trash2, onClick: () => {} },
                  ]}
                />
              </div>
              <div className="w-48">
                <SplitActionButton
                  label="אזהרה" icon={AlertTriangle} variant="warning" size="sm"
                  onClick={() => {}} dropdownItems={[
                    { id: '1', label: 'פעולה', onClick: () => {} },
                  ]}
                />
              </div>
            </Row>
            <Row label="size=md">
              <div className="w-52">
                <SplitActionButton
                  label="שיגור" icon={Zap} variant="fill" size="md"
                  onClick={() => {}} dropdownItems={[
                    { id: '1', label: 'אפשרות א׳', onClick: () => {} },
                  ]}
                />
              </div>
            </Row>
            <Row label="size=lg">
              <div className="w-56">
                <SplitActionButton
                  label="שיגור" icon={Zap} variant="fill" size="lg"
                  onClick={() => {}} dropdownItems={[
                    { id: '1', label: 'אפשרות א׳', onClick: () => {} },
                  ]}
                />
              </div>
            </Row>
            <Row label="disabled">
              <div className="w-48">
                <SplitActionButton
                  label="שיגור" icon={Zap} variant="fill" size="sm" disabled
                  onClick={() => {}} dropdownItems={[
                    { id: '1', label: 'אפשרות א׳', onClick: () => {} },
                  ]}
                />
              </div>
            </Row>
            <Row label="loading">
              <div className="w-48">
                <SplitActionButton
                  label="שולח..." icon={Zap} variant="fill" size="sm"
                  loading={loading === 'split-fill'}
                  onClick={() => simulateLoading('split-fill')}
                  dropdownItems={[
                    { id: '1', label: 'אפשרות א׳', onClick: () => {} },
                  ]}
                />
              </div>
            </Row>
          </Section>

          {/* ── NewUpdatesPill ── */}
          <Section title="NewUpdatesPill">
            <Row label="counts">
              <NewUpdatesPill count={1} onClick={() => {}} />
              <NewUpdatesPill count={5} onClick={() => {}} />
              <NewUpdatesPill count={42} onClick={() => {}} />
              <NewUpdatesPill count={147} onClick={() => {}} />
            </Row>
          </Section>

          {/* ── Closure buttons ── */}
          <Section title="Closure Outcome Buttons">
            <Row label="ghost outcomes">
              <Button
                variant="ghost"
                className="h-auto min-h-0 justify-start px-2.5 py-2 rounded text-zinc-300 text-[11px] font-medium gap-1.5 active:scale-[0.98] hover:bg-white/[0.08]"
              >
                <CheckCircle2 size={12} className="shrink-0 text-zinc-500" />
                ציפור — סגור
              </Button>
              <Button
                variant="ghost"
                className="h-auto min-h-0 justify-start px-2.5 py-2 rounded text-zinc-300 text-[11px] font-medium gap-1.5 active:scale-[0.98] hover:bg-white/[0.08]"
              >
                <ShieldAlert size={12} className="shrink-0 text-zinc-500" />
                איום אמיתי
              </Button>
            </Row>
          </Section>

          {/* ── Side-by-side in card context ── */}
          <Section title="Card Context (simulated)">
            <div className="rounded-lg bg-[#1a1a1a] p-3 space-y-2 max-w-xs">
              <div className="grid gap-1.5">
                <ActionButton label="הפנה מצלמה" icon={Eye} variant="fill" size="sm" className="w-full" />
                <ActionButton label="שגר יירוט" icon={Zap} variant="fill" size="sm" className="w-full" />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <ActionButton label="מחק" icon={Trash2} variant="danger" size="sm" className="w-full" />
                <ActionButton label="ביטול" icon={Ban} variant="ghost" size="sm" className="w-full" />
              </div>
            </div>
          </Section>
        </div>
      </div>
    </TooltipProvider>
  );
}
