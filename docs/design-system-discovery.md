# Design System Discovery

Output of the `/product-discovery` phase for the C2 Hub design system initiative. This is the committed, citable scope that drives the manifest-driven refactor of the styleguide. Companion to the in-app docs at `/design-system` and the written reference in [design-system.md](../design-system.md).

## 1. Problem (validated, problem-first)

We already have a published `@c2` registry, a handoff inspector + picker (`⌘⇧P`), a `design-system.md` reference, and an `llms.txt`. The real problem is **not** "no design system":

> Docs are hand-authored in a ~5,700-line `StyleguidePage.tsx` monolith, structurally flat, and kept in sync with four *parallel* hand-maintained lists that have no enforced link — so they drift, which undermines handoff fidelity (the #1 pain), bloats the code, and provides no Primitive → Block hierarchy.

The four lists that must agree but have no enforced link:

- Section rendering in `src/app/components/StyleguidePage.tsx`
- Nav in `src/app/styleguide/navConfig.ts`
- Handoff hint → section map `STYLEGUIDE_SECTION_BY_HINT` in `src/app/components/handoff/styleguideLink.ts`
- Registry titles/descriptions in `registry.json`

## 2. Segments + Jobs-to-be-Done

| Segment | Job-to-be-done |
| --- | --- |
| Internal devs | Find the right primitive/block, see props + a copyable usage, don't fork. |
| Designers (primary) | Point at any element via the picker and land on its exact spec/states. |
| AI agents | Read a machine-readable manifest of props/anatomy/states to generate correct code. |
| Stakeholders | Browse states/flows visually without reading code. |

Out of scope: external/CLI registry consumers — no public install polish needed, which simplifies DX.

## 3. Competitive teardown (reverse-engineered from live docs)

- **shadcn/ui** — per-component anatomy: Preview hero → Installation (CLI/Manual tabs) → Usage → caveats → many small named Examples (each copyable) → API Reference props table. Blocks = full sections. We already have `CodeTab` + `PropsTable` analogues to reuse.
- **base-ui** — per-component anatomy: Preview → **Anatomy** (compound parts) → Examples → **per-part API** with props + **`data-*` attribute tables** + CSS variables + State types. The Anatomy section *is* our Primitive → Block story; the `data-*` tables map directly onto our `data-handoff-component` stamps.
- **coss.com/ui** — flat browsable catalog of "particles" + a command palette, explicitly "built for developers and AI."

Adopted patterns: tabbed Preview/Source/Files, per-example copy, an **Anatomy section for Blocks**, **data-attribute tables wired to handoff**, command-palette browse, and an AI-first manifest.

## 4. Decisions (locked)

- **Source of truth: manifest-driven.** Each component has a typed meta entry; docs, nav, handoff map, registry cross-check, and `llms.txt` all *read* from it.
- **Migration: incremental strangler.** Prove the pattern on exemplars, then migrate in waves; delete monolith chunks as each lands. `/styleguide` stays live; the new surface mounts at `/design-system`.
- **"Block" = anything composed from 2–3+ primitives** (TargetCard, DeviceCard, DevicesPanel). Primitives are atomic.
- **IA: two tiers — Primitives and Blocks** — each browsable, with Block docs carrying an Anatomy section that links to constituent primitives.

## 5. Target architecture

```
Component Manifest (typed meta per component)
 ├─ nav (generated)
 ├─ ComponentDoc renderer (generic template)
 ├─ styleguideLink hint map (generated)
 ├─ llms.txt component index (generated at build)
 └─ registry.json cross-check (drift guard)
```

- The drift-sensitive data lives in `src/app/styleguide/registry/manifest.json` (a plain JSON single source readable by both the app and the node build script — no extra tooling needed).
- The app types it via `src/app/styleguide/registry/manifest.ts` and joins it with co-located doc modules in `src/app/styleguide/docs/<id>.doc.tsx` (JSX examples, raw source). Registry component files stay clean — docs never ship in the registry.
- `scripts/styleguide-manifest.mjs` emits the generated handoff hint map + `llms.txt` component index and asserts (`--check`) that every manifest `registryName` exists in `registry.json` and every handoff hint is unique — the CI drift guard.

## 6. Success metrics + falsifiable assumptions

- **Handoff:** 100% of documented `data-handoff-component` hints resolve to a real, specific section (no `#top` fallbacks for documented parts). Test: `node scripts/styleguide-manifest.mjs --check`.
- **Leanness:** `StyleguidePage.tsx` trends from ~5,700 lines toward a thin shell; each component doc is an isolated module.
- **Drift:** registry / nav / handoff / llms regenerate from the manifest; the check fails CI if any diverges.
- **DX (assumption):** a dev can land on a block, read its Anatomy, and copy a working usage in under ~30s without opening source.
- **Craft:** every migrated doc passes the ui-craft gate in §7.

## 7. UI-craft direction + critique gate

The styleguide is itself a UI product, so it gets the `/ui-craft` treatment.

**Intent (who / what / feel):** a dev wiring a tactical C2 screen and a designer doing handoff, in a dark control-room context — instrument-grade, cold like a terminal, dense like a tactical console with quiet depth. Reject the AI-default look (Inter + purple gradients, generic "clean modern" docs, harsh borders).

**Surface model + hierarchy:** the live Preview is the single dominant element per doc (one focal point); catalog/nav + Anatomy + Props are supporting context (progressive disclosure); picker, command palette, and state/severity chips are ambient. Trust comes from surfacing Anatomy + real props + every state, not burying them.

**Craft invariants (encode as constraints):**

- Depth: ONE strategy — layered transparent box-shadow rings (`0 0 0 1px rgba(255,255,255,0.06)`), never harsh solid borders or mixed approaches.
- Concentric radius: `outer = inner + padding` on the canvas and every nested preview tile.
- Full state set is mandatory per doc: default / hover / active / focus-visible / disabled, plus loading / empty / error for data displays — modeled in the manifest `states`, not optional.
- Typography: `tabular-nums` on dynamic/telemetry values, `text-wrap: balance` on headings, font smoothing at root.
- Animation: `transform` / `opacity` only, no `transition: all`, ease-out entrances, `prefers-reduced-motion` respected.
- Color carries meaning: keep the single tactical threat-accent system; no decorative color/gradients in docs chrome.
- Controls: command palette + selects built on accessible primitives (cmdk / Radix) with visible focus, keyboard nav, 44px hit targets.

**Per-doc pre-delivery gate:** full state set rendered, concentric radii, shadow-not-border depth, tabular-nums, balanced headings, focus-visible, reduced-motion, transform/opacity-only animation, no layout shift on hover, icon-only buttons have `aria-label`, color is never the only signal. Pass the squint test (hierarchy survives blur) and the swap test (couldn't be any generic AI docs).

## 8. Sequencing

- **Phase 0:** commit this discovery doc.
- **Phase 1:** manifest schema + generic `ComponentDoc` template + new two-tab shell + command palette — built to the §7 craft invariants from the start.
- **Phase 2:** migrate one primitive (`ActionButton`) + one block (`TargetCard`) as exemplars; wire handoff map + llms from the manifest; validate the DX assumption and run the per-doc craft gate as the reference bar.
- **Phase 3:** migrate remaining sections in waves; each must pass the craft gate; delete monolith sections as they land; keep the drift guard green.
