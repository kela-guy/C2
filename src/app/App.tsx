import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { MotionConfig } from "framer-motion";
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

// Onboarding Lab — previewable auto-coverage onboarding experience
// (`components/onboarding/`). First-run base-protection setup on the live 3D
// map. Not wired into production gating yet; reviewers open it directly.
// Code-split so the Cesium-heavy lab never enters other bundles.
const OnboardingLabPage = lazy(() => import("./components/onboarding/OnboardingLabPage"));

// Design System — the manifest-driven successor to `/styleguide`. Mounted on
// its own route while the strangler migration runs; the legacy monolith stays
// live at `/styleguide`. Code-split so its doc modules never enter other
// bundles.
const DesignSystemPage = lazy(() => import("./styleguide/registry/DesignSystem"));

// Video HUD Sandbox — sandbox for the camera HUD chrome (setpoint rail,
// bottom chrome, compass, connectivity, detections). Shipped in production
// on its own route; not linked from the main UI — reviewers open it directly.
// Code-split so its assets never enter other bundles.
const VideoHudSandbox = lazy(() => import("./components/video-hud-sandbox/VideoHudSandbox"));

// Pathfinder Sandbox — design surface for the multi-step takeoff toast
// (prepare → takeoff → loiter → return). Not linked from the main UI;
// reviewers open it directly. Code-split so it never enters other bundles.
const PathfinderSandbox = lazy(() => import("./components/pathfinder-sandbox/PathfinderSandbox"));

// Handoff Stories — scrollytelling interaction handoff for the Pathfinder
// launch toast (`components/handoff-story/`). A devouringdetails-style narrated
// walkthrough: prose + sticky live stage + debug console + spec contract. Not
// linked from the main UI; reviewers open it directly. Code-split so the kit and
// the Caveat/JetBrains fonts only load on this route.
const PathfinderStory = lazy(() => import("./components/handoff-story/PathfinderStory"));

// Geo Entities Sandbox — dev-only surface for iterating on how geographic
// entities (targets, friendlies, sensors, zones, POIs) are projected, styled,
// and selected before the work lands in the real Cesium/Mapbox map layers.
// Guarded by `import.meta.env.DEV` so it tree-shakes out of production.
const GeoEntitiesSandbox = import.meta.env.DEV
  ? lazy(() => import("./components/geo-entities-sandbox/GeoEntitiesSandbox"))
  : null;

// Geo Entities Layers — dev-only surface that boots the live Dashboard
// with the map-draw panel auto-opened and the 5 design variants of the
// draw panel selectable from a tab row at the top.
const GeoEntitiesLayersSandbox = import.meta.env.DEV
  ? lazy(() => import("./components/geo-entities-sandbox/GeoEntitiesLayersSandbox"))
  : null;

// Geo Entities Type — dev-only surface that boots the live Dashboard with
// the map-draw panel auto-opened and a 5-tab switcher at the top of the
// panel that swaps the zone-type selector's layout (Opt 1..Opt 5).
const GeoEntitiesTypeSandbox = import.meta.env.DEV
  ? lazy(() => import("./components/geo-entities-sandbox/GeoEntitiesTypeSandbox"))
  : null;

// Geo Entities Card — dev-only side-by-side review of 5 candidate designs
// for the Geo Entities LIST card (the LayerRow inside the map-draw panel).
// Each design renders in a 367px mock panel column against a common set
// of sample shapes so a reviewer can compare directions before we port a
// winner into the real panel.
const GeoEntitiesCardSandbox = import.meta.env.DEV
  ? lazy(() => import("./components/geo-entities-sandbox/GeoEntitiesCardSandbox"))
  : null;

// Floating Panel Sandbox — dev-only review of horizontal-only floating
// tool-strip variants (chip pill / segmented / labeled / grouped /
// glass). Each variant renders on top of a mock map frame with a
// shared anchor radio so the reviewer can preview placements before
// we port a winner into `FloatingGeoEntitiesControl`.
const FloatingPanelSandbox = import.meta.env.DEV
  ? lazy(() => import("./components/floating-panel-sandbox/FloatingPanelSandbox"))
  : null;

// Theme Color Sandbox — dev-only surface for auditioning primary /
// secondary / background colors against a lightweight replica of the
// app shell. Writes CSS variables onto its own scoped root so picks
// never leak into the rest of the app. Reach it at /theme-sandbox.
const ThemeSandbox = import.meta.env.DEV
  ? lazy(() => import("./components/theme-sandbox/ThemeSandbox"))
  : null;

// Tweakcn Orange Sandbox — dev-only twin of /theme-sandbox that boots
// with the imported shadcn/tweakcn orange theme mapped onto the platform
// tokens (see theme-sandbox-orange/presets.ts). Reach it at
// /theme-orange-sandbox.
const ThemeOrangeSandbox = import.meta.env.DEV
  ? lazy(() => import("./components/theme-sandbox-orange/ThemeOrangeSandbox"))
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
      {/*
        App-wide reduced-motion handling. `reducedMotion="user"` makes every
        framer-motion animation respect the OS "Reduce Motion" setting:
        transform/position changes drop out and only opacity fades remain, so
        components no longer need to gate transitions by hand. Spring timing
        tokens live in `src/lib/springs.ts`.
      */}
      <MotionConfig reducedMotion="user">
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
                Onboarding Lab — auto-coverage first-run setup on the live 3D
                map. Not linked from the main UI; reviewers open it directly.
              */}
              <Route
                path="/onboarding"
                element={
                  <Suspense fallback={<PlaygroundFallback />}>
                    <OnboardingLabPage />
                  </Suspense>
                }
              />
              {/*
                Video HUD Sandbox — camera HUD chrome sandbox. Shipped in
                production on its own route; not linked from the main UI —
                reviewers open it directly.
              */}
              <Route
                path="/video-hud-sandbox"
                element={
                  <Suspense fallback={<PlaygroundFallback />}>
                    <VideoHudSandbox />
                  </Suspense>
                }
              />
              {/*
                Pathfinder Sandbox — multi-step takeoff toast design surface.
                Not linked from the main UI; reviewers open it directly.
              */}
              <Route
                path="/pathfinder-sandbox"
                element={
                  <Suspense fallback={<PlaygroundFallback />}>
                    <PathfinderSandbox />
                  </Suspense>
                }
              />
              {/*
                Handoff Stories — narrated interaction walkthrough for the
                Pathfinder launch toast. Not linked from the main UI; reviewers
                open it directly.
              */}
              <Route
                path="/handoff"
                element={
                  <Suspense fallback={<PlaygroundFallback />}>
                    <PathfinderStory />
                  </Suspense>
                }
              />
              {/*
                Geo Entities Sandbox — dev-only sandbox for the tactical map's
                geographic entity rendering. Not linked from the main UI;
                reviewers open it directly. Compiles to nothing in production.
              */}
              {GeoEntitiesSandbox && (
                <Route
                  path="/geo-entities-sandbox"
                  element={
                    <Suspense fallback={<PlaygroundFallback />}>
                      <GeoEntitiesSandbox />
                    </Suspense>
                  }
                />
              )}
              {/*
                Geo Entities Layers — DEV-only. Boots the live Dashboard
                with the map-draw panel auto-opened and exposes the
                5-tab design variant switcher at the top of the panel.
                Reach it directly at /geo-entities-layers-sandbox.
              */}
              {GeoEntitiesLayersSandbox && (
                <Route
                  path="/geo-entities-layers-sandbox"
                  element={
                    <Suspense fallback={<PlaygroundFallback />}>
                      <GeoEntitiesLayersSandbox />
                    </Suspense>
                  }
                />
              )}
              {/*
                Geo Entities Type — DEV-only. Boots the live Dashboard
                with the map-draw panel auto-opened and exposes a 5-tab
                switcher (Opt 1..Opt 5) at the top of the panel that
                swaps the zone-type selector's layout.
                Reach it directly at /geo-entities-type-sandbox.
              */}
              {GeoEntitiesTypeSandbox && (
                <Route
                  path="/geo-entities-type-sandbox"
                  element={
                    <Suspense fallback={<PlaygroundFallback />}>
                      <GeoEntitiesTypeSandbox />
                    </Suspense>
                  }
                />
              )}
              {/*
                Geo Entities Card — DEV-only. Standalone review of 5
                candidate designs for the LayerRow card, rendered side-by-
                side in 367px mock panel columns. Reach it directly at
                /geo-entities-card-sandbox.
              */}
              {GeoEntitiesCardSandbox && (
                <Route
                  path="/geo-entities-card-sandbox"
                  element={
                    <Suspense fallback={<PlaygroundFallback />}>
                      <GeoEntitiesCardSandbox />
                    </Suspense>
                  }
                />
              )}
              {/*
                Floating Panel Sandbox — DEV-only. Reviews 5 horizontal
                variants of the map's floating Geo Entities tool strip
                against a mock map with a shared anchor radio. Reach
                it directly at /floating-panel-sandbox.
              */}
              {FloatingPanelSandbox && (
                <Route
                  path="/floating-panel-sandbox"
                  element={
                    <Suspense fallback={<PlaygroundFallback />}>
                      <FloatingPanelSandbox />
                    </Suspense>
                  }
                />
              )}
              {/*
                Theme Color Sandbox — DEV-only. Live preview of primary /
                secondary / background color picks against a lightweight
                replica of the app shell. Reach it directly at
                /theme-sandbox.
              */}
              {ThemeSandbox && (
                <Route
                  path="/theme-sandbox"
                  element={
                    <Suspense fallback={<PlaygroundFallback />}>
                      <ThemeSandbox />
                    </Suspense>
                  }
                />
              )}
              {/*
                Tweakcn Orange Sandbox — DEV-only. Same shell as
                /theme-sandbox but booted with the imported shadcn/tweakcn
                orange theme. Reach it directly at /theme-orange-sandbox.
              */}
              {ThemeOrangeSandbox && (
                <Route
                  path="/theme-orange-sandbox"
                  element={
                    <Suspense fallback={<PlaygroundFallback />}>
                      <ThemeOrangeSandbox />
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
      </MotionConfig>
    </DirectionProvider>
  );
}
