export type MapViewMode = "current" | "monochromeTerrain";

export function isMonochromeMapView(mode: MapViewMode): boolean {
  return mode === "monochromeTerrain";
}
