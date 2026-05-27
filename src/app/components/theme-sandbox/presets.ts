/**
 * Curated mood presets. Each preset hydrates the picker's full state
 * (slate hue + chroma scale + dark bookends + optional info-accent
 * shift) so swatching feels like flipping between named designs
 * rather than nudging sliders.
 *
 * Hues are first-pass tunings — iterate live in the sandbox and
 * paste-back the deltas once they feel right.
 */

export interface ThemePreset {
  id: string;
  label: string;
  description: string;
  slateHue: number;
  slateChromaScale: number;
  darkL1: number;
  darkL12: number;
  accentInfoHue?: number;
}

export const PRESETS: ReadonlyArray<ThemePreset> = [
  {
    id: "mineral",
    label: "Mineral",
    description: "Production default — cool blue-gray spine.",
    slateHue: 256,
    slateChromaScale: 1,
    darkL1: 0.165,
    darkL12: 0.965,
  },
  {
    id: "maritime",
    label: "Maritime",
    description: "Deeper blue cast, faintly nautical.",
    slateHue: 220,
    slateChromaScale: 1.2,
    darkL1: 0.155,
    darkL12: 0.97,
    accentInfoHue: 220,
  },
  {
    id: "phosphor",
    label: "Phosphor",
    description: "Cyan-green CRT vibe; reads as 'live signal'.",
    slateHue: 175,
    slateChromaScale: 0.9,
    darkL1: 0.155,
    darkL12: 0.96,
    accentInfoHue: 195,
  },
  {
    id: "carbon",
    label: "Carbon",
    description: "Achromatic neutrals — print-like, hue-free.",
    slateHue: 256,
    slateChromaScale: 0.1,
    darkL1: 0.155,
    darkL12: 0.97,
  },
  {
    id: "sand",
    label: "Sand",
    description: "Warm beige neutral; desert ops mood.",
    slateHue: 75,
    slateChromaScale: 0.8,
    darkL1: 0.175,
    darkL12: 0.96,
    accentInfoHue: 230,
  },
  {
    id: "ember",
    label: "Ember",
    description: "Warm amber spine; high-tempo posture.",
    slateHue: 35,
    slateChromaScale: 1,
    darkL1: 0.165,
    darkL12: 0.965,
  },
  {
    id: "vermillion",
    label: "Vermillion",
    description: "Red-leaning spine; reserved for high-alert briefs.",
    slateHue: 15,
    slateChromaScale: 1.1,
    darkL1: 0.16,
    darkL12: 0.96,
    accentInfoHue: 220,
  },
  {
    id: "heather",
    label: "Heather",
    description: "Magenta-violet wash; analytics-room mood.",
    slateHue: 305,
    slateChromaScale: 1,
    darkL1: 0.16,
    darkL12: 0.965,
    accentInfoHue: 285,
  },
  {
    id: "forest",
    label: "Forest",
    description: "Deep green spine; field-ops camo cue.",
    slateHue: 145,
    slateChromaScale: 0.95,
    darkL1: 0.155,
    darkL12: 0.96,
    accentInfoHue: 190,
  },
  {
    id: "twilight",
    label: "Twilight",
    description: "Indigo dusk; lower-energy night posture.",
    slateHue: 280,
    slateChromaScale: 1.05,
    darkL1: 0.15,
    darkL12: 0.96,
    accentInfoHue: 245,
  },
];

export const DEFAULT_PRESET_ID = "mineral";
