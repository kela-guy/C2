/**
 * Picker state for the theme sandbox.
 *
 * State is sandbox-local — no Context, no global store. Persists to
 * `localStorage` so a refresh doesn't blow away the operator's tuning.
 * Scoped to a versioned key so a schema change doesn't read stale data.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DEFAULT_PRESET_ID, PRESETS, type ThemePreset } from "./presets";
import type { EffectiveMode } from "./themeTokens";

const STORAGE_KEY = "theme-sandbox-v1";
const USER_PRESET_ID_PREFIX = "user-";
const USER_PRESET_LABEL_MAX = 32;

export type ThemeMode = "dark" | "light" | "auto";

/**
 * Operator-saved tuning. Persisted to `localStorage` alongside the
 * picker's live state — IDs are namespaced (`user-…`) so they never
 * collide with the built-in preset ids in `presets.ts`.
 */
export interface UserPreset {
  id: string;
  label: string;
  slateHue: number;
  slateChromaScale: number;
  darkL1: number;
  darkL12: number;
  accentInfoHue: number | null;
}

export interface ThemeState {
  mode: ThemeMode;
  presetId: string | null;
  slateHue: number;
  slateChromaScale: number;
  darkL1: number;
  darkL12: number;
  accentInfoHue: number | null;
  /**
   * Light-mode-only accent tuning. `0` keeps the dark-mode recipe
   * (vivid L≈0.70-0.79, soft L≈0.4) — accents look exactly the same
   * in light mode as they do on dark. `1` lerps vivid accents toward
   * L≈0.50 (high contrast on white) and soft accents toward L≈0.92
   * (subtle pastel chips). Anything in between is a soft transition.
   * Ignored in dark mode.
   */
  lightAccentTune: number;
  /** Operator-saved tunings, rendered in the "My presets" row. */
  userPresets: UserPreset[];
}

const DEFAULT_PRESET = PRESETS.find((p) => p.id === DEFAULT_PRESET_ID) ?? PRESETS[0];

const DEFAULT_STATE: ThemeState = {
  mode: "dark",
  presetId: DEFAULT_PRESET.id,
  slateHue: DEFAULT_PRESET.slateHue,
  slateChromaScale: DEFAULT_PRESET.slateChromaScale,
  darkL1: DEFAULT_PRESET.darkL1,
  darkL12: DEFAULT_PRESET.darkL12,
  accentInfoHue: DEFAULT_PRESET.accentInfoHue ?? null,
  lightAccentTune: 0,
  userPresets: [],
};

function finite(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nullableFinite(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sanitizeLabel(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, USER_PRESET_LABEL_MAX);
}

function hydrateUserPresets(raw: unknown): UserPreset[] {
  if (!Array.isArray(raw)) return [];
  const rows: UserPreset[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const id = typeof e.id === "string" ? e.id : "";
    const label = sanitizeLabel(e.label);
    if (!id || !label) continue;
    const slateHue = finite(e.slateHue, NaN);
    const slateChromaScale = finite(e.slateChromaScale, NaN);
    const darkL1 = finite(e.darkL1, NaN);
    const darkL12 = finite(e.darkL12, NaN);
    if (
      !Number.isFinite(slateHue) ||
      !Number.isFinite(slateChromaScale) ||
      !Number.isFinite(darkL1) ||
      !Number.isFinite(darkL12)
    ) {
      continue;
    }
    rows.push({
      id,
      label,
      slateHue,
      slateChromaScale,
      darkL1,
      darkL12,
      accentInfoHue: nullableFinite(e.accentInfoHue),
    });
  }
  return rows;
}

function readPersisted(): ThemeState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ThemeState>;
    return {
      mode: (parsed.mode as ThemeMode) ?? DEFAULT_STATE.mode,
      presetId: parsed.presetId ?? null,
      slateHue: finite(parsed.slateHue, DEFAULT_STATE.slateHue),
      slateChromaScale: finite(
        parsed.slateChromaScale,
        DEFAULT_STATE.slateChromaScale,
      ),
      darkL1: finite(parsed.darkL1, DEFAULT_STATE.darkL1),
      darkL12: finite(parsed.darkL12, DEFAULT_STATE.darkL12),
      accentInfoHue: nullableFinite(parsed.accentInfoHue),
      lightAccentTune: finite(
        parsed.lightAccentTune,
        DEFAULT_STATE.lightAccentTune,
      ),
      userPresets: hydrateUserPresets(parsed.userPresets),
    };
  } catch {
    return null;
  }
}

function persist(state: ThemeState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota / private mode — best-effort.
  }
}

function usePrefersDark(): boolean {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return true;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return dark;
}

export interface UseThemeStateApi {
  state: ThemeState;
  effectiveMode: EffectiveMode;
  setMode: (mode: ThemeMode) => void;
  selectPreset: (preset: ThemePreset) => void;
  setSlateHue: (hue: number) => void;
  setSlateChromaScale: (scale: number) => void;
  setDarkL1: (value: number) => void;
  setDarkL12: (value: number) => void;
  setLightAccentTune: (value: number) => void;
  /**
   * Snapshot the current knob state under `label` and activate it.
   * Returns `null` if the label sanitises to an empty string.
   */
  saveCurrentAsPreset: (label: string) => UserPreset | null;
  selectUserPreset: (preset: UserPreset) => void;
  deleteUserPreset: (id: string) => void;
  reset: () => void;
}

export function useThemeState(): UseThemeStateApi {
  const [state, setState] = useState<ThemeState>(
    () => readPersisted() ?? DEFAULT_STATE,
  );
  const prefersDark = usePrefersDark();

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    persist(state);
  }, [state]);

  const effectiveMode: EffectiveMode =
    state.mode === "auto" ? (prefersDark ? "dark" : "light") : state.mode;

  const setMode = useCallback((mode: ThemeMode) => {
    setState((prev) => ({ ...prev, mode }));
  }, []);

  const selectPreset = useCallback((preset: ThemePreset) => {
    setState((prev) => ({
      ...prev,
      presetId: preset.id,
      slateHue: preset.slateHue,
      slateChromaScale: preset.slateChromaScale,
      darkL1: preset.darkL1,
      darkL12: preset.darkL12,
      accentInfoHue: preset.accentInfoHue ?? null,
      // Keep the user's lightAccentTune across preset swaps — it's a
      // light-mode-only adjustment unrelated to the preset's mood.
      lightAccentTune: prev.lightAccentTune,
    }));
  }, []);

  const setSlateHue = useCallback((hue: number) => {
    setState((prev) => ({
      ...prev,
      slateHue: ((hue % 360) + 360) % 360,
      presetId: null,
    }));
  }, []);

  const setSlateChromaScale = useCallback((scale: number) => {
    setState((prev) => ({
      ...prev,
      slateChromaScale: clamp(scale, 0, 2),
      presetId: null,
    }));
  }, []);

  const setDarkL1 = useCallback((value: number) => {
    setState((prev) => ({
      ...prev,
      darkL1: clamp(value, 0.08, 0.3),
      presetId: null,
    }));
  }, []);

  const setDarkL12 = useCallback((value: number) => {
    setState((prev) => ({
      ...prev,
      darkL12: clamp(value, 0.85, 1),
      presetId: null,
    }));
  }, []);

  const setLightAccentTune = useCallback((value: number) => {
    setState((prev) => ({
      ...prev,
      lightAccentTune: clamp(value, 0, 1),
    }));
  }, []);

  const stateRef = useRef(state);
  stateRef.current = state;

  const saveCurrentAsPreset = useCallback(
    (rawLabel: string): UserPreset | null => {
      const label = sanitizeLabel(rawLabel);
      if (!label) return null;
      const current = stateRef.current;
      const preset: UserPreset = {
        id: `${USER_PRESET_ID_PREFIX}${randomId()}`,
        label,
        slateHue: current.slateHue,
        slateChromaScale: current.slateChromaScale,
        darkL1: current.darkL1,
        darkL12: current.darkL12,
        accentInfoHue: current.accentInfoHue,
      };
      setState((prev) => ({
        ...prev,
        presetId: preset.id,
        userPresets: [...prev.userPresets, preset],
      }));
      return preset;
    },
    [],
  );

  const selectUserPreset = useCallback((preset: UserPreset) => {
    setState((prev) => ({
      ...prev,
      presetId: preset.id,
      slateHue: preset.slateHue,
      slateChromaScale: preset.slateChromaScale,
      darkL1: preset.darkL1,
      darkL12: preset.darkL12,
      accentInfoHue: preset.accentInfoHue,
      // Light-mode tune is operator-global, not preset-bound — see selectPreset.
      lightAccentTune: prev.lightAccentTune,
    }));
  }, []);

  const deleteUserPreset = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      userPresets: prev.userPresets.filter((p) => p.id !== id),
      presetId: prev.presetId === id ? null : prev.presetId,
    }));
  }, []);

  const reset = useCallback(() => {
    // Reset clears the live tuning but preserves saved presets so the
    // operator's library survives an accidental reset.
    setState((prev) => ({ ...DEFAULT_STATE, userPresets: prev.userPresets }));
  }, []);

  return useMemo(
    () => ({
      state,
      effectiveMode,
      setMode,
      selectPreset,
      setSlateHue,
      setSlateChromaScale,
      setDarkL1,
      setDarkL12,
      setLightAccentTune,
      saveCurrentAsPreset,
      selectUserPreset,
      deleteUserPreset,
      reset,
    }),
    [
      state,
      effectiveMode,
      setMode,
      selectPreset,
      setSlateHue,
      setSlateChromaScale,
      setDarkL1,
      setDarkL12,
      setLightAccentTune,
      saveCurrentAsPreset,
      selectUserPreset,
      deleteUserPreset,
      reset,
    ],
  );
}

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Sandbox-only fallback — never expected in supported browsers.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
