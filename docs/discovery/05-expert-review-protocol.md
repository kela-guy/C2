# 05 — Expert Review Protocol (Scan Credibility)

Deliverable for to-do `expert-review`. Tests A2: does the hybrid scan (terrain viewshed + threat axes + perimeter) produce militarily-credible dead zones and weak spots? An SME (experienced commander / planner) reviews scan outputs on real terrains and rates them.

This protects against the most dangerous failure: a scan that LOOKS authoritative but misleads. Run this in parallel with the WoZ (doc 04).

## Reviewers

- 2–3 independent SMEs, ideally Secondary-segment commanders (re-deploy experience) or qualified planners.
- Reviewers must NOT have authored the test layouts. Independent rating only.

## Test terrains (2–3, varied)

Pick terrains with different relief so viewshed actually matters:
1. The demo site near `SITE_CENTER` (32.4666, 35.0013) — mixed.
2. A high-relief site (hills/wadi) — stresses dead-zone detection.
3. A flat/open site — stresses threat-axis logic over terrain masking.

For each terrain, prepare the scan output to review: detected dead zones (viewshed shadows), proposed threat axes, and the suggested asset layout with coverage.

## What the reviewer does (per terrain, ~30 min)

1. Cold read: show terrain + scan output. "Where would YOU expect the dead zones and main threat axes?" Capture BEFORE revealing Kela's full reasoning (reduces anchoring).
2. Compare: overlay Kela's flagged dead zones / axes. Reviewer marks each as Valid / Questionable / Wrong.
3. Misses: "What did Kela MISS that you consider important?" (false negatives are the dangerous ones.)
4. Layout sanity: "Is the suggested asset placement something you'd accept as a starting point? What's unrealistic (power, access, fields of fire, mutual support)?"

## Scoring rubric (per terrain)

Dead zones / weak spots:
- Count flagged items; reviewer tags each Valid / Questionable / Wrong.
- Validity rate = Valid / total flagged.
- Dangerous misses = important real gaps NOT flagged (count; weight heavily).

Threat axes:
- Reviewer rates each proposed axis 1–5 for plausibility; record mean and any missing axis.

Layout realism:
- 1–5: "would a competent commander accept this as a starting point?"
- List blocking realism issues (e.g., asset on inaccessible terrain, launcher with masked field of fire).

## Pass bars (A2)

- Validity rate ≥ 70% of flagged dead zones/weak spots rated Valid, AND
- Zero "dangerous misses" rated critical by ≥2 reviewers, AND
- Mean layout realism ≥ 3.5 / 5 across terrains.

Fail on any → the scan engine is not credible yet; fix logic or narrow scope before building production.

## Scorecard (fill per terrain × reviewer)

| Terrain | Reviewer | Flagged | Valid | Questionable | Wrong | Dangerous misses | Axis mean (1-5) | Layout realism (1-5) | Blocking issues |
|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | |

## Synthesis

- Roll up validity rate and realism across terrains/reviewers.
- List every dangerous miss with terrain + reviewer + severity → these become must-fix scan rules.
- Capture realism constraints (power/access/fields of fire/mutual support) → feed into the placement logic and into doc 03's open data questions.

## Exit criteria for this to-do

- [ ] 2–3 SMEs reviewed 2–3 terrains each, independently
- [ ] Validity rate, dangerous misses, and realism scored against pass bars
- [ ] Go / fix / stop decision recorded for the scan engine
