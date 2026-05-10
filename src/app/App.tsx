import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DialRoot } from "dialkit";
import "dialkit/styles.css";
import { Dashboard } from "./components/Dashboard";
import FovTestPage from "./components/FovTestPage";
import StyleguidePage from "./components/StyleguidePage";
import { DirectionProvider } from "@/lib/direction";

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
          </Routes>
        </BrowserRouter>
        <DialRoot position="bottom-right" />
      </DndProvider>
    </DirectionProvider>
  );
}
