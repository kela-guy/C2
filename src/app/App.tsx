import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DialRoot } from "dialkit";
import "dialkit/styles.css";
import { Dashboard } from "./components/dashboard/Dashboard";
import FovTestPage from "./components/FovTestPage";
import StyleguidePage from "./components/StyleguidePage";
import { TooltipProvider } from "./components/ui/tooltip";
import { DirectionProvider } from "@/lib/direction";

// Dev-only perf HUD. Lazy-loaded so the import chain (stats-gl, sink,
// observers) is dropped from production bundles via tree-shaking on
// the `import.meta.env.DEV` constant. Becomes visible only when the
// page loads with `?perf=1` (or persisted equivalent) — see
// `src/lib/perf/flags.ts`.
const PerfHud = import.meta.env.DEV
  ? lazy(() => import("./components/perf/PerfHud").then((m) => ({ default: m.PerfHud })))
  : null;

/**
 * Renders {@link PerfHud} on every route *except* `/demo`. The
 * marketing demo is recording-focused — the perf overlay is a dev
 * tool that must never appear in a marketing capture, even though
 * the rest of the dev environment (Vite, source maps, etc.) is
 * unchanged. Compiles to `null` in production via the
 * `import.meta.env.DEV` guard at the module-level `PerfHud` const.
 */
function ScopedPerfHud() {
  const { pathname } = useLocation();
  if (!PerfHud) return null;
  if (pathname.startsWith('/demo')) return null;
  return (
    <Suspense fallback={null}>
      <PerfHud />
    </Suspense>
  );
}

export default function App() {
  return (
    // DirectionProvider owns the `'rtl' | 'ltr'` state, mirrors it onto
    // `<html dir>` + `<html lang>`, persists to localStorage, and wraps
    // Radix's own DirectionProvider so every Radix primitive
    // (DropdownMenu, ContextMenu, Tooltip, Popover, …) inherits the
    // same direction without each consumer setting `dir` manually.
    // See `src/lib/direction/DirectionProvider.tsx`.
    <DirectionProvider>
      <DndProvider backend={HTML5Backend}>
        {/*
          Single application-wide TooltipProvider. The shadcn `Tooltip`
          wrapper used to mount its own provider per instance — fine for a
          marketing site, expensive on a Dashboard with ~30 simultaneous
          tooltips. Hoisting it here means every `Tooltip` consumer reads
          from the same context (and the same delay-grouping timer).
        */}
        <TooltipProvider delayDuration={0}>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/fov-test" element={<FovTestPage />} />
              <Route path="/styleguide" element={<StyleguidePage />} />
              {/*
                Marketing demo route — same Dashboard component as
                `/`, served from a separate URL so we can iterate on
                demo-only tweaks without touching the production
                surface. Currently identical except for the dark
                monochrome map basemap; diverges further as
                marketing-only adjustments land.
              */}
              <Route path="/demo" element={<Dashboard demoMode />} />
            </Routes>
            <ScopedPerfHud />
          </BrowserRouter>
          <DialRoot position="bottom-right" />
        </TooltipProvider>
      </DndProvider>
    </DirectionProvider>
  );
}
