/**
 * Generic types for the Gridblock shell.
 *
 * The shell is content-agnostic — it does not know about targets,
 * cameras, or devices. Callers parameterise the rail tab type via
 * `GridblockRailTab<Id>` so different pages can declare their own
 * tab id unions without forking the shell.
 */

import type { ReactNode } from "react";

export interface GridblockRailTab<Id extends string = string> {
  /** Stable id used for `value` / `onChange` reconciliation. */
  id: Id;
  /** Visible label — also used for the tooltip. */
  label: string;
  /** Lucide / app icon node. ~16px is the rail's native glyph size. */
  icon: ReactNode;
}

/**
 * Map utilities (compass, pitch slider, scale bar) consume a
 * pared-down camera snapshot — the shell itself is map-agnostic
 * but exporting this from one place keeps the type-shape stable
 * across reuses.
 */
export type GridblockSceneMode = "2D" | "3D";

export interface GridblockCameraState {
  headingDeg: number;
  pitchDeg: number;
  heightM: number;
  sceneMode: GridblockSceneMode;
}

export interface GridblockCursorPos {
  lat: number;
  lon: number;
}

export interface GridblockCameraCommands {
  setHeading: (deg: number) => void;
  setPitch: (deg: number) => void;
  zoom: (delta: number) => void;
  setSceneMode: (mode: GridblockSceneMode) => void;
}
