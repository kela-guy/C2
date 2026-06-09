# 06 — Success Metrics & Assumption Pass Bars

Deliverable for to-do `set-pass-bars`. The single source of truth for "is this validated enough to build?" Confirm these targets with the product owner BEFORE any production build. Numbers are proposed defaults to ratify or adjust.

## Decision rule

Production build of the scan/score engine is GREEN-LIT only if A1, A2, and A3 all pass. A4 and A5 are gating for the full onboarding flow but not for a scoped first slice. Any RED on A1–A3 → fix or stop; do not build on an unvalidated foundation.

## Assumption pass/fail bars

A1 — Trust (will commanders accept-and-refine, not reject the auto-layout?)
- Source: WoZ test (doc 04), task 5.
- Metric: % choosing accept-or-refine vs reject.
- PASS ≥ 60% accept-and-refine · WATCH 40–59% · FAIL < 40%.

A2 — Scan credibility (are dead zones / threat axes militarily valid?)
- Source: expert review (doc 05).
- Metrics: validity rate; dangerous misses; layout realism.
- PASS: validity ≥ 70% AND 0 critical dangerous misses (per ≥2 reviewers) AND realism ≥ 3.5/5.
- FAIL: any condition unmet.

A3 — Score meaning (interpreted correctly, no false confidence?)
- Source: WoZ test (doc 04), tasks 2 & 4.
- Metric: % who read the score safely AND catch the planted weak west-ground axis without prompting.
- PASS ≥ 70% · FAIL < 70% (and if anyone treats a high blended headline as "done" while a red axis exists, mandate the layered sub-score display).

A4 — Outcome (faster + better understood than manual)
- Source: timed task vs the manual baseline captured in interviews (doc 02).
- Metrics: time-to-first-protected-layout; comprehension self-rating (1–5).
- PASS: ≥ 40% time reduction vs baseline AND mean comprehension ≥ 4/5.

A5 — Refine UX (can they fix a flagged gap unaided?)
- Source: WoZ test (doc 04), task 3.
- Metric: % completing the NE dead-zone fix without help.
- PASS ≥ 70% · FAIL < 70%.

## Product success metrics (post-launch, if built)

Leading (first session / first week):
- Setup completion via suggestion: % of new users who finish setup starting from Kela's layout. Target ≥ 60%.
- Time-to-first-protected-layout: median minutes from first open to accepted layout. Target ≤ 15 min (ratify against interview baseline).
- Refinement effort: median manual adjustments before accept (too high = bad suggestion; too low = blind trust). Watch band 2–8.
- Coverage score at completion: distribution; flag completions with any red open-axis.

Lagging:
- Time-to-operational reduction vs pre-feature baseline. Target ≥ 40%.
- New-user activation/retention (week 1). Target: positive lift vs control.
- Expert-rated layout quality on a sample of real accepted layouts. Target mean ≥ 3.5/5.

Guardrail / counter-metrics (watch for harm):
- False-confidence incidents: accepted layouts later found with an undetected on-axis gap. Target 0.
- Over-trust: % accepting with zero adjustments AND a sub-score < 50%. Keep low; investigate if rising.

## Instrumentation notes

- Score at completion + per-domain sub-scores must be logged with each accepted layout (enables the guardrail metrics and post-hoc expert sampling).
- "Manual adjustments" = count of drag/place/remove actions between first suggestion and accept.
- Baseline time-to-covered comes from doc 02 interviews; record it before launch so A4 and the lagging target are measurable.

## Sign-off checklist

- [ ] Pass bars A1–A5 ratified by product owner (adjust numbers as needed)
- [ ] Leading/lagging targets ratified; baseline time-to-covered recorded
- [ ] Counter-metrics + instrumentation agreed
- [ ] Build decision gate documented: build only on A1+A2+A3 PASS
