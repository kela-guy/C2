import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DialRoot } from "dialkit";
import "dialkit/styles.css";
import { Dashboard } from "./components/Dashboard";
import { TooltipProvider } from "./components/ui/tooltip";

// Dev-only perf HUD. Lazy-loaded so the import chain (stats-gl, sink,
// observers) is dropped from production bundles via tree-shaking on
// the `import.meta.env.DEV` constant.
const PerfHud = import.meta.env.DEV
  ? lazy(() => import("./components/perf/PerfHud").then((m) => ({ default: m.PerfHud })))
  : null;

// Styleguide is a designer/dev-only route loaded with all of the Shiki
// language grammars + raw component source — split it out of the main bundle
// so a Dashboard cold start doesn't pay for it.
const StyleguidePage = lazy(() => import("./components/StyleguidePage"));

function StyleguideFallback() {
  return (
    <div className="flex items-center justify-center w-full h-screen bg-zinc-950 text-sm text-zinc-400">
      Loading styleguide…
    </div>
  );
}

// Playground is an isolated sandbox for iterating on the new video feature
// (camera-v2). Lazy-loaded so the dashboard cold start doesn't pay for it.
const PlaygroundPage = lazy(() => import("./components/PlaygroundPage"));

function PlaygroundFallback() {
  return (
    <div className="flex items-center justify-center w-full h-screen bg-zinc-950 text-sm text-zinc-400">
      Loading playground…
    </div>
  );
}

export default function App() {
  return (
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
            <Route
              path="/styleguide"
              element={
                <Suspense fallback={<StyleguideFallback />}>
                  <StyleguidePage />
                </Suspense>
              }
            />
            <Route
              path="/playground"
              element={
                <Suspense fallback={<PlaygroundFallback />}>
                  <PlaygroundPage />
                </Suspense>
              }
            />
          </Routes>
        </BrowserRouter>
        <DialRoot position="bottom-right" />
      </TooltipProvider>
      {PerfHud && (
        <Suspense fallback={null}>
          <PerfHud />
        </Suspense>
      )}
    </DndProvider>
  );
}
