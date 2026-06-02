import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DialRoot } from "dialkit";
import "dialkit/styles.css";
import { Dashboard } from "./components/Dashboard";
import FovTestPage from "./components/FovTestPage";
import StyleguidePage from "./components/StyleguidePage";
import UrgencyReviewPage from "./components/UrgencyReviewPage";
import { TooltipProvider } from "./components/ui/tooltip";
import { AppLoader } from "./components/ui/app-loader";
import { DirectionProvider } from "@/lib/direction";

// Playground hosts the rebuilt video feature (`camera-v2/`). Code-split so
// neither the production dashboard nor the styleguide bundle drags in
// VideoPanel/CameraFeedTile/HUD overlays until someone opens `/playground`.
const PlaygroundPage = lazy(() => import("./components/PlaygroundPage"));

// Devices Lab — sandbox for the rebuilt, registry-driven device panel
// (`devices-panel-next/`). Lives on its own route while the design is
// validated; once approved it replaces the panel inside Dashboard.
// Code-split so the mock fixtures + next-gen tree never enter the
// production bundle.
const DevicesLabPage = lazy(() => import("./components/DevicesLabPage"));

function PlaygroundFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#09090b] text-sm text-neutral-400">
      <AppLoader size={108} label="Loading playground" />
      Loading playground…
    </div>
  );
}

// Dev-only perf HUD. Lazy-loaded so the import chain (stats-gl, sink,
// observers) is dropped from production bundles via tree-shaking on
// the `import.meta.env.DEV` constant. Becomes visible only when the
// page loads with `?perf=1` (or persisted equivalent) — see
// `src/lib/perf/flags.ts`.
const PerfHud = import.meta.env.DEV
  ? lazy(() => import("./components/perf/PerfHud").then((m) => ({ default: m.PerfHud })))
  : null;

// Handoff Inspector — code-split so the hover/click listeners,
// capture pipeline, and popover only download when the route
// actually mounts the picker. Shipped in production by request:
// operators and designers share the same surface, so the picker
// glyph is part of the production UI.
const HandoffInspector = lazy(() => import("./components/handoff/HandoffInspector"));

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

/**
 * Renders {@link HandoffInspector} on every route *except* `/demo`,
 * mirroring {@link ScopedPerfHud}. The `/demo` skip stays because
 * the inspector glyph must never appear in a marketing recording,
 * even though the rest of the production surface is identical.
 */
function ScopedHandoffInspector() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/demo')) return null;
  return (
    <Suspense fallback={null}>
      <HandoffInspector />
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
                Urgency review — dedicated surface for inspecting every
                TargetCard + MapMarker variant against the unified
                Severity model. Phase 2 of the urgency unification plan
                (see `docs/urgency-unification-plan.md`). Not linked
                from the main UI — reviewers open the route directly.
              */}
              <Route path="/urgency-review" element={<UrgencyReviewPage />} />
              {/*
                Marketing demo route — same Dashboard component as `/`,
                served from a separate URL so we can iterate on demo-only
                tweaks without touching the production surface. Identical
                to `/` today; diverges as adjustments land here.
              */}
              <Route path="/demo" element={<Dashboard demoMode />} />
              {/*
                Playground — sandbox for the rebuilt camera-v2 video feature
                (VideoPanel + tile HUDs). Lives on its own route while the
                design is validated; once approved it replaces the legacy
                CameraViewerPanel inside Dashboard. See
                `src/app/components/camera-v2/README.md` for promotion path.
              */}
              <Route
                path="/playground"
                element={
                  <Suspense fallback={<PlaygroundFallback />}>
                    <PlaygroundPage />
                  </Suspense>
                }
              />
              {/*
                Devices Lab — sandbox route for the registry-driven
                device panel rebuild. Not linked from the main UI;
                reviewers open it directly. Removed at promotion.
              */}
              <Route
                path="/devices-lab"
                element={
                  <Suspense fallback={<PlaygroundFallback />}>
                    <DevicesLabPage />
                  </Suspense>
                }
              />
            </Routes>
            <ScopedPerfHud />
            <ScopedHandoffInspector />
          </BrowserRouter>
          <DialRoot position="bottom-right" />
        </TooltipProvider>
      </DndProvider>
    </DirectionProvider>
  );
}
