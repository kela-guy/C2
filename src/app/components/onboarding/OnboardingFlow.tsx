/**
 * OnboardingFlow — the state machine + composition for the auto-coverage lab.
 *
 * Owns placements, selection, step, and an undo snapshot. Coverage is scored
 * from a deferred copy of placements so dragging a marker stays smooth while
 * the score/gaps catch up a beat later (the "throttled live preview" from the
 * plan). Nothing auto-commits — the whole layout is a reversible draft (I7).
 */

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStrings } from '@/lib/intl';
import { bearingDegrees } from '@/app/lib/mapGeo';
import type { CesiumMapFlyTo, CesiumMapOrbit } from '@/primitives/CesiumMap';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { ASSET_VISUAL } from './assetCatalog';
import { OnboardingMap } from './OnboardingMap';
import { OnboardingPanel } from './OnboardingPanel';
import { ProtectionScoreHud } from './ProtectionScoreHud';
import { ScanOverlay } from './ScanOverlay';
import { useCoverageScore } from './useCoverageScore';
import {
  CAPABILITIES,
  ONBOARDING_STEPS,
  SITE,
  SITE_HERO_HEADING_DEG,
  THREAT_AXES,
  getThreatZones,
  type AssetKind,
  type OnboardingStep,
  type Placement,
} from './coverageModel';
import { getSuggestedPlacements, nextPlacementId } from './suggestLayout';

/** How long the scan animation holds before auto-advancing to the threats step. */
const SCAN_DURATION_MS = 2500;

/** Default oblique pitch for the cinematic on-field camera (negative looks down). */
const HERO_PITCH_DEG = -16;

interface FlowState {
  step: OnboardingStep;
  placements: Placement[];
  selectedId: string | null;
}

type FlowAction =
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'SELECT'; id: string | null }
  | { type: 'PLACE'; placement: Placement }
  | { type: 'MOVE'; id: string; lat: number; lon: number }
  | { type: 'REMOVE'; id: string }
  | { type: 'RESTORE'; placements: Placement[] };

function stepAt(step: OnboardingStep, delta: number): OnboardingStep {
  const i = ONBOARDING_STEPS.indexOf(step);
  const next = Math.min(ONBOARDING_STEPS.length - 1, Math.max(0, i + delta));
  return ONBOARDING_STEPS[next];
}

function reducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'NEXT':
      return { ...state, step: stepAt(state.step, 1), selectedId: null };
    case 'BACK': {
      // `scanning` is transient — stepping back never lands on it (and never
      // replays the scan). Going back from `threats` returns to `welcome`.
      let target = stepAt(state.step, -1);
      if (target === 'scanning') target = 'welcome';
      return { ...state, step: target, selectedId: null };
    }
    case 'SELECT':
      return { ...state, selectedId: action.id };
    case 'PLACE':
      return { ...state, placements: [...state.placements, action.placement], selectedId: action.placement.id };
    case 'MOVE':
      return {
        ...state,
        placements: state.placements.map((p) =>
          p.id === action.id ? { ...p, lat: action.lat, lon: action.lon } : p,
        ),
      };
    case 'REMOVE':
      return {
        ...state,
        placements: state.placements.filter((p) => p.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      };
    case 'RESTORE':
      return { ...state, placements: action.placements, selectedId: null };
    default:
      return state;
  }
}

function initState(): FlowState {
  return { step: 'welcome', placements: getSuggestedPlacements(), selectedId: null };
}

interface Snack {
  id: number;
  message: string;
  prev: Placement[];
}

export function OnboardingFlow() {
  const t = useStrings();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [state, dispatch] = useReducer(reducer, undefined, initState);
  const [flyTo, setFlyTo] = useState<CesiumMapFlyTo | null>(null);
  const [orbit, setOrbit] = useState<CesiumMapOrbit | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [snack, setSnack] = useState<Snack | null>(null);
  const snackSeq = useRef(0);

  const placementsRef = useRef(state.placements);
  placementsRef.current = state.placements;

  // Deferred scoring keeps marker dragging smooth; the HUD/gaps trail a beat.
  const deferredPlacements = useDeferredValue(state.placements);
  const result = useCoverageScore(deferredPlacements);

  const openAxisIds = result.openAxes.map((a) => a.id);
  const selected = state.placements.find((p) => p.id === state.selectedId) ?? null;
  const draggable = state.step === 'refine';

  // Progressive disclosure: every element appears only once it has a reason.
  //   welcome  — bare base, panel explains the scan.
  //   scanning — sweep animation only; no assets, no problems, no score.
  //   threats  — problem areas marked first (red wedges + risk markers), the "why".
  //   review   — Kela's suggested assets + score; coverage only for the tapped asset.
  //   refine   — gaps + still-open axes become actionable.
  //   summary  — clean; the payoff is a high score + an empty gap list.
  const showAssets =
    state.step === 'review' || state.step === 'refine' || state.step === 'summary';
  const showGaps = state.step === 'refine' || state.step === 'summary';
  const showOpenAxes = state.step === 'refine' || state.step === 'summary';
  const showHud = showAssets;

  // Threats step: mark every approach (nothing is covered yet) + sparse risk
  // markers. Otherwise wedges follow the still-open axes once gaps matter.
  const threatZones = useMemo(
    () => (state.step === 'threats' ? getThreatZones() : []),
    [state.step],
  );
  const axisIds =
    state.step === 'threats'
      ? THREAT_AXES.map((a) => a.id)
      : showOpenAxes
        ? openAxisIds
        : [];

  // Scanning is a transient beat — auto-advance to the threats reveal.
  useEffect(() => {
    if (state.step !== 'scanning') return;
    const handle = window.setTimeout(() => dispatch({ type: 'NEXT' }), SCAN_DURATION_MS);
    return () => window.clearTimeout(handle);
  }, [state.step]);

  // Per-step cinematic camera. Hero oblique on welcome; a slow orbit while we
  // "scan"; a higher oblique framing all approach volumes on the threats
  // reveal; a pull-back over the protection picture on review; back to the
  // hero for refine/summary (free navigation). The orbit prop is released
  // (null) on every non-scan step so free camera control resumes.
  useEffect(() => {
    const dur = prefersReducedMotion ? 0 : 2.0;
    // Heights are metres ABOVE GROUND (terrainRelative) so the view hugs the
    // field instead of floating at a sea-level altitude.
    const hero = (aglM: number, pitchDeg = HERO_PITCH_DEG): CesiumMapFlyTo => ({
      lat: SITE.lat,
      lon: SITE.lon,
      heightM: aglM,
      pitchDeg,
      headingDeg: SITE_HERO_HEADING_DEG,
      durationSec: dur,
      terrainRelative: true,
    });

    switch (state.step) {
      case 'scanning':
        setFlyTo(null);
        setOrbit({
          lat: SITE.lat,
          lon: SITE.lon,
          heightM: 200,
          pitchDeg: -18,
          periodSec: 34,
          terrainRelative: true,
        });
        break;
      case 'threats':
        // Lift just enough to read the approach corridors + volumes, still low.
        setOrbit(null);
        setFlyTo(hero(430, -24));
        break;
      case 'review':
        setOrbit(null);
        setFlyTo(hero(520, -26));
        break;
      case 'refine':
        setOrbit(null);
        setFlyTo(hero(320, -20));
        break;
      case 'summary':
        setOrbit(null);
        setFlyTo(hero(520, -26));
        break;
      case 'welcome':
      default:
        // Ground-hugging hero — feels like standing on the field.
        setOrbit(null);
        setFlyTo(hero(180, -14));
        break;
    }
  }, [state.step, prefersReducedMotion]);

  useEffect(() => {
    if (!snack) return;
    const handle = window.setTimeout(() => setSnack(null), 5000);
    return () => window.clearTimeout(handle);
  }, [snack]);

  const pushSnack = useCallback((message: string, prev: Placement[]) => {
    snackSeq.current += 1;
    setSnack({ id: snackSeq.current, message, prev });
  }, []);

  const handlePlace = useCallback(
    (kind: AssetKind, lat: number, lon: number) => {
      const cap = CAPABILITIES[kind];
      const bearingDeg =
        cap.detect && ASSET_VISUAL[kind].shape === 'cone'
          ? bearingDegrees(lat, lon, SITE.lat, SITE.lon)
          : undefined;
      const placement: Placement = {
        id: nextPlacementId(kind),
        kind,
        lat,
        lon,
        bearingDeg,
        source: 'user',
      };
      pushSnack(t.onboarding.toast.added(t.onboarding.assetKinds[kind]), placementsRef.current);
      dispatch({ type: 'PLACE', placement });
    },
    [pushSnack, t],
  );

  const handleMove = useCallback((id: string, lat: number, lon: number) => {
    dispatch({ type: 'MOVE', id, lat, lon });
  }, []);

  const handleRemove = useCallback(
    (id: string) => {
      pushSnack(t.onboarding.toast.removed, placementsRef.current);
      dispatch({ type: 'REMOVE', id });
    },
    [pushSnack, t],
  );

  const handleReset = useCallback(() => {
    pushSnack(t.onboarding.toast.reset, placementsRef.current);
    dispatch({ type: 'RESTORE', placements: getSuggestedPlacements() });
  }, [pushSnack, t]);

  const handleSelect = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT', id });
  }, []);

  const handleSkipScan = useCallback(() => dispatch({ type: 'NEXT' }), []);

  const handleFocusGap = useCallback(
    (lat: number, lon: number) => {
      // Dive obliquely toward the finding, looking outward along the axis from
      // the base so the threat reads against the terrain it's approaching.
      setOrbit(null);
      setFlyTo({
        lat,
        lon,
        heightM: 150,
        pitchDeg: -12,
        headingDeg: bearingDegrees(SITE.lat, SITE.lon, lat, lon),
        durationSec: prefersReducedMotion ? 0 : 1.4,
        terrainRelative: true,
      });
    },
    [prefersReducedMotion],
  );

  const handleUndo = useCallback(() => {
    if (!snack) return;
    dispatch({ type: 'RESTORE', placements: snack.prev });
    setSnack(null);
  }, [snack]);

  const canReset = state.placements.some((p) => p.source === 'user') || state.placements.length !== 11;

  return (
    <div className="relative h-full w-full">
      <OnboardingMap
        placements={showAssets ? state.placements : []}
        gaps={showGaps ? result.gaps : []}
        axisIds={axisIds}
        threatZones={threatZones}
        selectedId={state.selectedId}
        draggable={draggable}
        onSelect={handleSelect}
        onPlace={handlePlace}
        onMove={handleMove}
        flyTo={flyTo}
        orbit={orbit}
      />

      {state.step === 'scanning' && <ScanOverlay />}

      {showHud && (
        <div className="pointer-events-none absolute end-4 top-4 z-20">
          <div className="pointer-events-auto">
            <ProtectionScoreHud result={result} showOpenAxis={showOpenAxes} />
          </div>
        </div>
      )}

      <OnboardingPanel
        open
        step={state.step}
        result={result}
        selected={selected}
        canReset={canReset}
        threatZones={threatZones}
        onNext={() => dispatch({ type: 'NEXT' })}
        onBack={() => dispatch({ type: 'BACK' })}
        onReset={handleReset}
        onSkipScan={handleSkipScan}
        onExitRequest={() => setExitOpen(true)}
        onFinish={() => navigate('/')}
        onFocusGap={handleFocusGap}
        onRemove={handleRemove}
      />

      <AnimatePresence>
        {snack && (
          <motion.div
            key={snack.id}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute bottom-6 start-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-white/10 bg-slate-2/95 px-3.5 py-2 text-xs text-slate-11 shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-sm rtl:translate-x-1/2"
          >
            <span>{snack.message}</span>
            <button
              type="button"
              onClick={handleUndo}
              className="rounded px-1.5 py-0.5 text-xs font-semibold text-cyan-300 transition-colors hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring"
            >
              {t.onboarding.toast.undo}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={exitOpen} onOpenChange={setExitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.onboarding.exitConfirm.title}</AlertDialogTitle>
            <AlertDialogDescription>{t.onboarding.exitConfirm.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.onboarding.exitConfirm.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate('/')}>
              {t.onboarding.exitConfirm.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
