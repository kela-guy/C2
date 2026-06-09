/**
 * Live-but-flat coverage scorer for the onboarding lab.
 *
 * Samples a grid over the area of interest and, per cell, decides whether
 * each domain is detected (in a sensor cone + range) and mitigated (in an
 * effector ring). Protected = detected AND mitigated. Cells are weighted by
 * proximity to the protected centre and alignment with threat axes, then
 * reduced to per-domain scores, a blended headline, per-axis scores (for
 * "open axis" callouts), and representative coverage gaps.
 *
 * Flat estimate only — no terrain line-of-sight. See coverageModel.ts.
 */

import { useMemo } from 'react';
import {
  ALPHA,
  AOI_RADIUS_M,
  AXIS_SIGMA_DEG,
  CAPABILITIES,
  GAP_WEIGHT_THRESHOLD,
  GRID_CELL_M,
  MAX_GAPS,
  OPEN_AXIS_THRESHOLD,
  SITE,
  THREAT_AXES,
  angularDiffDeg,
  fromLocalMeters,
  toLocalMeters,
  type AxisScore,
  type CoverageGap,
  type CoverageResult,
  type Domain,
  type Placement,
} from './coverageModel';

interface LocalPlacement {
  east: number;
  north: number;
  bearingDeg: number;
  detect?: { rangeM: number; fovDeg: number; domains: Domain[] };
  mitigate?: { rangeM: number; domains: Domain[] };
}

function bearingFromTo(fromE: number, fromN: number, toE: number, toN: number): number {
  const dE = toE - fromE;
  const dN = toN - fromN;
  return (((Math.atan2(dE, dN) * 180) / Math.PI) + 360) % 360;
}

export function computeCoverage(placements: Placement[]): CoverageResult {
  const local: LocalPlacement[] = placements.map((p) => {
    const { east, north } = toLocalMeters(p.lat, p.lon, SITE);
    const cap = CAPABILITIES[p.kind];
    return {
      east,
      north,
      bearingDeg: p.bearingDeg ?? 0,
      detect: cap.detect,
      mitigate: cap.mitigate,
    };
  });

  let sumW = 0;
  let sumAirProt = 0;
  let sumGroundProt = 0;
  let sumAirDet = 0;
  let sumGroundDet = 0;

  const axisAgg = THREAT_AXES.map((a) => ({ axis: a, sumW: 0, sumProt: 0 }));
  const gapBuckets = new Map<string, CoverageGap>();

  const sigma2 = 2 * AXIS_SIGMA_DEG * AXIS_SIGMA_DEG;

  for (let east = -AOI_RADIUS_M; east <= AOI_RADIUS_M; east += GRID_CELL_M) {
    for (let north = -AOI_RADIUS_M; north <= AOI_RADIUS_M; north += GRID_CELL_M) {
      const dist = Math.hypot(east, north);
      if (dist > AOI_RADIUS_M) continue;

      // Cell weighting: closer to centre + aligned with a threat axis = heavier.
      const proximity = Math.max(0.2, 1 - dist / AOI_RADIUS_M);
      const cellBearing = (((Math.atan2(east, north) * 180) / Math.PI) + 360) % 360;
      let axisFactor = 0.35;
      let nearestAxisIdx = 0;
      let nearestAxisDiff = Infinity;
      THREAT_AXES.forEach((a, i) => {
        const diff = angularDiffDeg(cellBearing, a.bearingDeg);
        const f = a.weight * Math.exp(-(diff * diff) / sigma2);
        if (f > axisFactor) axisFactor = f;
        if (diff < nearestAxisDiff) {
          nearestAxisDiff = diff;
          nearestAxisIdx = i;
        }
      });
      const w = proximity * axisFactor;

      // Detection / mitigation per domain by scanning placements.
      let airDet = false;
      let groundDet = false;
      let airMit = false;
      let groundMit = false;

      for (const p of local) {
        const d = Math.hypot(east - p.east, north - p.north);
        if (p.detect && (!airDet || !groundDet) && d <= p.detect.rangeM) {
          let inCone = true;
          if (p.detect.fovDeg < 360) {
            const b = bearingFromTo(p.east, p.north, east, north);
            inCone = angularDiffDeg(b, p.bearingDeg) <= p.detect.fovDeg / 2;
          }
          if (inCone) {
            if (p.detect.domains.includes('air')) airDet = true;
            if (p.detect.domains.includes('ground')) groundDet = true;
          }
        }
        if (p.mitigate && (!airMit || !groundMit) && d <= p.mitigate.rangeM) {
          if (p.mitigate.domains.includes('air')) airMit = true;
          if (p.mitigate.domains.includes('ground')) groundMit = true;
        }
        if (airDet && groundDet && airMit && groundMit) break;
      }

      const airProt = airDet && airMit ? 1 : 0;
      const groundProt = groundDet && groundMit ? 1 : 0;
      const protScore = ALPHA * airProt + (1 - ALPHA) * groundProt;

      sumW += w;
      sumAirProt += airProt * w;
      sumGroundProt += groundProt * w;
      sumAirDet += (airDet ? 1 : 0) * w;
      sumGroundDet += (groundDet ? 1 : 0) * w;

      const agg = axisAgg[nearestAxisIdx];
      agg.sumW += w;
      agg.sumProt += protScore * w;

      // Gap candidate: meaningfully weighted but not protected. Bucket by a
      // coarse grid so the callouts spread out instead of clustering.
      if (w >= GAP_WEIGHT_THRESHOLD && protScore < 0.5) {
        const bucketKey = `${Math.round(east / 300)},${Math.round(north / 300)}`;
        if (!gapBuckets.has(bucketKey)) {
          const { lat, lon } = fromLocalMeters(east, north, SITE);
          const detectedAny = airDet || groundDet;
          gapBuckets.set(bucketKey, {
            id: `gap-${bucketKey}`,
            lat,
            lon,
            kind: detectedAny ? 'unengaged' : 'blind',
          });
        }
      }
    }
  }

  const safe = (n: number) => (sumW > 0 ? n / sumW : 0);
  const airScore = safe(sumAirProt);
  const groundScore = safe(sumGroundProt);

  const axes: AxisScore[] = axisAgg.map(({ axis, sumW: aw, sumProt }) => {
    const score = aw > 0 ? sumProt / aw : 0;
    return { ...axis, score, open: score < OPEN_AXIS_THRESHOLD };
  });

  const gaps = Array.from(gapBuckets.values()).slice(0, MAX_GAPS);

  return {
    airScore,
    groundScore,
    combined: ALPHA * airScore + (1 - ALPHA) * groundScore,
    awarenessAir: safe(sumAirDet),
    awarenessGround: safe(sumGroundDet),
    axes,
    openAxes: axes.filter((a) => a.open),
    gaps,
    placementsCount: placements.length,
  };
}

/** Memoized hook wrapper — recompute when the placements change. */
export function useCoverageScore(placements: Placement[]): CoverageResult {
  return useMemo(() => computeCoverage(placements), [placements]);
}
