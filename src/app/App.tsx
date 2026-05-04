import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DialRoot } from "dialkit";
import "dialkit/styles.css";
import { Dashboard } from "./components/Dashboard";
import FovTestPage from "./components/FovTestPage";
import StyleguidePage from "./components/StyleguidePage";

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
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/fov-test" element={<FovTestPage />} />
          <Route path="/styleguide" element={<StyleguidePage />} />
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
  );
}
