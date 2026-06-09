# 01 — Recruitment & Screening Plan

Deliverable for to-do `recruit`. Purpose: line up the right people to validate the problem behind the Onboarding Auto-Coverage feature BEFORE any build. This is the kit a PM/researcher uses to recruit; it is not a claim that recruiting is done.

Related: [Discovery plan](../../.cursor/plans) section 3 (segments) and section 6 (assumptions A1–A5).

## Segments and sample sizes

Minimum 5 completed interviews per segment (discovery hard rule). Aim to over-recruit by ~40% to absorb no-shows.

- Primary — Just-assigned commander (first-time base setup)
  - Target: 6 completed (recruit 8)
  - Why: owns the core JTBD ("get my base protected fast and trust it").
- Secondary — Experienced commander re-deploying to a new/changed site
  - Target: 5 completed (recruit 7)
  - Why: has a strong mental model of "good layout"; best judge of credibility (A2) and false-confidence risk (A3).
- Supporting — Setup operator / systems integrator (physically installs assets)
  - Target: 5 completed (recruit 7)
  - Why: knows real placement constraints (power, terrain access, line-of-sight, fields of fire) that any auto-suggested layout must respect.

If access to real commanders is restricted, use vetted SME proxies (ex-service, defense-systems FAEs, trainers) and label every finding as "proxy" so it is weighted accordingly.

## Screener questionnaire

Use to qualify before booking. Disqualify (DQ) rules in brackets.

1. In the last 24 months, have you been responsible for setting up or re-planning the defensive asset layout of a site/base?
   - Yes, led it / Yes, assisted / No [DQ if No]
2. Roughly how many times have you done a first-time setup of a new site? (0 / 1–2 / 3+)
   - Use to bucket Primary (1–2) vs Secondary (3+).
3. Which asset families have you personally planned or positioned? (multi-select: cameras, radars, lidar, jammers/ECM, counter-drone/Gotcha-type, launchers/weapon systems, floodlights, PA) [DQ if none]
4. When you set up a new site, how do you currently decide where things go? (open text) [DQ if "I don't / someone else does entirely"]
5. Do you personally judge whether a site is "sufficiently covered"? (Yes / No) [prefer Yes]
6. Comfort with a digital map/3D tool for planning (1–5). [no DQ; record for analysis]
7. Availability for a 45–60 min recorded session in the next 2 weeks? (Yes/No) [DQ if No]
8. Any constraint on discussing this work (classification, NDA)? (open text) — route sensitive participants to an approved environment.

## Channels

- Internal: existing customer/design-partner bases, sales-engineering contacts, training cadre.
- External proxies: veteran networks, defense-tech communities, integrator partners.
- Snowball: ask each participant for one referral matching a different segment.

## Logistics & ethics

- Session length: 45–60 min, recorded with consent; store recordings in the approved environment only.
- Incentive: per policy (often non-cash for serving personnel — coordinate with legal/command).
- Consent script: purpose, recording, right to stop, no solution being sold.
- Sensitivity: never request classified site coordinates; use generic terrain or the demo site near `SITE_CENTER` (32.4666, 35.0013) for any map-based prompt.

## Scheduling tracker (fill during recruiting)

| Participant | Segment | Screener pass | Booked | Completed | Proxy? | Notes |
|---|---|---|---|---|---|---|
| | | | | | | |

## Exit criteria for this to-do

- [ ] ≥6 Primary, ≥5 Secondary, ≥5 Supporting booked (or proxies clearly labeled)
- [ ] Consent + sensitivity handling confirmed for each
- [ ] Sessions scheduled within the 2-week discovery window
