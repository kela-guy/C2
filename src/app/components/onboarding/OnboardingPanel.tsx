/**
 * Step rail for the onboarding flow, docked on the inline-end edge (reuses
 * DockedPanel — same shell as Flow Builder / Simulations). Holds the step
 * copy, the selected-asset explainer, the gap list, the asset tray (refine
 * step), and the footer CTAs. The score lives in the HUD, not here.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { useStrings } from '@/lib/intl';
import { RotateCcwFilled, WarningTriangle } from '@/lib/icons/central';
import { Button } from '@/primitives/Button';
import { AppLoader } from '../ui/app-loader';
import { DockedPanel } from '../DockedPanel';
import { cn } from '../ui/utils';
import { AssetTray } from './AssetTray';
import { GapList } from './GapList';
import { SuggestionExplainPopover } from './SuggestionExplainPopover';
import {
  VISIBLE_STEPS,
  type CoverageResult,
  type OnboardingStep,
  type Placement,
  type ThreatZone,
} from './coverageModel';

function StepDots({ step }: { step: OnboardingStep }) {
  // `scanning` is transient and absent from VISIBLE_STEPS; while it's active,
  // keep the dot for the step it bridges to (`threats`) from lighting early.
  const idx = VISIBLE_STEPS.indexOf(step);
  const current = step === 'scanning' ? VISIBLE_STEPS.indexOf('welcome') : idx;
  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      {VISIBLE_STEPS.map((s, i) => (
        <span
          key={s}
          className={cn(
            'h-1 rounded-full transition-[width,background-color] duration-300 ease-out motion-reduce:transition-none',
            i === current ? 'w-4 bg-white' : i < current ? 'w-1.5 bg-white/50' : 'w-1.5 bg-white/15',
          )}
        />
      ))}
    </div>
  );
}

function ThreatFindings({ zones }: { zones: ThreatZone[] }) {
  const t = useStrings();
  const axisLabels = t.onboarding.axes;
  const axisFromZoneId = (id: string) => id.replace(/^zone-/, '');
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs-plus font-medium text-red-300">
        <WarningTriangle size={13} className="shrink-0" aria-hidden="true" />
        <span>{t.onboarding.threats.found(zones.length)}</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {zones.map((z) => {
          const key = axisFromZoneId(z.id) as keyof typeof axisLabels;
          const high = z.severity === 'high';
          return (
            <li
              key={z.id}
              className="flex items-center gap-2 rounded-md bg-white/[0.04] px-2.5 py-1.5 text-xs-plus text-slate-11"
            >
              <span
                className={cn(
                  'size-2 shrink-0 rounded-full',
                  high ? 'bg-red-500' : 'bg-amber-400',
                )}
                aria-hidden="true"
              />
              <span className="font-medium text-slate-11">{axisLabels[key] ?? key}</span>
              <span className="ms-auto text-slate-9">
                {high ? t.onboarding.threats.riskHigh : t.onboarding.threats.riskMedium}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export interface OnboardingPanelProps {
  open: boolean;
  step: OnboardingStep;
  result: CoverageResult;
  selected: Placement | null;
  canReset: boolean;
  threatZones: ThreatZone[];
  onNext: () => void;
  onBack: () => void;
  onReset: () => void;
  onSkipScan: () => void;
  onExitRequest: () => void;
  onFinish: () => void;
  onFocusGap: (lat: number, lon: number) => void;
  onRemove: (id: string) => void;
}

export function OnboardingPanel(props: OnboardingPanelProps) {
  const { open, step, result, selected, canReset, threatZones } = props;
  const t = useStrings();
  const prefersReducedMotion = useReducedMotion();
  const stepCopy = t.onboarding.steps[step];
  const isFirst = step === 'welcome';
  const isLast = step === 'summary';
  const isScanning = step === 'scanning';

  const primaryLabel = isFirst
    ? t.onboarding.cta.start
    : step === 'threats'
      ? t.onboarding.cta.showSetup
      : step === 'review'
        ? t.onboarding.cta.refine
        : step === 'refine'
          ? t.onboarding.cta.next
          : t.onboarding.cta.finish;

  const onPrimary = isLast ? props.onFinish : props.onNext;

  // Scanning offers only a quiet escape hatch — Skip is not a competing CTA.
  const footer = isScanning ? (
    <div className="flex items-center justify-end p-3">
      <Button label={t.onboarding.cta.scanSkip} variant="ghost" size="md" onClick={props.onSkipScan} />
    </div>
  ) : (
    <div className="flex items-center gap-2 p-3">
      {!isFirst && (
        <Button label={t.onboarding.cta.back} variant="ghost" size="md" onClick={props.onBack} />
      )}
      <Button
        label={primaryLabel}
        variant="fill"
        size="md"
        onClick={onPrimary}
        className="flex-1"
      />
    </div>
  );

  return (
    <DockedPanel
      open={open}
      onClose={props.onExitRequest}
      side="start"
      width={360}
      closeAriaLabel={t.onboarding.close}
      dataHandoff="onboarding-panel"
      title={
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold uppercase tracking-wider text-white">
            {t.onboarding.title}
          </div>
          <div className="truncate text-xs-plus text-slate-9">{t.onboarding.subtitle}</div>
        </div>
      }
      headerExtra={<StepDots step={step} />}
      footer={footer}
      bodyClassName="px-4 py-3.5 flex flex-col gap-4"
    >
      <motion.div
        key={step}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 8, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="flex flex-col gap-1.5"
      >
        <h2 className="text-sm font-semibold text-slate-12">{stepCopy.title}</h2>
        <p className="text-xs-plus leading-relaxed text-slate-10">{stepCopy.body}</p>
      </motion.div>

      {isScanning && (
        <div className="flex items-center gap-3 rounded-lg bg-white/[0.04] px-3 py-3">
          <AppLoader size={28} label={t.onboarding.scan.status} className="text-white/85" />
          <span className="text-xs-plus font-medium text-slate-11">{t.onboarding.scan.status}</span>
        </div>
      )}

      {step === 'threats' && threatZones.length > 0 && <ThreatFindings zones={threatZones} />}

      {selected && !isFirst && !isScanning && (
        <SuggestionExplainPopover placement={selected} onRemove={props.onRemove} />
      )}

      {step === 'refine' && (
        <>
          <AssetTray />
          {canReset && (
            <button
              type="button"
              onClick={props.onReset}
              className="inline-flex items-center gap-1.5 self-start rounded text-xs-plus font-medium text-slate-9 transition-colors hover:text-slate-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring"
            >
              <RotateCcwFilled size={12} aria-hidden="true" />
              {t.onboarding.cta.reset}
            </button>
          )}
        </>
      )}

      {(step === 'refine' || step === 'summary') && (
        <div className="border-t border-white/10 pt-3.5">
          <GapList gaps={result.gaps} onFocus={props.onFocusGap} />
        </div>
      )}
    </DockedPanel>
  );
}
