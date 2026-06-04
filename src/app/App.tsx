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
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { AppLoader } from "./components/ui/app-loader";
import { DirectionProvider } from "@/lib/direction";

// Devices Lab — sandbox for the rebuilt, registry-driven device panel
// (`devices-panel-next/`). Lives on its own route while the design is
// validated; once approved it replaces the panel inside Dashboard.
// Code-split so the mock fixtures + next-gen tree never enter the
// production bundle.
const DevicesLabPage = lazy(() => import("./components/DevicesLabPage"));

// Design System — the manifest-driven successor to `/styleguide`. Mounted on
// its own route while the strangler migration runs; the legacy monolith stays
// live at `/styleguide`. Code-split so its doc modules never enter other
// bundles.
const DesignSystemPage = lazy(() => import("./styleguide/registry/DesignSystem"));

// Video HUD Sandbox — dev-only sandbox for the camera HUD chrome
// (setpoint rail, bottom chrome, compass, connectivity, detections).
// Guarded by `import.meta.env.DEV` so it tree-shakes out of production.
const VideoHudSandbox = import.meta.env.DEV
  ? lazy(() => import("./components/video-hud-sandbox/VideoHudSandbox"))
  : null;

function PlaygroundFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#09090b] text-sm text-neutral-400">
      <AppLoader size={108} label="Loading playground" />
      Loading playground…
    </div>
  );
}

// Handoff Inspector — code-split so the hover/click listeners,
// capture pipeline, and popover only download when the route
// actually mounts the picker. Shipped in production by request:
// operators and designers share the same surface, so the picker
// glyph is part of the production UI.
const HandoffInspector = lazy(() => import("./components/handoff/HandoffInspector"));

/**
 * Renders {@link HandoffInspector} on every route *except* `/demo`.
 * The `/demo` skip stays because the inspector glyph must never appear
 * in a marketing recording, even though the rest of the production
 * surface is identical.
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
          Single application-wide TooltipProvider. The `Tooltip` wrapper no
          longer mounts its own provider per instance, so every consumer reads
          from this one context and shares the same delay-grouping timer. The
          timing (600ms open / 300ms skip) lives on the `TooltipProvider`
          defaults in `components/ui/tooltip`, so no props are needed here.
        */}
        <TooltipProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/fov-test" element={<FovTestPage />} />
              <Route path="/styleguide" element={<StyleguidePage />} />
              <Route
                path="/design-system"
                element={
                  <Suspense fallback={<PlaygroundFallback />}>
                    <DesignSystemPage />
                  </Suspense>
                }
              />
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
              {/*
                Video HUD Sandbox — dev-only sandbox for the camera HUD
                chrome rebuild. Not linked from the main UI; reviewers open
                it directly. Compiles to nothing in production.
              */}
              {VideoHudSandbox && (
                <Route
                  path="/video-hud-sandbox"
                  element={
                    <Suspense fallback={<PlaygroundFallback />}>
                      <VideoHudSandbox />
                    </Suspense>
                  }
                />
              )}
            </Routes>
            <ScopedHandoffInspector />
          </BrowserRouter>
          <DialRoot position="bottom-right" />
        </TooltipProvider>
      </DndProvider>
    </DirectionProvider>
  );
}
