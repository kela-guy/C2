/**
 * `/status-sandbox` — DEV-only design exploration.
 *
 * Compares the two finalist directions for communicating entity status
 * (online / warning-error / offline) side by side, each rendered twice:
 * as an asset-panel row and as a map marker over a faux map tile. One
 * simulated entity set (see `statusSim.ts`) drives both columns so the
 * same scenario reads identically across designs.
 *
 * Problem being explored: today "healthy" renders as silence, so an
 * operator in the field cannot distinguish "everything works" from
 * "the system isn't telling me anything" — but a naive green dot is
 * noisy and collides with tactical color discipline.
 *
 * Guarded by `import.meta.env.DEV` in {@link import('@/app/App')} so it
 * tree-shakes out of production bundles. Reviewers open the route
 * directly; nothing links here from the main UI.
 */

import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Pause, Play } from '@/lib/icons/central';
import { cn } from '@/shared/components/ui/utils';
import {
  SIM_HEALTHS,
  useStatusSim,
  type SimHealth,
  type StatusSim,
} from './statusSim';
import { STATUS_DIRECTIONS, type DirectionCtx, type StatusDirection } from './directions';
import type { SimEntity } from './statusSim';

// ---------------------------------------------------------------------------
// Research brief — the principles each direction is grounded in.
// ---------------------------------------------------------------------------

const RESEARCH_NOTES: Array<{ title: string; body: string }> = [
  {
    title: 'Never color alone',
    body: 'MIL-STD-2525 encodes status redundantly — solid vs dashed frames, texture, badges — so status survives sunlight, monochrome displays, and color-blindness. Test every design with the grayscale toggle.',
  },
  {
    title: 'Color discipline',
    body: 'On a tactical map red and green carry affiliation meaning. A per-entity status color that reuses them slows down the fastest read on the screen: who is hostile.',
  },
  {
    title: 'Liveness beats a green dot',
    body: '"Working" is best proven by recency of data (heartbeat, last-seen), not a static indicator — a green dot can itself be stale. Use the mute button to see each design handle a silent failure.',
  },
];

const HEALTH_BUTTON_LABELS: Record<SimHealth, string> = {
  ok: 'OK',
  warning: 'WRN',
  error: 'ERR',
  offline: 'OFF',
};

const HEALTH_BUTTON_ACTIVE: Record<SimHealth, string> = {
  ok: 'bg-white/15 text-white',
  warning: 'bg-accent-warning-tint text-accent-warning-text',
  error: 'bg-accent-danger-tint text-accent-danger-text',
  offline: 'bg-white/10 text-white/60',
};

// ---------------------------------------------------------------------------
// Glance test
// ---------------------------------------------------------------------------

interface GlanceState {
  entityName: string;
  health: SimHealth;
  phase: 'showing' | 'covered' | 'revealed';
}

const GLANCE_FAULTS: SimHealth[] = ['warning', 'error', 'offline'];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StatusSandbox() {
  const [highDensity, setHighDensity] = useState(false);
  const [grayscale, setGrayscale] = useState(false);
  const sim = useStatusSim(highDensity);
  const [glance, setGlance] = useState<GlanceState | null>(null);

  const startGlanceTest = useCallback(() => {
    if (sim.timeline.playing) sim.timeline.toggle();
    sim.setAllHealth('ok');
    const target = sim.controllable[Math.floor(Math.random() * sim.controllable.length)];
    const health = GLANCE_FAULTS[Math.floor(Math.random() * GLANCE_FAULTS.length)];
    sim.setHealth(target.id, health);
    setGlance({ entityName: target.name, health, phase: 'showing' });
  }, [sim]);

  const endGlanceTest = useCallback(() => {
    sim.setAllHealth('ok');
    setGlance(null);
  }, [sim]);

  useEffect(() => {
    if (glance?.phase !== 'showing') return;
    const t = setTimeout(
      () => setGlance((g) => (g ? { ...g, phase: 'covered' } : g)),
      2000,
    );
    return () => clearTimeout(t);
  }, [glance?.phase]);

  return (
    <div dir="ltr" className="relative h-screen w-screen overflow-hidden bg-[#0b0b0d] font-sans text-white">
      {/* Faux map backdrop so panels + markers read in context. */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 20%, rgba(56,189,248,0.08), transparent 45%), radial-gradient(circle at 70% 70%, rgba(248,113,113,0.06), transparent 40%), linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 100% 100%, 40px 40px, 40px 40px',
        }}
        aria-hidden="true"
      />

      <div className="relative flex h-full">
        <ControlsAside
          sim={sim}
          highDensity={highDensity}
          onHighDensityChange={setHighDensity}
          grayscale={grayscale}
          onGrayscaleChange={setGrayscale}
          onGlanceTest={startGlanceTest}
          glanceActive={glance != null}
        />

        <main className="relative flex-1 overflow-auto">
          {glance?.phase === 'revealed' && (
            <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-[#141118]/95 px-6 py-2 backdrop-blur">
              <span className="text-xs text-white/80">
                It was <span className="font-semibold text-white">{glance.entityName}</span> —{' '}
                <span className="font-semibold">{glance.health}</span>. Which design made that
                readable in two seconds?
              </span>
              <button
                type="button"
                onClick={endGlanceTest}
                className="rounded-[4px] border border-white/15 bg-white/[0.06] px-2 py-1 text-2xs font-medium text-white/80 transition-colors hover:bg-white/10"
              >
                End test
              </button>
            </div>
          )}

          <div
            className="flex min-w-max gap-5 p-6"
            style={grayscale ? { filter: 'grayscale(1)' } : undefined}
          >
            {STATUS_DIRECTIONS.map((direction) => (
              <DirectionColumn
                key={direction.id}
                direction={direction}
                entities={sim.entities}
                now={sim.now}
              />
            ))}
          </div>

        </main>
      </div>

      {/* Full-page cover so the aside's state buttons can't leak the answer. */}
      {glance?.phase === 'covered' && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-[#0b0b0d]/[0.985]">
          <div className="text-sm font-medium text-white/90">
            Which asset was in trouble — and how bad was it?
          </div>
          <div className="max-w-sm text-center text-xs text-white/50">
            You saw both designs for two seconds. If you can answer from one design but not the
            other, that difference is the finding.
          </div>
          <button
            type="button"
            onClick={() => setGlance((g) => (g ? { ...g, phase: 'revealed' } : g))}
            className="rounded-[4px] border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/15"
          >
            Reveal
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aside — research brief + simulator controls
// ---------------------------------------------------------------------------

function ControlsAside({
  sim,
  highDensity,
  onHighDensityChange,
  grayscale,
  onGrayscaleChange,
  onGlanceTest,
  glanceActive,
}: {
  sim: StatusSim;
  highDensity: boolean;
  onHighDensityChange: (v: boolean) => void;
  grayscale: boolean;
  onGrayscaleChange: (v: boolean) => void;
  onGlanceTest: () => void;
  glanceActive: boolean;
}) {
  return (
    <aside className="flex w-[330px] shrink-0 flex-col gap-5 overflow-y-auto border-e border-white/10 bg-[#0e0e11]/90 px-5 py-5 backdrop-blur">
      <div>
        <Link
          to="/"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-white/60 transition-colors hover:text-white"
        >
          <ChevronLeft size={14} />
          Back to dashboard
        </Link>
        <h1 className="text-base font-semibold text-white">Entity Status Exploration</h1>
        <p className="mt-1.5 text-xs leading-relaxed text-white/55">
          Today a healthy asset renders as <em>silence</em>, so operators can&apos;t tell
          &quot;everything works&quot; from &quot;nothing is being reported&quot;. Two finalist
          directions, each shown on the panel row and the map marker.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <SectionLabel>Research grounding</SectionLabel>
        {RESEARCH_NOTES.map((note) => (
          <div key={note.title} className="rounded-[6px] border border-white/[0.08] bg-white/[0.03] px-2.5 py-2">
            <div className="text-2xs font-semibold uppercase tracking-wide text-white/70">
              {note.title}
            </div>
            <p className="mt-0.5 text-2xs leading-relaxed text-white/45">{note.body}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-1.5">
        <SectionLabel>Scenario — force entity states</SectionLabel>
        <p className="text-2xs leading-relaxed text-white/40">
          The pause button mutes an entity&apos;s reports <em>without</em> changing its declared
          health — the silent-failure case only recency-based designs catch.
        </p>
        {sim.controllable.map((entity) => (
          <EntityControlRow key={entity.id} entity={entity} sim={sim} />
        ))}
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => sim.setAllHealth('ok')}
            className="rounded-[4px] border border-white/15 bg-white/[0.06] px-2 py-1 text-2xs font-medium text-white/80 transition-colors hover:bg-white/10"
          >
            All OK
          </button>
          <button
            type="button"
            onClick={sim.timeline.toggle}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-1 text-2xs font-medium transition-colors',
              sim.timeline.playing
                ? 'border-white/25 bg-white/15 text-white'
                : 'border-white/15 bg-white/[0.06] text-white/80 hover:bg-white/10',
            )}
          >
            {sim.timeline.playing ? <Pause size={11} /> : <Play size={11} />}
            Degradation timeline
          </button>
        </div>
        {sim.timeline.playing && sim.timeline.stepLabel && (
          <div className="rounded-[4px] bg-white/[0.05] px-2 py-1.5 text-2xs text-white/60">
            <span className="font-semibold text-white/80">North Camera:</span>{' '}
            {sim.timeline.stepLabel}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-1.5">
        <SectionLabel>Stress tests</SectionLabel>
        <ToggleRow
          label="Grayscale (color-blind / sunlight)"
          checked={grayscale}
          onChange={onGrayscaleChange}
        />
        <ToggleRow
          label={`High density (${highDensity ? 24 : 6} entities)`}
          checked={highDensity}
          onChange={onHighDensityChange}
        />
        <button
          type="button"
          onClick={onGlanceTest}
          disabled={glanceActive}
          className="mt-1 rounded-[4px] border border-white/15 bg-white/[0.06] px-2 py-1.5 text-2xs font-medium text-white/80 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Run glance test — 2s flash, then recall
        </button>
      </section>
    </aside>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-2xs font-semibold uppercase tracking-[0.08em] text-white/35">
      {children}
    </div>
  );
}

function EntityControlRow({ entity, sim }: { entity: SimEntity; sim: StatusSim }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="min-w-0 flex-1 truncate text-2xs text-white/70">{entity.name}</span>
      <div className="flex items-center gap-0.5 rounded-[4px] border border-white/10 bg-white/[0.03] p-0.5">
        {SIM_HEALTHS.map((health) => (
          <button
            key={health}
            type="button"
            onClick={() => sim.setHealth(entity.id, health)}
            className={cn(
              'rounded-[3px] px-1 py-0.5 text-[9px] font-semibold leading-none transition-colors',
              entity.health === health
                ? HEALTH_BUTTON_ACTIVE[health]
                : 'text-white/35 hover:text-white/70',
            )}
          >
            {HEALTH_BUTTON_LABELS[health]}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => sim.toggleMuted(entity.id)}
        title={entity.muted ? 'Resume reports' : 'Pause reports (goes stale, health unchanged)'}
        className={cn(
          'flex size-5 items-center justify-center rounded-[3px] border transition-colors',
          entity.muted
            ? 'border-accent-warning/50 bg-accent-warning-tint text-accent-warning-text'
            : 'border-white/10 bg-white/[0.03] text-white/45 hover:text-white/80',
        )}
      >
        {entity.muted ? <Play size={10} /> : <Pause size={10} />}
      </button>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-2 rounded-[4px] border border-white/10 bg-white/[0.03] px-2 py-1.5 text-start transition-colors hover:bg-white/[0.06]"
    >
      <span className="text-2xs text-white/70">{label}</span>
      <span
        className={cn(
          'relative h-3.5 w-6 shrink-0 rounded-full transition-colors',
          checked ? 'bg-white/60' : 'bg-white/15',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-2.5 rounded-full bg-[#0b0b0d] transition-all',
            checked ? 'start-3' : 'start-0.5',
          )}
        />
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Direction column — map tile + panel mock for one design
// ---------------------------------------------------------------------------

function DirectionColumn({
  direction,
  entities,
  now,
}: {
  direction: StatusDirection;
  entities: SimEntity[];
  now: number;
}) {
  // The real DeviceRow is collapsible — each column owns its expanded row so
  // reviewers can open the full card (details grid + action bar) per design.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toggleExpanded = useCallback(
    (id: string) => setExpandedId((cur) => (cur === id ? null : id)),
    [],
  );
  const ctx: DirectionCtx = { now, expandedId, toggleExpanded };

  return (
    <section className="flex w-[420px] shrink-0 flex-col gap-3">
      <header>
        <h2 className="text-sm font-semibold text-white/90">{direction.title}</h2>
        <p className="mt-0.5 text-2xs leading-relaxed text-white/45">{direction.principle}</p>
      </header>

      {/* Map tile — the markers' resting ring is near-black (#1e2124, slate-3),
          so the tile sits ~2 slate steps lighter to stand in for the bright
          satellite imagery the ring normally renders over. */}
      <div
        className="relative h-[240px] overflow-hidden rounded-[8px] border border-white/10 bg-[#33373d]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      >
        {entities.map((entity) => (
          <div
            key={entity.id}
            className="absolute"
            style={{
              left: `${entity.x * 100}%`,
              top: `${entity.y * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {direction.renderMarker(entity, ctx)}
          </div>
        ))}
      </div>

      {/* Asset panel — the REAL DeviceRow, full chrome. Rows expand. */}
      <div className="overflow-hidden rounded-[8px] border border-white/10 bg-[#111114]">
        <div className="border-b border-white/[0.08] px-4 py-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-white/35">
          Assets
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {entities.map((entity) => (
            <Fragment key={entity.id}>{direction.renderRow(entity, ctx)}</Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
