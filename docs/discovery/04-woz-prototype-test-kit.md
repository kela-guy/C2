# 04 — Wizard-of-Oz Prototype Test Kit

Deliverable for to-do `woz-prototype`. A Wizard-of-Oz (WoZ) test: the "scan" and "re-score" are FAKED by a moderator using pre-baked content, so we can test trust (A1), score meaning (A3), and refine UX (A5) BEFORE building the real viewshed/scoring engine.

WoZ = no new backend. The hand-authored layout and scores below are static; the moderator reveals them on cue and swaps pre-rendered score states as the participant "refines." Use the existing Cesium 3D map (`CesiumTacticalMap`) centered on the demo base; nothing in the app needs to actually compute anything.

## Test objectives → assumptions

- A1 (Trust): does the commander accept-and-refine the suggested layout, or reject it as a black box?
- A3 (Score meaning): do they interpret the headline + sub-scores correctly and safely (catch the weak axis)?
- A5 (Refine UX): can they fix a flagged dead zone by dragging an asset, unaided?

## The base (one real demo site)

- Center: `SITE_CENTER = 32.4666, 35.0013` (near Netanya), Cesium World Terrain on, 3D mode.
- Threat profile for the test (tell the participant): "air-heavy site, with a secondary risk of ground vehicles approaching from the west wadi."
- α (air weight) = 0.6 for this profile.

## Hand-authored "Kela suggested layout v1" (owned assets placed)

Use these exact positions (owned inventory placed by the fake scan). Coordinates are real and sit around the demo site.

- Air detection
  - `RAD-NVT-RADA` 360° @ 32.4686, 34.9863
  - `RAD-NVT-ELTA` 360° @ 32.4596, 35.0213
  - `SENS-NVT-MAGOS-N` 180°/brg 0 @ 32.4761, 34.9943
- Air mitigation
  - `REG-NVT-NORTH` 2500 m @ 32.4776, 34.9913
  - `REG-NVT-EAST` 2500 m @ 32.4646, 35.0213
  - `REG-NVT-WEST` 2500 m @ 32.4666, 34.9763
  - `GOTCHA-NVT-01` 4×120°/500 m @ 32.469, 35.005 (Sector E degraded — amber)
- Ground detection
  - `CAM-NVT-PIXELSIGHT` 360° @ 32.4616, 35.0063
  - `LIDAR-NVT-01` 360° @ 32.4706, 35.0103
- Ground mitigation
  - `LCHR-NVT-ALPHA` @ 32.4626, 34.9963
  - `LCHR-NVT-BRAVO` @ 32.4756, 35.0113

## Planted issues (the test depends on these)

1. NE terrain dead zone: a viewshed shadow ~ NE of center (behind high ground) where air detection drops out even though Regulus reach extends there → "aware? no. mitigate? yes" = NOT protected. This is the A5 task target.
2. Weak west ground axis: the wadi approach from the west has air cover but thin ground detection + only edge launcher reach → low ground sub-score. This is the A3 trap: the blended headline looks okay; participants should notice the west ground gap.
3. Degraded Gotcha Sector E (amber): tests whether they trust degraded-asset handling.

## Pre-baked scores (static cards the moderator shows)

State 0 — suggested layout v1 (reveal after the "scan"):
- Headline (blended, α=0.6): 66%
- Air sub-score: 86%
- Ground sub-score: 36%
- Open-axis flag: WEST GROUND axis red (< 30%)
- Dead-zone callout: 1 (NE air)

State 1 — participant fixes NE air dead zone (e.g. drags Magos-N east / adds recommended sensor):
- Headline: 72% · Air: 93% · Ground: 36% · Dead zones: 0 · West-ground flag still red

State 2 — participant addresses west ground (adds recommended `LCHR-NVT-GAMMA` west / repositions camera):
- Headline: 84% · Air: 93% · Ground: 62% · Open-axis flags: none

Recommended-gap assets the moderator can "offer" when asked:
- +1 air sensor for the NE shadow; +1 launcher (`LCHR-NVT-GAMMA` @ 32.4506, 35.0243 or repositioned west) for the west axis.

Moderator rule: only ever show one of the three states; pick the closest state to what the participant actually did. Do not invent intermediate numbers live — if they make an unanticipated move, say "let me recompute" and show the nearest pre-baked state, noting the deviation.

## Participant tasks (in order)

1. First impression: "Kela scanned your site and suggested this. Talk me through what you see." (A1 — unprompted trust/skepticism)
2. Score read: "What does this score tell you? Would you act on it?" (A3 — do they catch the west ground gap despite a 66% headline?)
3. Fix the dead zone: "There's a flagged blind spot in the NE. Make the site cover it." (A5 — can they drag/place unaided?) → show State 1.
4. Improve protection: "Get the site to a layout you'd actually operate." (A1/A3 — do they target the red west axis?) → show State 2.
5. Accept or reject: "Would you start from this, tweak it, or throw it out and do it yourself?" (A1 — the headline decision).

## Observation sheet (one per participant)

- Initial reaction (trust/skeptic/neutral) + verbatim: ____
- Did they understand the headline vs sub-scores? (yes/partial/no): ____
- Did they catch the west ground gap WITHOUT prompting? (yes/no): ____ ← key A3 signal
- Completed NE dead-zone fix unaided? (yes/with hint/no): ____ ← key A5 signal
- Final decision: accept / refine / reject: ____ ← key A1 signal
- Misinterpretations / false confidence moments: ____
- Quotes: ____

## Pass bars (see doc 06 for the master list)

- A1: ≥60% choose accept-and-refine (not reject).
- A3: ≥70% catch the west ground gap and read the score safely (no "66% = good enough, done").
- A5: ≥70% complete the NE dead-zone fix unaided.

## Materials checklist

- [ ] Cesium demo build, 3D + terrain on, centered on demo base
- [ ] v1 layout placed (positions above) and screenshotted
- [ ] Three score-state cards (0/1/2) printed/figma for moderator
- [ ] Two recommended-gap asset chips ready to "offer"
- [ ] Consent + recording; observation sheet per participant
- [ ] Moderator script (tasks above) + the "recompute" fallback line

## Build note (scope guardrail)

Per the discovery plan, do NOT build the real viewshed/score engine for this. If a clickable shell is wanted instead of pure moderator-faked states, keep it to static map + drag-to-move existing markers + swapping the three pre-baked score cards — no live computation.

## Exit criteria for this to-do

- [ ] WoZ session run with ≥5 commanders (or labeled proxies)
- [ ] A1/A3/A5 signals recorded against the pass bars above
- [ ] Decision: proceed to build the scan/score engine, pivot the score presentation, or stop
