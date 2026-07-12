/**
 * OnboardingFlow — the single-scene concept-video experience.
 *
 * One continuous cinematic scene in three beats:
 *   intro     — slow orbit over the bare site, red threat corridors converge
 *               on the base, a minimal title card invites the operator in.
 *   build     — the camera settles into the hero oblique, the asset dock
 *               slides up, and the operator drags assets onto the live 3D
 *               terrain. Every drop raises an animated coverage wall and the
 *               protection score climbs live.
 *   protected — one-way latch when the combined score crosses the threshold:
 *               the camera pulls back over the fused shield and the "Base
 *               protected" banner appears. Building stays enabled.
 *
 * Owns placements, selection, and phase. Coverage is scored from a deferred
 * copy of placements so dragging a marker stays smooth while the score/wedges
 * catch up a beat later.
 */

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStrings } from '@/lib/intl';
import { CheckCircle2 } from '@/lib/icons/central';
import { bearingDegrees } from '@/app/lib/mapGeo';
import { Button } from '@/primitives/Button';
import type { CesiumMapFlyTo, CesiumMapOrbit } from '@/primitives/CesiumMap';
import { ASSET_VISUAL } from './assetCatalog';
import { AssetDock } from './AssetDock';
import { OnboardingMap } from './OnboardingMap';
import { useCoverageScore } from './useCoverageScore';
import {
  CAPABILITIES,
  PROTECTED_THRESHOLD,
  SITE,
  SITE_HERO_HEADING_DEG,
  type AssetKind,
  type OnboardingPhase,
  type Placement,
} from './coverageModel';
import { nextPlacementId } from './suggestLayout';

/**
 * Default oblique pitch for the cinematic camera (negative looks down).
 * Steep enough that the photoreal city/airport fabric fills the frame
 * instead of a compressed horizon band, shallow enough to stay cinematic.
 */
const HERO_PITCH_DEG = -27;

interface FlowState {
  placements: Placement[];
  selectedId: string | null;
}

type FlowAction =
  | { type: 'SELECT'; id: string | null }
  | { type: 'PLACE'; placement: Placement }
  | { type: 'MOVE'; id: string; lat: number; lon: number }
  | { type: 'REMOVE'; id: string }
  | { type: 'RESTORE'; placements: Placement[] };

function reducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'SELECT':
      return { ...state, selectedId: action.id };
    case 'PLACE':
      return { ...state, placements: [...state.placements, action.placement], selectedId: action.placement.id };
    case 'MOVE':
      return {
        ...state,
        placements: state.placements.map((p) =>
          p.id === action.id
            ? {
                ...p,
                lat: action.lat,
                lon: action.lon,
                // Directional assets keep facing outward as they're dragged
                // around the perimeter.
                bearingDeg:
                  p.bearingDeg != null
                    ? bearingDegrees(SITE.lat, SITE.lon, action.lat, action.lon)
                    : undefined,
              }
            : p,
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

interface Snack {
  id: number;
  message: string;
  prev: Placement[];
}

export function OnboardingFlow() {
  const t = useStrings();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [state, dispatch] = useReducer(reducer, { placements: [], selectedId: null });
  const [phase, setPhase] = useState<OnboardingPhase>('intro');
  const [flyTo, setFlyTo] = useState<CesiumMapFlyTo | null>(null);
  const [orbit, setOrbit] = useState<CesiumMapOrbit | null>(null);
  const [snack, setSnack] = useState<Snack | null>(null);
  const snackSeq = useRef(0);

  const placementsRef = useRef(state.placements);
  placementsRef.current = state.placements;

  // Deferred scoring keeps marker dragging smooth; the HUD/wedges trail a beat.
  const deferredPlacements = useDeferredValue(state.placements);
  const result = useCoverageScore(deferredPlacements);

  const building = phase !== 'intro';

  // The red wedges track the still-open approaches; with no assets placed
  // every corridor is open, so the intro reads as a base under threat.
  const axisIds = result.openAxes.map((a) => a.id);

  // One-way payoff latch: the first time the combined score crosses the
  // threshold, flip to the protected beat (camera pull-back + banner).
  useEffect(() => {
    if (phase === 'build' && result.combined >= PROTECTED_THRESHOLD) {
      setPhase('protected');
    }
  }, [phase, result.combined]);

  // Per-phase cinematic camera. Slow orbit while the intro card is up; the
  // hero oblique for building (free camera after the fly settles); a higher
  // pull-back over the fused shield for the protected payoff.
  useEffect(() => {
    const dur = prefersReducedMotion ? 0 : 2.4;
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

    switch (phase) {
      case 'intro':
        setFlyTo(null);
        setOrbit({
          lat: SITE.lat,
          lon: SITE.lon,
          heightM: 700,
          pitchDeg: -30,
          periodSec: 46,
          terrainRelative: true,
        });
        break;
      case 'build':
        setOrbit(null);
        setFlyTo(hero(420, HERO_PITCH_DEG));
        break;
      case 'protected':
        setOrbit(null);
        setFlyTo(hero(950, -33));
        break;
    }
  }, [phase, prefersReducedMotion]);

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
      // Directional detectors face OUTWARD (away from the base) by default —
      // a dropped camera watches the approach beyond it, not the base itself.
      const bearingDeg =
        cap.detect && ASSET_VISUAL[kind].shape === 'cone' && cap.detect.fovDeg < 360
          ? bearingDegrees(SITE.lat, SITE.lon, lat, lon)
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

  const handleClear = useCallback(() => {
    pushSnack(t.onboarding.video.cleared, placementsRef.current);
    dispatch({ type: 'RESTORE', placements: [] });
  }, [pushSnack, t]);

  const handleSelect = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT', id });
  }, []);

  const handleUndo = useCallback(() => {
    if (!snack) return;
    dispatch({ type: 'RESTORE', placements: snack.prev });
    setSnack(null);
  }, [snack]);

  return (
    <div className="relative h-full w-full">
      <OnboardingMap
        placements={state.placements}
        axisIds={axisIds}
        threatEmphasis={phase === 'intro'}
        selectedId={state.selectedId}
        draggable={building}
        onSelect={handleSelect}
        onPlace={handlePlace}
        onMove={handleMove}
        onRemove={handleRemove}
        flyTo={flyTo}
        orbit={orbit}
      />

      {/* Intro title card — cinematic scrim + headline over the slow orbit. */}
      <AnimatePresence>
        {phase === 'intro' && (
          <motion.div
            key="intro"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeIn' } }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-end pb-[12vh]"
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(to top, rgba(5,8,14,0.85) 0%, rgba(5,8,14,0.35) 35%, rgba(5,8,14,0.15) 60%, rgba(5,8,14,0.4) 100%)',
              }}
              aria-hidden="true"
            />
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: 'easeOut' }}
              className="relative flex max-w-xl flex-col items-center gap-4 px-6 text-center"
            >
              <span className="text-2xs font-semibold uppercase tracking-[0.35em] text-cyan-300/90">
                {t.onboarding.title}
              </span>
              <h1 className="text-4xl font-semibold leading-tight text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.7)]">
                {t.onboarding.video.introTitle}
              </h1>
              <p className="text-sm leading-relaxed text-slate-11 [text-shadow:0_1px_12px_rgba(0,0,0,0.8)]">
                {t.onboarding.video.introBody}
              </p>
              <Button
                label={t.onboarding.video.begin}
                variant="fill"
                size="lg"
                onClick={() => setPhase('build')}
                className="mt-2 min-w-48"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* "Base protected" payoff banner. */}
      <AnimatePresence>
        {phase === 'protected' && (
          <motion.div
            key="protected"
            initial={prefersReducedMotion ? false : { opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute start-1/2 top-6 z-30 flex w-[min(440px,90vw)] -translate-x-1/2 flex-col items-center gap-2.5 rounded-xl border border-emerald-300/25 bg-slate-950/80 px-6 py-4 text-center shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-md rtl:translate-x-1/2"
          >
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 size={18} aria-hidden="true" />
              <span className="text-base font-semibold text-white">
                {t.onboarding.video.protectedTitle}
              </span>
            </div>
            <p className="text-xs-plus leading-relaxed text-slate-10">
              {t.onboarding.video.protectedBody}
            </p>
            <Button
              label={t.onboarding.video.finish}
              variant="fill"
              size="md"
              onClick={() => navigate('/')}
              className="mt-1"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Asset dock — bottom centre while building (never unmounts after). */}
      {building && (
        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center">
          <AssetDock canClear={state.placements.length > 0} onClear={handleClear} />
        </div>
      )}

      {/* Undo snackbar. */}
      <AnimatePresence>
        {snack && (
          <motion.div
            key={snack.id}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute bottom-32 start-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-white/10 bg-slate-2/95 px-3.5 py-2 text-xs text-slate-11 shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-sm rtl:translate-x-1/2"
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
    </div>
  );
}
