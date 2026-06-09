# 03 — Coverage & Protection Definition (Scoring Spec)

Deliverable for to-do `define-coverage`. Defines exactly what "covered" and "protected" mean per threat type and how the combined air+ground score is computed. Grounded in the real asset registries:
`src/app/components/tacticalAssets.ts`, `src/app/components/gotcha/gotchaAssets.ts`, `src/app/lib/mapGeo.ts`.

This is a definition to AGREE, not a built feature. It deliberately separates "awareness" from "protection" to avoid the false-confidence risk (A3).

## 1. Vocabulary (precise)

- Detection coverage (awareness): a location can be SEEN by at least one healthy sensor — inside its FOV/range AND with terrain line-of-sight (LOS). LOS is the net-new viewshed dependency; without it we only have flat range (today's `findDetectingSensorAssets` in `tacticalAssets.ts`).
- Mitigation coverage (reach): a location can be ACTED ON by at least one healthy effector (jam/capture/kinetic) within its effective engagement range.
- Protected (kill-chain): detection AND mitigation for the same threat domain at that location. Detection-only is NOT "protected" — it is surfaced separately as "aware, cannot engage."
- Dead zone: a location inside a sensor's nominal range but with NO LOS detection (hidden by terrain), or with no sensor range at all, inside the area of interest.

## 2. Threat domains and which assets count

Air / CUAS domain
- Detection: radars `SENS-NVT-MAGOS-N/S` (FOV 180°), `RAD-NVT-RADA`, `RAD-NVT-ELTA` (360°); Gotcha sensors `GOTCHA-NVT-01` (4×120°, 500 m); cameras as confirmation only.
- Mitigation: Regulus ECM (`coverageRadiusM: 2500`, 4 units), Gotcha sectors (counter-drone, 500 m), weapon system `WPN-NVT-01` "Iron Dome" (area air defense).
- Sensor range used for detection cones: `FOV_RADIUS_M = 1200 m` (default), Gotcha `500 m`.

Ground domain
- Detection: cameras (`CAM-*`), ground radar (Magos), lidar `LIDAR-NVT-01` (360°).
- Mitigation: launchers `LCHR-NVT-ALPHA/BRAVO/GAMMA` (kinetic, ground vehicles).
- DATA GAP: launchers have no `coverageRadiusM`/engagement range in the registry. We need an effective ground engagement range to score ground mitigation. Worked example below uses a placeholder of 3000 m flagged as an ASSUMPTION to confirm with you.

Support (shown, not scored): floodlights (`FL-*`, 70° beam ~550 m), PA speakers (`SPK-*`, ~800 m audible). They aid response but do not detect or mitigate, so they do not earn protection credit.

## 3. Health / availability gating

A sensor/effector contributes ONLY if healthy and online. Use `operationalStatus` / health (see `deviceHealth.ts`, `gotchaHealth.ts`):
- `offline` / `malfunctioning` → excluded entirely (e.g. demo: Magos South, Regulus South).
- Degraded (e.g. Gotcha Sector E `warning`, latency 5200 ms) → counts at reduced credit: range × 0.5 and excluded from "fully protected", flagged amber.
- Low battery thresholds (≤20% critical, ≤40% warning) propagate to the same degraded handling.

## 4. Area of Interest (AoI)

1. Base perimeter from account/org config (today proxied by `SITE_CENTER = {32.4666, 35.0013}`), plus
2. An outer buffer extended along known threat axes out to the max effective engagement range, so we measure whether a threat can be detected AND engaged BEFORE reaching the center.

## 5. Scoring method (grid + weighting)

1. Discretize the AoI into a grid (default cell 50 m).
2. Weight each cell `w_i` by threat exposure:
   - `w_i = axis_i × proximity_i`
   - `axis_i`: higher on known approach axes (1.0 on-axis, decaying to 0.3 off-axis).
   - `proximity_i`: higher closer to the protected center (e.g. `1 − dist/maxDist`, floored at 0.2), using `haversineDistanceM` from `mapGeo.ts`.
3. For each cell and each domain `d ∈ {air, ground}` compute booleans:
   - `detected_{d,i}` = inside any healthy in-domain sensor cone (`fovPolygon` + range) AND LOS true (viewshed).
   - `mitigated_{d,i}` = inside any healthy in-domain effector range.
   - `protected_{d,i}` = `detected_{d,i} AND mitigated_{d,i}` (1 or 0; degraded assets contribute 0.5 weight to their boolean, capped so a cell with only degraded cover scores ≤0.5).
4. Domain score (weighted % of AoI that is protected):
   - `Score_d = Σ_i (w_i × protected_{d,i}) / Σ_i (w_i)`
   - Restrict the sum to cells relevant to that domain's AoI.

## 6. Combined score (single headline, with guardrails)

`CombinedScore = α × Score_air + (1 − α) × Score_ground`

- `α` = air/ground importance weight, default `0.5`, configurable per base threat profile (air-heavy base → e.g. `0.7`).
- ALWAYS surface the two sub-scores next to the headline (layered display) — the single number is the headline, never the only number. This directly mitigates A3 (false confidence).
- Hard guardrails (override the headline regardless of %):
  - If any single threat axis has `Score < 30%`, show a red "open axis" callout even if the headline is high.
  - Never display "complete"/green above 90% if any dead zone intersects an on-axis cell.

Recommendation to confirm in A3 test: keep ONE headline for motivation, but the validated primary surface should be the two sub-scores + the gap list, not the blended number alone.

## 7. Worked example (illustrative, demo assets near SITE_CENTER)

Using the seed registries (healthy-only; Magos-S and Regulus-S excluded as malfunctioning):

- Air mitigation: 3 healthy Regulus rings × 2500 m blanket almost the entire AoI → air mitigation coverage is high.
- Air detection: RADA + Elta (360°, 1200 m) + Magos-N (180°) give broad awareness near center; gaps appear at the AoI edges beyond 1200 m and in any terrain shadow (viewshed) — these are the air dead zones.
- Air protection ≈ detection ∩ mitigation → moderate-to-high near center, dropping at edges where detection runs out before the Regulus ring does.
- Ground mitigation: only 3 launchers; with the ASSUMED 3000 m engagement range they cover a lot of flat area, but with no LOS modeling for direct-fire this is optimistic → ground sub-score is the swing variable.
- Ground detection: cameras + Magos-N + lidar — narrower; western/southern approaches are thin.

Likely result: a HIGH air sub-score and a notably LOWER ground sub-score. A naive blended `α=0.5` headline (say ~70%) would HIDE a weak ground picture — which is exactly the A3 failure mode this spec is built to prevent. Hence the mandatory sub-scores + open-axis guardrail.

(Exact numbers depend on the confirmed launcher engagement range and the viewshed engine; compute them in the A2/A3 prototype, not here.)

## 8. Open data questions (must answer before building the real scorer)

- Launcher / weapon-system effective engagement ranges (and min range / dead arc)?
- Does "ground protection" require kinetic reach, or is perimeter-sensor + response-force sufficient?
- Per-sensor real ranges (day vs thermal, radar instrumented range) vs the single `FOV_RADIUS_M = 1200` placeholder?
- Default `α` per base type, and who sets the base threat profile?
- LOS/viewshed resolution and target height assumptions (drone at 100 m AGL vs vehicle at 2 m).

## Exit criteria for this to-do

- [ ] Definitions (detected / mitigated / protected / dead zone) signed off
- [ ] Air & ground asset membership lists confirmed; launcher range provided
- [ ] `α` default and guardrail thresholds agreed
- [ ] Decision recorded: single headline + mandatory sub-scores (layered) vs blended-only
