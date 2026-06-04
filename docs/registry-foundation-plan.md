# C2 Registry Foundation Plan

Turning the C2 Hub design system into a **shadcn-style distribution registry** that other internal apps install with `npx shadcn@latest add @c2/...`.

Status: **proposal — review before implementation.** Companion to [design-system-discovery.md](./design-system-discovery.md), [design-system.md](../design-system.md), and the live `registry.json`.

---

## 1. Target (locked with stakeholder)

- **Audience: internal only.** Other apps/teams in our org consume `@c2`. No public-install marketing polish required. (This *supersedes* the "external/CLI consumers out of scope" line in `design-system-discovery.md` §2 — we are now explicitly building the distribution layer, just for an internal audience.)
- **Namespace: single `@c2`.** Everything ships under one namespace served from `https://c2-hub-three.vercel.app/r/{name}.json`. No `@c2-lib` / `@c2-themes` split yet (revisit only if evolution cadences diverge).
- **No auth for now** (internal, low-risk static JSON). Auth is a later, additive concern (see §9).
- **Single repo** (the app *is* the registry source — "Shape A"). No monorepo split yet.

## 2. Mental model (why this works)

A registry is **distribution for source code, not a package**. There is no runtime. We author components + a `registry.json` index, run `shadcn build` → it emits one JSON payload per item into `public/r/`. A consumer's CLI fetches that JSON and **writes the source into their repo** at paths their own `components.json` controls; they then own the code. Foundation work = making those payloads *self-sufficient* so an install actually renders correctly in a fresh app.

## 3. Current state (what already exists)

| Asset | State |
|---|---|
| `registry.json` | ~70 items: `utils`, `use-mobile`, ~45 shadcn primitives, ~20 domain primitives, 3 meta-bundles (`domain-primitives`, `map-kit`, `all`). |
| Build pipeline | `pnpm registry:build` = `shadcn build` + `scripts/registry-postbuild.mjs` (import-path rewrites). |
| Hosting | Deployed on Vercel; `components.json` already lists `@c2` + `@dotmatrix`. |
| Docs | Manifest-driven styleguide (`src/app/styleguide/registry/manifest.json`) + drift guard (`scripts/styleguide-manifest.mjs --check`) tying manifest ↔ registry ↔ handoff ↔ `llms.txt`. |

**Verdict: ~60% there.** The index, items, build, and docs exist. What's missing is everything that makes an install *portable*.

## 4. Gaps that block portable installs (ranked)

1. **The token/theme layer is not distributed — the keystone gap.** Every component depends on CSS variables defined in `src/styles/palette.css` + `src/styles/theme.css` (`--surface-*`, `--slate-1..12`, `--accent-*`, `--border-*`, `--state-*`, `--background`, `--radius`…), the `@theme inline` color mapping, and `@custom-variant dark/rtl/ltr`. The registry only ships `tokens.ts` (JS constants) as `registry:ui`. **No item carries `cssVars` or `css`; there is no `registry:base`/`registry:theme`.** Result: `add @c2/button` lands TSX referencing `border-border` / `text-slate-12` / `bg-[var(--surface)]` with none of those vars defined → visually broken.
2. **No `registry:base` bootstrap.** No one-command setup; new apps would hand-assemble tokens + aliases + namespace registration.
3. **Import-graph / co-location bugs in domain primitives.** e.g. `src/primitives/TargetCard.tsx` imports `@/shared/components/ui/card` (rewritten to `./card`) and `./urgency` — but `urgency` **is not a registry item**, so that import dangles on install; and composed primitives assume sibling co-location they won't have in a consumer repo. Path conventions are inconsistent across three forms (`@/app/components/ui`, `@/shared/components/ui`, `./`).
4. **No fonts shipped.** Heebo / IBM Plex Mono are assumed, not declared as `registry:font` (or carried by `base`).
5. **No registry-level CI guard.** The styleguide manifest is checked, but nothing schema-validates emitted item JSON, scans imports vs `registryDependencies`, or checks for orphan/dangling files. Build output isn't produced in CI.
6. **Generic hosting.** `vercel.json` rewrites everything to `index.html` (static `/r/*.json` still resolves, but no branded-root content negotiation, no cache headers tuned for registry JSON).
7. **No lifecycle/versioning metadata** (`meta.lifecycle`).

## 5. The keystone: how to distribute the C2 theme (DX decision)

**Recommendation: ship a `registry:base` item (`@c2/base`) as the primary bootstrap, plus a thin `registry:theme` (`@c2/theme`) for re-skinning existing apps.**

Why `registry:base` over the alternatives (validated against shadcn CLI v4 docs, 2026):

| Type | Ships cssVars | Ships `css` (`@import`/`@layer`/`@keyframes`) | Ships `config` (style/aliases/registries/rtl) | Fit for C2 |
|---|---|---|---|---|
| `registry:theme` | yes | **no** | **no** | ✗ too thin — C2 needs `@layer base`, keyframes, substrate rules |
| `registry:style` | yes | yes | partial (extends shadcn) | ~ okay but oriented at `init` overrides |
| **`registry:base`** | **yes** | **yes** | **yes** | ✓ complete design-system bootstrap; what `shadcn create` uses |

### What `@c2/base` will carry

- **`config`**: `{ style: "c2", iconLibrary: "lucide", rtl: true, tsx: true, rsc: false, tailwind: { baseColor: "neutral", cssVariables: true }, aliases: {…}, registries: { "@c2": "https://c2-hub-three.vercel.app/r/{name}.json" } }`. (`rtl: true` matters — C2 is RTL-aware.)
- **`cssVars`**: full light + dark token sets translated from `palette.css` + `theme.css` — the slate ramp, surface ladder, shadows, borders, accents, state overlays, dispositions, plus the shadcn-compat vars (`--background`, `--foreground`, `--radius`, chart/sidebar vars).
- **`css`**: `@custom-variant dark/rtl/ltr`, the `@theme inline` color mapping, `@layer base` resets, `[data-substrate]` painting rules, keyframes (`missile-pulse`), scrollbar utilities.
- **`dependencies` / `devDependencies`**: `class-variance-authority`, `tailwind-merge`, `clsx`, `tw-animate-css`, `lucide-react`, etc.
- **`registryDependencies`**: `utils` + the core primitive set (`button`, `input`, `card`, `dialog`, …) + fonts.

### ⚠️ Known risk to de-risk first (Phase 1 spike)

C2's CSS uses Tailwind v4 at-rules — `@theme inline` and `@custom-variant` — that go beyond the common `@layer base` / `@keyframes` examples in the docs. The CLI serializes `css` from a JSON object, and it's **unverified** that it round-trips `@theme inline` and `@custom-variant` faithfully. **Phase 1 must spike this with a real `shadcn add` into a scratch app** and confirm the emitted CSS is correct. Fallback if not: ship those at-rules as a `registry:file` CSS partial the consumer `@import`s, referenced from `base`.

## 6. Phased plan

### Phase 1 — Portable theme (the keystone) ✦ highest value
- Author `registry:base` `@c2/base` with the full `cssVars` + `css` + `config` (per §5).
- Author thin `registry:theme` `@c2/theme` (cssVars only) for re-skin use.
- Spike: `shadcn build`, then `shadcn add` `@c2/base` into a throwaway Vite+Tailwind-v4 app; confirm tokens render and `@theme inline`/`@custom-variant` survive. Resolve via CSS-partial fallback if needed.
- **Acceptance:** a scratch app that installs `@c2/base` then `@c2/button` renders the button with correct C2 styling, light + dark.

### Phase 2 — Fonts
- Add `registry:font` items `font-heebo` (`--font-sans`) and `font-ibm-plex-mono` (`--font-mono`), with `dependency` fallbacks (`@fontsource-variable/*`) for non-Next consumers. Reference them from `@c2/base`.
- **Acceptance:** installed app picks up Heebo/IBM Plex Mono without manual font wiring.

### Phase 3 — Fix the import graph + path conventions
- Pick one canonical alias convention; align `registry-postbuild.mjs` rewrites and `manifest.json` `importPath`s to it (kill the `@/shared/...` vs `@/app/components/ui` drift).
- Add missing items (`urgency`, any other dangling sibling imports of domain primitives).
- Add `target` placeholders (`@ui/`, `@components/`, `@lib/`, `@hooks/`) so composed primitives resolve regardless of consumer layout.
- **Acceptance:** `add @c2/target-card` into a scratch app installs with zero dangling imports and type-checks.

### Phase 4 — CI + governance guardrails
- CI job: `pnpm registry:build`, then ajv-validate every `public/r/*.json` against the official `registry-item.json` schema; import-scan each item to assert `registryDependencies` completeness; fail on orphan/missing files or items missing `description`.
- Add `meta.lifecycle` (`stable` | `preview` | `deprecated`) to items.
- Optional: Vercel headers/content negotiation for `/r/*.json`.
- **Acceptance:** CI fails on a deliberately broken item (missing dep / dangling file).

### Phase 5 (optional, later)
- Namespace split, auth (Bearer token), MCP-readiness polish, telemetry on install logs.

## 7. Sequencing note

Phase 1 is independently shippable and unblocks every consumer; do it first and validate with the scratch-app spike before investing in Phases 3–4. Phases 2–4 can proceed in parallel once Phase 1's theme format is proven.

## 8. Open decisions / assumptions

- **Style name**: proposing `"c2"`. (Confirm.)
- **Core primitive set for `base`**: proposing `button, input, card, dialog, select, dropdown-menu, popover, tooltip, badge, separator, tabs, label` + `utils` + fonts. (Confirm the list.)
- **Scratch-app target stack** for the spike: Vite + React 18 + Tailwind v4 (mirrors our own). (Confirm.)
- **Light mode**: `palette.css` has a `.light` opt-in but production is dark-only. Do consumers need light mode in `base`, or dark-only with light as opt-in? (Confirm — affects how much we translate.)

## 9. Risks

- **CLI CSS round-trip** for `@theme inline` / `@custom-variant` (see §5) — primary technical risk; spiked in Phase 1.
- **Token surface is large** — `palette.css` is the single source of truth; translating it to `cssVars` duplicates it. Mitigation: generate the `base` `cssVars`/`css` from the CSS files via a small build script so there's one source, not two (decide in Phase 1).
- **Domain primitives carry app assumptions** (e.g. `FilterBar` needs consumer types). Mark these `meta.lifecycle: preview` and document required consumer-provided types in `docs`.
- **Re-`add` is the only update lever** (consumers own code). Acceptable for internal; document it.
