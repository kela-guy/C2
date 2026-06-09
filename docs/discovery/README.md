# Onboarding Auto-Coverage — Discovery Deliverables

Discovery artifacts for the first-run onboarding feature: Kela auto-scans a commander's territory (terrain viewshed + threat axes + perimeter), suggests an initial asset layout from owned assets + gap recommendations, shows a combined air+ground protection score, and lets the commander refine via drag-and-drop with 3D extruded coverage volumes and ingress/egress analysis.

These are discovery instruments and specs to de-risk the idea BEFORE building. No production scan/score engine should be built until assumptions A1–A3 pass (see doc 06). We have no user-research evidence yet — every claim here is a hypothesis to test.

Source plan: `.cursor/plans/onboarding_auto-coverage_discovery_2ff9f497.plan.md` (do not edit).

## Documents

1. [01 — Recruitment & Screening Plan](01-recruitment-plan.md) — who to talk to, screener, sample sizes (to-do `recruit`).
2. [02 — Problem-Discovery Interview Guide](02-interview-guide.md) — JTBD script, no solution pitching, synthesis template (to-do `interview`).
3. [03 — Coverage & Protection Definition](03-coverage-definition.md) — exact "covered/protected" definitions + combined-score formula, grounded in the real asset registries (to-do `define-coverage`).
4. [04 — Wizard-of-Oz Prototype Test Kit](04-woz-prototype-test-kit.md) — hand-authored layout, pre-baked scores, moderator script for trust/score/refine (to-do `woz-prototype`).
5. [05 — Expert Review Protocol](05-expert-review-protocol.md) — SME scorecard for scan credibility (to-do `expert-review`).
6. [06 — Success Metrics & Pass Bars](06-success-metrics-and-pass-bars.md) — the build-decision gate (to-do `set-pass-bars`).

## Assumptions under test (from the plan)

- A1 Trust · A2 Scan credibility · A3 Score meaning (no false confidence) · A4 Outcome (faster) · A5 Refine UX.

## Build gate

Green-light the production scan/score engine only when A1 + A2 + A3 PASS. Avoid building 3D extruded volumes / ingress-egress until trust and credibility are proven (per plan section 8, money-pit risk).
