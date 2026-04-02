import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ArrowLeft, Eye, X, Zap, Crosshair, Radar, Hand } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/shared/components/ui/sonner';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import {
  CARD_TOKENS, ELEVATION,
  StatusChip,
  SplitActionButton,
  AccordionSection,
  TargetCard, CardHeader, CardActions, CardDetails, CardSensors, CardMedia, CardLog, CardClosure,
  CardFooterDock,
  type FooterDockAction, type CardAction,
} from '@/primitives';
import { JamWaveIcon } from '@/primitives/MapIcons';
import { useCardSlots, type CardCallbacks, type CardContext } from '@/imports/useCardSlots';
import { cuas_classified } from '@/test-utils/mockDetections';
import type { RegulusEffector } from '@/imports/ListOfSystems';

const noop = () => {};

const noopCallbacks: CardCallbacks = {
  onVerify: noop, onEngage: noop, onDismiss: noop, onCancelMission: noop,
  onPointCamera: noop, onSendDroneVerification: noop, onSensorHover: noop,
  onCompleteMission: noop, onMissionPause: noop, onMissionResume: noop,
  onMissionOverride: noop, onMissionCancel: noop, onMitigate: noop,
  onMitigateAll: noop, onEffectorSelect: noop, onBdaOutcome: noop,
  onSensorFocus: noop,
};

const effectors: RegulusEffector[] = [
  { id: 'eff-1', name: 'Regulus-1', lat: 32.09, lon: 34.78, coverageRadiusM: 5000, status: 'available' },
];

interface EffectorCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  badge: string;
  variant: 'danger' | 'warning' | 'fill';
}

const CATEGORIES: EffectorCategory[] = [
  { id: 'jam', label: 'שיבוש', icon: JamWaveIcon, badge: 'Regulus-1', variant: 'danger' },
  { id: 'weapon', label: 'כלי נשק', icon: Crosshair, badge: 'Launcher-2', variant: 'warning' },
  { id: 'laser', label: 'לייזר', icon: Zap, badge: 'Laser-3', variant: 'fill' },
];

export default function MapIconsPlayground() {
  const [activeCategory, setActiveCategory] = useState('jam');
  const [cardOpen, setCardOpen] = useState(true);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const handleActivate = (catId: string) => {
    setActivatingId(catId);
    setTimeout(() => {
      setActivatingId(null);
      setCompletedIds(prev => new Set(prev).add(catId));
      toast.success(`${CATEGORIES.find(c => c.id === catId)?.label} הופעל`);
    }, 2000);
  };

  const handleReset = () => {
    setCompletedIds(new Set());
    setActivatingId(null);
    setActiveCategory('jam');
  };

  const ctx: CardContext = { regulusEffectors: effectors };
  const slots = useCardSlots(cuas_classified, noopCallbacks, ctx);
  const isSuccess = cuas_classified.status === 'event_resolved' || cuas_classified.status === 'event_neutralized';
  const isExpired = cuas_classified.status === 'expired';
  const showDetails = !isSuccess && !isExpired && cuas_classified.flowType !== 4;

  const effectorActions = slots.actions.filter(
    (a: CardAction) => a.group === 'effector' || a.dropdownActions != null || a.effectorStatusStrip != null,
  );
  const investigationActions: FooterDockAction[] = slots.actions
    .filter((a: CardAction) => a.group === 'investigation')
    .map(a => ({ id: a.id, label: a.label, icon: a.icon, onClick: a.onClick, disabled: a.disabled, loading: a.loading }));

  return (
    <TooltipProvider>
      <div dir="rtl" className="h-screen flex flex-col text-white font-sans bg-[#0a0a0a]">
        <header className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.06] shrink-0">
          <Link to="/" className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={14} />
            חזרה
          </Link>
          <div className="w-px h-4 bg-white/10" />
          <h1 className="text-sm font-semibold text-zinc-200">
            Effector Accordion
          </h1>
          <button
            type="button"
            onClick={handleReset}
            className="mr-auto text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08]"
          >
            איפוס
          </button>
        </header>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-sm">
            <TargetCard
              accent={slots.accent}
              completed={slots.completed}
              open={cardOpen}
              onToggle={() => setCardOpen(!cardOpen)}
              header={
                <CardHeader
                  {...slots.header}
                  status={<StatusChip color="red" label="זוהה" />}
                  open={cardOpen}
                />
              }
              footer={investigationActions.length > 0 ? <CardFooterDock actions={investigationActions} /> : undefined}
            >
              {slots.closureType && (
                <div className="px-2 pt-1.5 flex items-center gap-1">
                  {slots.closureType === 'manual' ? (
                    <div className="flex items-center gap-1 text-[9px] text-zinc-500">
                      <Hand size={10} className="text-zinc-500" aria-hidden="true" />
                      <span>סגירה ידנית</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[9px] text-zinc-500">
                      <Zap size={10} className="text-zinc-500" aria-hidden="true" />
                      <span>סגירה אוטומטית</span>
                    </div>
                  )}
                </div>
              )}

              {slots.media && <CardMedia {...slots.media} />}

              {effectorActions.length > 0 && (
                <div className="px-2 py-2">
                  <AccordionPrimitive.Root
                    type="single"
                    dir="rtl"
                    value={activeCategory}
                    onValueChange={(val) => { if (val) setActiveCategory(val); }}
                  >
                    {CATEGORIES.map((cat) => {
                      const isActive = cat.id === activeCategory;
                      const isCompleted = completedIds.has(cat.id);
                      const isLoading = activatingId === cat.id;
                      const Icon = cat.icon;

                      return (
                        <AccordionPrimitive.Item key={cat.id} value={cat.id}>
                          <AccordionPrimitive.Header asChild>
                            <div>
                              <AccordionPrimitive.Trigger
                                className={`
                                  flex w-full items-center gap-2.5 px-1.5 py-2 rounded-md cursor-pointer
                                  transition-[background-color] duration-150 ease-out
                                  ${isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'}
                                `}
                              >
                                <span
                                  className={`
                                    size-3.5 rounded-full border-[1.5px] shrink-0 flex items-center justify-center
                                    transition-[border-color] duration-150 ease-out
                                    ${isActive ? 'border-zinc-400' : 'border-zinc-600'}
                                  `}
                                >
                                  <span
                                    className={`
                                      size-1.5 rounded-full bg-zinc-200
                                      transition-[transform,opacity] duration-150 ease-out
                                      ${isActive ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}
                                    `}
                                  />
                                </span>

                                <div className="flex items-center gap-1.5 text-zinc-500" style={isActive ? { color: '#d4d4d8' } : undefined}>
                                  <Icon size={13} aria-hidden="true" />
                                </div>

                                <span className={`text-xs flex-1 text-start ${isActive ? 'font-medium text-zinc-200' : 'text-zinc-500'}`}>
                                  {cat.label}
                                </span>

                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                                  style={{
                                    backgroundColor: isActive ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                                    color: isActive ? '#a1a1aa' : '#52525b',
                                    border: `1px solid ${isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
                                  }}
                                >
                                  {cat.badge}
                                </span>
                              </AccordionPrimitive.Trigger>
                            </div>
                          </AccordionPrimitive.Header>

                          <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                            <div className="pt-1.5 pb-1 pl-0">
                              <SplitActionButton
                                label={isCompleted ? `${cat.label} הושלם` : isLoading ? `${cat.label} פעיל...` : cat.label}
                                badge={cat.badge}
                                icon={cat.icon}
                                variant={cat.variant}
                                size="sm"
                                loading={isLoading}
                                disabled={isCompleted || isLoading}
                                dimDisabledShell={!isCompleted}
                                onClick={() => handleActivate(cat.id)}
                                dropdownItems={[
                                  { id: `${cat.id}-mode1`, label: 'שיבוש ממוקד', onClick: () => toast(`${cat.label} ממוקד`) },
                                  { id: `${cat.id}-mode2`, label: 'שיבוש רחב', onClick: () => toast(`${cat.label} רחב`) },
                                ]}
                              />
                            </div>
                          </AccordionPrimitive.Content>
                        </AccordionPrimitive.Item>
                      );
                    })}
                  </AccordionPrimitive.Root>
                </div>
              )}

              {showDetails && (
                <CardDetails rows={slots.details.rows} classification={slots.details.classification} />
              )}

              {slots.sensors.length > 0 && (
                <AccordionSection title={`חיישנים (${slots.sensors.length})`} icon={Radar}>
                  <div className="px-0 pb-2 w-full pt-2">
                    <CardSensors sensors={slots.sensors} label="" onSensorHover={noop} />
                  </div>
                </AccordionSection>
              )}

              {slots.log.length > 0 && <CardLog entries={slots.log} />}

              {slots.closure && (
                <CardClosure outcomes={slots.closure.outcomes} onSelect={slots.closure.onSelect} />
              )}
            </TargetCard>
          </div>
        </div>

        <Toaster position="bottom-center" />
      </div>
    </TooltipProvider>
  );
}
