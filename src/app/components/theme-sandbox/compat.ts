/**
 * Theme-sandbox compatibility layer.
 *
 * The real production components (ListOfSystems, TargetCard, FilterBar,
 * DevicesPanel) paint from hardcoded values — `bg-[#141414]` classes,
 * inline `backgroundColor: SURFACE.level*` styles from
 * `src/primitives/tokens.ts`, `text-zinc-*` utilities, and sky-500 as the
 * de-facto interactive accent. None of that responds to the CSS variables
 * the sandbox writes.
 *
 * This stylesheet — scoped under `[data-theme-sandbox-scope]` and applied
 * ONLY inside the sandbox route — re-targets those hardcoded slots onto
 * the live tokens so the operator's background / primary picks re-skin the
 * real UI. `!important` is required to beat both Tailwind utilities and
 * the inline `style={{ backgroundColor }}` props (important declarations
 * win over non-important inline styles).
 *
 * Deliberately unmapped:
 *   - severity / affiliation icon tints (operator signalling, must not
 *     drift with theme experiments),
 *   - white-alpha hover washes (they read correctly on any dark surface),
 *   - one-off chip colors.
 *
 * None of this affects production: the attribute only exists on the
 * sandbox root, and this module is only imported by the DEV-gated route.
 */

const S = '[data-theme-sandbox-scope]';

export const compatStyles = `
/* ── Substrates ─────────────────────────────────────────────── */

/* ListOfSystems sticky header (tab bar + filter bar) */
${S} .bg-\\[\\#141414\\] { background-color: var(--surface-2) !important; }

/* TargetCard shell — inline backgroundColor: SURFACE.level2 */
${S} [data-slot="card"] { background-color: var(--surface-3) !important; }

/* TargetCard expanded content well — inline SURFACE.level1 */
${S} [data-slot="collapsible-content"] > .flex.flex-col.gap-px {
  background-color: var(--surface-2) !important;
}

/* DevicesPanel aside — inline SURFACE.level1 */
${S} aside[data-handoff-component="devices-panel"] {
  background-color: var(--surface-2) !important;
}

/* Target sidebar aside — inline SURFACE.level1 (mirrors Dashboard's aside) */
${S} aside[data-handoff-component="target-list"] {
  background-color: var(--surface-2) !important;
}

/* ── Text tiers (zinc ramp → slate ramp) ────────────────────── */

${S} .text-white   { color: var(--slate-12) !important; }
${S} .text-zinc-100 { color: var(--slate-12) !important; }
${S} .text-zinc-200 { color: var(--slate-11) !important; }
${S} .text-zinc-300 { color: var(--slate-11) !important; }
${S} .text-zinc-400 { color: var(--slate-10) !important; }
${S} .text-zinc-500 { color: var(--slate-9)  !important; }
${S} .text-zinc-600 { color: var(--slate-8)  !important; }
${S} .text-white\\/70 { color: var(--slate-11) !important; }

/* CardHeader title / subtitle — inline hex colors */
${S} [data-slot="card"] h2 { color: var(--slate-12) !important; }
${S} [data-slot="card"] .flex.flex-col.min-w-0 > span {
  color: var(--slate-9) !important;
}

/* ── Borders / hairlines ────────────────────────────────────── */

${S} .border-white\\/10 { border-color: var(--border-subtle) !important; }
${S} .border-white\\/5  { border-color: var(--border-subtle) !important; }
/* Active-tab underline in ListOfSystems */
${S} .border-white { border-color: var(--slate-12) !important; }

/* ── Interactive accent (sky-500 family → picked primary) ───── */

/* FilterBar active-filter chip fill */
${S} .bg-sky-500\\/\\[0\\.12\\] {
  background-color: color-mix(in oklch, var(--primary-color) 16%, transparent) !important;
}
/* FilterBar active-filter option text */
${S} .text-sky-100 {
  color: color-mix(in oklch, var(--primary-color) 45%, var(--slate-12)) !important;
}
/* Search focus ring */
${S} .focus-visible\\:ring-sky-400\\/40:focus-visible {
  --tw-ring-color: color-mix(in oklch, var(--primary-color) 45%, transparent) !important;
}

/* ── Buttons (customizer-driven stroke) ────────────────────────
   The Button primitive's fill (layered white opacities) stays natural;
   only the hairline borders and the white CTA are remapped so the
   operator can still steer stroke color and CTA hue via Primary. */

/* Raw buttons with hairline borders (e.g. MapDrawPanel Cancel) */
${S} button.border-white\\/10,
${S} button.border-white\\/15 {
  border-color: var(--button-border) !important;
}

/* White CTA buttons (e.g. MapDrawPanel Save) → primary */
${S} button.bg-white {
  background-color: var(--primary-color) !important;
  color: var(--primary-foreground-color) !important;
}
${S} button.hover\\:bg-white\\/90:hover {
  background-color: color-mix(in oklch, var(--primary-color) 90%, white) !important;
}

/* ── Radix Slider (ui/slider.tsx) ──────────────────────────────
   Track paints from bg-muted (already theme-driven), Range from
   bg-primary (already theme-driven), but the Thumb is hardcoded
   bg-white / border-black. Pin all three to the customizer tokens
   so the whole slider — including Line Thickness in the map-draw
   panel — repaints when Primary changes. */
${S} [data-slot="slider-track"],
${S} [data-slot="slider"] [data-slot="slider-track"] {
  background-color: var(--surface-4) !important;
}
${S} [data-slot="slider-range"],
${S} [data-slot="slider"] [data-slot="slider-range"] {
  background-color: var(--primary-color) !important;
}
${S} [data-slot="slider-thumb"],
${S} [data-slot="slider"] [data-slot="slider-thumb"] {
  background-color: var(--primary-color) !important;
  border-color: var(--primary-foreground-color) !important;
}

/* ── Map-draw overlay: vertex dots + polygon handles ───────────
   The polygon vertex dots (MapDrawOverlay: bg-sky-400 for the active
   dot, bg-white for the resting dot + hover:bg-sky-200) and the draft
   polygon dots (plain <div> bg-white) hardcode sky-400 as the accent
   and white as the resting fill. Pin them onto --primary-color so
   the whole polygon-editing surface repaints when Color changes.
   Scoping under [data-map-draw-overlay] keeps the recolor from
   leaking into unrelated .bg-white / .bg-sky-400 tiles. */
${S} [data-map-draw-overlay="true"] .bg-white {
  background-color: var(--primary-color) !important;
}
${S} [data-map-draw-overlay="true"] .bg-white\\/85 {
  background-color: color-mix(in oklch, var(--primary-color) 85%, transparent) !important;
}
${S} [data-map-draw-overlay="true"] .bg-sky-400 {
  background-color: var(--primary-color) !important;
}
${S} [data-map-draw-overlay="true"] .hover\\:bg-sky-200:hover {
  background-color: color-mix(in oklch, var(--primary-color) 60%, transparent) !important;
}
${S} [data-map-draw-overlay="true"] .ring-sky-200\\/80 {
  --tw-ring-color: color-mix(in oklch, var(--primary-color) 60%, transparent) !important;
}

/* ── Dashboard hardcoded surface hexes → sandbox surface ramp ─
   The compat block above only covers bg-[#141414]. The Dashboard
   nav rail is bg-[#1a1a1a] (Dashboard.tsx:1999) and other panels
   paint bg-[#0f0f0f] / bg-[#161616]. Route them onto the ramp so
   Background hue/chroma/lightness sliders retint those areas. */
${S} .bg-\\[\\#1a1a1a\\] { background-color: var(--surface-2) !important; }
${S} .bg-\\[\\#0f0f0f\\] { background-color: var(--surface-1) !important; }
${S} .bg-\\[\\#161616\\] { background-color: var(--surface-2) !important; }
`;
