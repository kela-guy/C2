/**
 * `/theme-sandbox` route. DEV-only.
 *
 * Mounts the real `C2AppShell` inside a wrapper div whose inline
 * style scopes a recomputed palette — slate ramp, surfaces, borders,
 * state overlays — onto the subtree. Tailwind utility classes
 * (bg-surface-3, text-slate-12, etc.) resolve through that scope, so
 * the entire shell repaints live as the picker mutates state.
 *
 * Nothing here writes to global CSS, no provider is installed, no
 * route except this one is affected.
 */

import { useMemo } from "react";

import { ThemePickerPanel } from "./ThemePickerPanel";
import { ThemeSandboxAppShell } from "./ThemeSandboxAppShell";
import { buildOverrideStyle } from "./themeTokens";
import { useThemeState } from "./useThemeState";

export default function ThemeSandbox() {
  const api = useThemeState();

  const { style, cssBlock, accentRgb } = useMemo(() => {
    return buildOverrideStyle(
      {
        hue: api.state.slateHue,
        chromaScale: api.state.slateChromaScale,
        darkL1: api.state.darkL1,
        darkL12: api.state.darkL12,
        lightAccentTune: api.state.lightAccentTune,
        effectiveMode: api.effectiveMode,
      },
      { infoHue: api.state.accentInfoHue ?? undefined },
    );
  }, [
    api.state.slateHue,
    api.state.slateChromaScale,
    api.state.darkL1,
    api.state.darkL12,
    api.state.lightAccentTune,
    api.state.accentInfoHue,
    api.effectiveMode,
  ]);

  const wrapperClass = `theme-sandbox-root relative flex h-screen w-full flex-col bg-surface-1 text-slate-12 ${
    api.effectiveMode === "light" ? "light" : ""
  }`;

  return (
    <div className={wrapperClass} style={style}>
      {/*
       * `.gridblock-root` (gridblock.css) re-declares `--gridblock-*-rgb` as
       * frozen sRGB triplets, so a wrapper-level inline override is shadowed
       * by the bare-class rule. A descendant-selector `<style>` block wins
       * specificity (0-2-0 vs 0-1-0) and keeps rail/iconbtn/panel-row focus
       * shadows tinted with the live slate-12.
       */}
      <style>{`.theme-sandbox-root .gridblock-root { --gridblock-accent-500-rgb: ${accentRgb}; }`}</style>
      <ThemeSandboxAppShell />
      <ThemePickerPanel api={api} cssBlock={cssBlock} />
    </div>
  );
}
