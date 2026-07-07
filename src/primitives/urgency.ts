/**
 * Urgency model — single source of truth for severity across card and map.
 *
 * Aligned with the Target Triage Agent PRD's `TrackEnrichment.severity`:
 * four tiers ordered LOW → MEDIUM → HIGH → CRITICAL. Both the target card
 * (spine + status chip color) and the map marker (ring color + pulse)
 * read from this function so the operator sees one urgency language.
 *
 * Today the Detection type does not carry an upstream `severity` field —
 * the Triage Agent wire-up is downstream of this work. Until then,
 * `resolveTargetSeverity` derives a severity from the existing lifecycle,
 * mitigation, weapon, affiliation, and classification state on a
 * Detection. When the agent eventually populates a real severity field,
 * the function can short-circuit on it and the derivation below becomes
 * the fallback for un-enriched tracks.
 *
 * Design notes (intent before code):
 *   1. Urgency owns ONE color across both surfaces. One function, two
 *      consumers. No second urgency derivation anywhere.
 *   2. Interaction (hover / selected) is NOT urgency. Marker interaction
 *      gets a separate axis in Phase 5 of the unification plan.
 *   3. Affiliation is NOT urgency. Hostile-classified drones color the
 *      glyph; severity colors the ring/spine. A hostile + mitigated
 *      target legitimately reads as low urgency (the threat is handled).
 *   4. Completed states (resolved / neutralized / expired / dismissed)
 *      always collapse to LOW. Desaturation is the visual modifier the
 *      card/marker apply on top — not a fifth severity color.
 *
 * See `docs/urgency-unification-plan.md` for the full rationale.
 */

import type { Detection } from '@/imports/ListOfSystems';
import { MARKER_HEX } from './accentHex';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Severity ordering for sort + visual progression checks. Lower index =
 * less urgent. Mirrors the PRD's queue ordering (CRITICAL first when
 * sorted descending).
 */
export const SEVERITY_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

/**
 * Operator-facing labels. Kept in this module so card + marker label
 * the same way; per-locale translation can wrap these later via the
 * existing strings catalog without changing the keys.
 */
export const SEVERITY_LABEL: Record<Severity, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

/**
 * Severity color palette — the single source of truth shared by card
 * spine, card icon-surface, status chip, marker ring, and marker glow.
 *
 * Hex values intentionally match the existing tactical palette in
 * `markerStyles.AFFILIATION_PALETTES` so urgency reuses the colors
 * operators already associate with "threat / possible / inert":
 *
 *   - CRITICAL + HIGH share the hostile red. Same hue because the
 *     operator-facing meaning is the same ("attend to this"). The
 *     CRITICAL → HIGH distinction is carried by MOTION (pulse) on the
 *     marker and by chip emphasis on the card — see SEVERITY_PULSE.
 *   - MEDIUM uses the possibleThreat orange — already the dashboard's
 *     "ambiguous / review" color.
 *   - LOW is zinc — the same neutral the completed/desaturated card
 *     state already uses.
 */
export const SEVERITY_COLOR: Record<Severity, string> = {
  CRITICAL: MARKER_HEX.hostile,
  HIGH: MARKER_HEX.hostile,
  MEDIUM: MARKER_HEX.possibleThreat,
  LOW: MARKER_HEX.lowGray,
};

/**
 * Icon-surface (card icon-box background) opacity for each tier.
 * Carries the secondary distinction between CRITICAL and HIGH on the
 * card: CRITICAL sits at the same opacity as today's active-bg
 * (`CARD_TOKENS.iconBox.activeBgOpacity`), HIGH is slightly softer
 * so a queue of HIGH targets does not visually compete with a
 * CRITICAL one. LOW falls through to the card's neutral default
 * surface (no tint).
 */
export const SEVERITY_SURFACE_OPACITY: Record<Severity, number> = {
  CRITICAL: 0.2,
  HIGH: 0.14,
  MEDIUM: 0.14,
  LOW: 0,
};

/**
 * Whether the marker ring pulses at this tier. Pulse is the kinetic
 * channel — it's how CRITICAL pulls the eye even when its color
 * matches HIGH. Card spine equivalent (subtle inner glow on CRITICAL)
 * is a Phase 4 decision.
 */
export const SEVERITY_PULSE: Record<Severity, boolean> = {
  CRITICAL: true,
  HIGH: false,
  MEDIUM: false,
  LOW: false,
};

/**
 * Resolve the urgency severity for a target. Total over the current
 * Detection shape — every input returns exactly one severity.
 *
 * Order matters here. Earlier branches outrank later ones because
 * lifecycle "finality" + active-engagement signals beat current-state
 * assessment, and the classification pipeline gates the threat tier:
 *
 *   1. Closed-out / dismissed     → LOW       (visually receding)
 *   2. Active engagement          → CRITICAL  (kinetic / non-kinetic in flight)
 *   3. Confirmed alarm zone       → CRITICAL / HIGH (operator-configured)
 *   4. Pre-classification gate    → MEDIUM    (raw_detection / suspicion)
 *   5. Mitigated, BDA pending     → HIGH
 *   6. Lifecycle status           → CRITICAL / HIGH / MEDIUM
 *   7. Classification fallbacks   → LOW       (bird, friendly, neutral)
 *   8. Default                    → MEDIUM
 *
 * Why CRITICAL for in-flight mitigation: the card needs to surface
 * "something is happening right now — do not look away" while the
 * effector is engaged. Once BDA confirms (status flips to
 * `event_neutralized` / `event_resolved`), branch 1 takes over and
 * the target collapses to LOW.
 */
export function resolveTargetSeverity(target: Detection): Severity {
  // 1. Closed-out — always LOW. Visual decision: a resolved target
  //    must visibly recede in the queue so the operator's eye moves
  //    on. Desaturation is layered on top by the card/marker.
  if (
    target.status === 'event_resolved' ||
    target.status === 'event_neutralized' ||
    target.status === 'expired'
  ) {
    return 'LOW';
  }
  if (target.dismissReason || target.activityStatus === 'dismissed') {
    return 'LOW';
  }
  if (target.activityStatus === 'timeout') {
    return 'LOW';
  }

  // 2. Active engagement — CRITICAL. Mitigation in flight or any
  //    weapon-pointing phase reads as the strongest signal until it
  //    resolves. `mitigated + BDA pending` stays HIGH (branch 4) so
  //    it doesn't compete with newly active engagements for attention.
  if (target.mitigationStatus === 'mitigating') {
    return 'CRITICAL';
  }
  if (
    target.weaponPointingStatus === 'pointing' ||
    target.weaponPointingStatus === 'pointed' ||
    target.weaponPointingStatus === 'locking' ||
    target.weaponPointingStatus === 'locked'
  ) {
    return 'CRITICAL';
  }

  // 3. Operator-configured alarm zones override most lifecycle states.
  //    Red zones are by definition where the operator already decided
  //    "anything here is the highest urgency"; yellow is the watch tier.
  if (target.alarmZone === 'red') return 'CRITICAL';
  if (target.alarmZone === 'yellow') return 'HIGH';

  // 4. Pre-classification gate — MEDIUM. A target whose classification
  //    pipeline has NOT produced a verdict yet (raw_detection or
  //    suspicion) reads as MEDIUM, regardless of whether the lifecycle
  //    has already minted a `status: 'detection'` envelope for it. The
  //    operator needs to review before we promote it to HIGH.
  //
  //    This branch sits above the lifecycle branch because, in the
  //    real data, a brand-new track will have BOTH `status: 'detection'`
  //    AND `entityStage: 'raw_detection'` — classification is the
  //    stronger signal of "do we trust the threat assessment yet".
  if (target.status === 'suspicion') {
    return 'MEDIUM';
  }
  if (target.entityStage === 'raw_detection') {
    return 'MEDIUM';
  }

  // 5. Mitigated but BDA still pending — operator must still confirm.
  //    Kept at HIGH (not CRITICAL) so it doesn't outrank a brand-new
  //    active engagement happening simultaneously.
  if (target.mitigationStatus === 'mitigated' && target.bdaStatus !== 'complete') {
    return 'HIGH';
  }

  // 6. Lifecycle status — main derivation path for classified targets.
  //    Aligned with PRD intent: `event` is a confirmed actionable
  //    incident, `detection` is a confirmed threat, `tracking` is an
  //    active classified track.
  if (target.status === 'event') return 'CRITICAL';

  if (target.status === 'detection') {
    // Known false-positive class (bird) collapses to MEDIUM — operator
    // should still review, but it's not a kinetic threat.
    if (target.classifiedType === 'bird') return 'MEDIUM';
    // Identified non-threats recede to LOW (calm / safe) — a friendly or
    // neutral track is an identified entity, not something to attend to.
    if (target.affiliation === 'friendly' || target.affiliation === 'neutral') {
      return 'LOW';
    }
    // Ambiguous tiers — a possible threat or an as-yet-unidentified track
    // still owes the operator a decision, but it isn't a CONFIRMED threat,
    // so it reads MEDIUM (orange "review me"), not HIGH red.
    if (target.affiliation === 'possibleThreat' || target.affiliation === 'unknown') {
      return 'MEDIUM';
    }
    // Hostile or unspecified affiliation — confirmed threat tier.
    return 'HIGH';
  }

  if (target.status === 'tracking') {
    if (target.classifiedType === 'bird') return 'LOW';
    if (target.affiliation === 'friendly' || target.affiliation === 'neutral') {
      return 'LOW';
    }
    if (target.affiliation === 'possibleThreat' || target.affiliation === 'unknown') {
      return 'MEDIUM';
    }
    return 'HIGH';
  }

  // Classification fallbacks
  if (target.classifiedType === 'bird') return 'LOW';
  if (target.affiliation === 'friendly' || target.affiliation === 'neutral') {
    return 'LOW';
  }

  // 7. Default — anything that reaches here is an active, classified,
  //    un-affiliated target with no special state. MEDIUM is the
  //    conservative "look at this" tier.
  return 'MEDIUM';
}

/**
 * True when the target's severity is below the operator's review
 * threshold — convenience for queue-filter UIs that want to hide
 * resolved/expired/dismissed tracks without re-implementing the
 * branching above.
 */
export function isReceding(target: Detection): boolean {
  return resolveTargetSeverity(target) === 'LOW';
}

/**
 * Neutral gray used for the "raw sensor blip, no identity yet" phase.
 * A bare sensor track tells us a location but not what the object is, so
 * the marker and card both render gray until a camera classifies it.
 */
export const UNKNOWN_GRAY = MARKER_HEX.unknownGray;

/**
 * True for a raw sensor detection that has not been classified yet — no
 * `classifiedType` and still at `raw_detection`. These render as a plain
 * gray dot (no urgency color / ring / pulse) instead of borrowing the
 * MEDIUM "needs review" orange, so the operator reads "we don't know
 * what this is yet" rather than a confirmed threat tier.
 *
 * Deliberately separate from `resolveTargetSeverity` (which still returns
 * MEDIUM for `raw_detection`) so the triage queue keeps surfacing the
 * track for review while the map/card de-emphasize it as unidentified.
 */
export function isUnclassifiedUnknown(target: Detection): boolean {
  return target.entityStage === 'raw_detection' && target.classifiedType == null;
}
