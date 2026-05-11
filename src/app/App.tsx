import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DialRoot } from "dialkit";
import "dialkit/styles.css";
import { Dashboard } from "./components/Dashboard";
import FovTestPage from "./components/FovTestPage";
import StyleguidePage from "./components/StyleguidePage";
import { DirectionProvider } from "@/lib/direction";

// Playground hosts the rebuilt video feature (`camera-v2/`). Code-split so
// neither the production dashboard nor the styleguide bundle drags in
// VideoPanel/CameraFeedTile/HUD overlays until someone opens `/playground`.
const PlaygroundPage = lazy(() => import("./components/PlaygroundPage"));

function PlaygroundFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090b] text-sm text-neutral-400">
      Loading playground…
    </div>
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
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/fov-test" element={<FovTestPage />} />
            <Route path="/styleguide" element={<StyleguidePage />} />
            {/*
              Marketing demo route — same Dashboard component as `/`,
              served from a separate URL so we can iterate on demo-only
              tweaks without touching the production surface. Identical
              to `/` today; diverges as adjustments land here.
            */}
            <Route path="/demo" element={<Dashboard />} />
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
          </Routes>
        </BrowserRouter>
        <DialRoot position="bottom-right" />
      </DndProvider>
    </DirectionProvider>
  );
}
